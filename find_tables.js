
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function listTables() {
    console.log('Listing tables via SQL (rpc if available) or common names...');
    
    // Since we don't have a direct "list tables" in JS client without RPC,
    // let's try some common variations or use the 'rpc' to query pg_catalog if we have permissions
    const { data, error } = await supabase.rpc('get_tables'); // Rare if user didn't create it
    
    if (error) {
        console.log('RPC get_tables failed, searching by guessing or generic query...');
        const tablesToTry = ['competencias', 'competencia', 'Competencias', 'competencias_empleado', 'competencia_empleados', 'CompetenciaEmpleado'];
        for (const table of tablesToTry) {
            const { error: tableError } = await supabase.from(table).select('*').limit(1);
            if (!tableError) {
                console.log(`Table FOUND: ${table}`);
            } else {
                console.log(`Table not found: ${table} (${tableError.message})`);
            }
        }
    } else {
        console.log('Tables from RPC:', data);
    }
}

listTables();
