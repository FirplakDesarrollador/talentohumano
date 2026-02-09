const { createClient } = require('@supabase/supabase-js');

const supabase = createClient('https://jdtjtkncptwqdhlxmzds.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkdGp0a25jcHR3cWRobHhtemRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTExODQwMDAsImV4cCI6MjAwNjc2MDAwMH0.CKSoqx81iXamo3ftitaQwOiyJ3OsIOMO8xlxwEBp5oE');

async function search() {
    console.log('--- SEARCHING in "motivos_sanciones" FOR "Moto" ---');

    try {
        const { data, error } = await supabase
            .from('motivos_sanciones')
            .select('*')
            .ilike('motivo', '%Moto%');

        if (data && data.length > 0) {
            console.log(`[FOUND]:`, JSON.stringify(data, null, 2));
        } else if (error) {
            console.error('Error:', error.message);
        } else {
            console.log('No results in motivos_sanciones.');
        }
    } catch (e) {
        console.error('Exception:', e.message);
    }

    console.log('--- SEARCH FINISHED ---');
}

search();
