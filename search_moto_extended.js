const { createClient } = require('@supabase/supabase-js');

const supabase = createClient('https://jdtjtkncptwqdhlxmzds.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkdGp0a25jcHR3cWRobHhtemRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTExODQwMDAsImV4cCI6MjAwNjc2MDAwMH0.CKSoqx81iXamo3ftitaQwOiyJ3OsIOMO8xlxwEBp5oE');

async function search() {
    console.log('--- EXTENDED SEARCH FOR "Moto" ---');

    const tables = ['novedades_nomina', 'auditorias', 'reentrenamientos', 'vacaciones'];

    for (const table of tables) {
        console.log(`Checking table: ${table}`);
        try {
            const { data, error } = await supabase.from(table).select('*').limit(1);
            if (data && data.length > 0) {
                const cols = Object.keys(data[0]);
                const orFilter = cols
                    .filter(c => typeof data[0][c] === 'string')
                    .map(c => `${c}.ilike.%Moto%`)
                    .join(',');

                if (orFilter) {
                    const { data: results } = await supabase.from(table).select('*').or(orFilter);
                    if (results && results.length > 0) {
                        console.log(`[FOUND in ${table}]:`, JSON.stringify(results, null, 2));
                    }
                }
            }
        } catch (e) {
            console.error(`Error in table ${table}:`, e.message);
        }
    }

    console.log('--- SEARCH FINISHED ---');
}

search();
