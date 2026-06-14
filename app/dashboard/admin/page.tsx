'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { createBrowserClient } from '@/lib/supabase/browser'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { Card, Badge, Spinner } from '@/components/ui'
import Link from 'next/link'
import {
  Users, BookOpen, TrendingUp, DollarSign, Clock,
  LayoutDashboard, Shield, CreditCard, Settings,
  CheckCircle, XCircle, Tag, Activity, Ticket, BarChart2,
  Star, Eye, ArrowRight
} from 'lucide-react'
import toast from 'react-hot-toast'

const navItems = [
  { label: 'Tableau de bord', href: '/dashboard/admin',           icon: <LayoutDashboard size={16} /> },
  { label: 'Utilisateurs',   href: '/dashboard/admin/users',      icon: <Users size={16} /> },
  { label: 'Cours',          href: '/dashboard/admin/courses',     icon: <BookOpen size={16} /> },
  { label: 'Catégories',     href: '/dashboard/admin/categories',  icon: <Tag size={16} /> },
  { label: 'Activité',       href: '/dashboard/admin/activity',    icon: <Activity size={16} /> },
  { label: 'Coupons',        href: '/dashboard/admin/coupons',     icon: <Ticket size={16} /> },
  { label: 'Rapports',       href: '/dashboard/admin/reports',     icon: <BarChart2 size={16} /> },
  { label: 'Paiements',      href: '/dashboard/admin/payments',    icon: <CreditCard size={16} /> },
  { label: 'Paramètres',     href: '/dashboard/admin/settings',    icon: <Settings size={16} /> },
]

