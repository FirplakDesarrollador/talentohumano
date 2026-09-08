import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

// Academia y Talento Humano comparten el mismo proyecto de Supabase (mismo
// auth.users), asi que en vez de mandar al usuario al login de Academia se
// genera un magic link para su sesion ya autenticada aqui y se le redirige
// con eso, evitando que tenga que volver a loguearse.
const ACADEMIA_REDIRECT_URL = 'https://academia-fpk.vercel.app/auth/callback'

export async function POST() {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user?.email) {
            return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        if (!supabaseUrl || !serviceRoleKey) {
            console.error('academia-sso: falta NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el entorno')
            return NextResponse.json({ error: 'Configuracion del servidor incompleta' }, { status: 500 })
        }

        const admin = createAdminClient(supabaseUrl, serviceRoleKey)

        const { data, error } = await admin.auth.admin.generateLink({
            type: 'magiclink',
            email: user.email,
            options: { redirectTo: ACADEMIA_REDIRECT_URL },
        })

        if (error || !data?.properties?.action_link) {
            console.error('academia-sso: generateLink fallo', error)
            return NextResponse.json({ error: error?.message || 'No se pudo generar el enlace' }, { status: 500 })
        }

        return NextResponse.json({ url: data.properties.action_link })
    } catch (err: any) {
        console.error('academia-sso: error inesperado', err)
        return NextResponse.json({ error: err?.message || 'Error inesperado' }, { status: 500 })
    }
}
