import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://jdtjtkncptwqdhlxmzds.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkdGp0a25jcHR3cWRobHhtemRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTExODQwMDAsImV4cCI6MjAwNjc2MDAwMH0.CKSoqx81iXamo3ftitaQwOiyJ3OsIOMO8xlxwEBp5oE');

async function probe() {
    const columns = [
        'detalles', 'detalle', 'json_detalles', 'data', 'herramientas',
        'fi_detalles', 'i_detalles', 'fase_i_detalles',
        'details', 'info', 'meta', 'payload', 'settings',
        'herramientas_evaluacion', 'evaluacion_herramientas',
        'jsonb_data', 'jsonb_details', 'extra_data', 'metadata'
    ];

    console.log('Probing for ANY JSON column in fase_I...');
    for (const col of columns) {
        const { error } = await supabase.from('fase_I').select(col).limit(1);
        if (!error) {
            console.log(`[FOUND] ${col}`);
        }
    }
}

probe();
