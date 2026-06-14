'use client'
import { useEffect, useState, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { instructorNav } from '@/lib/nav'
import { createBrowserClient } from '@/lib/supabase/browser'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { Card, Button, Input, Avatar, Spinner } from '@/components/ui'
import {
  LayoutDashboard, BookOpen, BarChart2, User, MessageSquare, Megaphone,
  Camera, Save, Globe, Upload, X, PenLine
} from 'lucide-react'
import toast from 'react-hot-toast'

const navItems = [
  { label: 'Tableau de bord', href: '/dashboard/instructor',             icon: <LayoutDashboard size={16} /> },
  { label: 'Mes cours',       href: '/dashboard/instructor/courses',      icon: <BookOpen size={16} /> },
  { label: 'Messages Q&A',   href: '/dashboard/instructor/messages',     icon: <MessageSquare size={16} /> },
  { label: 'Annonces',       href: '/dashboard/instructor/announcements', icon: <Megaphone size={16} /> },
  { label: 'Analytiques',    href: '/dashboard/instructor/analytics',    icon: <BarChart2 size={16} /> },
  { label: 'Mon profil',     href: '/dashboard/instructor/profile',      icon: <User size={16} /> },
]

export default function InstructorProfilePage() {
  const { profile, refreshProfile } = useAuth() as any
  const supabase = createBrowserClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const sigRef  = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({ full_name: '', bio: '', website: '' })
  const [saving, setSaving]           = useState(false)
  const [uploading, setUploading]     = useState(false)
  const [uploadingSig, setUploadingSig] = useState(false)
  const [avatarUrl, setAvatarUrl]     = useState<string | null>(null)
  const [sigUrl, setSigUrl]           = useState<string | null>(null)
  const [stats, setStats]             = useState({ courses: 0, students: 0, rating: 0 })

  useEffect(() => {
    if (!profile) return
    setForm({
      full_name: profile.full_name || '',
      bio:       profile.bio       || '',
      website:   profile.website   || '',
    })
    setAvatarUrl(profile.avatar_url  || null)
    setSigUrl((profile as any).signature_url || null)

    supabase.from('courses')
      .select('enrolled_count,rating_avg')
      .eq('instructor_id', profile.id)
      .then(({ data }) => {
        const courses  = data || []
        const students = courses.reduce((s: number, c: any) => s + (c.enrolled_count || 0), 0)
        const rated    = courses.filter((c: any) => c.rating_avg > 0)
        const rating   = rated.length > 0
          ? rated.reduce((s: number, c: any) => s + c.rating_avg, 0) / rated.length
          : 0
        setStats({ courses: courses.length, students, rating })
      })
  }, [profile])

  /* ── Avatar upload ── */
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !profile) return
    if (!file.type.startsWith('image/')) { toast.error('Image uniquement'); return }
    if (file.size > 2 * 1024 * 1024)    { toast.error('Max 2 MB'); return }
    setUploading(true)
    const ext  = file.name.split('.').pop()
    const path = `avatars/${profile.id}/avatar.${ext}`
    const { error } = await supabase.storage
      .from('course-resources').upload(path, file, { upsert: true })
    if (error) { toast.error('Erreur upload'); setUploading(false); return }
    const { data } = supabase.storage.from('course-resources').getPublicUrl(path)
    const url = data.publicUrl + `?t=${Date.now()}`
    await supabase.from('profiles').update({ avatar_url: url }).eq('id', profile.id)
    setAvatarUrl(url)
    refreshProfile?.()
    toast.success('Photo mise à jour !')
    setUploading(false)
  }

  /* ── Signature upload ── */
  const handleSignatureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !profile) return
    if (!file.type.startsWith('image/')) { toast.error('Image uniquement (PNG recommandé)'); return }
    if (file.size > 5 * 1024 * 1024)    { toast.error('Max 5 MB'); return }
    setUploadingSig(true)
    const ext  = file.name.split('.').pop()
    const path = `signatures/${profile.id}/signature.${ext}`
    const { error } = await supabase.storage
      .from('course-resources').upload(path, file, { upsert: true, contentType: file.type })
    if (error) { toast.error('Erreur upload signature'); setUploadingSig(false); return }
    const { data } = supabase.storage.from('course-resources').getPublicUrl(path)
    const url = data.publicUrl + `?t=${Date.now()}`
    await supabase.from('profiles').update({ signature_url: url }).eq('id', profile.id)
    setSigUrl(url)
    refreshProfile?.()
    toast.success('Signature mise à jour ! Elle apparaîtra sur les certificats.')
    setUploadingSig(false)
  }

  const handleDeleteSignature = async () => {
    if (!profile) return
    await supabase.from('profiles').update({ signature_url: null }).eq('id', profile.id)
    setSigUrl(null)
    toast.success('Signature supprimée')
  }

  /* ── Save profile ── */
  const save = async () => {
    if (!form.full_name.trim()) { toast.error('Nom requis'); return }
    setSaving(true)
    await supabase.from('profiles').update({
      full_name: form.full_name,
      bio:       form.bio,
      website:   form.website,
    }).eq('id', profile?.id)
    toast.success('Profil mis à jour !')
    refreshProfile?.()
    setSaving(false)
  }

  if (!profile) return (
    <DashboardLayout navItems={instructorNav} title="Mon profil" role="instructor">
      <div className="flex justify-center py-16"><Spinner size="lg" /></div>
    </DashboardLayout>
  )

  return (
    <DashboardLayout navItems={instructorNav} title="Mon profil" role="instructor">
      <h1 className="text-2xl font-bold text-text mb-6">Mon profil instructeur</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Colonne gauche */}
        <div className="space-y-4">
          {/* Avatar */}
          <Card className="p-6 text-center">
            <div className="relative inline-block mb-4">
              <Avatar src={avatarUrl} name={form.full_name} size="xl" />
              <button onClick={() => fileRef.current?.click()}
                className="absolute bottom-0 right-0 w-8 h-8 edha-gradient rounded-full flex items-center justify-center border-2 border-card hover:opacity-90">
                {uploading ? <Spinner size="sm" /> : <Camera size={14} className="text-white" />}
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
            </div>
            <h2 className="font-bold text-text">{form.full_name}</h2>
            <p className="text-sm text-text3 mt-0.5">{profile.email}</p>
            <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-blue/10 text-blue border border-blue/20 px-2 py-0.5 rounded-full mt-2">
              Instructeur EDHA
            </span>
          </Card>

          {/* Stats */}
          <Card className="p-4">
            <h3 className="text-sm font-semibold text-text mb-3">Statistiques</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-text3">Cours créés</span>
                <span className="font-semibold text-text">{stats.courses}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text3">Étudiants total</span>
                <span className="font-semibold text-text">{stats.students}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text3">Note moyenne</span>
                <span className="font-semibold text-yellow">
                  {stats.rating > 0 ? `★ ${stats.rating.toFixed(1)}` : '—'}
                </span>
              </div>
            </div>
          </Card>
        </div>

        {/* Colonne droite */}
        <div className="lg:col-span-2 space-y-4">

          {/* Informations publiques */}
          <Card className="p-6 space-y-4">
            <h2 className="font-semibold text-text">Informations publiques</h2>
            <Input
              label="Nom complet *"
              value={form.full_name}
              onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
            />
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-text2">Bio publique</label>
              <textarea
                value={form.bio}
                onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                placeholder="Décrivez votre expertise, votre parcours..."
                rows={4}
                className="w-full bg-bg2 border border-border rounded-xl px-4 py-3 text-sm text-text outline-none focus:border-blue/50 resize-none"
              />
            </div>
            <Input
              label="Site web"
              value={form.website}
              onChange={e => setForm(f => ({ ...f, website: e.target.value }))}
              icon={<Globe size={15} />}
              type="url"
              placeholder="https://..."
            />
            <Button onClick={save} loading={saving}>
              <Save size={15} /> Sauvegarder
            </Button>
          </Card>

          {/* Signature */}
          <Card className="p-6">
            <div className="flex items-start gap-2 mb-1">
              <PenLine size={16} className="text-blue mt-0.5" />
              <div>
                <h2 className="font-semibold text-text">Signature pour les certificats</h2>
                <p className="text-xs text-text3 mt-0.5">
                  Cette signature apparaîtra sur tous les certificats de vos étudiants.
                  Recommandé : PNG avec fond transparent.
                </p>
              </div>
            </div>

            <div className="mt-4 flex items-start gap-5">
              {/* Preview */}
              <div className="w-44 h-20 rounded-xl border-2 border-border bg-bg2 flex items-center justify-center flex-shrink-0 overflow-hidden">
                {sigUrl ? (
                  <img src={sigUrl} alt="Signature" className="w-full h-full object-contain p-2" />
                ) : (
                  <p className="text-xs text-text3 text-center px-3">Aucune signature importée</p>
                )}
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => sigRef.current?.click()}
                  disabled={uploadingSig}
                  className="flex items-center gap-2 text-sm bg-bg2 border border-border text-text px-4 py-2.5 rounded-xl hover:bg-card transition-colors disabled:opacity-50"
                >
                  {uploadingSig
                    ? <span className="w-4 h-4 border-2 border-text3 border-t-text rounded-full animate-spin" />
                    : <Upload size={14} />}
                  {uploadingSig ? 'Upload...' : sigUrl ? 'Changer la signature' : 'Importer ma signature'}
                </button>
                <p className="text-xs text-text3">PNG ou JPG · max 5 MB · fond transparent recommandé</p>
                {sigUrl && (
                  <button
                    onClick={handleDeleteSignature}
                    className="flex items-center gap-1.5 text-xs text-red hover:underline"
                  >
                    <X size={11} /> Supprimer la signature
                  </button>
                )}
                <input
                  ref={sigRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleSignatureUpload}
                />
              </div>
            </div>
          </Card>

        </div>
      </div>
    </DashboardLayout>
  )
}