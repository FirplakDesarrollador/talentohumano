import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SENDER_EMAIL = 'analista.desarrollador@firplak.com';
const RENATA_EMAIL = 'renata.lainez@firplak.com';
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
        console.error('Error enviando correo de notificacion de proceso disciplinario:', await res.text());
    }
}

function formatFecha(iso: string): string {
    try {
        return new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch {
        return iso;
    }
}

export async function POST(request: Request) {
    try {
        const { procesoId } = await request.json();
        if (!procesoId) {
            return NextResponse.json({ error: 'Falta el id del proceso' }, { status: 400 });
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        const supabase = createClient(supabaseUrl, serviceRoleKey);

        const { data: proceso, error } = await supabase
            .from('query_procesos_disciplinarios')
            .select('*')
            .eq('id', procesoId)
            .single();
        if (error || !proceso) throw error || new Error('Proceso no encontrado');

        const p = proceso as any;
        const link = `${APP_URL}/procesos-disciplinarios/${p.empleado_id}?destacar=${p.id}`;

        const contenido = `
            <div style="font-family: Arial, sans-serif; color: #333; max-width: 560px;">
                <h2 style="color:#1D3557;">Nuevo proceso disciplinario registrado</h2>
                <p>Se registró un nuevo proceso disciplinario con la siguiente información:</p>
                <table style="border-collapse: collapse; width: 100%; margin: 16px 0;">
                    <tr><td style="padding:6px 10px; color:#777;">Empleado</td><td style="padding:6px 10px; font-weight:bold;">${p.nombreCompleto || 'N/A'}</td></tr>
                    <tr style="background:#f7f9fb;"><td style="padding:6px 10px; color:#777;">Cédula</td><td style="padding:6px 10px;">${p.empleado_id ?? 'N/A'}</td></tr>
                    <tr><td style="padding:6px 10px; color:#777;">Cargo</td><td style="padding:6px 10px;">${p.cargo || 'N/A'}</td></tr>
                    <tr style="background:#f7f9fb;"><td style="padding:6px 10px; color:#777;">Planta</td><td style="padding:6px 10px;">${p.planta || 'N/A'}</td></tr>
                    <tr><td style="padding:6px 10px; color:#777;">Jefe</td><td style="padding:6px 10px;">${p.jefe || 'N/A'}</td></tr>
                    <tr style="background:#f7f9fb;"><td style="padding:6px 10px; color:#777;">Tipo de proceso</td><td style="padding:6px 10px; font-weight:bold;">${p.tipo || 'N/A'}</td></tr>
                    <tr><td style="padding:6px 10px; color:#777;">Motivo de sanción</td><td style="padding:6px 10px;">${p.motivo || 'N/A'}</td></tr>
                    <tr style="background:#f7f9fb;"><td style="padding:6px 10px; color:#777;">Estado</td><td style="padding:6px 10px;">${p.estado === 'PENDIENTE' ? 'Pendiente' : 'Finalizado'}</td></tr>
                    <tr><td style="padding:6px 10px; color:#777;">Creado por</td><td style="padding:6px 10px;">${p.created_by || 'N/A'}</td></tr>
                    <tr style="background:#f7f9fb;"><td style="padding:6px 10px; color:#777;">Fecha</td><td style="padding:6px 10px;">${p.created_at ? formatFecha(p.created_at) : 'N/A'}</td></tr>
                </table>
                <p style="color:#777; margin-bottom:4px;">Comentario</p>
                <p style="background:#f7f9fb; padding:12px; border-radius:8px;">${p.comentario || 'Sin comentarios adicionales.'}</p>
                <div style="margin-top:24px;">
                    <a href="${link}" style="background:#1D3557; color:#fff; padding:12px 24px; border-radius:8px; text-decoration:none; font-weight:bold; display:inline-block;">Ver proceso completo</a>
                </div>
            </div>
        `;

        const token = await getMsToken();
        await enviarCorreo(token, RENATA_EMAIL, `Nuevo proceso disciplinario: ${p.nombreCompleto || 'Empleado'}`, contenido);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error notificando nuevo proceso disciplinario:', error);
        return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
    }
}
