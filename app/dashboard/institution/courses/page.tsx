'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { createBrowserClient } from '@/lib/supabase/browser'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { Card, EmptyState, Spinner } from '@/components/ui'
import Link from 'next/link'
import {
  BookOpen, Plus, LayoutDashboard, BarChart2, Globe, Settings,
  Layers, UserCheck, Users, CheckCircle, Clock, XCircle,
  Eye, Send, Pencil, Search, Filter, Trash2
} from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const navItems = [
  { label: 'Vue d\'ensemble', href: '/dashboard/institution',           icon: <LayoutDashboard size={16} /> },
  { label: 'Mes programmes',  href: '/dashboard/institution/programs',  icon: <Layers size={16} /> },
  { label: 'Mes cours',       href: '/dashboard/institution/courses',   icon: <BookOpen size={16} /> },
  { label: 'Mon équipe',      href: '/dashboard/institution/teachers',  icon: <UserCheck size={16} /> },
  { label: 'Étudiants',       href: '/dashboard/institution/students',  icon: <Users size={16} /> },
  { label: 'Analytiques',     href: '/dashboard/institution/analytics', icon: <BarChart2 size={16} /> },
  { label: 'Page publique',   href: '/dashboard/institution/profile',   icon: <Globe size={16} /> },
  { label: 'Paramètres',      href: '/dashboard/institution/settings',  icon: <Settings size={16} /> },
]

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  draft:     { label: 'Brouillon',   color: 'text-text3',  icon: Clock },
  review:    { label: 'En révision', color: 'text-yellow', icon: Clock },
  published: { label: 'Publié',      color: 'text-green',  icon: CheckCircle },
  archived:  { label: 'Archivé',     color: 'text-text3',  icon: XCircle },
}

export default function InstitutionCoursesPage() {
  const { profile } = useAuth()
  const supabase = createBrowserClient()
  const [courses, setCourses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [submitting, setSubmitting] = useState<string | null>(null)

  const load = async () => {
    if (!profile) return
    const { data } = await supabase
      .from('courses')
      .select('*, category:categories(name)')
      .eq('instructor_id', profile.id)
      .order('created_at', { ascending: false })
    setCourses(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [profile])

  const submitForReview = async (id: string) => {
    setSubmitting(id)
    const { error } = await supabase.from('courses').update({ status: 'review' }).eq('id', id)
    if (!error) {
      setCourses(c => c.map(cc => cc.id === id ? { ...cc, status: 'review' } : cc))
      toast.success('Cours soumis pour révision !')
    }
    setSubmitting(null)
  }

  const deleteCourse = async (id: string, title: string) => {
    if (!confirm(`Supprimer "${title}" ? Action irréversible.`)) return
    const { error } = await supabase.from('courses').delete().eq('id', id)
    if (!error) { toast.success('Cours supprimé'); load() }
    else toast.error('Erreur lors de la suppression')
  }

  const filtered = courses.filter(c => {
    const matchSearch = c.title.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'all' || c.status === filter
    return matchSearch && matchFilter
  })

  if (loading) return (
    <DashboardLayout navItems={navItems} title="Mes cours" role="institution">
      <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>
    </DashboardLayout>
  )

  return (
    <DashboardLayout navItems={navItems} title="Mes cours" role="institution">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text">Mes cours</h1>
          <p className="text-text3 text-sm mt-0.5">{courses.length} cours créé{courses.length > 1 ? 's' : ''}</p>
        </div>
        <Link href="/dashboard/institution/courses/new"
          className="flex items-center gap-2 text-sm text-white font-medium px-4 py-2.5 rounded-xl edha-gradient hover:opacity-90 transition-opacity shadow-sm">
          <Plus size={15} /> Nouveau cours
        </Link>
      </div>

      {/* Filtres */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text3" />
          <input type="text" placeholder="Rechercher..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-card border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm text-text outline-none focus:border-blue/50" />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-text3" />
          {['all', 'draft', 'review', 'published', 'archived'].map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={clsx('text-xs px-3 py-1.5 rounded-lg font-medium transition-colors',
                filter === s ? 'bg-blue text-white' : 'bg-bg2 text-text3 hover:bg-card border border-border')}>
              {s === 'all' ? 'Tous' : STATUS_CONFIG[s]?.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card className="p-12">
          <EmptyState icon={<BookOpen size={32} />}
            title={courses.length === 0 ? 'Aucun cours créé' : 'Aucun résultat'}
            description={courses.length === 0
              ? 'Créez votre premier cours et ajoutez-le à vos programmes.'
              : 'Modifiez votre recherche ou vos filtres.'}
            action={courses.length === 0 ? (
              <Link href="/dashboard/institution/courses/new"
                className="inline-flex items-center gap-2 edha-gradient text-white px-5 py-2.5 rounded-xl text-sm font-medium">
                <Plus size={15} /> Créer un cours
              </Link>
            ) : undefined}
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((c: any) => {
            const sc = STATUS_CONFIG[c.status] || STATUS_CONFIG.draft
            const StatusIcon = sc.icon
            return (
              <Card key={c.id} className={clsx('p-4 hover:border-border2 transition-colors',
                c.status === 'review' && 'border-yellow/20 bg-yellow/5')}>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-bg2 rounded-xl flex-shrink-0 overflow-hidden border border-border">
                    {c.thumbnail_url
                      ? <img src={c.thumbnail_url} alt="" className="w-full h-full object-cover" />
                      : <BookOpen size={20} className="text-text3 m-auto mt-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-text truncate">{c.title}</h3>
                    <p className="text-xs text-text3 mt-0.5">{c.category?.name} · {c.enrolled_count} étudiants</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className={clsx('flex items-center gap-1 text-xs font-medium', sc.color)}>
                        <StatusIcon size={11} /> {sc.label}
                      </span>
                      {c.admin_feedback && (
                        <span className="text-xs text-red truncate max-w-xs">⚠ {c.admin_feedback}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Link href={`/dashboard/institution/courses/${c.id}/edit`}
                      className="w-8 h-8 bg-bg2 hover:bg-blue/10 rounded-lg flex items-center justify-center text-text3 hover:text-blue transition-all" title="Modifier">
                      <Pencil size={13} />
                    </Link>
                    {c.status === 'published' && (
                      <Link href={`/cursos/${c.slug}`} target="_blank"
                        className="w-8 h-8 bg-green/10 hover:bg-green/20 rounded-lg flex items-center justify-center text-green transition-colors" title="Voir">
                        <Eye size={13} />
                      </Link>
                    )}
                    {c.status === 'draft' && (
                      <button onClick={() => submitForReview(c.id)} disabled={submitting === c.id}
                        className="flex items-center gap-1.5 text-xs bg-blue/10 hover:bg-blue text-blue hover:text-white border border-blue/20 px-3 py-1.5 rounded-lg transition-all font-medium disabled:opacity-50">
                        {submitting === c.id
                          ? <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                          : <Send size={12} />}
                        Soumettre
                      </button>
                    )}
                    <button onClick={() => deleteCourse(c.id, c.title)}
                      className="w-8 h-8 bg-bg2 hover:bg-red/10 rounded-lg flex items-center justify-center text-text3 hover:text-red transition-all" title="Supprimer">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </DashboardLayout>
  )
}