import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://jdtjtkncptwqdhlxmzds.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkdGp0a25jcHR3cWRobHhtemRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTExODQwMDAsImV4cCI6MjAwNjc2MDAwMH0.CKSoqx81iXamo3ftitaQwOiyJ3OsIOMO8xlxwEBp5oE');

async function probe() {
    console.log('Probing HILU phases schema...');

    const tables = ['fase_H', 'fase_I', 'fase_L', 'fase_U'];

    for (const table of tables) {
        console.log(`\n--- Probing ${table} ---`);
        const { data, error } = await supabase.from(table).select('*').limit(1);

        if (error) {
            console.error(`Error fetching from ${table}:`, error.message);
        } else if (data && data.length > 0) {
            console.log(`${table} Keys:`, Object.keys(data[0]).join(', '));
            // Specifically look for details/Json columns
            const jsonKeys = Object.entries(data[0]).filter(([_, v]) => typeof v === 'object' && v !== null);
            console.log(`${table} JSON-like Keys:`, jsonKeys.map(([k, _]) => k).join(', '));
        } else {
            console.log(`No data found in ${table}.`);
        }
    }
}

probe();
