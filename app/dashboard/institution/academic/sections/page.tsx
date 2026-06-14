'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { createBrowserClient } from '@/lib/supabase/browser'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { Card, EmptyState, Spinner, Button, Input } from '@/components/ui'
import {
  LayoutDashboard, BookOpen, UserCheck, Users, BarChart2,
  Globe, Settings, GraduationCap, Plus, X, Trash2,
  ArrowLeft, ArrowRight, CheckCircle
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

export default function SectionsPage() {
  const { profile } = useAuth()
  const supabase = createBrowserClient()
  const [levels, setLevels]     = useState<any[]>([])
  const [sections, setSections] = useState<any[]>([])
  const [teachers, setTeachers] = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    class_level_id: '', name: '', capacity: '30', main_teacher_id: ''
  })

  const load = async () => {
    if (!profile) return
    const [levRes, secRes, tchRes] = await Promise.all([
      supabase.from('class_levels').select('*, year:academic_years(name, is_current)')
        .eq('institution_id', profile.id).order('order_num'),
      supabase.from('class_sections').select('*, level:class_levels(name), teacher:profiles!main_teacher_id(full_name)')
        .eq('institution_id', profile.id),
      supabase.from('profiles').select('id, full_name')
        .eq('role', 'instructor').eq('institution_name', (profile as any).institution_name || ''),
    ])
    setLevels(levRes.data || [])
    setSections(secRes.data || [])
    setTeachers(tchRes.data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [profile])

  const handleSave = async () => {
    if (!profile || !form.class_level_id || !form.name.trim()) {
      toast.error('Niveau et nom requis')
      return
    }
    setSaving(true)
    const { error } = await supabase.from('class_sections').insert({
      institution_id:   profile.id,
      class_level_id:   form.class_level_id,
      name:             form.name.trim(),
      capacity:         parseInt(form.capacity) || 30,
      main_teacher_id:  form.main_teacher_id || null,
    })
    if (error) toast.error(error.message)
    else {
      toast.success('Section créée !')
      setShowForm(false)
      setForm({ class_level_id: '', name: '', capacity: '30', main_teacher_id: '' })
      load()
    }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette section ?')) return
    const { error } = await supabase.from('class_sections').delete().eq('id', id)
    if (error) toast.error(error.message)
    else { toast.success('Section supprimée'); load() }
  }

  // Group sections by level
  const groupedSections = levels.reduce((acc: any, level: any) => {
    acc[level.id] = {
      level,
      sections: sections.filter(s => s.class_level_id === level.id),
    }
    return acc
  }, {})

  if (loading) return (
    <DashboardLayout navItems={navItems} title="Sections" role="institution">
      <div className="flex justify-center py-16"><Spinner size="lg" /></div>
    </DashboardLayout>
  )

  return (
    <DashboardLayout navItems={navItems} title="Sections de classe" role="institution">
      <div className="max-w-2xl">
        <Link href="/dashboard/institution/academic/levels"
          className="inline-flex items-center gap-1.5 text-xs text-text3 hover:text-text mb-6 transition-colors">
          <ArrowLeft size={12} /> Niveaux
        </Link>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-text">Sections</h1>
            <p className="text-text3 text-sm mt-0.5">Philo A, Philo B, Rhéto Sciences...</p>
          </div>
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 text-sm text-white font-medium px-4 py-2.5 rounded-xl edha-gradient hover:opacity-90">
            <Plus size={15} /> Ajouter une section
          </button>
        </div>

        {levels.length === 0 && (
          <div className="bg-yellow/5 border border-yellow/20 rounded-xl p-4 mb-5 text-sm text-text2">
            ⚠️ Créez d&apos;abord des <Link href="/dashboard/institution/academic/levels" className="text-blue hover:underline">niveaux de classe</Link> avant d&apos;ajouter des sections.
          </div>
        )}

        {/* Add section form */}
        {showForm && (
          <Card className="p-5 mb-5 border-blue/20 bg-blue/5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-text">Nouvelle section</h3>
              <button onClick={() => setShowForm(false)} className="text-text3 hover:text-text"><X size={16} /></button>
            </div>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-text2">Niveau *</label>
                <select value={form.class_level_id} onChange={e => setForm(f => ({ ...f, class_level_id: e.target.value }))}
                  className="w-full bg-bg2 border border-border rounded-xl px-4 py-2.5 text-sm text-text outline-none focus:border-blue/50">
                  <option value="">Choisir un niveau...</option>
                  {levels.map(l => <option key={l.id} value={l.id}>{l.name} ({l.year?.name})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Nom de la section *" value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="ex: A, B, Sciences, Lettres" />
                <Input label="Capacité max" type="number" value={form.capacity}
                  onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))}
                  placeholder="30" />
              </div>
              {teachers.length > 0 && (
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-text2">Professeur principal (optionnel)</label>
                  <select value={form.main_teacher_id} onChange={e => setForm(f => ({ ...f, main_teacher_id: e.target.value }))}
                    className="w-full bg-bg2 border border-border rounded-xl px-4 py-2.5 text-sm text-text outline-none focus:border-blue/50">
                    <option value="">Aucun</option>
                    {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                  </select>
                </div>
              )}
              <Button loading={saving} onClick={handleSave} className="w-full">Créer la section</Button>
            </div>
          </Card>
        )}

        {/* Sections grouped by level */}
        <div className="space-y-6">
          {levels.map((level: any) => {
            const group = groupedSections[level.id]
            return (
              <div key={level.id}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm font-bold text-text">{level.name}</span>
                  <span className="text-xs text-text3">{level.year?.name}</span>
                  <button onClick={() => {
                    setForm(f => ({ ...f, class_level_id: level.id }))
                    setShowForm(true)
                  }} className="text-xs text-blue hover:underline flex items-center gap-1 ml-auto">
                    <Plus size={11} /> Ajouter section
                  </button>
                </div>
                {group.sections.length === 0 ? (
                  <p className="text-xs text-text3 italic pl-3">Aucune section — cliquez pour en ajouter</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {group.sections.map((s: any) => (
                      <Card key={s.id} className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue/10 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-blue text-sm">
                            {s.name}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-text text-sm">{level.name} — Section {s.name}</p>
                            <p className="text-xs text-text3 mt-0.5">
                              Cap. {s.capacity}{s.teacher ? ` · ${s.teacher.full_name}` : ''}
                            </p>
                          </div>
                          <button onClick={() => handleDelete(s.id)}
                            className="w-7 h-7 hover:bg-red/10 rounded-lg flex items-center justify-center text-text3 hover:text-red transition-all flex-shrink-0">
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {sections.length > 0 && (
          <div className="flex justify-end mt-6">
            <Link href="/dashboard/institution/academic/periods"
              className="flex items-center gap-1.5 text-sm text-blue hover:underline font-medium">
              Suivant : Périodes <ArrowRight size={14} />
            </Link>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}