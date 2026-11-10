import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';
import { sendTeamsMessage } from '@/lib/teams/sendTeamsMessage';

const APP_URL = 'https://talentohumano.vercel.app';
const SENDER_EMAIL = 'analista.desarrollador@firplak.com';
const RENATA_EMAIL = 'renata.lainez@firplak.com';

function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(amount);
}

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
        console.error('Error enviando correo de aumentos-salariales:', await res.text());
    }
}

export async function POST(request: Request) {
    try {
        const { aumentoId } = await request.json();
        if (!aumentoId) {
            return NextResponse.json({ error: 'Falta aumentoId' }, { status: 400 });
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        const supabase = createClient(supabaseUrl, serviceRoleKey);

        const { data: aumento, error: aumentoError } = await supabase
            .from('aumentosSalariales')
            .select('id, empleado_id, aprobador, solicitante, salarioActual, salarioPropuesto, cargoAnterior, cargoPropuesto, requiereAscenso, comentariosSolicitante, fechaAplicacion, planta')
            .eq('id', aumentoId)
            .single();
        if (aumentoError || !aumento) throw aumentoError || new Error('Solicitud no encontrada');

        const { data: empleado, error: empError } = await supabase
            .from('empleados')
            .select('nombreCompleto')
            .eq('id', (aumento as any).empleado_id)
            .single();
        if (empError || !empleado) throw empError || new Error('Empleado no encontrado');

        const { data: aprobadorEmp, error: aprobadorError } = await supabase
            .from('empleados')
            .select('nombreCompleto, correo_electronico')
            .eq('id', (aumento as any).aprobador)
            .single();
        if (aprobadorError || !aprobadorEmp) throw aprobadorError || new Error('Aprobador no encontrado');

        const { data: solicitante } = await supabase
            .from('usuarios')
            .select('nombre')
            .eq('id', (aumento as any).solicitante)
            .single();

        const aprobadorCorreo = ((aprobadorEmp as any).correo_electronico || '').trim();
        if (!aprobadorCorreo) {
            return NextResponse.json({ error: 'El aprobador no tiene correo registrado' }, { status: 400 });
        }

        const token = randomBytes(24).toString('hex');
        await supabase
            .from('aumentosSalariales')
            .update({ token })
            .eq('id', aumentoId);

        const link = `${APP_URL}/decision-aumento/${token}`;
        const empleadoNombre = (empleado as any).nombreCompleto;
        const aprobadorNombre = (aprobadorEmp as any).nombreCompleto;
        const solicitanteNombre = (solicitante as any)?.nombre || 'Un usuario del sistema';
        const cargoTexto = (aumento as any).requiereAscenso
            ? `${(aumento as any).cargoAnterior} → ${(aumento as any).cargoPropuesto} (ascenso)`
            : (aumento as any).cargoAnterior;

        const mensaje = `
            <p><strong>Nueva solicitud de aumento salarial</strong> para tu aprobación.</p>
            <p>
                Empleado: <strong>${empleadoNombre}</strong><br/>
                Cargo: ${cargoTexto}<br/>
                Salario actual: ${formatCurrency((aumento as any).salarioActual)}<br/>
                Salario propuesto: <strong>${formatCurrency((aumento as any).salarioPropuesto)}</strong>
            </p>
            <p><a href="${link}">Revisar y responder la solicitud</a></p>
        `;

        try {
            await sendTeamsMessage(aprobadorCorreo, mensaje);
        } catch (teamsError) {
            console.error('Error enviando notificacion de Teams al aprobador:', teamsError);
        }

        try {
            const msToken = await getMsToken();

            const contenidoAprobador = `
                <div style="font-family: Arial, sans-serif; color: #333;">
                    <h2>Solicitud de aumento salarial: ${empleadoNombre}</h2>
                    <p>Se registró una solicitud de aumento salarial que requiere tu aprobación.</p>
                    <p>
                        Empleado: <strong>${empleadoNombre}</strong><br/>
                        Cargo: ${cargoTexto}<br/>
                        Planta: ${(aumento as any).planta || 'No especificada'}<br/>
                        Salario actual: ${formatCurrency((aumento as any).salarioActual)}<br/>
                        Salario propuesto: <strong>${formatCurrency((aumento as any).salarioPropuesto)}</strong><br/>
                        Fecha de aplicación solicitada: ${formatFecha((aumento as any).fechaAplicacion)}<br/>
                        Solicitado por: ${solicitanteNombre}
                    </p>
                    ${(aumento as any).comentariosSolicitante ? `<p><strong>Justificación:</strong> "${(aumento as any).comentariosSolicitante}"</p>` : ''}
                    <p><a href="${link}" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">Aprobar o rechazar la solicitud</a></p>
                    <p style="font-size:12px;color:#888;">Este es un mensaje automático del sistema de Talento Humano.</p>
                </div>
            `;
            await enviarCorreo(msToken, aprobadorCorreo, `Solicitud de aumento salarial: ${empleadoNombre}`, contenidoAprobador);

            const contenidoRenata = `
                <div style="font-family: Arial, sans-serif; color: #333;">
                    <h2>Nueva solicitud de aumento salarial</h2>
                    <p>Se creó una solicitud de aumento salarial para <strong>${empleadoNombre}</strong> (${cargoTexto}).</p>
                    <p>
                        Salario actual: ${formatCurrency((aumento as any).salarioActual)}<br/>
                        Salario propuesto: <strong>${formatCurrency((aumento as any).salarioPropuesto)}</strong><br/>
                        Solicitado por: ${solicitanteNombre}<br/>
                        Pendiente de aprobación de: <strong>${aprobadorNombre}</strong>
                    </p>
                    <p style="font-size:12px;color:#888;">Este es un mensaje informativo automático del sistema de Talento Humano.</p>
                </div>
            `;
            await enviarCorreo(msToken, RENATA_EMAIL, `Nueva solicitud de aumento salarial: ${empleadoNombre}`, contenidoRenata);
        } catch (mailError) {
            console.error('Error enviando correos de aumentos-salariales:', mailError);
        }

        await supabase
            .from('aumentosSalariales')
            .update({ notificacion_enviada: true })
            .eq('id', aumentoId);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Internal API error in aumentos-salariales/notificar:', error);
        return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
    }
}
