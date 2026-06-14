'use client'
import { useEffect, useState, useRef } from 'react'
import { createBrowserClient } from '@/lib/supabase/browser'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { Card, Button, Input, Spinner } from '@/components/ui'
import {
  Users, BookOpen, CreditCard, Settings, LayoutDashboard,
  Tag, Activity, Ticket, BarChart2, Save, Globe,
  ToggleLeft, ToggleRight, AlertTriangle, CheckCircle,
  Upload, X, PenLine
} from 'lucide-react'
import toast from 'react-hot-toast'

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

interface GeneralSettings {
  platform_name: string
  allow_registrations: boolean
  maintenance_mode: boolean
}

interface PricingSettings {
  platform_free: boolean
  subscription_enabled: boolean
  subscription_price: number | null
  certificate_price: number | null
}

export default function AdminSettingsPage() {
  const supabase = createBrowserClient()
  const sigRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading]           = useState(true)
  const [saving, setSaving]             = useState(false)
  const [uploadingSig, setUploadingSig] = useState(false)
  const [adminSigUrl, setAdminSigUrl]   = useState<string | null>(null)
  const [adminName, setAdminName]       = useState('Direction EDHA Academy')

  const [general, setGeneral] = useState<GeneralSettings>({
    platform_name: 'EDHA Academy',
    allow_registrations: true,
    maintenance_mode: false,
  })
  const [pricing, setPricing] = useState<PricingSettings>({
    platform_free: true,
    subscription_enabled: false,
    subscription_price: null,
    certificate_price: null,
  })

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('platform_settings').select('*')

      if (data) {
        // Handle both key-value format and single row format
        for (const row of data) {
          if (row.key === 'general') setGeneral(g => ({ ...g, ...(row.value as any) }))
          if (row.key === 'pricing') setPricing(p => ({ ...p, ...(row.value as any) }))
          // Direct columns format (after SQL migration)
          if (row.admin_signature_url !== undefined) setAdminSigUrl(row.admin_signature_url)
          if (row.admin_name !== undefined) setAdminName(row.admin_name || 'Direction EDHA Academy')
        }
      }
      setLoading(false)
    }
    load()
  }, [])

  const handleSignatureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { toast.error('Image uniquement'); return }
    if (file.size > 5 * 1024 * 1024)    { toast.error('Max 5 MB'); return }

    setUploadingSig(true)
    const ext  = file.name.split('.').pop()
    const path = `signatures/edha-official/signature-${Date.now()}.${ext}`

    const { error } = await supabase.storage
      .from('course-resources')
      .upload(path, file, { upsert: true, contentType: file.type })

    if (error) { toast.error('Erreur upload'); setUploadingSig(false); return }

    const { data } = supabase.storage.from('course-resources').getPublicUrl(path)
    const url = data.publicUrl

    // Save to platform_settings
    await supabase.from('platform_settings')
      .upsert({ key: 'signature', value: { admin_signature_url: url, admin_name: adminName } as any }, { onConflict: 'key' })

    // Also update direct columns if they exist
    await supabase.from('platform_settings')
      .update({ admin_signature_url: url } as any)
      .neq('id', '00000000-0000-0000-0000-000000000000') // update all rows

    setAdminSigUrl(url)
    toast.success('Signature EDHA mise à jour ! Elle apparaîtra sur tous les certificats.')
    setUploadingSig(false)
  }

  const handleDeleteSignature = async () => {
    await supabase.from('platform_settings')
      .upsert({ key: 'signature', value: { admin_signature_url: null, admin_name: adminName } as any }, { onConflict: 'key' })
    setAdminSigUrl(null)
    toast.success('Signature supprimée')
  }

  const save = async () => {
    setSaving(true)

    // Save admin name for signature
    await supabase.from('platform_settings')
      .upsert({ key: 'signature', value: { admin_signature_url: adminSigUrl, admin_name: adminName } as any }, { onConflict: 'key' })

    const updates = [
      supabase.from('platform_settings').upsert({ key: 'general', value: general as any }, { onConflict: 'key' }),
      supabase.from('platform_settings').upsert({ key: 'pricing', value: pricing as any }, { onConflict: 'key' }),
    ]
    const results = await Promise.all(updates)
    const anyError = results.find(r => r.error)
    if (anyError?.error) {
      toast.error('Erreur: ' + anyError.error.message)
    } else {
      toast.success('Paramètres sauvegardés !')
    }
    setSaving(false)
  }

  const Toggle = ({ value, onChange, label }: {
    value: boolean; onChange: (v: boolean) => void; label: string
  }) => (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
      <span className="text-sm text-text">{label}</span>
      <button onClick={() => onChange(!value)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
          value
            ? 'bg-green/10 text-green border border-green/20'
            : 'bg-bg2 text-text3 border border-border'
        }`}>
        {value ? <ToggleRight size={15}/> : <ToggleLeft size={15}/>}
        {value ? 'Activé' : 'Désactivé'}
      </button>
    </div>
  )

  if (loading) return (
    <DashboardLayout navItems={navItems} title="Paramètres" role="admin">
      <div className="flex justify-center py-16"><Spinner size="lg"/></div>
    </DashboardLayout>
  )

  return (
    <DashboardLayout navItems={navItems} title="Paramètres" role="admin">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-text">Paramètres de la plateforme</h1>
        <Button onClick={save} loading={saving}>
          <Save size={15}/> Sauvegarder
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Général */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Globe size={18} className="text-blue"/>
            <h2 className="font-semibold text-text">Paramètres généraux</h2>
          </div>
          <Input label="Nom de la plateforme" value={general.platform_name}
            onChange={e => setGeneral(g => ({ ...g, platform_name: e.target.value }))}/>
          <div className="rounded-xl border border-border overflow-hidden">
            <Toggle value={general.allow_registrations}
              onChange={v => setGeneral(g => ({ ...g, allow_registrations: v }))}
              label="Inscriptions ouvertes"/>
            <Toggle value={general.maintenance_mode}
              onChange={v => setGeneral(g => ({ ...g, maintenance_mode: v }))}
              label="Mode maintenance"/>
          </div>
          {general.maintenance_mode && (
            <div className="bg-yellow/10 border border-yellow/20 rounded-xl p-3 flex items-center gap-2">
              <AlertTriangle size={15} className="text-yellow flex-shrink-0"/>
              <p className="text-xs text-yellow">Mode maintenance actif — seuls les admins peuvent accéder</p>
            </div>
          )}
        </Card>

        {/* Tarification */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <CreditCard size={18} className="text-blue"/>
            <h2 className="font-semibold text-text">Tarification</h2>
          </div>
          <div className="rounded-xl border border-border overflow-hidden">
            <Toggle value={pricing.platform_free}
              onChange={v => setPricing(p => ({ ...p, platform_free: v }))}
              label="Tous les cours gratuits"/>
            <Toggle value={pricing.subscription_enabled}
              onChange={v => setPricing(p => ({ ...p, subscription_enabled: v }))}
              label="Abonnement mensuel"/>
          </div>
          {pricing.subscription_enabled && (
            <Input label="Prix de l'abonnement (USD/mois)"
              type="number" min="0" step="0.01"
              value={pricing.subscription_price?.toString() || ''}
              onChange={e => setPricing(p => ({ ...p, subscription_price: parseFloat(e.target.value) || null }))}
              placeholder="Ex: 9.99"/>
          )}
          <Input label="Prix du certificat (USD, optionnel)"
            type="number" min="0" step="0.01"
            value={pricing.certificate_price?.toString() || ''}
            onChange={e => setPricing(p => ({ ...p, certificate_price: parseFloat(e.target.value) || null }))}
            placeholder="Laisser vide = gratuit"/>
        </Card>

        {/* ── Signature officielle EDHA ── */}
        <Card className="p-6 lg:col-span-2">
          <div className="flex items-center gap-2 mb-1">
            <PenLine size={18} className="text-blue"/>
            <h2 className="font-semibold text-text">Signature officielle EDHA</h2>
          </div>
          <p className="text-xs text-text3 mb-5">
            Cette signature apparaîtra sur TOUS les certificats de la plateforme — cours individuels et programmes institutionnels.
            Utilisez une signature manuscrite scannée en PNG avec fond transparent.
          </p>

          <div className="flex flex-col sm:flex-row items-start gap-6">
            {/* Preview */}
            <div className="w-52 h-24 rounded-xl border-2 border-border bg-bg2 flex items-center justify-center flex-shrink-0 overflow-hidden">
              {adminSigUrl ? (
                <img src={adminSigUrl} alt="Signature EDHA" className="w-full h-full object-contain p-3" />
              ) : (
                <p className="text-xs text-text3 text-center px-4">Aucune signature officielle</p>
              )}
            </div>

            <div className="space-y-3 flex-1">
              <Input
                label="Nom affiché sous la signature"
                value={adminName}
                onChange={e => setAdminName(e.target.value)}
                placeholder="Direction EDHA Academy"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => sigRef.current?.click()}
                  disabled={uploadingSig}
                  className="flex items-center gap-2 text-sm bg-bg2 border border-border text-text px-4 py-2.5 rounded-xl hover:bg-card transition-colors disabled:opacity-50"
                >
                  {uploadingSig
                    ? <span className="w-4 h-4 border-2 border-text3 border-t-text rounded-full animate-spin" />
                    : <Upload size={14} />}
                  {uploadingSig ? 'Upload...' : adminSigUrl ? 'Changer la signature' : 'Importer la signature'}
                </button>
                {adminSigUrl && (
                  <button onClick={handleDeleteSignature}
                    className="flex items-center gap-1.5 text-sm text-red border border-red/20 bg-red/5 hover:bg-red/10 px-4 py-2.5 rounded-xl transition-colors">
                    <X size={13} /> Supprimer
                  </button>
                )}
              </div>
              <p className="text-xs text-text3">PNG avec fond transparent · max 5 MB · recommandé 400×150px</p>
              <input ref={sigRef} type="file" accept="image/*" className="hidden" onChange={handleSignatureUpload} />
            </div>
          </div>
        </Card>

        {/* Info */}
        <Card className="p-6 lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle size={18} className="text-green"/>
            <h2 className="font-semibold text-text">À propos des paramètres</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { icon: '💾', title: 'Stockage en DB', desc: 'Les paramètres sont sauvegardés dans Supabase — pas dans le navigateur' },
              { icon: '🔐', title: 'Admin seulement', desc: 'RLS Supabase protège ces données — seuls les admins y ont accès' },
              { icon: '🌐', title: 'Temps réel', desc: 'Modifications appliquées immédiatement sur toute la plateforme' },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="bg-bg2 rounded-xl p-4">
                <p className="font-medium text-text mb-1">{icon} {title}</p>
                <p className="text-xs text-text3">{desc}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  )
}