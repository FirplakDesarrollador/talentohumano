import { NextResponse } from 'next/server'
import { notificarDecisionVacacion } from '@/lib/vacaciones/notificarDecision'

export async function POST(request: Request) {
    try {
        const { vacacionId, decision } = await request.json()
        if (!vacacionId || !decision) {
            return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })
        }
        if (decision !== 'Aprobado' && decision !== 'Rechazado') {
            return NextResponse.json({ error: 'Decisión inválida' }, { status: 400 })
        }

        await notificarDecisionVacacion(vacacionId, decision)

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Error en /api/vacaciones/notificar-decision:', error)
        return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 })
    }
}
