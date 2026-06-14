'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { createBrowserClient } from '@/lib/supabase/browser'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { studentNav } from '@/lib/nav'
import { Card, EmptyState, Spinner } from '@/components/ui'
import { Award, Download, ExternalLink, Layers } from 'lucide-react'

export default function CertificatesPage() {
  const { profile } = useAuth()
  const supabase = createBrowserClient()
  const [courseCerts, setCourseCerts] = useState<any[]>([])
  const [programCerts, setProgramCerts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile) return
    const load = async () => {
      // FIX: was only loading course certs — now loads both course AND program certs
      const [cRes, pRes] = await Promise.all([
        supabase.from('certificates')
          .select('*,course:courses(title,slug,instructor:profiles!instructor_id(full_name))')
          .eq('student_id', profile.id)
          .order('issued_at', { ascending: false }),
        supabase.from('program_certificates')
          .select('*,program:programs(title,slug,institution:profiles!institution_id(full_name,institution_name))')
          .eq('student_id', profile.id)
          .order('issued_at', { ascending: false }),
      ])
      setCourseCerts(cRes.data || [])
      setProgramCerts(pRes.data || [])
      setLoading(false)
    }
    load()
  }, [profile])

  if (loading) return (
    <DashboardLayout navItems={studentNav} title="Mes certificats" role="student">
      <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>
    </DashboardLayout>
  )

  const total = courseCerts.length + programCerts.length

  return (
    <DashboardLayout navItems={studentNav} title="Mes certificats" role="student">
      <h1 className="text-2xl font-bold text-text mb-6">
        Mes certificats
        {total > 0 && <span className="ml-3 text-sm font-normal text-text3">{total} au total</span>}
      </h1>

      {total === 0 ? (
        <Card className="p-8">
          <EmptyState icon={<Award size={24} />} title="Aucun certificat"
            description="Terminez un cours à 100% pour obtenir votre certificat." />
        </Card>
      ) : (
        <>
          {/* Course certificates */}
          {courseCerts.length > 0 && (
            <section className="mb-8">
              <h2 className="text-base font-semibold text-text mb-4 flex items-center gap-2">
                <Award size={16} className="text-yellow" /> Certificats de cours ({courseCerts.length})
              </h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {courseCerts.map((c: any) => (
                  <Card key={c.id} className="p-5 hover:border-yellow/30 transition-colors">
                    <div className="w-14 h-14 bg-yellow/10 rounded-2xl flex items-center justify-center mb-4">
                      <Award size={28} className="text-yellow" />
                    </div>
                    <h3 className="font-semibold text-text mb-1 text-sm">{c.course?.title}</h3>
                    <p className="text-xs text-text3 mb-1">{c.course?.instructor?.full_name}</p>
                    <p className="text-xs text-text3 mb-4">
                      Délivré le {new Date(c.issued_at).toLocaleDateString('fr-FR')}
                    </p>
                    <p className="text-xs text-text3 mb-4 font-mono bg-card2 px-2 py-1 rounded-lg">
                      {c.certificate_number}
                    </p>
                    <div className="flex gap-2">
                      {c.pdf_url && (
                        <a href={c.pdf_url} target="_blank" rel="noopener noreferrer"
                          className="flex-1 flex items-center justify-center gap-1.5 bg-blue/10 hover:bg-blue text-blue hover:text-white text-xs py-2 rounded-lg transition-all">
                          <Download size={13} /> PDF
                        </a>
                      )}
                      <a href={c.verify_url || `/certificats/${c.certificate_number}`}
                        target="_blank" rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-1.5 bg-card2 hover:bg-card border border-border text-text2 text-xs py-2 rounded-lg transition-all">
                        <ExternalLink size={13} /> Vérifier
                      </a>
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {/* Program certificates */}
          {programCerts.length > 0 && (
            <section>
              <h2 className="text-base font-semibold text-text mb-4 flex items-center gap-2">
                <Layers size={16} className="text-blue" /> Certificats de programme ({programCerts.length})
              </h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {programCerts.map((c: any) => (
                  <Card key={c.id} className="p-5 hover:border-blue/30 transition-colors">
                    <div className="w-14 h-14 bg-blue/10 rounded-2xl flex items-center justify-center mb-4">
                      <Layers size={28} className="text-blue" />
                    </div>
                    <h3 className="font-semibold text-text mb-1 text-sm">{c.program?.title}</h3>
                    <p className="text-xs text-text3 mb-1">
                      {c.program?.institution?.institution_name || c.program?.institution?.full_name}
                    </p>
                    <p className="text-xs text-text3 mb-4">
                      Délivré le {new Date(c.issued_at).toLocaleDateString('fr-FR')}
                    </p>
                    <p className="text-xs text-text3 mb-4 font-mono bg-card2 px-2 py-1 rounded-lg">
                      {c.certificate_number}
                    </p>
                    <div className="flex gap-2">
                      <a href={c.verify_url || `/certificats/programme/${c.certificate_number}`}
                        target="_blank" rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-1.5 bg-card2 hover:bg-card border border-border text-text2 text-xs py-2 rounded-lg transition-all">
                        <ExternalLink size={13} /> Vérifier
                      </a>
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </DashboardLayout>
  )
}
