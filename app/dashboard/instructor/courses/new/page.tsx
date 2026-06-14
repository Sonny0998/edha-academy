'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { createBrowserClient } from '@/lib/supabase/browser'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { Card, Button, Input, Spinner } from '@/components/ui'
import QuizBuilder, { type QuizQuestion } from '@/components/dashboard/QuizBuilder'
import ScheduleSettings, { defaultSchedule, type Schedule } from '@/components/dashboard/ScheduleSettings'
import { useRouter } from 'next/navigation'
import {
  BookOpen, LayoutDashboard, BarChart2, User, MessageSquare, Megaphone,
  ArrowLeft, Plus, Trash2, Save, Send, Video, FileText, HelpCircle, ChevronDown, ChevronRight
} from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const navItems = [
  { label: 'Tableau de bord', href: '/dashboard/instructor',            icon: <LayoutDashboard size={16} /> },
  { label: 'Mes cours',       href: '/dashboard/instructor/courses',     icon: <BookOpen size={16} /> },
  { label: 'Messages Q&A',   href: '/dashboard/instructor/messages',    icon: <MessageSquare size={16} /> },
  { label: 'Annonces',       href: '/dashboard/instructor/announcements',icon: <Megaphone size={16} /> },
  { label: 'Analytiques',    href: '/dashboard/instructor/analytics',   icon: <BarChart2 size={16} /> },
  { label: 'Mon profil',     href: '/dashboard/instructor/profile',     icon: <User size={16} /> },
]

function slugify(str: string) {
  return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')
}

type Lesson = {
  title: string
  content_type: 'video' | 'text' | 'quiz'
  video_url: string
  content_body: string
  is_free_preview: boolean
  quiz_questions: QuizQuestion[]
  quiz_passing_score: number
  schedule: Schedule
}

type Module = {
  title: string
  expanded: boolean
  lessons: Lesson[]
}

function newLesson(n: number): Lesson {
  return { title: `Leçon ${n}`, content_type: 'video', video_url: '', content_body: '', is_free_preview: false, quiz_questions: [], quiz_passing_score: 70, schedule: defaultSchedule() }
}

const TYPE_ICONS = {
  video: <Video size={13} />,
  text:  <FileText size={13} />,
  quiz:  <HelpCircle size={13} />,
}
const TYPE_LABELS = { video: 'Vidéo', text: 'Texte', quiz: 'Quiz' }

