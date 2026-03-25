import { createClient } from './src/lib/supabase/client'

async function checkViews() {
    const supabase = createClient()
    
    console.log('Checking view_areas...')
    const { data: areas, error: areasError } = await supabase.from('view_areas').select('*').limit(1)
    if (areasError) console.error('Error view_areas:', areasError.message)
    else console.log('view_areas exists:', areas)

    console.log('Checking view_jefes...')
    const { data: jefes, error: jefesError } = await supabase.from('view_jefes').select('*').limit(1)
    if (jefesError) console.error('Error view_jefes:', jefesError.message)
    else console.log('view_jefes exists:', jefes)

    console.log('Checking query_empleados_competencias...')
    const { data: comp, error: compError } = await supabase.from('query_empleados_competencias').select('*').limit(1)
    if (compError) console.error('Error query_empleados_competencias:', compError.message)
    else console.log('query_empleados_competencias exists:', comp)
}

checkViews()
