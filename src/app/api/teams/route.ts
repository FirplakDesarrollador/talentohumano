import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { instructor_correo, subject, content, startDateTime, endDateTime } = body;

        if (!instructor_correo) {
            return NextResponse.json({ error: 'Falta el correo del instructor' }, { status: 400 });
        }

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

        // 2. Create Event in Instructor's Calendar
        const eventData = {
            subject: subject,
            body: {
                contentType: "HTML",
                content: content
            },
            start: {
                dateTime: startDateTime,
                timeZone: "America/Bogota"
            },
            end: {
                dateTime: endDateTime,
                timeZone: "America/Bogota"
            },
            isOnlineMeeting: true,
            onlineMeetingProvider: "teamsForBusiness"
        };

        const graphResponse = await fetch(`https://graph.microsoft.com/v1.0/users/${instructor_correo}/events`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(eventData)
        });

        if (!graphResponse.ok) {
            const graphError = await graphResponse.text();
            console.error('Error creating event for user:', graphError);
            return NextResponse.json({ error: 'No se pudo crear el evento en el calendario del instructor' }, { status: 500 });
        }

        const graphData = await graphResponse.json();

        return NextResponse.json({ success: true, data: graphData });

    } catch (error) {
        console.error('Internal API error:', error);
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
}
