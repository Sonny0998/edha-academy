'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { instructorNav } from '@/lib/nav'
import { createBrowserClient } from '@/lib/supabase/browser'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { Card, Badge, EmptyState, Spinner, ProgressBar } from '@/components/ui'
import Link from 'next/link'
import {
  BookOpen, Users, TrendingUp, Star, Plus, Clock, CheckCircle, XCircle,
  LayoutDashboard, BarChart2, User, MessageSquare, Megaphone,
  Eye, Send, AlertCircle, ArrowRight, Zap
} from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const navItems = [
  { label: 'Tableau de bord', href: '/dashboard/instructor',             icon: <LayoutDashboard size={16} /> },
  { label: 'Mes cours',       href: '/dashboard/instructor/courses',      icon: <BookOpen size={16} /> },
  { label: 'Messages Q&A',   href: '/dashboard/instructor/messages',     icon: <MessageSquare size={16} /> },
  { label: 'Annonces',       href: '/dashboard/instructor/announcements', icon: <Megaphone size={16} /> },
  { label: 'Analytiques',    href: '/dashboard/instructor/analytics',    icon: <BarChart2 size={16} /> },
  { label: 'Mon profil',     href: '/dashboard/instructor/profile',      icon: <User size={16} /> },
]

const STATUS_CONFIG: Record<string, { label: string; variant: any; icon: any; color: string }> = {
  draft:     { label: 'Brouillon',   variant: 'default', icon: Clock,         color: 'text-text3' },
  review:    { label: 'En révision', variant: 'yellow',  icon: Clock,         color: 'text-yellow' },
  published: { label: 'Publié',      variant: 'green',   icon: CheckCircle,   color: 'text-green' },
  archived:  { label: 'Archivé',     variant: 'default', icon: XCircle,       color: 'text-text3' },
}

