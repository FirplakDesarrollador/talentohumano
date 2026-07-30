import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Cuenta desde la que se envían los recordatorios (requiere permiso de envío
// via Microsoft Graph con la app registrada en Azure).
const SENDER_EMAIL = 'analista.desarrollador@firplak.com';
const DIAS_ESPERA = 15;

export async function GET(request: Request) {
    // Vercel Cron agrega este header automáticamente cuando CRON_SECRET está
    // configurado en las variables de entorno del proyecto. Si no está
    // configurado, no se exige (para no romper pruebas locales/manuales).
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
        const authHeader = request.headers.get('authorization');
        if (authHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }
    }

    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        const tenantId = process.env.MICROSOFT_TENANT_ID;
        const clientId = process.env.MICROSOFT_CLIENT_ID;
        const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;

        if (!supabaseUrl || !supabaseAnonKey || !tenantId || !clientId || !clientSecret) {
            console.error('Missing environment variables for cesantias reminder cron');
            return NextResponse.json({ error: 'Error de configuración del servidor' }, { status: 500 });
        }

        const supabase = createClient(supabaseUrl, supabaseAnonKey);

        const limiteFecha = new Date(Date.now() - DIAS_ESPERA * 24 * 60 * 60 * 1000).toISOString();

        const { data: pendientes, error: fetchError } = await (supabase as any)
            .from('Cesantias')
            .select('id, Nombre, Correo, "Fecha Aprobación", "Tipo de Cesantias"')
            .eq('Aprobación THT', 'Aprobado')
            .eq('Recordatorio Soporte Enviado', false)
            .lte('Fecha Aprobación', limiteFecha)
            .is('Soporte2', null)
            .not('Correo', 'is', null);

        if (fetchError) throw fetchError;

        if (!pendientes || pendientes.length === 0) {
            return NextResponse.json({ success: true, revisados: 0, enviados: [], fallidos: [] });
        }

        // Application access token for Microsoft Graph
        const tokenParams = new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            scope: 'https://graph.microsoft.com/.default',
            grant_type: 'client_credentials'
        });

        const tokenResponse = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: tokenParams.toString()
        });

        if (!tokenResponse.ok) {
            const tokenError = await tokenResponse.text();
            console.error('Error getting app token:', tokenError);
            return NextResponse.json({ error: 'Error autenticando con Microsoft' }, { status: 500 });
        }

        const { access_token: accessToken } = await tokenResponse.json();

        const enviados: number[] = [];
        const fallidos: number[] = [];

        for (const solicitud of pendientes) {
            if (!solicitud.Correo) {
                fallidos.push(solicitud.id);
                continue;
            }

            const subject = 'Recordatorio: soporte de compra pendiente - Cesantías';
            const content = `
                <div style="font-family: Arial, sans-serif; color: #333;">
                    <h2>Recordatorio de Soporte de Compra</h2>
                    <p>Hola <strong>${solicitud.Nombre || ''}</strong>,</p>
                    <p>Hace 15 días se aprobó tu solicitud de retiro de cesantías${solicitud['Tipo de Cesantias'] ? ` (${solicitud['Tipo de Cesantias']})` : ''} y aún no hemos recibido el soporte de en qué invertiste ese dinero.</p>
                    <p>Por favor ingresa a la app y sube el comprobante correspondiente (factura, escritura, recibo, etc.) en tu solicitud, dentro de la sección "Mis Solicitudes".</p>
                    <p><a href="https://talentohumano.vercel.app/cesantias">Subir soporte de compra</a></p>
                    <br/>
                    <p>Este es un mensaje automático del sistema de Talento Humano.</p>
                </div>
            `;

            const emailData = {
                message: {
                    subject,
                    body: { contentType: 'HTML', content },
                    toRecipients: [{ emailAddress: { address: solicitud.Correo } }]
                },
                saveToSentItems: 'true'
            };

            const graphResponse = await fetch(`https://graph.microsoft.com/v1.0/users/${SENDER_EMAIL}/sendMail`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(emailData)
            });

            if (!graphResponse.ok) {
                const graphError = await graphResponse.text();
                console.error(`Error sending reminder for Cesantias id ${solicitud.id}:`, graphError);
                fallidos.push(solicitud.id);
                continue;
            }

            const { error: updateError } = await (supabase as any)
                .from('Cesantias')
                .update({ 'Recordatorio Soporte Enviado': true })
                .eq('id', solicitud.id);

            if (updateError) {
                console.error(`Error marking reminder as sent for Cesantias id ${solicitud.id}:`, updateError);
                fallidos.push(solicitud.id);
                continue;
            }

            enviados.push(solicitud.id);
        }

        return NextResponse.json({ success: true, revisados: pendientes.length, enviados, fallidos });
    } catch (error: any) {
        console.error('Internal API error in cesantias reminder cron:', error);
        return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
    }
}
