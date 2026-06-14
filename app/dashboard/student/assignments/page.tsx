'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { studentNav } from '@/lib/nav'
import { createBrowserClient } from '@/lib/supabase/browser'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { Card, Badge, Spinner, EmptyState } from '@/components/ui'
import {
  LayoutDashboard, BookOpen, Award, Heart, User, Calendar,
  FileText, Upload, CheckCircle, Clock, AlertTriangle, X,
  ClipboardList, Send, ChevronRight, BookMarked
} from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const navItems = [
  { label: 'Tableau de bord',   href: '/dashboard/student',              icon: <LayoutDashboard size={16}/> },
  { label: 'Mes cours',         href: '/dashboard/student/courses',       icon: <BookOpen size={16}/> },
  { label: 'Devoirs',           href: '/dashboard/student/assignments',   icon: <ClipboardList size={16}/> },
  { label: 'Mon horaire',       href: '/dashboard/student/schedule',      icon: <Calendar size={16}/> },
  { label: 'Bulletins',         href: '/dashboard/student/bulletins',     icon: <FileText size={16}/> },
  { label: 'Certificats',       href: '/dashboard/student/certificates',  icon: <Award size={16}/> },
  { label: 'Liste de souhaits', href: '/dashboard/student/wishlist',      icon: <Heart size={16}/> },
  { label: 'Mon profil',        href: '/dashboard/student/profile',       icon: <User size={16}/> },
]

const TYPE_ICONS: Record<string, string> = {
  homework: '📝', project: '🏗️', lab: '🔬',
  oral: '🎤', group: '👥', presentation: '📊'
}

