import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SENDER_EMAIL = 'analista.desarrollador@firplak.com'

const TIPOS_CARTA = ['agradecimiento', 'bienvenida', 'archivos'] as const
type TipoCarta = typeof TIPOS_CARTA[number]

const CAMPO_ENVIADA: Record<TipoCarta, string> = {
    agradecimiento: 'carta_agradecimiento_enviada_at',
    bienvenida: 'carta_bienvenida_enviada_at',
    archivos: 'carta_archivos_enviada_at',
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

async function enviarCorreo(token: string, toEmail: string, subject: string, content: string) {
    const emailData = {
        message: {
            subject,
            body: { contentType: 'HTML', content },
            toRecipients: [{ emailAddress: { address: toEmail } }],
        },
        saveToSentItems: 'true',
    }

    const res = await fetch(`https://graph.microsoft.com/v1.0/users/${SENDER_EMAIL}/sendMail`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(emailData),
    })
    if (!res.ok) {
        throw new Error('Error enviando correo: ' + (await res.text()))
    }
}

// NOTA: plantillas provisionales. Talento Humano va a enviar el texto definitivo
// de cada carta para reemplazar este contenido.
function buildCarta(tipo: TipoCarta, nombre: string, cargo: string): { subject: string; html: string } {
    const wrapper = (titulo: string, cuerpo: string) => `
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 560px;">
            <h2 style="color:#1D3557;">${titulo}</h2>
            ${cuerpo}
            <p style="margin-top:24px;">Talento Humano<br/>FIRPLAK S.A.</p>
        </div>
    `

    if (tipo === 'agradecimiento') {
        return {
            subject: `Gracias por tu interés en FIRPLAK — ${cargo}`,
            html: wrapper('¡Gracias por postularte!', `
                <p>Hola ${nombre},</p>
                <p>Queremos agradecerte por tu interés en la vacante de <strong>${cargo}</strong> en FIRPLAK S.A. y por el tiempo dedicado a tu postulación.</p>
                <p>Nuestro equipo de Talento Humano revisará tu perfil y, si hay avances en el proceso, nos pondremos en contacto contigo.</p>
            `),
        }
    }
    if (tipo === 'bienvenida') {
        return {
            subject: `¡Bienvenido/a a FIRPLAK! — ${cargo}`,
            html: wrapper('¡Bienvenido/a a FIRPLAK!', `
                <p>Hola ${nombre},</p>
                <p>Nos complace darte la bienvenida al equipo FIRPLAK para el cargo de <strong>${cargo}</strong>. Estamos muy contentos de que te unas a nosotros.</p>
                <p>Pronto recibirás más información sobre los siguientes pasos de tu proceso de vinculación.</p>
            `),
        }
    }
    return {
        subject: `Confirmación de documentos recibidos — ${cargo}`,
        html: wrapper('Documentos recibidos correctamente', `
            <p>Hola ${nombre},</p>
            <p>Te confirmamos que recibimos correctamente los documentos que enviaste para tu proceso de vinculación al cargo de <strong>${cargo}</strong>.</p>
            <p>Si hace falta algo adicional, nos pondremos en contacto contigo.</p>
        `),
    }
}

export async function POST(request: Request) {
    try {
        const { candidatoId, tipo } = await request.json()
        if (!candidatoId || !TIPOS_CARTA.includes(tipo)) {
            return NextResponse.json({ error: 'Faltan datos o el tipo de carta no es válido' }, { status: 400 })
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
        const supabase = createClient(supabaseUrl, serviceRoleKey)

        const { data: candidato, error: candidatoError } = await supabase
            .from('seleccion_candidatos' as any)
            .select('id, nombre_completo, email, seleccion_vacantes(cargo)')
            .eq('id', candidatoId)
            .single()

        if (candidatoError || !candidato) {
            return NextResponse.json({ error: 'Candidato no encontrado' }, { status: 404 })
        }

        const c = candidato as any
        if (!c.email) {
            return NextResponse.json({ error: 'El candidato no tiene correo registrado' }, { status: 400 })
        }

        const cargo = c.seleccion_vacantes?.cargo || 'la vacante'
        const { subject, html } = buildCarta(tipo as TipoCarta, c.nombre_completo || 'candidato/a', cargo)

        const token = await getMsToken()
        await enviarCorreo(token, c.email, subject, html)

        const { error: updateError } = await (supabase.from('seleccion_candidatos' as any) as any)
            .update({ [CAMPO_ENVIADA[tipo as TipoCarta]]: new Date().toISOString() })
            .eq('id', candidatoId)
        if (updateError) throw updateError

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Error enviando carta a candidato:', error)
        return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 })
    }
}
