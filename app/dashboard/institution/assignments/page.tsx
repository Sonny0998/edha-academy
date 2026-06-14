'use client'
import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { createBrowserClient } from '@/lib/supabase/browser'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { Card, Spinner } from '@/components/ui'
import {
  LayoutDashboard, BookOpen, UserCheck, Users, BarChart2, Globe,
  Settings, Layers, GraduationCap, Users2, ArrowLeft,
  CheckCircle, Clock, AlertTriangle, Save, User
} from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import Link from 'next/link'

const navItems = [
  { label: 'Vue d\'ensemble', href: '/dashboard/institution',            icon: <LayoutDashboard size={16} /> },
  { label: 'Programmes',      href: '/dashboard/institution/programs',   icon: <Layers size={16} /> },
  { label: 'Cohortes',        href: '/dashboard/institution/cohorts',    icon: <Users2 size={16} /> },
  { label: 'Mode académique', href: '/dashboard/institution/academic',   icon: <GraduationCap size={16} /> },
  { label: 'Cours',           href: '/dashboard/institution/courses',    icon: <BookOpen size={16} /> },
  { label: 'Équipe',          href: '/dashboard/institution/teachers',   icon: <UserCheck size={16} /> },
  { label: 'Étudiants',       href: '/dashboard/institution/students',   icon: <Users size={16} /> },
  { label: 'Analytiques',     href: '/dashboard/institution/analytics',  icon: <BarChart2 size={16} /> },
  { label: 'Page publique',   href: '/dashboard/institution/profile',    icon: <Globe size={16} /> },
  { label: 'Paramètres',      href: '/dashboard/institution/settings',   icon: <Settings size={16} /> },
]

