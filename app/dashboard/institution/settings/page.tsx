'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { createBrowserClient } from '@/lib/supabase/browser'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { Card, Input, Button, Spinner } from '@/components/ui'
import {
  BookOpen, LayoutDashboard, BarChart2, Globe, Settings,
  Layers, UserCheck, Users, Lock, Bell, Trash2, AlertCircle
} from 'lucide-react'
import toast from 'react-hot-toast'

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

export default function InstitutionSettingsPage() {
  const { profile } = useAuth()
  const supabase = createBrowserClient()
  const [loading, setLoading] = useState(false)
  const [pwd, setPwd] = useState({ current: '', next: '', confirm: '' })
  const [notifs, setNotifs] = useState({
    email_new_enrollment: true,
    email_program_completed: true,
    email_new_review: false,
  })

  const handlePwdChange = async () => {
    if (pwd.next.length < 8) { toast.error('Minimum 8 caractères'); return }
    if (pwd.next !== pwd.confirm) { toast.error('Mots de passe différents'); return }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password: pwd.next })
    if (error) toast.error(error.message)
    else { toast.success('Mot de passe mis à jour !'); setPwd({ current: '', next: '', confirm: '' }) }
    setLoading(false)
  }

  const handleDeleteAccount = async () => {
    const confirm1 = window.confirm('Êtes-vous sûr de vouloir supprimer votre compte ? Tous vos programmes et cours seront supprimés.')
    if (!confirm1) return
    const confirm2 = window.prompt('Tapez "SUPPRIMER" pour confirmer')
    if (confirm2 !== 'SUPPRIMER') { toast.error('Confirmation incorrecte'); return }
    toast.error('Contactez support@edha.academy pour supprimer votre compte.')
  }

  return (
    <DashboardLayout navItems={navItems} title="Paramètres" role="institution">
      <div className="max-w-2xl space-y-6">
        <h1 className="text-2xl font-bold text-text">Paramètres</h1>

        {/* Sécurité */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Lock size={16} className="text-blue" />
            <h2 className="font-semibold text-text">Sécurité</h2>
          </div>
          <Input label="Nouveau mot de passe" type="password" value={pwd.next}
            onChange={e => setPwd(p => ({ ...p, next: e.target.value }))}
            placeholder="Minimum 8 caractères" />
          <Input label="Confirmer le mot de passe" type="password" value={pwd.confirm}
            onChange={e => setPwd(p => ({ ...p, confirm: e.target.value }))} />
          <Button loading={loading} onClick={handlePwdChange} variant="secondary">
            Mettre à jour le mot de passe
          </Button>
        </Card>

        {/* Notifications */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Bell size={16} className="text-blue" />
            <h2 className="font-semibold text-text">Notifications par email</h2>
          </div>
          <div className="space-y-3">
            {[
              { key: 'email_new_enrollment',    label: 'Nouvelle inscription à un programme' },
              { key: 'email_program_completed', label: 'Étudiant a complété un programme' },
              { key: 'email_new_review',        label: 'Nouvel avis sur un cours' },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center justify-between cursor-pointer group">
                <span className="text-sm text-text2 group-hover:text-text transition-colors">{label}</span>
                <div className="relative">
                  <input type="checkbox" className="sr-only"
                    checked={notifs[key as keyof typeof notifs]}
                    onChange={e => setNotifs(n => ({ ...n, [key]: e.target.checked }))} />
                  <div className={`w-10 h-5 rounded-full transition-colors ${notifs[key as keyof typeof notifs] ? 'bg-blue' : 'bg-bg2 border border-border'}`}>
                    <div className={`w-4 h-4 bg-white rounded-full shadow absolute top-0.5 transition-transform ${notifs[key as keyof typeof notifs] ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </div>
                </div>
              </label>
            ))}
          </div>
        </Card>

        {/* Zone danger */}
        <Card className="p-6 border-red/20">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle size={16} className="text-red" />
            <h2 className="font-semibold text-red">Zone de danger</h2>
          </div>
          <p className="text-sm text-text2 mb-4">
            La suppression du compte est permanente. Tous vos programmes, cours et données seront supprimés définitivement.
          </p>
          <button onClick={handleDeleteAccount}
            className="flex items-center gap-2 text-sm text-red border border-red/30 bg-red/5 hover:bg-red/10 px-4 py-2.5 rounded-xl transition-colors font-medium">
            <Trash2 size={14} /> Supprimer mon compte
          </button>
        </Card>
      </div>
    </DashboardLayout>
  )
}