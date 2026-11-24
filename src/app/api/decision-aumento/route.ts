import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { notificarDecisionAumento } from '@/lib/aumentosSalariales/notificarDecision';

export async function POST(request: Request) {
    try {
        const { token, decision } = await request.json();
        if (!token || !decision) {
            return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });
        }
        if (decision !== 'Aprobada' && decision !== 'Rechazada') {
            return NextResponse.json({ error: 'Decisión inválida' }, { status: 400 });
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        const supabase = createClient(supabaseUrl, serviceRoleKey);

        const { data: respuesta, error: rpcError } = await (supabase.rpc as any)('responder_aumento', {
            p_token: token,
            p_decision: decision,
        });
        if (rpcError) throw rpcError;
        if (!respuesta?.success) {
            return NextResponse.json({ error: respuesta?.error || 'No se pudo registrar la decisión' }, { status: 400 });
        }

        try {
            const { data: aumento, error: aumentoError } = await supabase
                .from('aumentosSalariales')
                .select('id')
                .eq('token', token)
                .single();
            if (aumentoError || !aumento) throw aumentoError || new Error('Solicitud no encontrada');

            // Notifica tanto a Renata (Teams + correo) como al solicitante (Teams),
            // igual que el otro camino de decision (la pantalla interna de
            // Aumentos Salariales). Este es el que realmente se usa casi siempre,
            // ya que es el link que llega por correo/Teams al aprobador.
            await notificarDecisionAumento((aumento as any).id, decision);
        } catch (notifError) {
            console.error('Error notificando la decision del aumento:', notifError);
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Internal API error in decision-aumento:', error);
        return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
    }
}
