import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://jdtjtkncptwqdhlxmzds.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkdGp0a25jcHR3cWRobHhtemRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTExODQwMDAsImV4cCI6MjAwNjc2MDAwMH0.CKSoqx81iXamo3ftitaQwOiyJ3OsIOMO8xlxwEBp5oE');

async function probe() {
    console.log('Querying information_schema for fase_I...');

    // Note: Supabase RLS might block this, but usually anon role can't see information_schema.
    // However, sometimes it's exposed or we can use the 'rpc' to get it if defined.
    // Since I don't have a service role key, I'll try to use a simple SELECT first.

    const { data, error } = await supabase
        .from('fase_I')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error fetching from fase_I:', error.message);
        return;
    }

    // Try to get ANY record from the view to see what it looks like
    const { data: viewData, error: viewError } = await supabase
        .from('query_hilu')
        .select('*')
        .limit(1);

    if (viewData && viewData.length > 0) {
        console.log('View Record Keys:', Object.keys(viewData[0]).join(', '));
    }

    // Fallback: try to list columns by inserting and catching the error
    console.log('Attempting minimal insert into fase_I to trigger error with column hint...');
    const { error: insError } = await supabase
        .from('fase_I')
        .insert({ non_existent_column: 'test' });

    if (insError) {
        console.log('Insert Error (contains metadata?):', insError.message);
    }
}

probe();
