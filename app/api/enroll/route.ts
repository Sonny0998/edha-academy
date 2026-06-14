import { createSupabaseServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { course_id } = await req.json()
  const { data: course } = await supabase.from('courses').select('id,pricing_model,price').eq('id', course_id).single()
  if (!course) return NextResponse.json({ error: 'Cours introuvable' }, { status: 404 })

  const { data: existing } = await supabase.from('enrollments').select('id').eq('student_id', user.id).eq('course_id', course_id).maybeSingle()
  if (existing) return NextResponse.json({ enrolled: true, enrollment_id: existing.id })

  if (course.pricing_model !== 'free') {
    return NextResponse.json({ error: 'Paiement requis', requires_payment: true }, { status: 402 })
  }

  const { data: enrollment, error } = await supabase.from('enrollments')
    .insert({ student_id: user.id, course_id, status: 'active' })
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase.rpc('increment_enrolled_count', { course_id })
  return NextResponse.json({ enrolled: true, enrollment_id: enrollment.id })
}

export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ enrolled: false })
  const course_id = req.nextUrl.searchParams.get('course_id')
  const { data } = await supabase.from('enrollments').select('id,progress_pct').eq('student_id', user.id).eq('course_id', course_id).maybeSingle()
  return NextResponse.json({ enrolled: !!data, enrollment: data })
}
