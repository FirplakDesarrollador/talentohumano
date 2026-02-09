import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://jdtjtkncptwqdhlxmzds.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkdGp0a25jcHR3cWRobHhtemRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTExODQwMDAsImV4cCI6MjAwNjc2MDAwMH0.CKSoqx81iXamo3ftitaQwOiyJ3OsIOMO8xlxwEBp5oE');

async function probe() {
    const { data, error } = await supabase.from('fase_I').select('*').limit(1);
    if (error) {
        console.error('ERROR:', error.message);
    } else if (data && data.length > 0) {
        process.stdout.write('KEYS:' + Object.keys(data[0]).join(',') + '\n');
    } else {
        process.stdout.write('EMPTY\n');
    }
}

probe();
