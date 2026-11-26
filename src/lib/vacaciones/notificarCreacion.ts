import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';
import { sendTeamsMessage } from '@/lib/teams/sendTeamsMessage';

const APP_URL = 'https://talentohumano.vercel.app';
const SENDER_EMAIL = 'analista.desarrollador@firplak.com';
const RENATA_EMAIL = 'renata.lainez@firplak.com';

function formatFecha(fecha: string | null): string {
    if (!fecha) return 'No especificada';
    const iso = fecha.includes('T') ? fecha : `${fecha}T00:00:00`;
    return new Date(iso).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
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
        console.error('Error enviando correo de creacion de solicitud de vacaciones:', await res.text());
    }
}

/**
 * Notifica la creacion de una solicitud de vacaciones: genera un token de
 * decision y se lo envia al jefe inmediato (Teams + correo, con un link
 * publico para aprobar/rechazar sin login, igual que Aumentos Salariales), y
 * avisa a Renata (Teams + correo) de forma informativa.
 *
 * Best-effort: nunca lanza. Un fallo aqui no debe revertir la solicitud ya
 * guardada en la base de datos.
 */
export async function notificarCreacionVacacion(vacacionId: number): Promise<void> {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        const supabase = createClient(supabaseUrl, serviceRoleKey);

        const { data: vacacion, error: vacacionError } = await (supabase as any)
            .from('Vacaciones')
            .select('id, Empleado_Que_Disfruta, "Creado por", FechaInicial, FechaFinal, FechaIngreso, Departamento, "Nombre del Jefe", CorreoJefe, DiasEnTiempo, DiasEnDinero, TipoDePAgo, Cargo, Empresa')
            .eq('id', vacacionId)
            .single();
        if (vacacionError || !vacacion) throw vacacionError || new Error('Solicitud no encontrada');

        const v = vacacion as any;
        const correoJefe = (v.CorreoJefe || '').trim();
        if (!correoJefe) {
            console.error('No se pudo notificar la solicitud de vacaciones: el jefe no tiene correo registrado', vacacionId);
            return;
        }

        const token = randomBytes(24).toString('hex');
        await (supabase as any).from('Vacaciones').update({ Token: token }).eq('id', vacacionId);

        const link = `${APP_URL}/decision-vacaciones/${token}`;
        const empleadoNombre = v.Empleado_Que_Disfruta || 'el empleado';
        const solicitanteNombre = v['Creado por'] || 'Un usuario del sistema';

        const detalle = `
            Empleado: <strong>${empleadoNombre}</strong><br/>
            Cargo: ${v.Cargo || 'N/A'}<br/>
            Departamento: ${v.Departamento || 'N/A'}<br/>
            Desde: <strong>${formatFecha(v.FechaInicial)}</strong><br/>
            Hasta: <strong>${formatFecha(v.FechaFinal)}</strong><br/>
            Regreso: ${formatFecha(v.FechaIngreso)}<br/>
            Días en tiempo: ${v.DiasEnTiempo || 0} — Días en dinero: ${v.DiasEnDinero || 0}<br/>
            Solicitado por: ${solicitanteNombre}
        `;

        try {
            await sendTeamsMessage(correoJefe, `
                <p><strong>Nueva solicitud de vacaciones</strong> para tu aprobación.</p>
                <p>${detalle}</p>
                <p><a href="${link}">Revisar y responder la solicitud</a></p>
            `);
        } catch (teamsError) {
            console.error('Error enviando notificacion de Teams al jefe sobre la solicitud de vacaciones:', teamsError);
        }

        try {
            const msToken = await getMsToken();

            await enviarCorreo(msToken, correoJefe, `Solicitud de vacaciones: ${empleadoNombre}`, `
                <div style="font-family: Arial, sans-serif; color: #333;">
                    <h2>Solicitud de vacaciones: ${empleadoNombre}</h2>
                    <p>Se registró una solicitud de vacaciones que requiere tu aprobación.</p>
                    <p>${detalle}</p>
                    <p><a href="${link}" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">Aprobar o rechazar la solicitud</a></p>
                    <p style="font-size:12px;color:#888;">Este es un mensaje automático del sistema de Talento Humano.</p>
                </div>
            `);

            const contenidoRenata = `
                <div style="font-family: Arial, sans-serif; color: #333;">
                    <h2>Nueva solicitud de vacaciones</h2>
                    <p>Se creó una solicitud de vacaciones para <strong>${empleadoNombre}</strong>.</p>
                    <p>${detalle}<br/>Pendiente de aprobación de: <strong>${v['Nombre del Jefe'] || 'No especificado'}</strong></p>
                    <p style="font-size:12px;color:#888;">Este es un mensaje informativo automático del sistema de Talento Humano.</p>
                </div>
            `;
            await enviarCorreo(msToken, RENATA_EMAIL, `Nueva solicitud de vacaciones: ${empleadoNombre}`, contenidoRenata);
        } catch (mailError) {
            console.error('Error enviando correos de creacion de solicitud de vacaciones:', mailError);
        }

        try {
            await sendTeamsMessage(RENATA_EMAIL, `
                <p><strong>Nueva solicitud de vacaciones</strong> creada para <strong>${empleadoNombre}</strong>.</p>
                <p>${detalle}<br/>Pendiente de aprobación de: <strong>${v['Nombre del Jefe'] || 'No especificado'}</strong></p>
            `);
        } catch (teamsError) {
            console.error('Error notificando por Teams a Renata sobre la nueva solicitud de vacaciones:', teamsError);
        }
    } catch (error) {
        console.error('Error notificando la creacion de la solicitud de vacaciones:', error);
    }
}
