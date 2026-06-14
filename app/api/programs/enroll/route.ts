import { createSupabaseServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { program_id } = await req.json()
  if (!program_id) return NextResponse.json({ error: 'program_id requis' }, { status: 400 })

  // Verify program exists and is published
  const { data: program } = await supabase
    .from('programs')
    .select('id, pricing_model, price, enrolled_count')
    .eq('id', program_id)
    .eq('status', 'published')
    .single()

  if (!program) return NextResponse.json({ error: 'Programme introuvable' }, { status: 404 })

  // Check already enrolled
  const { data: existing } = await supabase
    .from('program_enrollments')
    .select('id')
    .eq('student_id', user.id)
    .eq('program_id', program_id)
    .maybeSingle()

  if (existing) return NextResponse.json({ enrolled: true, enrollment_id: existing.id })

  if (program.pricing_model !== 'free') {
    return NextResponse.json({ error: 'Paiement requis', requires_payment: true }, { status: 402 })
  }

  // Create enrollment
  const { data: enrollment, error } = await supabase
    .from('program_enrollments')
    .insert({ student_id: user.id, program_id, status: 'active' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Increment enrolled count
  await supabase
    .from('programs')
    .update({ enrolled_count: (program.enrolled_count || 0) + 1 })
    .eq('id', program_id)

  // Auto-enroll in all required courses of the program
  const { data: programCourses } = await supabase
    .from('program_courses')
    .select('course_id, course:courses(pricing_model)')
    .eq('program_id', program_id)
    .eq('is_required', true)

  for (const pc of programCourses || []) {
    const { data: courseEnroll } = await supabase
      .from('enrollments')
      .select('id')
      .eq('student_id', user.id)
      .eq('course_id', pc.course_id)
      .maybeSingle()

    if (!courseEnroll) {
      await supabase.from('enrollments').insert({
        student_id: user.id,
        course_id: pc.course_id,
        status: 'active',
      })
    }
  }

  return NextResponse.json({ enrolled: true, enrollment_id: enrollment.id })
}