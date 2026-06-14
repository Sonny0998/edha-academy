'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { studentNav } from '@/lib/nav'
import { createBrowserClient } from '@/lib/supabase/browser'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { Card, Spinner } from '@/components/ui'
import {
  LayoutDashboard, BookOpen, Award, User, Calendar,
  ClipboardList, FileText, Download, CheckCircle,
  Target, TrendingUp, TrendingDown
} from 'lucide-react'
import clsx from 'clsx'
import Link from 'next/link'

const navItems = [
  { label: 'Tableau de bord', href: '/dashboard/student',              icon: <LayoutDashboard size={16} /> },
  { label: 'Mes cours',       href: '/dashboard/student/courses',      icon: <BookOpen size={16} /> },
  { label: 'Devoirs',         href: '/dashboard/student/assignments',  icon: <ClipboardList size={16} /> },
  { label: 'Mon horaire',     href: '/dashboard/student/schedule',     icon: <Calendar size={16} /> },
  { label: 'Bulletins',       href: '/dashboard/student/bulletins',    icon: <FileText size={16} /> },
  { label: 'Certificats',     href: '/dashboard/student/certificates', icon: <Award size={16} /> },
  { label: 'Mon profil',      href: '/dashboard/student/profile',      icon: <User size={16} /> },
]

