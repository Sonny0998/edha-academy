'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { createBrowserClient } from '@/lib/supabase/browser'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { Card, EmptyState, Spinner, Input, Button } from '@/components/ui'
import {
  BookOpen, LayoutDashboard, BarChart2, Globe, Settings,
  Layers, UserCheck, Users, Plus, X, Mail, CheckCircle,
  Clock, User
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

export default function InstitutionTeachersPage() {
  const { profile } = useAuth()
  const supabase = createBrowserClient()
  const [teachers, setTeachers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting] = useState(false)

  useEffect(() => {
    if (!profile) return
    const load = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url, instructor_approved_at, created_at')
        .eq('institution_name', (profile as any).institution_name)
        .eq('role', 'instructor')
        .order('created_at', { ascending: false })
      setTeachers(data || [])
      setLoading(false)
    }
    load()
  }, [profile])

  const handleInvite = async () => {
    if (!inviteEmail.includes('@')) { toast.error('Email invalide'); return }
    setInviting(true)
    try {
      const res = await fetch('/api/institution/invite-teacher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(`Invitation envoyée à ${inviteEmail}`)
        setInviteEmail('')
        setShowInvite(false)
      } else {
        toast.error(data.error || 'Erreur lors de l\'invitation')
      }
    } catch {
      toast.error('Erreur réseau')
    }
    setInviting(false)
  }

  if (loading) return (
    <DashboardLayout navItems={navItems} title="Mon équipe" role="institution">
      <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>
    </DashboardLayout>
  )

  return (
    <DashboardLayout navItems={navItems} title="Mon équipe" role="institution">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text">Mon équipe</h1>
          <p className="text-text3 text-sm mt-0.5">{teachers.length} enseignant{teachers.length > 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowInvite(!showInvite)}
          className="flex items-center gap-2 text-sm text-white font-medium px-4 py-2.5 rounded-xl edha-gradient hover:opacity-90 transition-opacity shadow-sm">
          <Plus size={15} /> Inviter un enseignant
        </button>
      </div>

      {/* Invite panel */}
      {showInvite && (
        <Card className="p-5 mb-6 border-blue/20 bg-blue/5">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h3 className="font-semibold text-text">Inviter un enseignant</h3>
              <p className="text-xs text-text3 mt-0.5">
                L&apos;enseignant recevra un email d&apos;invitation pour rejoindre votre institution.
              </p>
            </div>
            <button onClick={() => setShowInvite(false)} className="text-text3 hover:text-text">
              <X size={16} />
            </button>
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <Input
                type="email"
                placeholder="email@enseignant.com"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                icon={<Mail size={14} />}
              />
            </div>
            <Button loading={inviting} onClick={handleInvite}>
              Envoyer l&apos;invitation
            </Button>
          </div>
        </Card>
      )}

      {teachers.length === 0 ? (
        <Card className="p-12">
          <EmptyState icon={<UserCheck size={32} />}
            title="Aucun enseignant dans l'équipe"
            description="Invitez des enseignants à rejoindre votre institution pour créer des cours ensemble."
            action={
              <button onClick={() => setShowInvite(true)}
                className="inline-flex items-center gap-2 edha-gradient text-white px-5 py-2.5 rounded-xl text-sm font-medium">
                <Plus size={15} /> Inviter le premier enseignant
              </button>
            }
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {teachers.map((t: any) => (
            <Card key={t.id} className="p-4">
              <div className="flex items-center gap-4">
                {t.avatar_url ? (
                  <img src={t.avatar_url} alt=""
                    className="w-11 h-11 rounded-full object-cover border border-border flex-shrink-0" />
                ) : (
                  <div className="w-11 h-11 rounded-full bg-bg2 border border-border flex items-center justify-center flex-shrink-0">
                    <User size={18} className="text-text3" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-text">{t.full_name}</p>
                  <p className="text-xs text-text3">{t.email}</p>
                </div>
                <span className={clsx(
                  'flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full',
                  t.instructor_approved_at
                    ? 'bg-green/10 text-green'
                    : 'bg-yellow/10 text-yellow'
                )}>
                  {t.instructor_approved_at
                    ? <><CheckCircle size={11} /> Actif</>
                    : <><Clock size={11} /> En attente</>}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </DashboardLayout>
  )
}