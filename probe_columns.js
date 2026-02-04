const { createClient } = require('@supabase/supabase-js');

const supabase = createClient('https://jdtjtkncptwqdhlxmzds.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkdGp0a25jcHR3cWRobHhtemRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTExODQwMDAsImV4cCI6MjAwNjc2MDAwMH0.CKSoqx81iXamo3ftitaQwOiyJ3OsIOMO8xlxwEBp5oE');

async function probe() {
    console.log('--- PROBING "empleados" COLUMNS ---');
    try {
        const { data, error } = await supabase.from('empleados').select('*').limit(1);
        if (error) throw error;
        if (data && data.length > 0) {
            console.log('Columns found:', Object.keys(data[0]));
            console.log('Sample data:', JSON.stringify(data[0], null, 2));
        } else {
            console.log('No data found in "empleados" table.');
        }
    } catch (e) {
        console.error('Error:', e.message);
    }
}

probe();
