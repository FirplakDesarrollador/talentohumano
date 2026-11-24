import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { ADMIN_EMAILS } from '@/lib/constants/roles'

const BUCKET = 'expedientes-postulacion'

// Las urls publicas de este bucket tienen la forma
// ".../storage/v1/object/public/expedientes-postulacion/<path>"; se extrae
// <path> para poder borrar el archivo real del bucket (la fila en
// BD_Postulacion.Documentos la borra la RPC, pero el archivo de Storage no).
function extraerStoragePath(url: string): string | null {
    const marcador = `/object/public/${BUCKET}/`
    const idx = url.indexOf(marcador)
    if (idx === -1) return null
    return decodeURIComponent(url.slice(idx + marcador.length).split('?')[0])
}

export async function POST(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user?.email || !ADMIN_EMAILS.map(e => e.toLowerCase()).includes(user.email.toLowerCase())) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
        }

        const { candidatoId } = await request.json()
        if (!candidatoId) {
            return NextResponse.json({ error: 'Falta el candidato' }, { status: 400 })
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        if (!supabaseUrl || !serviceRoleKey) {
            return NextResponse.json({ error: 'Configuración del servidor incompleta' }, { status: 500 })
        }
        const admin = createAdminClient(supabaseUrl, serviceRoleKey)

        // 1. Documentos del candidato, para borrar tambien los archivos del bucket.
        const { data: documentos } = await admin.rpc('get_postulacion_documentos', { p_candidato_id: candidatoId })
        const paths = ((documentos || []) as { url: string }[])
            .map(d => extraerStoragePath(d.url))
            .filter((p): p is string => !!p)

        if (paths.length > 0) {
            const { error: removeError } = await admin.storage.from(BUCKET).remove(paths)
            if (removeError) {
                console.error('Error borrando archivos de postulación en Storage:', removeError)
            }
        }

        // 2. Filas en BD_Postulacion (candidato + sus documentos).
        const { data: resultado, error: rpcError } = await admin.rpc('delete_postulacion_candidato', { p_candidato_id: candidatoId })
        if (rpcError) throw rpcError
        if (resultado && resultado.success === false) {
            return NextResponse.json({ error: resultado.error || 'No se pudo eliminar el postulado' }, { status: 400 })
        }

        return NextResponse.json({ success: true })
    } catch (err: any) {
        console.error('Error eliminando postulado:', err)
        return NextResponse.json({ error: err?.message || 'Error inesperado' }, { status: 500 })
    }
}
