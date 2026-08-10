import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';

const APP_URL = 'https://talentohumano.vercel.app';
const SENDER_EMAIL = 'talentos@firplak.com';

const UMBRAL_MESES: Record<string, number> = {
    TEMPORAL: 3,
    TERMINO_FIJO: 2,
};

async function getMsToken(): Promise<string> {
    const tenantId = process.env.MICROSOFT_TENANT_ID!;
    const clientId = process.env.MICROSOFT_CLIENT_ID!;
    const clientSecret = process.env.MICROSOFT_CLIENT_SECRET!;

    const tokenParams = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        scope: 'https://graph.microsoft.com/.default',
        grant_type: 'client_credentials',
    });

    const res = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: tokenParams.toString(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error('Error autenticando con Microsoft: ' + JSON.stringify(data));
    return data.access_token;
}

async function enviarCorreo(token: string, toEmail: string, subject: string, content: string) {
    const emailData = {
        message: {
            subject,
            body: { contentType: 'HTML', content },
            toRecipients: [{ emailAddress: { address: toEmail } }],
        },
        saveToSentItems: 'true',
    };

    const res = await fetch(`https://graph.microsoft.com/v1.0/users/${SENDER_EMAIL}/sendMail`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(emailData),
    });
    if (!res.ok) {
        console.error('Error sending alerta correo:', await res.text());
    }
}

export async function GET(request: Request) {
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
        const authHeader = request.headers.get('authorization');
        if (authHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }
    }

    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        const supabase = createClient(supabaseUrl, serviceRoleKey);

        const creadas: number[] = [];
        const fallidas: string[] = [];

        for (const tipoContrato of ['TEMPORAL', 'TERMINO_FIJO'] as const) {
            const meses = UMBRAL_MESES[tipoContrato];
            const fechaLimite = new Date();
            fechaLimite.setMonth(fechaLimite.getMonth() - meses);
            const fechaLimiteStr = fechaLimite.toISOString().split('T')[0];

            const { data: candidatos, error: candErr } = await supabase
                .from('empleados')
                .select('id, nombreCompleto, cargo, planta, jefe, fecha_inicio_contrato_actual')
                .eq('activo', true)
                .eq('tipo_contrato', tipoContrato)
                .not('fecha_inicio_contrato_actual', 'is', null)
                .lte('fecha_inicio_contrato_actual', fechaLimiteStr);

            if (candErr) throw candErr;

            for (const emp of candidatos || []) {
                // Evitar duplicar la alerta para el mismo periodo de contrato
                const { data: yaExiste } = await supabase
                    .from('alertas_contrato')
                    .select('id')
                    .eq('empleado_id', emp.id)
                    .eq('fecha_inicio_contrato_snapshot', emp.fecha_inicio_contrato_actual)
                    .maybeSingle();

                if (yaExiste) continue;

                // Resolver el correo del jefe directo por nombre (mismo patron
                // usado en el resto de la app: empleados.jefe es texto libre)
                let jefeCorreo: string | null = null;
                if (emp.jefe) {
                    const { data: jefeData } = await supabase
                        .from('empleados')
                        .select('correo_electronico')
                        .ilike('nombreCompleto', emp.jefe.trim())
                        .limit(1)
                        .maybeSingle();
                    jefeCorreo = (jefeData as any)?.correo_electronico?.trim() || null;
                }

                if (!jefeCorreo) {
                    fallidas.push(`${emp.nombreCompleto} (sin correo de jefe resuelto: "${emp.jefe}")`);
                    continue;
                }

                const token = randomBytes(24).toString('hex');

                const { data: alertaInsertada, error: insertErr } = await supabase
                    .from('alertas_contrato')
                    .insert({
                        empleado_id: emp.id,
                        tipo_contrato_en_momento: tipoContrato,
                        fecha_inicio_contrato_snapshot: emp.fecha_inicio_contrato_actual,
                        jefe_nombre: emp.jefe,
                        jefe_correo: jefeCorreo,
                        token,
                    })
                    .select('id')
                    .single();

                if (insertErr || !alertaInsertada) {
                    console.error('Error creando alerta_contrato:', insertErr);
                    fallidas.push(emp.nombreCompleto);
                    continue;
                }

                const link = `${APP_URL}/decision-contrato/${token}`;
                const tipoLabel = tipoContrato === 'TEMPORAL' ? 'Temporal' : 'Término Fijo';
                const contenido = `
                    <div style="font-family: Arial, sans-serif; color: #333;">
                        <h2>Decisión requerida: ${emp.nombreCompleto}</h2>
                        <p><strong>${emp.nombreCompleto}</strong> (${emp.cargo || 'sin cargo registrado'}, ${emp.planta || 'sin planta'}) cumplió ${meses} meses en contrato <strong>${tipoLabel}</strong>.</p>
                        <p>Por favor indica qué se hará con su contrato:</p>
                        <p><a href="${link}" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">Responder ahora</a></p>
                        <p style="font-size:12px;color:#888;">Este es un mensaje automático del sistema de Talento Humano.</p>
                    </div>
                `;

                try {
                    const msToken = await getMsToken();
                    await enviarCorreo(msToken, jefeCorreo, `Decisión requerida: contrato de ${emp.nombreCompleto}`, contenido);
                    creadas.push(alertaInsertada.id);
                } catch (mailErr) {
                    console.error('Error enviando correo de alerta:', mailErr);
                    fallidas.push(emp.nombreCompleto);
                }
            }
        }

        return NextResponse.json({ success: true, alertasCreadas: creadas.length, fallidas });
    } catch (error: any) {
        console.error('Internal API error in alertas-contrato cron:', error);
        return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
    }
}
