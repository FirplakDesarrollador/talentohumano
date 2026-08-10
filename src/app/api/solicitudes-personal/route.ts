import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Plan y bucket de Planner donde vive la tarea base "tarea base de consecución
// de personal administrativo" (FPK Talento Humano). Cada solicitud de
// personal crea una copia de esa tarea en el mismo plan/bucket.
const PLANNER_PLAN_ID = 'AiN77O9q2UCUGcf92cCCemQAFwoo';
const PLANNER_BUCKET_ID = 'jK0bUuOqL0umjvx_wgQ6bmQAME3I';
const PLANNER_BASE_TASK_ID = 'A-rb0xxzfkiy2V2ZSiX-EGQAOUgu';

const PLANNER_PRIORITY_IMPORTANTE = 3;
const PLANNER_PERCENT_EN_CURSO = 50;

const SENDER_EMAIL = 'talentos@firplak.com';
const NOTIFY_EMAILS = ['talentos@firplak.com', 'camila.jimenez@firplak.com'];
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

async function resolveUserId(token: string, email: string): Promise<string | null> {
    const res = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(email)}?$select=id`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.id || null;
}

async function crearTareaPlanner(token: string, titulo: string, asignadosEmails: string[]) {
    // 1. Checklist de la tarea base (siempre se lee en vivo, por si cambia)
    const baseDetailsRes = await fetch(`https://graph.microsoft.com/v1.0/planner/tasks/${PLANNER_BASE_TASK_ID}/details`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!baseDetailsRes.ok) throw new Error('No se pudo leer la tarea base de Planner');
    const baseDetails = await baseDetailsRes.json();
    const checklistTitles: string[] = Object.values(baseDetails.checklist || {}).map((item: any) => item.title);

    // 2. Resolver los usuarios de Microsoft 365 a asignar
    const assignments: Record<string, any> = {};
    for (const email of asignadosEmails) {
        const userId = await resolveUserId(token, email);
        if (userId) {
            assignments[userId] = { '@odata.type': '#microsoft.graph.plannerAssignment', orderHint: ' !' };
        }
    }

    // 3. Crear la tarea en el mismo plan/bucket que la tarea base
    const createRes = await fetch('https://graph.microsoft.com/v1.0/planner/tasks', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            planId: PLANNER_PLAN_ID,
            bucketId: PLANNER_BUCKET_ID,
            title: titulo,
            priority: PLANNER_PRIORITY_IMPORTANTE,
            percentComplete: PLANNER_PERCENT_EN_CURSO,
            assignments,
        }),
    });
    if (!createRes.ok) throw new Error('No se pudo crear la tarea en Planner: ' + await createRes.text());
    const created = await createRes.json();

    // 4. Copiar el checklist a la tarea nueva (necesita el etag de sus details)
    if (checklistTitles.length > 0) {
        const detailsGetRes = await fetch(`https://graph.microsoft.com/v1.0/planner/tasks/${created.id}/details`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        const etag = detailsGetRes.headers.get('etag');

        const checklist: Record<string, any> = {};
        checklistTitles.forEach((title, idx) => {
            checklist[`item${idx}`] = { '@odata.type': '#microsoft.graph.plannerChecklistItem', title, orderHint: ' !' };
        });

        await fetch(`https://graph.microsoft.com/v1.0/planner/tasks/${created.id}/details`, {
            method: 'PATCH',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
                'If-Match': etag || '',
            },
            body: JSON.stringify({ checklist }),
        });
    }

    const taskUrl = `https://planner.cloud.microsoft/webui/v1/plan/${PLANNER_PLAN_ID}/view/board/task/${created.id}?tid=${process.env.MICROSOFT_TENANT_ID}`;
    return { taskId: created.id as string, taskUrl };
}

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
