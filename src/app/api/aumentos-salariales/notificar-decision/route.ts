import { NextResponse } from 'next/server';
import { notificarDecisionAumento } from '@/lib/aumentosSalariales/notificarDecision';

export async function POST(request: Request) {
    try {
        const { aumentoId, decision } = await request.json();
        if (!aumentoId || !decision) {
            return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });
        }
        if (decision !== 'Aprobada' && decision !== 'Rechazada') {
            return NextResponse.json({ error: 'Decisión inválida' }, { status: 400 });
        }

        await notificarDecisionAumento(aumentoId, decision);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error notificando a Renata sobre la decision del aumento:', error);
        return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
    }
}
