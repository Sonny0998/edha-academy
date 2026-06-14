'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { createBrowserClient } from '@/lib/supabase/browser'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { Card, EmptyState, Spinner, Button, Input } from '@/components/ui'
import {
  LayoutDashboard, BookOpen, UserCheck, Users, BarChart2,
  Globe, Settings, GraduationCap, Plus, X, Pencil,
  Trash2, ArrowLeft, ArrowRight, GripVertical
} from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import Link from 'next/link'

const navItems = [
  { label: 'Vue d\'ensemble', href: '/dashboard/institution',          icon: <LayoutDashboard size={16} /> },
  { label: 'Mode académique', href: '/dashboard/institution/academic', icon: <GraduationCap size={16} /> },
  { label: 'Cours',           href: '/dashboard/institution/courses',  icon: <BookOpen size={16} /> },
  { label: 'Équipe',          href: '/dashboard/institution/teachers', icon: <UserCheck size={16} /> },
  { label: 'Étudiants',       href: '/dashboard/institution/students', icon: <Users size={16} /> },
  { label: 'Analytiques',     href: '/dashboard/institution/analytics',icon: <BarChart2 size={16} /> },
  { label: 'Page publique',   href: '/dashboard/institution/profile',  icon: <Globe size={16} /> },
  { label: 'Paramètres',      href: '/dashboard/institution/settings', icon: <Settings size={16} /> },
]

const LEVEL_TEMPLATES = {
  lycee: ['3ème', 'Seconde', 'Rhéto', 'Philo'],
  univ_info: ['Licence 1', 'Licence 2', 'Licence 3', 'Master 1', 'Master 2'],
  primaire: ['1ère', '2ème', '3ème', '4ème', '5ème', '6ème'],
}

