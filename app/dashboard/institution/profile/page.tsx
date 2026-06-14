'use client'
import { useEffect, useState, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { createBrowserClient } from '@/lib/supabase/browser'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { Card, Input, Button, Spinner } from '@/components/ui'
import {
  BookOpen, LayoutDashboard, BarChart2, Globe, Settings,
  Layers, UserCheck, Users, Upload, X, CheckCircle,
  Building2, ExternalLink, Eye
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

export default function InstitutionProfilePage() {
  const { profile, refreshProfile } = useAuth() as any
  const supabase = createBrowserClient()
  const logoRef = useRef<HTMLInputElement>(null)
  const sigRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingSig, setUploadingSig] = useState(false)

  const [form, setForm] = useState({
    institution_name: '',
    institution_slug: '',
    institution_type: '',
    institution_description: '',
    institution_address: '',
    institution_phone: '',
    director_name: '',
    website: '',
    bio: '',
  })
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [sigUrl, setSigUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!profile) return
    setForm({
      institution_name:        (profile as any).institution_name || '',
      institution_slug:        (profile as any).institution_slug || '',
      institution_type:        (profile as any).institution_type || '',
      institution_description: (profile as any).institution_description || '',
      institution_address:     (profile as any).institution_address || '',
      institution_phone:       (profile as any).institution_phone || '',
      director_name:           (profile as any).director_name || '',
      website:                 (profile as any).website || '',
      bio:                     (profile as any).bio || '',
    })
    setLogoUrl((profile as any).institution_logo_url || null)
    setSigUrl((profile as any).signature_url || null)
    setLoading(false)
  }, [profile])

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const uploadFile = async (
    file: File,
    path: string,
    field: 'institution_logo_url' | 'signature_url',
    setUrl: (url: string) => void,
    setUploading: (v: boolean) => void
  ) => {
    if (file.size > 5 * 1024 * 1024) { toast.error('Max 5 MB'); return }
    setUploading(true)
    const ext = file.name.split('.').pop()
    const fullPath = `${path}/${profile!.id}-${Date.now()}.${ext}`
    const { error } = await supabase.storage
      .from('avatars')
      .upload(fullPath, file, { upsert: true, contentType: file.type })
    if (error) { toast.error('Erreur upload'); setUploading(false); return }
    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fullPath)
    const url = urlData.publicUrl
    await supabase.from('profiles').update({ [field]: url }).eq('id', profile!.id)
    setUrl(url)
    toast.success('Image mise à jour !')
    setUploading(false)
  }

  const handleSave = async () => {
    if (!profile) return
    setSaving(true)

    // Generate slug if empty
    let slug = form.institution_slug.trim()
    if (!slug && form.institution_name) {
      slug = form.institution_name
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
    }

    const { error } = await supabase.from('profiles').update({
      institution_name:        form.institution_name,
      institution_slug:        slug,
      institution_type:        form.institution_type,
      institution_description: form.institution_description,
      institution_address:     form.institution_address,
      institution_phone:       form.institution_phone,
      director_name:           form.director_name,
      website:                 form.website,
      bio:                     form.bio,
    }).eq('id', profile.id)

    if (error) toast.error(error.message)
    else {
      toast.success('Profil mis à jour !')
      if (refreshProfile) refreshProfile()
    }
    setSaving(false)
  }

  if (loading) return (
    <DashboardLayout navItems={navItems} title="Page publique" role="institution">
      <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>
    </DashboardLayout>
  )

  const publicUrl = form.institution_slug
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/instituciones/${form.institution_slug}`
    : null

  return (
    <DashboardLayout navItems={navItems} title="Page publique" role="institution">
      <div className="max-w-2xl space-y-6">

        {/* Preview link */}
        {publicUrl && (
          <div className="flex items-center gap-3 bg-green/5 border border-green/20 rounded-xl px-4 py-3">
            <CheckCircle size={15} className="text-green flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-text3">Votre page publique</p>
              <a href={publicUrl} target="_blank" rel="noopener noreferrer"
                className="text-sm text-blue hover:underline truncate block">{publicUrl}</a>
            </div>
            <a href={publicUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-blue hover:underline flex-shrink-0">
              <Eye size={12} /> Voir
            </a>
          </div>
        )}

        {/* Logo */}
        <Card className="p-6">
          <h2 className="font-semibold text-text mb-4">Logo de l&apos;institution</h2>
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-2xl border-2 border-border overflow-hidden flex-shrink-0 bg-bg2">
              {logoUrl
                ? <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                : <Building2 size={28} className="text-text3 m-auto mt-6" />}
            </div>
            <div>
              <button
                onClick={() => logoRef.current?.click()}
                disabled={uploadingLogo}
                className="flex items-center gap-2 text-sm bg-bg2 border border-border text-text px-4 py-2.5 rounded-xl hover:bg-card transition-colors disabled:opacity-50"
              >
                {uploadingLogo
                  ? <span className="w-4 h-4 border-2 border-text3 border-t-text rounded-full animate-spin" />
                  : <Upload size={14} />}
                {uploadingLogo ? 'Upload...' : 'Changer le logo'}
              </button>
              <p className="text-xs text-text3 mt-1.5">PNG, JPG · max 5 MB · recommandé 400×400px</p>
              <input ref={logoRef} type="file" accept="image/*" className="hidden"
                onChange={e => {
                  const f = e.target.files?.[0]
                  if (f) uploadFile(f, 'institution-logos', 'institution_logo_url', setLogoUrl, setUploadingLogo)
                }} />
            </div>
          </div>
        </Card>

        {/* Informations */}
        <Card className="p-6 space-y-4">
          <h2 className="font-semibold text-text">Informations de l&apos;institution</h2>

          <Input label="Nom de l'institution *" value={form.institution_name}
            onChange={e => set('institution_name', e.target.value)}
            placeholder="École Nationale de..." />

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-text2">
              URL de la page publique
              <span className="text-text3 font-normal ml-1">(slug)</span>
            </label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-text3 bg-bg2 border border-border rounded-xl px-3 py-2.5 flex-shrink-0">
                /instituciones/
              </span>
              <input type="text" value={form.institution_slug}
                onChange={e => set('institution_slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                placeholder="nom-institution"
                className="flex-1 bg-bg2 border border-border rounded-xl px-4 py-2.5 text-sm text-text outline-none focus:border-blue/50" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-text2">Type d&apos;institution</label>
            <select value={form.institution_type} onChange={e => set('institution_type', e.target.value)}
              className="w-full bg-bg2 border border-border rounded-xl px-4 py-2.5 text-sm text-text outline-none focus:border-blue/50">
              <option value="">Sélectionner...</option>
              <option value="École primaire">École primaire</option>
              <option value="École secondaire / lycée">École secondaire / lycée</option>
              <option value="Université / collège">Université / collège</option>
              <option value="Centre de formation">Centre de formation</option>
              <option value="ONG / organisation">ONG / organisation</option>
              <option value="Entreprise">Entreprise</option>
              <option value="Autre">Autre</option>
            </select>
          </div>

          <Input label="Nom du directeur / responsable" value={form.director_name}
            onChange={e => set('director_name', e.target.value)} placeholder="Jean Dupont" />

          <Input label="Adresse" value={form.institution_address}
            onChange={e => set('institution_address', e.target.value)}
            placeholder="Ville, département, Haïti" />

          <Input label="Téléphone" value={form.institution_phone}
            onChange={e => set('institution_phone', e.target.value)} placeholder="+509..." />

          <Input label="Site web" type="url" value={form.website}
            onChange={e => set('website', e.target.value)} placeholder="https://..." />

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-text2">Description courte</label>
            <textarea value={form.bio} onChange={e => set('bio', e.target.value)} rows={2}
              placeholder="Résumé en 1-2 phrases — affiché en haut de votre page"
              className="w-full bg-bg2 border border-border rounded-xl px-4 py-3 text-sm text-text outline-none focus:border-blue/50 resize-none" />
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-text2">Description complète</label>
            <textarea value={form.institution_description}
              onChange={e => set('institution_description', e.target.value)} rows={4}
              placeholder="Mission, histoire, programmes proposés, accréditations..."
              className="w-full bg-bg2 border border-border rounded-xl px-4 py-3 text-sm text-text outline-none focus:border-blue/50 resize-none" />
          </div>
        </Card>

        {/* Signature */}
        <Card className="p-6">
          <h2 className="font-semibold text-text mb-1">Signature officielle</h2>
          <p className="text-xs text-text3 mb-4">
            Cette signature apparaîtra sur tous les certificats délivrés par votre institution.
          </p>
          <div className="flex items-start gap-5">
            <div className="w-40 h-20 rounded-xl border-2 border-border bg-bg2 flex items-center justify-center flex-shrink-0 overflow-hidden">
              {sigUrl
                ? <img src={sigUrl} alt="Signature" className="w-full h-full object-contain p-2" />
                : <p className="text-xs text-text3 text-center px-2">Aucune signature</p>}
            </div>
            <div>
              <button onClick={() => sigRef.current?.click()} disabled={uploadingSig}
                className="flex items-center gap-2 text-sm bg-bg2 border border-border text-text px-4 py-2.5 rounded-xl hover:bg-card transition-colors disabled:opacity-50">
                {uploadingSig
                  ? <span className="w-4 h-4 border-2 border-text3 border-t-text rounded-full animate-spin" />
                  : <Upload size={14} />}
                {uploadingSig ? 'Upload...' : 'Importer la signature'}
              </button>
              <p className="text-xs text-text3 mt-1.5">PNG transparent · max 5 MB · fond transparent recommandé</p>
              {sigUrl && (
                <button onClick={async () => {
                  await supabase.from('profiles').update({ signature_url: null }).eq('id', profile!.id)
                  setSigUrl(null)
                  toast.success('Signature supprimée')
                }} className="flex items-center gap-1 text-xs text-red hover:underline mt-2">
                  <X size={11} /> Supprimer la signature
                </button>
              )}
              <input ref={sigRef} type="file" accept="image/*" className="hidden"
                onChange={e => {
                  const f = e.target.files?.[0]
                  if (f) uploadFile(f, 'signatures', 'signature_url', setSigUrl, setUploadingSig)
                }} />
            </div>
          </div>
        </Card>

        <div className="flex justify-end">
          <Button loading={saving} onClick={handleSave}>Sauvegarder les modifications</Button>
        </div>
      </div>
    </DashboardLayout>
  )
}