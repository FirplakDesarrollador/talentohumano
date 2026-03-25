
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function check() {
    console.log('Checking Employee ID vs Cedula...');
    const { data: emp, error } = await supabase.from('empleados').select('id, cedula, nombreCompleto').limit(5);
    if (error) {
        console.error('Error:', error);
        return;
    }
    console.table(emp);

    if (emp.length > 0) {
        const firstCedula = emp[0].cedula;
        console.log(`Checking competencias for cedula: ${firstCedula}`);
        const { data: comp, error: compError } = await supabase.from('competencia_empleado').select('*').eq('cedula', firstCedula);
        if (compError) console.error('Comp Error:', compError);
        else console.log(`Found ${comp.length} competencies for cedula ${firstCedula}`);
    }
}

check();
