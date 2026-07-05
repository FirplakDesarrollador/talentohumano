import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { empleadoId, selectedEmpleados, selectedCargo } = body;

        if (!empleadoId || !selectedEmpleados || selectedEmpleados.length === 0 || !selectedCargo) {
            return NextResponse.json({ error: 'Faltan parámetros requeridos' }, { status: 400 });
        }

        // Initialize Supabase client
        const cookieStore = await cookies();
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return cookieStore.getAll();
                    },
                    setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
                        try {
                            cookiesToSet.forEach(({ name, value, options }) =>
                                cookieStore.set(name, value, options)
                            );
                        } catch (error) {
                            // Ignored if called from a Server Component
                        }
                    },
                },
            }
        );

        // Get logged in user (sender)
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user || !user.email) {
            return NextResponse.json({ error: 'Usuario no autenticado' }, { status: 401 });
        }
        const senderEmail = user.email;

        // Fetch absent employee info
        const { data: empAusente, error: empError } = await supabase
            .from('empleados')
            .select('nombreCompleto, jefe')
            .eq('id', empleadoId)
            .maybeSingle();

        if (empError || !empAusente) {
            return NextResponse.json({ error: 'Empleado ausente no encontrado' }, { status: 404 });
        }

        // Fetch replacements info
        const { data: reemplazosData, error: reemError } = await supabase
            .from('empleados')
            .select('nombreCompleto, correo_electronico')
            .in('id', selectedEmpleados);

        if (reemError || !reemplazosData || reemplazosData.length === 0) {
            return NextResponse.json({ error: 'Reemplazos no encontrados' }, { status: 404 });
        }

        // Find Jefe's email
        let jefeEmail = '';
        if (empAusente.jefe) {
            // Trim and split by spaces to make search more robust if needed, but a direct ILIKE is a good start
            const { data: jefeData } = await supabase
                .from('empleados')
                .select('correo_electronico')
                .ilike('nombreCompleto', `%${empAusente.jefe.trim()}%`)
                .limit(1)
                .maybeSingle();
            
            if (jefeData && jefeData.correo_electronico) {
                jefeEmail = jefeData.correo_electronico;
            }
        }

        // Microsoft Graph Authentication
        const tenantId = process.env.MICROSOFT_TENANT_ID;
        const clientId = process.env.MICROSOFT_CLIENT_ID;
        const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;

        if (!tenantId || !clientId || !clientSecret) {
            console.error('Missing Microsoft credentials in environment variables');
            return NextResponse.json({ error: 'Error de configuración del servidor' }, { status: 500 });
        }

        // 1. Get Application Access Token
        const tokenParams = new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            scope: 'https://graph.microsoft.com/.default',
            grant_type: 'client_credentials'
        });

        const tokenResponse = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: tokenParams.toString()
        });

        if (!tokenResponse.ok) {
            const tokenError = await tokenResponse.text();
            console.error('Error getting app token:', tokenError);
            return NextResponse.json({ error: 'Error autenticando con Microsoft' }, { status: 500 });
        }

        const tokenData = await tokenResponse.json();
        const accessToken = tokenData.access_token;

        // Helper function to send email
        const sendGraphEmail = async (toEmail: string, subject: string, content: string) => {
            const emailData = {
                message: {
                    subject: subject,
                    body: {
                        contentType: "HTML",
                        content: content
                    },
                    toRecipients: [
                        {
                            emailAddress: {
                                address: toEmail
                            }
                        }
                    ]
                },
                saveToSentItems: "true"
            };

            const graphResponse = await fetch(`https://graph.microsoft.com/v1.0/users/${senderEmail}/sendMail`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(emailData)
            });

            if (!graphResponse.ok) {
                const graphError = await graphResponse.text();
                console.error(`Error sending email to ${toEmail}:`, graphError);
                return false;
            }
            return true;
        };

        // Send Emails to Replacements
        const nombresReemplazos = reemplazosData.map(r => r.nombreCompleto).join(', ');
        const emailsSent: string[] = [];
        const emailsFailed: string[] = [];

        for (const reemplazo of reemplazosData) {
            if (reemplazo.correo_electronico) {
                const subjectReemplazo = `Asignación de Reemplazo / Polivalencia: ${selectedCargo}`;
                const contentReemplazo = `
                    <div style="font-family: Arial, sans-serif; color: #333;">
                        <h2>Notificación de Asignación de Reemplazo</h2>
                        <p>Hola <strong>${reemplazo.nombreCompleto}</strong>,</p>
                        <p>Se te ha asignado como encargado(a) durante la ausencia de <strong>${empAusente.nombreCompleto}</strong>.</p>
                        <p><strong>Cargo a cubrir:</strong> ${selectedCargo}</p>
                        <p>Para revisar el archivo soporte dirígete al siguiente link: <a href="https://talentohumano.vercel.app/login">Talento Humano</a></p>
                        <br/>
                        <p>Este es un mensaje automático del sistema de Talento Humano.</p>
                    </div>
                `;
                const success = await sendGraphEmail(reemplazo.correo_electronico, subjectReemplazo, contentReemplazo);
                if (success) emailsSent.push(reemplazo.correo_electronico);
                else emailsFailed.push(reemplazo.correo_electronico);
            }
        }

        // Send Email to Jefe
        if (jefeEmail) {
            const subjectJefe = `Notificación de Reemplazo Asignado - ${empAusente.nombreCompleto}`;
            const contentJefe = `
                <div style="font-family: Arial, sans-serif; color: #333;">
                    <h2>Notificación de Reemplazo Asignado</h2>
                    <p>Hola,</p>
                    <p>Te informamos que se ha registrado un reemplazo para <strong>${empAusente.nombreCompleto}</strong>.</p>
                    <p><strong>Cargo a cubrir:</strong> ${selectedCargo}</p>
                    <p><strong>Persona(s) encargada(s):</strong> ${nombresReemplazos}</p>
                    <p>Para revisar el archivo soporte dirígete al siguiente link: <a href="https://talentohumano.vercel.app/login">Talento Humano</a></p>
                    <br/>
                    <p>Este es un mensaje automático del sistema de Talento Humano.</p>
                </div>
            `;
            const success = await sendGraphEmail(jefeEmail, subjectJefe, contentJefe);
            if (success) emailsSent.push(jefeEmail);
            else emailsFailed.push(jefeEmail);
        }

        return NextResponse.json({ 
            success: true, 
            emailsSent, 
            emailsFailed, 
            jefeFound: !!jefeEmail 
        });

    } catch (error: any) {
        console.error('Internal API error in reemplazo email:', error);
        return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
    }
}
