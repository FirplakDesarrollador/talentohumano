import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './types'

export function createClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error(
            'Las variables de entorno de Supabase no están configuradas. ' +
            'Asegúrate de configurar NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY.'
        )
    }

    try {
        new URL(supabaseUrl)
    } catch (e) {
        throw new Error(
            `La URL de Supabase es inválida: "${supabaseUrl}". ` +
            'Asegúrate de que incluya el protocolo (https://).'
        )
    }

    return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)
}
