'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { studentNav } from '@/lib/nav'
import { createBrowserClient } from '@/lib/supabase/browser'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { Card, Badge, Spinner } from '@/components/ui'
import Link from 'next/link'
import {
  LayoutDashboard, BookOpen, Award, Heart, User, Calendar,
  Clock, Lock, AlertTriangle, CheckCircle, HelpCircle, FileText
} from 'lucide-react'
import clsx from 'clsx'

const navItems = [
  { label: 'Tableau de bord',  href: '/dashboard/student',              icon: <LayoutDashboard size={16}/> },
  { label: 'Mes cours',        href: '/dashboard/student/courses',       icon: <BookOpen size={16}/> },
  { label: 'Calendrier',       href: '/dashboard/student/calendar',      icon: <Calendar size={16}/> },
  { label: 'Certificats',      href: '/dashboard/student/certificates',  icon: <Award size={16}/> },
  { label: 'Liste de souhaits',href: '/dashboard/student/wishlist',      icon: <Heart size={16}/> },
  { label: 'Mon profil',       href: '/dashboard/student/profile',       icon: <User size={16}/> },
]

type DeadlineItem = {
  lesson_id: string
  lesson_title: string
  content_type: string
  opens_at: string | null
  due_at: string | null
  closes_at: string | null
  time_limit_min: number | null
  max_attempts: number
  course_id: string
  course_title: string
  course_slug: string
  status: 'upcoming' | 'open' | 'due_soon' | 'late' | 'closed'
}

function getStatus(item: DeadlineItem): DeadlineItem['status'] {
  const now = new Date()
  if (item.closes_at && new Date(item.closes_at) < now) return 'closed'
  if (item.due_at && new Date(item.due_at) < now) return 'late'
  if (item.due_at) {
    const hoursLeft = (new Date(item.due_at).getTime() - now.getTime()) / (1000 * 3600)
    if (hoursLeft < 24) return 'due_soon'
  }
  if (item.opens_at && new Date(item.opens_at) > now) return 'upcoming'
  return 'open'
}

const STATUS_CONFIG = {
  upcoming:  { label: 'À venir',      color: 'text-text3',  bg: 'bg-card2',         icon: Calendar },
  open:      { label: 'Ouvert',       color: 'text-green',  bg: 'bg-green/10',      icon: CheckCircle },
  due_soon:  { label: 'Urgent !',     color: 'text-yellow', bg: 'bg-yellow/10',     icon: AlertTriangle },
  late:      { label: 'En retard',    color: 'text-orange', bg: 'bg-orange/10',     icon: AlertTriangle },
  closed:    { label: 'Fermé',        color: 'text-red',    bg: 'bg-red/10',        icon: Lock },
}

