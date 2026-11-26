import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { notificarDecisionVacacion } from '@/lib/vacaciones/notificarDecision'

export async function POST(request: Request) {
    try {
        const { token, decision } = await request.json()
        if (!token || !decision) {
            return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })
        }
        if (decision !== 'Aprobado' && decision !== 'Rechazado') {
            return NextResponse.json({ error: 'Decisión inválida' }, { status: 400 })
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
        const supabase = createClient(supabaseUrl, serviceRoleKey)

        const { data: respuesta, error: rpcError } = await (supabase.rpc as any)('responder_vacacion', {
            p_token: token,
            p_decision: decision,
        })
        if (rpcError) throw rpcError
        if (!respuesta?.success) {
            return NextResponse.json({ error: respuesta?.error || 'No se pudo registrar la decisión' }, { status: 400 })
        }

        try {
            // El registro del ausentismo (motivo Vacaciones) al aprobar lo hace un
            // trigger en la base de datos, no este endpoint.
            await notificarDecisionVacacion(respuesta.id, decision)
        } catch (notifError) {
            console.error('Error notificando la decision de vacaciones:', notifError)
        }

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Error en /api/decision-vacaciones:', error)
        return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 })
    }
}
