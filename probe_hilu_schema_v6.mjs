import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://jdtjtkncptwqdhlxmzds.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkdGp0a25jcHR3cWRobHhtemRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTExODQwMDAsImV4cCI6MjAwNjc2MDAwMH0.CKSoqx81iXamo3ftitaQwOiyJ3OsIOMO8xlxwEBp5oE');

async function probe() {
    const columns = ['detalles', 'fi_detalles', 'modified_by', 'modified_by_id', 'created_by', 'created_by_id', 'cargo', 'empleado_id'];

    console.log('Probing columns for fase_I...');
    for (const col of columns) {
        const { error } = await supabase.from('fase_I').select(col).limit(1);
        if (error) {
            console.log(`[FAILED] ${col}: ${error.message}`);
        } else {
            console.log(`[SUCCESS] ${col}`);
        }
    }
}

probe();