export default function LevelsPage() {
  const { profile } = useAuth()
  const supabase = createBrowserClient()
  const [levels, setLevels]         = useState<any[]>([])
  const [years, setYears]           = useState<any[]>([])
  const [selectedYear, setSelectedYear] = useState('')
  const [loading, setLoading]       = useState(true)
  const [showForm, setShowForm]     = useState(false)
  const [editingId, setEditingId]   = useState<string | null>(null)
  const [saving, setSaving]         = useState(false)
  const [form, setForm] = useState({ name: '', level_type: 'secondary', order_num: '1' })

  const load = async () => {
    if (!profile) return
    const { data: y } = await supabase.from('academic_years')
      .select('*').eq('institution_id', profile.id).order('created_at', { ascending: false })
    setYears(y || [])
    const currentYear = (y || []).find((yr: any) => yr.is_current)
    if (currentYear && !selectedYear) setSelectedYear(currentYear.id)
    setLoading(false)
  }

  const loadLevels = async () => {
    if (!profile || !selectedYear) return
    const { data } = await supabase.from('class_levels')
      .select('*').eq('institution_id', profile.id)
      .eq('academic_year_id', selectedYear).order('order_num')
    setLevels(data || [])
  }

  useEffect(() => { load() }, [profile])
  useEffect(() => { loadLevels() }, [selectedYear, profile])

  const resetForm = () => {
    setForm({ name: '', level_type: 'secondary', order_num: String((levels.length || 0) + 1) })
    setEditingId(null)
    setShowForm(false)
  }

  const handleSave = async () => {
    if (!profile || !selectedYear) return
    if (!form.name.trim()) { toast.error('Nom requis'); return }
    setSaving(true)
    const payload = {
      institution_id:   profile.id,
      academic_year_id: selectedYear,
      name:             form.name.trim(),
      level_type:       form.level_type,
      order_num:        parseInt(form.order_num) || levels.length + 1,
    }
    let error
    if (editingId) {
      const res = await supabase.from('class_levels').update(payload).eq('id', editingId)
      error = res.error
    } else {
      const res = await supabase.from('class_levels').insert(payload)
      error = res.error
    }
    if (error) toast.error(error.message)
    else { toast.success(editingId ? 'Niveau mis à jour' : 'Niveau créé !'); resetForm(); loadLevels() }
    setSaving(false)
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Supprimer le niveau "${name}" ? Les sections associées seront aussi supprimées.`)) return
    const { error } = await supabase.from('class_levels').delete().eq('id', id)
    if (error) toast.error(error.message)
    else { toast.success('Niveau supprimé'); loadLevels() }
  }

  const importTemplate = async (key: keyof typeof LEVEL_TEMPLATES) => {
    if (!profile || !selectedYear) { toast.error('Sélectionnez une année d\'abord'); return }
    const names = LEVEL_TEMPLATES[key]
    const type = key === 'primaire' ? 'primary' : key === 'lycee' ? 'secondary' : 'university'
    for (let i = 0; i < names.length; i++) {
      await supabase.from('class_levels').upsert({
        institution_id: profile.id, academic_year_id: selectedYear,
        name: names[i], level_type: type, order_num: i + 1,
      }, { onConflict: 'institution_id,academic_year_id,name', ignoreDuplicates: true })
    }
    toast.success(`${names.length} niveaux importés !`)
    loadLevels()
  }

  if (loading) return (
    <DashboardLayout navItems={navItems} title="Niveaux" role="institution">
      <div className="flex justify-center py-16"><Spinner size="lg" /></div>
    </DashboardLayout>
  )

  const TYPE_LABELS: Record<string, string> = {
    primary: 'Primaire', secondary: 'Secondaire', university: 'Université'
  }
  const TYPE_COLORS: Record<string, string> = {
    primary: 'bg-green/10 text-green', secondary: 'bg-blue/10 text-blue', university: 'bg-purple/10 text-purple'
  }

  return (
    <DashboardLayout navItems={navItems} title="Niveaux de classe" role="institution">
      <div className="max-w-2xl">
        <Link href="/dashboard/institution/academic"
          className="inline-flex items-center gap-1.5 text-xs text-text3 hover:text-text mb-6 transition-colors">
          <ArrowLeft size={12} /> Mode académique
        </Link>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-text">Niveaux de classe</h1>
            <p className="text-text3 text-sm mt-0.5">Philo, Rhéto, Licence 1...</p>
          </div>
          <div className="flex gap-2">
            <div className="relative group">
              <button className="text-sm bg-bg2 border border-border text-text px-3 py-2 rounded-xl hover:bg-card transition-colors text-xs">
                Importer ▾
              </button>
              <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-xl shadow-lg z-10 hidden group-hover:block w-48">
                {[
                  { key: 'lycee', label: '🏫 Lycée haïtien' },
                  { key: 'univ_info', label: '🎓 Université (Licence→Master)' },
                  { key: 'primaire', label: '📚 École primaire' },
                ].map(t => (
                  <button key={t.key} onClick={() => importTemplate(t.key as any)}
                    className="w-full text-left px-4 py-2.5 text-xs hover:bg-bg2 transition-colors border-b border-border last:border-0">
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={() => setShowForm(true)}
              className="flex items-center gap-1.5 text-sm text-white font-medium px-3 py-2 rounded-xl edha-gradient hover:opacity-90 transition-opacity">
              <Plus size={14} /> Ajouter
            </button>
          </div>
        </div>

        {/* Year selector */}
        {years.length > 1 && (
          <div className="mb-4">
            <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)}
              className="bg-bg2 border border-border rounded-xl px-4 py-2.5 text-sm text-text outline-none focus:border-blue/50">
              {years.map(y => <option key={y.id} value={y.id}>{y.name}{y.is_current ? ' (en cours)' : ''}</option>)}
            </select>
          </div>
        )}

        {/* Form */}
        {showForm && (
          <Card className="p-5 mb-5 border-blue/20 bg-blue/5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-text">{editingId ? 'Modifier' : 'Nouveau'} niveau</h3>
              <button onClick={resetForm} className="text-text3 hover:text-text"><X size={16} /></button>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <Input label="Nom *" value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="ex: Philo, Licence 1" />
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-text2">Ordre</label>
                <input type="number" min="1" value={form.order_num}
                  onChange={e => setForm(f => ({ ...f, order_num: e.target.value }))}
                  className="w-full bg-bg2 border border-border rounded-xl px-4 py-2.5 text-sm text-text outline-none focus:border-blue/50" />
              </div>
            </div>
            <div className="space-y-1.5 mb-4">
              <label className="block text-sm font-medium text-text2">Type</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { v: 'primary',    l: 'Primaire' },
                  { v: 'secondary',  l: 'Secondaire' },
                  { v: 'university', l: 'Université' },
                ].map(t => (
                  <button key={t.v} onClick={() => setForm(f => ({ ...f, level_type: t.v }))}
                    className={clsx('py-2 rounded-xl border text-xs font-medium transition-all',
                      form.level_type === t.v ? 'border-blue bg-blue text-white' : 'border-border text-text3 hover:border-blue/30')}>
                    {t.l}
                  </button>
                ))}
              </div>
            </div>
            <Button loading={saving} onClick={handleSave} className="w-full">
              {editingId ? 'Mettre à jour' : 'Créer le niveau'}
            </Button>
          </Card>
        )}

        {/* Levels list */}
        {levels.length === 0 ? (
          <Card className="p-10 text-center">
            <EmptyState icon={<GraduationCap size={28} />}
              title="Aucun niveau défini"
              description="Créez les niveaux de votre institution ou importez un modèle."
              action={
                <button onClick={() => setShowForm(true)}
                  className="inline-flex items-center gap-2 edha-gradient text-white px-5 py-2.5 rounded-xl text-sm font-medium">
                  <Plus size={14} /> Créer un niveau
                </button>
              }
            />
          </Card>
        ) : (
          <div className="space-y-2">
            {levels.map((l: any) => (
              <Card key={l.id} className="p-4">
                <div className="flex items-center gap-3">
                  <GripVertical size={16} className="text-text3 flex-shrink-0 cursor-grab" />
                  <div className="w-8 h-8 bg-blue/10 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-bold text-blue">
                    {l.order_num}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-text">{l.name}</p>
                      <span className={clsx('text-[10px] px-2 py-0.5 rounded-full font-medium', TYPE_COLORS[l.level_type] || 'bg-bg2 text-text3')}>
                        {TYPE_LABELS[l.level_type] || l.level_type}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => {
                      setForm({ name: l.name, level_type: l.level_type, order_num: l.order_num.toString() })
                      setEditingId(l.id); setShowForm(true)
                    }} className="w-8 h-8 bg-bg2 hover:bg-blue/10 rounded-lg flex items-center justify-center text-text3 hover:text-blue transition-all">
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => handleDelete(l.id, l.name)}
                      className="w-8 h-8 bg-bg2 hover:bg-red/10 rounded-lg flex items-center justify-center text-text3 hover:text-red transition-all">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {levels.length > 0 && (
          <div className="flex justify-end mt-6">
            <Link href="/dashboard/institution/academic/sections"
              className="flex items-center gap-1.5 text-sm text-blue hover:underline font-medium">
              Suivant : Sections <ArrowRight size={14} />
            </Link>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}