'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { createBrowserClient } from '@/lib/supabase/browser'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { Card, EmptyState, Spinner, Button, Input } from '@/components/ui'
import {
  LayoutDashboard, BookOpen, UserCheck, Users, BarChart2,
  Globe, Settings, GraduationCap, BookMarked, Plus, X,
  Pencil, Trash2, ArrowLeft, ArrowRight
} from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const navItems = [
  { label: 'Vue d\'ensemble', href: '/dashboard/institution',         icon: <LayoutDashboard size={16} /> },
  { label: 'Mode académique', href: '/dashboard/institution/academic', icon: <GraduationCap size={16} /> },
  { label: 'Cours',           href: '/dashboard/institution/courses',  icon: <BookOpen size={16} /> },
  { label: 'Équipe',          href: '/dashboard/institution/teachers', icon: <UserCheck size={16} /> },
  { label: 'Étudiants',       href: '/dashboard/institution/students', icon: <Users size={16} /> },
  { label: 'Analytiques',     href: '/dashboard/institution/analytics',icon: <BarChart2 size={16} /> },
  { label: 'Page publique',   href: '/dashboard/institution/profile',  icon: <Globe size={16} /> },
  { label: 'Paramètres',      href: '/dashboard/institution/settings', icon: <Settings size={16} /> },
]

const SUBJECT_TEMPLATES = {
  secondary: [
    { name: 'Français',             code: 'FR',    color: '#3b82f6', coefficient: 3, category: 'language' },
    { name: 'Mathématiques',        code: 'MATH',  color: '#8b5cf6', coefficient: 3, category: 'science' },
    { name: 'Philosophie',          code: 'PHILO', color: '#ec4899', coefficient: 3, category: 'general' },
    { name: 'Sciences Physiques',   code: 'PHYS',  color: '#f59e0b', coefficient: 2, category: 'science' },
    { name: 'Sciences Naturelles',  code: 'SN',    color: '#10b981', coefficient: 2, category: 'science' },
    { name: 'Anglais',              code: 'ENG',   color: '#06b6d4', coefficient: 2, category: 'language' },
    { name: 'Espagnol',             code: 'ESP',   color: '#f97316', coefficient: 1, category: 'language' },
    { name: 'Histoire-Géographie',  code: 'HG',    color: '#84cc16', coefficient: 2, category: 'general' },
    { name: 'Éducation Civique',    code: 'EC',    color: '#64748b', coefficient: 1, category: 'general' },
    { name: 'Créole haïtien',       code: 'KR',    color: '#dc2626', coefficient: 2, category: 'language' },
  ],
  university: [
    { name: 'Mathématiques I',      code: 'MATH1', color: '#8b5cf6', coefficient: 4, category: 'science' },
    { name: 'Programmation I',      code: 'PROG1', color: '#3b82f6', coefficient: 4, category: 'specialized' },
    { name: 'Base de données',      code: 'BDD',   color: '#06b6d4', coefficient: 3, category: 'specialized' },
    { name: 'Systèmes & Réseaux',   code: 'SR',    color: '#f59e0b', coefficient: 3, category: 'specialized' },
    { name: 'Anglais technique',    code: 'ENGT',  color: '#10b981', coefficient: 2, category: 'language' },
    { name: 'Gestion de projet',    code: 'GP',    color: '#ec4899', coefficient: 2, category: 'general' },
  ],
}

