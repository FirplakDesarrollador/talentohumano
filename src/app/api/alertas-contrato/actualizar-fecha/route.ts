import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { ADMIN_EMAILS } from '@/lib/constants/roles'

export async function POST(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user?.email || !ADMIN_EMAILS.map(e => e.toLowerCase()).includes(user.email.toLowerCase())) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
        }

        const { empleadoId, fechaInicioContratoActual } = await request.json()
        if (!empleadoId || !fechaInicioContratoActual) {
            return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })
        }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaInicioContratoActual)) {
            return NextResponse.json({ error: 'Formato de fecha inválido' }, { status: 400 })
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        if (!supabaseUrl || !serviceRoleKey) {
            return NextResponse.json({ error: 'Configuración del servidor incompleta' }, { status: 500 })
        }
        const admin = createAdminClient(supabaseUrl, serviceRoleKey)

        const { error: updateError } = await admin
            .from('empleados')
            .update({ fecha_inicio_contrato_actual: fechaInicioContratoActual })
            .eq('id', empleadoId)
        if (updateError) {
            return NextResponse.json({ error: updateError.message }, { status: 500 })
        }

        return NextResponse.json({ success: true })
    } catch (err: any) {
        return NextResponse.json({ error: err?.message || 'Error inesperado' }, { status: 500 })
    }
}
