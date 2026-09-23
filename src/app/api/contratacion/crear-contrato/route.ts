import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { ADMIN_EMAILS } from '@/lib/constants/roles'
import { generarContratoTerminoFijoDocx, convertirDocxAPdf, formatearFechaLarga } from '@/lib/contratos/generarContratoTerminoFijo'
import { generarContratoIndefinidoDocx } from '@/lib/contratos/generarContratoIndefinido'

function sanitizeStorageKey(text: string): string {
    return text
        .normalize('NFD').replace(new RegExp('[\\u0300-\\u036f]', 'g'), '')
        .replace(/[^A-Za-z0-9._-]+/g, '_')
}

export async function POST(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user?.email || !ADMIN_EMAILS.map(e => e.toLowerCase()).includes(user.email.toLowerCase())) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
        }

        const { empleadoId, tipo, cargo, salario, direccion, fecha_nacimiento, lugar_nacimiento } = await request.json()

        const empleadoIdNum = Number(empleadoId)
        if (!Number.isFinite(empleadoIdNum) || empleadoIdNum <= 0) {
            return NextResponse.json({ error: 'Empleado inválido' }, { status: 400 })
        }
        if (tipo !== 'INDEFINIDO' && tipo !== 'TERMINO_FIJO') {
            return NextResponse.json({ error: 'Tipo de contrato inválido' }, { status: 400 })
        }
        const salarioNum = Number(salario)
        if (!cargo?.trim() || !Number.isFinite(salarioNum) || salarioNum <= 0 || !direccion?.trim() || !fecha_nacimiento || !lugar_nacimiento?.trim()) {
            return NextResponse.json({ error: 'Faltan datos obligatorios del contrato' }, { status: 400 })
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        if (!supabaseUrl || !serviceRoleKey) {
            return NextResponse.json({ error: 'Configuración del servidor incompleta' }, { status: 500 })
        }
        const admin = createAdminClient(supabaseUrl, serviceRoleKey)

        const { data: empleado, error: empError } = await admin
            .from('empleados')
            .select('id, nombreCompleto')
            .eq('id', empleadoIdNum)
            .single()
        if (empError || !empleado) {
            return NextResponse.json({ error: 'Empleado no encontrado' }, { status: 404 })
        }

        const { error: updateError } = await admin
            .from('empleados')
            .update({
                cargo: cargo.trim(),
                salario: salarioNum,
                direccion: direccion.trim(),
                fecha_nacimiento,
                lugar_nacimiento: lugar_nacimiento.trim(),
                tipo_contrato: tipo,
                fecha_inicio_contrato_actual: new Date().toISOString().slice(0, 10),
            })
            .eq('id', empleadoIdNum)
        if (updateError) throw updateError

        const empleadoParaContrato = {
            id: (empleado as any).id,
            nombreCompleto: (empleado as any).nombreCompleto,
            direccion: direccion.trim(),
            fecha_nacimiento,
            lugar_nacimiento: lugar_nacimiento.trim(),
            cargo: cargo.trim(),
            salario: salarioNum,
        }

        const fechaInicio = new Date()
        const nombreContrato = tipo === 'INDEFINIDO' ? 'a término indefinido' : 'a término fijo'
        const docxBuffer = tipo === 'INDEFINIDO'
            ? await generarContratoIndefinidoDocx(empleadoParaContrato, fechaInicio)
            : await generarContratoTerminoFijoDocx(empleadoParaContrato, fechaInicio)

        let pdfBuffer: Buffer | null = null
        try {
            pdfBuffer = await convertirDocxAPdf(docxBuffer, `contrato_${empleadoIdNum}_${Date.now()}`)
        } catch (pdfError) {
            console.error('Error convirtiendo contrato a PDF (revisar permiso Files.ReadWrite.All en Azure):', pdfError)
        }

        const archivoBuffer = pdfBuffer || docxBuffer
        const extension = pdfBuffer ? 'pdf' : 'docx'
        const contentType = pdfBuffer ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        const empleadoNombre = (empleado as any).nombreCompleto as string
        const nombreCarpeta = sanitizeStorageKey(empleadoNombre.toUpperCase())
        const nombreArchivo = `Contrato ${nombreContrato} - ${formatearFechaLarga(fechaInicio)}.${extension}`
        const storagePath = `activos/${nombreCarpeta}/Documentos/Contrato/${Date.now()}_${sanitizeStorageKey(nombreArchivo)}`

        const { error: uploadError } = await admin.storage
            .from('archivo-digital')
            .upload(storagePath, archivoBuffer, { contentType, upsert: false })

        if (!uploadError) {
            await admin.from('archivo_digital_documentos').insert({
                categoria: 'ACTIVOS',
                carpeta_origen: empleadoNombre.toUpperCase(),
                empleado_id: empleadoIdNum,
                nombre_archivo: nombreArchivo,
                storage_path: storagePath,
                tamano_bytes: archivoBuffer.length,
            } as any)
        } else {
            console.error('Error guardando el contrato generado en Archivo Digital:', uploadError)
        }

        return NextResponse.json({
            success: true,
            nombreArchivo,
            contentType,
            fueConvertidoAPdf: !!pdfBuffer,
            archivoBase64: archivoBuffer.toString('base64'),
        })
    } catch (err: any) {
        console.error('Error creando contrato:', err)
        return NextResponse.json({ error: err?.message || 'Error inesperado' }, { status: 500 })
    }
}
