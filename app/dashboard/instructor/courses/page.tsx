'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { instructorNav } from '@/lib/nav'
import { createBrowserClient } from '@/lib/supabase/browser'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { Card, Badge, EmptyState, Spinner } from '@/components/ui'
import Link from 'next/link'
import { BookOpen, Plus, LayoutDashboard, BarChart2, User, CheckCircle, Clock, Eye, Pencil, Trash2, Users, Star , MessageSquare, Megaphone} from 'lucide-react'
import toast from 'react-hot-toast'

const navItems = [
  { label: 'Tableau de bord', href: '/dashboard/instructor',             icon: <LayoutDashboard size={16} /> },
  { label: 'Mes cours',       href: '/dashboard/instructor/courses',      icon: <BookOpen size={16} /> },
  { label: 'Messages Q&A',   href: '/dashboard/instructor/messages',     icon: <MessageSquare size={16} /> },
  { label: 'Annonces',       href: '/dashboard/instructor/announcements', icon: <Megaphone size={16} /> },
  { label: 'Analytiques',    href: '/dashboard/instructor/analytics',    icon: <BarChart2 size={16} /> },
  { label: 'Mon profil',     href: '/dashboard/instructor/profile',      icon: <User size={16} /> },
]

const STATUS_MAP: Record<string, { label: string; variant: any }> = {
  draft: { label: 'Brouillon', variant: 'default' },
  review: { label: 'En révision', variant: 'yellow' },
  published: { label: 'Publié', variant: 'green' },
  archived: { label: 'Archivé', variant: 'default' },
}

export default function InstructorCoursesPage() {
  const { profile } = useAuth()
  const supabase = createBrowserClient()
  const [courses, setCourses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    if (!profile) return
    const { data } = await supabase.from('courses')
      .select('*')
      .eq('instructor_id', profile.id)
      .order('created_at', { ascending: false })
    setCourses(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [profile])

  const deleteCourse = async (id: string, title: string) => {
    if (!confirm(`Supprimer "${title}" ? Cette action est irréversible.`)) return
    const { error } = await supabase.from('courses').delete().eq('id', id)
    if (error) toast.error('Erreur lors de la suppression')
    else { toast.success('Cours supprimé'); load() }
  }

  if (loading) return (
    <DashboardLayout navItems={instructorNav} title="Mes cours" role="instructor">
      <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>
    </DashboardLayout>
  )

  return (
    <DashboardLayout navItems={instructorNav} title="Mes cours" role="instructor">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-text">Mes cours</h1>
        <Link href="/dashboard/instructor/courses/new"
          className="flex items-center gap-2 bg-blue hover:bg-blue2 text-white text-sm px-4 py-2.5 rounded-xl transition-colors">
          <Plus size={15} /> Nouveau cours
        </Link>
      </div>

      {courses.length === 0 ? (
        <Card className="p-8">
          <EmptyState icon={<BookOpen size={24} />} title="Aucun cours" description="Créez votre premier cours !"
            action={<Link href="/dashboard/instructor/courses/new" className="flex items-center gap-2 bg-blue text-white text-sm px-4 py-2 rounded-xl"><Plus size={14} /> Créer un cours</Link>} />
        </Card>
      ) : (
        <div className="space-y-3">
          {courses.map((c: any) => {
            const s = STATUS_MAP[c.status] || STATUS_MAP.draft
            return (
              <Card key={c.id} className="p-4 hover:border-blue/30 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-card2 rounded-xl flex-shrink-0 overflow-hidden">
                    {c.thumbnail_url ? <img src={c.thumbnail_url} alt="" className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center"><BookOpen size={22} className="text-text3" /></div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-text truncate">{c.title}</h3>
                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                      <Badge variant={s.variant}>{s.label}</Badge>
                      <span className="text-xs text-text3 flex items-center gap-1"><Users size={11} /> {c.enrolled_count} étudiants</span>
                      {c.rating_count > 0 && <span className="text-xs text-text3 flex items-center gap-1"><Star size={11} /> {c.rating_avg}</span>}
                      <span className="text-xs text-text3">{new Date(c.created_at).toLocaleDateString('fr-FR')}</span>
                    </div>
                    {c.status === 'review' && <p className="text-xs text-yellow/80 mt-1.5 flex items-center gap-1"><Clock size={11} /> En attente de validation admin</p>}
                    {c.admin_feedback && <p className="text-xs text-red mt-1 bg-red/10 px-2 py-1 rounded-lg">Feedback: {c.admin_feedback}</p>}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {c.status === 'published' && (
                      <Link href={`/cursos/${c.slug}`} className="w-8 h-8 bg-card2 hover:bg-card rounded-lg flex items-center justify-center text-text3 hover:text-text transition-all" title="Voir">
                        <Eye size={14} />
                      </Link>
                    )}
                    <Link href={`/dashboard/instructor/courses/${c.id}/preview`}
                      className="w-8 h-8 bg-bg2 hover:bg-blue/10 rounded-lg flex items-center justify-center text-text3 hover:text-blue transition-all" title="Prévisualiser">
                      <Eye size={14} />
                    </Link>
                    <Link href={`/dashboard/instructor/courses/${c.id}/edit`}
                      className="w-8 h-8 bg-card2 hover:bg-blue/10 rounded-lg flex items-center justify-center text-text3 hover:text-blue transition-all" title="Modifier">
                      <Pencil size={14} />
                    </Link>
                    {c.status === 'draft' && (
                      <button onClick={() => deleteCourse(c.id, c.title)}
                        className="w-8 h-8 bg-card2 hover:bg-red/10 rounded-lg flex items-center justify-center text-text3 hover:text-red transition-all" title="Supprimer">
                        <Trash2 size={14} />
                      </button>
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