export default function AssignmentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { profile } = useAuth()
  const supabase = createBrowserClient()
  const router = useRouter()

  const [assignment, setAssignment] = useState<any>(null)
  const [submissions, setSubmissions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [grades, setGrades] = useState<Record<string, string>>({})
  const [feedback, setFeedback] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!profile || !id) return
    const { data: a } = await supabase.from('assignments')
      .select('*, period_subject:period_subjects!period_subject_id(subject:academic_subjects(name, color))')
      .eq('id', id).eq('institution_id', profile.id).single()
    if (!a) { router.replace('/dashboard/institution/assignments'); return }
    setAssignment(a)

    const { data: subs } = await supabase.from('assignment_submissions')
      .select('*, student:profiles!student_id(full_name, avatar_url, email)')
      .eq('assignment_id', id)
      .order('submitted_at', { ascending: false })

    setSubmissions(subs || [])
    const g: Record<string, string> = {}
    const f: Record<string, string> = {}
    for (const s of subs || []) {
      if (s.score !== null) g[s.student_id] = s.score.toString()
      if (s.feedback) f[s.student_id] = s.feedback
    }
    setGrades(g)
    setFeedback(f)
    setLoading(false)
  }, [profile, id])

  useEffect(() => { load() }, [load])

  const saveGrade = async (submission: any) => {
    const score = parseFloat(grades[submission.student_id] || '')
    if (isNaN(score)) { toast.error('Note invalide'); return }
    if (score < 0 || score > (assignment?.max_score || 20)) {
      toast.error(`Note entre 0 et ${assignment?.max_score || 20}`)
      return
    }
    setSaving(submission.student_id)
    const { error } = await supabase.from('assignment_submissions').upsert({
      assignment_id:  id,
      student_id:     submission.student_id,
      institution_id: profile!.id,
      score,
      feedback:       feedback[submission.student_id] || null,
      graded_at:      new Date().toISOString(),
      graded_by:      profile!.id,
      status:         'graded',
    }, { onConflict: 'assignment_id,student_id' })
    if (error) toast.error(error.message)
    else toast.success('Note enregistrée !')
    setSaving(null)
  }

  const submittedCount = submissions.filter(s => s.status !== 'draft').length
  const gradedCount    = submissions.filter(s => s.score !== null).length
  const avgScore       = gradedCount > 0
    ? Math.round((submissions.filter(s => s.score !== null).reduce((sum, s) => sum + s.score, 0) / gradedCount) * 100) / 100
    : null

  const isOverdue = assignment && new Date(assignment.due_date) < new Date()

  if (loading) return (
    <DashboardLayout navItems={navItems} title="Devoir" role="institution">
      <div className="flex justify-center py-16"><Spinner size="lg" /></div>
    </DashboardLayout>
  )

  return (
    <DashboardLayout navItems={navItems} title={assignment?.title || 'Devoir'} role="institution">
      <div className="max-w-4xl">
        <Link href="/dashboard/institution/assignments"
          className="inline-flex items-center gap-1.5 text-xs text-text3 hover:text-text mb-5 transition-colors">
          <ArrowLeft size={12} /> Tous les devoirs
        </Link>

        {/* Header */}
        <div className="bg-card border border-border rounded-2xl p-6 mb-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h1 className="text-xl font-bold text-text">{assignment?.title}</h1>
              {assignment?.period_subject?.subject?.name && (
                <p className="text-sm mt-0.5" style={{ color: assignment.period_subject.subject.color }}>
                  ● {assignment.period_subject.subject.name}
                </p>
              )}
              {assignment?.description && (
                <p className="text-sm text-text2 mt-2">{assignment.description}</p>
              )}
            </div>
            <div className="text-right flex-shrink-0">
              <p className={clsx('text-sm font-semibold', isOverdue ? 'text-red' : 'text-text')}>
                {isOverdue ? 'Expiré' : 'Actif'}
              </p>
              <p className="text-xs text-text3">
                Limite: {new Date(assignment?.due_date).toLocaleDateString('fr-FR', {
                  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                })}
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 pt-4 border-t border-border">
            {[
              { label: 'Rendus', value: submittedCount, color: 'text-blue' },
              { label: 'Notés',  value: gradedCount,    color: 'text-green' },
              { label: 'Moyenne', value: avgScore !== null ? `${avgScore}/${assignment?.max_score}` : '—', color: 'text-yellow' },
              { label: 'Max',    value: `${assignment?.max_score}/20`, color: 'text-text' },
            ].map(({ label, value, color }) => (
              <div key={label} className="text-center">
                <p className={clsx('text-xl font-bold', color)}>{value}</p>
                <p className="text-xs text-text3">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Instructions */}
        {assignment?.instructions && (
          <Card className="p-5 mb-6">
            <h3 className="font-semibold text-text text-sm mb-2">Instructions</h3>
            <p className="text-sm text-text2 whitespace-pre-line">{assignment.instructions}</p>
          </Card>
        )}

        {/* Submissions */}
        <h2 className="font-semibold text-text mb-3">
          Rendus des étudiants
          <span className="ml-2 text-xs text-text3 font-normal">{submittedCount} rendu{submittedCount > 1 ? 's' : ''}</span>
        </h2>

        {submissions.length === 0 ? (
          <Card className="p-10 text-center">
            <Clock size={28} className="text-text3 mx-auto mb-3" />
            <p className="text-sm text-text2">Aucun rendu pour le moment</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {submissions.map(s => {
              const isGraded = s.score !== null
              const isPassing = s.score !== null && s.score >= (assignment?.max_score || 20) * 0.5
              return (
                <Card key={s.id} className={clsx('p-5',
                  isGraded ? (isPassing ? 'border-green/20' : 'border-red/20') : '')}>
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-bg2 border border-border flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {s.student?.avatar_url
                        ? <img src={s.student.avatar_url} alt="" className="w-full h-full object-cover" />
                        : <User size={16} className="text-text3" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-text">{s.student?.full_name}</p>
                        <span className={clsx('text-[10px] font-medium px-2 py-0.5 rounded-full',
                          s.status === 'graded' ? 'bg-green/10 text-green' :
                          s.status === 'submitted' ? 'bg-blue/10 text-blue' :
                          'bg-bg2 text-text3')}>
                          {s.status === 'graded' ? 'Noté' : s.status === 'submitted' ? 'Rendu' : s.status}
                        </span>
                        {s.is_late && (
                          <span className="text-[10px] bg-yellow/10 text-yellow px-2 py-0.5 rounded-full">Tardif</span>
                        )}
                      </div>

                      <p className="text-xs text-text3 mb-2">
                        Rendu le {new Date(s.submitted_at).toLocaleDateString('fr-FR', {
                          day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                        })}
                      </p>

                      {/* Student content */}
                      {s.content_text && (
                        <div className="bg-bg2 rounded-xl p-3 mb-3 text-sm text-text2 max-h-24 overflow-y-auto">
                          {s.content_text}
                        </div>
                      )}

                      {/* Grading */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="block text-xs font-medium text-text2">
                            Note / {assignment?.max_score}
                          </label>
                          <div className="flex items-center gap-2">
                            <input type="number" min="0" max={assignment?.max_score}
                              step="0.25"
                              value={grades[s.student_id] || ''}
                              onChange={e => setGrades(g => ({ ...g, [s.student_id]: e.target.value }))}
                              placeholder="—"
                              className={clsx(
                                'w-24 text-center rounded-xl px-3 py-1.5 text-sm font-bold outline-none border transition-colors',
                                grades[s.student_id]
                                  ? parseFloat(grades[s.student_id]) >= (assignment?.max_score || 20) * 0.5
                                    ? 'border-green/30 bg-green/5 text-green'
                                    : 'border-red/30 bg-red/5 text-red'
                                  : 'border-border bg-bg2 text-text'
                              )}
                            />
                            <span className="text-xs text-text3">/ {assignment?.max_score}</span>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="block text-xs font-medium text-text2">Commentaire</label>
                          <input value={feedback[s.student_id] || ''}
                            onChange={e => setFeedback(f => ({ ...f, [s.student_id]: e.target.value }))}
                            placeholder="Retour à l'étudiant..."
                            className="w-full bg-bg2 border border-border rounded-xl px-3 py-1.5 text-sm text-text outline-none focus:border-blue/50" />
                        </div>
                      </div>
                    </div>

                    <button onClick={() => saveGrade(s)}
                      disabled={saving === s.student_id || !grades[s.student_id]}
                      className="flex items-center gap-1.5 text-xs text-white edha-gradient px-3 py-2 rounded-xl disabled:opacity-40 hover:opacity-90 flex-shrink-0">
                      {saving === s.student_id
                        ? <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        : <Save size={12} />}
                      Noter
                    </button>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}