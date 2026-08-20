import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generarContratoTerminoFijoDocx, convertirDocxAPdf, sumarMeses, formatearFechaLarga } from '@/lib/contratos/generarContratoTerminoFijo';
import { generarContratoIndefinidoDocx } from '@/lib/contratos/generarContratoIndefinido';

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

interface CorreoAttachment {
    name: string;
    contentType: string;
    contentBytes: string; // base64
}

async function enviarCorreo(token: string, toEmail: string, subject: string, content: string, attachments?: CorreoAttachment[]) {
    const emailData = {
        message: {
            subject,
            body: { contentType: 'HTML', content },
            toRecipients: [{ emailAddress: { address: toEmail } }],
            attachments: attachments?.map(a => ({
                '@odata.type': '#microsoft.graph.fileAttachment',
                name: a.name,
                contentType: a.contentType,
                contentBytes: a.contentBytes,
            })),
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

const MENSAJES_EMPLEADO: Record<string, { subject: string; texto: string }> = {
    PROLONGAR_TEMPORAL: {
        subject: 'Tu contrato se prolonga',
        texto: 'te confirmamos que tu contrato con la temporal se prolonga. ¡Gracias por tu compromiso!',
    },
    CONTRATAR_TERMINO_FIJO: {
        subject: 'Novedad sobre tu contrato',
        texto: 'te confirmamos que pasas a contrato directo a término fijo con Firplak. ¡Felicitaciones!',
    },
    CONTRATAR_INDEFINIDO: {
        subject: 'Novedad sobre tu contrato',
        texto: 'te confirmamos que pasas a contrato a término indefinido con Firplak. ¡Felicitaciones!',
    },
};

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
            .select('id, nombreCompleto, cargo, planta, correo_electronico, direccion, fecha_nacimiento, lugar_nacimiento, salario')
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
                const empleadoCorreo = ((empleado as any).correo_electronico || '').trim();
                const empleadoNombre = (empleado as any).nombreCompleto;
                const mensaje = MENSAJES_EMPLEADO[decision];

                let contratoNota = '';
                let attachments: CorreoAttachment[] | undefined;

                if (decision === 'CONTRATAR_TERMINO_FIJO' || decision === 'CONTRATAR_INDEFINIDO') {
                    const esIndefinido = decision === 'CONTRATAR_INDEFINIDO';
                    const nombreContrato = esIndefinido ? 'a término indefinido' : 'a término fijo';
                    try {
                        const fechaInicio = new Date();
                        const fechaFin = esIndefinido ? null : sumarMeses(fechaInicio, 3);
                        const docxBuffer = esIndefinido
                            ? await generarContratoIndefinidoDocx(empleado as any, fechaInicio)
                            : await generarContratoTerminoFijoDocx(empleado as any, fechaInicio);

                        await supabase
                            .from('empleados')
                            .update({
                                tipo_contrato: esIndefinido ? 'INDEFINIDO' : 'TERMINO_FIJO',
                                fecha_inicio_contrato_actual: fechaInicio.toISOString().slice(0, 10),
                            })
                            .eq('id', (empleado as any).id);

                        let pdfBuffer: Buffer | null = null;
                        try {
                            pdfBuffer = await convertirDocxAPdf(docxBuffer, `contrato_${(empleado as any).id}_${Date.now()}`);
                        } catch (pdfError) {
                            console.error('Error convirtiendo contrato a PDF (revisar permiso Files.ReadWrite.All en Azure):', pdfError);
                        }

                        const archivoBuffer = pdfBuffer || docxBuffer;
                        const extension = pdfBuffer ? 'pdf' : 'docx';
                        const contentType = pdfBuffer ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
                        const nombreCarpeta = empleadoNombre.toUpperCase().replace(/[^A-Z0-9ÁÉÍÓÚÑ]+/g, '_');
                        const nombreArchivo = `Contrato ${nombreContrato} - ${formatearFechaLarga(fechaInicio)}.${extension}`;
                        const storagePath = `activos/${nombreCarpeta}/Documentos/Contrato/${Date.now()}_${nombreArchivo.replace(/\s+/g, '_')}`;

                        const { error: uploadError } = await supabase.storage
                            .from('archivo-digital')
                            .upload(storagePath, archivoBuffer, { contentType, upsert: false });

                        if (!uploadError) {
                            await supabase.from('archivo_digital_documentos').insert({
                                categoria: 'ACTIVOS',
                                carpeta_origen: empleadoNombre.toUpperCase(),
                                empleado_id: (empleado as any).id,
                                nombre_archivo: nombreArchivo,
                                storage_path: storagePath,
                                tamano_bytes: archivoBuffer.length,
                            } as any);
                        } else {
                            console.error('Error guardando el contrato generado en Archivo Digital:', uploadError);
                        }

                        attachments = [{
                            name: nombreArchivo,
                            contentType,
                            contentBytes: archivoBuffer.toString('base64'),
                        }];
                        const rangoFechas = fechaFin
                            ? `${formatearFechaLarga(fechaInicio)} — ${formatearFechaLarga(fechaFin)}`
                            : `desde ${formatearFechaLarga(fechaInicio)}`;
                        contratoNota = pdfBuffer
                            ? `<p>Se generó el contrato ${nombreContrato} (${rangoFechas}), adjunto en este correo y guardado en el Archivo Digital del empleado.</p>`
                            : `<p style="color:#b91c1c;">Se generó el contrato en Word (adjunto), pero falló la conversión automática a PDF — revisa el permiso <strong>Files.ReadWrite.All</strong> en Azure. Por ahora queda en formato .docx.</p>`;
                    } catch (contratoError) {
                        console.error(`Error generando el contrato ${nombreContrato}:`, contratoError);
                        contratoNota = `<p style="color:#b91c1c;">No se pudo generar automáticamente el contrato ${nombreContrato} — genéralo manualmente.</p>`;
                    }
                }

                const contenidoRenata = `
                    <div style="font-family: Arial, sans-serif; color: #333;">
                        <h2>Decisión de Contrato</h2>
                        <p><strong>${alerta.jefe_nombre || 'El jefe directo'}</strong> decidió: <strong>${decisionLabel}</strong> para <strong>${empleadoNombre}</strong> (${(empleado as any).cargo || 'sin cargo'}, ${(empleado as any).planta || 'sin planta'}).</p>
                        ${empleadoCorreo
                        ? `<p>Se le notificó la novedad por correo a <strong>${empleadoCorreo}</strong>.</p>`
                        : `<p style="color:#b91c1c;">No se encontró un correo registrado para el empleado — notifícalo por otro medio.</p>`
                    }
                        ${contratoNota}
                    </div>
                `;
                await enviarCorreo(msToken, RENATA_EMAIL, `Decisión de contrato: ${empleadoNombre}`, contenidoRenata, attachments);

                if (empleadoCorreo && mensaje) {
                    const contenidoEmpleado = `
                        <div style="font-family: Arial, sans-serif; color: #333;">
                            <p>Hola ${empleadoNombre},</p>
                            <p>${mensaje.texto}</p>
                        </div>
                    `;
                    await enviarCorreo(msToken, empleadoCorreo, mensaje.subject, contenidoEmpleado);
                }
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