export default function StudentAssignmentsPage() {
  const { profile } = useAuth()
  const supabase = createBrowserClient()

  // Tab state
  const [tab, setTab] = useState<'academic' | 'courses'>('academic')

  // ── ACADEMIC assignments (institutional — matières) ──
  const [acadAssignments, setAcadAssignments] = useState<any[]>([])
  const [acadSubmissions, setAcadSubmissions] = useState<Record<string, any>>({})
  const [texts, setTexts] = useState<Record<string, string>>({})
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState<string | null>(null)

  // ── COURSE assignments (EDHA courses — file upload) ──
  const [courseAssignments, setCourseAssignments] = useState<any[]>([])
  const [courseSubmissions, setCourseSubmissions] = useState<any[]>([])
  const [uploading, setUploading] = useState<string | null>(null)
  const [courseFilter, setCourseFilter] = useState<'all' | 'pending' | 'submitted'>('all')

  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile) return
    const load = async () => {

      // ── 1. Academic assignments (institution) ──
      const { data: instEnroll } = await supabase
        .from('institutional_enrollments')
        .select('institution_id, class_section_id')
        .eq('student_id', profile.id).eq('status', 'active').maybeSingle()

      if (instEnroll) {
        const { data: asgns } = await supabase
          .from('assignments')
          .select('*, period_subject:period_subjects!period_subject_id(subject:academic_subjects(name, color))')
          .eq('institution_id', instEnroll.institution_id)
          .eq('status', 'published')
          .order('due_date', { ascending: true })

        setAcadAssignments(asgns || [])

        if (asgns?.length) {
          const { data: subs } = await supabase
            .from('assignment_submissions')
            .select('*')
            .eq('student_id', profile.id)
            .in('assignment_id', asgns.map((a: any) => a.id))
          const subMap: Record<string, any> = {}
          for (const s of subs || []) subMap[s.assignment_id] = s
          setAcadSubmissions(subMap)
        }
      }

      // ── 2. Course assignments (EDHA courses) ──
      const { data: enrollData } = await supabase
        .from('enrollments').select('course_id').eq('student_id', profile.id)
      const courseIds = (enrollData || []).map((e: any) => e.course_id)

      if (courseIds.length > 0) {
        const { data: aData } = await supabase
          .from('assignments')
          .select('*, course:courses(title, slug), lesson:lessons(title)')
          .in('course_id', courseIds)
          .order('due_date', { ascending: true })

        const { data: sData } = await supabase
          .from('assignment_submissions')
          .select('*')
          .eq('student_id', profile.id)
          .in('assignment_id', (aData || []).map((a: any) => a.id))

        setCourseAssignments(aData || [])
        setCourseSubmissions(sData || [])
      }

      setLoading(false)
    }
    load()
  }, [profile])

  // ── Academic submission ──
  const submitAcad = async (assignmentId: string) => {
    if (!profile) return
    const text = texts[assignmentId] || ''
    if (!text.trim()) { toast.error('Rédigez votre réponse avant de soumettre'); return }
    setSubmitting(assignmentId)
    const assignment = acadAssignments.find(a => a.id === assignmentId)
    const isLate = assignment && new Date(assignment.due_date) < new Date()
    const { error } = await supabase.from('assignment_submissions').upsert({
      assignment_id:  assignmentId,
      student_id:     profile.id,
      institution_id: assignment?.institution_id,
      content_text:   text.trim(),
      submitted_at:   new Date().toISOString(),
      is_late:        isLate,
      status:         'submitted',
    }, { onConflict: 'assignment_id,student_id' })
    if (error) toast.error(error.message)
    else {
      toast.success('Devoir soumis !')
      setAcadSubmissions(s => ({ ...s, [assignmentId]: { status: 'submitted', content_text: text, is_late: isLate } }))
      setExpandedId(null)
    }
    setSubmitting(null)
  }

  // ── Course file upload ──
  const handleFileUpload = async (assignmentId: string, file: File) => {
    if (!profile) return
    if (file.size > 20 * 1024 * 1024) { toast.error('Max 20 MB'); return }
    setUploading(assignmentId)
    try {
      const ext = file.name.split('.').pop()
      const path = `assignments/${profile.id}/${assignmentId}-${Date.now()}.${ext}`
      const { error: uploadErr } = await supabase.storage
        .from('course-resources').upload(path, file, { contentType: file.type })
      if (uploadErr) { toast.error('Erreur upload'); return }
      const { data: urlData } = supabase.storage.from('course-resources').getPublicUrl(path)
      const { error: subErr } = await supabase.from('assignment_submissions').upsert({
        assignment_id: assignmentId, student_id: profile.id,
        file_url: urlData.publicUrl, file_name: file.name,
        submitted_at: new Date().toISOString(), status: 'submitted',
      }, { onConflict: 'assignment_id,student_id' })
      if (subErr) { toast.error(subErr.message); return }
      setCourseSubmissions(prev => {
        const idx = prev.findIndex(s => s.assignment_id === assignmentId)
        const newSub = { assignment_id: assignmentId, student_id: profile.id,
          file_url: urlData.publicUrl, file_name: file.name,
          submitted_at: new Date().toISOString(), status: 'submitted' }
        if (idx >= 0) { const c = [...prev]; c[idx] = newSub; return c }
        return [...prev, newSub]
      })
      toast.success('Devoir soumis !')
    } catch { toast.error('Erreur inattendue') }
    setUploading(null)
  }

  // ── Helpers ──
  const getDueStatus = (dueDate: string) => {
    if (!dueDate) return { label: 'Pas de limite', color: 'text-text3', bg: 'bg-bg2', icon: Clock }
    const diff = new Date(dueDate).getTime() - Date.now()
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
    if (diff < 0) return { label: 'Expiré', color: 'text-red', bg: 'bg-red/10', icon: AlertTriangle }
    if (days <= 2) return { label: `${days}j`, color: 'text-red', bg: 'bg-red/10', icon: Clock }
    if (days <= 7) return { label: `${days}j`, color: 'text-yellow', bg: 'bg-yellow/10', icon: Clock }
    return { label: `${days}j`, color: 'text-green', bg: 'bg-green/10', icon: Clock }
  }

  const getCourseStatus = (a: any) => {
    const sub = courseSubmissions.find(s => s.assignment_id === a.id)
    if (sub) return 'submitted'
    if (!a.due_date) return 'pending'
    const diff = new Date(a.due_date).getTime() - Date.now()
    if (diff < 0) return 'late'
    if (diff < 48 * 3600 * 1000) return 'urgent'
    return 'pending'
  }

  // Counts for badges
  const acadPending  = acadAssignments.filter(a => !acadSubmissions[a.id]).length
  const coursePending = courseAssignments.filter(a => getCourseStatus(a) !== 'submitted').length
  const totalPending = acadPending + coursePending

  const filteredCourse = courseAssignments.filter(a => {
    if (courseFilter === 'pending')   return getCourseStatus(a) !== 'submitted'
    if (courseFilter === 'submitted') return getCourseStatus(a) === 'submitted'
    return true
  })

  if (loading) return (
    <DashboardLayout navItems={navItems} title="Devoirs" role="student">
      <div className="flex justify-center py-16"><Spinner size="lg"/></div>
    </DashboardLayout>
  )

  return (
    <DashboardLayout navItems={navItems} title="Devoirs" role="student">
      <div className="max-w-3xl">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-text">Mes devoirs</h1>
            {totalPending > 0 && (
              <p className="text-sm text-text3 mt-0.5">
                <span className="text-red font-semibold">{totalPending}</span> devoir{totalPending > 1 ? 's' : ''} à rendre
              </p>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-bg2 border border-border rounded-2xl p-1 mb-6">
          <button onClick={() => setTab('academic')}
            className={clsx('flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all',
              tab === 'academic' ? 'bg-card shadow-sm text-text' : 'text-text3 hover:text-text')}>
            <BookMarked size={15} />
            Matières académiques
            {acadPending > 0 && (
              <span className="bg-red text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                {acadPending}
              </span>
            )}
          </button>
          <button onClick={() => setTab('courses')}
            className={clsx('flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all',
              tab === 'courses' ? 'bg-card shadow-sm text-text' : 'text-text3 hover:text-text')}>
            <BookOpen size={15} />
            Cours EDHA
            {coursePending > 0 && (
              <span className="bg-red text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                {coursePending}
              </span>
            )}
          </button>
        </div>

        {/* ═══ TAB: ACADEMIC ASSIGNMENTS ═══ */}
        {tab === 'academic' && (
          <div className="space-y-3">
            {acadAssignments.length === 0 ? (
              <Card className="p-10">
                <EmptyState icon={<BookMarked size={28}/>}
                  title="Aucun devoir académique"
                  description="Votre institution n'a pas encore publié de devoirs pour vos matières." />
              </Card>
            ) : (
              <>
                {/* Pending */}
                {acadAssignments.filter(a => !acadSubmissions[a.id]).length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-text3 uppercase tracking-wider mb-2 px-1">À rendre</p>
                    <div className="space-y-3">
                      {acadAssignments.filter(a => !acadSubmissions[a.id]).map(a => {
                        const ds = getDueStatus(a.due_date)
                        const DueIcon = ds.icon
                        const isExpanded = expandedId === a.id
                        return (
                          <Card key={a.id} className={clsx('overflow-hidden', isExpanded && 'border-blue/20')}>
                            <div className="p-4 flex items-start gap-3">
                              <div className="text-2xl flex-shrink-0 mt-0.5">
                                {TYPE_ICONS[a.assignment_type] || '📝'}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-text">{a.title}</h3>
                                {a.period_subject?.subject?.name && (
                                  <p className="text-xs mt-0.5" style={{ color: a.period_subject.subject.color }}>
                                    ● {a.period_subject.subject.name}
                                  </p>
                                )}
                                {a.description && (
                                  <p className="text-xs text-text2 mt-1 line-clamp-2">{a.description}</p>
                                )}
                                <div className="flex items-center gap-2 mt-2">
                                  <span className={clsx('flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full', ds.color, ds.bg)}>
                                    <DueIcon size={10} /> {ds.label}
                                  </span>
                                  {a.due_date && (
                                    <span className="text-xs text-text3">
                                      {new Date(a.due_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  )}
                                  <span className="text-xs text-text3">/{a.max_score} pts</span>
                                </div>
                              </div>
                              <button onClick={() => setExpandedId(isExpanded ? null : a.id)}
                                className="text-xs text-blue hover:underline flex-shrink-0 font-medium flex items-center gap-1">
                                {isExpanded ? 'Fermer' : 'Répondre'}
                                <ChevronRight size={12} className={clsx('transition-transform', isExpanded && 'rotate-90')} />
                              </button>
                            </div>
                            {isExpanded && (
                              <div className="border-t border-border p-4 bg-bg2">
                                {a.instructions && (
                                  <div className="bg-blue/5 border border-blue/20 rounded-xl p-3 mb-3">
                                    <p className="text-xs font-semibold text-blue mb-1">Instructions</p>
                                    <p className="text-xs text-text2 whitespace-pre-line">{a.instructions}</p>
                                  </div>
                                )}
                                <textarea value={texts[a.id] || ''}
                                  onChange={e => setTexts(t => ({ ...t, [a.id]: e.target.value }))}
                                  rows={6} placeholder="Rédigez votre réponse ici..."
                                  className="w-full bg-white border border-border rounded-xl px-4 py-3 text-sm text-text outline-none focus:border-blue/50 resize-none" />
                                <div className="flex items-center justify-between mt-3">
                                  <p className="text-xs text-text3">{texts[a.id]?.length || 0} caractères</p>
                                  <button onClick={() => submitAcad(a.id)}
                                    disabled={submitting === a.id || !texts[a.id]?.trim()}
                                    className="flex items-center gap-2 text-sm text-white font-medium px-4 py-2 rounded-xl edha-gradient disabled:opacity-40 hover:opacity-90">
                                    {submitting === a.id
                                      ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                      : <Send size={13} />}
                                    Soumettre
                                  </button>
                                </div>
                              </div>
                            )}
                          </Card>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Submitted / Graded */}
                {acadAssignments.filter(a => acadSubmissions[a.id]).length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs font-semibold text-text3 uppercase tracking-wider mb-2 px-1">Rendus</p>
                    <div className="space-y-2">
                      {acadAssignments.filter(a => acadSubmissions[a.id]).map(a => {
                        const sub = acadSubmissions[a.id]
                        const isGraded = sub?.score !== null && sub?.score !== undefined
                        return (
                          <Card key={a.id} className={clsx('p-4', isGraded ? 'border-green/20 bg-green/5' : 'opacity-75')}>
                            <div className="flex items-center gap-3">
                              <div className="text-xl">{TYPE_ICONS[a.assignment_type] || '📝'}</div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-text">{a.title}</p>
                                <p className="text-xs text-text3">
                                  Rendu le {new Date(sub.submitted_at || Date.now()).toLocaleDateString('fr-FR')}
                                  {sub.is_late && ' (tardif)'}
                                </p>
                              </div>
                              {isGraded ? (
                                <div className="text-right flex-shrink-0">
                                  <p className={clsx('text-lg font-bold',
                                    sub.score >= a.max_score * 0.5 ? 'text-green' : 'text-red')}>
                                    {sub.score}/{a.max_score}
                                  </p>
                                  {sub.feedback && (
                                    <p className="text-[10px] text-text3 max-w-32 truncate">{sub.feedback}</p>
                                  )}
                                </div>
                              ) : (
                                <span className="text-xs bg-yellow/10 text-yellow px-2.5 py-1 rounded-full border border-yellow/20 flex-shrink-0">
                                  En correction
                                </span>
                              )}
                            </div>
                          </Card>
                        )
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ═══ TAB: COURSE ASSIGNMENTS (EDHA) ═══ */}
        {tab === 'courses' && (
          <div>
            {/* Filter */}
            <div className="flex gap-1.5 mb-4">
              {(['all', 'pending', 'submitted'] as const).map(f => (
                <button key={f} onClick={() => setCourseFilter(f)}
                  className={clsx('text-xs px-3 py-2 rounded-xl font-medium transition-colors',
                    courseFilter === f ? 'edha-gradient text-white' : 'bg-card border border-border text-text2')}>
                  {f === 'all' ? 'Tous' : f === 'pending' ? 'À rendre' : 'Soumis'}
                </button>
              ))}
            </div>

            {filteredCourse.length === 0 ? (
              <Card className="p-10">
                <EmptyState icon={<FileText size={28}/>}
                  title="Aucun devoir"
                  description="Vous n'avez pas de devoirs à rendre pour vos cours EDHA." />
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredCourse.map(a => {
                  const status = getCourseStatus(a)
                  const sub = courseSubmissions.find(s => s.assignment_id === a.id)
                  const isUploading = uploading === a.id
                  const ds = getDueStatus(a.due_date)

                  return (
                    <Card key={a.id} className={clsx('p-5',
                      status === 'urgent' && 'border-yellow/30 bg-yellow/5',
                      status === 'late' && 'border-red/20')}>
                      <div className="flex items-start gap-4">
                        <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                          status === 'submitted' ? 'bg-green/10' :
                          status === 'urgent' ? 'bg-yellow/10' :
                          status === 'late' ? 'bg-red/10' : 'bg-bg2')}>
                          {status === 'submitted'
                            ? <CheckCircle size={18} className="text-green" />
                            : status === 'urgent' || status === 'late'
                              ? <AlertTriangle size={18} className={status === 'late' ? 'text-red' : 'text-yellow'} />
                              : <Clock size={18} className="text-text3" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="font-semibold text-text">{a.title}</h3>
                            <span className={clsx('text-[10px] font-medium px-2 py-0.5 rounded-full',
                              status === 'submitted' ? 'bg-green/10 text-green' :
                              status === 'late' ? 'bg-red/10 text-red' :
                              status === 'urgent' ? 'bg-yellow/10 text-yellow' :
                              'bg-bg2 text-text3')}>
                              {status === 'submitted' ? 'Soumis' : status === 'late' ? 'En retard' : status === 'urgent' ? 'Urgent' : 'À rendre'}
                            </span>
                          </div>
                          <p className="text-xs text-text3 mb-2">
                            {a.course?.title}{a.lesson?.title ? ` · ${a.lesson.title}` : ''}
                          </p>
                          {a.description && (
                            <p className="text-sm text-text2 mb-3 leading-relaxed line-clamp-2">{a.description}</p>
                          )}
                          <div className="flex items-center gap-3 mb-3 text-xs text-text3">
                            {a.due_date && (
                              <span className={clsx('flex items-center gap-1', (status === 'urgent' || status === 'late') && 'text-yellow font-medium')}>
                                <Clock size={11} />
                                {new Date(a.due_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                            {a.max_score && <span>/{a.max_score} pts</span>}
                          </div>

                          {sub ? (
                            <div className="flex items-center gap-3 bg-green/10 border border-green/20 rounded-xl px-4 py-2.5">
                              <CheckCircle size={15} className="text-green flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-text truncate">{sub.file_name}</p>
                                <p className="text-xs text-text3">
                                  Soumis le {new Date(sub.submitted_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                              {sub.file_url && (
                                <a href={sub.file_url} target="_blank" rel="noopener noreferrer"
                                  className="text-xs text-blue hover:underline flex-shrink-0">Voir</a>
                              )}
                              <label className="cursor-pointer text-xs text-text3 hover:text-blue transition-colors flex-shrink-0">
                                Modifier
                                <input type="file" className="hidden"
                                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(a.id, f) }} />
                              </label>
                            </div>
                          ) : (
                            <label className={clsx(
                              'flex items-center gap-3 border-2 border-dashed rounded-xl px-4 py-3 cursor-pointer transition-colors',
                              isUploading ? 'border-blue/40 bg-blue/5' :
                              status === 'late' ? 'border-red/30 hover:border-red/50' :
                              'border-border hover:border-blue/40 hover:bg-blue/5'
                            )}>
                              {isUploading ? (
                                <><Spinner size="sm" /><span className="text-sm text-blue">Envoi en cours...</span></>
                              ) : (
                                <>
                                  <Upload size={16} className="text-text3 flex-shrink-0" />
                                  <span className="text-sm text-text2">Cliquez pour soumettre votre devoir</span>
                                  <span className="text-xs text-text3 ml-auto">PDF, DOC, ZIP · max 20MB</span>
                                </>
                              )}
                              <input type="file" className="hidden" disabled={isUploading}
                                accept=".pdf,.doc,.docx,.zip,.txt,.png,.jpg,.jpeg"
                                onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(a.id, f) }} />
                            </label>
                          )}
                        </div>
                      </div>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}