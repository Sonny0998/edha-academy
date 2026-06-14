'use client'
import { useEffect, useState, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { studentNav } from '@/lib/nav'
import { createBrowserClient } from '@/lib/supabase/browser'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { Card, Button, Input, Avatar, Spinner } from '@/components/ui'
import {
  LayoutDashboard, BookOpen, Award, Heart, User, Calendar,
  Camera, Save, Mail, Globe, FileText, Zap, Flame, Trophy
} from 'lucide-react'
import toast from 'react-hot-toast'

const navItems = [
  { label: 'Tableau de bord',  href: '/dashboard/student',              icon: <LayoutDashboard size={16}/> },
  { label: 'Mes cours',        href: '/dashboard/student/courses',       icon: <BookOpen size={16}/> },
  { label: 'Calendrier',       href: '/dashboard/student/calendar',      icon: <Calendar size={16}/> },
  { label: 'Certificats',      href: '/dashboard/student/certificates',  icon: <Award size={16}/> },
  { label: 'Liste de souhaits',href: '/dashboard/student/wishlist',      icon: <Heart size={16}/> },
  { label: 'Mon profil',       href: '/dashboard/student/profile',       icon: <User size={16}/> },
]

export default function StudentProfilePage() {
  const { profile, refreshProfile } = useAuth()
  const supabase = createBrowserClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState({ full_name: '', bio: '', website: '' })
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [stats, setStats] = useState({ courses: 0, certs: 0, badges: 0 })

  useEffect(() => {
    if (!profile) return
    setForm({ full_name: profile.full_name || '', bio: profile.bio || '', website: profile.website || '' })
    setAvatarUrl(profile.avatar_url || null)

    // Load stats
    Promise.all([
      supabase.from('enrollments').select('id', { count: 'exact' }).eq('student_id', profile.id),
      supabase.from('certificates').select('id', { count: 'exact' }).eq('student_id', profile.id),
      supabase.from('user_badges').select('id', { count: 'exact' }).eq('user_id', profile.id),
    ]).then(([enr, cert, badge]) => {
      setStats({ courses: enr.count || 0, certs: cert.count || 0, badges: badge.count || 0 })
    })
  }, [profile])

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !profile) return
    if (!file.type.startsWith('image/')) { toast.error('Image uniquement'); return }
    if (file.size > 2 * 1024 * 1024) { toast.error('Max 2 MB'); return }

    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `avatars/${profile.id}/avatar.${ext}`
    const { error } = await supabase.storage.from('course-resources').upload(path, file, {
      upsert: true, contentType: file.type
    })
    if (error) { toast.error('Erreur upload'); setUploading(false); return }
    const { data } = supabase.storage.from('course-resources').getPublicUrl(path)
    const url = data.publicUrl + `?t=${Date.now()}`
    await supabase.from('profiles').update({ avatar_url: url }).eq('id', profile.id)
    setAvatarUrl(url)
    refreshProfile?.()
    toast.success('Photo mise à jour !')
    setUploading(false)
  }

  const save = async () => {
    if (!form.full_name.trim()) { toast.error('Nom requis'); return }
    setSaving(true)
    const { error } = await supabase.from('profiles').update({
      full_name: form.full_name, bio: form.bio, website: form.website
    }).eq('id', profile?.id)
    if (error) toast.error(error.message)
    else { toast.success('Profil mis à jour !'); refreshProfile?.() }
    setSaving(false)
  }

  if (!profile) return (
    <DashboardLayout navItems={studentNav} title="Mon profil" role="student">
      <div className="flex justify-center py-16"><Spinner size="lg" /></div>
    </DashboardLayout>
  )

  return (
    <DashboardLayout navItems={studentNav} title="Mon profil" role="student">
      <h1 className="text-2xl font-bold text-text mb-6">Mon profil</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left - Avatar + stats */}
        <div className="space-y-4">
          <Card className="p-6 text-center">
            <div className="relative inline-block mb-4">
              <Avatar src={avatarUrl} name={form.full_name} size="xl" />
              <button onClick={() => fileRef.current?.click()}
                className="absolute bottom-0 right-0 w-8 h-8 edha-gradient rounded-full flex items-center justify-center border-2 border-card shadow-md hover:opacity-90 transition-opacity">
                {uploading ? <Spinner size="sm" className="border-white border-t-transparent" />
                  : <Camera size={14} className="text-white" />}
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
            </div>
            <h2 className="font-bold text-text text-lg">{form.full_name || profile.full_name}</h2>
            <p className="text-sm text-text3 mt-0.5">{profile.email}</p>
            <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-green/10 text-green border border-green/20 px-2 py-0.5 rounded-full mt-2">
              <User size={9} /> Étudiant
            </span>
            <p className="text-xs text-text3 mt-2">Cliquez sur la caméra pour changer la photo</p>
          </Card>

          {/* Gamification stats */}
          <Card className="p-4">
            <h3 className="text-sm font-semibold text-text mb-3">Mes stats</h3>
            <div className="space-y-3">
              {[
                { icon: BookOpen, label: 'Cours inscrits', value: stats.courses, color: 'text-blue' },
                { icon: Award, label: 'Certificats', value: stats.certs, color: 'text-gold' },
                { icon: Trophy, label: 'Badges gagnés', value: stats.badges, color: 'text-purple' },
                { icon: Zap, label: 'Points XP', value: profile.xp_points || 0, color: 'text-cyan' },
                { icon: Flame, label: 'Jours consécutifs', value: `${profile.streak_days || 0} 🔥`, color: 'text-red' },
              ].map(({ icon: Icon, label, value, color }) => (
                <div key={label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-text2">
                    <Icon size={14} className={color} /> {label}
                  </div>
                  <span className="text-sm font-semibold text-text">{value}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right - Edit form */}
        <div className="lg:col-span-2">
          <Card className="p-6 space-y-5">
            <h2 className="font-semibold text-text">Modifier le profil</h2>
            <Input label="Nom complet *" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
              icon={<User size={15} />} placeholder="Votre nom complet" />
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-text2">Bio</label>
              <textarea value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                placeholder="Parlez de vous, vos centres d'intérêt, vos objectifs..."
                rows={4} className="w-full bg-bg2 border border-border rounded-xl px-4 py-3 text-sm text-text outline-none focus:border-blue/50 transition-colors resize-none" />
            </div>
            <Input label="Site web ou LinkedIn" value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))}
              icon={<Globe size={15} />} placeholder="https://..." type="url" />

            <div className="pt-2">
              <Button onClick={save} loading={saving}><Save size={15} /> Sauvegarder les modifications</Button>
            </div>
          </Card>

          {/* Account info */}
          <Card className="p-6 mt-4">
            <h2 className="font-semibold text-text mb-4">Informations du compte</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-text3 flex items-center gap-2"><Mail size={14} /> Email</span>
                <span className="text-text font-medium">{profile.email}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-text3">Membre depuis</span>
                <span className="text-text">{new Date(profile.created_at || Date.now()).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
