import { createSupabaseServerClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { XCircle } from 'lucide-react'
import ProgramCertificateClient from './ProgramCertificateClient'

export default async function ProgramCertificatePage({
  params,
}: { params: Promise<{ number: string }> }) {
  const { number } = await params
  const supabase = await createSupabaseServerClient()

  const { data: cert } = await supabase
    .from('program_certificates')
    .select(`
      *,
      student:profiles!student_id(full_name),
      program:programs(
        title,
        certificate_title,
        institution:profiles!institution_id(
          full_name,
          institution_name,
          institution_logo_url,
          signature_url
        )
      )
    `)
    .eq('certificate_number', number)
    .single()

  // Fetch EDHA admin signature
  const { data: settings } = await supabase
    .from('platform_settings')
    .select('*')
    .limit(10)

  let adminSigUrl: string | null = null
  let adminName = 'Direction EDHA Academy'

  if (settings) {
    for (const row of settings) {
      if (row.key === 'signature' && row.value) {
        adminSigUrl = (row.value as any).admin_signature_url || null
        adminName   = (row.value as any).admin_name || 'Direction EDHA Academy'
      }
      if (row.admin_signature_url) adminSigUrl = row.admin_signature_url
      if (row.admin_name) adminName = row.admin_name
    }
  }

  if (!cert) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <XCircle size={32} className="text-red" />
          </div>
          <h1 className="text-2xl font-bold text-text mb-2">Certificat invalide</h1>
          <p className="text-text3 mb-6">
            Aucun certificat trouvé avec le numéro{' '}
            <code className="text-blue font-mono bg-card2 px-2 py-0.5 rounded">{number}</code>
          </p>
          <Link href="/" className="text-blue hover:underline">← Retour à l&apos;accueil</Link>
        </div>
      </div>
    )
  }

  const c = cert as any
  const institution = c.program?.institution
  const instName    = institution?.institution_name || institution?.full_name || 'EDHA Academy'
  const instLogo    = institution?.institution_logo_url || null
  const instSig     = institution?.signature_url || null

  return (
    <ProgramCertificateClient
      studentName={c.student?.full_name || 'Étudiant'}
      programTitle={c.program?.title || 'Programme'}
      certificateTitle={c.program?.certificate_title || 'Certificat de complétion du programme'}
      institutionName={instName}
      institutionLogo={instLogo}
      institutionSig={instSig}
      adminSig={adminSigUrl}
      adminName={adminName}
      certificateNumber={c.certificate_number}
      issuedDate={new Date(c.issued_at).toLocaleDateString('fr-FR', {
        day: 'numeric', month: 'long', year: 'numeric',
      })}
      verifyUrl={c.verify_url || `${process.env.NEXT_PUBLIC_APP_URL || 'https://edha.academy'}/certificats/programme/${c.certificate_number}`}
    />
  )
}