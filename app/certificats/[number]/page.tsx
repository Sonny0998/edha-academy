import { createSupabaseServerClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { XCircle } from 'lucide-react'
import CertificateClient from './CertificateClient'

export default async function CertificatePage({ params }: { params: Promise<{ number: string }> }) {
  const { number } = await params
  const supabase = await createSupabaseServerClient()

  const { data: cert } = await supabase
    .from('certificates')
    .select(`
      *,
      student:profiles!student_id(full_name),
      course:courses(
        title,
        instructor:profiles!instructor_id(full_name, signature_url)
      )
    `)
    .eq('certificate_number', number)
    .single()

  // Fetch platform signature from settings
  const { data: settings } = await supabase
    .from('platform_settings')
    .select('admin_signature_url, admin_name')
    .single()

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
          <Link href="/" className="text-blue hover:underline">← Retour à l'accueil</Link>
        </div>
      </div>
    )
  }

  const studentName    = (cert as any).student?.full_name ?? 'Étudiant'
  const courseTitle    = (cert as any).course?.title ?? 'Cours'
  const instructorName = (cert as any).course?.instructor?.full_name ?? 'Instructeur'
  const instructorSig  = (cert as any).course?.instructor?.signature_url ?? null
  const adminSig       = settings?.admin_signature_url ?? null
  const adminName      = settings?.admin_name ?? 'Direction EDHA'
  const issuedDate     = new Date(cert.issued_at).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric'
  })

  return (
    <CertificateClient
      studentName={studentName}
      courseTitle={courseTitle}
      instructorName={instructorName}
      instructorSig={instructorSig}
      adminSig={adminSig}
      adminName={adminName}
      certificateNumber={cert.certificate_number}
      issuedDate={issuedDate}
      verifyUrl={cert.verify_url || `${process.env.NEXT_PUBLIC_APP_URL || 'https://edha.academy'}/certificats/${cert.certificate_number}`}
    />
  )
}
