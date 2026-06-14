import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })
  const pathname = request.nextUrl.pathname

  const publicGetApis = ['/api/reviews']
  const isPublicApi = publicGetApis.some(p => pathname.startsWith(p)) && request.method === 'GET'

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2]))
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // ── Maintenance mode ──
  if (process.env.NEXT_PUBLIC_MAINTENANCE === 'true') {
    const isAdmin = user && pathname.startsWith('/dashboard/admin')
    const isPublicPath = pathname === '/' || pathname.startsWith('/auth') || pathname.startsWith('/_next')
    if (!isAdmin && !isPublicPath && pathname !== '/maintenance') {
      const url = request.nextUrl.clone()
      url.pathname = '/maintenance'
      return NextResponse.redirect(url)
    }
  }

  // ── Block unauthenticated from protected pages ──
  const protectedPaths = ['/dashboard', '/learn']
  if (!user && protectedPaths.some(p => pathname.startsWith(p))) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  // ── Block unauthenticated API writes ──
  if (!user && !isPublicApi && pathname.startsWith('/api/')) {
    if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(request.method)) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
  }

  if (user) {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, instructor_approved_at')
      .eq('id', user.id)
      .single()

    // DEBUG — visible in terminal (npm run dev)
    console.log(`[MIDDLEWARE] path=${pathname} user=${user.email} role=${profile?.role} approved=${profile?.instructor_approved_at} error=${profileError?.message}`)

    const role     = profile?.role
    const approved = profile?.instructor_approved_at

    // ── Helper: get home dashboard by role ──
    const homeDashboard = () => {
      if (role === 'admin')                          return '/dashboard/admin'
      if (role === 'institution' && approved)        return '/dashboard/institution'
      if (role === 'institution' && !approved)       return '/pending'
      if (role === 'instructor'  && approved)        return '/dashboard/instructor'
      if (role === 'instructor'  && !approved)       return '/pending'
      return '/dashboard/student'
    }

    // ── Redirect /dashboard (root) to correct dashboard ──
    if (pathname === '/dashboard') {
      const url = request.nextUrl.clone()
      url.pathname = homeDashboard()
      return NextResponse.redirect(url)
    }

    // ── Redirect away from auth pages when logged in ──
    if (pathname === '/auth/login' || pathname === '/auth/inscription') {
      const url = request.nextUrl.clone()
      url.pathname = homeDashboard()
      return NextResponse.redirect(url)
    }

    // ── Block unapproved instructors & institutions ──
    const isUnapproved =
      (role === 'instructor' || role === 'institution') && !approved
    if (isUnapproved && (pathname.startsWith('/dashboard') || pathname.startsWith('/learn'))) {
      const url = request.nextUrl.clone()
      url.pathname = '/pending'
      return NextResponse.redirect(url)
    }

    // ── Role-based dashboard protection ──
    if (pathname.startsWith('/dashboard/admin') && role !== 'admin') {
      const url = request.nextUrl.clone()
      url.pathname = homeDashboard()
      return NextResponse.redirect(url)
    }

    if (pathname.startsWith('/dashboard/institution')) {
      if (role !== 'institution' && role !== 'admin') {
        const url = request.nextUrl.clone()
        url.pathname = homeDashboard()
        return NextResponse.redirect(url)
      }
      if (role === 'institution' && !approved) {
        const url = request.nextUrl.clone()
        url.pathname = '/pending'
        return NextResponse.redirect(url)
      }
    }

    if (pathname.startsWith('/dashboard/instructor')) {
      if (role !== 'instructor' && role !== 'admin') {
        const url = request.nextUrl.clone()
        url.pathname = homeDashboard()
        return NextResponse.redirect(url)
      }
      if (role === 'instructor' && !approved) {
        const url = request.nextUrl.clone()
        url.pathname = '/pending'
        return NextResponse.redirect(url)
      }
    }

    if (role === 'student' && (
      pathname.startsWith('/dashboard/institution') ||
      pathname.startsWith('/dashboard/instructor') ||
      pathname.startsWith('/dashboard/admin')
    )) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard/student'
      return NextResponse.redirect(url)
    }

    // ── Redirect institution/instructor away from student dashboard ──
    if (pathname.startsWith('/dashboard/student')) {
      if (role === 'institution' && approved) {
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard/institution'
        return NextResponse.redirect(url)
      }
      if (role === 'instructor' && approved) {
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard/instructor'
        return NextResponse.redirect(url)
      }
      if (role === 'admin') {
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard/admin'
        return NextResponse.redirect(url)
      }
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}