'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { createBrowserClient } from '@/lib/supabase/browser'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { Card, Spinner, EmptyState } from '@/components/ui'
import Link from 'next/link'
import {
  Layers, BookOpen, UserCheck, Users, BarChart2, Globe,
  Settings, LayoutDashboard, Plus, Eye, Send, Clock,
  CheckCircle, XCircle, Search, Filter, ArrowRight
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

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  draft:     { label: 'Brouillon',   color: 'text-text3',  bg: 'bg-bg2',        icon: Clock },
  review:    { label: 'En révision', color: 'text-yellow', bg: 'bg-yellow/10',  icon: Clock },
  published: { label: 'Publié',      color: 'text-green',  bg: 'bg-green/10',   icon: CheckCircle },
  archived:  { label: 'Archivé',     color: 'text-text3',  bg: 'bg-bg2',        icon: XCircle },
}

export default function InstitutionProgramsPage() {
  const { profile } = useAuth()
  const supabase = createBrowserClient()
  const [programs, setPrograms] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<string>('all')
  const [submitting, setSubmitting] = useState<string | null>(null)

  useEffect(() => {
    if (!profile) return
    const load = async () => {
      const { data } = await supabase
        .from('programs')
        .select('*, category:categories(name)')
        .eq('institution_id', profile.id)
        .order('created_at', { ascending: false })
      setPrograms(data || [])
      setLoading(false)
    }
    load()
  }, [profile])

  const submitForReview = async (programId: string) => {
    setSubmitting(programId)
    const { error } = await supabase
      .from('programs')
      .update({ status: 'review' })
      .eq('id', programId)
    if (!error) {
      setPrograms(p => p.map(prog =>
        prog.id === programId ? { ...prog, status: 'review' } : prog
      ))
      toast.success('Programme soumis pour révision !')
    }
    setSubmitting(null)
  }

  const filtered = programs.filter(p => {
    const matchSearch = p.title.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'all' || p.status === filter
    return matchSearch && matchFilter
  })

  if (loading) return (
    <DashboardLayout navItems={navItems} title="Mes programmes" role="institution">
      <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>
    </DashboardLayout>
  )

  return (
    <DashboardLayout navItems={navItems} title="Mes programmes" role="institution">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text">Mes programmes</h1>
          <p className="text-text3 text-sm mt-0.5">{programs.length} programme{programs.length > 1 ? 's' : ''} créé{programs.length > 1 ? 's' : ''}</p>
        </div>
        <Link href="/dashboard/institution/programs/new"
          className="flex items-center gap-2 text-sm text-white font-medium px-4 py-2.5 rounded-xl edha-gradient hover:opacity-90 transition-opacity shadow-sm">
          <Plus size={15} /> Nouveau programme
        </Link>
      </div>

      {/* Filtres */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text3" />
          <input
            type="text"
            placeholder="Rechercher un programme..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-card border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm text-text outline-none focus:border-blue/50"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-text3" />
          {['all', 'draft', 'review', 'published', 'archived'].map(s => (
            <button key={s}
              onClick={() => setFilter(s)}
              className={clsx(
                'text-xs px-3 py-1.5 rounded-lg font-medium transition-colors',
                filter === s
                  ? 'bg-blue text-white'
                  : 'bg-bg2 text-text3 hover:bg-card border border-border'
              )}>
              {s === 'all' ? 'Tous' : STATUS_CONFIG[s]?.label}
            </button>
          ))}
        </div>
      </div>

      {/* Liste */}
      {filtered.length === 0 ? (
        <Card className="p-12">
          <EmptyState
            icon={<Layers size={32} />}
            title={programs.length === 0 ? 'Aucun programme créé' : 'Aucun résultat'}
            description={programs.length === 0
              ? 'Créez votre premier programme pour offrir une formation structurée à vos étudiants.'
              : 'Essayez de modifier votre recherche ou vos filtres.'}
            action={programs.length === 0 ? (
              <Link href="/dashboard/institution/programs/new"
                className="inline-flex items-center gap-2 edha-gradient text-white px-5 py-2.5 rounded-xl text-sm font-medium">
                <Plus size={15} /> Créer un programme
              </Link>
            ) : undefined}
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(p => {
            const sc = STATUS_CONFIG[p.status] || STATUS_CONFIG.draft
            const StatusIcon = sc.icon
            return (
              <Card key={p.id} className={clsx('p-5 hover:border-border2 transition-colors',
                p.status === 'review' && 'border-yellow/20 bg-yellow/5')}>
                <div className="flex items-center gap-5">
                  {/* Thumbnail */}
                  {p.thumbnail_url ? (
                    <img src={p.thumbnail_url} alt=""
                      className="w-16 h-16 rounded-xl object-cover border border-border flex-shrink-0" />
                  ) : (
                    <div className="w-16 h-16 bg-purple/10 rounded-xl flex items-center justify-center flex-shrink-0 border border-border">
                      <Layers size={22} className="text-purple" />
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-text">{p.title}</h3>
                    <p className="text-xs text-text3 mt-0.5">
                      {p.category?.name} · {p.total_courses} cours · {p.enrolled_count} étudiants
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className={clsx('flex items-center gap-1 text-xs font-medium', sc.color)}>
                        <StatusIcon size={11} /> {sc.label}
                      </span>
                      {p.pricing_model === 'free'
                        ? <span className="text-xs text-green font-medium">Gratuit</span>
                        : <span className="text-xs text-text3">${p.price} USD</span>
                      }
                      {p.admin_feedback && (
                        <span className="text-xs text-red truncate max-w-xs">⚠ {p.admin_feedback}</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Link href={`/dashboard/institution/programs/${p.id}/edit`}
                      className="text-xs bg-bg2 hover:bg-blue/10 border border-border hover:border-blue/30 text-text3 hover:text-blue px-3 py-1.5 rounded-lg transition-all font-medium">
                      Gérer →
                    </Link>

                    {p.status === 'published' && (
                      <Link href={`/programas/${p.slug}`} target="_blank"
                        className="w-8 h-8 bg-green/10 hover:bg-green/20 border border-green/20 rounded-lg flex items-center justify-center text-green transition-colors" title="Voir la page">
                        <Eye size={14} />
                      </Link>
                    )}

                    {p.status === 'draft' && (
                      <button
                        onClick={() => submitForReview(p.id)}
                        disabled={submitting === p.id || p.total_courses === 0}
                        title={p.total_courses === 0 ? 'Ajoutez au moins un cours' : ''}
                        className="flex items-center gap-1.5 text-xs bg-blue/10 hover:bg-blue text-blue hover:text-white border border-blue/20 px-3 py-1.5 rounded-lg transition-all font-medium disabled:opacity-40 disabled:cursor-not-allowed">
                        {submitting === p.id
                          ? <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                          : <Send size={12} />}
                        Soumettre
                      </button>
                    )}

                    {p.status === 'review' && (
                      <span className="text-xs text-yellow bg-yellow/10 border border-yellow/20 px-3 py-1.5 rounded-lg font-medium flex items-center gap-1">
                        <Clock size={11} /> En attente
                      </span>
                    )}
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
