'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { createBrowserClient } from '@/lib/supabase/browser'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { Card, Spinner } from '@/components/ui'
import {
  LayoutDashboard, BookOpen, UserCheck, Users, BarChart2,
  Globe, Settings, GraduationCap, FileText, Download,
  ArrowLeft, Eye, Send, CheckCircle, Clock, User
} from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import Link from 'next/link'

const navItems = [
  { label: 'Vue d\'ensemble', href: '/dashboard/institution',          icon: <LayoutDashboard size={16} /> },
  { label: 'Mode académique', href: '/dashboard/institution/academic', icon: <GraduationCap size={16} /> },
  { label: 'Cours',           href: '/dashboard/institution/courses',  icon: <BookOpen size={16} /> },
  { label: 'Équipe',          href: '/dashboard/institution/teachers', icon: <UserCheck size={16} /> },
  { label: 'Étudiants',       href: '/dashboard/institution/students', icon: <Users size={16} /> },
  { label: 'Analytiques',     href: '/dashboard/institution/analytics',icon: <BarChart2 size={16} /> },
  { label: 'Page publique',   href: '/dashboard/institution/profile',  icon: <Globe size={16} /> },
  { label: 'Paramètres',      href: '/dashboard/institution/settings', icon: <Settings size={16} /> },
]