function timeLeft(date: string) {
  const diff = new Date(date).getTime() - Date.now()
  if (diff <= 0) return null
  const d = Math.floor(diff / 86400000)
  const h = Math.floor((diff % 86400000) / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  if (d > 0) return `${d}j ${h}h`
  if (h > 0) return `${h}h ${m}min`
  return `${m} min`
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

function groupByMonth(items: DeadlineItem[]) {
  const groups: Record<string, DeadlineItem[]> = {}
  items.forEach(item => {
    const d = item.due_at || item.closes_at || item.opens_at
    if (!d) return
    const key = new Date(d).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    if (!groups[key]) groups[key] = []
    groups[key].push(item)
  })
  return groups
}

export default function StudentCalendarPage() {
  const { profile } = useAuth()
  const supabase = createBrowserClient()
  const [items, setItems] = useState<DeadlineItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'open' | 'upcoming' | 'closed'>('open')

  useEffect(() => {
    if (!profile) return
    const load = async () => {
      // Get enrolled course IDs
      const { data: enrollments } = await supabase
        .from('enrollments').select('course_id').eq('student_id', profile.id)
      const courseIds = (enrollments || []).map((e: any) => e.course_id)
      if (courseIds.length === 0) { setLoading(false); return }

      // Get lessons with schedule from enrolled courses
      const { data: lessons } = await supabase
        .from('lessons')
        .select('id,title,content_type,opens_at,due_at,closes_at,time_limit_min,max_attempts,course_id,course:courses(id,title,slug)')
        .in('course_id', courseIds)
        .or('due_at.not.is.null,closes_at.not.is.null')
        .eq('is_published', true)
        .order('due_at', { ascending: true })

      const mapped = (lessons || []).map((l: any) => ({
        lesson_id: l.id,
        lesson_title: l.title,
        content_type: l.content_type,
        opens_at: l.opens_at,
        due_at: l.due_at,
        closes_at: l.closes_at,
        time_limit_min: l.time_limit_min,
        max_attempts: l.max_attempts,
        course_id: l.course?.id,
        course_title: l.course?.title,
        course_slug: l.course?.slug,
        status: 'open' as any,
      })).map((i: any) => ({ ...i, status: getStatus(i) }))

      setItems(mapped)
      setLoading(false)
    }
    load()
  }, [profile])

  const filtered = items.filter(i => {
    if (filter === 'open') return ['open', 'due_soon', 'late'].includes(i.status)
    if (filter === 'upcoming') return i.status === 'upcoming'
    if (filter === 'closed') return i.status === 'closed'
    return true
  })

  const grouped = groupByMonth(filtered)
  const urgentCount = items.filter(i => ['due_soon', 'late'].includes(i.status)).length

  if (loading) return (
    <DashboardLayout navItems={studentNav} title="Calendrier" role="student">
      <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>
    </DashboardLayout>
  )

  return (
    <DashboardLayout navItems={studentNav} title="Calendrier" role="student">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text">Calendrier des évaluations</h1>
          <p className="text-text3 text-sm mt-0.5">Quiz, examens et devoirs à rendre</p>
        </div>
        {urgentCount > 0 && (
          <div className="flex items-center gap-2 bg-yellow/10 border border-yellow/20 rounded-xl px-4 py-2">
            <AlertTriangle size={16} className="text-yellow" />
            <span className="text-sm text-yellow font-medium">{urgentCount} urgent{urgentCount > 1 ? 's' : ''}</span>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-1.5 mb-6 flex-wrap">
        {([
          ['all',      'Tout'],
          ['open',     'En cours'],
          ['upcoming', 'À venir'],
          ['closed',   'Fermés'],
        ] as const).map(([v, l]) => (
          <button key={v} onClick={() => setFilter(v)}
            className={clsx('text-xs px-3 py-1.5 rounded-xl transition-colors', filter === v ? 'edha-gradient text-white' : 'bg-card2 text-text2 hover:text-text')}>
            {l}
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <Card className="p-10 text-center">
          <Calendar size={36} className="text-text3 mx-auto mb-3" />
          <p className="text-text2 font-medium mb-1">Aucune évaluation programmée</p>
          <p className="text-text3 text-sm">Vos instructeurs n'ont pas encore fixé de dates pour les quiz et devoirs.</p>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="p-8 text-center">
          <CheckCircle size={28} className="text-green mx-auto mb-2" />
          <p className="text-text2">Rien dans cette catégorie</p>
        </Card>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([month, monthItems]) => (
            <div key={month}>
              <h2 className="text-sm font-semibold text-text3 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Calendar size={13} /> {month}
              </h2>
              <div className="space-y-3">
                {monthItems.map(item => {
                  const sc = STATUS_CONFIG[item.status]
                  const StatusIcon = sc.icon
                  const keyDate = item.due_at || item.closes_at
                  const tLeft = keyDate && item.status !== 'closed' ? timeLeft(keyDate) : null

                  return (
                    <Card key={item.lesson_id} className={clsx(
                      'overflow-hidden transition-all',
                      item.status === 'due_soon' && 'border-yellow/30',
                      item.status === 'late' && 'border-orange/30',
                      item.status === 'closed' && 'opacity-60',
                    )}>
                      {/* Color bar */}
                      <div className={clsx('h-1', {
                        'bg-green': item.status === 'open',
                        'bg-yellow': item.status === 'due_soon',
                        'bg-orange-400': item.status === 'late',
                        'bg-red': item.status === 'closed',
                        'bg-border': item.status === 'upcoming',
                      })} />

                      <div className="p-4 flex items-start gap-4">
                        {/* Type icon */}
                        <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', sc.bg)}>
                          {item.content_type === 'quiz'
                            ? <HelpCircle size={18} className={sc.color} />
                            : <FileText size={18} className={sc.color} />}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-semibold text-text truncate">{item.lesson_title}</p>
                              <p className="text-xs text-text3 mt-0.5">{item.course_title}</p>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <Badge variant={
                                item.status === 'open' ? 'green' :
                                item.status === 'due_soon' ? 'yellow' :
                                item.status === 'closed' ? 'red' : 'default'
                              }>
                                <StatusIcon size={10} /> {sc.label}
                              </Badge>
                            </div>
                          </div>

                          {/* Dates */}
                          <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
                            {item.opens_at && (
                              <div className="flex items-start gap-1.5 text-xs">
                                <Calendar size={11} className="text-green mt-0.5 flex-shrink-0" />
                                <div>
                                  <p className="text-text3">Ouverture</p>
                                  <p className="text-text2 font-medium">{formatDate(item.opens_at)}</p>
                                </div>
                              </div>
                            )}
                            {item.due_at && (
                              <div className="flex items-start gap-1.5 text-xs">
                                <Clock size={11} className="text-yellow mt-0.5 flex-shrink-0" />
                                <div>
                                  <p className="text-text3">Date limite</p>
                                  <p className="text-yellow font-medium">{formatDate(item.due_at)}</p>
                                </div>
                              </div>
                            )}
                            {item.closes_at && (
                              <div className="flex items-start gap-1.5 text-xs">
                                <Lock size={11} className="text-red mt-0.5 flex-shrink-0" />
                                <div>
                                  <p className="text-text3">Coupure totale</p>
                                  <p className="text-red font-medium">{formatDate(item.closes_at)}</p>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Meta info */}
                          <div className="mt-3 flex items-center gap-3 flex-wrap">
                            {item.time_limit_min && (
                              <span className="flex items-center gap-1 text-xs text-text3 bg-card2 px-2 py-1 rounded-lg">
                                <Clock size={10} /> {item.time_limit_min} min
                              </span>
                            )}
                            {item.max_attempts > 1 && (
                              <span className="flex items-center gap-1 text-xs text-text3 bg-card2 px-2 py-1 rounded-lg">
                                🔄 {item.max_attempts} tentatives
                              </span>
                            )}
                            {tLeft && (
                              <span className={clsx('flex items-center gap-1 text-xs px-2 py-1 rounded-lg font-medium',
                                item.status === 'due_soon' ? 'bg-yellow/10 text-yellow' : 'bg-card2 text-text3')}>
                                <Clock size={10} /> Temps restant : {tLeft}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* CTA */}
                        {item.status !== 'closed' && item.status !== 'upcoming' && (
                          <Link href={`/learn/${item.course_slug}`}
                            className="flex-shrink-0 text-xs edha-gradient text-white px-4 py-2 rounded-xl hover:opacity-90 transition-opacity font-medium">
                            {item.content_type === 'quiz' ? '📝 Passer le quiz' : '📤 Remettre'}
                          </Link>
                        )}
                        {item.status === 'upcoming' && (
                          <div className="flex-shrink-0 text-xs bg-card2 border border-border text-text3 px-4 py-2 rounded-xl">
                            Pas encore ouvert
                          </div>
                        )}
                      </div>
                    </Card>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  )
}
