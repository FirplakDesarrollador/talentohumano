import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendTeamsMessage } from '@/lib/teams/sendTeamsMessage';

function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(amount);
}

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
                .select('empleado_id, solicitante, salarioPropuesto, aprobador')
                .eq('token', token)
                .single();
            if (aumentoError || !aumento) throw aumentoError || new Error('Solicitud no encontrada');

            const { data: empleado } = await supabase
                .from('empleados')
                .select('nombreCompleto')
                .eq('id', (aumento as any).empleado_id)
                .single();

            const { data: solicitante } = await supabase
                .from('usuarios')
                .select('correo, nombre')
                .eq('id', (aumento as any).solicitante)
                .single();

            const { data: aprobadorEmp } = await supabase
                .from('empleados')
                .select('nombreCompleto')
                .eq('id', (aumento as any).aprobador)
                .single();

            const solicitanteCorreo = ((solicitante as any)?.correo || '').trim();
            if (solicitanteCorreo) {
                const empleadoNombre = (empleado as any)?.nombreCompleto || 'el empleado';
                const aprobadorNombre = (aprobadorEmp as any)?.nombreCompleto || 'El aprobador';
                const mensaje = decision === 'Aprobada'
                    ? `<p><strong>${aprobadorNombre}</strong> aprobó la solicitud de aumento salarial para <strong>${empleadoNombre}</strong> (nuevo salario: ${formatCurrency((aumento as any).salarioPropuesto)}).</p>`
                    : `<p><strong>${aprobadorNombre}</strong> rechazó la solicitud de aumento salarial para <strong>${empleadoNombre}</strong>.</p>`;
                await sendTeamsMessage(solicitanteCorreo, mensaje);
            }
        } catch (notifError) {
            console.error('Error notificando al solicitante sobre la decision del aumento:', notifError);
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Internal API error in decision-aumento:', error);
        return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
    }
}
