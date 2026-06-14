'use client'

import { useEffect, useState, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { createBrowserClient } from '@/lib/supabase/browser'
import { useParams, useRouter } from 'next/navigation'
import { Spinner, ProgressBar, Badge } from '@/components/ui'
import {
  CheckCircle, ChevronDown, ChevronRight, Play, FileText,
  HelpCircle, BookOpen, ArrowLeft, Award, Lock, StickyNote, Trash2, Plus,
  Clock, Upload, AlertTriangle, Calendar
} from 'lucide-react'
import clsx from 'clsx'
import Link from 'next/link'
import toast from 'react-hot-toast'

function getYouTubeId(url: string) {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([^&?/]+)/)
  return m?.[1] || null
}
function getVimeoId(url: string) {
  const m = url.match(/vimeo\.com\/(\d+)/)
  return m?.[1] || null
}

export default function LearnPage() {
  const { profile } = useAuth()
  const supabase = createBrowserClient()
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string

  const [course, setCourse] = useState<any>(null)
  const [modules, setModules] = useState<any[]>([])
  const [currentLesson, setCurrentLesson] = useState<any>(null)
  const [enrollment, setEnrollment] = useState<any>(null)
  const [progress, setProgress] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [sidebarTab, setSidebarTab] = useState<'syllabus' | 'notes'>('syllabus')
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set())
  const [completing, setCompleting] = useState(false)
  const [videoSpeed, setVideoSpeed] = useState(1)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [quizQuestions, setQuizQuestions] = useState<any[]>([])
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({})
  const [quizSubmitted, setQuizSubmitted] = useState(false)
  const [quizScore, setQuizScore] = useState(0)
  const [quizTimeLeft, setQuizTimeLeft] = useState<number | null>(null)
  const [quizStarted, setQuizStarted] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [assignmentText, setAssignmentText] = useState('')
  const [assignmentSubmitting, setAssignmentSubmitting] = useState(false)
  const [assignmentSubmitted, setAssignmentSubmitted] = useState(false)
  const [videoWatched, setVideoWatched] = useState(false)
  const [textScrolled, setTextScrolled] = useState(false)
  const textContentRef = useRef<HTMLDivElement | null>(null)

  const [notes, setNotes] = useState<any[]>([])
  const [noteText, setNoteText] = useState('')
  const [savingNote, setSavingNote] = useState(false)

  useEffect(() => {
    if (!profile) return
    const load = async () => {
      const { data: courseData } = await supabase
        .from('courses').select('*').eq('slug', slug).single()
      if (!courseData) { router.push('/cursos'); return }
      setCourse(courseData)

      const isOwner = courseData.instructor_id === profile.id || profile.role === 'admin'
      const isPublished = courseData.status === 'published'

      if (!isPublished && !isOwner) {
        toast.error("Ce cours n'est pas disponible")
        router.push('/cursos')
        return
      }

      const { data: enrollData } = await supabase
        .from('enrollments').select('*')
        .eq('student_id', profile.id).eq('course_id', courseData.id).single()

      if (!enrollData) {
        if (isOwner) {
          const mockEnroll = {
            id: 'preview-' + profile.id,
            student_id: profile.id,
            course_id: courseData.id,
            status: 'active',
            progress_pct: 0,
            last_lesson_id: null,
            enrolled_at: new Date().toISOString(),
          }
          setEnrollment(mockEnroll)
        } else if (courseData.pricing_model === 'free') {
          const { data: newEnroll } = await supabase.from('enrollments')
            .insert({ student_id: profile.id, course_id: courseData.id, status: 'active' })
            .select().single()
          setEnrollment(newEnroll)
        } else {
          toast.error('Vous devez être inscrit à ce cours')
          router.push(`/cursos/${slug}`)
          return
        }
      } else {
        setEnrollment(enrollData)
      }

      const { data: modsData } = await supabase
        .from('modules').select('*,lessons:lessons(*)')
        .eq('course_id', courseData.id).order('order_num')

      const sorted = (modsData || []).map((m: any) => ({
        ...m,
        lessons: (m.lessons || [])
          .sort((a: any, b: any) => a.order_num - b.order_num)
          .filter((l: any) => l.is_published)
      }))
      setModules(sorted)
      if (sorted.length > 0) setExpandedModules(new Set([sorted[0].id]))

      const { data: progData } = await supabase
        .from('lesson_progress').select('lesson_id,is_completed')
        .eq('student_id', profile.id).eq('course_id', courseData.id)
      const progMap: Record<string, boolean> = {}
      ;(progData || []).forEach((p: any) => { progMap[p.lesson_id] = p.is_completed })
      setProgress(progMap)

      const allLessons = sorted.flatMap((m: any) => m.lessons)
      const firstLesson = allLessons[0]
      if (firstLesson?.content_type === 'quiz') {
        const { data: qData } = await supabase
          .from('quiz_questions').select('*').eq('lesson_id', firstLesson.id).order('order_num')
        setQuizQuestions(qData || [])
      }

      const lastLessonId = enrollData?.last_lesson_id
      if (lastLessonId) {
        const last = allLessons.find((l: any) => l.id === lastLessonId)
        setCurrentLesson(last || allLessons[0] || null)
      } else if (allLessons.length > 0) {
        setCurrentLesson(allLessons[0])
      }

      setLoading(false)
    }
    load()
  }, [profile, slug])

  useEffect(() => {
    if (!profile || !currentLesson) return
    supabase.from('lesson_notes')
      .select('*').eq('student_id', profile.id).eq('lesson_id', currentLesson.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setNotes(data || []))
  }, [profile, currentLesson])

  const saveNote = async () => {
    if (!noteText.trim() || !profile || !currentLesson || !course) return
    setSavingNote(true)
    const { data, error } = await supabase.from('lesson_notes').insert({
      student_id: profile.id,
      lesson_id: currentLesson.id,
      course_id: course.id,
      content: noteText.trim(),
    }).select().single()
    if (!error && data) {
      setNotes(n => [data, ...n])
      setNoteText('')
      toast.success('Note sauvegardée !')
    }
    setSavingNote(false)
  }

  const deleteNote = async (id: string) => {
    await supabase.from('lesson_notes').delete().eq('id', id)
    setNotes(n => n.filter(note => note.id !== id))
  }

  const selectLesson = async (lesson: any) => {
    setCurrentLesson(lesson)
    setQuizSubmitted(false)
    setQuizAnswers({})
    setQuizScore(0)
    setQuizStarted(false)
    setQuizTimeLeft(null)
    setAssignmentText('')
    setAssignmentSubmitted(false)
    setVideoWatched(false)
    setTextScrolled(false)
    if (timerRef.current) clearInterval(timerRef.current)
    if (lesson.content_type === 'quiz') {
      const { data: qData } = await supabase
        .from('quiz_questions').select('*').eq('lesson_id', lesson.id).order('order_num')
      setQuizQuestions(qData || [])
    }
    if (enrollment?.id && !enrollment.id.startsWith('preview-')) {
      supabase.from('enrollments').update({ last_lesson_id: lesson.id }).eq('id', enrollment.id)
    }
  }

  // FIX: markComplete now delegates to /api/progress (single source of truth).
  // Previously it duplicated certificate generation logic with a different verify_url format.
  const markComplete = async () => {
    if (!currentLesson || completing || !profile || !course || !enrollment) return
    if (enrollment.id?.startsWith('preview-')) {
      toast.error('Mode prévisualisation — aucune progression enregistrée')
      return
    }
    setCompleting(true)
    try {
      const res = await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lesson_id: currentLesson.id,
          course_id: course.id,
          enrollment_id: enrollment.id,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Erreur lors de la mise à jour')
        setCompleting(false)
        return
      }
      // Update local progress state
      setProgress(prev => ({ ...prev, [currentLesson.id]: true }))
      if (data.course_completed) {
        toast.success('🎉 Félicitations ! Cours terminé ! Certificat généré.')
        if (data.program_completed) {
          toast.success('🏆 Programme complété ! Certificat de programme généré !', { duration: 6000 })
        }
      } else {
        toast.success('Leçon terminée !')
      }
    } catch {
      toast.error('Erreur réseau')
    }
    setCompleting(false)
  }

  const goNext = () => {
    const all = modules.flatMap((m: any) => m.lessons)
    const idx = all.findIndex((l: any) => l.id === currentLesson?.id)
    if (idx >= 0 && idx < all.length - 1) selectLesson(all[idx + 1])
  }

  const goPrev = () => {
    const all = modules.flatMap((m: any) => m.lessons)
    const idx = all.findIndex((l: any) => l.id === currentLesson?.id)
    if (idx > 0) selectLesson(all[idx - 1])
  }

  const handleSpeedChange = (speed: number) => {
    setVideoSpeed(speed)
    if (videoRef.current) videoRef.current.playbackRate = speed
  }

  const toggleModule = (id: string) => {
    setExpandedModules(s => {
      const n = new Set(s)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }

  const totalLessons = modules.flatMap((m: any) => m.lessons).length
  const completedLessons = Object.values(progress).filter(Boolean).length
  const progressPct = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0

  const calcRealDate = (days: string): Date | null => {
    if (!days || !enrollment?.enrolled_at) return null
    const d = parseInt(days)
    if (isNaN(d)) return null
    const date = new Date(enrollment.enrolled_at)
    date.setDate(date.getDate() + d)
    return date
  }

  const getLessonStatus = (lesson: any) => {
    if (!lesson || !enrollment?.enrolled_at) return 'open'
    const now = new Date()
    const opensDate = calcRealDate(lesson.opens_at)
    const closesDate = calcRealDate(lesson.closes_at)
    if (opensDate && now < opensDate) return 'not_open'
    if (closesDate && now > closesDate) return 'closed'
    return 'open'
  }

  const startQuizTimer = (minutes: number) => {
    setQuizTimeLeft(minutes * 60)
    timerRef.current = setInterval(() => {
      setQuizTimeLeft(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(timerRef.current!)
          setQuizSubmitted(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const renderQuiz = () => {
    const status = getLessonStatus(currentLesson)
    const opensDate = calcRealDate(currentLesson?.opens_at)
    const dueDate = calcRealDate(currentLesson?.due_at)
    const closesDate = calcRealDate(currentLesson?.closes_at)

    if (status === 'not_open') return (
      <div className="max-w-2xl mx-auto px-6 py-10 text-center">
        <div className="text-5xl mb-4">🔒</div>
        <h3 className="text-xl font-bold text-text mb-2">Quiz pas encore disponible</h3>
        <p className="text-text2 text-sm mb-4">Ce quiz ouvrira le :</p>
        <div className="bg-blue/10 border border-blue/20 rounded-2xl px-6 py-4 inline-block">
          <p className="text-blue font-bold text-lg">
            {opensDate?.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        {dueDate && (
          <p className="text-text3 text-xs mt-4 flex items-center justify-center gap-1">
            <Clock size={11} /> Date limite : {dueDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
      </div>
    )

    if (status === 'closed') return (
      <div className="max-w-2xl mx-auto px-6 py-10 text-center">
        <div className="text-5xl mb-4">⏰</div>
        <h3 className="text-xl font-bold text-text mb-2">Quiz fermé</h3>
        <p className="text-text2 text-sm">Ce quiz n'accepte plus de soumissions.</p>
        {closesDate && (
          <p className="text-text3 text-xs mt-3">Fermé le {closesDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</p>
        )}
      </div>
    )

    if (!quizQuestions || quizQuestions.length === 0) return (
      <div className="max-w-2xl mx-auto px-6 py-10 text-center">
        <div className="text-4xl mb-3">📝</div>
        <p className="text-text2 text-sm">Aucune question configurée pour ce quiz.</p>
      </div>
    )

    if (!quizStarted) return (
      <div className="max-w-2xl mx-auto px-6 py-10 text-center">
        <div className="text-5xl mb-4">🎯</div>
        <h3 className="text-xl font-bold text-text mb-2">{currentLesson?.title}</h3>
        <div className="bg-card border border-border rounded-2xl p-5 text-left space-y-3 mb-6 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-text3">Questions</span>
            <span className="font-medium text-text">{quizQuestions.length}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-text3">Durée</span>
            <span className="font-medium text-text">
              {currentLesson?.time_limit_min ? `${currentLesson.time_limit_min} minutes` : 'Illimitée'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-text3">Tentatives</span>
            <span className="font-medium text-text">
              {currentLesson?.max_attempts === 99 ? 'Illimitées' : currentLesson?.max_attempts || 1}
            </span>
          </div>
          {dueDate && (
            <div className="flex items-center justify-between">
              <span className="text-text3">Date limite</span>
              <span className={`font-medium ${new Date() > dueDate ? 'text-red' : 'text-yellow'}`}>
                {dueDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          )}
          {closesDate && (
            <div className="flex items-center justify-between">
              <span className="text-text3">Fermeture</span>
              <span className="font-medium text-red">
                {closesDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          )}
        </div>
        <button
          onClick={() => {
            setQuizStarted(true)
            if (currentLesson?.time_limit_min) startQuizTimer(currentLesson.time_limit_min)
          }}
          className="bg-blue hover:bg-blue2 text-white px-8 py-3 rounded-xl font-medium transition-colors">
          Commencer le quiz →
        </button>
      </div>
    )

    if (quizSubmitted) return (
      <div className="max-w-2xl mx-auto px-6 py-10 text-center">
        <div className="text-5xl mb-4">{quizScore >= 70 ? '🎉' : '😅'}</div>
        <h3 className="text-xl font-bold text-text mb-2">
          {quizScore >= 70 ? 'Félicitations !' : 'Continuez à pratiquer !'}
        </h3>
        <p className="text-text2 mb-1">Score : <span className="font-bold text-blue">{quizScore}%</span></p>
        <p className="text-text3 text-sm mb-6">{quizScore >= 70 ? 'Quiz réussi ✅' : 'Score minimum requis : 70%'}</p>
        {(currentLesson?.max_attempts || 1) > 1 && (
          <button onClick={() => {
            setQuizSubmitted(false)
            setQuizAnswers({})
            setQuizStarted(false)
            setQuizTimeLeft(null)
            if (timerRef.current) clearInterval(timerRef.current)
          }}
            className="bg-blue hover:bg-blue2 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors">
            Recommencer
          </button>
        )}
      </div>
    )

    const mins = quizTimeLeft !== null ? Math.floor(quizTimeLeft / 60) : null
    const secs = quizTimeLeft !== null ? quizTimeLeft % 60 : null
    const timeUrgent = quizTimeLeft !== null && quizTimeLeft < 120

    return (
      <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-text">Quiz — {currentLesson?.title}</h3>
          {quizTimeLeft !== null && (
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl font-mono font-bold text-sm ${
              timeUrgent ? 'bg-red/10 text-red border border-red/20' : 'bg-blue/10 text-blue border border-blue/20'
            }`}>
              <Clock size={14} />
              {String(mins).padStart(2,'0')}:{String(secs).padStart(2,'0')}
            </div>
          )}
        </div>

        {dueDate && new Date() > dueDate && (
          <div className="flex items-center gap-2 bg-yellow/10 border border-yellow/20 rounded-xl px-4 py-2 text-xs text-yellow">
            <AlertTriangle size={12} /> Soumission en retard
          </div>
        )}

        {quizQuestions.map((q: any, qi: number) => (
          <div key={q.id} className="bg-white border border-border rounded-2xl p-5">
            <p className="font-medium text-text mb-3">{qi + 1}. {q.question}</p>
            <div className="space-y-2">
              {q.options.map((opt: any, oi: number) => (
                <label key={oi} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer border transition-all ${
                  quizAnswers[q.id] === oi
                    ? 'border-blue bg-blue/5 text-blue'
                    : 'border-border hover:border-blue/30 text-text2'
                }`}>
                  <input type="radio" name={q.id} className="hidden"
                    onChange={() => setQuizAnswers(prev => ({ ...prev, [q.id]: oi }))} />
                  <span className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                    quizAnswers[q.id] === oi ? 'border-blue bg-blue' : 'border-border'
                  }`}>
                    {quizAnswers[q.id] === oi && <span className="w-2 h-2 bg-white rounded-full" />}
                  </span>
                  {opt.text}
                </label>
              ))}
            </div>
          </div>
        ))}

        <button
          onClick={() => {
            const total = quizQuestions.length
            const correct = quizQuestions.filter((q: any) => {
              const answerIdx = quizAnswers[q.id]
              return answerIdx !== undefined && q.options[answerIdx]?.is_correct
            }).length
            const score = Math.round((correct / total) * 100)
            setQuizScore(score)
            setQuizSubmitted(true)
            if (timerRef.current) clearInterval(timerRef.current)
            if (score >= 70) markComplete()
          }}
          disabled={Object.keys(quizAnswers).length < quizQuestions.length}
          className="w-full bg-blue hover:bg-blue2 text-white py-3 rounded-xl font-medium transition-colors disabled:opacity-40">
          Soumettre le quiz ({Object.keys(quizAnswers).length}/{quizQuestions.length} répondues)
        </button>
      </div>
    )
  }

  const renderAssignment = () => {
    const status = getLessonStatus(currentLesson)
    const opensDate = calcRealDate(currentLesson?.opens_at)
    const dueDate = calcRealDate(currentLesson?.due_at)
    const closesDate = calcRealDate(currentLesson?.closes_at)
    const submissionType = currentLesson?.resources?.[0]?.submission_type || 'both'

    if (status === 'not_open') return (
      <div className="max-w-2xl mx-auto px-6 py-10 text-center">
        <div className="text-5xl mb-4">🔒</div>
        <h3 className="text-xl font-bold text-text mb-2">Exercice pas encore disponible</h3>
        <p className="text-text2 text-sm mb-4">Disponible le :</p>
        <div className="bg-blue/10 border border-blue/20 rounded-2xl px-6 py-4 inline-block">
          <p className="text-blue font-bold text-lg">
            {opensDate?.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </div>
    )

    if (status === 'closed') return (
      <div className="max-w-2xl mx-auto px-6 py-10 text-center">
        <div className="text-5xl mb-4">⏰</div>
        <h3 className="text-xl font-bold text-text mb-2">Exercice fermé</h3>
        <p className="text-text2 text-sm">La date limite de remise est passée.</p>
      </div>
    )

    if (assignmentSubmitted) return (
      <div className="max-w-2xl mx-auto px-6 py-10 text-center">
        <div className="text-5xl mb-4">✅</div>
        <h3 className="text-xl font-bold text-text mb-2">Exercice soumis !</h3>
        <p className="text-text2 text-sm">Votre réponse a été envoyée à l'instructeur.</p>
      </div>
    )

    return (
      <div className="max-w-2xl mx-auto px-6 py-8 space-y-5">
        <h3 className="text-lg font-bold text-text">📋 {currentLesson?.title}</h3>

        {(dueDate || closesDate) && (
          <div className="flex gap-3 flex-wrap">
            {dueDate && (
              <div className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border ${
                new Date() > dueDate ? 'bg-red/10 border-red/20 text-red' : 'bg-yellow/10 border-yellow/20 text-yellow'
              }`}>
                <Clock size={11} />
                {new Date() > dueDate ? 'En retard — ' : 'Date limite : '}
                {dueDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </div>
            )}
            {closesDate && (
              <div className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border bg-red/5 border-red/15 text-red">
                <Lock size={11} />
                Ferme le {closesDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </div>
            )}
          </div>
        )}

        {currentLesson?.content_body && (
          <div className="bg-blue/5 border border-blue/15 rounded-2xl p-5">
            <p className="text-xs font-semibold text-blue mb-2 uppercase tracking-wide">📌 Consignes</p>
            <p className="text-text text-sm leading-relaxed whitespace-pre-wrap">{currentLesson.content_body}</p>
          </div>
        )}

        {currentLesson?.video_url && (
          <a href={currentLesson.video_url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3 hover:border-blue/30 transition-colors">
            <FileText size={20} className="text-blue flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-text">Document de l'exercice</p>
              <p className="text-xs text-text3">Cliquez pour télécharger le PDF</p>
            </div>
            <span className="text-xs text-blue font-medium">Télécharger →</span>
          </a>
        )}

        {(submissionType === 'text' || submissionType === 'both') && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-text2">✏️ Votre réponse</label>
            <textarea
              value={assignmentText}
              onChange={e => setAssignmentText(e.target.value)}
              rows={6}
              placeholder="Écrivez votre réponse ici..."
              className="w-full bg-card border border-border rounded-xl px-4 py-3 text-sm text-text outline-none focus:border-blue resize-none"
            />
          </div>
        )}

        {(submissionType === 'file' || submissionType === 'both') && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-text2">📎 Fichier (PDF, DOC, ZIP)</label>
            <label className="flex items-center gap-3 border-2 border-dashed border-border hover:border-blue/40 rounded-xl px-4 py-4 cursor-pointer transition-colors">
              <Upload size={18} className="text-text3" />
              <div>
                <p className="text-sm text-text2">Cliquez pour sélectionner un fichier</p>
                <p className="text-xs text-text3">Max 20 MB — PDF, DOC, ZIP</p>
              </div>
              <input type="file" className="hidden"
                accept=".pdf,.doc,.docx,.zip,.txt"
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (!file || !profile) return
                  if (file.size > 20 * 1024 * 1024) { toast.error('Max 20 MB'); return }
                  setAssignmentSubmitting(true)
                  const path = `assignments/${profile.id}/${currentLesson.id}-${Date.now()}.${file.name.split('.').pop()}`
                  const { error } = await supabase.storage.from('course-resources').upload(path, file)
                  if (error) { toast.error('Erreur upload'); setAssignmentSubmitting(false); return }
                  toast.success('Fichier soumis !')
                  setAssignmentSubmitted(true)
                  markComplete()
                  setAssignmentSubmitting(false)
                }}
              />
            </label>
          </div>
        )}

        {(submissionType === 'text' || submissionType === 'both') && (
          <button
            onClick={async () => {
              if (!assignmentText.trim()) { toast.error('Réponse vide'); return }
              if (!profile || !currentLesson || !course) return
              setAssignmentSubmitting(true)
              // FIX: was toast+done without saving anything — now saves to assignment_submissions
              const { error } = await supabase.from('assignment_submissions').upsert({
                student_id: profile.id,
                lesson_id: currentLesson.id,
                course_id: course.id,
                content_text: assignmentText.trim(),
                submitted_at: new Date().toISOString(),
                status: 'submitted',
              }, { onConflict: 'student_id,lesson_id' })
              if (error) {
                toast.error('Erreur lors de la soumission')
                setAssignmentSubmitting(false)
                return
              }
              toast.success('Réponse soumise !')
              setAssignmentSubmitted(true)
              markComplete()
              setAssignmentSubmitting(false)
            }}
            disabled={assignmentSubmitting || !assignmentText.trim()}
            className="w-full bg-blue hover:bg-blue2 text-white py-3 rounded-xl font-medium transition-colors disabled:opacity-40">
            {assignmentSubmitting ? 'Envoi...' : 'Soumettre ma réponse'}
          </button>
        )}
      </div>
    )
  }

  const renderVideo = () => {
    if (!currentLesson?.video_url) return (
      <div className="flex items-center justify-center h-48 bg-gray-50 border border-dashed border-gray-300 rounded-xl mx-6 my-4">
        <p className="text-gray-400 text-sm">Aucune vidéo configurée pour cette leçon</p>
      </div>
    )
    const ytId = getYouTubeId(currentLesson.video_url)
    if (ytId) return (
      <div className="relative w-full h-full">
        <iframe src={`https://www.youtube.com/embed/${ytId}?rel=0`} className="w-full h-full" allowFullScreen frameBorder="0" />
        {!videoWatched && !progress[currentLesson.id] && (
          <div className="absolute bottom-4 right-4">
            <button onClick={() => setVideoWatched(true)}
              className="bg-black/70 hover:bg-black text-white text-xs px-3 py-1.5 rounded-lg transition-colors">
              ✅ J'ai terminé la vidéo
            </button>
          </div>
        )}
      </div>
    )
    const vimeoId = getVimeoId(currentLesson.video_url)
    if (vimeoId) return (
      <div className="relative w-full h-full">
        <iframe src={`https://player.vimeo.com/video/${vimeoId}`} className="w-full h-full" allowFullScreen frameBorder="0" />
        {!videoWatched && !progress[currentLesson.id] && (
          <div className="absolute bottom-4 right-4">
            <button onClick={() => setVideoWatched(true)}
              className="bg-black/70 hover:bg-black text-white text-xs px-3 py-1.5 rounded-lg transition-colors">
              ✅ J'ai terminé la vidéo
            </button>
          </div>
        )}
      </div>
    )
    return (
      <video
        ref={videoRef}
        src={currentLesson.video_url}
        controls
        className="w-full h-full"
        onLoadedMetadata={e => {
          (e.target as HTMLVideoElement).playbackRate = videoSpeed
        }}
        onEnded={() => {
          setVideoWatched(true)
          toast.success('Vidéo terminée ! Marquez la leçon comme terminée.')
        }}
        onTimeUpdate={e => {
          const video = e.target as HTMLVideoElement
          if (!videoWatched && video.duration > 0 && video.currentTime / video.duration > 0.9) {
            setVideoWatched(true)
          }
        }}
      />
    )
  }

  if (loading) return (
    <div className="min-h-screen bg-bg flex items-center justify-center"><Spinner size="lg" /></div>
  )

  const canComplete =
    (currentLesson?.content_type === 'video' && (videoWatched || !!progress[currentLesson?.id])) ||
    (currentLesson?.content_type === 'text' && (textScrolled || !!progress[currentLesson?.id])) ||
    (currentLesson?.content_type !== 'video' && currentLesson?.content_type !== 'text')

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <header className="bg-card border-b border-border px-4 h-14 flex items-center gap-4 sticky top-0 z-40">
        <Link href="/dashboard/student" className="text-text2 hover:text-text p-1.5 rounded-lg hover:bg-card2 transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-semibold text-text truncate">{course?.title}</h1>
          {currentLesson && <p className="text-xs text-text3 truncate">{currentLesson.title}</p>}
        </div>
        <div className="hidden sm:flex items-center gap-3">
          <ProgressBar value={progressPct} className="w-32" />
          <span className="text-xs text-text3">{progressPct}%</span>
        </div>
        <button onClick={() => setSidebarOpen(!sidebarOpen)}
          className="text-text2 hover:text-text p-1.5 rounded-lg hover:bg-card2 transition-colors text-xs">
          {sidebarOpen ? '→' : '←'} {sidebarOpen ? 'Fermer' : 'Syllabus'}
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 flex flex-col overflow-y-auto">
          {currentLesson ? (
            <>
              <div className="bg-black">
                {currentLesson.content_type === 'video' && (
                  <div className="aspect-video max-h-[60vh] w-full">{renderVideo()}</div>
                )}
                {currentLesson.content_type === 'text' && (
                  <div className="bg-white">
                    <div
                      ref={textContentRef}
                      className="max-w-3xl mx-auto px-6 py-8 max-h-[60vh] overflow-y-auto"
                      onScroll={e => {
                        const el = e.target as HTMLDivElement
                        const scrolled = el.scrollTop + el.clientHeight >= el.scrollHeight - 40
                        if (scrolled && !textScrolled) {
                          setTextScrolled(true)
                          toast.success('Texte lu ! Marquez la leçon comme terminée.')
                        }
                      }}>
                      <div className="text-text text-base leading-relaxed whitespace-pre-wrap">
                        {currentLesson.content_body || 'Contenu à venir...'}
                      </div>
                    </div>
                    {!textScrolled && !progress[currentLesson.id] && (
                      <p className="text-xs text-text3 text-center pb-3 flex items-center justify-center gap-1">
                        📖 Faites défiler jusqu'en bas pour terminer cette leçon
                      </p>
                    )}
                  </div>
                )}
                {currentLesson.content_type === 'quiz' && renderQuiz()}
                {currentLesson.content_type === 'assignment' && renderAssignment()}
                {currentLesson.content_type === 'exercise' && renderAssignment()}
              </div>

              {currentLesson?.content_type === 'video' && (
                <div className="bg-bg2 border-b border-border px-6 py-2 flex items-center gap-3">
                  <span className="text-xs text-text3 font-medium">Vitesse :</span>
                  <div className="flex gap-1.5">
                    {[0.5, 0.75, 1, 1.25, 1.5, 2].map(speed => (
                      <button key={speed} onClick={() => handleSpeedChange(speed)}
                        className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all ${
                          videoSpeed === speed
                            ? 'edha-gradient text-white shadow-sm'
                            : 'bg-card border border-border text-text2 hover:border-blue/30 hover:text-blue'
                        }`}>
                        {speed === 1 ? '1x' : `${speed}x`}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="p-6 max-w-4xl mx-auto w-full">
                <div className="flex items-start justify-between gap-4 mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-text">{currentLesson.title}</h2>
                    {currentLesson.description && <p className="text-text2 text-sm mt-1">{currentLesson.description}</p>}
                  </div>
                  <div className="flex-shrink-0">
                    {progress[currentLesson.id] ? (
                      <Badge variant="green"><CheckCircle size={12} /> Terminé</Badge>
                    ) : (
                      currentLesson.content_type !== 'quiz' &&
                      currentLesson.content_type !== 'assignment' &&
                      currentLesson.content_type !== 'exercise' && (
                        <button
                          onClick={markComplete}
                          disabled={completing || !canComplete}
                          title={!canComplete ? (
                            currentLesson.content_type === 'video'
                              ? 'Regardez la vidéo jusqu\'à la fin'
                              : 'Lisez le texte jusqu\'à la fin'
                          ) : ''}
                          className={`flex items-center gap-1.5 text-white text-sm px-4 py-2 rounded-xl transition-colors ${
                            canComplete
                              ? 'bg-blue hover:bg-blue2'
                              : 'bg-text3 cursor-not-allowed'
                          } disabled:opacity-50`}>
                          {completing ? <Spinner size="sm" /> : <CheckCircle size={14} />}
                          {canComplete ? 'Marquer terminé' : (
                            currentLesson.content_type === 'video' ? '▶ Regardez la vidéo' : '📖 Lisez jusqu\'à la fin'
                          )}
                        </button>
                      )
                    )}
                  </div>
                </div>

                <div className="flex gap-2 mb-6">
                  <button onClick={goPrev} className="flex-1 bg-card2 hover:bg-card border border-border text-text text-sm py-2.5 rounded-xl transition-colors">← Précédent</button>
                  <button onClick={goNext} className="flex-1 bg-blue hover:bg-blue2 text-white text-sm py-2.5 rounded-xl transition-colors">Suivant →</button>
                </div>

                {progressPct === 100 && (
                  <div className="bg-green/10 border border-green/20 rounded-2xl p-5 text-center">
                    <Award size={28} className="text-green mx-auto mb-2" />
                    <p className="font-semibold text-green text-lg">Cours terminé ! 🎉</p>
                    <p className="text-sm text-green/80 mt-1">Votre certificat a été généré.</p>
                    <Link href="/dashboard/student/certificates"
                      className="inline-flex items-center gap-2 bg-green text-white text-sm px-5 py-2.5 rounded-xl mt-3 transition-colors">
                      <Award size={14} /> Voir mon certificat
                    </Link>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-64 text-text3">
              <p>Sélectionnez une leçon pour commencer</p>
            </div>
          )}
        </main>

        {sidebarOpen && (
          <aside className="w-80 bg-card border-l border-border flex flex-col overflow-hidden flex-shrink-0">
            <div className="flex border-b border-border">
              <button onClick={() => setSidebarTab('syllabus')}
                className={clsx('flex-1 text-xs font-medium py-3 flex items-center justify-center gap-1.5 transition-colors',
                  sidebarTab === 'syllabus' ? 'text-blue border-b-2 border-blue' : 'text-text3 hover:text-text2')}>
                <BookOpen size={13} /> Syllabus
              </button>
              <button onClick={() => setSidebarTab('notes')}
                className={clsx('flex-1 text-xs font-medium py-3 flex items-center justify-center gap-1.5 transition-colors',
                  sidebarTab === 'notes' ? 'text-blue border-b-2 border-blue' : 'text-text3 hover:text-text2')}>
                <StickyNote size={13} /> Notes {notes.length > 0 && `(${notes.length})`}
              </button>
            </div>

            {sidebarTab === 'syllabus' && (
              <>
                <div className="p-4 border-b border-border">
                  <p className="text-xs text-text3 mb-1">Progression du cours</p>
                  <ProgressBar value={progressPct} />
                  <p className="text-xs text-text3 mt-1">{completedLessons}/{totalLessons} leçons · {progressPct}%</p>
                </div>
                <nav className="flex-1 p-2 overflow-y-auto">
                  {modules.map((mod: any) => (
                    <div key={mod.id} className="mb-1">
                      <button onClick={() => toggleModule(mod.id)}
                        className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-text hover:bg-card2 transition-colors text-left">
                        {expandedModules.has(mod.id)
                          ? <ChevronDown size={14} className="flex-shrink-0 text-text3" />
                          : <ChevronRight size={14} className="flex-shrink-0 text-text3" />}
                        <span className="flex-1 truncate">{mod.title}</span>
                        <span className="text-xs text-text3 flex-shrink-0">
                          {(mod.lessons || []).filter((l: any) => progress[l.id]).length}/{(mod.lessons || []).length}
                        </span>
                      </button>

                      {expandedModules.has(mod.id) && (
                        <div className="ml-4 space-y-0.5">
                          {(mod.lessons || []).map((lesson: any) => {
                            const isActive = currentLesson?.id === lesson.id
                            const isDone = progress[lesson.id]
                            const lessonStatus = getLessonStatus(lesson)
                            return (
                              <button key={lesson.id} onClick={() => selectLesson(lesson)}
                                className={clsx(
                                  'w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs transition-all text-left',
                                  isActive ? 'bg-blue text-white' : 'text-text2 hover:text-text hover:bg-card2'
                                )}>
                                {lesson.content_type === 'video' ? <Play size={11} />
                                  : lesson.content_type === 'quiz' ? <HelpCircle size={11} />
                                  : lesson.content_type === 'assignment' || lesson.content_type === 'exercise' ? <FileText size={11} />
                                  : <FileText size={11} />}
                                <span className="flex-1 truncate">{lesson.title}</span>
                                {lessonStatus === 'not_open' && !isActive && <Lock size={10} className="text-text3 flex-shrink-0" />}
                                {isDone && !isActive && lessonStatus !== 'not_open' && <CheckCircle size={11} className="text-green flex-shrink-0" />}
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </nav>
              </>
            )}

            {sidebarTab === 'notes' && (
              <div className="flex flex-col flex-1 overflow-hidden">
                <div className="p-3 border-b border-border">
                  <p className="text-xs text-text3 mb-2">
                    {currentLesson ? `Notes pour : ${currentLesson.title}` : 'Sélectionnez une leçon'}
                  </p>
                  <textarea
                    value={noteText}
                    onChange={e => setNoteText(e.target.value)}
                    placeholder="Écrivez une note..."
                    rows={3}
                    disabled={!currentLesson}
                    className="w-full bg-card2 border border-border rounded-xl px-3 py-2 text-xs text-text outline-none focus:border-blue transition-colors resize-none disabled:opacity-50"
                  />
                  <button
                    onClick={saveNote}
                    disabled={!noteText.trim() || savingNote || !currentLesson}
                    className="mt-2 w-full flex items-center justify-center gap-1.5 bg-blue hover:bg-blue2 text-white text-xs py-2 rounded-lg transition-colors disabled:opacity-50">
                    {savingNote ? <Spinner size="sm" /> : <Plus size={12} />}
                    Sauvegarder
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {notes.length === 0 ? (
                    <p className="text-xs text-text3 text-center py-6">Aucune note pour cette leçon</p>
                  ) : (
                    notes.map((note: any) => (
                      <div key={note.id} className="bg-card2 rounded-xl p-3 group relative">
                        <p className="text-xs text-text2 leading-relaxed pr-6">{note.content}</p>
                        <p className="text-[10px] text-text3 mt-1.5">
                          {new Date(note.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </p>
                        <button
                          onClick={() => deleteNote(note.id)}
                          className="absolute top-2 right-2 p-1 text-text3 hover:text-red opacity-0 group-hover:opacity-100 transition-all">
                          <Trash2 size={11} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </aside>
        )}
      </div>
    </div>
  )
}