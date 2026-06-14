'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { createBrowserClient } from '@/lib/supabase/browser'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { Card, Spinner } from '@/components/ui'
import {
  LayoutDashboard, BookOpen, UserCheck, Users, BarChart2,
  Globe, Settings, GraduationCap, ArrowLeft, ChevronUp,
  ChevronDown, Award, AlertTriangle, CheckCircle, RotateCcw, Save
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

const DECISION_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any; desc: string }> = {
  pending:     { label: 'En attente',      color: 'text-text3',  bg: 'bg-bg2',        icon: ChevronDown,   desc: 'Résultat pas encore calculé' },
  promoted:    { label: 'Promu(e)',         color: 'text-green',  bg: 'bg-green/10',   icon: ChevronUp,     desc: 'Passe au niveau suivant' },
  honors:      { label: 'Mention',          color: 'text-blue',   bg: 'bg-blue/10',    icon: Award,         desc: 'Promu(e) avec mention' },
  repeating:   { label: 'Redoublant(e)',    color: 'text-red',    bg: 'bg-red/10',     icon: RotateCcw,     desc: 'Doit reprendre le même niveau' },
  graduated:   { label: 'Diplômé(e)',       color: 'text-purple', bg: 'bg-purple/10',  icon: Award,         desc: 'A obtenu son diplôme' },
  conditional: { label: 'Conditionnel',     color: 'text-yellow', bg: 'bg-yellow/10',  icon: AlertTriangle, desc: 'Passe sous conditions' },
}

const HONORS_CONFIG = [
  { value: 'Très bien',  min: 16 },
  { value: 'Bien',       min: 14 },
  { value: 'Assez bien', min: 12 },
  { value: 'Passable',   min: 10 },
]

