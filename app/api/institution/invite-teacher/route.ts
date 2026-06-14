import { createSupabaseServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  // Verify caller is an institution
  const { data: institution } = await supabase
    .from('profiles')
    .select('role, institution_name, full_name, instructor_approved_at')
    .eq('id', user.id)
    .single()

  if (institution?.role !== 'institution') {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }
  if (!institution?.instructor_approved_at) {
    return NextResponse.json({ error: 'Institution non approuvée' }, { status: 403 })
  }

  const { email } = await req.json()
  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'Email invalide' }, { status: 400 })
  }

  // Check if user already exists
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id, role, full_name, institution_name')
    .eq('email', email)
    .maybeSingle()

  if (existingProfile) {
    // User exists — link them to the institution
    if (existingProfile.role !== 'instructor') {
      return NextResponse.json({
        error: 'Cet utilisateur n\'est pas un instructeur EDHA'
      }, { status: 400 })
    }

    // Update their institution_name to link them
    await supabase.from('profiles')
      .update({ institution_name: institution.institution_name })
      .eq('id', existingProfile.id)

    return NextResponse.json({
      success: true,
      message: `${existingProfile.full_name} a été ajouté à votre équipe.`,
      type: 'linked'
    })
  }

  // User doesn't exist — send invitation email
  try {
    await fetch('/api/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'institution_invite',
        email,
        institutionName: institution.institution_name || institution.full_name,
        inviteUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/devenir-instructeur?institution=${encodeURIComponent(institution.institution_name || '')}&invited_by=${user.id}`,
      }),
    })
  } catch (err) {
    console.error('Email send error:', err)
  }

  return NextResponse.json({
    success: true,
    message: `Invitation envoyée à ${email}. L'enseignant recevra un email pour créer son compte.`,
    type: 'invited'
  })
}