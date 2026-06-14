import { createSupabaseServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET — enrolled students or instructor/admin only
export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const lesson_id = req.nextUrl.searchParams.get('lesson_id')
  const course_id = req.nextUrl.searchParams.get('course_id')
  if (!lesson_id && !course_id)
    return NextResponse.json({ error: 'lesson_id ou course_id requis' }, { status: 400 })

  let query = supabase.from('lesson_qa')
    .select('*,student:profiles!student_id(full_name,avatar_url),answered_by_profile:profiles!answered_by(full_name)')
    .order('created_at', { ascending: false })

  if (lesson_id) query = query.eq('lesson_id', lesson_id)
  else if (course_id) query = query.eq('course_id', course_id)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ questions: data || [] })
}

// POST — any authenticated user can ask a question
export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { lesson_id, course_id, question } = await req.json()
  if (!lesson_id || !course_id || !question?.trim())
    return NextResponse.json({ error: 'Données invalides' }, { status: 400 })

  // Sanitize: strip HTML tags, limit length
  const sanitized = question.trim().replace(/<[^>]*>/g, '').substring(0, 2000)

  const { data, error } = await supabase.from('lesson_qa').insert({
    lesson_id, course_id, student_id: user.id, question: sanitized
  }).select('*,student:profiles!student_id(full_name,avatar_url)').single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ question: data })
}

// PATCH — only the instructor who OWNS the course can answer
export async function PATCH(req: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  // Verify user is instructor or admin
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (!profile || (profile.role !== 'instructor' && profile.role !== 'admin'))
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })

  const { id, answer, is_featured } = await req.json()
  if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 })

  // Verify course ownership (if instructor)
  if (profile.role === 'instructor') {
    const { data: qa } = await supabase.from('lesson_qa').select('course_id').eq('id', id).single()
    if (!qa) return NextResponse.json({ error: 'Question introuvable' }, { status: 404 })

    const { data: course } = await supabase
      .from('courses').select('instructor_id').eq('id', qa.course_id).single()
    if (!course || course.instructor_id !== user.id)
      return NextResponse.json({ error: 'Vous n\'êtes pas l\'instructeur de ce cours' }, { status: 403 })
  }

  const update: any = {}
  if (answer !== undefined) {
    update.answer = answer.trim().replace(/<script[^>]*>.*?<\/script>/gi, '')
    update.answered_by = user.id
    update.answered_at = new Date().toISOString()
  }
  if (is_featured !== undefined) update.is_featured = is_featured

  const { data, error } = await supabase.from('lesson_qa').update(update).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ question: data })
}
