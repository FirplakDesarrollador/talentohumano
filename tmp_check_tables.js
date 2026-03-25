
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function check() {
    console.log('Checking tables...');
    const { data: tables, error } = await supabase.from('empleados').select('*').limit(1);
    if (error) console.error('Error fetching empleados:', error);
    else console.log('Successfully connected to empleados');

    // Try multiple possible names for competencies table
    const tableNames = ['competencia_empleado', 'competencias_por_cargo', 'Competencias', 'competencias_empleados'];
    for (const name of tableNames) {
        const { data, error } = await supabase.from(name).select('*').limit(1);
        if (!error) {
            console.log(`FOUND TABLE: ${name}`);
            console.log('Sample columns:', Object.keys(data[0] || {}));
        } else {
            console.log(`Table not found: ${name}`);
        }
    }
}

check();