export default function BulletinsPage() {
  const { profile } = useAuth()
  const supabase = createBrowserClient()

  const [loading, setLoading]       = useState(true)
  const [periods, setPeriods]       = useState<any[]>([])
  const [sections, setSections]     = useState<any[]>([])
  const [students, setStudents]     = useState<any[]>([])
  const [grades, setGrades]         = useState<any[]>([])
  const [subjects, setSubjects]     = useState<any[]>([])

  const [selectedPeriod,  setSelectedPeriod]  = useState('')
  const [selectedSection, setSelectedSection] = useState('')
  const [selectedStudent, setSelectedStudent] = useState('')
  const [publishing, setPublishing] = useState(false)
  const [viewMode, setViewMode]     = useState<'list' | 'preview'>('list')

  useEffect(() => {
    if (!profile) return
    const load = async () => {
      const [perRes, secRes, subRes] = await Promise.all([
        supabase.from('academic_periods').select('*, year:academic_years(name)').eq('institution_id', profile.id).order('order_num'),
        supabase.from('class_sections').select('*, level:class_levels(name)').eq('institution_id', profile.id),
        supabase.from('academic_subjects').select('*').eq('institution_id', profile.id).order('name'),
      ])
      setPeriods(perRes.data || [])
      setSections(secRes.data || [])
      setSubjects(subRes.data || [])
      setLoading(false)
    }
    load()
  }, [profile])

  useEffect(() => {
    if (!selectedSection || !profile) return
    const loadStudents = async () => {
      const { data } = await supabase
        .from('institutional_enrollments')
        .select('student_id, student_code, student:profiles!student_id(full_name, email, avatar_url)')
        .eq('institution_id', profile.id)
        .eq('class_section_id', selectedSection)
        .eq('status', 'active')
      setStudents(data || [])
    }
    loadStudents()
  }, [selectedSection])

  useEffect(() => {
    if (!selectedPeriod || !selectedSection || !profile) return
    const loadGrades = async () => {
      const { data } = await supabase
        .from('period_grades')
        .select(`
          *,
          period_subject:period_subjects!period_subject_id(
            subject:academic_subjects(name, coefficient, color, code),
            continuous_weight_pct, exam_weight_pct
          )
        `)
        .eq('institution_id', profile.id)
        .in('student_id', students.map(s => s.student_id))
      setGrades(data || [])
    }
    if (students.length > 0) loadGrades()
  }, [selectedPeriod, selectedSection, students])

  const publishBulletins = async () => {
    if (!selectedPeriod || !selectedSection || !profile) {
      toast.error('Sélectionnez une période et une section')
      return
    }
    setPublishing(true)
    const now = new Date().toISOString()
    const { error } = await supabase
      .from('period_grades')
      .update({ published_at: now })
      .eq('institution_id', profile.id)
      .in('student_id', students.map(s => s.student_id))
    if (error) toast.error(error.message)
    else toast.success(`Bulletins publiés ! Les élèves peuvent maintenant voir leurs notes.`)
    setPublishing(false)
  }

  const printBulletin = (studentId: string) => {
    setSelectedStudent(studentId)
    setViewMode('preview')
    setTimeout(() => window.print(), 500)
  }

  const selectedPeriodData  = periods.find(p => p.id === selectedPeriod)
  const selectedSectionData = sections.find(s => s.id === selectedSection)

  const getStudentGrades = (studentId: string) =>
    grades.filter(g => g.student_id === studentId)

  const getGeneralAverage = (studentId: string) => {
    const studentGrades = getStudentGrades(studentId).filter(g => g.period_average !== null)
    if (!studentGrades.length) return null
    const totalCoeff = studentGrades.reduce((s, g) => s + (g.period_subject?.subject?.coefficient || 1), 0)
    const weightedSum = studentGrades.reduce((s, g) =>
      s + (g.period_average * (g.period_subject?.subject?.coefficient || 1)), 0)
    return totalCoeff > 0 ? Math.round((weightedSum / totalCoeff) * 100) / 100 : null
  }

  if (loading) return (
    <DashboardLayout navItems={navItems} title="Bulletins" role="institution">
      <div className="flex justify-center py-16"><Spinner size="lg" /></div>
    </DashboardLayout>
  )

  return (
    <DashboardLayout navItems={navItems} title="Bulletins" role="institution">
      <>
        {/* Print styles */}
        <style>{`
          @media print {
            .no-print { display: none !important; }
            body { background: white; margin: 0; }
          }
        `}</style>

        <div className="no-print">
          <Link href="/dashboard/institution/academic"
            className="inline-flex items-center gap-1.5 text-xs text-text3 hover:text-text mb-6 transition-colors">
            <ArrowLeft size={12} /> Mode académique
          </Link>

          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-xl font-bold text-text">Bulletins de notes</h1>
              <p className="text-text3 text-sm mt-0.5">Générer et publier les bulletins par période</p>
            </div>
            <button onClick={publishBulletins} disabled={publishing || !selectedPeriod || !selectedSection}
              className="flex items-center gap-2 text-sm text-white font-medium px-4 py-2.5 rounded-xl edha-gradient hover:opacity-90 disabled:opacity-40">
              {publishing ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send size={15} />}
              Publier aux élèves
            </button>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <select value={selectedPeriod} onChange={e => setSelectedPeriod(e.target.value)}
              className="bg-bg2 border border-border rounded-xl px-4 py-2.5 text-sm text-text outline-none focus:border-blue/50">
              <option value="">Choisir une période...</option>
              {periods.map(p => <option key={p.id} value={p.id}>{p.name} — {p.year?.name}</option>)}
            </select>
            <select value={selectedSection} onChange={e => setSelectedSection(e.target.value)}
              className="bg-bg2 border border-border rounded-xl px-4 py-2.5 text-sm text-text outline-none focus:border-blue/50">
              <option value="">Choisir une section...</option>
              {sections.map(s => <option key={s.id} value={s.id}>{s.level?.name} — Section {s.name}</option>)}
            </select>
          </div>

          {/* Students list with grades summary */}
          {students.length > 0 ? (
            <Card className="overflow-hidden">
              <div className="px-5 py-4 border-b border-border bg-bg2 flex items-center justify-between">
                <p className="font-semibold text-text text-sm">
                  {selectedSectionData?.level?.name} — Section {selectedSectionData?.name}
                  {selectedPeriodData && ` · ${selectedPeriodData.name}`}
                </p>
                <p className="text-xs text-text3">{students.length} élèves</p>
              </div>
              <table className="w-full">
                <thead className="bg-bg2/50">
                  <tr>
                    <th className="text-left text-xs font-semibold text-text3 px-5 py-3">#</th>
                    <th className="text-left text-xs font-semibold text-text3 px-5 py-3">Élève</th>
                    <th className="text-center text-xs font-semibold text-text3 px-5 py-3">Moyenne générale</th>
                    <th className="text-center text-xs font-semibold text-text3 px-5 py-3">Matières notées</th>
                    <th className="text-center text-xs font-semibold text-text3 px-5 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {students.map((s: any, idx: number) => {
                    const avg    = getGeneralAverage(s.student_id)
                    const noted  = getStudentGrades(s.student_id).length
                    const isPassing = avg !== null && avg >= 10
                    return (
                      <tr key={s.student_id} className="hover:bg-bg2 transition-colors">
                        <td className="px-5 py-3 text-xs text-text3">{idx + 1}</td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-bg2 border border-border flex items-center justify-center flex-shrink-0">
                              {s.student?.avatar_url
                                ? <img src={s.student.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                                : <User size={14} className="text-text3" />}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-text">{s.student?.full_name}</p>
                              {s.student_code && <p className="text-[10px] text-text3">{s.student_code}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-center">
                          {avg !== null ? (
                            <span className={clsx(
                              'text-sm font-bold tabular-nums',
                              isPassing ? 'text-green' : 'text-red'
                            )}>
                              {avg.toFixed(2)}/20
                            </span>
                          ) : <span className="text-text3 text-sm">—</span>}
                        </td>
                        <td className="px-5 py-3 text-center text-xs text-text3">
                          {noted} / {subjects.length}
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => printBulletin(s.student_id)}
                              className="flex items-center gap-1.5 text-xs text-blue border border-blue/20 bg-blue/5 hover:bg-blue/10 px-3 py-1.5 rounded-lg transition-colors">
                              <Download size={11} /> Bulletin
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </Card>
          ) : (
            <Card className="p-10 text-center">
              <FileText size={28} className="text-text3 mx-auto mb-3" />
              <p className="text-sm text-text2">Sélectionnez une période et une section pour voir les bulletins</p>
            </Card>
          )}
        </div>

        {/* ═══ BULLETIN PRINT TEMPLATE ═══ */}
        {selectedStudent && viewMode === 'preview' && (() => {
          const studentData = students.find(s => s.student_id === selectedStudent)
          const studentGrades = getStudentGrades(selectedStudent)
          const avg = getGeneralAverage(selectedStudent)
          const instName = (profile as any)?.institution_name || profile?.full_name || 'EDHA Academy'
          const passing = avg !== null && avg >= 10

          return (
            <div className="fixed inset-0 bg-white z-50 overflow-auto p-8">
              {/* Close button */}
              <button onClick={() => setViewMode('list')}
                className="no-print fixed top-4 right-4 bg-text text-white px-4 py-2 rounded-xl text-sm">
                ✕ Fermer
              </button>
              <button onClick={() => window.print()}
                className="no-print fixed top-4 right-24 edha-gradient text-white px-4 py-2 rounded-xl text-sm flex items-center gap-2">
                <Download size={14} /> Imprimer / PDF
              </button>

              {/* Bulletin */}
              <div className="max-w-2xl mx-auto border-2 border-gray-800 rounded-lg overflow-hidden">
                {/* Header */}
                <div className="bg-[#0f1a2e] text-white p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h1 className="text-xl font-bold">{instName}</h1>
                      <p className="text-white/60 text-sm mt-1">{(profile as any)?.institution_address}</p>
                    </div>
                    <div className="text-right">
                      <img src="/logo.png" alt="EDHA" className="h-8 w-auto brightness-0 invert ml-auto mb-1" />
                      <p className="text-xs text-white/50">Plateforme EDHA Academy</p>
                    </div>
                  </div>
                  <div className="border-t border-white/20 mt-4 pt-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-white/50 uppercase tracking-widest">Bulletin de notes</p>
                      <p className="text-lg font-bold">{selectedPeriodData?.name}</p>
                      <p className="text-sm text-white/60">{selectedPeriodData?.year?.name || ''}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-white/50 uppercase tracking-widest">Section</p>
                      <p className="text-lg font-bold">{selectedSectionData?.level?.name} — {selectedSectionData?.name}</p>
                    </div>
                  </div>
                </div>

                {/* Student info */}
                <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-b border-gray-200">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Élève</p>
                    <p className="text-lg font-bold text-gray-900">{studentData?.student?.full_name}</p>
                    {studentData?.student_code && (
                      <p className="text-xs text-gray-500">Matricule: {studentData.student_code}</p>
                    )}
                  </div>
                  <div className={clsx(
                    'text-center px-6 py-3 rounded-xl',
                    passing ? 'bg-green-100 border border-green-200' : 'bg-red-100 border border-red-200'
                  )}>
                    <p className="text-xs font-semibold text-gray-500 uppercase">Moyenne générale</p>
                    <p className={clsx('text-3xl font-black', passing ? 'text-green-600' : 'text-red-600')}>
                      {avg !== null ? avg.toFixed(2) : '—'}
                    </p>
                    <p className={clsx('text-xs font-semibold', passing ? 'text-green-600' : 'text-red-600')}>
                      {passing ? '✓ Admis(e)' : '✗ Insuffisant'}
                    </p>
                  </div>
                </div>

                {/* Grades table */}
                <div className="p-6">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="text-left text-xs font-semibold text-gray-600 px-4 py-3 border border-gray-200">Matière</th>
                        <th className="text-center text-xs font-semibold text-gray-600 px-4 py-3 border border-gray-200">Coeff.</th>
                        <th className="text-center text-xs font-semibold text-gray-600 px-4 py-3 border border-gray-200">Moy. continue</th>
                        <th className="text-center text-xs font-semibold text-gray-600 px-4 py-3 border border-gray-200">Examen</th>
                        <th className="text-center text-xs font-semibold text-gray-600 px-4 py-3 border border-gray-200">Moyenne /20</th>
                        <th className="text-center text-xs font-semibold text-gray-600 px-4 py-3 border border-gray-200">Appréciation</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subjects.map((sub: any) => {
                        const g = studentGrades.find(gr =>
                          gr.period_subject?.subject?.name === sub.name
                        )
                        const avg = g?.period_average
                        const appreciation = avg === null || avg === undefined ? '—'
                          : avg >= 18 ? 'Excellent'
                          : avg >= 16 ? 'Très bien'
                          : avg >= 14 ? 'Bien'
                          : avg >= 12 ? 'Assez bien'
                          : avg >= 10 ? 'Passable'
                          : 'Insuffisant'
                        const isPassing = avg !== undefined && avg >= 10

                        return (
                          <tr key={sub.id} className="border border-gray-200 hover:bg-gray-50">
                            <td className="px-4 py-2.5 border border-gray-200">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: sub.color }} />
                                <span className="text-sm font-medium text-gray-800">{sub.name}</span>
                                {sub.code && <span className="text-[10px] text-gray-400 font-mono">{sub.code}</span>}
                              </div>
                            </td>
                            <td className="px-4 py-2.5 border border-gray-200 text-center text-sm text-gray-600">{sub.coefficient}</td>
                            <td className="px-4 py-2.5 border border-gray-200 text-center text-sm text-gray-600">
                              {g?.continuous_avg?.toFixed(2) ?? '—'}
                            </td>
                            <td className="px-4 py-2.5 border border-gray-200 text-center text-sm text-gray-600">
                              {g?.exam_score?.toFixed(2) ?? '—'}
                            </td>
                            <td className={clsx(
                              'px-4 py-2.5 border border-gray-200 text-center font-bold text-sm',
                              avg === undefined ? 'text-gray-400' : isPassing ? 'text-green-600' : 'text-red-600'
                            )}>
                              {avg?.toFixed(2) ?? '—'}
                            </td>
                            <td className="px-4 py-2.5 border border-gray-200 text-center text-xs text-gray-600 italic">
                              {appreciation}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                    {/* Totals */}
                    <tfoot>
                      <tr className="bg-[#0f1a2e] text-white">
                        <td className="px-4 py-3 font-bold text-sm" colSpan={4}>Moyenne générale du trimestre</td>
                        <td className="px-4 py-3 text-center font-black text-lg">
                          {avg?.toFixed(2) ?? '—'}/20
                        </td>
                        <td className="px-4 py-3 text-center text-sm font-semibold">
                          {passing ? '✓ Admis(e)' : '✗ Insuffisant'}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Signatures */}
                <div className="px-6 pb-6 grid grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="border-b border-gray-400 h-12 mb-2" />
                    <p className="text-xs text-gray-500">Directeur / Directrice</p>
                  </div>
                  <div className="text-center">
                    <div className="border-b border-gray-400 h-12 mb-2" />
                    <p className="text-xs text-gray-500">Professeur principal</p>
                  </div>
                  <div className="text-center">
                    <div className="border-b border-gray-400 h-12 mb-2" />
                    <p className="text-xs text-gray-500">Parent / Tuteur</p>
                  </div>
                </div>

                {/* Footer */}
                <div className="bg-gray-50 border-t border-gray-200 px-6 py-3 text-center">
                  <p className="text-[10px] text-gray-400">
                    Document généré par EDHA Academy · edha.academy · {new Date().toLocaleDateString('fr-FR')}
                  </p>
                </div>
              </div>
            </div>
          )
        })()}
      </>
    </DashboardLayout>
  )
}