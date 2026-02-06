import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://jdtjtkncptwqdhlxmzds.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkdGp0a25jcHR3cWRobHhtemRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTExODQwMDAsImV4cCI6MjAwNjc2MDAwMH0.CKSoqx81iXamo3ftitaQwOiyJ3OsIOMO8xlxwEBp5oE');

async function search() {
    console.log('--- GLOBAL SEARCH FOR "Moto" ---');

    // Search in Empleados - One column at a time to be safe
    const columns = ['nombreCompleto', 'cargo', 'foto'];
    for (const col of columns) {
        console.log(`Checking column: ${col}`);
        const { data, error } = await supabase.from('empleados').select('*').ilike(col as any, '%Moto%');
        if (data && data.length > 0) {
            console.log(`[FOUND in ${col}]:`, JSON.stringify(data, null, 2));
        }
    }

    // Search in Procesos Disciplinarios
    const pColumns = ['motivo', 'comentario'];
    for (const col of pColumns) {
        console.log(`Checking column: ${col}`);
        const { data, error } = await (supabase.from('procesos_disciplinarios' as any).select('*').ilike(col as any, '%Moto%') as any);
        if (data && data.length > 0) {
            console.log(`[FOUND in ${col}]:`, JSON.stringify(data, null, 2));
        }
    }

    console.log('--- SEARCH FINISHED ---');
}

search();
