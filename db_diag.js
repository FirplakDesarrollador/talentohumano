
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function check() {
    let output = '';
    const log = (msg) => { console.log(msg); output += msg + '\n'; };
    
    log('Checking tables...');
    const tables = ['competencias', 'competencia_empleado', 'competencias_empleados', 'competencia_por_cargo', 'empleados_competencias'];
    
    for (const t of tables) {
        const { data, error } = await supabase.from(t).select('*', { count: 'exact', head: true }).limit(1);
        if (error) {
            log(`- ${t}: FAIL (${error.message})`);
        } else {
            log(`- ${t}: SUCCESS (found rows)`);
            const { data: rows } = await supabase.from(t).select('*').limit(1);
            log(`  Columns for ${t}: ${Object.keys(rows[0] || {}).join(', ')}`);
        }
    }
    
    fs.writeFileSync('db_check_results.txt', output);
}

check();
