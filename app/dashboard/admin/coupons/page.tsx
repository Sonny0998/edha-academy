'use client'
import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase/browser'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { Card, Badge, Button, Input, Spinner } from '@/components/ui'
import {
  Users, BookOpen, CreditCard, Settings, LayoutDashboard,
  Tag, Activity, Ticket, Plus, Trash2, ToggleLeft, ToggleRight, X, Save
, BarChart2} from 'lucide-react'
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

const emptyForm = {
  code: '', discount_type: 'percent', discount_value: '',
  max_uses: '', expires_at: '', is_active: true,
}

function randomCode() {
  return 'EDHA' + Math.random().toString(36).substring(2, 8).toUpperCase()
}

export default function AdminCouponsPage() {
  const supabase = createBrowserClient()
  const [coupons, setCoupons] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [saving, setSaving]   = useState(false)
  const [form, setForm]       = useState(emptyForm)

  const load = async () => {
    const { data } = await supabase
      .from('coupons').select('*').order('created_at', { ascending: false })
    setCoupons(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  const saveNew = async () => {
    if (!form.code.trim() || !form.discount_value) {
      toast.error('Code et valeur requis')
      return
    }
    setSaving(true)
    const { error } = await supabase.from('coupons').insert({
      code: form.code.trim().toUpperCase(),
      discount_type: form.discount_type,
      discount_value: parseFloat(form.discount_value),
      max_uses: form.max_uses ? parseInt(form.max_uses) : null,
      expires_at: form.expires_at || null,
      is_active: form.is_active,
    })
    if (error) {
      toast.error(error.code === '23505' ? 'Ce code existe déjà' : error.message)
    } else {
      toast.success('Coupon créé !')
      setForm(emptyForm)
      setShowNew(false)
      load()
    }
    setSaving(false)
  }

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from('coupons').update({ is_active: !current }).eq('id', id)
    setCoupons(c => c.map(co => co.id === id ? { ...co, is_active: !current } : co))
  }

  const deleteCoupon = async (id: string, code: string) => {
    if (!confirm(`Supprimer le coupon "${code}" ?`)) return
    await supabase.from('coupons').delete().eq('id', id)
    setCoupons(c => c.filter(co => co.id !== id))
    toast.success('Coupon supprimé')
  }

  const isExpired = (date: string | null) => date && new Date(date) < new Date()

  if (loading) return (
    <DashboardLayout navItems={navItems} title="Coupons" role="admin">
      <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>
    </DashboardLayout>
  )

  return (
    <DashboardLayout navItems={navItems} title="Coupons" role="admin">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-text">Coupons de réduction</h1>
        <Button onClick={() => setShowNew(true)}><Plus size={15} /> Nouveau coupon</Button>
      </div>

      {/* New coupon form */}
      {showNew && (
        <Card className="p-6 mb-6 border-blue/30">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-text">Créer un coupon</h2>
            <button onClick={() => setShowNew(false)} className="text-text3 hover:text-text"><X size={18} /></button>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-text2">Code</label>
              <div className="flex gap-2">
                <input value={form.code} onChange={e => set('code', e.target.value.toUpperCase())}
                  placeholder="EDHA2025" maxLength={20}
                  className="flex-1 bg-card2 border border-border rounded-xl px-4 py-2.5 text-sm text-text font-mono outline-none focus:border-blue" />
                <button onClick={() => set('code', randomCode())}
                  className="px-3 bg-card2 border border-border rounded-xl text-xs text-text2 hover:text-text transition-colors whitespace-nowrap">
                  Générer
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-text2">Type de réduction</label>
              <select value={form.discount_type} onChange={e => set('discount_type', e.target.value)}
                className="w-full bg-card2 border border-border rounded-xl px-4 py-2.5 text-sm text-text outline-none focus:border-blue">
                <option value="percent">Pourcentage (%)</option>
                <option value="fixed">Montant fixe ($)</option>
              </select>
            </div>
            <Input label={`Valeur ${form.discount_type === 'percent' ? '(%)' : '($)'}`}
              type="number" value={form.discount_value} onChange={e => set('discount_value', e.target.value)}
              placeholder={form.discount_type === 'percent' ? '20' : '5.00'} />
            <Input label="Utilisations max (vide = illimité)" type="number"
              value={form.max_uses} onChange={e => set('max_uses', e.target.value)} placeholder="100" />
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-text2">Expire le (optionnel)</label>
              <input type="date" value={form.expires_at} onChange={e => set('expires_at', e.target.value)}
                className="w-full bg-card2 border border-border rounded-xl px-4 py-2.5 text-sm text-text outline-none focus:border-blue" />
            </div>
            <div className="flex items-center gap-3 pt-5">
              <span className="text-sm text-text2">Actif immédiatement</span>
              <button onClick={() => set('is_active', !form.is_active)}>
                {form.is_active
                  ? <ToggleRight size={28} className="text-green" />
                  : <ToggleLeft size={28} className="text-text3" />}
              </button>
            </div>
          </div>
          <div className="flex gap-3">
            <Button onClick={saveNew} loading={saving}><Save size={15} /> Créer le coupon</Button>
            <Button variant="secondary" onClick={() => setShowNew(false)}>Annuler</Button>
          </div>
        </Card>
      )}

      {/* Coupons table */}
      {coupons.length === 0 ? (
        <Card className="p-8 text-center">
          <Ticket size={32} className="text-text3 mx-auto mb-3" />
          <p className="text-text2 font-medium">Aucun coupon créé</p>
          <p className="text-text3 text-sm mt-1">Créez votre premier coupon pour offrir des réductions.</p>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-text3 text-xs border-b border-border">
                  <th className="text-left px-5 py-3">Code</th>
                  <th className="text-left px-5 py-3">Réduction</th>
                  <th className="text-left px-5 py-3">Utilisations</th>
                  <th className="text-left px-5 py-3">Expiration</th>
                  <th className="text-left px-5 py-3">Statut</th>
                  <th className="text-right px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {coupons.map(c => (
                  <tr key={c.id} className="hover:bg-card2/50 transition-colors">
                    <td className="px-5 py-3">
                      <span className="font-mono font-bold text-text bg-card2 px-2 py-1 rounded-lg">{c.code}</span>
                    </td>
                    <td className="px-5 py-3 font-semibold text-green">
                      {c.discount_type === 'percent' ? `${c.discount_value}%` : `$${c.discount_value}`}
                    </td>
                    <td className="px-5 py-3 text-text2">
                      {c.used_count} {c.max_uses ? `/ ${c.max_uses}` : '/ ∞'}
                    </td>
                    <td className="px-5 py-3">
                      {c.expires_at
                        ? <span className={isExpired(c.expires_at) ? 'text-red text-xs' : 'text-text3 text-xs'}>
                            {isExpired(c.expires_at) ? '⚠ Expiré — ' : ''}
                            {new Date(c.expires_at).toLocaleDateString('fr-FR')}
                          </span>
                        : <span className="text-text3 text-xs">Pas d'expiration</span>}
                    </td>
                    <td className="px-5 py-3">
                      <Badge variant={c.is_active && !isExpired(c.expires_at) ? 'green' : 'default'}>
                        {c.is_active && !isExpired(c.expires_at) ? 'Actif' : 'Inactif'}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => toggleActive(c.id, c.is_active)}
                          className="text-text3 hover:text-text transition-colors" title={c.is_active ? 'Désactiver' : 'Activer'}>
                          {c.is_active ? <ToggleRight size={22} className="text-green" /> : <ToggleLeft size={22} />}
                        </button>
                        <button onClick={() => deleteCoupon(c.id, c.code)}
                          className="p-1.5 hover:bg-red/10 rounded-lg text-text3 hover:text-red transition-all">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </DashboardLayout>
  )
}
