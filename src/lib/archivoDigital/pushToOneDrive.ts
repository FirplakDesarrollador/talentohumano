import { createClient as createAdminClient } from '@supabase/supabase-js'
import { getMsToken } from '@/lib/planner'

// Mismo OneDrive (y misma estructura de carpetas) que lee sync-archivo-digital
// (supabase/functions/sync-archivo-digital/index.ts) al traer archivos hacia
// la app. Mientras dure la prueba de dos semanas con ambos sistemas activos,
// todo documento que la app guarde en Archivo Digital se empuja tambien para
// aca, para que ambos lados queden iguales.
const UPN = 'renata.lainez@firplak.com'
const CATEGORIA_A_DRIVE_FOLDER: Record<string, string> = {
    ACTIVOS: '1.ACTIVOS',
    RETIRADOS: '2.RETIRADOS',
}

function encodeGraphPath(path: string): string {
    return path.split('/').map(encodeURIComponent).join('/')
}

export interface PushArchivoDigitalParams {
    categoria: string
    carpetaOrigen: string
    subcarpeta: string
    nombreArchivo: string
    bytes: Uint8Array | Buffer
    contentType?: string
    /** Fila de archivo_digital_documentos ya insertada, para guardarle el onedrive_item_id resultante */
    documentoId?: number
}

/**
 * Sube un documento recien guardado en la app hacia el OneDrive de Archivo
 * Digital, y si se le pasa documentoId, le guarda el onedrive_item_id
 * resultante — asi la proxima sincronizacion OneDrive -> App (que deduplica
 * por ese id) no lo vuelve a traer como si fuera nuevo.
 *
 * Best-effort: solo aplica a ACTIVOS/RETIRADOS (las unicas categorias con
 * estructura de carpeta por empleado en OneDrive) y nunca lanza — un fallo
 * aqui no debe tumbar el guardado que ya se hizo en la app.
 */
export async function pushArchivoDigitalAOneDrive(params: PushArchivoDigitalParams): Promise<void> {
    const driveFolder = CATEGORIA_A_DRIVE_FOLDER[params.categoria]
    if (!driveFolder) return // Terceros, Minutas, etc. no tienen contraparte en OneDrive todavia

    try {
        const token = await getMsToken()
        const path = `ARCHIVO DIGITAL/${driveFolder}/${params.carpetaOrigen}/Documentos/${params.subcarpeta}/${params.nombreArchivo}`
        const url = `https://graph.microsoft.com/v1.0/users/${UPN}/drive/root:/${encodeGraphPath(path)}:/content`

        const res = await fetch(url, {
            method: 'PUT',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': params.contentType || 'application/octet-stream' },
            body: params.bytes as any,
        })
        if (!res.ok) {
            console.error('Error subiendo a OneDrive (Archivo Digital):', await res.text())
            return
        }

        if (params.documentoId) {
            const item = await res.json()
            if (item?.id) {
                const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
                const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
                if (supabaseUrl && serviceRoleKey) {
                    const admin = createAdminClient(supabaseUrl, serviceRoleKey)
                    await admin
                        .from('archivo_digital_documentos')
                        .update({ onedrive_item_id: item.id })
                        .eq('id', params.documentoId)
                }
            }
        }
    } catch (err) {
        console.error('Error inesperado empujando a OneDrive (Archivo Digital):', err)
    }
}
