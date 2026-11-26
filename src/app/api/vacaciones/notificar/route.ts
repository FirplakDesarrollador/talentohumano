import { NextResponse } from 'next/server'
import { notificarCreacionVacacion } from '@/lib/vacaciones/notificarCreacion'

export async function POST(request: Request) {
    try {
        const { vacacionId } = await request.json()
        if (!vacacionId) {
            return NextResponse.json({ error: 'Falta vacacionId' }, { status: 400 })
        }

        await notificarCreacionVacacion(vacacionId)

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Error en /api/vacaciones/notificar:', error)
        return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 })
    }
}
