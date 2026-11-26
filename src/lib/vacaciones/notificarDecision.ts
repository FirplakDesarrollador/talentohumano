import { createClient } from '@supabase/supabase-js';
import { sendTeamsMessage } from '@/lib/teams/sendTeamsMessage';

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
        console.error('Error enviando correo de decision de vacaciones:', await res.text());
    }
}

/**
 * Notifica la decision (Aprobado/Rechazado) de una solicitud de vacaciones a
 * Renata (Teams + correo, siempre) y a quien solicitó las vacaciones (Teams +
 * correo, usando el campo "correo" ya guardado en la fila). Punto unico usado
 * tanto por el flujo publico por token (/api/decision-vacaciones, el link que
 * le llega al jefe) como por la aprobacion interna en la app
 * (VacacionesDetalle), para que ningun camino se quede sin avisar.
 *
 * Best-effort: nunca lanza. Un fallo aqui no debe revertir la decision ya
 * registrada en la base de datos.
 */
export async function notificarDecisionVacacion(vacacionId: number, decision: 'Aprobado' | 'Rechazado'): Promise<void> {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        const supabase = createClient(supabaseUrl, serviceRoleKey);

        const { data: vacacion, error: vacacionError } = await (supabase as any)
            .from('Vacaciones')
            .select('Empleado_Que_Disfruta, "Nombre del Jefe", FechaInicial, FechaFinal, DiasEnTiempo, DiasEnDinero, correo, Cargo, Departamento')
            .eq('id', vacacionId)
            .single();
        if (vacacionError || !vacacion) throw vacacionError || new Error('Solicitud no encontrada');

        const v = vacacion as any;
        const empleadoNombre = v.Empleado_Que_Disfruta || 'el empleado';
        const jefeNombre = v['Nombre del Jefe'] || 'El jefe inmediato';
        const decisionLabel = decision === 'Aprobado' ? 'aprobada' : 'rechazada';
        const verbo = decision === 'Aprobado' ? 'aprobó' : 'rechazó';

        const detalle = `
            Empleado: <strong>${empleadoNombre}</strong><br/>
            Cargo: ${v.Cargo || 'N/A'}<br/>
            Departamento: ${v.Departamento || 'N/A'}<br/>
            Desde: <strong>${formatFecha(v.FechaInicial)}</strong><br/>
            Hasta: <strong>${formatFecha(v.FechaFinal)}</strong><br/>
            Días en tiempo: ${v.DiasEnTiempo || 0} — Días en dinero: ${v.DiasEnDinero || 0}
        `;

        // Renata: Teams + correo, siempre.
        try {
            await sendTeamsMessage(RENATA_EMAIL, `
                <p><strong>Solicitud de vacaciones ${decisionLabel}</strong> por ${jefeNombre}.</p>
                <p>${detalle}</p>
            `);
        } catch (teamsError) {
            console.error('Error notificando por Teams a Renata sobre la decision de vacaciones:', teamsError);
        }

        try {
            const msToken = await getMsToken();
            await enviarCorreo(msToken, RENATA_EMAIL, `Solicitud de vacaciones ${decisionLabel}: ${empleadoNombre}`, `
                <div style="font-family: Arial, sans-serif; color: #333;">
                    <h2>Solicitud de vacaciones ${decisionLabel}</h2>
                    <p><strong>${jefeNombre}</strong> ${verbo} la solicitud de vacaciones de <strong>${empleadoNombre}</strong>.</p>
                    <p>${detalle}</p>
                    <p style="font-size:12px;color:#888;">Este es un mensaje automático del sistema de Talento Humano.</p>
                </div>
            `);
        } catch (mailError) {
            console.error('Error enviando correo a Renata sobre la decision de vacaciones:', mailError);
        }

        // Solicitante: Teams + correo, si quedó registrado en la fila.
        const solicitanteCorreo = (v.correo || '').trim();
        if (solicitanteCorreo) {
            const mensajeSolicitante = decision === 'Aprobado'
                ? `<p><strong>${jefeNombre}</strong> aprobó la solicitud de vacaciones de <strong>${empleadoNombre}</strong>.</p><p>${detalle}</p>`
                : `<p><strong>${jefeNombre}</strong> rechazó la solicitud de vacaciones de <strong>${empleadoNombre}</strong>.</p><p>${detalle}</p>`;

            try {
                await sendTeamsMessage(solicitanteCorreo, mensajeSolicitante);
            } catch (teamsError) {
                console.error('Error notificando por Teams al solicitante sobre la decision de vacaciones:', teamsError);
            }

            try {
                const msToken = await getMsToken();
                await enviarCorreo(msToken, solicitanteCorreo, `Solicitud de vacaciones ${decisionLabel}: ${empleadoNombre}`, `
                    <div style="font-family: Arial, sans-serif; color: #333;">
                        <h2>Solicitud de vacaciones ${decisionLabel}</h2>
                        ${mensajeSolicitante}
                        <p style="font-size:12px;color:#888;">Este es un mensaje automático del sistema de Talento Humano.</p>
                    </div>
                `);
            } catch (mailError) {
                console.error('Error enviando correo al solicitante sobre la decision de vacaciones:', mailError);
            }
        }
    } catch (error) {
        console.error('Error notificando la decision de la solicitud de vacaciones:', error);
    }
}
