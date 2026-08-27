import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';
import { sendTeamsMessage } from '@/lib/teams/sendTeamsMessage';

const APP_URL = 'https://talentohumano.vercel.app';

function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(amount);
}

export async function POST(request: Request) {
    try {
        const { aumentoId } = await request.json();
        if (!aumentoId) {
            return NextResponse.json({ error: 'Falta aumentoId' }, { status: 400 });
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        const supabase = createClient(supabaseUrl, serviceRoleKey);

        const { data: aumento, error: aumentoError } = await supabase
            .from('aumentosSalariales')
            .select('id, empleado_id, aprobador, salarioActual, salarioPropuesto, cargoAnterior, cargoPropuesto, requiereAscenso')
            .eq('id', aumentoId)
            .single();
        if (aumentoError || !aumento) throw aumentoError || new Error('Solicitud no encontrada');

        const { data: empleado, error: empError } = await supabase
            .from('empleados')
            .select('nombreCompleto')
            .eq('id', (aumento as any).empleado_id)
            .single();
        if (empError || !empleado) throw empError || new Error('Empleado no encontrado');

        const { data: aprobadorEmp, error: aprobadorError } = await supabase
            .from('empleados')
            .select('nombreCompleto, correo_electronico')
            .eq('id', (aumento as any).aprobador)
            .single();
        if (aprobadorError || !aprobadorEmp) throw aprobadorError || new Error('Aprobador no encontrado');

        const aprobadorCorreo = ((aprobadorEmp as any).correo_electronico || '').trim();
        if (!aprobadorCorreo) {
            return NextResponse.json({ error: 'El aprobador no tiene correo registrado' }, { status: 400 });
        }

        const token = randomBytes(24).toString('hex');
        await supabase
            .from('aumentosSalariales')
            .update({ token })
            .eq('id', aumentoId);

        const link = `${APP_URL}/decision-aumento/${token}`;
        const empleadoNombre = (empleado as any).nombreCompleto;
        const cargoTexto = (aumento as any).requiereAscenso
            ? `${(aumento as any).cargoAnterior} → ${(aumento as any).cargoPropuesto} (ascenso)`
            : (aumento as any).cargoAnterior;

        const mensaje = `
            <p><strong>Nueva solicitud de aumento salarial</strong> para tu aprobación.</p>
            <p>
                Empleado: <strong>${empleadoNombre}</strong><br/>
                Cargo: ${cargoTexto}<br/>
                Salario actual: ${formatCurrency((aumento as any).salarioActual)}<br/>
                Salario propuesto: <strong>${formatCurrency((aumento as any).salarioPropuesto)}</strong>
            </p>
            <p><a href="${link}">Revisar y responder la solicitud</a></p>
        `;

        try {
            await sendTeamsMessage(aprobadorCorreo, mensaje);
            await supabase
                .from('aumentosSalariales')
                .update({ notificacion_enviada: true })
                .eq('id', aumentoId);
        } catch (teamsError) {
            console.error('Error enviando notificacion de Teams al aprobador:', teamsError);
            return NextResponse.json({ success: true, warning: 'La solicitud se creó pero no se pudo notificar por Teams' });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Internal API error in aumentos-salariales/notificar:', error);
        return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
    }
}
