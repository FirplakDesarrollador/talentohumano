import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SENDER_EMAIL = 'talentos@firplak.com';
const RENATA_EMAIL = 'renata.lainez@firplak.com';

const DECISION_LABELS: Record<string, string> = {
    PROLONGAR_TEMPORAL: 'Prolongar contrato con la temporal',
    CONTRATAR_TERMINO_FIJO: 'Contratar directo a término fijo',
    CONTRATAR_INDEFINIDO: 'Contratar a término indefinido',
    NO_PROLONGAR: 'No prolongar el contrato',
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
        console.error('Error enviando correo de decision-contrato:', await res.text());
    }
}

function buildWhatsappLink(telefono: string | null, nombre: string, decision: string): string | null {
    if (!telefono) return null;
    let digits = telefono.replace(/[^0-9]/g, '');
    if (digits.length === 10) digits = `57${digits}`; // numero colombiano sin indicativo
    if (!digits) return null;

    const mensajes: Record<string, string> = {
        PROLONGAR_TEMPORAL: `Hola ${nombre}, te confirmamos que tu contrato con la temporal se prolonga. ¡Gracias por tu compromiso!`,
        CONTRATAR_TERMINO_FIJO: `Hola ${nombre}, te confirmamos que pasas a contrato directo a término fijo con Firplak. ¡Felicitaciones!`,
        CONTRATAR_INDEFINIDO: `Hola ${nombre}, te confirmamos que pasas a contrato a término indefinido con Firplak. ¡Felicitaciones!`,
    };
    const texto = mensajes[decision];
    if (!texto) return null;

    return `https://wa.me/${digits}?text=${encodeURIComponent(texto)}`;
}

export async function POST(request: Request) {
    try {
        const { token, decision } = await request.json();
        if (!token || !decision) {
            return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        const supabase = createClient(supabaseUrl, serviceRoleKey);

        const { data: respuesta, error: rpcError } = await (supabase.rpc as any)('responder_alerta_contrato', {
            p_token: token,
            p_decision: decision,
        });
        if (rpcError) throw rpcError;
        if (!respuesta?.success) {
            return NextResponse.json({ error: respuesta?.error || 'No se pudo registrar la decisión' }, { status: 400 });
        }

        // Traer datos completos para las notificaciones
        const { data: alerta, error: alertaError } = await supabase
            .from('alertas_contrato')
            .select('empleado_id, tipo_contrato_en_momento, jefe_nombre')
            .eq('token', token)
            .single();
        if (alertaError || !alerta) throw alertaError || new Error('Alerta no encontrada');

        const { data: empleado, error: empError } = await supabase
            .from('empleados')
            .select('nombreCompleto, cargo, planta, celular, telefono')
            .eq('id', alerta.empleado_id)
            .single();
        if (empError || !empleado) throw empError || new Error('Empleado no encontrado');

        const decisionLabel = DECISION_LABELS[decision] || decision;

        try {
            const msToken = await getMsToken();

            if (decision === 'NO_PROLONGAR') {
                const contenido = `
                    <div style="font-family: Arial, sans-serif; color: #333;">
                        <h2>Decisión de No Continuidad</h2>
                        <p><strong>${alerta.jefe_nombre || 'El jefe directo'}</strong> decidió <strong>no prolongar</strong> el contrato de <strong>${(empleado as any).nombreCompleto}</strong> (${(empleado as any).cargo || 'sin cargo'}, ${(empleado as any).planta || 'sin planta'}).</p>
                        <p style="color:#b91c1c;"><strong>Nota:</strong> la carta de no continuación aún no se adjunta automáticamente — falta cargar la plantilla en el sistema. Por favor genérala manualmente por ahora.</p>
                    </div>
                `;
                await enviarCorreo(msToken, RENATA_EMAIL, `No continuidad: ${(empleado as any).nombreCompleto}`, contenido);
            } else {
                const waLink = buildWhatsappLink((empleado as any).celular || (empleado as any).telefono, (empleado as any).nombreCompleto, decision);
                const contenido = `
                    <div style="font-family: Arial, sans-serif; color: #333;">
                        <h2>Decisión de Contrato</h2>
                        <p><strong>${alerta.jefe_nombre || 'El jefe directo'}</strong> decidió: <strong>${decisionLabel}</strong> para <strong>${(empleado as any).nombreCompleto}</strong> (${(empleado as any).cargo || 'sin cargo'}, ${(empleado as any).planta || 'sin planta'}).</p>
                        ${waLink
                        ? `<p>Envíale la noticia por WhatsApp (mensaje ya redactado, solo confirma el envío):</p><p><a href="${waLink}" style="display:inline-block;background:#25D366;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">Enviar WhatsApp</a></p>`
                        : `<p style="color:#b91c1c;">No se encontró un número de celular registrado para notificar por WhatsApp — contáctalo por otro medio.</p>`
                    }
                    </div>
                `;
                await enviarCorreo(msToken, RENATA_EMAIL, `Decisión de contrato: ${(empleado as any).nombreCompleto}`, contenido);
            }

            await supabase
                .from('alertas_contrato')
                .update({ notificacion_enviada: true })
                .eq('token', token);
        } catch (notifError) {
            console.error('Error enviando notificacion post-decision:', notifError);
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Internal API error in decision-contrato:', error);
        return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
    }
}
