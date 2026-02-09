import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://jdtjtkncptwqdhlxmzds.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkdGp0a25jcHR3cWRobHhtemRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTExODQwMDAsImV4cCI6MjAwNjc2MDAwMH0.CKSoqx81iXamo3ftitaQwOiyJ3OsIOMO8xlxwEBp5oE');

async function probe() {
    // Tool names common in S10/HILU
    const columns = [
        'gi', 'te_ee', 'af', 'cinco_s', 'liderazgo', 'bitacora', 'opt', 'opt_sis', 'rrc', 'qrqc',
        'gestion_integral', 'tecnica_estadistica', 'analisis_falla', 'cinco_s', 'liderazgo', 'bitacora'
    ];

    console.log('Probing tool-specific columns for fase_I...');
    for (const col of columns) {
        const { error } = await supabase.from('fase_I').select(col).limit(1);
        if (!error) {
            console.log(`[FOUND] ${col}`);
        }
    }
}

probe();
