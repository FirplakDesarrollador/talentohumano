const { createClient } = require('@supabase/supabase-js');

const supabase = createClient('https://jdtjtkncptwqdhlxmzds.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkdGp0a25jcHR3cWRobHhtemRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTExODQwMDAsImV4cCI6MjAwNjc2MDAwMH0.CKSoqx81iXamo3ftitaQwOiyJ3OsIOMO8xlxwEBp5oE');

async function findInvalidFotos() {
    console.log('--- SCANNING ALL EMPLOYEES --');

    try {
        const { data, error } = await supabase
            .from('empleados')
            .select('*')
            .not('foto', 'is', null);

        if (error) throw error;

        const invalid = data.filter(e => {
            if (!e.foto) return false;
            const f = e.foto.trim().toLowerCase();
            return !f.startsWith('http') && !f.startsWith('/');
        });

        if (invalid.length > 0) {
            console.log(`FOUND ${invalid.length} PROBLEMATIC RECORDS:`);
            invalid.forEach(e => {
                console.log(`ID: ${e.id}, Nome: ${e.nombreCompleto}, Foto: "${e.foto}"`);
            });
        } else {
            console.log('No invalid fotos found in the entire table.');
        }
    } catch (e) {
        console.error('Exception:', e.message);
    }
}

findInvalidFotos();
