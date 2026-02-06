import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://jdtjtkncptwqdhlxmzds.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkdGp0a25jcHR3cWRobHhtemRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTExODQwMDAsImV4cCI6MjAwNjc2MDAwMH0.CKSoqx81iXamo3ftitaQwOiyJ3OsIOMO8xlxwEBp5oE');

async function probe() {
    console.log('Probing for tables starting with fase_...');

    // We can try to fetch from information_schema if possible
    // But since it might be blocked, we'll try a list of guessed tables
    const potentialTables = [
        'fase_H', 'fase_I', 'fase_L', 'fase_U',
        'fase_I_detalles', 'fase_L_detalles', 'fase_U_detalles',
        'fase_I_herramientas', 'fase_L_herramientas', 'fase_U_herramientas',
        'detalles_hilu', 'fase_I_leaders', 'fase_I_lideres'
    ];

    for (const table of potentialTables) {
        const { error } = await supabase.from(table).select('count').limit(1);
        if (!error || error.code !== '42P01') { // 42P01 is "relation does not exist"
            console.log(`[EXISTS] ${table} (Code: ${error?.code || 'SUCCESS'})`);
        }
    }
}

probe();
