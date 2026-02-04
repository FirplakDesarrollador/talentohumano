import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://jdtjtkncptwqdhlxmzds.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkdGp0a25jcHR3cWRobHhtemRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTExODQwMDAsImV4cCI6MjAwNjc2MDAwMH0.CKSoqx81iXamo3ftitaQwOiyJ3OsIOMO8xlxwEBp5oE');

async function probe() {
    // A wider net of potential names
    const columns = [
        'detalles', 'detalle', 'json_detalles', 'data', 'herramientas',
        'evaluacion', 'seguimiento', 'items', 'contenido', 'extra',
        'fi_detalles', 'fi_detalle', 'fi_items',
        'titular', 'estandar_hdt', 'entrenamiento_calidad', 'hace_acompanado', 'hace_solo', 'entrenado_por'
    ];

    console.log('Probing potential columns for fase_I...');
    for (const col of columns) {
        const { error } = await supabase.from('fase_I').select(col).limit(1);
        if (!error) {
            console.log(`[FOUND] ${col}`);
        }
    }
}

probe();
