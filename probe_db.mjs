import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function probe() {
    const { data: { user } } = await supabase.auth.getUser();
    console.log('Current User Auth:', user?.email);

    const { data, error } = await supabase.from('usuarios').select('*').limit(1);
    if (error) {
        console.error('Error fetching from usuarios:', error);
    } else {
        console.log('Usuarios Data Sample:', JSON.stringify(data[0], null, 2));
    }

    const { data: emp, error: empErr } = await supabase.from('empleados').select('*').limit(1);
    console.log('Empleados Sample:', JSON.stringify(emp?.[0], null, 2));
}

probe();
