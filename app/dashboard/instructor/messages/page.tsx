'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { instructorNav } from '@/lib/nav'
import { createBrowserClient } from '@/lib/supabase/browser'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { Card, Avatar, Badge, Spinner, Button } from '@/components/ui'
import { LayoutDashboard, BookOpen, BarChart2, User, MessageSquare, Megaphone, CheckCircle, Star, ChevronDown } from 'lucide-react'
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

function timeAgo(date: string) {
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (diff < 60) return `il y a ${diff}s`
  if (diff < 3600) return `il y a ${Math.floor(diff/60)}min`
  if (diff < 86400) return `il y a ${Math.floor(diff/3600)}h`
  return `il y a ${Math.floor(diff/86400)}j`
}

export default function InstructorMessagesPage() {
  const { profile } = useAuth()
  const supabase = createBrowserClient()
  const [courses, setCourses] = useState<any[]>([])
  const [selectedCourse, setSelectedCourse] = useState<string>('')
  const [questions, setQuestions] = useState<any[]>([])
  const [filter, setFilter] = useState<'all'|'unanswered'|'answered'>('unanswered')
  const [loading, setLoading] = useState(true)
  const [answerMap, setAnswerMap] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    if (!profile) return
    supabase.from('courses').select('id,title').eq('instructor_id', profile.id).neq('status', 'archived')
      .then(({ data }) => {
        setCourses(data || [])
        if (data && data.length > 0) setSelectedCourse(data[0].id)
      })
  }, [profile])

  useEffect(() => {
    if (!selectedCourse) return
    setLoading(true)
    fetch(`/api/qa?course_id=${selectedCourse}`)
      .then(r => r.json())
      .then(d => { setQuestions(d.questions || []); setLoading(false) })
  }, [selectedCourse])

  const submitAnswer = async (id: string) => {
    const answer = answerMap[id]?.trim()
    if (!answer) { toast.error('Réponse vide'); return }
    setSubmitting(id)
    const res = await fetch('/api/qa', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, answer })
    })
    const data = await res.json()
    if (!res.ok) { toast.error(data.error); setSubmitting(null); return }
    setQuestions(q => q.map(qq => qq.id === id ? { ...qq, ...data.question } : qq))
    setAnswerMap(m => ({ ...m, [id]: '' }))
    setExpandedId(null)
    toast.success('Réponse publiée !')
    setSubmitting(null)
  }

  const toggleFeatured = async (id: string, current: boolean) => {
    await fetch('/api/qa', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, is_featured: !current }) })
    setQuestions(q => q.map(qq => qq.id === id ? { ...qq, is_featured: !current } : qq))
    toast.success(!current ? 'Question mise en avant !' : 'Retiré de la vedette')
  }

  const filtered = questions.filter(q => {
    if (filter === 'unanswered') return !q.answer
    if (filter === 'answered') return !!q.answer
    return true
  })

  const unansweredCount = questions.filter(q => !q.answer).length

  return (
    <DashboardLayout navItems={instructorNav} title="Messages Q&A" role="instructor">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text">Questions & Réponses</h1>
          <p className="text-text3 text-sm mt-0.5">Répondez aux questions de vos étudiants</p>
        </div>
        {unansweredCount > 0 && <Badge variant="red">{unansweredCount} sans réponse</Badge>}
      </div>

      {/* Course selector */}
      {courses.length > 1 && (
        <div className="mb-5">
          <select value={selectedCourse} onChange={e => setSelectedCourse(e.target.value)}
            className="bg-card2 border border-border rounded-xl px-4 py-2.5 text-sm text-text outline-none focus:border-blue">
            {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
        </div>
      )}

      {courses.length === 0 ? (
        <Card className="p-8 text-center">
          <MessageSquare size={32} className="text-text3 mx-auto mb-3" />
          <p className="text-text2">Publiez d'abord un cours pour recevoir des questions.</p>
        </Card>
      ) : (
        <>
          <div className="flex gap-1.5 mb-5">
            {([['all','Toutes'], ['unanswered','Sans réponse'], ['answered','Répondues']] as const).map(([v, l]) => (
              <button key={v} onClick={() => setFilter(v)}
                className={clsx('text-xs px-3 py-1.5 rounded-xl transition-colors', filter === v ? 'bg-blue text-white' : 'bg-card2 text-text2 hover:text-text')}>
                {l} {v === 'unanswered' && unansweredCount > 0 ? `(${unansweredCount})` : ''}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center py-16"><Spinner size="lg" /></div>
          ) : filtered.length === 0 ? (
            <Card className="p-8 text-center">
              <CheckCircle size={28} className="text-green mx-auto mb-2" />
              <p className="text-text2 text-sm">{filter === 'unanswered' ? 'Toutes les questions ont une réponse !' : 'Aucune question pour le moment.'}</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {filtered.map((q: any) => (
                <Card key={q.id} className={clsx('overflow-hidden transition-colors', !q.answer && 'border-yellow/20')}>
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      <Avatar src={q.student?.avatar_url} name={q.student?.full_name} size="sm" className="flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-medium text-text">{q.student?.full_name}</p>
                          <span className="text-xs text-text3">{timeAgo(q.created_at)}</span>
                          {q.is_featured && <Badge variant="yellow"><Star size={10} /> Vedette</Badge>}
                          {!q.answer && <Badge variant="yellow">Sans réponse</Badge>}
                          {q.answer && <Badge variant="green"><CheckCircle size={10} /> Répondu</Badge>}
                        </div>
                        <p className="text-sm text-text font-medium mb-2">{q.question}</p>

                        {q.answer && (
                          <div className="bg-blue/5 border border-blue/10 rounded-xl p-3 mb-2">
                            <p className="text-xs text-cyan font-medium mb-1">Votre réponse :</p>
                            <p className="text-sm text-text2">{q.answer}</p>
                          </div>
                        )}

                        <div className="flex items-center gap-2">
                          {!q.answer && (
                            <button onClick={() => setExpandedId(expandedId === q.id ? null : q.id)}
                              className="flex items-center gap-1.5 text-xs text-blue hover:text-cyan transition-colors">
                              Répondre <ChevronDown size={12} className={clsx('transition-transform', expandedId === q.id && 'rotate-180')} />
                            </button>
                          )}
                          {q.answer && (
                            <button onClick={() => setExpandedId(expandedId === q.id ? null : q.id)}
                              className="text-xs text-text3 hover:text-text2 transition-colors">
                              Modifier la réponse
                            </button>
                          )}
                          <button onClick={() => toggleFeatured(q.id, q.is_featured)}
                            className={clsx('flex items-center gap-1 text-xs transition-colors', q.is_featured ? 'text-yellow' : 'text-text3 hover:text-yellow')}>
                            <Star size={11} className={q.is_featured ? 'fill-yellow' : ''} />
                            {q.is_featured ? 'Vedette' : 'Mettre en vedette'}
                          </button>
                        </div>

                        {expandedId === q.id && (
                          <div className="mt-3 space-y-2">
                            <textarea
                              value={answerMap[q.id] || q.answer || ''}
                              onChange={e => setAnswerMap(m => ({ ...m, [q.id]: e.target.value }))}
                              placeholder="Écrivez votre réponse claire et détaillée..."
                              rows={3}
                              className="w-full bg-card2 border border-border rounded-xl px-3 py-2.5 text-sm text-text outline-none focus:border-blue transition-colors resize-none"
                            />
                            <div className="flex gap-2">
                              <Button size="sm" loading={submitting === q.id} onClick={() => submitAnswer(q.id)}>
                                <CheckCircle size={13} /> Publier la réponse
                              </Button>
                              <Button size="sm" variant="secondary" onClick={() => setExpandedId(null)}>Annuler</Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  )
}
