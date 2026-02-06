const { createClient } = require('@supabase/supabase-js');

const supabase = createClient('https://jdtjtkncptwqdhlxmzds.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkdGp0a25jcHR3cWRobHhtemRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTExODQwMDAsImV4cCI6MjAwNjc2MDAwMH0.CKSoqx81iXamo3ftitaQwOiyJ3OsIOMO8xlxwEBp5oE');

async function probe() {
    console.log('--- PROBING FIRST EMPLOYEE DATA ---');
    try {
        const { data, error } = await supabase.from('empleados').select('*').limit(5);
        if (error) throw error;
        if (data && data.length > 0) {
            data.forEach((emp, i) => {
                console.log(`Employee ${i + 1}:`, emp);
            });
        } else {
            console.log('No employees found.');
        }
    } catch (e) {
        console.error('Error:', e.message);
    }
}

probe();