export default function ResultsPage() {
  const { profile } = useAuth()
  const supabase = createBrowserClient()

  const [loading, setLoading]       = useState(true)
  const [years, setYears]           = useState<any[]>([])
  const [sections, setSections]     = useState<any[]>([])
  const [students, setStudents]     = useState<any[]>([])
  const [results, setResults]       = useState<Record<string, any>>({})
  const [annualAvgs, setAnnualAvgs] = useState<Record<string, any[]>>({})

  const [selectedYear,    setSelectedYear]    = useState('')
  const [selectedSection, setSelectedSection] = useState('')
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)

  useEffect(() => {
    if (!profile) return
    const load = async () => {
      const [yearRes, secRes] = await Promise.all([
        supabase.from('academic_years').select('*').eq('institution_id', profile.id).order('created_at', { ascending: false }),
        supabase.from('class_sections').select('*, level:class_levels(name)').eq('institution_id', profile.id),
      ])
      setYears(yearRes.data || [])
      setSections(secRes.data || [])
      const current = (yearRes.data || []).find((y: any) => y.is_current)
      if (current) setSelectedYear(current.id)
      setLoading(false)
    }
    load()
  }, [profile])

  useEffect(() => {
    if (!selectedSection || !selectedYear || !profile) return
    const load = async () => {
      // Load students
      const { data: stuData } = await supabase
        .from('institutional_enrollments')
        .select('student_id, student_code, student:profiles!student_id(full_name, avatar_url)')
        .eq('institution_id', profile.id)
        .eq('class_section_id', selectedSection)
        .eq('academic_year_id', selectedYear)
        .eq('status', 'active')
      setStudents(stuData || [])

      // Load existing results
      const { data: resData } = await supabase
        .from('annual_student_results')
        .select('*')
        .eq('institution_id', profile.id)
        .eq('academic_year_id', selectedYear)
        .eq('class_section_id', selectedSection)
      const resMap: Record<string, any> = {}
      for (const r of resData || []) resMap[r.student_id] = r
      setResults(resMap)

      // Load annual averages per student per subject
      if (stuData?.length) {
        const { data: avgData } = await supabase
          .from('annual_subject_averages')
          .select('*, subject:academic_subjects(name, coefficient)')
          .eq('institution_id', profile.id)
          .eq('academic_year_id', selectedYear)
          .in('student_id', stuData.map(s => s.student_id))
        const avgMap: Record<string, any[]> = {}
        for (const a of avgData || []) {
          if (!avgMap[a.student_id]) avgMap[a.student_id] = []
          avgMap[a.student_id].push(a)
        }
        setAnnualAvgs(avgMap)
      }
    }
    load()
  }, [selectedSection, selectedYear])

  const calculateGeneralAverage = (studentId: string) => {
    const avgs = annualAvgs[studentId] || []
    if (!avgs.length) return null
    const totalCoeff = avgs.reduce((s, a) => s + (a.subject?.coefficient || 1), 0)
    const weighted   = avgs.reduce((s, a) => s + ((a.annual_average || 0) * (a.subject?.coefficient || 1)), 0)
    return totalCoeff > 0 ? Math.round((weighted / totalCoeff) * 100) / 100 : null
  }

  const getAutoDecision = (studentId: string, passingGrade = 10): string => {
    const avg = calculateGeneralAverage(studentId)
    if (avg === null) return 'pending'
    if (avg >= passingGrade) {
      if (avg >= 16) return 'honors'
      return 'promoted'
    }
    return 'repeating'
  }

  const getHonors = (avg: number | null) => {
    if (avg === null) return null
    return HONORS_CONFIG.find(h => avg >= h.min)?.value || null
  }

  const setDecision = (studentId: string, decision: string) => {
    setResults(r => ({ ...r, [studentId]: { ...(r[studentId] || {}), decision } }))
  }

  const saveResults = async () => {
    if (!profile || !selectedYear || !selectedSection) return
    setSaving(true)
    for (const student of students) {
      const sid  = student.student_id
      const avg  = calculateGeneralAverage(sid)
      const dec  = results[sid]?.decision || getAutoDecision(sid)
      const hon  = dec === 'honors' ? getHonors(avg) : null
      const rank = students
        .map(s => ({ id: s.student_id, avg: calculateGeneralAverage(s.student_id) || 0 }))
        .sort((a, b) => b.avg - a.avg)
        .findIndex(s => s.id === sid) + 1

      await supabase.from('annual_student_results').upsert({
        institution_id:   profile.id,
        academic_year_id: selectedYear,
        class_section_id: selectedSection,
        student_id:       sid,
        general_average:  avg,
        rank_in_class:    rank,
        total_in_class:   students.length,
        decision:         dec,
        honors:           hon,
      }, { onConflict: 'academic_year_id,student_id' })
    }
    toast.success('Résultats enregistrés !')
    setSaving(false)
  }

  const publishResults = async () => {
    if (!profile || !selectedYear || !selectedSection) return
    setPublishing(true)
    await supabase.from('annual_student_results')
      .update({ published_at: new Date().toISOString() })
      .eq('institution_id', profile.id)
      .eq('academic_year_id', selectedYear)
      .eq('class_section_id', selectedSection)
    toast.success('Résultats publiés ! Les élèves peuvent maintenant les consulter.')
    setPublishing(false)
  }

  const selectedSectionData = sections.find(s => s.id === selectedSection)
  const selectedYearData    = years.find(y => y.id === selectedYear)

  // Stats
  const promoted   = students.filter(s => ['promoted','honors','graduated'].includes(results[s.student_id]?.decision || getAutoDecision(s.student_id))).length
  const repeating  = students.filter(s => results[s.student_id]?.decision === 'repeating' || getAutoDecision(s.student_id) === 'repeating').length

  if (loading) return (
    <DashboardLayout navItems={navItems} title="Résultats" role="institution">
      <div className="flex justify-center py-16"><Spinner size="lg" /></div>
    </DashboardLayout>
  )

  return (
    <DashboardLayout navItems={navItems} title="Résultats & décisions" role="institution">
      <div className="max-w-4xl">
        <Link href="/dashboard/institution/academic"
          className="inline-flex items-center gap-1.5 text-xs text-text3 hover:text-text mb-6 transition-colors">
          <ArrowLeft size={12} /> Mode académique
        </Link>

        <div className="flex items-center justify-between mb-6 gap-4">
          <div>
            <h1 className="text-xl font-bold text-text">Résultats annuels & décisions</h1>
            <p className="text-text3 text-sm mt-0.5">Promu · Redoublant · Diplômé — calculé automatiquement</p>
          </div>
          <div className="flex gap-2">
            <button onClick={saveResults} disabled={saving || !selectedSection}
              className="flex items-center gap-2 text-sm bg-bg2 border border-border text-text px-4 py-2.5 rounded-xl hover:bg-card disabled:opacity-40 transition-colors font-medium">
              {saving ? <span className="w-4 h-4 border-2 border-text3 border-t-text rounded-full animate-spin" /> : <Save size={14} />}
              Enregistrer
            </button>
            <button onClick={publishResults} disabled={publishing || !selectedSection}
              className="flex items-center gap-2 text-sm text-white font-medium px-4 py-2.5 rounded-xl edha-gradient hover:opacity-90 disabled:opacity-40">
              {publishing ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <CheckCircle size={14} />}
              Publier aux élèves
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)}
            className="bg-bg2 border border-border rounded-xl px-4 py-2.5 text-sm text-text outline-none focus:border-blue/50">
            <option value="">Choisir une année...</option>
            {years.map(y => <option key={y.id} value={y.id}>{y.name}{y.is_current ? ' (en cours)' : ''}</option>)}
          </select>
          <select value={selectedSection} onChange={e => setSelectedSection(e.target.value)}
            className="bg-bg2 border border-border rounded-xl px-4 py-2.5 text-sm text-text outline-none focus:border-blue/50">
            <option value="">Choisir une section...</option>
            {sections.map(s => <option key={s.id} value={s.id}>{s.level?.name} — Section {s.name}</option>)}
          </select>
        </div>

        {/* Stats summary */}
        {students.length > 0 && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[
              { label: 'Total élèves', value: students.length, color: 'text-text', bg: 'bg-bg2' },
              { label: 'Promus', value: promoted, color: 'text-green', bg: 'bg-green/10' },
              { label: 'Redoublants', value: repeating, color: 'text-red', bg: 'bg-red/10' },
            ].map(({ label, value, color, bg }) => (
              <Card key={label} className="p-4 text-center">
                <div className={clsx('text-2xl font-bold', color)}>{value}</div>
                <div className="text-xs text-text3 mt-0.5">{label}</div>
              </Card>
            ))}
          </div>
        )}

        {/* Results table */}
        {students.length === 0 ? (
          <Card className="p-10 text-center">
            <BarChart2 size={28} className="text-text3 mx-auto mb-3" />
            <p className="text-sm text-text2">Sélectionnez une année et une section pour voir les résultats</p>
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <div className="px-5 py-4 border-b border-border bg-bg2">
              <p className="font-semibold text-text text-sm">
                {selectedSectionData?.level?.name} — Section {selectedSectionData?.name}
                {selectedYearData && ` · ${selectedYearData.name}`}
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-bg2/50">
                  <tr>
                    <th className="text-left text-xs font-semibold text-text3 px-4 py-3">Rang</th>
                    <th className="text-left text-xs font-semibold text-text3 px-4 py-3">Élève</th>
                    <th className="text-center text-xs font-semibold text-text3 px-4 py-3">Moy. annuelle</th>
                    <th className="text-center text-xs font-semibold text-text3 px-4 py-3">Matières échouées</th>
                    <th className="text-center text-xs font-semibold text-text3 px-4 py-3">Décision</th>
                    <th className="text-center text-xs font-semibold text-text3 px-4 py-3">Modifier</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {[...students]
                    .sort((a, b) => (calculateGeneralAverage(b.student_id) || 0) - (calculateGeneralAverage(a.student_id) || 0))
                    .map((s: any, idx: number) => {
                      const avg      = calculateGeneralAverage(s.student_id)
                      const decision = results[s.student_id]?.decision || getAutoDecision(s.student_id)
                      const dc       = DECISION_CONFIG[decision] || DECISION_CONFIG.pending
                      const DIcon    = dc.icon
                      const avgs     = annualAvgs[s.student_id] || []
                      const failed   = avgs.filter(a => (a.annual_average || 0) < 10)
                      const honors   = avg !== null && avg >= 10 ? getHonors(avg) : null

                      return (
                        <tr key={s.student_id} className={clsx('hover:bg-bg2 transition-colors',
                          decision === 'promoted' || decision === 'honors' ? 'bg-green/5' :
                          decision === 'repeating' ? 'bg-red/5' : '')}>
                          <td className="px-4 py-3">
                            <span className={clsx(
                              'text-sm font-bold tabular-nums w-7 h-7 rounded-full flex items-center justify-center',
                              idx === 0 ? 'bg-yellow/20 text-yellow' :
                              idx === 1 ? 'bg-gray-200 text-gray-600' :
                              idx === 2 ? 'bg-orange-100 text-orange-600' :
                              'text-text3'
                            )}>
                              {idx + 1}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-sm font-medium text-text">{s.student?.full_name}</p>
                            {s.student_code && <p className="text-[10px] text-text3">{s.student_code}</p>}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {avg !== null ? (
                              <div>
                                <span className={clsx('text-sm font-bold tabular-nums',
                                  avg >= 10 ? 'text-green' : 'text-red')}>
                                  {avg.toFixed(2)}/20
                                </span>
                                {honors && (
                                  <p className="text-[10px] text-blue font-medium">{honors}</p>
                                )}
                              </div>
                            ) : <span className="text-text3 text-sm">—</span>}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {failed.length > 0 ? (
                              <div className="text-xs text-red">
                                {failed.map((f: any) => f.subject?.name).join(', ')}
                              </div>
                            ) : (
                              <span className="text-xs text-green">Toutes validées</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={clsx(
                              'inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-full',
                              dc.bg, dc.color
                            )}>
                              <DIcon size={11} /> {dc.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <select value={decision}
                              onChange={e => setDecision(s.student_id, e.target.value)}
                              className="bg-bg2 border border-border rounded-lg px-2 py-1 text-xs text-text outline-none focus:border-blue/50">
                              {Object.entries(DECISION_CONFIG).map(([k, v]) => (
                                <option key={k} value={k}>{v.label}</option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}