export default function SubjectsPage() {
  const { profile } = useAuth()
  const supabase = createBrowserClient()
  const [subjects, setSubjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '', code: '', color: '#4f6ef7',
    coefficient: '1', credit_hours: '3', category: 'general',
  })

  const load = async () => {
    if (!profile) return
    const { data } = await supabase.from('academic_subjects')
      .select('*').eq('institution_id', profile.id).order('name')
    setSubjects(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [profile])

  const resetForm = () => {
    setForm({ name: '', code: '', color: '#4f6ef7', coefficient: '1', credit_hours: '3', category: 'general' })
    setEditingId(null)
    setShowForm(false)
  }

  const handleSave = async () => {
    if (!profile || !form.name.trim()) { toast.error('Nom requis'); return }
    setSaving(true)
    const payload = {
      institution_id: profile.id,
      name:           form.name,
      code:           form.code.toUpperCase() || null,
      color:          form.color,
      coefficient:    parseFloat(form.coefficient) || 1,
      credit_hours:   parseInt(form.credit_hours) || 3,
      category:       form.category,
    }
    let error
    if (editingId) {
      const res = await supabase.from('academic_subjects').update(payload).eq('id', editingId)
      error = res.error
    } else {
      const res = await supabase.from('academic_subjects').insert(payload)
      error = res.error
    }
    if (error) toast.error(error.message)
    else { toast.success(editingId ? 'Matière mise à jour' : 'Matière créée !'); resetForm(); load() }
    setSaving(false)
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Supprimer "${name}" ?`)) return
    const { error } = await supabase.from('academic_subjects').delete().eq('id', id)
    if (error) toast.error(error.message)
    else { toast.success('Matière supprimée'); load() }
  }

  const importTemplates = async (type: 'secondary' | 'university') => {
    if (!profile) return
    const templates = SUBJECT_TEMPLATES[type]
    for (const t of templates) {
      await supabase.from('academic_subjects').upsert(
        { institution_id: profile.id, ...t },
        { onConflict: 'institution_id,name', ignoreDuplicates: true }
      )
    }
    toast.success(`${templates.length} matières importées !`)
    load()
  }

  if (loading) return (
    <DashboardLayout navItems={navItems} title="Matières" role="institution">
      <div className="flex justify-center py-16"><Spinner size="lg" /></div>
    </DashboardLayout>
  )

  const CATEGORIES = [
    { value: 'general',     label: 'Général',     color: 'bg-blue/10 text-blue' },
    { value: 'science',     label: 'Sciences',    color: 'bg-green/10 text-green' },
    { value: 'language',    label: 'Langue',      color: 'bg-yellow/10 text-yellow' },
    { value: 'specialized', label: 'Spécialisé', color: 'bg-purple/10 text-purple' },
    { value: 'elective',    label: 'Optionnel',  color: 'bg-text3/10 text-text3' },
  ]

  return (
    <DashboardLayout navItems={navItems} title="Matières" role="institution">
      <div className="max-w-3xl">
        <div className="flex items-center gap-2 mb-6">
          <a href="/dashboard/institution/academic"
            className="inline-flex items-center gap-1.5 text-xs text-text3 hover:text-text transition-colors">
            <ArrowLeft size={12} /> Mode académique
          </a>
          <span className="text-text3">/</span>
          <span className="text-xs text-text">Matières</span>
        </div>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-text">Matières</h1>
            <p className="text-text3 text-sm mt-0.5">{subjects.length} matière{subjects.length > 1 ? 's' : ''} définies</p>
          </div>
          <div className="flex gap-2">
            <div className="relative group">
              <button className="text-sm bg-bg2 border border-border text-text px-4 py-2.5 rounded-xl hover:bg-card transition-colors">
                Importer un modèle ▾
              </button>
              <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-xl shadow-lg z-10 hidden group-hover:block w-52">
                <button onClick={() => importTemplates('secondary')}
                  className="w-full text-left px-4 py-3 text-sm hover:bg-bg2 transition-colors border-b border-border">
                  🏫 Lycée haïtien (10 matières)
                </button>
                <button onClick={() => importTemplates('university')}
                  className="w-full text-left px-4 py-3 text-sm hover:bg-bg2 transition-colors">
                  🎓 Université Info (6 matières)
                </button>
              </div>
            </div>
            <button onClick={() => setShowForm(true)}
              className="flex items-center gap-2 text-sm text-white font-medium px-4 py-2.5 rounded-xl edha-gradient hover:opacity-90 transition-opacity">
              <Plus size={15} /> Ajouter
            </button>
          </div>
        </div>

        {/* Form */}
        {showForm && (
          <Card className="p-5 mb-5 border-blue/20 bg-blue/5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-text">{editingId ? 'Modifier' : 'Nouvelle'} matière</h3>
              <button onClick={resetForm} className="text-text3 hover:text-text"><X size={16} /></button>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <Input label="Nom de la matière *" value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="ex: Mathématiques" />
              <Input label="Code (optionnel)" value={form.code}
                onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                placeholder="ex: MATH" />
            </div>
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-text2">Catégorie</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full bg-bg2 border border-border rounded-xl px-3 py-2.5 text-sm text-text outline-none focus:border-blue/50">
                  {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-text2">Coefficient</label>
                <input type="number" min="0.5" max="5" step="0.5" value={form.coefficient}
                  onChange={e => setForm(f => ({ ...f, coefficient: e.target.value }))}
                  className="w-full bg-bg2 border border-border rounded-xl px-3 py-2.5 text-sm text-text outline-none focus:border-blue/50" />
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-text2">Crédits (univ.)</label>
                <input type="number" min="1" max="6" value={form.credit_hours}
                  onChange={e => setForm(f => ({ ...f, credit_hours: e.target.value }))}
                  className="w-full bg-bg2 border border-border rounded-xl px-3 py-2.5 text-sm text-text outline-none focus:border-blue/50" />
              </div>
            </div>
            <div className="flex items-center gap-3 mb-4">
              <label className="text-sm font-medium text-text2">Couleur</label>
              <input type="color" value={form.color}
                onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                className="h-9 w-16 rounded-lg border border-border cursor-pointer bg-bg2" />
              <div className="flex-1 h-2 rounded-full" style={{ backgroundColor: form.color + '40' }} />
            </div>
            <Button loading={saving} onClick={handleSave}>
              {editingId ? 'Mettre à jour' : 'Créer la matière'}
            </Button>
          </Card>
        )}

        {/* Subjects list */}
        {subjects.length === 0 ? (
          <Card className="p-12">
            <EmptyState icon={<BookMarked size={32} />}
              title="Aucune matière définie"
              description="Ajoutez les matières de votre institution ou importez un modèle prédéfini."
              action={
                <button onClick={() => setShowForm(true)}
                  className="inline-flex items-center gap-2 edha-gradient text-white px-5 py-2.5 rounded-xl text-sm font-medium">
                  <Plus size={15} /> Ajouter une matière
                </button>
              }
            />
          </Card>
        ) : (
          <div className="space-y-2">
            {subjects.map((s: any) => {
              const cat = CATEGORIES.find(c => c.value === s.category)
              return (
                <Card key={s.id} className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-4 h-10 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-text">{s.name}</p>
                        {s.code && (
                          <span className="text-[10px] bg-bg2 text-text3 px-1.5 py-0.5 rounded font-mono">{s.code}</span>
                        )}
                        {cat && (
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${cat.color}`}>
                            {cat.label}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-text3 mt-0.5">
                        Coeff. {s.coefficient} · {s.credit_hours} crédits
                      </p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button onClick={() => {
                        setForm({
                          name: s.name, code: s.code || '', color: s.color,
                          coefficient: s.coefficient.toString(),
                          credit_hours: s.credit_hours.toString(),
                          category: s.category,
                        })
                        setEditingId(s.id)
                        setShowForm(true)
                      }} className="w-8 h-8 bg-bg2 hover:bg-blue/10 rounded-lg flex items-center justify-center text-text3 hover:text-blue transition-all">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => handleDelete(s.id, s.name)}
                        className="w-8 h-8 bg-bg2 hover:bg-red/10 rounded-lg flex items-center justify-center text-text3 hover:text-red transition-all">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}

        {/* Navigation */}
        {subjects.length > 0 && (
          <div className="flex justify-between mt-6">
            <a href="/dashboard/institution/academic/periods"
              className="flex items-center gap-1.5 text-sm text-text3 hover:text-text transition-colors">
              <ArrowLeft size={14} /> Périodes
            </a>
            <a href="/dashboard/institution/academic/assign"
              className="flex items-center gap-1.5 text-sm text-blue hover:underline font-medium">
              Assigner aux sections <ArrowRight size={14} />
            </a>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}