export default function AdminDashboard() {
  const { profile } = useAuth()
  const supabase = createBrowserClient()
  const [stats, setStats]                   = useState<any>(null)
  const [pendingInstructors, setPendingInstructors] = useState<any[]>([])
  const [pendingCourses, setPendingCourses] = useState<any[]>([])
  const [topCourses, setTopCourses]         = useState<any[]>([])
  const [recentUsers, setRecentUsers]       = useState<any[]>([])
  const [loading, setLoading]               = useState(true)

  useEffect(() => {
    if (!profile) return
    const load = async () => {
      const [statsRes, instrRes, courseRes, topRes, usersRes] = await Promise.all([
        supabase.from('platform_stats').select('*').single(),
        supabase.from('profiles').select('*').eq('role', 'instructor').is('instructor_approved_at', null).limit(5),
        supabase.from('courses').select('*,instructor:profiles!instructor_id(full_name)').eq('status', 'review').limit(5),
        supabase.from('courses').select('id,title,slug,enrolled_count,rating_avg,is_featured,thumbnail_url,status')
          .eq('status', 'published').order('enrolled_count', { ascending: false }).limit(5),
        supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(5),
      ])
      setStats(statsRes.data)
      setPendingInstructors(instrRes.data || [])
      setPendingCourses(courseRes.data || [])
      setTopCourses(topRes.data || [])
      setRecentUsers(usersRes.data || [])
      setLoading(false)
    }
    load()
  }, [profile])

  const approveInstructor = async (id: string, approved: boolean) => {
    const inst = pendingInstructors.find(i => i.id === id)
    if (approved) {
      await supabase.from('profiles').update({ instructor_approved_at: new Date().toISOString() }).eq('id', id)
    } else {
      await supabase.from('profiles').update({ role: 'student', instructor_application: null }).eq('id', id)
    }
    // Send email notification
    if (inst) {
      await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: approved ? 'instructor_approved' : 'instructor_rejected',
          userId: id, email: inst.email, name: inst.full_name,
        }),
      })
    }
    toast.success(approved ? '✅ Instructeur approuvé — email envoyé !' : '❌ Demande refusée — email envoyé')
    setPendingInstructors(p => p.filter(i => i.id !== id))
  }

  const approveCourse = async (id: string, approved: boolean) => {
    if (approved) {
      await supabase.from('courses').update({ status: 'published', published_at: new Date().toISOString(), admin_feedback: null }).eq('id', id)
      toast.success('Cours publié !')
    } else {
      const reason = prompt('Raison du refus (optionnel):') || 'Cours incomplet'
      await supabase.from('courses').update({ status: 'draft', admin_feedback: reason }).eq('id', id)
      toast.success('Cours refusé')
    }
    setPendingCourses(p => p.filter(c => c.id !== id))
  }

  const toggleFeatured = async (id: string, current: boolean) => {
    await supabase.from('courses').update({ is_featured: !current }).eq('id', id)
    setTopCourses(c => c.map(cc => cc.id === id ? { ...cc, is_featured: !current } : cc))
    toast.success(!current ? 'Cours mis en vedette !' : 'Retiré de la vedette')
  }

  if (loading) return (
    <DashboardLayout navItems={navItems} title="Administration" role="admin">
      <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>
    </DashboardLayout>
  )

  return (
    <DashboardLayout navItems={navItems} title="Administration" role="admin">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-purple/10 rounded-xl flex items-center justify-center">
          <Shield size={20} className="text-purple" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-text">Administration</h1>
          <p className="text-text2 text-sm">Gérez la plateforme EDHA Academy</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Étudiants',     value: stats?.total_students || 0,   icon: Users,       color: 'blue' },
          { label: 'Cours publiés', value: stats?.published_courses || 0, icon: BookOpen,    color: 'green' },
          { label: 'Instructeurs',  value: stats?.total_instructors || 0, icon: TrendingUp,  color: 'purple' },
          { label: 'Revenus total', value: `$${stats?.total_revenue || 0}`, icon: DollarSign, color: 'yellow' },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="p-5">
            <div className={`w-10 h-10 rounded-xl bg-${color}/10 flex items-center justify-center mb-3`}>
              <Icon size={18} className={`text-${color}`} />
            </div>
            <div className="text-2xl font-bold text-text">{value}</div>
            <div className="text-xs text-text3 mt-0.5">{label}</div>
          </Card>
        ))}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {[
          { href: '/dashboard/admin/activity',   label: 'Activité récente', icon: Activity,  color: 'blue' },
          { href: '/dashboard/admin/categories', label: 'Catégories',       icon: Tag,        color: 'purple' },
          { href: '/dashboard/admin/coupons',    label: 'Coupons',          icon: Ticket,     color: 'green' },
          { href: '/dashboard/admin/reports',    label: 'Rapports CSV',     icon: BarChart2,  color: 'yellow' },
        ].map(({ href, label, icon: Icon, color }) => (
          <Link key={href} href={href}
            className={`flex items-center gap-2 p-3 bg-${color}/10 border border-${color}/20 rounded-xl hover:bg-${color}/20 transition-colors group`}>
            <Icon size={16} className={`text-${color}`} />
            <span className="text-sm font-medium text-text">{label}</span>
            <ArrowRight size={12} className={`text-${color} ml-auto opacity-0 group-hover:opacity-100 transition-opacity`} />
          </Link>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Pending instructors */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-text flex items-center gap-2">
              <Clock size={16} className="text-yellow" />
              Instructeurs en attente
              {pendingInstructors.length > 0 && <Badge variant="yellow">{pendingInstructors.length}</Badge>}
            </h2>
            <Link href="/dashboard/admin/users" className="text-xs text-blue hover:underline">Voir tout</Link>
          </div>
          {pendingInstructors.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-text3 gap-2">
              <CheckCircle size={16} className="text-green" /> Tout est à jour
            </div>
          ) : (
            <div className="space-y-3">
              {pendingInstructors.map(inst => (
                <div key={inst.id} className="bg-card2 rounded-xl p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text truncate">{inst.full_name}</p>
                      <p className="text-xs text-text3">{inst.email}</p>
                      {inst.institution_name && <p className="text-xs text-blue mt-0.5">{inst.institution_name}</p>}
                      {inst.instructor_application?.qualifications && (
                        <p className="text-xs text-text3 mt-1 line-clamp-2">{inst.instructor_application.qualifications}</p>
                      )}
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      <button onClick={() => approveInstructor(inst.id, true)}
                        className="p-1.5 bg-green/10 hover:bg-green/20 text-green rounded-lg transition-colors" title="Approuver">
                        <CheckCircle size={15} />
                      </button>
                      <button onClick={() => approveInstructor(inst.id, false)}
                        className="p-1.5 bg-red/10 hover:bg-red/20 text-red rounded-lg transition-colors" title="Refuser">
                        <XCircle size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Pending courses */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-text flex items-center gap-2">
              <Clock size={16} className="text-yellow" />
              Cours en révision
              {pendingCourses.length > 0 && <Badge variant="yellow">{pendingCourses.length}</Badge>}
            </h2>
            <Link href="/dashboard/admin/courses" className="text-xs text-blue hover:underline">Voir tout</Link>
          </div>
          {pendingCourses.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-text3 gap-2">
              <CheckCircle size={16} className="text-green" /> Aucun cours en attente
            </div>
          ) : (
            <div className="space-y-3">
              {pendingCourses.map(c => (
                <div key={c.id} className="bg-card2 rounded-xl p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text truncate">{c.title}</p>
                      <p className="text-xs text-text3">{c.instructor?.full_name}</p>
                      <p className="text-xs text-text3">{new Date(c.created_at).toLocaleDateString('fr-FR')}</p>
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      <button onClick={() => approveCourse(c.id, true)}
                        className="p-1.5 bg-green/10 hover:bg-green/20 text-green rounded-lg transition-colors" title="Publier">
                        <CheckCircle size={15} />
                      </button>
                      <button onClick={() => approveCourse(c.id, false)}
                        className="p-1.5 bg-red/10 hover:bg-red/20 text-red rounded-lg transition-colors" title="Refuser">
                        <XCircle size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Top courses + featured toggle */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-text">Top cours & Vedette</h2>
            <Link href="/dashboard/admin/courses" className="text-xs text-blue hover:underline">Gérer</Link>
          </div>
          <div className="space-y-3">
            {topCourses.length === 0 ? (
              <p className="text-center text-text3 text-sm py-6">Aucun cours publié</p>
            ) : topCourses.map(c => (
              <div key={c.id} className="flex items-center gap-3 bg-card2 rounded-xl p-3">
                <div className="w-10 h-10 bg-card rounded-lg flex-shrink-0 overflow-hidden">
                  {c.thumbnail_url
                    ? <img src={c.thumbnail_url} alt="" className="w-full h-full object-cover" />
                    : <BookOpen size={16} className="text-text3 m-auto mt-2.5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text truncate">{c.title}</p>
                  <div className="flex items-center gap-2 text-xs text-text3">
                    <span>{c.enrolled_count} inscrits</span>
                    {c.rating_avg > 0 && <span>★ {c.rating_avg}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Link href={`/cursos/${c.slug}`} target="_blank"
                    className="p-1.5 bg-card hover:bg-blue/10 rounded-lg text-text3 hover:text-blue transition-all">
                    <Eye size={13} />
                  </Link>
                  <button onClick={() => toggleFeatured(c.id, c.is_featured)}
                    className={`p-1.5 rounded-lg transition-all text-xs font-medium px-2 ${c.is_featured ? 'bg-yellow/20 text-yellow' : 'bg-card hover:bg-yellow/10 text-text3 hover:text-yellow'}`}
                    title={c.is_featured ? 'Retirer vedette' : 'Mettre en vedette'}>
                    <Star size={13} className={c.is_featured ? 'fill-yellow' : ''} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Recent users */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-text">Membres récents</h2>
            <Link href="/dashboard/admin/users" className="text-xs text-blue hover:underline">Voir tout</Link>
          </div>
          <div className="space-y-3">
            {recentUsers.map(u => (
              <div key={u.id} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue/20 flex items-center justify-center flex-shrink-0 text-blue text-sm font-bold">
                  {u.full_name?.[0]?.toUpperCase() || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text truncate">{u.full_name}</p>
                  <p className="text-xs text-text3">{u.email}</p>
                </div>
                <Badge variant={u.role === 'admin' ? 'purple' : u.role === 'instructor' ? 'blue' : 'default'}>
                  {u.role}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  )
}
