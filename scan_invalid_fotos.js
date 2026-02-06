const { createClient } = require('@supabase/supabase-js');

const supabase = createClient('https://jdtjtkncptwqdhlxmzds.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkdGp0a25jcHR3cWRobHhtemRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTExODQwMDAsImV4cCI6MjAwNjc2MDAwMH0.CKSoqx81iXamo3ftitaQwOiyJ3OsIOMO8xlxwEBp5oE');

async function findInvalidFotos() {
    console.log('--- SCANNING ALL EMPLOYEES FOR INVALID FOTO DATA ---');

    try {
        // Fetch all non-null fotos
        const { data, error } = await supabase
            .from('empleados')
            .select('id, cedula, nombreCompleto, foto')
            .not('foto', 'is', null);

        if (error) throw error;

        console.log(`Scanning ${data.length} records with foto...`);

        const invalid = data.filter(e => {
            const f = e.foto.trim().toLowerCase();
            return !f.startsWith('http') && !f.startsWith('/') && f.length > 0;
        });

        if (invalid.length > 0) {
            console.log(`FOUND ${invalid.length} PROBLEMATIC RECORDS:`);
            console.log(JSON.stringify(invalid, null, 2));
        } else {
            console.log('No invalid patterns found (checked for http/prefix).');
        }
    } catch (e) {
        console.error('Exception:', e.message);
    }
}

findInvalidFotos();
