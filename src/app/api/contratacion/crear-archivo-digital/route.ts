import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { ADMIN_EMAILS } from '@/lib/constants/roles'

const BUCKET = 'archivo-digital'

// Nombres legibles para los "tipo" de BD_Postulacion.Documentos (mas claros
// que el nombre de archivo aleatorio que genera el formulario de postulacion).
const NOMBRES_TIPO: Record<string, string> = {
    BANCO: 'Certificado bancario',
    CEDULA: 'Cedula',
    CESANTIAS: 'Certificado cesantias',
    EPS: 'Certificado EPS',
    HOJA_VIDA: 'Hoja de vida',
    LABORAL: 'Referencia laboral',
    PENSION: 'Certificado pension',
    POLICIA: 'Antecedentes policia',
    PROCURADURIA: 'Antecedentes procuraduria',
}

function sanitizeFilename(name: string) {
    return name.replace(/[^a-zA-Z0-9.\-]+/g, '_')
}

function extensionDe(url: string): string {
    const match = url.split('?')[0].match(/\.([a-zA-Z0-9]+)$/)
    return match ? `.${match[1]}` : ''
}

export async function POST(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user?.email || !ADMIN_EMAILS.map(e => e.toLowerCase()).includes(user.email.toLowerCase())) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
        }

        const { candidatoId, cedula, nombreCompleto } = await request.json()
        const cedulaNum = Number(cedula)
        if (!candidatoId || !Number.isFinite(cedulaNum) || cedulaNum <= 0 || !nombreCompleto) {
            return NextResponse.json({ error: 'Faltan datos del candidato' }, { status: 400 })
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        if (!supabaseUrl || !serviceRoleKey) {
            return NextResponse.json({ error: 'Configuración del servidor incompleta' }, { status: 500 })
        }
        const admin = createAdminClient(supabaseUrl, serviceRoleKey)

        const { data: documentos, error: docsError } = await admin
            .rpc('get_postulacion_documentos', { p_candidato_id: candidatoId })
        if (docsError) throw docsError
        if (!documentos || documentos.length === 0) {
            return NextResponse.json({ success: true, archivosCopiados: 0, mensaje: 'El candidato no tiene documentos para copiar' })
        }

        const carpetaOrigen = nombreCompleto.trim().toUpperCase()

        const { data: existentes } = await admin
            .from('archivo_digital_documentos')
            .select('nombre_archivo')
            .eq('categoria', 'ACTIVOS')
            .eq('carpeta_origen', carpetaOrigen)
        const nombresExistentes = new Set((existentes || []).map((r: any) => r.nombre_archivo))

        let archivosCopiados = 0
        for (const doc of documentos as { tipo: string; url: string }[]) {
            const nombreBase = NOMBRES_TIPO[doc.tipo] || doc.tipo
            const nombreArchivo = `${nombreBase}${extensionDe(doc.url)}`
            if (nombresExistentes.has(nombreArchivo)) continue // ya se habia copiado antes

            const fileRes = await fetch(doc.url)
            if (!fileRes.ok) continue
            const bytes = new Uint8Array(await fileRes.arrayBuffer())

            const storagePath = `activos/${carpetaOrigen.replace(/\s+/g, '_')}/Documentos/Documentos/${Date.now()}_${sanitizeFilename(nombreArchivo)}`

            const { error: uploadError } = await admin.storage.from(BUCKET).upload(storagePath, bytes, { upsert: false })
            if (uploadError) continue

            const { error: insertError } = await admin.from('archivo_digital_documentos').insert({
                categoria: 'ACTIVOS',
                carpeta_origen: carpetaOrigen,
                empleado_id: cedulaNum,
                nombre_archivo: nombreArchivo,
                storage_path: storagePath,
                tamano_bytes: bytes.byteLength,
                migrado_at: new Date().toISOString(),
            })
            if (insertError) {
                await admin.storage.from(BUCKET).remove([storagePath])
                continue
            }
            archivosCopiados++
        }

        return NextResponse.json({ success: true, archivosCopiados })
    } catch (err: any) {
        return NextResponse.json({ error: err?.message || 'Error inesperado' }, { status: 500 })
    }
}
