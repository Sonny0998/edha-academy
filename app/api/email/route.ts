import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  // Read body ONCE at the start
  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body invalide' }, { status: 400 })
  }

  const { type, userId, email, name } = body

  // Basic validation
  if (!email || !type || !name)
    return NextResponse.json({ error: 'email, type, name requis' }, { status: 400 })
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return NextResponse.json({ error: 'Email invalide' }, { status: 400 })

  // SECURITY: verify caller
  const internalSecret = req.headers.get('x-internal-secret')
  const isInternal = internalSecret === process.env.INTERNAL_API_SECRET

  if (!isInternal) {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles').select('role').eq('id', user.id).single()

    // instructor_pending can be sent by newly registered users (any role)
    // approved/rejected only by admins
    if (profile?.role !== 'admin' && type !== 'instructor_pending') {
      return NextResponse.json({ error: 'Réservé aux admins' }, { status: 403 })
    }
  }

  const adminDb = createAdminClient()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://edhaacademy.ht'

  const templates: Record<string, { subject: string; html: string }> = {
    instructor_pending: {
      subject: '⏳ EDHA Academy — Votre demande est en cours d\'examen',
      html: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#f8fafc;padding:32px;border-radius:16px">
        <div style="text-align:center;margin-bottom:24px">
          <h1 style="color:#0891b2;margin:0;font-size:28px">EDHA Academy</h1>
          <p style="color:#64748b;margin:4px 0 0;font-size:13px">Éducation &amp; Développement d'Haïti</p>
        </div>
        <div style="background:white;border-radius:12px;padding:28px;border:1px solid #e2e8f0">
          <h2 style="color:#0f172a;margin:0 0 16px">Bonjour ${name} 👋</h2>
          <p style="color:#475569;line-height:1.7;margin:0 0 16px">Merci pour votre inscription sur EDHA Academy ! Nous avons bien reçu votre demande et nous l'examinons actuellement.</p>
          <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:8px;padding:16px;margin:16px 0">
            <p style="color:#92400e;margin:0;font-weight:600">⏳ Statut : En attente d'approbation</p>
            <p style="color:#92400e;margin:8px 0 0;font-size:14px">Notre équipe examinera votre profil et vos documents dans les 48 heures.</p>
          </div>
          <p style="color:#475569;line-height:1.7;margin:16px 0 0"><strong>Important :</strong> Vous ne pourrez pas accéder à la plateforme avant approbation.</p>
        </div>
        <p style="color:#94a3b8;font-size:12px;text-align:center;margin-top:24px">Questions ? <a href="mailto:contact@edhaacademy.ht" style="color:#0891b2">contact@edhaacademy.ht</a></p>
      </div>`
    },
    instructor_approved: {
      subject: '✅ EDHA Academy — Votre compte est approuvé !',
      html: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#f8fafc;padding:32px;border-radius:16px">
        <div style="text-align:center;margin-bottom:24px">
          <h1 style="color:#0891b2;margin:0;font-size:28px">EDHA Academy</h1>
        </div>
        <div style="background:white;border-radius:12px;padding:28px;border:1px solid #e2e8f0">
          <h2 style="color:#0f172a;margin:0 0 16px">Félicitations ${name} ! 🎉</h2>
          <div style="background:#d1fae5;border:1px solid #6ee7b7;border-radius:8px;padding:16px;margin:16px 0">
            <p style="color:#065f46;margin:0;font-weight:600">✅ Votre compte instructeur est approuvé !</p>
          </div>
          <p style="color:#475569;line-height:1.7">Vous pouvez maintenant vous connecter et créer vos cours.</p>
          <div style="text-align:center;margin:24px 0">
            <a href="${appUrl}/auth/login" style="background:linear-gradient(135deg,#0891b2,#06b6d4);color:white;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:600;display:inline-block">
              Accéder à mon compte →
            </a>
          </div>
        </div>
      </div>`
    },
    instructor_rejected: {
      subject: '❌ EDHA Academy — Demande non approuvée',
      html: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#f8fafc;padding:32px;border-radius:16px">
        <div style="background:white;border-radius:12px;padding:28px;border:1px solid #e2e8f0">
          <h2 style="color:#0f172a;margin:0 0 16px">Bonjour ${name}</h2>
          <p style="color:#475569;line-height:1.7">Après examen de votre dossier, nous ne sommes pas en mesure d'approuver votre demande pour le moment. Vous pouvez vous réinscrire avec des informations complémentaires.</p>
          <p style="color:#475569">Contactez-nous : <a href="mailto:contact@edhaacademy.ht" style="color:#0891b2">contact@edhaacademy.ht</a></p>
        </div>
      </div>`
    }
  }

  const template = templates[type]
  if (!template) return NextResponse.json({ error: 'Template inconnu' }, { status: 400 })

  // Log email to DB
  await adminDb.from('email_logs').insert({
    user_id: userId || null, email, type,
    subject: template.subject,
    sent_at: new Date().toISOString(),
  })

  // Send via Resend
  if (process.env.RESEND_API_KEY) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: 'EDHA Academy <noreply@edhaacademy.ht>',
          to: [email], subject: template.subject, html: template.html,
        }),
      })
      if (!res.ok) console.error('Resend error:', await res.text())
    } catch (e) {
      console.error('Email error:', e)
    }
  }

  return NextResponse.json({ success: true })
}
