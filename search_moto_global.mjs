import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://jdtjtkncptwqdhlxmzds.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkdGp0a25jcHR3cWRobHhtemRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTExODQwMDAsImV4cCI6MjAwNjc2MDAwMH0.CKSoqx81iXamo3ftitaQwOiyJ3OsIOMO8xlxwEBp5oE');

async function search() {
    console.log('--- GLOBAL SEARCH FOR "Moto" ---');

    // 1. Search in Empleados (All likely columns)
    const empCols = ['nombreCompleto', 'cargo', 'planta', 'jefe', 'foto', 'empresa', 'id', 'cedula'];
    for (const col of empCols) {
        const { data } = await supabase.from('empleados').select('*').ilike(col as any, '%Moto%');
        if (data && data.length > 0) {
            console.log(`[FOUND in empleados.${col}]:`, JSON.stringify(data, null, 2));
        }
    }

    // 2. Search in Procesos Disciplinarios
    const procCols = ['tipo', 'motivo', 'comentario', 'created_by'];
    for (const col of procCols) {
        const { data } = await (supabase.from('procesos_disciplinarios' as any).select('*').ilike(col as any, '%Moto%') as any);
        if (data && data.length > 0) {
            console.log(`[FOUND in procesos_disciplinarios.${col}]:`, JSON.stringify(data, null, 2));
        }
    }

    console.log('--- SEARCH FINISHED ---');
}

search().catch(console.error);
