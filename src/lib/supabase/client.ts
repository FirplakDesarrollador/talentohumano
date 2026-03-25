import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './types'

export function createClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    console.log('DEBUG - Client Supabase URL:', supabaseUrl)
    
    if (!supabaseUrl || !supabaseAnonKey) {
        console.error('Supabase URL or Key is missing from environment variables!')
    }

    return createBrowserClient<Database>(supabaseUrl!, supabaseAnonKey!)
}
