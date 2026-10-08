import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { convertirDocxAPdf, formatearFechaLarga } from '@/lib/contratos/generarContratoTerminoFijo'
import {
    generarLlamadoAtencionDocx,
    generarCitacionDescargosDocx,
    generarRespuestaDescargosDocx,
    generarActaDescargosDocx,
} from '@/lib/procesosDisciplinarios/generarDocumento'

const BUCKET = 'archivo-digital'

const NOMBRES_DOCUMENTO: Record<string, string> = {
    llamado: 'Llamado de atención',
    citacion: 'Citación a audiencia de descargos',
    respuesta: 'Decisión disciplinaria',
    acta: 'Acta de audiencia de descargos',
}

function sanitizeStorageKey(text: string): string {
    return text
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/[^A-Za-z0-9._-]+/g, '_')
}

export async function POST(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        const {
            procesoId, tipoDocumento, tipo_sancion, dias_suspension,
            fecha_descargos, asistio_acompanante, nombre_acompanante,
            descargos_trabajador, interrogatorio, pruebas_aportadas, solicitudes_especiales,
        } = await request.json()
        if (!procesoId || !tipoDocumento) {
            return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })
        }
        if (!['llamado', 'citacion', 'respuesta', 'acta'].includes(tipoDocumento)) {
            return NextResponse.json({ error: 'Tipo de documento inválido' }, { status: 400 })
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

        if (tipoDocumento === 'llamado' && p.tipo !== 'Llamado de atencion') {
            return NextResponse.json({ error: 'Este proceso no es de tipo Llamado de atención' }, { status: 400 })
        }
        if (['citacion', 'respuesta', 'acta'].includes(tipoDocumento) && p.tipo !== 'Descargo') {
            return NextResponse.json({ error: 'Este proceso no es de tipo Descargo' }, { status: 400 })
        }
        if (tipoDocumento === 'acta' && !fecha_descargos) {
            return NextResponse.json({ error: 'Falta la fecha de los descargos' }, { status: 400 })
        }

        // Si se genera la Respuesta/Decision, guardamos el tipo de sancion y los dias
        // de suspension (si aplica) en el proceso, para dejar constancia.
        let tipoSancionFinal: string | null = p.tipo_sancion ?? null
        let diasSuspensionFinal: number | null = p.dias_suspension ?? null
        if (tipoDocumento === 'respuesta') {
            if (!tipo_sancion) {
                return NextResponse.json({ error: 'Seleccione el tipo de sanción' }, { status: 400 })
            }
            tipoSancionFinal = tipo_sancion
            diasSuspensionFinal = tipo_sancion === 'Suspensión' ? (dias_suspension || null) : null
            if (tipo_sancion === 'Suspensión' && !diasSuspensionFinal) {
                return NextResponse.json({ error: 'Ingrese los días de suspensión' }, { status: 400 })
            }

            const { error: updateError } = await admin
                .from('procesos_disciplinarios')
                .update({ tipo_sancion: tipoSancionFinal, dias_suspension: diasSuspensionFinal })
                .eq('id', procesoId)
            if (updateError) throw updateError
        }

        const datosProceso = {
            nombre_trabajador: p.nombreCompleto || 'N/A',
            cedula_trabajador: p.empleado_id,
            cargo_trabajador: p.cargo || '',
            observaciones: p.comentario || '',
            motivo: {
                motivo: p.motivo || '',
                categoria: p.motivo_categoria ?? null,
                numeral: p.motivo_numeral ?? null,
            },
        }

        const fecha = new Date()
        let docxBuffer: Buffer
        if (tipoDocumento === 'llamado') {
            docxBuffer = generarLlamadoAtencionDocx(datosProceso, fecha)
        } else if (tipoDocumento === 'citacion') {
            docxBuffer = generarCitacionDescargosDocx(datosProceso, fecha)
        } else if (tipoDocumento === 'respuesta') {
            docxBuffer = generarRespuestaDescargosDocx(datosProceso, fecha, {
                tipoSancion: tipoSancionFinal,
                diasSuspension: diasSuspensionFinal,
            })
        } else {
            docxBuffer = generarActaDescargosDocx(datosProceso, {
                fechaDescargos: formatearFechaLarga(new Date(`${fecha_descargos}T00:00:00`)),
                asistioAcompanante: !!asistio_acompanante,
                nombreAcompanante: nombre_acompanante || '',
                descargosTrabajador: descargos_trabajador || '',
                interrogatorio: interrogatorio || '',
                pruebasAportadas: pruebas_aportadas || '',
                solicitudesEspeciales: solicitudes_especiales || '',
            })
        }

        let pdfBuffer: Buffer | null = null
        try {
            pdfBuffer = await convertirDocxAPdf(docxBuffer, `proceso_${procesoId}_${tipoDocumento}_${Date.now()}`)
        } catch (pdfError) {
            console.error('Error convirtiendo documento de proceso disciplinario a PDF:', pdfError)
        }

        const archivoBuffer = pdfBuffer || docxBuffer
        const extension = pdfBuffer ? 'pdf' : 'docx'
        const contentType = pdfBuffer ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        const nombreDocumento = NOMBRES_DOCUMENTO[tipoDocumento]
        const empleadoNombre = datosProceso.nombre_trabajador
        const nombreCarpeta = sanitizeStorageKey(empleadoNombre.toUpperCase())
        const nombreArchivo = `${nombreDocumento} - ${empleadoNombre}.${extension}`
        const storagePath = `activos/${nombreCarpeta}/Documentos/Procesos Disciplinarios/${Date.now()}_${sanitizeStorageKey(nombreArchivo)}`

        const { error: uploadError } = await admin.storage
            .from(BUCKET)
            .upload(storagePath, archivoBuffer, { contentType, upsert: false })

        if (!uploadError) {
            await admin.from('archivo_digital_documentos').insert({
                categoria: 'ACTIVOS',
                carpeta_origen: empleadoNombre.toUpperCase(),
                empleado_id: p.empleado_id,
                nombre_archivo: nombreArchivo,
                storage_path: storagePath,
                tamano_bytes: archivoBuffer.length,
            } as any)
        } else {
            console.error('Error guardando el documento generado en Archivo Digital:', uploadError)
        }

        return NextResponse.json({
            success: true,
            nombreArchivo,
            contentType,
            fueConvertidoAPdf: !!pdfBuffer,
            archivoBase64: archivoBuffer.toString('base64'),
        })
    } catch (error: any) {
        console.error('Error generando documento de proceso disciplinario:', error)
        return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 })
    }
}
