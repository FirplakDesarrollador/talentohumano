import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://jdtjtkncptwqdhlxmzds.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkdGp0a25jcHR3cWRobHhtemRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTExODQwMDAsImV4cCI6MjAwNjc2MDAwMH0.CKSoqx81iXamo3ftitaQwOiyJ3OsIOMO8xlxwEBp5oE');

async function search() {
    console.log('--- GLOBAL SEARCH FOR "Moto" ---');

    try {
        // Search in Empleados
        const { data: emp, error: empErr } = await supabase
            .from('empleados')
            .select('*')
            .or('nombreCompleto.ilike.%Moto%,cargo.ilike.%Moto%,foto.ilike.%Moto%');

        if (emp && emp.length > 0) {
            console.log(`[FOUND in empleados]:`, JSON.stringify(emp, null, 2));
        }

        // Search in Procesos Disciplinarios
        const { data: proc, error: procErr } = await (supabase.from('procesos_disciplinarios' as any)
            .select('*')
            .or('motivo.ilike.%Moto%,comentario.ilike.%Moto%') as any);

        if (proc && proc.length > 0) {
            console.log(`[FOUND in procesos_disciplinarios]:`, JSON.stringify(proc, null, 2));
        }
    } catch (e) {
        console.error('Search error:', e);
    }

    console.log('--- SEARCH FINISHED ---');
}

search();