export default function NewCoursePage() {
  const { profile } = useAuth()
  const supabase = createBrowserClient()
  const router = useRouter()
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'info' | 'content' | 'pricing'>('info')
  const [expandedLesson, setExpandedLesson] = useState<string | null>(null)

  const [form, setForm] = useState({
    title: '', subtitle: '', description: '', category_id: '', language: 'fr', level: 'debutant',
    thumbnail_url: '', pricing_model: 'free', price: '', tags: '', requirements: '', what_you_learn: ''
  })

  const [modules, setModules] = useState<Module[]>([
    { title: 'Module 1', expanded: true, lessons: [newLesson(1)] }
  ])

  useEffect(() => {
    supabase.from('categories').select('*').order('name').then(({ data }) => setCategories(data || []))
  }, [])

  const setf = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  // Module helpers
  const addModule = () => setModules(m => [...m, { title: `Module ${m.length + 1}`, expanded: true, lessons: [newLesson(1)] }])
  const removeModule = (mi: number) => { if (modules.length === 1) return; setModules(m => m.filter((_, i) => i !== mi)) }
  const setModTitle = (mi: number, v: string) => setModules(m => m.map((mod, i) => i === mi ? { ...mod, title: v } : mod))
  const toggleMod = (mi: number) => setModules(m => m.map((mod, i) => i === mi ? { ...mod, expanded: !mod.expanded } : mod))

  // Lesson helpers
  const addLesson = (mi: number) => setModules(m => m.map((mod, i) => i === mi ? { ...mod, lessons: [...mod.lessons, newLesson(mod.lessons.length + 1)] } : mod))
  const removeLesson = (mi: number, li: number) => setModules(m => m.map((mod, i) => i === mi ? { ...mod, lessons: mod.lessons.filter((_, j) => j !== li) } : mod))
  const setLesson = (mi: number, li: number, patch: Partial<Lesson>) => setModules(m => m.map((mod, i) => i === mi ? { ...mod, lessons: mod.lessons.map((l, j) => j === li ? { ...l, ...patch } : l) } : mod))

  const save = async (submit = false) => {
    if (!form.title.trim()) { toast.error('Le titre est requis'); return }
    if (!profile) return

    // Validate quizzes
    for (let mi = 0; mi < modules.length; mi++) {
      for (let li = 0; li < modules[mi].lessons.length; li++) {
        const lesson = modules[mi].lessons[li]
        if (lesson.content_type === 'quiz' && lesson.quiz_questions.length === 0) {
          toast.error(`Module ${mi+1}, Leçon ${li+1} : ajoutez au moins une question au quiz`)
          setActiveTab('content')
          return
        }
        if (lesson.content_type === 'quiz') {
          for (const q of lesson.quiz_questions) {
            if (!q.question.trim()) {
              toast.error(`Une question du quiz est vide (Module ${mi+1}, Leçon ${li+1})`)
              setActiveTab('content')
              return
            }
          }
        }
      }
    }

    setLoading(true)
    const slug = slugify(form.title) + '-' + Date.now()
    const { data: courseData, error } = await supabase.from('courses').insert({
      instructor_id: profile.id,
      title: form.title, slug, subtitle: form.subtitle, description: form.description,
      category_id: form.category_id || null, language: form.language, level: form.level,
      thumbnail_url: form.thumbnail_url || null, pricing_model: form.pricing_model,
      price: form.price ? parseFloat(form.price) : null,
      tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      requirements: form.requirements ? form.requirements.split('\n').filter(Boolean) : [],
      what_you_learn: form.what_you_learn ? form.what_you_learn.split('\n').filter(Boolean) : [],
      status: submit ? 'review' : 'draft',
    }).select().single()

    if (error || !courseData) { toast.error('Erreur lors de la création'); setLoading(false); return }

    for (let mi = 0; mi < modules.length; mi++) {
      const mod = modules[mi]
      const { data: modData } = await supabase.from('modules').insert({
        course_id: courseData.id, title: mod.title, order_num: mi + 1
      }).select().single()

      if (modData) {
        for (let li = 0; li < mod.lessons.length; li++) {
          const lesson = mod.lessons[li]
          const { data: lessonData } = await supabase.from('lessons').insert({
            module_id: modData.id, course_id: courseData.id,
            title: lesson.title, order_num: li + 1,
            content_type: lesson.content_type,
            video_url: lesson.video_url || null,
            content_body: lesson.content_type === 'quiz'
              ? JSON.stringify({ passing_score: lesson.quiz_passing_score })
              : lesson.content_body || null,
            is_free_preview: lesson.is_free_preview,
            is_published: true,
          }).select().single()

          // Save schedule settings to lesson
          if (lessonData && (lesson.schedule.opens_at || lesson.schedule.due_at || lesson.schedule.closes_at || lesson.schedule.time_limit_min)) {
            await supabase.from('lessons').update({
              opens_at: lesson.schedule.opens_at || null,
              due_at: lesson.schedule.due_at || null,
              closes_at: lesson.schedule.closes_at || null,
              time_limit_min: lesson.schedule.time_limit_min,
              max_attempts: lesson.schedule.max_attempts,
              grading_method: lesson.schedule.grading_method,
              shuffle_questions: lesson.schedule.shuffle_questions,
              show_answers_after: lesson.schedule.show_answers_after,
              password: lesson.schedule.password || null,
            }).eq('id', lessonData.id)
          }

          // Save quiz questions
          if (lessonData && lesson.content_type === 'quiz' && lesson.quiz_questions.length > 0) {
            const qData = lesson.quiz_questions.map((q, qi) => ({
              lesson_id: lessonData.id,
              question: q.question,
              type: q.type,
              options: q.options,
              explanation: q.explanation || null,
              points: q.points,
              order_num: qi + 1,
            }))
            await supabase.from('quiz_questions').insert(qData)
          }
        }
      }
    }

    toast.success(submit ? 'Cours soumis pour révision !' : 'Cours sauvegardé comme brouillon !')
    router.push('/dashboard/instructor/courses')
    setLoading(false)
  }

  return (
    <DashboardLayout navItems={navItems} title="Nouveau cours" role="instructor">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => router.back()} className="text-text2 hover:text-text p-2 rounded-lg hover:bg-card2 transition-colors">
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-2xl font-bold text-text">Créer un nouveau cours</h1>
      </div>

      {/* Step tabs */}
      <div className="flex gap-1 bg-card2 p-1 rounded-xl w-fit mb-6">
        {([['info','1. Informations'], ['content','2. Contenu'], ['pricing','3. Tarification']] as const).map(([tab, label]) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={clsx('text-sm px-4 py-2 rounded-lg font-medium transition-all', activeTab === tab ? 'edha-gradient text-white shadow-sm' : 'text-text2 hover:text-text')}>
            {label}
          </button>
        ))}
      </div>

      {/* ── TAB 1: Informations ── */}
      {activeTab === 'info' && (
        <Card className="p-6 space-y-5">
          <h2 className="font-semibold text-text">Informations générales</h2>

          <Input label="Titre du cours *" value={form.title} onChange={e => setf('title', e.target.value)} placeholder="Ex: Introduction à JavaScript" />
          <Input label="Sous-titre" value={form.subtitle} onChange={e => setf('subtitle', e.target.value)} placeholder="Une description courte et accrocheuse" />

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-text2">Description complète</label>
            <textarea value={form.description} onChange={e => setf('description', e.target.value)} rows={4} placeholder="Décrivez votre cours en détail..."
              className="w-full bg-card2 border border-border rounded-xl px-4 py-3 text-sm text-text outline-none focus:border-blue transition-colors resize-none" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-text2">Catégorie</label>
              <select value={form.category_id} onChange={e => setf('category_id', e.target.value)}
                className="w-full bg-card2 border border-border rounded-xl px-4 py-2.5 text-sm text-text outline-none focus:border-blue">
                <option value="">Sélectionner...</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-text2">Niveau</label>
              <select value={form.level} onChange={e => setf('level', e.target.value)}
                className="w-full bg-card2 border border-border rounded-xl px-4 py-2.5 text-sm text-text outline-none focus:border-blue">
                <option value="debutant">Débutant</option>
                <option value="intermediaire">Intermédiaire</option>
                <option value="avance">Avancé</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-text2">Langue</label>
              <select value={form.language} onChange={e => setf('language', e.target.value)}
                className="w-full bg-card2 border border-border rounded-xl px-4 py-2.5 text-sm text-text outline-none focus:border-blue">
                <option value="fr">Français</option>
                <option value="ht">Créole haïtien</option>
                <option value="en">English</option>
              </select>
            </div>
            <Input label="URL vignette (image du cours)" value={form.thumbnail_url} onChange={e => setf('thumbnail_url', e.target.value)} placeholder="https://..." />
          </div>

          <Input label="Tags (séparés par virgule)" value={form.tags} onChange={e => setf('tags', e.target.value)} placeholder="javascript, web, débutant" />

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-text2">Prérequis (un par ligne)</label>
            <textarea value={form.requirements} onChange={e => setf('requirements', e.target.value)} rows={3}
              placeholder="Connaissance de base de l'informatique&#10;Un ordinateur avec internet"
              className="w-full bg-card2 border border-border rounded-xl px-4 py-3 text-sm text-text outline-none focus:border-blue resize-none" />
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-text2">Ce que l'étudiant apprendra (un par ligne)</label>
            <textarea value={form.what_you_learn} onChange={e => setf('what_you_learn', e.target.value)} rows={3}
              placeholder="Créer des sites web interactifs&#10;Comprendre les bases de JavaScript"
              className="w-full bg-card2 border border-border rounded-xl px-4 py-3 text-sm text-text outline-none focus:border-blue resize-none" />
          </div>

          <Button onClick={() => setActiveTab('content')}>Suivant → Contenu</Button>
        </Card>
      )}

      {/* ── TAB 2: Content (Modules + Lessons + Quiz) ── */}
      {activeTab === 'content' && (
        <div className="space-y-4">
          {modules.map((mod, mi) => (
            <Card key={mi} className="overflow-hidden">
              {/* Module header */}
              <div className="flex items-center gap-3 p-4 bg-card2/50 border-b border-border">
                <button onClick={() => toggleMod(mi)} className="text-text3 hover:text-text transition-colors flex-shrink-0">
                  {mod.expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>
                <div className="w-6 h-6 rounded-lg bg-blue/20 text-blue text-xs font-bold flex items-center justify-center flex-shrink-0">{mi + 1}</div>
                <input value={mod.title} onChange={e => setModTitle(mi, e.target.value)}
                  className="flex-1 bg-transparent text-sm font-semibold text-text outline-none placeholder-text3 border-b border-transparent focus:border-border transition-colors pb-0.5"
                  placeholder="Titre du module" />
                {modules.length > 1 && (
                  <button onClick={() => removeModule(mi)} className="p-1.5 text-red hover:bg-red/10 rounded-lg transition-colors flex-shrink-0">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>

              {/* Lessons */}
              {mod.expanded && (
                <div className="p-4 space-y-4">
                  {mod.lessons.map((lesson, li) => {
                    const lessonKey = `${mi}-${li}`
                    const isExpanded = expandedLesson === lessonKey

                    return (
                      <div key={li} className={clsx(
                        'border rounded-xl overflow-hidden transition-colors',
                        lesson.content_type === 'quiz' ? 'border-blue/20' : 'border-border'
                      )}>
                        {/* Lesson header */}
                        <div className="flex items-center gap-2.5 p-3 bg-card2">
                          <span className="text-xs text-text3 font-medium w-14 flex-shrink-0">Leçon {li + 1}</span>

                          <input value={lesson.title} onChange={e => setLesson(mi, li, { title: e.target.value })}
                            placeholder="Titre de la leçon"
                            className="flex-1 bg-transparent text-sm text-text outline-none placeholder-text3" />

                          {/* Type selector pills */}
                          <div className="flex gap-1 flex-shrink-0">
                            {(['video','text','quiz'] as const).map(type => (
                              <button key={type} onClick={() => {
                                setLesson(mi, li, { content_type: type })
                                if (type === 'quiz') setExpandedLesson(lessonKey)
                              }}
                                className={clsx(
                                  'flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border transition-all',
                                  lesson.content_type === type
                                    ? type === 'quiz' ? 'bg-blue text-white border-blue' : 'bg-blue/10 text-blue border-blue/30'
                                    : 'text-text3 border-border hover:border-blue/30 hover:text-text2'
                                )}>
                                {TYPE_ICONS[type]}
                                {TYPE_LABELS[type]}
                              </button>
                            ))}
                          </div>

                          {lesson.content_type === 'quiz' && (
                            <button onClick={() => setExpandedLesson(isExpanded ? null : lessonKey)}
                              className="text-xs text-blue hover:text-cyan transition-colors flex-shrink-0 flex items-center gap-1">
                              {isExpanded ? 'Fermer' : 'Éditer le quiz'}
                              <ChevronDown size={12} className={clsx('transition-transform', isExpanded && 'rotate-180')} />
                            </button>
                          )}

                          {mod.lessons.length > 1 && (
                            <button onClick={() => removeLesson(mi, li)} className="p-1 text-red hover:bg-red/10 rounded-lg transition-colors flex-shrink-0">
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>

                        {/* Lesson content area */}
                        <div className="p-3 space-y-3">
                          {/* Video URL */}
                          {lesson.content_type === 'video' && (
                            <div className="flex items-center gap-2">
                              <Video size={14} className="text-text3 flex-shrink-0" />
                              <input value={lesson.video_url} onChange={e => setLesson(mi, li, { video_url: e.target.value })}
                                placeholder="URL YouTube, Vimeo ou lien direct..."
                                className="flex-1 bg-card border border-border rounded-lg px-3 py-2 text-sm text-text outline-none focus:border-blue transition-colors" />
                            </div>
                          )}

                          {/* Text content */}
                          {lesson.content_type === 'text' && (
                            <textarea value={lesson.content_body} onChange={e => setLesson(mi, li, { content_body: e.target.value })}
                              rows={4} placeholder="Contenu texte de la leçon (Markdown supporté)..."
                              className="w-full bg-card border border-border rounded-xl px-3 py-2.5 text-sm text-text outline-none focus:border-blue transition-colors resize-none" />
                          )}

                          {/* Quiz builder — s'affiche quand on clique "Éditer le quiz" */}
                          {lesson.content_type === 'quiz' && isExpanded && (
                            <div className="mt-2">
                              <div className="flex items-center gap-2 mb-4">
                                <HelpCircle size={15} className="text-blue" />
                                <span className="text-sm font-semibold text-text">Constructeur de quiz</span>
                                <span className="text-xs text-text3">— {lesson.quiz_questions.length} question{lesson.quiz_questions.length !== 1 ? 's' : ''}</span>
                              </div>
                              <QuizBuilder
                                questions={lesson.quiz_questions}
                                onChange={qs => setLesson(mi, li, { quiz_questions: qs })}
                                passingScore={lesson.quiz_passing_score}
                                onPassingScoreChange={s => setLesson(mi, li, { quiz_passing_score: s })}
                              />
                            </div>
                          )}

                          {/* Quiz summary when collapsed */}
                          {lesson.content_type === 'quiz' && !isExpanded && (
                            <button onClick={() => setExpandedLesson(lessonKey)}
                              className="w-full flex items-center gap-3 bg-blue/5 border border-blue/10 rounded-xl px-4 py-3 hover:bg-blue/10 transition-colors text-left">
                              <HelpCircle size={16} className="text-blue flex-shrink-0" />
                              <div>
                                <p className="text-sm font-medium text-text">
                                  {lesson.quiz_questions.length === 0
                                    ? 'Quiz vide — cliquez pour ajouter des questions'
                                    : `${lesson.quiz_questions.length} question${lesson.quiz_questions.length > 1 ? 's' : ''} · Score minimum : ${lesson.quiz_passing_score}%`}
                                </p>
                                <p className="text-xs text-text3 mt-0.5">
                                  {lesson.quiz_questions.length === 0
                                    ? 'Les étudiants doivent réussir le quiz pour continuer'
                                    : `Points : ${lesson.quiz_questions.reduce((s, q) => s + q.points, 0)}`}
                                </p>
                              </div>
                              <span className="ml-auto text-xs text-blue">Éditer →</span>
                            </button>
                          )}

                          {/* Schedule settings — for quiz and assignment types */}
                          {(lesson.content_type === 'quiz') && (
                            <ScheduleSettings
                              type="quiz"
                              value={lesson.schedule}
                              onChange={s => setLesson(mi, li, { schedule: s })}
                            />
                          )}

                          {/* Free preview toggle */}
                          <label className="flex items-center gap-2 cursor-pointer w-fit">
                            <input type="checkbox" checked={lesson.is_free_preview}
                              onChange={e => setLesson(mi, li, { is_free_preview: e.target.checked })}
                              className="w-4 h-4 accent-blue" />
                            <span className="text-xs text-text2">Aperçu gratuit (visible sans inscription)</span>
                          </label>
                        </div>
                      </div>
                    )
                  })}

                  <button onClick={() => addLesson(mi)}
                    className="flex items-center gap-1.5 text-xs text-blue hover:text-cyan transition-colors">
                    <Plus size={13} /> Ajouter une leçon
                  </button>
                </div>
              )}
            </Card>
          ))}

          {/* Add module */}
          <button onClick={addModule}
            className="w-full border-2 border-dashed border-border hover:border-blue/50 rounded-2xl py-4 flex items-center justify-center gap-2 text-sm text-text2 hover:text-blue transition-all">
            <Plus size={16} /> Ajouter un module
          </button>

          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setActiveTab('info')}>← Retour</Button>
            <Button onClick={() => setActiveTab('pricing')}>Suivant → Tarification</Button>
          </div>
        </div>
      )}

      {/* ── TAB 3: Pricing ── */}
      {activeTab === 'pricing' && (
        <Card className="p-6 space-y-5">
          <h2 className="font-semibold text-text">Tarification</h2>

          <div className="grid grid-cols-3 gap-3">
            {[
              { val: 'free', label: 'Gratuit', desc: 'Accès libre pour tous', icon: '🆓' },
              { val: 'paid', label: 'Payant', desc: 'Paiement requis', icon: '💳' },
              { val: 'certificate_only', label: 'Cert. payante', desc: 'Cours gratuit, certificat payant', icon: '🏆' },
            ].map(({ val, label, desc, icon }) => (
              <button key={val} onClick={() => setf('pricing_model', val)}
                className={clsx('p-4 rounded-xl border text-left transition-all', form.pricing_model === val ? 'border-blue bg-blue/10' : 'border-border hover:border-blue/30 bg-card2')}>
                <span className="text-xl block mb-2">{icon}</span>
                <p className="font-medium text-sm text-text">{label}</p>
                <p className="text-xs text-text3 mt-1">{desc}</p>
              </button>
            ))}
          </div>

          {form.pricing_model !== 'free' && (
            <Input label="Prix (USD)" type="number" value={form.price} onChange={e => setf('price', e.target.value)} placeholder="Ex: 29.99" />
          )}

          <div className="bg-card2 rounded-xl p-4 border border-border">
            <p className="text-sm font-medium text-text mb-1">📋 Résumé du cours</p>
            <ul className="text-xs text-text3 space-y-1">
              <li>• <span className="text-text2">{modules.length} module{modules.length > 1 ? 's' : ''}</span></li>
              <li>• <span className="text-text2">{modules.reduce((s, m) => s + m.lessons.length, 0)} leçons</span> dont{' '}
                <span className="text-blue">{modules.reduce((s, m) => s + m.lessons.filter(l => l.content_type === 'quiz').length, 0)} quiz</span>
              </li>
              <li>• Après soumission, l'administrateur révisera le cours avant publication.</li>
            </ul>
          </div>

          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setActiveTab('content')}>← Retour</Button>
            <Button variant="secondary" onClick={() => save(false)} loading={loading}><Save size={15} /> Brouillon</Button>
            <Button onClick={() => save(true)} loading={loading}><Send size={15} /> Soumettre pour révision</Button>
          </div>
        </Card>
      )}
    </DashboardLayout>
  )
}
