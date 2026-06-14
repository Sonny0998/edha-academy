import { createSupabaseServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { course_id, rating, comment } = await req.json()
  if (!course_id || !rating || rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'Données invalides' }, { status: 400 })
  }

  // Check enrolled
  const { data: enrollment } = await supabase
    .from('enrollments').select('id').eq('student_id', user.id).eq('course_id', course_id).maybeSingle()
  if (!enrollment) return NextResponse.json({ error: 'Vous devez être inscrit à ce cours' }, { status: 403 })

  const { data, error } = await supabase.from('reviews').upsert({
    course_id, student_id: user.id, rating, comment: comment || null,
    is_verified_purchase: true,
  }, { onConflict: 'course_id,student_id' }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ review: data })
}

export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const course_id = req.nextUrl.searchParams.get('course_id')
  const { data } = await supabase
    .from('reviews')
    .select('*, student:profiles!student_id(full_name, avatar_url)')
    .eq('course_id', course_id!)
    .order('created_at', { ascending: false })
  return NextResponse.json({ reviews: data || [] })
}
