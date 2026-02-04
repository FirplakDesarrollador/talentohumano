import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function probe() {
    console.log('Probing fase_I schema...');
    const { data, error } = await supabase.from('fase_I').select('*').limit(1);

    if (error) {
        console.error('Error fetching from fase_I:', error);
    } else if (data && data.length > 0) {
        console.log('fase_I Keys:', Object.keys(data[0]).join(', '));
        console.log('fase_I Sample Record:', JSON.stringify(data[0], null, 2));
    } else {
        console.log('No data found in fase_I to probe.');

        // Try to insert a dummy record to see if it fails and gives hints? 
        // No, let's try to fetch another phase just in case.
        const { data: dataH } = await supabase.from('fase_H').select('*').limit(1);
        if (dataH) console.log('fase_H Keys:', Object.keys(dataH[0]).join(', '));
    }
}

probe();
