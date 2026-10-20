import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SENDER_EMAIL = 'analista.desarrollador@firplak.com';
const RENATA_EMAIL = 'renata.lainez@firplak.com';
const VINCULAMOS_EMAIL = 'incapacidades@vinculamos.com.co';
const APP_URL = 'https://talentohumano.vercel.app';

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

async function enviarCorreo(token: string, toEmails: string[], subject: string, content: string) {
    const emailData = {
        message: {
            subject,
            body: { contentType: 'HTML', content },
            toRecipients: toEmails.map((address) => ({ emailAddress: { address } })),
        },
        saveToSentItems: 'true',
    };

    const res = await fetch(`https://graph.microsoft.com/v1.0/users/${SENDER_EMAIL}/sendMail`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(emailData),
    });
    if (!res.ok) {
        throw new Error('Error enviando correo de notificacion de ausentismo: ' + (await res.text()));
    }
}

function formatFecha(iso: string | null): string {
    if (!iso) return 'N/A';
    try {
        return new Date(`${iso}T00:00:00`).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch {
        return iso;
    }
}

export async function POST(request: Request) {
    try {
        const { ausentismoId, testRecipient } = await request.json();
        if (!ausentismoId) {
            return NextResponse.json({ error: 'Falta el id del ausentismo' }, { status: 400 });
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        const supabase = createClient(supabaseUrl, serviceRoleKey);

        const { data: ausentismo, error } = await supabase
            .from('ausentismos')
            .select('*')
            .eq('Id', ausentismoId)
            .single();
        if (error || !ausentismo) throw error || new Error('Ausentismo no encontrado');

        const a = ausentismo as any;
        const requiereDescuento = !!a['Descontar nomina'];
        const esVinculamos = (a['Contrato'] || '').trim().toLowerCase() === 'vinculamos';
        const link = `${APP_URL}/ausentismos`;

        const contenido = `
            <div style="font-family: Arial, sans-serif; color: #333; max-width: 560px;">
                <h2 style="color:#1D3557;">Nuevo ausentismo registrado</h2>
                <p>Se registró un nuevo ausentismo con la siguiente información:</p>
                <div style="margin: 16px 0; padding: 14px 18px; border-radius: 10px; background:${requiereDescuento ? '#fdecea' : '#eafaf0'}; border: 1px solid ${requiereDescuento ? '#f5c6c0' : '#bdeccb'};">
                    <strong style="color:${requiereDescuento ? '#c0392b' : '#1e8449'};">
                        ${requiereDescuento ? 'Este ausentismo SÍ requiere descuento de nómina.' : 'Este ausentismo NO requiere descuento de nómina.'}
                    </strong>
                </div>
                <table style="border-collapse: collapse; width: 100%; margin: 16px 0;">
                    <tr><td style="padding:6px 10px; color:#777;">Empleado</td><td style="padding:6px 10px; font-weight:bold;">${a['Nombre Completo'] || 'N/A'}</td></tr>
                    <tr style="background:#f7f9fb;"><td style="padding:6px 10px; color:#777;">Cédula</td><td style="padding:6px 10px;">${a['Título'] ?? 'N/A'}</td></tr>
                    <tr><td style="padding:6px 10px; color:#777;">Cargo</td><td style="padding:6px 10px;">${a['Cargo'] || 'N/A'}</td></tr>
                    <tr style="background:#f7f9fb;"><td style="padding:6px 10px; color:#777;">Planta</td><td style="padding:6px 10px;">${a['Planta'] || 'N/A'}</td></tr>
                    <tr><td style="padding:6px 10px; color:#777;">Jefe</td><td style="padding:6px 10px;">${a['Jefe'] || 'N/A'}</td></tr>
                    <tr style="background:#f7f9fb;"><td style="padding:6px 10px; color:#777;">Empresa</td><td style="padding:6px 10px;">${a['Contrato'] || 'N/A'}</td></tr>
                    <tr><td style="padding:6px 10px; color:#777;">Motivo</td><td style="padding:6px 10px; font-weight:bold;">${a['Motivo Ausentismo'] || 'N/A'}</td></tr>
                    ${a['Codigo Incapacidad'] ? `<tr style="background:#f7f9fb;"><td style="padding:6px 10px; color:#777;">Código de incapacidad</td><td style="padding:6px 10px;">${a['Codigo Incapacidad']}</td></tr>` : ''}
                    <tr style="background:#f7f9fb;"><td style="padding:6px 10px; color:#777;">Fecha inicio</td><td style="padding:6px 10px;">${formatFecha(a['FechaInicio'])}</td></tr>
                    <tr><td style="padding:6px 10px; color:#777;">Fecha final</td><td style="padding:6px 10px;">${formatFecha(a['FechaFinal'])}</td></tr>
                    <tr style="background:#f7f9fb;"><td style="padding:6px 10px; color:#777;">Creado por</td><td style="padding:6px 10px;">${a['Creado por'] || 'N/A'}</td></tr>
                </table>
                <p style="color:#777; margin-bottom:4px;">Observaciones</p>
                <p style="background:#f7f9fb; padding:12px; border-radius:8px;">${a['Observaciones'] || 'Sin observaciones adicionales.'}</p>
                ${a['Datos adjuntos'] ? `<p style="margin-top:16px;"><a href="${a['Datos adjuntos']}" style="color:#1D3557; font-weight:bold;">Ver documento soporte adjunto</a></p>` : ''}
                <div style="margin-top:24px;">
                    <a href="${link}" style="background:#1D3557; color:#fff; padding:12px 24px; border-radius:8px; text-decoration:none; font-weight:bold; display:inline-block;">Ver ausentismos</a>
                </div>
            </div>
        `;

        const token = await getMsToken();
        const subject = `Nuevo ausentismo: ${a['Nombre Completo'] || 'Empleado'} (${requiereDescuento ? 'con descuento de nómina' : 'sin descuento de nómina'})`;

        const destinatarios = [RENATA_EMAIL];
        if (esVinculamos) destinatarios.push(VINCULAMOS_EMAIL);

        if (testRecipient) {
            // Modo de prueba: todo se envía únicamente al destinatario de prueba,
            // sin tocar a Renata ni a Vinculamos. Se informa quién lo habría
            // recibido en producción para poder verificar la lógica.
            await enviarCorreo(token, [testRecipient], `[PRUEBA] ${subject}`, contenido);
            return NextResponse.json({ success: true, modo: 'prueba', enviadoA: [testRecipient], destinatariosEnProduccionSerian: destinatarios });
        }

        await enviarCorreo(token, destinatarios, subject, contenido);

        return NextResponse.json({ success: true, enviadoA: destinatarios });
    } catch (error: any) {
        console.error('Error notificando nuevo ausentismo:', error);
        return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
    }
}
