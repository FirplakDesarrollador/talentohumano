import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

const RENATA_EMAIL = 'renata.lainez@firplak.com'
const APP_URL = 'https://talentohumano.vercel.app'

// Colombia (America/Bogota) esta fija en UTC-05:00 todo el año, sin horario de verano.
const BOGOTA_UTC_OFFSET_HOURS = 5

function bogotaLocalToUtcIso(localDateTime: string): string {
    const [datePart, timePart] = localDateTime.split('T')
    const [year, month, day] = datePart.split('-').map(Number)
    const [hour, minute, second] = (timePart || '00:00:00').split(':').map(Number)
    const utcMs = Date.UTC(year, month - 1, day, hour + BOGOTA_UTC_OFFSET_HOURS, minute, second || 0)
    return new Date(utcMs).toISOString()
}

async function getMsToken(): Promise<string> {
    const tenantId = process.env.MICROSOFT_TENANT_ID!
    const clientId = process.env.MICROSOFT_CLIENT_ID!
    const clientSecret = process.env.MICROSOFT_CLIENT_SECRET!

    const tokenParams = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        scope: 'https://graph.microsoft.com/.default',
        grant_type: 'client_credentials',
    })

    const res = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: tokenParams.toString(),
    })
    const data = await res.json()
    if (!res.ok) throw new Error('Error autenticando con Microsoft: ' + JSON.stringify(data))
    return data.access_token
}

export async function POST(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        const { procesoId, fecha, horaInicio, horaFin } = await request.json()
        if (!procesoId || !fecha || !horaInicio || !horaFin) {
            return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        if (!supabaseUrl || !serviceRoleKey) {
            return NextResponse.json({ error: 'Configuración del servidor incompleta' }, { status: 500 })
        }
        const admin = createAdminClient(supabaseUrl, serviceRoleKey)

        const { data: proceso, error: procesoError } = await admin
            .from('query_procesos_disciplinarios')
            .select('*')
            .eq('id', procesoId)
            .single()
        if (procesoError || !proceso) {
            return NextResponse.json({ error: 'Proceso no encontrado' }, { status: 404 })
        }
        const p = proceso as any
        if (p.tipo !== 'Descargo') {
            return NextResponse.json({ error: 'Este proceso no es de tipo Descargo' }, { status: 400 })
        }

        const { data: empleado } = await admin
            .from('empleados')
            .select('correo_electronico')
            .eq('id', p.empleado_id)
            .single()
        const empleadoCorreo = (empleado as any)?.correo_electronico as string | null

        const attendees: any[] = [
            { emailAddress: { address: RENATA_EMAIL, name: 'Renata Lainez' }, type: 'required' },
        ]
        if (empleadoCorreo) {
            attendees.push({ emailAddress: { address: empleadoCorreo, name: p.nombreCompleto || 'Empleado' }, type: 'required' })
        }

        const appLink = `${APP_URL}/procesos-disciplinarios/${p.empleado_id}?destacar=${p.id}`
        const eventData = {
            subject: `Audiencia de descargos - ${p.nombreCompleto || 'Empleado'}`,
            body: {
                contentType: 'HTML',
                content: `<p>Audiencia de descargos del proceso disciplinario de <b>${p.nombreCompleto || 'el empleado'}</b> (${p.cargo || 'sin cargo'}, ${p.planta || 'sin planta'}).</p><p>Motivo: ${p.motivo || 'N/A'}</p><p><a href="${appLink}">Ver proceso en Talento Humano</a></p>`,
            },
            start: { dateTime: bogotaLocalToUtcIso(`${fecha}T${horaInicio}:00`), timeZone: 'UTC' },
            end: { dateTime: bogotaLocalToUtcIso(`${fecha}T${horaFin}:00`), timeZone: 'UTC' },
            isOnlineMeeting: true,
            onlineMeetingProvider: 'teamsForBusiness',
            attendees,
        }

        const token = await getMsToken()
        const graphRes = await fetch(`https://graph.microsoft.com/v1.0/users/${RENATA_EMAIL}/events`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(eventData),
        })
        if (!graphRes.ok) {
            const err = await graphRes.text()
            console.error('Error creando la reunion en Graph:', err)
            return NextResponse.json({ error: 'No se pudo crear la reunión en Teams' }, { status: 500 })
        }
        const graphData = await graphRes.json()

        return NextResponse.json({
            success: true,
            joinUrl: graphData?.onlineMeeting?.joinUrl || null,
            empleadoSinCorreo: !empleadoCorreo,
        })
    } catch (error: any) {
        console.error('Error programando reunion de proceso disciplinario:', error)
        return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 })
    }
}
