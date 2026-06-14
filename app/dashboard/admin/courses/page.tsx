'use client'
import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase/browser'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { Card, Badge, Spinner, Avatar } from '@/components/ui'
import {
  Users, BookOpen, CreditCard, Settings, LayoutDashboard, Tag, Activity, Ticket, BarChart2,
  CheckCircle, XCircle, Eye, Trash2, X, ChevronDown, ChevronRight, Video, FileText, HelpCircle, Clock
} from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const navItems = [
  { label: 'Tableau de bord', href: '/dashboard/admin',           icon: <LayoutDashboard size={16}/> },
  { label: 'Utilisateurs',   href: '/dashboard/admin/users',      icon: <Users size={16}/> },
  { label: 'Cours',          href: '/dashboard/admin/courses',     icon: <BookOpen size={16}/> },
  { label: 'Catégories',     href: '/dashboard/admin/categories',  icon: <Tag size={16}/> },
  { label: 'Activité',       href: '/dashboard/admin/activity',    icon: <Activity size={16}/> },
  { label: 'Coupons',        href: '/dashboard/admin/coupons',     icon: <Ticket size={16}/> },
  { label: 'Rapports',       href: '/dashboard/admin/reports',     icon: <BarChart2 size={16}/> },
  { label: 'Paiements',      href: '/dashboard/admin/payments',    icon: <CreditCard size={16}/> },
  { label: 'Paramètres',     href: '/dashboard/admin/settings',    icon: <Settings size={16}/> },
]

const STATUS = {
  draft:     { label: 'Brouillon',   variant: 'default' as const, color: 'bg-bg2 text-text3' },
  review:    { label: 'En révision', variant: 'yellow' as const,  color: 'bg-yellow/10 text-yellow border border-yellow/20' },
  published: { label: 'Publié',      variant: 'green' as const,   color: 'bg-green/10 text-green border border-green/20' },
  archived:  { label: 'Archivé',     variant: 'default' as const, color: 'bg-bg2 text-text3' },
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  video:    <Video size={12}/>,
  text:     <FileText size={12}/>,
  quiz:     <HelpCircle size={12}/>,
  resource: <FileText size={12}/>,
}

