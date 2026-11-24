import { createClient } from '@supabase/supabase-js';
import { sendTeamsMessage } from '@/lib/teams/sendTeamsMessage';

const SENDER_EMAIL = 'analista.desarrollador@firplak.com';
const RENATA_EMAIL = 'renata.lainez@firplak.com';

function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(amount);
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
        console.error('Error enviando correo de decision de aumento salarial:', await res.text());
    }
}

/**
 * Notifica la decision (Aprobada/Rechazada) de una solicitud de aumento
 * salarial a Renata (Teams + correo, siempre) y al solicitante (Teams, si
 * tiene correo registrado en "usuarios"). Punto unico usado tanto por el
 * flujo publico por token (/api/decision-aumento) como por la pantalla
 * interna de Aumentos Salariales (/api/aumentos-salariales/notificar-decision),
 * para que ninguno de los dos caminos de aprobar/rechazar se quede sin avisar
 * a Renata.
 *
 * Best-effort: nunca lanza. Un fallo aqui no debe revertir ni bloquear la
 * decision ya registrada en la base de datos.
 */
export async function notificarDecisionAumento(aumentoId: number, decision: 'Aprobada' | 'Rechazada'): Promise<void> {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        const supabase = createClient(supabaseUrl, serviceRoleKey);

        const { data: aumento, error: aumentoError } = await supabase
            .from('aumentosSalariales')
            .select('empleado_id, solicitante, aprobador, salarioActual, salarioPropuesto, cargoAnterior, cargoPropuesto, requiereAscenso, planta, jefe')
            .eq('id', aumentoId)
            .single();
        if (aumentoError || !aumento) throw aumentoError || new Error('Solicitud no encontrada');

        const a = aumento as any;

        const [{ data: empleado }, { data: solicitante }, { data: aprobadorEmp }] = await Promise.all([
            supabase.from('empleados').select('nombreCompleto').eq('id', a.empleado_id).single(),
            supabase.from('usuarios').select('correo, nombre').eq('id', a.solicitante).single(),
            supabase.from('empleados').select('nombreCompleto').eq('id', a.aprobador).single(),
        ]);

        const empleadoNombre = (empleado as any)?.nombreCompleto || 'el empleado';
        const aprobadorNombre = (aprobadorEmp as any)?.nombreCompleto || 'El aprobador';
        const cargoTexto = a.requiereAscenso
            ? `${a.cargoAnterior} → ${a.cargoPropuesto} (ascenso)`
            : a.cargoAnterior;
        const decisionLabel = decision === 'Aprobada' ? 'aprobada' : 'rechazada';

        // Renata: Teams + correo, siempre (igual que en la notificacion de creacion).
        const mensajeRenataTeams = `
            <p><strong>Solicitud de aumento salarial ${decisionLabel}</strong></p>
            <p>
                Empleado: <strong>${empleadoNombre}</strong><br/>
                Cargo: ${cargoTexto || 'N/A'}<br/>
                Planta: ${a.planta || 'N/A'}<br/>
                Jefe: ${a.jefe || 'N/A'}<br/>
                Salario actual: ${formatCurrency(a.salarioActual)}<br/>
                Salario propuesto: <strong>${formatCurrency(a.salarioPropuesto)}</strong>
            </p>
        `;
        try {
            await sendTeamsMessage(RENATA_EMAIL, mensajeRenataTeams);
        } catch (teamsError) {
            console.error('Error notificando por Teams a Renata sobre la decision del aumento:', teamsError);
        }

        try {
            const token = await getMsToken();
            const contenidoRenata = `
                <div style="font-family: Arial, sans-serif; color: #333;">
                    <h2>Solicitud de aumento salarial ${decisionLabel}</h2>
                    <p>
                        <strong>${aprobadorNombre}</strong> ${decision === 'Aprobada' ? 'aprobó' : 'rechazó'} la solicitud de aumento salarial de <strong>${empleadoNombre}</strong>.
                    </p>
                    <p>
                        Cargo: ${cargoTexto || 'N/A'}<br/>
                        Planta: ${a.planta || 'N/A'}<br/>
                        Salario actual: ${formatCurrency(a.salarioActual)}<br/>
                        Salario propuesto: <strong>${formatCurrency(a.salarioPropuesto)}</strong>
                    </p>
                    <p style="font-size:12px;color:#888;">Este es un mensaje automático del sistema de Talento Humano.</p>
                </div>
            `;
            await enviarCorreo(token, RENATA_EMAIL, `Solicitud de aumento salarial ${decisionLabel}: ${empleadoNombre}`, contenidoRenata);
        } catch (mailError) {
            console.error('Error enviando correo a Renata sobre la decision del aumento:', mailError);
        }

        // Solicitante: Teams, si tiene correo registrado.
        const solicitanteCorreo = ((solicitante as any)?.correo || '').trim();
        if (solicitanteCorreo) {
            try {
                const mensajeSolicitante = decision === 'Aprobada'
                    ? `<p><strong>${aprobadorNombre}</strong> aprobó la solicitud de aumento salarial para <strong>${empleadoNombre}</strong> (nuevo salario: ${formatCurrency(a.salarioPropuesto)}).</p>`
                    : `<p><strong>${aprobadorNombre}</strong> rechazó la solicitud de aumento salarial para <strong>${empleadoNombre}</strong>.</p>`;
                await sendTeamsMessage(solicitanteCorreo, mensajeSolicitante);
            } catch (teamsError) {
                console.error('Error notificando por Teams al solicitante sobre la decision del aumento:', teamsError);
            }
        }
    } catch (error) {
        console.error('Error notificando la decision del aumento salarial:', error);
    }
}
