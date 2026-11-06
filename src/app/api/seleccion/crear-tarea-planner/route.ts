import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getMsToken, crearTareaPlanner } from '@/lib/planner';

const SENDER_EMAIL = 'analista.desarrollador@firplak.com';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { vacanteId, cargo } = body;

        if (!vacanteId || !cargo) {
            return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
        }

        const token = await getMsToken();
        const titulo = `Proceso de contratación de cargo ${cargo}`;
        const { taskId, taskUrl } = await crearTareaPlanner(token, titulo, [SENDER_EMAIL]);

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        const supabase = createClient(supabaseUrl, serviceRoleKey);
        await supabase
            .from('seleccion_vacantes')
            .update({ planner_task_id: taskId, planner_task_url: taskUrl })
            .eq('id', vacanteId);

        return NextResponse.json({ success: true, taskId, taskUrl });
    } catch (error: any) {
        console.error('Error creando tarea de Planner para vacante:', error);
        return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
    }
}