export default function AdminCoursesPage() {
  const supabase = createBrowserClient()
  const [courses, setCourses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('review') // default to review
  const [selectedCourse, setSelectedCourse] = useState<any>(null)
  const [courseModules, setCourseModules] = useState<any[]>([])
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [expandedMod, setExpandedMod] = useState<string|null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [showRejectBox, setShowRejectBox] = useState(false)

  const load = async () => {
    const { data } = await supabase.from('courses')
      .select('*,instructor:profiles!instructor_id(full_name,avatar_url,email),category:categories(name)')
      .order('created_at', { ascending: false })
    setCourses(data || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const openDetail = async (c: any) => {
    setSelectedCourse(c)
    setLoadingDetail(true)
    setShowRejectBox(false)
    setRejectReason('')
    const { data } = await supabase.from('modules')
      .select('*,lessons:lessons(id,title,content_type,duration_min,is_free_preview,is_published,order_num)')
      .eq('course_id', c.id).order('order_num')
    setCourseModules((data || []).map((m: any) => ({
      ...m, lessons: (m.lessons || []).sort((a: any, b: any) => a.order_num - b.order_num)
    })))
    setLoadingDetail(false)
  }

  const setStatus = async (id: string, status: string, feedback?: string) => {
    const update: any = { status }
    if (status === 'published') update.published_at = new Date().toISOString()
    if (feedback) update.admin_feedback = feedback
    await supabase.from('courses').update(update).eq('id', id)
    toast.success(status === 'published' ? '✅ Cours publié et visible !' : '❌ Cours refusé')
    setSelectedCourse(null)
    load()
  }

  const deleteCourse = async (id: string, title: string) => {
    if (!confirm(`Supprimer "${title}" définitivement ?`)) return
    await supabase.from('courses').delete().eq('id', id)
    setCourses(c => c.filter(cc => cc.id !== id))
    setSelectedCourse(null)
    toast.success('Cours supprimé')
  }

  const filtered = filter === 'all' ? courses : courses.filter(c => c.status === filter)
  const reviewCount = courses.filter(c => c.status === 'review').length

  if (loading) return (
    <DashboardLayout navItems={navItems} title="Cours" role="admin">
      <div className="flex items-center justify-center h-64"><Spinner size="lg"/></div>
    </DashboardLayout>
  )

  return (
    <DashboardLayout navItems={navItems} title="Cours" role="admin">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text">Gestion des cours <span className="text-text3 text-lg font-normal">({courses.length})</span></h1>
          {reviewCount > 0 && <p className="text-sm text-yellow mt-0.5">⏳ {reviewCount} cours en attente de révision</p>}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-1.5 mb-5 flex-wrap">
        {([['all','Tous'], ['review','En révision'], ['published','Publiés'], ['draft','Brouillons'], ['archived','Archivés']] as const).map(([val, label]) => (
          <button key={val} onClick={() => setFilter(val)}
            className={clsx('text-xs px-3 py-2 rounded-xl font-medium transition-colors flex items-center gap-1.5',
              filter === val ? 'edha-gradient text-white' : 'bg-card border border-border text-text2 hover:text-text')}>
            {label}
            <span className={clsx('text-[10px] px-1.5 py-0.5 rounded-full', filter===val?'bg-white/20 text-white':'bg-bg2 text-text3')}>
              {val==='all' ? courses.length : courses.filter(c=>c.status===val).length}
            </span>
          </button>
        ))}
      </div>

      {/* Courses list */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <Card className="p-10 text-center">
            <BookOpen size={28} className="text-text3 mx-auto mb-2"/>
            <p className="text-text2 font-medium">Aucun cours dans cette catégorie</p>
          </Card>
        )}
        {filtered.map((c: any) => {
          const s = STATUS[c.status as keyof typeof STATUS] || STATUS.draft
          return (
            <Card key={c.id} className={clsx('p-4 transition-colors', c.status === 'review' && 'border-yellow/30 bg-yellow/5')}>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-bg2 rounded-xl flex-shrink-0 overflow-hidden border border-border">
                  {c.thumbnail_url
                    ? <img src={c.thumbnail_url} alt="" className="w-full h-full object-cover"/>
                    : <BookOpen size={20} className="text-text3 m-auto mt-4"/>}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-text truncate">{c.title}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Avatar src={c.instructor?.avatar_url} name={c.instructor?.full_name} size="xs"/>
                    <p className="text-xs text-text3">{c.instructor?.full_name}</p>
                    {c.category?.name && <span className="text-xs text-text3">· {c.category.name}</span>}
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium', s.color)}>{s.label}</span>
                    <span className="text-xs text-text3">{c.enrolled_count} étudiants</span>
                    <span className="text-xs text-text3">{new Date(c.created_at).toLocaleDateString('fr-FR')}</span>
                    {c.admin_feedback && <span className="text-xs text-red">Refus: {c.admin_feedback}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => openDetail(c)}
                    className="flex items-center gap-1.5 text-xs bg-bg2 hover:bg-blue/10 border border-border hover:border-blue/30 text-text2 hover:text-blue rounded-xl px-3 py-2 transition-all font-medium">
                    <Eye size={13}/> Réviser
                  </button>
                  {c.status === 'published' && (
                    <Link href={`/cursos/${c.slug}`} target="_blank"
                      className="text-xs bg-bg2 border border-border text-text2 hover:text-blue px-3 py-2 rounded-xl transition-colors">
                      Voir →
                    </Link>
                  )}
                  {(c.status === 'draft' || c.status === 'archived') && (
                    <button onClick={() => deleteCourse(c.id, c.title)}
                      className="p-2 bg-red/10 hover:bg-red/20 rounded-xl text-red transition-colors">
                      <Trash2 size={14}/>
                    </button>
                  )}
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {/* ── Course Detail Modal ── */}
      {selectedCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedCourse(null)}/>
          <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="h-1 rounded-t-2xl bg-gradient-to-r from-blue via-cyan to-gold"/>

            <div className="p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-5">
                <div className="flex-1 min-w-0 pr-4">
                  <h2 className="text-xl font-bold text-text mb-1">{selectedCourse.title}</h2>
                  <div className="flex items-center gap-3 text-sm text-text3">
                    <span>par {selectedCourse.instructor?.full_name}</span>
                    <span>·</span>
                    <span>{selectedCourse.category?.name}</span>
                    <span>·</span>
                    <span className={clsx('text-xs px-2 py-0.5 rounded-full', STATUS[selectedCourse.status as keyof typeof STATUS]?.color)}>
                      {STATUS[selectedCourse.status as keyof typeof STATUS]?.label}
                    </span>
                  </div>
                </div>
                <button onClick={() => setSelectedCourse(null)} className="p-2 hover:bg-bg2 rounded-lg text-text3">
                  <X size={18}/>
                </button>
              </div>

              {/* Thumbnail + Description */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
                {selectedCourse.thumbnail_url && (
                  <img src={selectedCourse.thumbnail_url} alt="" className="w-full aspect-video object-cover rounded-xl sm:col-span-1"/>
                )}
                <div className={selectedCourse.thumbnail_url ? 'sm:col-span-2' : 'sm:col-span-3'}>
                  {selectedCourse.subtitle && <p className="font-medium text-text mb-2">{selectedCourse.subtitle}</p>}
                  {selectedCourse.description && <p className="text-sm text-text2 leading-relaxed line-clamp-4">{selectedCourse.description}</p>}
                  <div className="grid grid-cols-2 gap-2 mt-3 text-xs text-text3">
                    <span>🌐 {selectedCourse.language === 'fr' ? 'Français' : selectedCourse.language === 'ht' ? 'Créole' : 'Anglais'}</span>
                    <span>📊 {selectedCourse.level}</span>
                    <span>💰 {selectedCourse.pricing_model === 'free' ? 'Gratuit' : `$${selectedCourse.price}`}</span>
                    <span>📅 {new Date(selectedCourse.created_at).toLocaleDateString('fr-FR')}</span>
                  </div>
                </div>
              </div>

              {/* What you'll learn */}
              {selectedCourse.what_you_learn?.length > 0 && (
                <div className="bg-bg2 rounded-xl p-4 mb-4">
                  <p className="text-xs font-semibold text-text3 uppercase tracking-wider mb-2">Ce que l&apos;étudiant apprendra</p>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                    {selectedCourse.what_you_learn.map((item: string, i: number) => (
                      <li key={i} className="flex items-start gap-1.5 text-sm text-text2">
                        <CheckCircle size={12} className="text-green mt-0.5 flex-shrink-0"/> {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Course structure */}
              {loadingDetail ? (
                <div className="flex justify-center py-6"><Spinner/></div>
              ) : courseModules.length > 0 && (
                <div className="mb-5">
                  <p className="text-xs font-semibold text-text3 uppercase tracking-wider mb-3">
                    Structure du cours ({courseModules.length} module{courseModules.length > 1 ? 's' : ''} · {courseModules.reduce((s, m) => s + (m.lessons?.length || 0), 0)} leçons)
                  </p>
                  <div className="space-y-2 max-h-52 overflow-y-auto">
                    {courseModules.map((mod: any) => (
                      <div key={mod.id} className="border border-border rounded-xl overflow-hidden">
                        <button onClick={() => setExpandedMod(expandedMod === mod.id ? null : mod.id)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 bg-bg2 hover:bg-border transition-colors text-left">
                          <BookOpen size={14} className="text-blue flex-shrink-0"/>
                          <span className="text-sm font-medium text-text flex-1">{mod.title}</span>
                          <span className="text-xs text-text3">{mod.lessons?.length} leçon{mod.lessons?.length > 1 ? 's' : ''}</span>
                          {expandedMod === mod.id ? <ChevronDown size={14} className="text-text3"/> : <ChevronRight size={14} className="text-text3"/>}
                        </button>
                        {expandedMod === mod.id && mod.lessons?.length > 0 && (
                          <div className="divide-y divide-border">
                            {mod.lessons.map((lesson: any) => (
                              <div key={lesson.id} className="flex items-center gap-3 px-4 py-2 bg-card">
                                <span className="text-text3 flex-shrink-0">{TYPE_ICONS[lesson.content_type] || <FileText size={12}/>}</span>
                                <span className="text-xs text-text2 flex-1">{lesson.title}</span>
                                {lesson.is_free_preview && <span className="text-[10px] bg-green/10 text-green px-1.5 py-0.5 rounded">Aperçu</span>}
                                {lesson.duration_min && <span className="text-[10px] text-text3 flex items-center gap-0.5"><Clock size={9}/> {lesson.duration_min}min</span>}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Instructor info */}
              <div className="bg-bg2 rounded-xl p-4 mb-5 flex items-center gap-3">
                <Avatar src={selectedCourse.instructor?.avatar_url} name={selectedCourse.instructor?.full_name} size="md"/>
                <div>
                  <p className="font-medium text-text text-sm">{selectedCourse.instructor?.full_name}</p>
                  <p className="text-xs text-text3">{selectedCourse.instructor?.email}</p>
                </div>
              </div>

              {/* Action buttons */}
              {selectedCourse.status === 'review' && (
                <div className="border-t border-border pt-5">
                  <p className="text-sm font-semibold text-text mb-3">Décision d&apos;approbation</p>

                  {showRejectBox ? (
                    <div className="space-y-3">
                      <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                        placeholder="Expliquez pourquoi le cours est refusé (sera transmis à l'instructeur)..."
                        rows={3} className="w-full bg-bg2 border border-border rounded-xl px-4 py-3 text-sm text-text outline-none focus:border-red/50 resize-none"/>
                      <div className="flex gap-3">
                        <button onClick={() => setStatus(selectedCourse.id, 'draft', rejectReason || 'Cours incomplet')}
                          className="flex-1 flex items-center justify-center gap-2 bg-red/10 hover:bg-red/20 text-red border border-red/20 py-2.5 rounded-xl text-sm font-medium transition-colors">
                          <XCircle size={16}/> Confirmer le refus
                        </button>
                        <button onClick={() => setShowRejectBox(false)}
                          className="px-4 py-2.5 bg-bg2 border border-border text-text2 rounded-xl text-sm transition-colors">
                          Annuler
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-3">
                      <button onClick={() => setStatus(selectedCourse.id, 'published')}
                        className="flex-1 flex items-center justify-center gap-2 bg-green/10 hover:bg-green/20 text-green border border-green/20 py-3 rounded-xl text-sm font-semibold transition-colors">
                        <CheckCircle size={16}/> Approuver et publier
                      </button>
                      <button onClick={() => setShowRejectBox(true)}
                        className="flex-1 flex items-center justify-center gap-2 bg-red/10 hover:bg-red/20 text-red border border-red/20 py-3 rounded-xl text-sm font-semibold transition-colors">
                        <XCircle size={16}/> Refuser le cours
                      </button>
                    </div>
                  )}
                </div>
              )}

              {selectedCourse.status === 'published' && (
                <div className="border-t border-border pt-4 flex gap-3">
                  <Link href={`/cursos/${selectedCourse.slug}`} target="_blank"
                    className="flex-1 text-center text-sm bg-bg2 border border-border text-text2 hover:text-blue py-2.5 rounded-xl transition-colors">
                    Voir la page publique →
                  </Link>
                  <button onClick={() => setStatus(selectedCourse.id, 'archived')}
                    className="text-sm bg-bg2 border border-border text-text2 px-4 py-2.5 rounded-xl hover:text-red hover:border-red/20 transition-colors">
                    Archiver
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
