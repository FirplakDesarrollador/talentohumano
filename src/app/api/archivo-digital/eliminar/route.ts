import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { ADMIN_EMAILS } from '@/lib/constants/roles'

const BUCKET = 'archivo-digital'

export async function POST(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user?.email || !ADMIN_EMAILS.map(e => e.toLowerCase()).includes(user.email.toLowerCase())) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
        }

        const { id } = await request.json()
        if (!id) {
            return NextResponse.json({ error: 'Falta el id del archivo' }, { status: 400 })
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        if (!supabaseUrl || !serviceRoleKey) {
            return NextResponse.json({ error: 'Configuración del servidor incompleta' }, { status: 500 })
        }
        const admin = createAdminClient(supabaseUrl, serviceRoleKey)

        const { data: doc, error: fetchError } = await admin
            .from('archivo_digital_documentos')
            .select('id, storage_path')
            .eq('id', id)
            .single()
        if (fetchError || !doc) {
            return NextResponse.json({ error: 'Archivo no encontrado' }, { status: 404 })
        }

        const { error: deleteError } = await admin
            .from('archivo_digital_documentos')
            .delete()
            .eq('id', id)
        if (deleteError) {
            return NextResponse.json({ error: deleteError.message }, { status: 500 })
        }

        const { error: storageError } = await admin.storage
            .from(BUCKET)
            .remove([(doc as any).storage_path])
        if (storageError) {
            console.error('Archivo eliminado de la base de datos pero no se pudo borrar del storage:', storageError)
        }

        return NextResponse.json({ success: true })
    } catch (err: any) {
        return NextResponse.json({ error: err?.message || 'Error inesperado' }, { status: 500 })
    }
}
