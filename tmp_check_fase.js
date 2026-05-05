require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  const { data, error } = await supabase.from('query_hilu').select('cedula, nombreCompleto, fi_id, fl_id, fu_id').limit(5);
  console.log('query_hilu:', JSON.stringify({ data, error }, null, 2));
}

check();
