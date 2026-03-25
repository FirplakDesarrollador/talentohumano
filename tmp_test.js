const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testTables() {
    const tables = [
        'competencia_empleado',
        'ComptEmpleados',
        'competencias'
    ];

    for (const table of tables) {
        const { data, error } = await supabase.from(table).select('*').limit(1);
        if (error) {
            console.log(`❌ ${table}: ${error.code} ${error.message} (Hint: ${error.hint}, Details: ${error.details})`);
        } else {
            console.log(`✅ ${table}: OK`);
        }
    }
}
testTables();
