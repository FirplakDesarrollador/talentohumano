import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet: { name: string, value: string, options: any }[]) {
                    cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
                    supabaseResponse = NextResponse.next({
                        request,
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    // IMPORTANT: Avoid writing any logic between createServerClient and
    // supabase.auth.getUser(). A simple mistake could make it very hard to debug
    // issues with users being randomly logged out.

    const {
        data: { user },
    } = await supabase.auth.getUser()

    console.log('Middleware - Path:', request.nextUrl.pathname)
    console.log('Middleware - User:', user ? user.email : 'No user')

    // Public routes logic
    const publicRoutes = ['/login', '/auth/callback', '/auth/forgot-password', '/login/newPassword', '/register']
    const isPublicRoute = publicRoutes.some(route => request.nextUrl.pathname.startsWith(route))

    // Fix for broken reset password links that double the /newPassword path
    if (request.nextUrl.pathname === '/login/newPassword/newPassword') {
        const url = request.nextUrl.clone()
        url.pathname = '/login/newPassword'
        return NextResponse.redirect(url)
    }

    if (!user && !isPublicRoute) {
        // no user, potentially respond by redirecting the user to the login page
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        return NextResponse.redirect(url)
    }

    // Check if the user is active in the 'empleados' table (skip for API routes)
    const isApiRoute = request.nextUrl.pathname.startsWith('/api/')
    if (user && !isPublicRoute && !isApiRoute) {
        const { data: emp } = await supabase
            .from('empleados')
            .select('activo')
            .eq('correo_electronico', user.email)
            .maybeSingle()

        // If employee record exists and activo is explicitly false
        if (emp && emp.activo === false) {
            await supabase.auth.signOut()
            const url = request.nextUrl.clone()
            url.pathname = '/login'
            // Add a query param so the login page can show an error if desired
            url.searchParams.set('error', 'inactivo')
            return NextResponse.redirect(url)
        }
    }

    // If user is logged in and tries to access login page, redirect to menu
    if (user && request.nextUrl.pathname === '/login') {
        const url = request.nextUrl.clone()
        url.pathname = '/menu'
        return NextResponse.redirect(url)
    }

    // IMPORTANT: You *must* return the supabaseResponse object as it is.
    // If you're creating a new response object with NextResponse.next() make sure to:
    // 1. Pass the request in it, like so:
    //    const myNewResponse = NextResponse.next({ request })
    // 2. Copy over the cookies, like so:
    //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
    // 3. Change the myNewResponse object to fit your needs, but avoid changing
    //    the cookies!
    // 4. Finally:
    //    return myNewResponse
    // If this is not done, you may be causing the browser and server to go out
    // of sync and terminate the user's session prematurely.

    return supabaseResponse
}
