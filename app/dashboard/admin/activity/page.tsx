'use client'
import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase/browser'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { Card, Avatar, Spinner } from '@/components/ui'
import {
  Users, BookOpen, CreditCard, Settings, LayoutDashboard,
  Tag, Activity, UserPlus, BookMarked, Award, Star, RefreshCw
, Ticket, BarChart2} from 'lucide-react'

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

function timeAgo(date: string) {
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (diff < 60) return `il y a ${diff}s`
  if (diff < 3600) return `il y a ${Math.floor(diff/60)}min`
  if (diff < 86400) return `il y a ${Math.floor(diff/3600)}h`
  return `il y a ${Math.floor(diff/86400)}j`
}

export default function AdminActivityPage() {
  const supabase = createBrowserClient()
  const [enrollments, setEnrollments] = useState<any[]>([])
  const [newUsers, setNewUsers]       = useState<any[]>([])
  const [certs, setCerts]             = useState<any[]>([])
  const [reviews, setReviews]         = useState<any[]>([])
  const [loading, setLoading]         = useState(true)

  const load = async () => {
    setLoading(true)
    const [enrRes, usrRes, certRes, revRes] = await Promise.all([
      supabase.from('enrollments')
        .select('*,student:profiles!student_id(full_name,avatar_url),course:courses(title)')
        .order('enrolled_at', { ascending: false }).limit(20),
      supabase.from('profiles')
        .select('*').order('created_at', { ascending: false }).limit(20),
      supabase.from('certificates')
        .select('*,student:profiles!student_id(full_name,avatar_url),course:courses(title)')
        .order('issued_at', { ascending: false }).limit(20),
      supabase.from('reviews')
        .select('*,student:profiles!student_id(full_name,avatar_url),course:courses(title)')
        .order('created_at', { ascending: false }).limit(20),
    ])
    setEnrollments(enrRes.data || [])
    setNewUsers(usrRes.data || [])
    setCerts(certRes.data || [])
    setReviews(revRes.data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  // Merge and sort all events
  const events = [
    ...enrollments.map(e => ({
      id: 'enr-' + e.id, type: 'enrollment', date: e.enrolled_at,
      user: e.student, text: `s'est inscrit à`, target: e.course?.title,
      icon: <BookMarked size={14} />, color: 'blue',
    })),
    ...newUsers.map(u => ({
      id: 'usr-' + u.id, type: 'signup', date: u.created_at,
      user: u, text: `a rejoint la plateforme en tant que`, target: u.role,
      icon: <UserPlus size={14} />, color: 'green',
    })),
    ...certs.map(c => ({
      id: 'cert-' + c.id, type: 'certificate', date: c.issued_at,
      user: c.student, text: `a obtenu un certificat pour`, target: c.course?.title,
      icon: <Award size={14} />, color: 'yellow',
    })),
    ...reviews.map(r => ({
      id: 'rev-' + r.id, type: 'review', date: r.created_at,
      user: r.student, text: `a laissé ${r.rating}★ pour`, target: r.course?.title,
      icon: <Star size={14} />, color: 'purple',
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 40)

  const colorMap: Record<string, string> = {
    blue: 'bg-blue/10 text-blue',
    green: 'bg-green/10 text-green',
    yellow: 'bg-yellow/10 text-yellow',
    purple: 'bg-purple/10 text-purple',
  }

  return (
    <DashboardLayout navItems={navItems} title="Activité récente" role="admin">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-text">Activité récente</h1>
        <button onClick={load} className="flex items-center gap-2 text-sm text-text2 hover:text-text bg-card2 border border-border px-3 py-2 rounded-xl transition-colors">
          <RefreshCw size={14} /> Actualiser
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Inscriptions (total)', value: enrollments.length, color: 'blue', icon: BookMarked },
          { label: 'Nouveaux membres', value: newUsers.length, color: 'green', icon: UserPlus },
          { label: 'Certificats émis', value: certs.length, color: 'yellow', icon: Award },
          { label: 'Avis reçus', value: reviews.length, color: 'purple', icon: Star },
        ].map(({ label, value, color, icon: Icon }) => (
          <Card key={label} className="p-4">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 bg-${color}/10`}>
              <Icon size={16} className={`text-${color}`} />
            </div>
            <div className="text-2xl font-bold text-text">{value}</div>
            <div className="text-xs text-text3 mt-0.5">{label}</div>
          </Card>
        ))}
      </div>

      {/* Activity feed */}
      <Card className="p-5">
        <h2 className="font-semibold text-text mb-5">Fil d'activité en temps réel</h2>
        {loading ? (
          <div className="flex justify-center py-12"><Spinner size="lg" /></div>
        ) : events.length === 0 ? (
          <p className="text-center text-text3 py-12">Aucune activité pour le moment</p>
        ) : (
          <div className="space-y-0">
            {events.map((event, idx) => (
              <div key={event.id} className={`flex items-start gap-4 py-3.5 ${idx < events.length - 1 ? 'border-b border-border' : ''}`}>
                {/* Icon */}
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${colorMap[event.color]}`}>
                  {event.icon}
                </div>
                {/* Avatar */}
                <Avatar src={event.user?.avatar_url} name={event.user?.full_name || '?'} size="sm" className="flex-shrink-0" />
                {/* Text */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-text">
                    <span className="font-medium">{event.user?.full_name || 'Utilisateur'}</span>
                    {' '}<span className="text-text3">{event.text}</span>{' '}
                    {event.target && <span className="font-medium text-text">{event.target}</span>}
                  </p>
                  <p className="text-xs text-text3 mt-0.5">{timeAgo(event.date)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </DashboardLayout>
  )
}
