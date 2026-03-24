// Quick script to test which tables exist in Supabase
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
        'competencias',
        'empleado_indicador',
        'indicador_registro',
        'empleados'
    ];

    for (const table of tables) {
        const { data, error } = await supabase.from(table).select('*').limit(1);
        if (error) {
            console.log('X ' + table + ': ' + error.message + ' (' + error.code + ')');
        } else {
            console.log('OK ' + table + ': ' + (data ? data.length : 0) + ' rows');
            if (data && data.length > 0) {
                console.log('   Columns: ' + Object.keys(data[0]).join(', '));
            }
        }
    }
}

testTables().catch(console.error);
