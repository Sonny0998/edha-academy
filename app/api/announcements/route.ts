import { createSupabaseServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET — enrolled students or instructor/admin only
export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const course_id = req.nextUrl.searchParams.get('course_id')
  if (!course_id)
    return NextResponse.json({ error: 'course_id requis' }, { status: 400 })

  const { data } = await supabase.from('announcements')
    .select('*,instructor:profiles!instructor_id(full_name,avatar_url)')
    .eq('course_id', course_id)
    .order('created_at', { ascending: false })

  return NextResponse.json({ announcements: data || [] })
}

// POST — instructor must own the course
export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (!profile || (profile.role !== 'instructor' && profile.role !== 'admin'))
    return NextResponse.json({ error: 'Réservé aux instructeurs' }, { status: 403 })

  const { course_id, title, body } = await req.json()
  if (!course_id || !title?.trim() || !body?.trim())
    return NextResponse.json({ error: 'Titre et contenu requis' }, { status: 400 })

  // Verify course ownership
  if (profile.role === 'instructor') {
    const { data: course } = await supabase
      .from('courses').select('instructor_id').eq('id', course_id).single()
    if (!course || course.instructor_id !== user.id)
      return NextResponse.json({ error: 'Vous n\'êtes pas l\'instructeur de ce cours' }, { status: 403 })
  }

  // Sanitize content
  const cleanTitle = title.trim().replace(/<[^>]*>/g, '').substring(0, 200)
  const cleanBody  = body.trim().replace(/<script[^>]*>.*?<\/script>/gi, '').substring(0, 5000)

  const { data, error } = await supabase.from('announcements')
    .insert({ course_id, instructor_id: user.id, title: cleanTitle, body: cleanBody })
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ announcement: data })
}
