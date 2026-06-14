import { createSupabaseServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ saved: false })
  const course_id = req.nextUrl.searchParams.get('course_id')
  if (!course_id) return NextResponse.json({ saved: false })
  const { data } = await supabase.from('wishlist').select('id').eq('student_id', user.id).eq('course_id', course_id).maybeSingle()
  return NextResponse.json({ saved: !!data })
}

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { course_id } = await req.json()
  const { data: existing } = await supabase.from('wishlist').select('id').eq('student_id', user.id).eq('course_id', course_id).maybeSingle()
  if (existing) {
    await supabase.from('wishlist').delete().eq('id', existing.id)
    return NextResponse.json({ saved: false })
  } else {
    await supabase.from('wishlist').insert({ student_id: user.id, course_id })
    return NextResponse.json({ saved: true })
  }
}
