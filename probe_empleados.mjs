import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function probe() {
    const { data, error } = await supabase.from('empleados').select('*').limit(1);
    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Data:', JSON.stringify(data[0], null, 2));
    }
}

probe();
