import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getMsToken, crearTareaPlanner } from '@/lib/planner';

const SENDER_EMAIL = 'analista.desarrollador@firplak.com';
const NOTIFY_EMAILS = ['talentos@firplak.com', 'camila.jimenez@firplak.com'];
const APP_URL = 'https://talentohumano.vercel.app';

async function enviarCorreo(token: string, toEmails: string[], subject: string, content: string) {
    const emailData = {
        message: {
            subject,
            body: { contentType: 'HTML', content },
            toRecipients: toEmails.map(address => ({ emailAddress: { address } })),
        },
        saveToSentItems: 'true',
    };

    await fetch(`https://graph.microsoft.com/v1.0/users/${SENDER_EMAIL}/sendMail`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(emailData),
    });
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const {
            solicitante_empleado_id,
            solicitante_nombre,
            solicitante_correo,
            cargo_solicitado,
            area_planta,
            motivo,
            reemplazo_de,
            cantidad_personas,
            fecha_requerida,
            perfil,
            perfil_archivo_url,
            perfil_archivo_nombre,
            salario,
            horario,
        } = body;

        if (!solicitante_nombre || !solicitante_correo || !cargo_solicitado || !motivo) {
            return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
        }

        // Algunos correos en empleados.correo_electronico traen espacios o
        // saltos de linea (dato sucio historico) que rompen la resolucion de
        // usuario en Graph y el envio de correo si no se limpian primero.
        const solicitanteCorreoLimpio = String(solicitante_correo).trim();

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        const supabase = createClient(supabaseUrl, serviceRoleKey);

        const { data: inserted, error: insertError } = await supabase
            .from('solicitudes_personal')
            .insert({
                solicitante_empleado_id: solicitante_empleado_id || null,
                solicitante_nombre,
                solicitante_correo: solicitanteCorreoLimpio,
                cargo_solicitado,
                area_planta: area_planta || null,
                motivo,
                reemplazo_de: reemplazo_de || null,
                cantidad_personas: cantidad_personas || 1,
                fecha_requerida: fecha_requerida || null,
                perfil: perfil || null,
                perfil_archivo_url: perfil_archivo_url || null,
                perfil_archivo_nombre: perfil_archivo_nombre || null,
                salario: salario || null,
                horario: horario || null,
            })
            .select('id')
            .single();

        if (insertError || !inserted) {
            console.error('Error inserting solicitud de personal:', insertError);
            return NextResponse.json({ error: 'No se pudo guardar la solicitud' }, { status: 500 });
        }

        const solicitudId = inserted.id;

        // Planner + correo son "best effort": si fallan, la solicitud ya quedo
        // guardada y visible para Talento Humano en la pestaña correspondiente.
        try {
            const token = await getMsToken();
            const titulo = `Proceso de contratación de cargo ${cargo_solicitado}`;
            const { taskId, taskUrl } = await crearTareaPlanner(token, titulo, [SENDER_EMAIL, solicitanteCorreoLimpio]);

            await supabase
                .from('solicitudes_personal')
                .update({ planner_task_id: taskId, planner_task_url: taskUrl })
                .eq('id', solicitudId);

            const destinatarios = Array.from(new Set([...NOTIFY_EMAILS, solicitanteCorreoLimpio]));
            const contenido = `
                <div style="font-family: Arial, sans-serif; color: #333;">
                    <h2>Nueva Solicitud de Personal</h2>
                    <p><strong>Cargo:</strong> ${cargo_solicitado}</p>
                    <p><strong>Área/Planta:</strong> ${area_planta || 'N/A'}</p>
                    <p><strong>Motivo:</strong> ${motivo}${reemplazo_de ? ` (de ${reemplazo_de})` : ''}</p>
                    <p><strong>Cantidad:</strong> ${cantidad_personas || 1}</p>
                    <p><strong>Solicitado por:</strong> ${solicitante_nombre}</p>
                    ${perfil_archivo_url ? `<p><strong>Perfil de cargo:</strong> <a href="${perfil_archivo_url}">${perfil_archivo_nombre || 'Ver archivo'}</a></p>` : ''}
                    <p>Se creó una tarea de seguimiento en Planner:</p>
                    <p><a href="${taskUrl}">Ver tarea en Planner</a></p>
                    <p><a href="${APP_URL}">Ir a la app de Talento Humano</a></p>
                </div>
            `;
            await enviarCorreo(token, destinatarios, `Solicitud de Personal: ${cargo_solicitado}`, contenido);
        } catch (plannerError) {
            console.error('Error creating Planner task / sending email:', plannerError);
        }

        return NextResponse.json({ success: true, id: solicitudId });
    } catch (error: any) {
        console.error('Internal API error in solicitudes-personal:', error);
        return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
    }
}