export default function InstructorDashboard() {
  const { profile } = useAuth()
  const supabase = createBrowserClient()
  const [courses, setCourses] = useState<any[]>([])
  const [stats, setStats] = useState({ students: 0, rating: 0, unanswered: 0 })
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState<string | null>(null)

  const pendingApproval = profile && !(profile as any).instructor_approved_at

  useEffect(() => {
    if (!profile) return
    const load = async () => {
      const { data: coursesData } = await supabase
        .from('courses').select('*,category:categories(name)')
        .eq('instructor_id', profile.id).order('created_at', { ascending: false })
      setCourses(coursesData || [])

      const totalStudents = (coursesData || []).reduce((s: number, c: any) => s + (c.enrolled_count || 0), 0)
      const published = (coursesData || []).filter((c: any) => c.rating_count > 0)
      const avgRating = published.length > 0
        ? published.reduce((s: number, c: any) => s + c.rating_avg, 0) / published.length
        : 0

      // Count unanswered Q&A
      const courseIds = (coursesData || []).map((c: any) => c.id)
      let unanswered = 0
      if (courseIds.length > 0) {
        const { count } = await supabase.from('lesson_qa')
          .select('id', { count: 'exact', head: true })
          .in('course_id', courseIds).is('answer', null)
        unanswered = count || 0
      }

      setStats({ students: totalStudents, rating: avgRating, unanswered })
      setLoading(false)
    }
    load()
  }, [profile])

  const submitForReview = async (courseId: string) => {
    setSubmitting(courseId)
    const { error } = await supabase.from('courses')
      .update({ status: 'review' }).eq('id', courseId)
    if (!error) {
      setCourses(c => c.map(cc => cc.id === courseId ? { ...cc, status: 'review' } : cc))
      toast.success('Cours soumis pour révision !')
    } else {
      toast.error('Erreur lors de la soumission')
    }
    setSubmitting(null)
  }

  if (loading) return (
    <DashboardLayout navItems={instructorNav} title="Tableau de bord" role="instructor">
      <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>
    </DashboardLayout>
  )

  return (
    <DashboardLayout navItems={instructorNav} title="Tableau de bord" role="instructor">

      {/* Pending approval banner */}
      {pendingApproval && (
        <div className="bg-yellow/10 border border-yellow/30 rounded-2xl p-5 mb-6 flex items-start gap-4">
          <AlertCircle size={22} className="text-yellow flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-text">Compte en attente d&apos;approbation</p>
            <p className="text-sm text-text2 mt-1">
              Votre profil est en cours d&apos;examen par l&apos;équipe EDHA Academy.
              Vous recevrez un email dès que votre compte sera approuvé (délai : 48h).
            </p>
          </div>
        </div>
      )}

      {/* Welcome */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text">
            Bonjour, {profile?.full_name?.split(' ')[0]} 👋
          </h1>
          <p className="text-text3 text-sm mt-0.5">Gérez vos cours et suivez vos étudiants</p>
        </div>
        <Link href="/dashboard/instructor/courses/new"
          className="flex items-center gap-2 text-sm text-white font-medium px-4 py-2.5 rounded-xl edha-gradient hover:opacity-90 transition-opacity shadow-sm">
          <Plus size={15} /> Nouveau cours
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total cours',    value: courses.length,                  icon: BookOpen,    color: 'text-blue',   bg: 'bg-blue/10' },
          { label: 'Cours publiés',  value: courses.filter(c => c.status === 'published').length, icon: CheckCircle, color: 'text-green', bg: 'bg-green/10' },
          { label: 'Total étudiants',value: stats.students,                  icon: Users,       color: 'text-purple', bg: 'bg-purple/10' },
          { label: 'Note moyenne',   value: stats.rating > 0 ? `★ ${stats.rating.toFixed(1)}` : '—', icon: Star, color: 'text-yellow', bg: 'bg-yellow/10' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label} className="p-5">
            <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center mb-3`}>
              <Icon size={18} className={color} />
            </div>
            <div className="text-2xl font-bold text-text">{value}</div>
            <div className="text-xs text-text3 mt-0.5">{label}</div>
          </Card>
        ))}
      </div>

      {/* Unanswered Q&A alert */}
      {stats.unanswered > 0 && (
        <Link href="/dashboard/instructor/messages"
          className="flex items-center gap-3 bg-blue/5 border border-blue/20 rounded-xl p-4 mb-6 hover:bg-blue/10 transition-colors">
          <MessageSquare size={18} className="text-blue flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-text">
              {stats.unanswered} question{stats.unanswered > 1 ? 's' : ''} en attente de réponse
            </p>
            <p className="text-xs text-text3">Répondez rapidement pour garder vos étudiants engagés</p>
          </div>
          <ArrowRight size={16} className="text-blue flex-shrink-0" />
        </Link>
      )}

      {/* Courses */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-text">Mes cours</h2>
          <Link href="/dashboard/instructor/courses" className="text-xs text-blue hover:underline">Voir tout</Link>
        </div>

        {courses.length === 0 ? (
          <Card className="p-10">
            <EmptyState
              icon={<BookOpen size={32} />}
              title="Aucun cours créé"
              description="Créez votre premier cours et partagez vos connaissances avec des milliers d'étudiants haïtiens."
              action={
                <Link href="/dashboard/instructor/courses/new"
                  className="inline-flex items-center gap-2 edha-gradient text-white px-5 py-2.5 rounded-xl text-sm font-medium">
                  <Plus size={15} /> Créer mon premier cours
                </Link>
              }
            />
          </Card>
        ) : (
          <div className="space-y-3">
            {courses.slice(0, 5).map((c: any) => {
              const sc = STATUS_CONFIG[c.status] || STATUS_CONFIG.draft
              const StatusIcon = sc.icon
              return (
                <Card key={c.id} className={clsx('p-4 transition-colors hover:border-border2',
                  c.status === 'review' && 'border-yellow/20 bg-yellow/5')}>
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-bg2 rounded-xl flex-shrink-0 overflow-hidden border border-border">
                      {c.thumbnail_url
                        ? <img src={c.thumbnail_url} alt="" className="w-full h-full object-cover" />
                        : <BookOpen size={20} className="text-text3 m-auto mt-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-text truncate">{c.title}</h3>
                      <p className="text-xs text-text3 mt-0.5">{c.category?.name}</p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className={clsx('flex items-center gap-1 text-xs font-medium', sc.color)}>
                          <StatusIcon size={11} /> {sc.label}
                        </span>
                        <span className="text-xs text-text3">{c.enrolled_count} étudiants</span>
                        {c.admin_feedback && (
                          <span className="text-xs text-red truncate max-w-xs">⚠ {c.admin_feedback}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Link href={`/dashboard/instructor/courses/${c.id}/preview`}
                        className="w-8 h-8 bg-bg2 hover:bg-blue/10 rounded-lg flex items-center justify-center text-text3 hover:text-blue transition-all" title="Prévisualiser">
                        <Eye size={14} />
                      </Link>
                      {c.status === 'draft' && (
                        <button onClick={() => submitForReview(c.id)} disabled={submitting === c.id}
                          className="flex items-center gap-1.5 text-xs bg-blue/10 hover:bg-blue text-blue hover:text-white border border-blue/20 px-3 py-1.5 rounded-lg transition-all font-medium disabled:opacity-50">
                          {submitting === c.id ? <Spinner size="sm" /> : <Send size={12} />}
                          Soumettre
                        </button>
                      )}
                      {c.status === 'review' && (
                        <span className="text-xs text-yellow bg-yellow/10 border border-yellow/20 px-3 py-1.5 rounded-lg font-medium flex items-center gap-1">
                          <Clock size={11} /> En attente
                        </span>
                      )}
                      {c.status === 'published' && (
                        <Link href={`/cursos/${c.slug}`} target="_blank"
                          className="text-xs text-green bg-green/10 border border-green/20 px-3 py-1.5 rounded-lg font-medium hover:bg-green/20 transition-colors">
                          Voir →
                        </Link>
                      )}
                    </div>
                  </div>
                </Card>
              )
            })}
            {courses.length > 5 && (
              <Link href="/dashboard/instructor/courses"
                className="flex items-center justify-center gap-2 py-3 text-sm text-blue hover:underline">
                Voir tous les {courses.length} cours <ArrowRight size={14} />
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { href: '/dashboard/instructor/messages', icon: MessageSquare, label: 'Répondre aux Q&A', desc: 'Questions de vos étudiants', badge: stats.unanswered, color: 'text-blue', bg: 'bg-blue/10' },
          { href: '/dashboard/instructor/announcements', icon: Megaphone, label: 'Envoyer une annonce', desc: 'Communiquer avec vos inscrits', badge: 0, color: 'text-purple', bg: 'bg-purple/10' },
          { href: '/dashboard/instructor/analytics', icon: BarChart2, label: 'Voir les analytiques', desc: 'Statistiques de vos cours', badge: 0, color: 'text-green', bg: 'bg-green/10' },
        ].map(({ href, icon: Icon, label, desc, badge, color, bg }) => (
          <Link key={href} href={href}
            className="flex items-center gap-3 p-4 bg-card border border-border rounded-2xl hover:border-blue/20 hover:bg-bg2 transition-all group">
            <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
              <Icon size={18} className={color} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text group-hover:text-blue transition-colors">{label}</p>
              <p className="text-xs text-text3">{desc}</p>
            </div>
            {badge > 0 && (
              <span className="bg-red text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0">{badge}</span>
            )}
          </Link>
        ))}
      </div>
    </DashboardLayout>
  )
}
