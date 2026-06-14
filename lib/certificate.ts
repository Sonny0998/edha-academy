/**
 * EDHA Academy — Certificate utilities (single source of truth)
 * FIX: Previously certificate generation was duplicated in the client
 * (learn/[slug]/page.tsx) AND the server (/api/progress/route.ts),
 * producing different verify_url formats.  Now everything uses this file.
 */
import type { SupabaseClient } from '@supabase/supabase-js'

/** Generate a unique EDHA certificate number */
export function generateCertNumber(prefix = 'EDHA'): string {
  const ts     = Date.now().toString(36).toUpperCase()
  const suffix = Math.floor(Math.random() * 9000 + 1000).toString()
  return `${prefix}-${new Date().getFullYear()}-${ts}-${suffix}`
}

/** Issue (or return existing) course certificate. Returns certificate_number */
export async function issueCertificate(
  supabase: SupabaseClient,
  {
    student_id,
    course_id,
    enrollment_id,
    appUrl,
  }: { student_id: string; course_id: string; enrollment_id: string; appUrl: string }
): Promise<string> {
  const { data: existing } = await supabase
    .from('certificates')
    .select('certificate_number')
    .eq('student_id', student_id)
    .eq('course_id', course_id)
    .maybeSingle()

  if (existing?.certificate_number) return existing.certificate_number

  const certNum  = generateCertNumber('EDHA')
  const verifyUrl = `${appUrl}/certificats/${certNum}`

  await supabase.from('certificates').insert({
    student_id,
    course_id,
    enrollment_id,
    certificate_number: certNum,
    verify_url: verifyUrl,
    status: 'issued',
    issued_at: new Date().toISOString(),
  })

  return certNum
}

/** Issue (or return existing) program certificate. Returns certificate_number */
export async function issueProgramCertificate(
  supabase: SupabaseClient,
  {
    student_id,
    program_id,
    enrollment_id,
    appUrl,
  }: { student_id: string; program_id: string; enrollment_id: string; appUrl: string }
): Promise<string> {
  const { data: existing } = await supabase
    .from('program_certificates')
    .select('certificate_number')
    .eq('student_id', student_id)
    .eq('program_id', program_id)
    .maybeSingle()

  if (existing?.certificate_number) return existing.certificate_number

  const certNum   = generateCertNumber('EDHA-PROG')
  const verifyUrl = `${appUrl}/certificats/programme/${certNum}`

  await supabase.from('program_certificates').insert({
    student_id,
    program_id,
    enrollment_id,
    certificate_number: certNum,
    verify_url: verifyUrl,
    status: 'issued',
    issued_at: new Date().toISOString(),
  })

  return certNum
}
