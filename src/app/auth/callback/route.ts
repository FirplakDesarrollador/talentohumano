import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') ?? '/menu'
  const error_desc = requestUrl.searchParams.get('error_description')
  const error_code = requestUrl.searchParams.get('error')

  console.log('OAuth Callback hit:', requestUrl.toString())

  if (error_desc || error_code) {
    console.error('OAuth Error:', error_code, error_desc)
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error_desc || 'Error de autenticación')}`, request.url))
  }

  if (code) {
    const cookieStore = await cookies()
    const origin = requestUrl.origin
    const forwardedHost = request.headers.get('x-forwarded-host') 
    const isLocalEnv = process.env.NODE_ENV === 'development'
    
    let redirectUrl = `${origin}${next}`
    if (!isLocalEnv && forwardedHost) {
      redirectUrl = `https://${forwardedHost}${next}`
    }

    const response = NextResponse.redirect(redirectUrl)

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet: { name: string; value: string; options: any }[]) {
            cookiesToSet.forEach(({ name, value, options }) => {
              // Set in Next.js cookie store
              try { cookieStore.set(name, value, options) } catch (e) {}
              // Set in the actual response object
              response.cookies.set(name, value, options)
            })
          },
        },
      }
    )
    
    const { data: exchangeData, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      console.log('Session exchanged successfully!')

      // If this was a Microsoft OAuth, persist the provider_token in user_metadata
      // so it's available after page refreshes (Supabase SSR doesn't persist provider_token in cookies)
      if (exchangeData.session?.provider_token) {
        try {
          await supabase.auth.updateUser({
            data: {
              microsoft_provider_token: exchangeData.session.provider_token,
              microsoft_token_updated_at: new Date().toISOString()
            }
          })
          console.log('Microsoft provider_token stored in user_metadata')
        } catch (updateErr) {
          console.warn('Could not store provider_token:', updateErr)
        }
      }

      return response
    } else {
      console.error('Exchange code error:', error)
      return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.message)}`, request.url))
    }
  }

  console.log('No code found in URL')
  // Return the user to an error page with instructions
  return NextResponse.redirect(new URL('/login?error=No+se+recibió+código+de+autorización', request.url))
}
