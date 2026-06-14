'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { createBrowserClient } from '@/lib/supabase/browser'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { Card, Spinner } from '@/components/ui'
import {
  LayoutDashboard, BookOpen, UserCheck, Users, BarChart2,
  Globe, Settings, GraduationCap, ClipboardList,
  ChevronDown, CheckCircle, AlertCircle, Save
} from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'

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

export default function GradesPage() {
  const { profile } = useAuth()
  const supabase = createBrowserClient()

  const [loading, setLoading] = useState(true)
  const [sections, setSections] = useState<any[]>([])
  const [periods, setPeriods] = useState<any[]>([])
  const [subjects, setSubjects] = useState<any[]>([])
  const [students, setStudents] = useState<any[]>([])

  const [selectedSection,  setSelectedSection]  = useState('')
  const [selectedPeriod,   setSelectedPeriod]   = useState('')
  const [selectedSubject,  setSelectedSubject]  = useState('')
  const [periodSubjectId,  setPeriodSubjectId]  = useState<string | null>(null)
  const [gradeType,        setGradeType]        = useState<'continuous' | 'exam'>('continuous')

  // Grade inputs keyed by student_id
  const [grades, setGrades] = useState<Record<string, string>>({})
  const [absents, setAbsents] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState(false)

  // Assessment metadata (for continuous)
  const [assessTitle, setAssessTitle] = useState('Devoir 1')
  const [assessType,  setAssessType]  = useState('devoir')

  useEffect(() => {
    if (!profile) return
    const load = async () => {
      const [secRes, perRes, subRes] = await Promise.all([
        supabase.from('class_sections').select('*, level:class_levels(name, academic_year_id)').eq('institution_id', profile.id),
        supabase.from('academic_periods').select('*').eq('institution_id', profile.id).order('order_num'),
        supabase.from('academic_subjects').select('*').eq('institution_id', profile.id).order('name'),
      ])
      setSections(secRes.data || [])
      setPeriods(perRes.data || [])
      setSubjects(subRes.data || [])
      setLoading(false)
    }
    load()
  }, [profile])

  // Load students when section changes
  useEffect(() => {
    if (!selectedSection || !profile) return
    const load = async () => {
      const { data } = await supabase
        .from('institutional_enrollments')
        .select('student_id, student:profiles!student_id(full_name, avatar_url)')
        .eq('institution_id', profile.id)
        .eq('class_section_id', selectedSection)
        .eq('status', 'active')
      setStudents(data || [])
      setGrades({})
      setAbsents({})
    }
    load()
  }, [selectedSection])

  // Find period_subject_id
  useEffect(() => {
    if (!selectedPeriod || !selectedSection || !selectedSubject || !profile) return
    const find = async () => {
      const { data } = await supabase
        .from('period_subjects')
        .select('id')
        .eq('institution_id', profile.id)
        .eq('academic_period_id', selectedPeriod)
        .eq('class_section_id', selectedSection)
        .eq('subject_id', selectedSubject)
        .maybeSingle()
      setPeriodSubjectId(data?.id || null)

      // Load existing grades if any
      if (data?.id) {
        if (gradeType === 'exam') {
          const { data: exams } = await supabase
            .from('period_exams')
            .select('student_id, score, is_absent')
            .eq('period_subject_id', data.id)
          const g: Record<string, string> = {}
          const a: Record<string, boolean> = {}
          for (const e of exams || []) {
            g[e.student_id] = e.score?.toString() || ''
            a[e.student_id] = e.is_absent || false
          }
          setGrades(g)
          setAbsents(a)
        }
      }
    }
    find()
  }, [selectedPeriod, selectedSection, selectedSubject, gradeType])

  const handleSave = async () => {
    if (!periodSubjectId || !profile) {
      toast.error('Matière non assignée à cette section/période. Allez dans Assignation d\'abord.')
      return
    }
    if (Object.keys(grades).length === 0) {
      toast.error('Entrez au moins une note')
      return
    }

    setSaving(true)
    let errors = 0

    for (const student of students) {
      const sid = student.student_id
      const rawGrade = grades[sid]
      if (!rawGrade && !absents[sid]) continue

      const score = rawGrade ? parseFloat(rawGrade) : null

      if (gradeType === 'exam') {
        const { error } = await supabase.from('period_exams').upsert({
          institution_id:    profile.id,
          period_subject_id: periodSubjectId,
          student_id:        sid,
          score:             absents[sid] ? null : score,
          max_score:         20,
          is_absent:         absents[sid] || false,
          graded_at:         new Date().toISOString().split('T')[0],
        }, { onConflict: 'period_subject_id,student_id' })
        if (error) errors++
      } else {
        const { error } = await supabase.from('continuous_assessments').insert({
          institution_id:    profile.id,
          period_subject_id: periodSubjectId,
          student_id:        sid,
          assessment_type:   assessType,
          title:             assessTitle,
          score:             score,
          max_score:         20,
          weight:            1,
          graded_at:         new Date().toISOString().split('T')[0],
        })
        if (error) errors++
      }

      // Recalculate period grade automatically
      if (!errors) {
        await supabase.rpc('calculate_period_grade', {
          p_period_subject_id: periodSubjectId,
          p_student_id: sid,
        })
      }
    }

    if (errors > 0) toast.error(`${errors} erreur(s) lors de la sauvegarde`)
    else toast.success(`Notes enregistrées et moyennes recalculées automatiquement !`)
    setSaving(false)
  }

  const selectedPeriodData = periods.find(p => p.id === selectedPeriod)
  const selectedSectionData = sections.find(s => s.id === selectedSection)
  const selectedSubjectData = subjects.find(s => s.id === selectedSubject)

  const passCount = students.filter(s => {
    const g = parseFloat(grades[s.student_id] || '0')
    return g >= 10
  }).length

  if (loading) return (
    <DashboardLayout navItems={navItems} title="Saisie des notes" role="institution">
      <div className="flex justify-center py-16"><Spinner size="lg" /></div>
    </DashboardLayout>
  )

  return (
    <DashboardLayout navItems={navItems} title="Saisie des notes" role="institution">
      <h1 className="text-xl font-bold text-text mb-6">Saisie des notes</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left: Filters */}
        <div className="space-y-4">
          <Card className="p-5 space-y-4">
            <h2 className="font-semibold text-text text-sm">Sélection</h2>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-text2">Section</label>
              <select value={selectedSection} onChange={e => setSelectedSection(e.target.value)}
                className="w-full bg-bg2 border border-border rounded-xl px-3 py-2.5 text-sm text-text outline-none focus:border-blue/50">
                <option value="">Choisir une section...</option>
                {sections.map(s => (
                  <option key={s.id} value={s.id}>{s.level?.name} — Section {s.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-text2">Période</label>
              <select value={selectedPeriod} onChange={e => setSelectedPeriod(e.target.value)}
                className="w-full bg-bg2 border border-border rounded-xl px-3 py-2.5 text-sm text-text outline-none focus:border-blue/50">
                <option value="">Choisir une période...</option>
                {periods.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-text2">Matière</label>
              <select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)}
                className="w-full bg-bg2 border border-border rounded-xl px-3 py-2.5 text-sm text-text outline-none focus:border-blue/50">
                <option value="">Choisir une matière...</option>
                {subjects.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            {/* Grade type */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-text2">Type de note</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'continuous', label: 'Continue', desc: 'Devoir, contrôle...' },
                  { value: 'exam',       label: 'Examen',   desc: 'Fin de période' },
                ].map(t => (
                  <button key={t.value} onClick={() => setGradeType(t.value as any)}
                    className={clsx('p-2.5 rounded-xl border text-left transition-all',
                      gradeType === t.value ? 'border-blue bg-blue/5' : 'border-border hover:border-blue/30')}>
                    <p className={clsx('text-xs font-semibold', gradeType === t.value ? 'text-blue' : 'text-text')}>{t.label}</p>
                    <p className="text-[10px] text-text3">{t.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Continuous assessment metadata */}
            {gradeType === 'continuous' && (
              <div className="space-y-3 border-t border-border pt-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-text2">Intitulé</label>
                  <input value={assessTitle} onChange={e => setAssessTitle(e.target.value)}
                    className="w-full bg-bg2 border border-border rounded-xl px-3 py-2 text-sm text-text outline-none focus:border-blue/50"
                    placeholder="ex: Devoir 1" />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-text2">Type</label>
                  <select value={assessType} onChange={e => setAssessType(e.target.value)}
                    className="w-full bg-bg2 border border-border rounded-xl px-3 py-2 text-sm text-text outline-none focus:border-blue/50">
                    {['devoir','controle','participation','projet','tp','oral'].map(t => (
                      <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </Card>

          {/* Status indicator */}
          {periodSubjectId === null && selectedSection && selectedPeriod && selectedSubject && (
            <div className="bg-yellow/5 border border-yellow/20 rounded-xl p-3 flex gap-2">
              <AlertCircle size={14} className="text-yellow flex-shrink-0 mt-0.5" />
              <p className="text-xs text-text2">
                Cette matière n&apos;est pas encore assignée à cette section. Allez dans <strong>Assignation</strong>.
              </p>
            </div>
          )}

          {periodSubjectId && (
            <div className="bg-green/5 border border-green/20 rounded-xl p-3 flex gap-2">
              <CheckCircle size={14} className="text-green flex-shrink-0 mt-0.5" />
              <p className="text-xs text-text2">Matière assignée — vous pouvez saisir les notes.</p>
            </div>
          )}
        </div>

        {/* Right: Grade table */}
        <div className="lg:col-span-2">
          {students.length === 0 ? (
            <Card className="p-12 text-center">
              <ClipboardList size={28} className="text-text3 mx-auto mb-3" />
              <p className="text-sm text-text2">Sélectionnez une section pour voir les élèves</p>
            </Card>
          ) : (
            <Card className="overflow-hidden">
              {/* Header */}
              <div className="px-5 py-4 border-b border-border bg-bg2 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-text text-sm">
                    {selectedSectionData ? `${selectedSectionData.level?.name} — Section ${selectedSectionData.name}` : 'Section'}
                    {selectedSubjectData && ` · ${selectedSubjectData.name}`}
                    {selectedPeriodData && ` · ${selectedPeriodData.name}`}
                  </p>
                  <p className="text-xs text-text3 mt-0.5">
                    {students.length} élèves · {passCount} au-dessus de la moyenne
                  </p>
                </div>
                <button onClick={handleSave} disabled={saving || !periodSubjectId}
                  className="flex items-center gap-2 text-sm text-white px-4 py-2 rounded-xl edha-gradient disabled:opacity-40 hover:opacity-90 transition-opacity font-medium">
                  {saving
                    ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <Save size={14} />}
                  Enregistrer
                </button>
              </div>

              {/* Grade table */}
              <table className="w-full">
                <thead className="bg-bg2/50">
                  <tr>
                    <th className="text-left text-xs font-semibold text-text3 px-5 py-3 w-8">#</th>
                    <th className="text-left text-xs font-semibold text-text3 px-5 py-3">Élève</th>
                    <th className="text-center text-xs font-semibold text-text3 px-5 py-3 w-28">Note /20</th>
                    {gradeType === 'exam' && (
                      <th className="text-center text-xs font-semibold text-text3 px-5 py-3 w-20">Absent</th>
                    )}
                    <th className="text-center text-xs font-semibold text-text3 px-5 py-3 w-16">État</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {students.map((s: any, idx: number) => {
                    const grade = parseFloat(grades[s.student_id] || '')
                    const isAbsent = absents[s.student_id] || false
                    const isPassing = !isNaN(grade) && grade >= 10
                    const isFailing = !isNaN(grade) && grade < 10
                    return (
                      <tr key={s.student_id} className={clsx(
                        'transition-colors',
                        isAbsent ? 'bg-yellow/5' :
                        isPassing ? 'hover:bg-green/5' :
                        isFailing ? 'hover:bg-red/5' :
                        'hover:bg-bg2'
                      )}>
                        <td className="px-5 py-3 text-xs text-text3">{idx + 1}</td>
                        <td className="px-5 py-3">
                          <p className="text-sm font-medium text-text">{s.student?.full_name}</p>
                        </td>
                        <td className="px-5 py-3">
                          <input
                            type="number" min="0" max="20" step="0.25"
                            value={grades[s.student_id] || ''}
                            disabled={isAbsent}
                            onChange={e => setGrades(g => ({ ...g, [s.student_id]: e.target.value }))}
                            className={clsx(
                              'w-full text-center rounded-lg px-2 py-1.5 text-sm font-mono outline-none border transition-colors',
                              isAbsent ? 'bg-bg2 text-text3 border-border cursor-not-allowed' :
                              isPassing ? 'border-green/30 bg-green/5 text-green focus:border-green' :
                              isFailing ? 'border-red/30 bg-red/5 text-red focus:border-red' :
                              'border-border bg-bg2 text-text focus:border-blue/50'
                            )}
                            placeholder="—"
                          />
                        </td>
                        {gradeType === 'exam' && (
                          <td className="px-5 py-3 text-center">
                            <input type="checkbox" checked={isAbsent}
                              onChange={e => setAbsents(a => ({ ...a, [s.student_id]: e.target.checked }))}
                              className="w-4 h-4 rounded" />
                          </td>
                        )}
                        <td className="px-5 py-3 text-center">
                          {isAbsent ? (
                            <span className="text-[10px] bg-yellow/10 text-yellow px-1.5 py-0.5 rounded-full">ABS</span>
                          ) : isPassing ? (
                            <span className="text-[10px] bg-green/10 text-green px-1.5 py-0.5 rounded-full">✓</span>
                          ) : isFailing ? (
                            <span className="text-[10px] bg-red/10 text-red px-1.5 py-0.5 rounded-full">✗</span>
                          ) : null}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}