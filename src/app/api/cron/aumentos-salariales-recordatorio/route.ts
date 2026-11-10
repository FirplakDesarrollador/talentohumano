import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const APP_URL = 'https://talentohumano.vercel.app';
const SENDER_EMAIL = 'analista.desarrollador@firplak.com';
const RENATA_EMAIL = 'renata.lainez@firplak.com';
const DIAS_RECORDATORIO = 8;

function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(amount);
}

function diasTranscurridos(fecha: string): number {
    const creada = new Date(fecha);
    const ahora = new Date();
    return Math.floor((ahora.getTime() - creada.getTime()) / (1000 * 60 * 60 * 24));
}

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
        console.error('Error enviando correo de recordatorio de aumento salarial:', await res.text());
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

        const fechaLimite = new Date();
        fechaLimite.setDate(fechaLimite.getDate() - DIAS_RECORDATORIO);

        const { data: pendientes, error: pendientesError } = await supabase
            .from('aumentosSalariales')
            .select('id, empleado_id, aprobador, salarioActual, salarioPropuesto, cargoAnterior, cargoPropuesto, requiereAscenso, created_at, token')
            .eq('estado', 'Pendiente')
            .eq('recordatorio_enviado', false)
            .lte('created_at', fechaLimite.toISOString());
        if (pendientesError) throw pendientesError;

        const recordados: number[] = [];
        const fallidos: string[] = [];

        for (const aumento of pendientes || []) {
            const a = aumento as any;
            try {
                const { data: empleado } = await supabase
                    .from('empleados')
                    .select('nombreCompleto')
                    .eq('id', a.empleado_id)
                    .single();

                const { data: aprobadorEmp } = await supabase
                    .from('empleados')
                    .select('nombreCompleto, correo_electronico')
                    .eq('id', a.aprobador)
                    .single();

                const aprobadorCorreo = ((aprobadorEmp as any)?.correo_electronico || '').trim();
                const empleadoNombre = (empleado as any)?.nombreCompleto || 'el empleado';
                const aprobadorNombre = (aprobadorEmp as any)?.nombreCompleto || 'El aprobador';

                if (!aprobadorCorreo || !a.token) {
                    fallidos.push(`${empleadoNombre} (sin correo de aprobador o sin token)`);
                    continue;
                }

                const dias = diasTranscurridos(a.created_at);
                const link = `${APP_URL}/decision-aumento/${a.token}`;
                const cargoTexto = a.requiereAscenso
                    ? `${a.cargoAnterior} → ${a.cargoPropuesto} (ascenso)`
                    : a.cargoAnterior;

                const msToken = await getMsToken();

                const contenidoAprobador = `
                    <div style="font-family: Arial, sans-serif; color: #333;">
                        <h2>Recordatorio: solicitud de aumento salarial pendiente</h2>
                        <p>Hace <strong>${dias} días</strong> se creó la solicitud de aumento salarial de <strong>${empleadoNombre}</strong> (${cargoTexto}) y aún no ha sido aprobada ni rechazada.</p>
                        <p>
                            Salario actual: ${formatCurrency(a.salarioActual)}<br/>
                            Salario propuesto: <strong>${formatCurrency(a.salarioPropuesto)}</strong>
                        </p>
                        <p><a href="${link}" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">Aprobar o rechazar la solicitud</a></p>
                        <p style="font-size:12px;color:#888;">Este es un mensaje automático del sistema de Talento Humano.</p>
                    </div>
                `;
                await enviarCorreo(msToken, aprobadorCorreo, `Recordatorio: solicitud de aumento salarial de ${empleadoNombre}`, contenidoAprobador);

                const contenidoRenata = `
                    <div style="font-family: Arial, sans-serif; color: #333;">
                        <h2>Recordatorio: solicitud de aumento salarial sin resolver</h2>
                        <p>Hace <strong>${dias} días</strong> se creó la solicitud de aumento salarial de <strong>${empleadoNombre}</strong> (${cargoTexto}) y <strong>${aprobadorNombre}</strong> aún no la aprueba ni la rechaza.</p>
                        <p style="font-size:12px;color:#888;">Este es un mensaje informativo automático del sistema de Talento Humano.</p>
                    </div>
                `;
                await enviarCorreo(msToken, RENATA_EMAIL, `Recordatorio: solicitud de aumento salarial sin resolver (${empleadoNombre})`, contenidoRenata);

                await supabase
                    .from('aumentosSalariales')
                    .update({ recordatorio_enviado: true })
                    .eq('id', a.id);

                recordados.push(a.id);
            } catch (err) {
                console.error('Error enviando recordatorio de aumento salarial:', err);
                fallidos.push(`id ${a.id}`);
            }
        }

        return NextResponse.json({ success: true, recordatoriosEnviados: recordados.length, fallidos });
    } catch (error: any) {
        console.error('Internal API error in aumentos-salariales-recordatorio cron:', error);
        return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
    }
}
