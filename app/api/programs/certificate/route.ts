import { createSupabaseServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { program_id } = await req.json()
  if (!program_id) return NextResponse.json({ error: 'program_id requis' }, { status: 400 })

  // Verify enrollment
  const { data: enrollment } = await supabase
    .from('program_enrollments')
    .select('id, status, progress_pct')
    .eq('student_id', user.id)
    .eq('program_id', program_id)
    .single()

  if (!enrollment) {
    return NextResponse.json({ error: 'Inscription introuvable' }, { status: 404 })
  }

  // Get all required courses in the program
  const { data: programCourses } = await supabase
    .from('program_courses')
    .select('course_id, is_required')
    .eq('program_id', program_id)
    .eq('is_required', true)

  if (!programCourses?.length) {
    return NextResponse.json({ error: 'Aucun cours dans ce programme' }, { status: 400 })
  }

  // Check if student completed all required courses
  const courseIds = programCourses.map(pc => pc.course_id)
  const { data: completedEnrollments } = await supabase
    .from('enrollments')
    .select('course_id, progress_pct, completed_at')
    .eq('student_id', user.id)
    .in('course_id', courseIds)

  const completedIds = (completedEnrollments || [])
    .filter(e => e.progress_pct === 100 || e.completed_at)
    .map(e => e.course_id)

  const allCompleted = courseIds.every(id => completedIds.includes(id))
  const progressPct = Math.round((completedIds.length / courseIds.length) * 100)

  // Update program enrollment progress
  await supabase.from('program_enrollments')
    .update({
      progress_pct: progressPct,
      ...(allCompleted ? { status: 'completed', completed_at: new Date().toISOString() } : {}),
    })
    .eq('id', enrollment.id)

  if (!allCompleted) {
    return NextResponse.json({
      success: true,
      completed: false,
      progress_pct: progressPct,
      completed_courses: completedIds.length,
      total_courses: courseIds.length,
    })
  }

  // Check if certificate already exists
  const { data: existingCert } = await supabase
    .from('program_certificates')
    .select('certificate_number')
    .eq('student_id', user.id)
    .eq('program_id', program_id)
    .maybeSingle()

  if (existingCert) {
    return NextResponse.json({
      success: true,
      completed: true,
      progress_pct: 100,
      certificate_number: existingCert.certificate_number,
    })
  }

  // Generate certificate number
  const ts     = Date.now().toString(36).toUpperCase()
  const suffix = Math.floor(Math.random() * 9000 + 1000).toString()
  const certNumber = `EDHA-PROG-${new Date().getFullYear()}-${ts}-${suffix}`

  const { error: certError } = await supabase.from('program_certificates').insert({
    student_id:         user.id,
    program_id,
    enrollment_id:      enrollment.id,
    certificate_number: certNumber,
    status:             'issued',
  })

  if (certError) {
    return NextResponse.json({ error: certError.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    completed: true,
    progress_pct: 100,
    certificate_number: certNumber,
    newly_issued: true,
  })
}

export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const program_id = req.nextUrl.searchParams.get('program_id')
  if (!program_id) return NextResponse.json({ error: 'program_id requis' }, { status: 400 })

  const { data: cert } = await supabase
    .from('program_certificates')
    .select('certificate_number, issued_at')
    .eq('student_id', user.id)
    .eq('program_id', program_id)
    .maybeSingle()

  return NextResponse.json({ certificate: cert || null })
}