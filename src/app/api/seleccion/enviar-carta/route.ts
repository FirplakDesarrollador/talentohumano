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

// NOTA: "bienvenida" y "agradecimiento" usan el texto/diseño definitivo que
// envió Talento Humano (tarjetas "Bienvenido a la familia Firplak" y
// "¡Gracias por tu participación!"). "archivos" sigue siendo una plantilla
// provisional hasta que envíen su texto definitivo.
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
            subject: `Gracias por tu participación en nuestro proceso de selección — ${cargo}`,
            html: `
                <div style="font-family: Arial, Helvetica, sans-serif; max-width: 580px; margin: 0 auto; background:#2d4356; color:#f1f3f5; padding: 40px 36px;">
                    <h1 style="font-size:26px; font-weight:800; text-transform:uppercase; letter-spacing:1px; margin: 0 0 28px; color:#ffffff;">
                        &iexcl;Gracias por tu participaci&oacute;n!
                    </h1>
                    <p style="font-size:14px; line-height:1.8; margin: 0 0 18px; color:#dbe2e8;">Hola ${nombre},</p>
                    <p style="font-size:14px; line-height:1.8; margin: 0 0 18px; color:#dbe2e8; text-align:center;">
                        En nombre de FIRPLAK queremos agradecerte por haber participado en nuestro proceso de selección para <strong>${cargo}</strong>. Para nosotros es muy valioso contar con personas como t&uacute;, que por sus cualidades, hicieron del proceso una dif&iacute;cil decisi&oacute;n.
                    </p>
                    <p style="font-size:14px; line-height:1.8; margin: 0 0 18px; color:#dbe2e8; text-align:center;">
                        En esta ocasi&oacute;n, tu perfil no fue seleccionado para continuar en el proceso, sin embargo, valoramos mucho tu experiencia y habilidades por lo que conservaremos tu hoja de vida en nuestra base de datos para considerarte en futuras oportunidades que se ajusten a tu perfil.
                    </p>
                    <p style="font-size:14px; line-height:1.8; margin: 0 0 32px; color:#dbe2e8; text-align:center;">
                        Agradecemos de nuevo tu tiempo e inter&eacute;s, te deseamos muchos &eacute;xitos en tus pr&oacute;ximos retos profesionales.
                    </p>
                    <div style="text-align:center;">
                        <p style="font-size:26px; font-weight:800; letter-spacing:3px; color:#ffffff; margin: 0;">FIRPLAK</p>
                        <p style="font-size:12px; letter-spacing:2px; color:#9fb0bd; margin: 4px 0 0; text-transform:lowercase;">inspirando hogares</p>
                    </div>
                </div>
            `,
        }
    }
    if (tipo === 'bienvenida') {
        return {
            subject: `¡Bienvenido/a a la familia FIRPLAK! — ${cargo}`,
            html: `
                <div style="font-family: Arial, Helvetica, sans-serif; max-width: 560px; margin: 0 auto; background:#ffffff;">
                    <div style="height:10px; background: linear-gradient(90deg, #1D3557 0%, #1D3557 40%, #8aa0b3 40%, #8aa0b3 55%, #c9d2da 55%, #c9d2da 100%);"></div>
                    <div style="padding: 32px 36px;">
                        <h1 style="font-family: 'Brush Script MT', 'Segoe Script', cursive; font-weight: 400; font-size: 34px; color:#6b7280; margin: 0 0 24px; line-height:1.2;">
                            Bienvenido/a a la familia<br/>Firplak
                        </h1>
                        <p style="font-size:15px; color:#374151; line-height:1.7; margin: 0 0 16px;">Hola ${nombre},</p>
                        <p style="font-size:15px; color:#374151; line-height:1.7; margin: 0 0 16px;">
                            Para FIRPLAK S.A. es un orgullo contar con personas tan íntegras y talentosas como tú.
                        </p>
                        <p style="font-size:15px; color:#374151; line-height:1.7; margin: 0 0 16px;">
                            Tenemos la certeza de que encontrarás oportunidades para aprender y crecer junto con nosotros como parte de nuestro equipo de <strong>${cargo}</strong>, enriqueciéndote de experiencias inolvidables.
                        </p>
                        <p style="text-align:center; margin: 32px 0 8px;">
                            <span style="color:#60a5fa; font-size:20px;">&#10022;</span>
                            <span style="color:#6b7280; font-size:22px; font-weight:700; letter-spacing:1px; margin: 0 10px;">&iexcl;&Eacute;XITOS!</span>
                            <span style="color:#60a5fa; font-size:20px;">&#10022;</span>
                        </p>
                        <p style="text-align:right; color:#1D3557; font-weight:800; font-size:20px; letter-spacing:2px; margin: 24px 0 0;">FIRPLAK</p>
                    </div>
                </div>
            `,
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
