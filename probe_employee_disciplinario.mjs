import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://jdtjtkncptwqdhlxmzds.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkdGp0a25jcHR3cWRobHhtemRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTExODQwMDAsImV4cCI6MjAwNjc2MDAwMH0.CKSoqx81iXamo3ftitaQwOiyJ3OsIOMO8xlxwEBp5oE');

async function probe() {
    console.log('Probing employee with ID: 21006195');
    const { data, error } = await supabase
        .from('empleados')
        .select('*')
        .eq('id', 21006195)
        .single();

    if (error) {
        console.error('Error fetching employee:', error.message);
    } else {
        console.log('Employee Data:', JSON.stringify(data, null, 2));
    }
}

probe();
