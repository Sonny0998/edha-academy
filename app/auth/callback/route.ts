import { createSupabaseServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') || '/dashboard/student'

  if (code) {
    const supabase = await createSupabaseServerClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error && data.user) {
      // Get or create profile
      const { data: profile } = await supabase.from('profiles').select('role,instructor_approved_at').eq('id', data.user.id).single()
      if (profile) {
        if (profile.role === 'admin') return NextResponse.redirect(new URL('/dashboard/admin', request.url))
        if (profile.role === 'instructor' && profile.instructor_approved_at) return NextResponse.redirect(new URL('/dashboard/instructor', request.url))
        if (profile.role === 'instructor' && !profile.instructor_approved_at) return NextResponse.redirect(new URL('/pending', request.url))
      }
      return NextResponse.redirect(new URL('/dashboard/student', request.url))
    }
  }
  return NextResponse.redirect(new URL('/auth/login', request.url))
}
