import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { ADMIN_EMAILS } from '@/lib/constants/roles'

const BUCKET = 'archivo-digital'
const SUBCARPETAS_VALIDAS = ['Contrato', 'Correspondencia', 'Documentos', 'Procesos disciplinarios']

function sanitizeFilename(name: string) {
    return name.replace(/[^a-zA-Z0-9.\-]+/g, '_')
}

export async function POST(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user?.email || !ADMIN_EMAILS.map(e => e.toLowerCase()).includes(user.email.toLowerCase())) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
        }

        const formData = await request.formData()
        const file = formData.get('file') as File | null
        const categoria = formData.get('categoria') as string | null
        const carpetaOrigen = formData.get('carpetaOrigen') as string | null
        const subcarpeta = formData.get('subcarpeta') as string | null

        if (!file || !categoria || !carpetaOrigen || !subcarpeta) {
            return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })
        }
        if (!SUBCARPETAS_VALIDAS.includes(subcarpeta)) {
            return NextResponse.json({ error: 'Subcarpeta inválida' }, { status: 400 })
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        if (!supabaseUrl || !serviceRoleKey) {
            return NextResponse.json({ error: 'Configuración del servidor incompleta' }, { status: 500 })
        }
        const admin = createAdminClient(supabaseUrl, serviceRoleKey)

        // Se reutiliza el empleado_id que ya tengan los archivos existentes de esta
        // misma carpeta (si hay alguno), en vez de reintentar el matching por nombre.
        const { data: existingDoc } = await admin
            .from('archivo_digital_documentos')
            .select('empleado_id')
            .eq('categoria', categoria)
            .eq('carpeta_origen', carpetaOrigen)
            .not('empleado_id', 'is', null)
            .limit(1)
            .maybeSingle()

        const storagePath = `${categoria.toLowerCase()}/${carpetaOrigen.replace(/\s+/g, '_')}/Documentos/${subcarpeta}/${Date.now()}_${sanitizeFilename(file.name)}`

        const bytes = new Uint8Array(await file.arrayBuffer())
        const { error: uploadError } = await admin.storage.from(BUCKET).upload(storagePath, bytes, {
            contentType: file.type || undefined,
            upsert: false,
        })
        if (uploadError) {
            return NextResponse.json({ error: uploadError.message }, { status: 500 })
        }

        const { error: insertError } = await admin.from('archivo_digital_documentos').insert({
            categoria,
            carpeta_origen: carpetaOrigen,
            empleado_id: (existingDoc as any)?.empleado_id ?? null,
            nombre_archivo: file.name,
            storage_path: storagePath,
            tamano_bytes: file.size,
            migrado_at: new Date().toISOString(),
        })
        if (insertError) {
            // El archivo ya quedo en el bucket; se intenta limpiar para no dejarlo huerfano.
            await admin.storage.from(BUCKET).remove([storagePath])
            return NextResponse.json({ error: insertError.message }, { status: 500 })
        }

        return NextResponse.json({ success: true })
    } catch (err: any) {
        return NextResponse.json({ error: err?.message || 'Error inesperado' }, { status: 500 })
    }
}
