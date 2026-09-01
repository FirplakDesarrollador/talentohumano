import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendTeamsMessage } from '@/lib/teams/sendTeamsMessage';

const RENATA_CORREO = 'renata.lainez@firplak.com';

function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(amount);
}

export async function POST(request: Request) {
    try {
        const { aumentoId, decision } = await request.json();
        if (!aumentoId || !decision) {
            return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });
        }
        if (decision !== 'Aprobada' && decision !== 'Rechazada') {
            return NextResponse.json({ error: 'Decisión inválida' }, { status: 400 });
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        const supabase = createClient(supabaseUrl, serviceRoleKey);

        const { data: aumento, error: aumentoError } = await supabase
            .from('aumentosSalariales')
            .select('empleado_id, salarioActual, salarioPropuesto, cargoAnterior, cargoPropuesto, requiereAscenso, planta, jefe')
            .eq('id', aumentoId)
            .single();
        if (aumentoError || !aumento) throw aumentoError || new Error('Solicitud no encontrada');

        const { data: empleado } = await supabase
            .from('empleados')
            .select('nombreCompleto')
            .eq('id', (aumento as any).empleado_id)
            .single();

        const empleadoNombre = (empleado as any)?.nombreCompleto || 'el empleado';
        const cargoTexto = (aumento as any).requiereAscenso
            ? `${(aumento as any).cargoAnterior} → ${(aumento as any).cargoPropuesto} (ascenso)`
            : (aumento as any).cargoAnterior;

        const mensaje = `
            <p><strong>Solicitud de aumento salarial ${decision === 'Aprobada' ? 'aprobada' : 'rechazada'}</strong></p>
            <p>
                Empleado: <strong>${empleadoNombre}</strong><br/>
                Cargo: ${cargoTexto || 'N/A'}<br/>
                Planta: ${(aumento as any).planta || 'N/A'}<br/>
                Jefe: ${(aumento as any).jefe || 'N/A'}<br/>
                Salario actual: ${formatCurrency((aumento as any).salarioActual)}<br/>
                Salario propuesto: <strong>${formatCurrency((aumento as any).salarioPropuesto)}</strong>
            </p>
        `;

        await sendTeamsMessage(RENATA_CORREO, mensaje);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error notificando a Renata sobre la decision del aumento:', error);
        return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
    }
}
