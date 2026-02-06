import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://jdtjtkncptwqdhlxmzds.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkdGp0a25jcHR3cWRobHhtemRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTExODQwMDAsImV4cCI6MjAwNjc2MDAwMH0.CKSoqx81iXamo3ftitaQwOiyJ3OsIOMO8xlxwEBp5oE');

async function probe() {
    console.log('Searching for "Moto" in empleados.foto...');
    const { data, error } = await supabase
        .from('empleados')
        .select('*')
        .ilike('foto', '%Moto%');

    if (error) {
        console.error('Error searching:', error.message);
    } else if (data && data.length > 0) {
        console.log(`Found ${data.length} records:`, JSON.stringify(data, null, 2));
    } else {
        console.log('No records found with "Moto" in foto column.');

        console.log('Searching in procesos_disciplinarios...');
        const { data: proc, error: procError } = await (supabase.from('procesos_disciplinarios' as any).select('*').limit(10) as any);
        if (proc) console.log('Sample processes:', JSON.stringify(proc, null, 2));
    }
}

probe();
