import { createSupabaseServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { issueCertificate, issueProgramCertificate } from '@/lib/certificate'

// POST — mark a lesson complete and recalculate progress (single source of truth)
export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { lesson_id, course_id, enrollment_id } = await req.json()
  if (!lesson_id || !course_id || !enrollment_id)
    return NextResponse.json({ error: 'Données manquantes' }, { status: 400 })

  // Verify enrollment belongs to this user
  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('id, student_id, course_id')
    .eq('id', enrollment_id)
    .single()

  if (!enrollment || enrollment.student_id !== user.id)
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })

  // Upsert lesson progress
  const { error: progressError } = await supabase
    .from('lesson_progress')
    .upsert(
      {
        student_id: user.id,
        lesson_id,
        course_id,
        is_completed: true,
        completed_at: new Date().toISOString(),
        last_watched_at: new Date().toISOString(),
      },
      { onConflict: 'student_id,lesson_id' }
    )

  if (progressError)
    return NextResponse.json({ error: progressError.message }, { status: 500 })

  // Recalculate progress percentage
  const { count: totalLessons } = await supabase
    .from('lessons')
    .select('id', { count: 'exact', head: true })
    .eq('course_id', course_id)
    .eq('is_published', true)

  const { count: completedLessons } = await supabase
    .from('lesson_progress')
    .select('id', { count: 'exact', head: true })
    .eq('student_id', user.id)
    .eq('course_id', course_id)
    .eq('is_completed', true)

  const pct = totalLessons && totalLessons > 0
    ? Math.round(((completedLessons || 0) / totalLessons) * 100)
    : 0

  const courseCompleted = pct === 100

  await supabase
    .from('enrollments')
    .update({
      progress_pct: pct,
      last_lesson_id: lesson_id,
      ...(courseCompleted
        ? { completed_at: new Date().toISOString(), status: 'completed' }
        : {}),
    })
    .eq('id', enrollment_id)

  // FIX: use centralised certificate helper (single verify_url format)
  let certificateNumber: string | null = null
  let programCertificateNumber: string | null = null

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://edha.academy'

  if (courseCompleted) {
    certificateNumber = await issueCertificate(supabase, {
      student_id: user.id,
      course_id,
      enrollment_id,
      appUrl,
    })

    // Check program completion using a single batched query approach
    const { data: programCourses } = await supabase
      .from('program_courses')
      .select('program_id')
      .eq('course_id', course_id)

    if (programCourses?.length) {
      for (const pc of programCourses) {
        const { data: progEnrollment } = await supabase
          .from('program_enrollments')
          .select('id, status')
          .eq('student_id', user.id)
          .eq('program_id', pc.program_id)
          .maybeSingle()

        if (!progEnrollment || progEnrollment.status === 'completed') continue

        const { data: allRequired } = await supabase
          .from('program_courses')
          .select('course_id')
          .eq('program_id', pc.program_id)
          .eq('is_required', true)

        if (!allRequired?.length) continue

        const requiredIds = allRequired.map((c: any) => c.course_id)

        // Single query for all required completions at once
        const { data: completedCourses } = await supabase
          .from('enrollments')
          .select('course_id')
          .eq('student_id', user.id)
          .in('course_id', requiredIds)
          .eq('status', 'completed')

        const completedIds = new Set([
          ...(completedCourses || []).map((c: any) => c.course_id),
          course_id, // current course just completed
        ])

        const programCompleted = requiredIds.every((id: string) => completedIds.has(id))
        if (!programCompleted) continue

        await supabase
          .from('program_enrollments')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            progress_pct: 100,
          })
          .eq('id', progEnrollment.id)

        programCertificateNumber = await issueProgramCertificate(supabase, {
          student_id: user.id,
          program_id: pc.program_id,
          enrollment_id: progEnrollment.id,
          appUrl,
        })
        break
      }
    }
  }

  return NextResponse.json({
    success: true,
    progress_pct: pct,
    course_completed: courseCompleted,
    certificate_number: certificateNumber,
    program_completed: !!programCertificateNumber,
    program_certificate_number: programCertificateNumber,
  })
}

// GET — fetch progress for a course
export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const course_id = req.nextUrl.searchParams.get('course_id')
  if (!course_id)
    return NextResponse.json({ error: 'course_id requis' }, { status: 400 })

  const { data } = await supabase
    .from('lesson_progress')
    .select('lesson_id, is_completed, completed_at')
    .eq('student_id', user.id)
    .eq('course_id', course_id)

  return NextResponse.json({ progress: data || [] })
}
