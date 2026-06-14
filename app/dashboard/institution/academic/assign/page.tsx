'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { createBrowserClient } from '@/lib/supabase/browser'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { Card, Spinner } from '@/components/ui'
import {
  LayoutDashboard, BookOpen, UserCheck, Users, BarChart2,
  Globe, Settings, GraduationCap, ArrowLeft, ArrowRight,
  CheckCircle, X, Plus
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

export default function AssignPage() {
  const { profile } = useAuth()
  const supabase = createBrowserClient()

  const [loading, setLoading]   = useState(true)
  const [periods, setPeriods]   = useState<any[]>([])
  const [sections, setSections] = useState<any[]>([])
  const [subjects, setSubjects] = useState<any[]>([])
  const [teachers, setTeachers] = useState<any[]>([])
  const [assignments, setAssignments] = useState<any[]>([])
  const [courses, setCourses]   = useState<any[]>([])

  const [selectedPeriod,  setSelectedPeriod]  = useState('')
  const [selectedSection, setSelectedSection] = useState('')
  const [saving, setSaving] = useState(false)

  // New assignment form
  const [showAdd, setShowAdd] = useState(false)
  const [newSubject,  setNewSubject]  = useState('')
  const [newTeacher,  setNewTeacher]  = useState('')
  const [newCourse,   setNewCourse]   = useState('')
  const [contWeight,  setContWeight]  = useState('60')
  const [examWeight,  setExamWeight]  = useState('40')

  const load = async () => {
    if (!profile) return
    const [perRes, secRes, subRes, tchRes, assRes, crsRes] = await Promise.all([
      supabase.from('academic_periods').select('*, year:academic_years(name)').eq('institution_id', profile.id).order('order_num'),
      supabase.from('class_sections').select('*, level:class_levels(name)').eq('institution_id', profile.id),
      supabase.from('academic_subjects').select('*').eq('institution_id', profile.id).order('name'),
      supabase.from('profiles').select('id, full_name')
        .or(`role.eq.instructor,role.eq.institution`)
        .eq('institution_name', (profile as any).institution_name || 'x'),
      supabase.from('period_subjects')
        .select('*, subject:academic_subjects(name,color,coefficient), teacher:profiles!teacher_id(full_name), course:courses(title)')
        .eq('institution_id', profile.id),
      supabase.from('courses').select('id, title').eq('instructor_id', profile.id).eq('status', 'published'),
    ])
    setPeriods(perRes.data || [])
    setSections(secRes.data || [])
    setSubjects(subRes.data || [])
    setTeachers(tchRes.data || [])
    setAssignments(assRes.data || [])
    setCourses(crsRes.data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [profile])

  const filteredAssignments = assignments.filter(a =>
    (!selectedPeriod  || a.academic_period_id === selectedPeriod) &&
    (!selectedSection || a.class_section_id   === selectedSection)
  )

  const handleAdd = async () => {
    if (!profile || !selectedPeriod || !selectedSection || !newSubject) {
      toast.error('Sélectionnez période, section et matière')
      return
    }
    const total = parseInt(contWeight) + parseInt(examWeight)
    if (total !== 100) { toast.error('Les poids doivent totaliser 100%'); return }

    setSaving(true)
    const { error } = await supabase.from('period_subjects').upsert({
      institution_id:        profile.id,
      academic_period_id:    selectedPeriod,
      class_section_id:      selectedSection,
      subject_id:            newSubject,
      teacher_id:            newTeacher || null,
      course_id:             newCourse  || null,
      continuous_weight_pct: parseInt(contWeight),
      exam_weight_pct:       parseInt(examWeight),
    }, { onConflict: 'academic_period_id,class_section_id,subject_id' })

    if (error) toast.error(error.message)
    else {
      toast.success('Matière assignée !')
      setShowAdd(false)
      setNewSubject(''); setNewTeacher(''); setNewCourse('')
      load()
    }
    setSaving(false)
  }

  const handleRemove = async (id: string) => {
    if (!confirm('Retirer cette assignation ?')) return
    await supabase.from('period_subjects').delete().eq('id', id)
    toast.success('Assignation retirée')
    load()
  }

  if (loading) return (
    <DashboardLayout navItems={navItems} title="Assignation" role="institution">
      <div className="flex justify-center py-16"><Spinner size="lg" /></div>
    </DashboardLayout>
  )

  const selectedPeriodData  = periods.find(p => p.id === selectedPeriod)
  const selectedSectionData = sections.find(s => s.id === selectedSection)

  return (
    <DashboardLayout navItems={navItems} title="Assignation matières" role="institution">
      <div className="max-w-3xl">
        <Link href="/dashboard/institution/academic/subjects"
          className="inline-flex items-center gap-1.5 text-xs text-text3 hover:text-text mb-6 transition-colors">
          <ArrowLeft size={12} /> Matières
        </Link>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-text">Assignation des matières</h1>
            <p className="text-text3 text-sm mt-0.5">Quelle matière, dans quelle section, par quel professeur, avec quel poids d&apos;évaluation</p>
          </div>
          <button onClick={() => setShowAdd(!showAdd)}
            className="flex items-center gap-2 text-sm text-white font-medium px-4 py-2.5 rounded-xl edha-gradient hover:opacity-90">
            <Plus size={15} /> Assigner
          </button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <select value={selectedPeriod} onChange={e => setSelectedPeriod(e.target.value)}
            className="bg-bg2 border border-border rounded-xl px-4 py-2.5 text-sm text-text outline-none focus:border-blue/50">
            <option value="">Toutes les périodes</option>
            {periods.map(p => <option key={p.id} value={p.id}>{p.name} ({p.year?.name})</option>)}
          </select>
          <select value={selectedSection} onChange={e => setSelectedSection(e.target.value)}
            className="bg-bg2 border border-border rounded-xl px-4 py-2.5 text-sm text-text outline-none focus:border-blue/50">
            <option value="">Toutes les sections</option>
            {sections.map(s => <option key={s.id} value={s.id}>{s.level?.name} — Section {s.name}</option>)}
          </select>
        </div>

        {/* Add form */}
        {showAdd && (
          <Card className="p-5 mb-5 border-blue/20 bg-blue/5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-text">Nouvelle assignation</h3>
              <button onClick={() => setShowAdd(false)} className="text-text3 hover:text-text"><X size={16} /></button>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-text2">Période *</label>
                <select value={selectedPeriod} onChange={e => setSelectedPeriod(e.target.value)}
                  className="w-full bg-bg2 border border-border rounded-xl px-3 py-2 text-sm text-text outline-none focus:border-blue/50">
                  <option value="">Choisir...</option>
                  {periods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-text2">Section *</label>
                <select value={selectedSection} onChange={e => setSelectedSection(e.target.value)}
                  className="w-full bg-bg2 border border-border rounded-xl px-3 py-2 text-sm text-text outline-none focus:border-blue/50">
                  <option value="">Choisir...</option>
                  {sections.map(s => <option key={s.id} value={s.id}>{s.level?.name} — {s.name}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-text2">Matière *</label>
                <select value={newSubject} onChange={e => setNewSubject(e.target.value)}
                  className="w-full bg-bg2 border border-border rounded-xl px-3 py-2 text-sm text-text outline-none focus:border-blue/50">
                  <option value="">Choisir...</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-text2">Professeur</label>
                <select value={newTeacher} onChange={e => setNewTeacher(e.target.value)}
                  className="w-full bg-bg2 border border-border rounded-xl px-3 py-2 text-sm text-text outline-none focus:border-blue/50">
                  <option value="">Non assigné</option>
                  {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                </select>
              </div>
            </div>

            {/* Weights */}
            <div className="bg-white border border-border rounded-xl p-3 mb-3">
              <p className="text-xs font-semibold text-text mb-2">Pondération des notes</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs text-text3">Notes continues</label>
                  <div className="flex items-center gap-2">
                    <input type="range" min="0" max="100" step="10" value={contWeight}
                      onChange={e => { setContWeight(e.target.value); setExamWeight(String(100 - parseInt(e.target.value))) }}
                      className="flex-1" />
                    <span className="text-sm font-bold text-text w-12 text-right">{contWeight}%</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="block text-xs text-text3">Examen de fin de période</label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-bg2 rounded-full overflow-hidden">
                      <div className="h-full bg-blue rounded-full" style={{ width: `${examWeight}%` }} />
                    </div>
                    <span className="text-sm font-bold text-blue w-12 text-right">{examWeight}%</span>
                  </div>
                </div>
              </div>
            </div>

            {courses.length > 0 && (
              <div className="space-y-1.5 mb-3">
                <label className="block text-xs font-medium text-text2">Cours EDHA lié (optionnel)</label>
                <select value={newCourse} onChange={e => setNewCourse(e.target.value)}
                  className="w-full bg-bg2 border border-border rounded-xl px-3 py-2 text-sm text-text outline-none focus:border-blue/50">
                  <option value="">Aucun cours lié</option>
                  {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
              </div>
            )}

            <button onClick={handleAdd} disabled={saving}
              className="w-full py-2.5 edha-gradient text-white rounded-xl text-sm font-medium disabled:opacity-50 hover:opacity-90 transition-opacity">
              {saving ? 'Assignation...' : 'Confirmer l\'assignation'}
            </button>
          </Card>
        )}

        {/* Assignments list */}
        {filteredAssignments.length === 0 ? (
          <Card className="p-10 text-center">
            <p className="text-text3 text-sm">Aucune assignation pour ce filtre.</p>
            <p className="text-xs text-text3 mt-1">Utilisez le bouton "Assigner" pour lier des matières aux sections.</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {filteredAssignments.map((a: any) => (
              <Card key={a.id} className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-10 rounded-full flex-shrink-0"
                    style={{ backgroundColor: a.subject?.color || '#4f6ef7' }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-text text-sm">{a.subject?.name}</p>
                      <span className="text-xs text-text3">·</span>
                      <p className="text-xs text-text3">{a.teacher?.full_name || 'Prof. non assigné'}</p>
                      {a.course && <span className="text-[10px] bg-blue/10 text-blue px-2 py-0.5 rounded-full">{a.course.title}</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[10px] text-text3">
                        Continue {a.continuous_weight_pct}% · Examen {a.exam_weight_pct}%
                      </span>
                      <span className="text-[10px] text-text3">Coeff. {a.subject?.coefficient}</span>
                    </div>
                  </div>
                  <button onClick={() => handleRemove(a.id)}
                    className="w-7 h-7 hover:bg-red/10 rounded-lg flex items-center justify-center text-text3 hover:text-red transition-all flex-shrink-0">
                    <X size={12} />
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}

        {assignments.length > 0 && (
          <div className="flex justify-end mt-6">
            <Link href="/dashboard/institution/academic/enroll"
              className="flex items-center gap-1.5 text-sm text-blue hover:underline font-medium">
              Suivant : Inscrire les élèves <ArrowRight size={14} />
            </Link>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}