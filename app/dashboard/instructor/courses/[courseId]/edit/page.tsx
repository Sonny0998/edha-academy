'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { createBrowserClient } from '@/lib/supabase/browser'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { Card, Button, Input, Spinner, Badge } from '@/components/ui'
import QuizBuilder, { type QuizQuestion } from '@/components/dashboard/QuizBuilder'
import ScheduleSettings from '@/components/dashboard/ScheduleSettings'
import { useRouter, useParams } from 'next/navigation'
import { BookOpen, LayoutDashboard, BarChart2, User, ArrowLeft, Plus, Trash2, Save, Send, FileText, Upload } from 'lucide-react'
import toast from 'react-hot-toast'

const navItems = [
  { label: 'Tableau de bord', href: '/dashboard/instructor', icon: <LayoutDashboard size={16} /> },
  { label: 'Mes cours', href: '/dashboard/instructor/courses', icon: <BookOpen size={16} /> },
  { label: 'Analytiques', href: '/dashboard/instructor/analytics', icon: <BarChart2 size={16} /> },
  { label: 'Mon profil', href: '/dashboard/instructor/profile', icon: <User size={16} /> },
]

export default function EditCoursePage() {
  const { profile } = useAuth()
  const [lessonQuestions, setLessonQuestions] = useState<Record<string, any[]>>({})
  const supabase = createBrowserClient()
  const router = useRouter()
  const params = useParams()
  const courseId = params.courseId as string
  const [expandedQuizLesson, setExpandedQuizLesson] = useState<string | null>(null)
  const [course, setCourse] = useState<any>(null)
  const [categories, setCategories] = useState<any[]>([])
  const [modules, setModules] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'info' | 'content' | 'pricing'>('info')
  const [form, setForm] = useState({

    
    title: '', subtitle: '', description: '', category_id: '', language: 'fr', level: 'debutant',
    thumbnail_url: '', pricing_model: 'free', price: '', tags: '', requirements: '', what_you_learn: ''
  })

  // Auto-save draft to localStorage
  useEffect(() => {
    if (!courseId || loading) return
    const draft = localStorage.getItem(`edha_draft_${courseId}`)
    if (draft) {
      try {
        const parsed = JSON.parse(draft)
        // Only restore if newer than 5 minutes ago
        if (Date.now() - parsed.savedAt < 5 * 60 * 1000) {
          toast('📝 Brouillon restauré', { icon: '💾', duration: 3000 })
          if (parsed.form) setForm(f => ({ ...f, ...parsed.form }))
        }
      } catch {}
    }
  }, [courseId, loading])

  // Save draft every 30 seconds
  useEffect(() => {
    if (!courseId || loading) return
    const interval = setInterval(() => {
      localStorage.setItem(`edha_draft_${courseId}`, JSON.stringify({
        form,
        savedAt: Date.now(),
      }))
    }, 30000)
    return () => clearInterval(interval)
  }, [courseId, form, loading])

  useEffect(() => {
    const load = async () => {
      const [catRes, courseRes, modRes] = await Promise.all([
        supabase.from('categories').select('*').order('name'),
        supabase.from('courses').select('*').eq('id', courseId).single(),
        supabase.from('modules').select('*,lessons:lessons(*)').eq('course_id', courseId).order('order_num'),
      ])
      setCategories(catRes.data || [])
      if (courseRes.data) {
        const c = courseRes.data
        setCourse(c)
        setForm({
          title: c.title || '', subtitle: c.subtitle || '', description: c.description || '',
          category_id: c.category_id || '', language: c.language || 'fr', level: c.level || 'debutant',
          thumbnail_url: c.thumbnail_url || '', pricing_model: c.pricing_model || 'free',
          price: c.price ? String(c.price) : '', tags: (c.tags || []).join(', '),
          requirements: (c.requirements || []).join('\n'), what_you_learn: (c.what_you_learn || []).join('\n'),
        })
      }
      const mods = (modRes.data || []).map((m: any) => ({
        ...m,
        lessons: (m.lessons || []).sort((a: any, b: any) => a.order_num - b.order_num)
      }))
      setModules(mods)

      // Load existing quiz questions for quiz lessons
      const quizLessons = mods.flatMap((m: any) => (m.lessons || []).filter((l: any) => l.content_type === 'quiz'))
      if (quizLessons.length > 0) {
        const qMap: Record<string, any[]> = {}
        for (const lesson of quizLessons) {
          const { data: qs } = await supabase.from('quiz_questions').select('*').eq('lesson_id', lesson.id).order('order_num')
          if (qs && qs.length > 0) {
            qMap[lesson.id] = qs.map((q: any) => ({
              id: q.id,
              type: q.type,
              question: q.question,
              options: q.options,
              explanation: q.explanation || '',
              points: q.points,
              order_num: q.order_num,
            }))
          }
        }
        setLessonQuestions(qMap)
      }

      setLoading(false)
    }
    load()
  }, [courseId])

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const save = async (submit = false) => {
    if (!form.title) { toast.error('Titre requis'); return }
    setSaving(true)

    const newStatus = submit ? 'review' : (course?.status === 'published' ? 'published' : 'draft')
    const { error } = await supabase.from('courses').update({
      title: form.title, subtitle: form.subtitle, description: form.description,
      category_id: form.category_id || null, language: form.language, level: form.level,
      thumbnail_url: form.thumbnail_url || null, pricing_model: form.pricing_model,
      price: form.price ? parseFloat(form.price) : null,
      tags: form.tags ? form.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [],
      requirements: form.requirements ? form.requirements.split('\n').filter(Boolean) : [],
      what_you_learn: form.what_you_learn ? form.what_you_learn.split('\n').filter(Boolean) : [],
      status: newStatus,
    }).eq('id', courseId)

    if (error) toast.error('Erreur lors de la sauvegarde')
    else {
      toast.success(submit ? 'Cours soumis pour révision !' : 'Cours sauvegardé !')
      localStorage.removeItem(`edha_draft_${courseId}`)
    }
    setSaving(false)
  }

  const addModule = async () => {
    const { data } = await supabase.from('modules').insert({ course_id: courseId, title: `Module ${modules.length + 1}`, order_num: modules.length + 1 }).select().single()
    if (data) setModules(m => [...m, { ...data, lessons: [] }])
  }

  const addLesson = async (moduleId: string) => {
    const mod = modules.find(m => m.id === moduleId)
    if (!mod) return
    const { data } = await supabase.from('lessons').insert({
      module_id: moduleId, course_id: courseId, title: `Leçon ${(mod.lessons?.length || 0) + 1}`,
      order_num: (mod.lessons?.length || 0) + 1, content_type: 'video', is_published: true, is_free_preview: false
    }).select().single()
    if (data) setModules(m => m.map(mod => mod.id === moduleId ? { ...mod, lessons: [...(mod.lessons || []), data] } : mod))
  }

  const updateLesson = async (lessonId: string, k: string, v: any) => {
    await supabase.from('lessons').update({ [k]: v }).eq('id', lessonId)
    setModules(m => m.map(mod => ({ ...mod, lessons: (mod.lessons || []).map((l: any) => l.id === lessonId ? { ...l, [k]: v } : l) })))
  }

  const deleteLesson = async (lessonId: string, moduleId: string) => {
    if (!confirm('Supprimer cette leçon ?')) return
    await supabase.from('lessons').delete().eq('id', lessonId)
    setModules(m => m.map(mod => mod.id === moduleId ? { ...mod, lessons: (mod.lessons || []).filter((l: any) => l.id !== lessonId) } : mod))
  }

  const deleteModule = async (moduleId: string) => {
    if (!confirm('Supprimer ce module et toutes ses leçons ?')) return
    await supabase.from('modules').delete().eq('id', moduleId)
    setModules(m => m.filter(mod => mod.id !== moduleId))
  }

  const saveQuizQuestions = async (lessonId: string, questions: any[]) => {
    await supabase.from('quiz_questions').delete().eq('lesson_id', lessonId)
    if (questions.length === 0) {
      setLessonQuestions(prev => ({ ...prev, [lessonId]: [] }))
      toast.success('Quiz vidé')
      return
    }
    const { data: saved, error } = await supabase.from('quiz_questions').insert(
      questions.map((q, i) => ({
        lesson_id: lessonId,
        question: q.question,
        type: q.type,
        options: q.options,
        explanation: q.explanation || '',
        points: q.points || 1,
        order_num: i + 1,
      }))
    ).select()
    if (error) {
      toast.error('Erreur sauvegarde quiz: ' + error.message)
    } else {
      // FIX: update local state so UI reflects saved count immediately
      setLessonQuestions(prev => ({ ...prev, [lessonId]: saved || questions }))
      // FIX: auto-publish lesson so students see the quiz
      await supabase.from('lessons').update({ is_published: true }).eq('id', lessonId)
      setModules(m => m.map(mod => ({
        ...mod,
        lessons: (mod.lessons || []).map((l: any) =>
          l.id === lessonId ? { ...l, is_published: true } : l
        )
      })))
      toast.success(`Quiz sauvegardé ✅ — ${(saved || questions).length} question(s)`)
    }
  }

  if (loading) return (
    <DashboardLayout navItems={navItems} title="Modifier le cours" role="instructor">
      <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>
    </DashboardLayout>
  )

  return (
    <DashboardLayout navItems={navItems} title="Modifier le cours" role="instructor">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => router.back()} className="text-text2 hover:text-text p-2 rounded-lg hover:bg-card2 transition-colors"><ArrowLeft size={18} /></button>
        <div>
          <h1 className="text-2xl font-bold text-text">Modifier le cours</h1>
          <p className="text-text3 text-xs mt-0.5 truncate">{course?.title}</p>
        </div>
        {course?.status && <Badge variant={course.status === 'published' ? 'green' : course.status === 'review' ? 'yellow' : 'default'}>{course.status}</Badge>}
      </div>

      <div className="flex gap-1 bg-card2 p-1 rounded-xl w-fit mb-6">
        {(['info', 'content', 'pricing'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`text-sm px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === tab ? 'bg-blue text-white' : 'text-text2 hover:text-text'}`}>
            {tab === 'info' ? 'Informations' : tab === 'content' ? 'Contenu' : 'Tarification'}
          </button>
        ))}
      </div>

      {activeTab === 'info' && (
        <Card className="p-6 space-y-5">
          <Input label="Titre *" value={form.title} onChange={e => set('title', e.target.value)} />
          <Input label="Sous-titre" value={form.subtitle} onChange={e => set('subtitle', e.target.value)} />
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-text2">Description</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={5}
              className="w-full bg-card2 border border-border rounded-xl px-4 py-3 text-sm text-text outline-none focus:border-blue transition-colors resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-text2">Catégorie</label>
              <select value={form.category_id} onChange={e => set('category_id', e.target.value)} className="w-full bg-card2 border border-border rounded-xl px-4 py-2.5 text-sm text-text outline-none focus:border-blue">
                <option value="">Sélectionner...</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-text2">Niveau</label>
              <select value={form.level} onChange={e => set('level', e.target.value)} className="w-full bg-card2 border border-border rounded-xl px-4 py-2.5 text-sm text-text outline-none focus:border-blue">
                <option value="debutant">Débutant</option>
                <option value="intermediaire">Intermédiaire</option>
                <option value="avance">Avancé</option>
              </select>
            </div>
          </div>
          <Input label="URL de la vignette" value={form.thumbnail_url} onChange={e => set('thumbnail_url', e.target.value)} placeholder="https://..." />
          <Input label="Tags (virgule)" value={form.tags} onChange={e => set('tags', e.target.value)} />
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-text2">Prérequis (un par ligne)</label>
            <textarea value={form.requirements} onChange={e => set('requirements', e.target.value)} rows={3} className="w-full bg-card2 border border-border rounded-xl px-4 py-3 text-sm text-text outline-none focus:border-blue resize-none" />
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-text2">Ce que l'étudiant apprendra (un par ligne)</label>
            <textarea value={form.what_you_learn} onChange={e => set('what_you_learn', e.target.value)} rows={3} className="w-full bg-card2 border border-border rounded-xl px-4 py-3 text-sm text-text outline-none focus:border-blue resize-none" />
          </div>
          <Button onClick={() => save(false)} loading={saving}><Save size={15} /> Sauvegarder</Button>
        </Card>
      )}

      {activeTab === 'content' && (
        <div className="space-y-4">
          {modules.map((mod, mi) => (
            <Card key={mod.id} className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <input value={mod.title} onChange={e => setModules(m => m.map((mm, i) => i === mi ? { ...mm, title: e.target.value } : mm))}
                  onBlur={() => supabase.from('modules').update({ title: mod.title }).eq('id', mod.id)}
                  className="flex-1 bg-card2 border border-border rounded-xl px-3 py-2 text-sm text-text outline-none focus:border-blue" />
                <button onClick={() => deleteModule(mod.id)} className="p-2 text-red hover:bg-red/10 rounded-lg"><Trash2 size={15} /></button>
              </div>
              <div className="space-y-3 ml-4">
                {(mod.lessons || []).map((lesson: any, li: number) => (
                  <div key={lesson.id} className="bg-card2 rounded-xl p-4 border border-border">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs text-text3 w-16 flex-shrink-0">Leçon {li + 1}</span>
                      <input value={lesson.title} onChange={e => setModules(m => m.map(mm => ({ ...mm, lessons: (mm.lessons || []).map((l: any) => l.id === lesson.id ? { ...l, title: e.target.value } : l) })))}
                        onBlur={() => updateLesson(lesson.id, 'title', lesson.title)}
                        className="flex-1 bg-card border border-border rounded-lg px-3 py-1.5 text-sm text-text outline-none focus:border-blue" />
                      <select value={lesson.content_type} onChange={e => updateLesson(lesson.id, 'content_type', e.target.value)}
                        className="bg-card border border-border rounded-lg px-2 py-1.5 text-xs text-text outline-none">
                        <option value="video">Vidéo</option>
                        <option value="text">Texte</option>
                        <option value="quiz">Quiz</option>
                        <option value="assignment">Devoir</option>
                        <option value="exercise">Exercice</option>
                      </select>
                      <button onClick={() => deleteLesson(lesson.id, mod.id)} className="p-1.5 text-red hover:bg-red/10 rounded-lg"><Trash2 size={13} /></button>
                    </div>
                    {lesson.content_type === 'video' && (
                      <input value={lesson.video_url || ''} onChange={e => setModules(m => m.map(mm => ({ ...mm, lessons: (mm.lessons || []).map((l: any) => l.id === lesson.id ? { ...l, video_url: e.target.value } : l) })))}
                        onBlur={() => updateLesson(lesson.id, 'video_url', lesson.video_url)}
                        placeholder="URL YouTube/Vimeo" className="w-full bg-card border border-border rounded-lg px-3 py-1.5 text-sm text-text outline-none focus:border-blue" />
                    )}
                    {lesson.content_type === 'quiz' && (
                      <div className="mt-2 space-y-3">
                        <div
                          onClick={() => setExpandedQuizLesson(expandedQuizLesson === lesson.id ? null : lesson.id)}
                          className="w-full flex items-center gap-3 bg-blue/5 border border-blue/10 rounded-xl px-4 py-3 hover:bg-blue/10 transition-colors text-left cursor-pointer">
                          <span className="text-sm font-medium text-text">
                            🎯 Quiz — {(lessonQuestions[lesson.id] || []).length} question(s)
                          </span>
                          <span className="ml-auto text-xs text-blue">
                            {expandedQuizLesson === lesson.id ? 'Fermer ↑' : 'Éditer →'}
                          </span>
                        </div>
                        {expandedQuizLesson === lesson.id && (
                          <>
                            <QuizBuilder
                              questions={lessonQuestions[lesson.id] || []}
                              onChange={qs => setLessonQuestions(q => ({ ...q, [lesson.id]: qs }))}
                            />
                            <button
                              type="button"
                              onClick={() => saveQuizQuestions(lesson.id, lessonQuestions[lesson.id] || [])}
                              className="w-full flex items-center justify-center gap-2 bg-blue hover:bg-blue2 text-white text-sm py-2.5 rounded-xl transition-colors mt-2">
                              <Save size={14} /> Sauvegarder le quiz
                            </button>
                          </>
                        )}
                        <ScheduleSettings
                          type="quiz"
                          value={{
                            opens_at: lesson.opens_at || '',
                            due_at: lesson.due_at || '',
                            closes_at: lesson.closes_at || '',
                            time_limit_min: lesson.time_limit_min ?? null,
                            max_attempts: lesson.max_attempts ?? 1,
                            grading_method: lesson.grading_method ?? 'highest',
                            shuffle_questions: lesson.shuffle_questions ?? false,
                            show_answers_after: lesson.show_answers_after ?? true,
                            password: lesson.password || '',
                          }}
                          onChange={(schedule) => {
                            Object.entries(schedule).forEach(([k, v]) => {
                              updateLesson(lesson.id, k, v)
                            })
                          }}
                        />
                      </div>
                    )}
                    {lesson.content_type === 'text' && (
                      <textarea value={lesson.content_body || ''} onChange={e => setModules(m => m.map(mm => ({ ...mm, lessons: (mm.lessons || []).map((l: any) => l.id === lesson.id ? { ...l, content_body: e.target.value } : l) })))}
                        onBlur={() => updateLesson(lesson.id, 'content_body', lesson.content_body)}
                        rows={3} placeholder="Contenu..." className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-text outline-none focus:border-blue resize-none" />
                    )}

                    {/* ── ASSIGNMENT type ── */}
                    {lesson.content_type === 'assignment' && (
                      <div className="mt-2 space-y-3">
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-text2 flex items-center gap-1.5">
                            <FileText size={12} /> Consignes du devoir
                          </label>
                          <textarea
                            value={lesson.content_body || ''}
                            onChange={e => setModules(m => m.map(mm => ({ ...mm, lessons: (mm.lessons || []).map((l: any) => l.id === lesson.id ? { ...l, content_body: e.target.value } : l) })))}
                            onBlur={() => updateLesson(lesson.id, 'content_body', lesson.content_body)}
                            rows={4}
                            placeholder="Décrivez le devoir, ce que l'étudiant doit faire, les critères d'évaluation..."
                            className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-text outline-none focus:border-blue resize-none"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-text2">Type de remise accepté</label>
                          <div className="flex gap-2">
                            {[
                              { val: 'both', label: '📄 Texte + Fichier' },
                              { val: 'file', label: '📎 Fichier seulement' },
                              { val: 'text', label: '✏️ Texte seulement' },
                            ].map(({ val, label }) => (
                              <button key={val} type="button"
                                onClick={() => updateLesson(lesson.id, 'resources', [{ submission_type: val }])}
                                className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                                  (lesson.resources?.[0]?.submission_type || 'both') === val
                                    ? 'border-blue bg-blue/10 text-blue font-medium'
                                    : 'border-border text-text2 hover:border-blue/30'
                                }`}>{label}</button>
                            ))}
                          </div>
                        </div>
                        {/* FIX: was using duration_min (video duration field) for points — now uses max_points */}
                        <div className="flex items-center gap-3">
                          <label className="text-xs font-medium text-text2">Points maximum :</label>
                          <input type="number" min={0} max={100}
                            value={lesson.max_points ?? 100}
                            onChange={e => updateLesson(lesson.id, 'max_points', parseInt(e.target.value) || 100)}
                            className="w-20 bg-card border border-border rounded-lg px-3 py-1.5 text-sm text-text text-center outline-none focus:border-blue"
                          />
                          <span className="text-xs text-text3">pts</span>
                        </div>
                        <ScheduleSettings type="assignment"
                          value={{
                            opens_at: lesson.opens_at || '', due_at: lesson.due_at || '',
                            closes_at: lesson.closes_at || '', time_limit_min: lesson.time_limit_min ?? null,
                            max_attempts: lesson.max_attempts ?? 1, grading_method: lesson.grading_method ?? 'highest',
                            shuffle_questions: lesson.shuffle_questions ?? false,
                            show_answers_after: lesson.show_answers_after ?? true, password: lesson.password || '',
                          }}
                          onChange={(schedule) => { Object.entries(schedule).forEach(([k, v]) => updateLesson(lesson.id, k, v)) }}
                        />
                      </div>
                    )}

                    {/* ── EXERCISE type — FIX: was nested inside assignment block, never rendered ── */}
                    {lesson.content_type === 'exercise' && (
                      <div className="mt-2 space-y-3">
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-text2 flex items-center gap-1.5">
                            <FileText size={12} /> Énoncé de l&apos;exercice
                          </label>
                          <textarea
                            value={lesson.content_body || ''}
                            onChange={e => setModules(m => m.map(mm => ({ ...mm, lessons: (mm.lessons || []).map((l: any) => l.id === lesson.id ? { ...l, content_body: e.target.value } : l) })))}
                            onBlur={() => updateLesson(lesson.id, 'content_body', lesson.content_body)}
                            rows={4}
                            placeholder="Écrivez l'énoncé de l'exercice ici..."
                            className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-text outline-none focus:border-blue resize-none"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-text2 flex items-center gap-1.5">
                            <Upload size={12} /> Document PDF (optionnel)
                          </label>
                          <input
                            value={lesson.video_url || ''}
                            onChange={e => setModules(m => m.map(mm => ({ ...mm, lessons: (mm.lessons || []).map((l: any) => l.id === lesson.id ? { ...l, video_url: e.target.value } : l) })))}
                            onBlur={() => updateLesson(lesson.id, 'video_url', lesson.video_url)}
                            placeholder="URL du PDF (ex: https://...fichier.pdf)"
                            className="w-full bg-card border border-border rounded-lg px-3 py-1.5 text-sm text-text outline-none focus:border-blue"
                          />
                          <p className="text-xs text-text3">Les étudiants pourront télécharger ce document</p>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-text2">L&apos;étudiant répond par :</label>
                          <div className="flex gap-2">
                            {[
                              { val: 'both', label: '📄 Texte + Fichier' },
                              { val: 'file', label: '📎 Fichier PDF' },
                              { val: 'text', label: '✏️ Texte seulement' },
                            ].map(({ val, label }) => (
                              <button key={val} type="button"
                                onClick={() => updateLesson(lesson.id, 'resources', [{ submission_type: val }])}
                                className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                                  (lesson.resources?.[0]?.submission_type || 'both') === val
                                    ? 'border-blue bg-blue/10 text-blue font-medium'
                                    : 'border-border text-text2 hover:border-blue/30'
                                }`}>{label}</button>
                            ))}
                          </div>
                        </div>
                        <ScheduleSettings type="assignment"
                          value={{
                            opens_at: lesson.opens_at || '', due_at: lesson.due_at || '',
                            closes_at: lesson.closes_at || '', time_limit_min: lesson.time_limit_min ?? null,
                            max_attempts: lesson.max_attempts ?? 1, grading_method: lesson.grading_method ?? 'highest',
                            shuffle_questions: lesson.shuffle_questions ?? false,
                            show_answers_after: lesson.show_answers_after ?? true, password: lesson.password || '',
                          }}
                          onChange={(schedule) => { Object.entries(schedule).forEach(([k, v]) => updateLesson(lesson.id, k, v)) }}
                        />
                      </div>
                    )}
                    <label className="flex items-center gap-2 mt-2 cursor-pointer">
                      <input type="checkbox" checked={lesson.is_free_preview} onChange={e => updateLesson(lesson.id, 'is_free_preview', e.target.checked)} className="w-4 h-4 accent-blue" />
                      <span className="text-xs text-text2">Aperçu gratuit</span>
                    </label>
                  </div>
                ))}
                <button onClick={() => addLesson(mod.id)} className="flex items-center gap-1.5 text-xs text-blue hover:underline mt-1"><Plus size={12} /> Ajouter une leçon</button>
              </div>
            </Card>
          ))}
          <button onClick={addModule} className="w-full border-2 border-dashed border-border hover:border-blue/50 rounded-2xl py-4 flex items-center justify-center gap-2 text-sm text-text2 hover:text-blue transition-all">
            <Plus size={16} /> Ajouter un module
          </button>
        </div>
      )}

      {activeTab === 'pricing' && (
        <Card className="p-6 space-y-5">
          <h2 className="font-semibold text-text">Tarification</h2>
          <div className="grid grid-cols-3 gap-3">
            {[
              { val: 'free', label: 'Gratuit', desc: 'Accès libre' },
              { val: 'paid', label: 'Payant', desc: 'Paiement requis' },
              { val: 'certificate_only', label: 'Cert. payante', desc: 'Cours gratuit' },
            ].map(({ val, label, desc }) => (
              <button key={val} onClick={() => set('pricing_model', val)}
                className={`p-4 rounded-xl border text-left transition-all ${form.pricing_model === val ? 'border-blue bg-blue/10' : 'border-border hover:border-blue/30 bg-card2'}`}>
                <p className="font-medium text-sm text-text">{label}</p>
                <p className="text-xs text-text3 mt-1">{desc}</p>
              </button>
            ))}
          </div>
          {form.pricing_model !== 'free' && (
            <Input label="Prix (USD)" type="number" value={form.price} onChange={e => set('price', e.target.value)} />
          )}
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => save(false)} loading={saving}><Save size={15} /> Sauvegarder</Button>
            {course?.status === 'draft' && <Button onClick={() => save(true)} loading={saving}><Send size={15} /> Soumettre pour révision</Button>}
          </div>
        </Card>
      )}
    </DashboardLayout>
  )
}
