import { NextResponse } from 'next/server';

// Colombia (America/Bogota) is fixed at UTC-05:00 year-round, with no daylight saving time.
const BOGOTA_UTC_OFFSET_HOURS = 5;

// Converts a naive local datetime string ("YYYY-MM-DDTHH:mm:ss") representing
// America/Bogota wall-clock time into an explicit UTC ISO string. This avoids
// relying on Microsoft Graph to correctly interpret the IANA "America/Bogota"
// timeZone name, which it does not always honor consistently.
function bogotaLocalToUtcIso(localDateTime: string): string {
    const [datePart, timePart] = localDateTime.split('T');
    const [year, month, day] = datePart.split('-').map(Number);
    const [hour, minute, second] = (timePart || '00:00:00').split(':').map(Number);

    const utcMs = Date.UTC(year, month - 1, day, hour + BOGOTA_UTC_OFFSET_HOURS, minute, second || 0);
    return new Date(utcMs).toISOString();
}

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
                dateTime: bogotaLocalToUtcIso(startDateTime),
                timeZone: "UTC"
            },
            end: {
                dateTime: bogotaLocalToUtcIso(endDateTime),
                timeZone: "UTC"
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