export default function StudentBulletinsPage() {
  const { profile } = useAuth()
  const supabase = createBrowserClient()
  const [loading, setLoading] = useState(true)
  const [grades, setGrades] = useState<any[]>([])
  const [annualResults, setAnnualResults] = useState<any[]>([])
  const [instEnroll, setInstEnroll] = useState<any>(null)
  const [subjects, setSubjects] = useState<any[]>([])

  useEffect(() => {
    if (!profile) return
    const load = async () => {
      const { data: enroll } = await supabase
        .from('institutional_enrollments')
        .select(`
          *,
          institution:profiles!institution_id(institution_name, institution_logo_url),
          section:class_sections!class_section_id(name, level:class_levels(name)),
          year:academic_years!academic_year_id(name)
        `)
        .eq('student_id', profile.id).eq('status', 'active').maybeSingle()

      setInstEnroll(enroll)
      if (!enroll) { setLoading(false); return }

      // Published period grades
      const { data: pgrades } = await supabase
        .from('period_grades')
        .select(`
          *,
          period_subject:period_subjects!period_subject_id(
            subject:academic_subjects(name, color, coefficient),
            period:academic_periods!academic_period_id(name, order_num)
          )
        `)
        .eq('student_id', profile.id)
        .eq('institution_id', enroll.institution_id)
        .not('published_at', 'is', null)
        .order('period_subject(period(order_num))')

      setGrades(pgrades || [])

      // Annual results
      const { data: annual } = await supabase
        .from('annual_student_results')
        .select('*')
        .eq('student_id', profile.id)
        .eq('institution_id', enroll.institution_id)
        .not('published_at', 'is', null)
        .order('created_at', { ascending: false })

      setAnnualResults(annual || [])

      // Subjects
      const { data: subs } = await supabase
        .from('academic_subjects')
        .select('*')
        .eq('institution_id', enroll.institution_id)
        .order('name')

      setSubjects(subs || [])
      setLoading(false)
    }
    load()
  }, [profile])

  const getGradeColor = (g: number, max = 20) => {
    const pct = g / max
    if (pct >= 0.8) return 'text-blue-500'
    if (pct >= 0.7) return 'text-green-500'
    if (pct >= 0.6) return 'text-cyan-500'
    if (pct >= 0.5) return 'text-yellow-500'
    return 'text-red-500'
  }

  // Group grades by period
  const periods = [...new Set(grades.map(g => g.period_subject?.period?.name))]
    .filter(Boolean).sort()

  const getSubjectGrade = (subjectName: string, periodName: string) =>
    grades.find(g =>
      g.period_subject?.subject?.name === subjectName &&
      g.period_subject?.period?.name === periodName
    )

  const generalAvg = grades.length > 0
    ? Math.round((grades.reduce((s, g) => s + (g.period_average || 0), 0) / grades.length) * 100) / 100
    : null

  if (loading) return (
    <DashboardLayout navItems={studentNav} title="Bulletins" role="student">
      <div className="flex justify-center py-16"><Spinner size="lg" /></div>
    </DashboardLayout>
  )

  return (
    <DashboardLayout navItems={studentNav} title="Bulletins" role="student">
      <div className="max-w-4xl space-y-6">
        <h1 className="text-2xl font-bold text-text">Mes bulletins & résultats</h1>

        {!instEnroll ? (
          <Card className="p-10 text-center">
            <FileText size={28} className="text-text3 mx-auto mb-3" />
            <p className="text-sm text-text2">Vous n&apos;êtes inscrit dans aucune institution</p>
          </Card>
        ) : (
          <>
            {/* Institution info */}
            <div className="flex items-center gap-4 p-4 bg-card border border-border rounded-2xl">
              {instEnroll.institution?.institution_logo_url && (
                <img src={instEnroll.institution.institution_logo_url} alt=""
                  className="w-12 h-12 rounded-xl object-cover border border-border flex-shrink-0" />
              )}
              <div>
                <p className="font-semibold text-text">{instEnroll.institution?.institution_name}</p>
                <p className="text-xs text-text3">
                  {instEnroll.section?.level?.name} — Section {instEnroll.section?.name} · {instEnroll.year?.name}
                </p>
              </div>
              {generalAvg !== null && (
                <div className="ml-auto text-right">
                  <p className={clsx('text-2xl font-black', getGradeColor(generalAvg))}>
                    {generalAvg}/20
                  </p>
                  <p className="text-xs text-text3">Moyenne générale</p>
                </div>
              )}
            </div>

            {/* Grades table */}
            {grades.length === 0 ? (
              <Card className="p-10 text-center">
                <Target size={28} className="text-text3 mx-auto mb-3" />
                <p className="text-sm text-text2">Aucune note publiée pour le moment</p>
                <p className="text-xs text-text3 mt-1">
                  Les notes apparaîtront ici lorsque l&apos;institution les publie
                </p>
              </Card>
            ) : (
              <Card className="overflow-hidden">
                <div className="px-5 py-4 border-b border-border bg-bg2">
                  <h2 className="font-semibold text-text text-sm">Notes par période</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-bg2/50">
                      <tr>
                        <th className="text-left text-xs font-semibold text-text3 px-5 py-3">Matière</th>
                        <th className="text-center text-xs font-semibold text-text3 px-3 py-3">Coeff.</th>
                        {periods.map(p => (
                          <th key={p} className="text-center text-xs font-semibold text-text3 px-3 py-3">{p}</th>
                        ))}
                        <th className="text-center text-xs font-semibold text-text3 px-3 py-3">Moy. annuelle</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {subjects.map(sub => {
                        const subGrades = periods.map(p => getSubjectGrade(sub.name, p))
                        const validGrades = subGrades.filter(g => g?.period_average !== null && g?.period_average !== undefined)
                        const annualAvg = validGrades.length > 0
                          ? Math.round((validGrades.reduce((s, g) => s + g.period_average, 0) / validGrades.length) * 100) / 100
                          : null

                        if (subGrades.every(g => !g)) return null

                        return (
                          <tr key={sub.id} className="hover:bg-bg2 transition-colors">
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: sub.color }} />
                                <span className="text-sm font-medium text-text">{sub.name}</span>
                              </div>
                            </td>
                            <td className="px-3 py-3 text-center text-xs text-text3">{sub.coefficient}</td>
                            {periods.map(p => {
                              const g = getSubjectGrade(sub.name, p)
                              return (
                                <td key={p} className="px-3 py-3 text-center">
                                  {g?.period_average !== null && g?.period_average !== undefined ? (
                                    <span className={clsx('text-sm font-bold tabular-nums', getGradeColor(g.period_average))}>
                                      {g.period_average.toFixed(1)}
                                    </span>
                                  ) : (
                                    <span className="text-text3 text-sm">—</span>
                                  )}
                                </td>
                              )
                            })}
                            <td className="px-3 py-3 text-center">
                              {annualAvg !== null ? (
                                <span className={clsx('text-sm font-black tabular-nums', getGradeColor(annualAvg))}>
                                  {annualAvg.toFixed(2)}
                                </span>
                              ) : <span className="text-text3">—</span>}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                    {generalAvg !== null && (
                      <tfoot>
                        <tr className="bg-[#0f1a2e]">
                          <td className="px-5 py-3 text-sm font-bold text-white" colSpan={periods.length + 2}>
                            Moyenne générale
                          </td>
                          <td className="px-3 py-3 text-center text-lg font-black"
                            style={{ color: generalAvg >= 10 ? '#10b981' : '#ef4444' }}>
                            {generalAvg.toFixed(2)}/20
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </Card>
            )}

            {/* Annual results */}
            {annualResults.length > 0 && (
              <div>
                <h2 className="font-semibold text-text mb-3">Décisions annuelles</h2>
                <div className="space-y-3">
                  {annualResults.map(r => (
                    <Card key={r.id} className={clsx('p-5',
                      r.decision === 'promoted' || r.decision === 'honors' || r.decision === 'graduated'
                        ? 'border-green/20 bg-green/5'
                        : r.decision === 'repeating' ? 'border-red/20 bg-red/5' : '')}>
                      <div className="flex items-center gap-4">
                        <div className={clsx('w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 text-2xl',
                          r.decision === 'graduated' ? 'bg-blue/10' :
                          r.decision === 'promoted' || r.decision === 'honors' ? 'bg-green/10' :
                          'bg-red/10')}>
                          {r.decision === 'graduated' ? '🎓' :
                           r.decision === 'promoted' || r.decision === 'honors' ? '✅' : '🔄'}
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-text">
                            {r.decision === 'promoted'   ? 'Admis(e) — Passage au niveau supérieur' :
                             r.decision === 'honors'     ? 'Admis(e) avec mention' :
                             r.decision === 'graduated'  ? 'Diplômé(e) !' :
                             r.decision === 'repeating'  ? 'Redoublant(e)' :
                             r.decision === 'conditional'? 'Admis(e) conditionnellement' :
                             'En attente'}
                          </p>
                          {r.honors && <p className="text-sm text-blue font-medium">{r.honors}</p>}
                          <div className="flex items-center gap-4 mt-1">
                            {r.general_average && (
                              <p className="text-xs text-text3">
                                Moyenne: <strong>{r.general_average}/20</strong>
                              </p>
                            )}
                            {r.rank_in_class && (
                              <p className="text-xs text-text3">
                                Rang: <strong>{r.rank_in_class}/{r.total_in_class}</strong>
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  )
}