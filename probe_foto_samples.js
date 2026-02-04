const { createClient } = require('@supabase/supabase-js');

const supabase = createClient('https://jdtjtkncptwqdhlxmzds.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkdGp0a25jcHR3cWRobHhtemRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTExODQwMDAsImV4cCI6MjAwNjc2MDAwMH0.CKSoqx81iXamo3ftitaQwOiyJ3OsIOMO8xlxwEBp5oE');

async function probe() {
    console.log('--- PROBING FOTOS in "empleados" ---');

    try {
        const { data, error } = await supabase
            .from('empleados')
            .select('id, cedula, nombreCompleto, foto')
            .limit(100);

        if (data) {
            const problematic = data.filter(e => e.foto && !e.foto.startsWith('http') && !e.foto.startsWith('/'));
            if (problematic.length > 0) {
                console.log('Problematic fotos found:', JSON.stringify(problematic, null, 2));
            } else {
                console.log('No obviously invalid fotos in first 100 records.');
                // Print all non-null for manual check
                const withFoto = data.filter(e => e.foto);
                console.log('Records with foto:', JSON.stringify(withFoto, null, 2));
            }
        }
    } catch (e) {
        console.error('Exception:', e.message);
    }
}

probe();
