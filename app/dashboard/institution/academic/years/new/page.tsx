'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { createBrowserClient } from '@/lib/supabase/browser'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { Card, Button, Input } from '@/components/ui'
import {
  LayoutDashboard, BookOpen, UserCheck, Users, BarChart2,
  Globe, Settings, Layers, GraduationCap, Calendar,
  BookMarked, ClipboardList, FileText, ArrowLeft
} from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const navItems = [
  { label: 'Vue d\'ensemble',   href: '/dashboard/institution',                  icon: <LayoutDashboard size={16} /> },
  { label: 'Mode académique',   href: '/dashboard/institution/academic',          icon: <GraduationCap size={16} /> },
  { label: 'Cours',             href: '/dashboard/institution/courses',           icon: <BookOpen size={16} /> },
  { label: 'Équipe',            href: '/dashboard/institution/teachers',          icon: <UserCheck size={16} /> },
  { label: 'Étudiants',         href: '/dashboard/institution/students',          icon: <Users size={16} /> },
  { label: 'Analytiques',       href: '/dashboard/institution/analytics',         icon: <BarChart2 size={16} /> },
  { label: 'Page publique',     href: '/dashboard/institution/profile',           icon: <Globe size={16} /> },
  { label: 'Paramètres',        href: '/dashboard/institution/settings',          icon: <Settings size={16} /> },
]

const PERIOD_CONFIGS = [
  {
    key: 'trimestre',
    label: '3 Trimestres',
    desc: 'Système haïtien et français — 3 périodes de 3 mois',
    periods: ['Trimestre 1', 'Trimestre 2', 'Trimestre 3'],
    weights: [33, 33, 34],
    icon: '🇭🇹',
  },
  {
    key: 'semestre',
    label: '2 Semestres',
    desc: 'Système universitaire — 2 semestres de 4-5 mois',
    periods: ['Semestre 1', 'Semestre 2'],
    weights: [50, 50],
    icon: '🎓',
  },
  {
    key: 'quarter',
    label: '4 Trimestres',
    desc: 'Système américain — 4 quarters de 2 mois',
    periods: ['Quarter 1', 'Quarter 2', 'Quarter 3', 'Quarter 4'],
    weights: [25, 25, 25, 25],
    icon: '🇺🇸',
  },
]

export default function NewAcademicYearPage() {
  const { profile } = useAuth()
  const supabase = createBrowserClient()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [periodConfig, setPeriodConfig] = useState('trimestre')
  const [form, setForm] = useState({
    name: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
    start_date: '',
    end_date: '',
    grading_scale: '20',
    passing_grade: '10',
    repeat_policy: 'level',
  })

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleCreate = async () => {
    if (!profile) return
    if (!form.name || !form.start_date || !form.end_date) {
      toast.error('Remplissez tous les champs obligatoires')
      return
    }

    setLoading(true)
    try {
      const selectedConfig = PERIOD_CONFIGS.find(p => p.key === periodConfig)!

      // Mark all other years as non-current
      await supabase.from('academic_years')
        .update({ is_current: false })
        .eq('institution_id', profile.id)

      // Create academic year
      const { data: year, error: yearErr } = await supabase
        .from('academic_years')
        .insert({
          institution_id: profile.id,
          name:           form.name,
          start_date:     form.start_date,
          end_date:       form.end_date,
          is_current:     true,
          status:         'upcoming',
        })
        .select()
        .single()

      if (yearErr || !year) {
        toast.error(yearErr?.message || 'Erreur création année')
        setLoading(false)
        return
      }

      // Create periods automatically
      const startDate = new Date(form.start_date)
      const endDate   = new Date(form.end_date)
      const totalDays = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      const daysPerPeriod = Math.floor(totalDays / selectedConfig.periods.length)

      for (let i = 0; i < selectedConfig.periods.length; i++) {
        const pStart = new Date(startDate.getTime() + i * daysPerPeriod * 24 * 60 * 60 * 1000)
        const pEnd   = new Date(startDate.getTime() + (i + 1) * daysPerPeriod * 24 * 60 * 60 * 1000 - 1)
        const examStart = new Date(pEnd.getTime() - 14 * 24 * 60 * 60 * 1000) // 2 semaines avant la fin

        await supabase.from('academic_periods').insert({
          institution_id:   profile.id,
          academic_year_id: year.id,
          name:             selectedConfig.periods[i],
          order_num:        i + 1,
          start_date:       pStart.toISOString().split('T')[0],
          end_date:         pEnd.toISOString().split('T')[0],
          exam_start_date:  examStart.toISOString().split('T')[0],
          exam_end_date:    pEnd.toISOString().split('T')[0],
          weight_pct:       selectedConfig.weights[i],
          status:           i === 0 ? 'upcoming' : 'upcoming',
        })
      }

      // Update institution academic config
      await supabase.from('profiles').update({
        academic_mode:    'school',
        period_type:      periodConfig,
        periods_per_year: selectedConfig.periods.length,
        grading_scale:    parseInt(form.grading_scale),
        passing_grade:    parseFloat(form.passing_grade),
        repeat_policy:    form.repeat_policy,
      }).eq('id', profile.id)

      toast.success(`Année ${form.name} créée avec ${selectedConfig.periods.length} ${selectedConfig.key}s !`)
      router.push('/dashboard/institution/academic/levels')
    } catch (err) {
      toast.error('Erreur inattendue')
    }
    setLoading(false)
  }

  return (
    <DashboardLayout navItems={navItems} title="Nouvelle année académique" role="institution">
      <div className="max-w-2xl">
        <Link href="/dashboard/institution/academic"
          className="inline-flex items-center gap-1.5 text-xs text-text3 hover:text-text mb-6 transition-colors">
          <ArrowLeft size={12} /> Mode académique
        </Link>

        <h1 className="text-xl font-bold text-text mb-6">Configurer l&apos;année académique</h1>

        <div className="space-y-5">

          {/* Infos de base */}
          <Card className="p-6 space-y-4">
            <h2 className="font-semibold text-text">Informations générales</h2>
            <Input label="Nom de l'année *" value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="ex: 2024-2025" />
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-text2">Date de début *</label>
                <input type="date" value={form.start_date}
                  onChange={e => set('start_date', e.target.value)}
                  className="w-full bg-bg2 border border-border rounded-xl px-4 py-2.5 text-sm text-text outline-none focus:border-blue/50" />
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-text2">Date de fin *</label>
                <input type="date" value={form.end_date}
                  onChange={e => set('end_date', e.target.value)}
                  className="w-full bg-bg2 border border-border rounded-xl px-4 py-2.5 text-sm text-text outline-none focus:border-blue/50" />
              </div>
            </div>
          </Card>

          {/* Périodes */}
          <Card className="p-6">
            <h2 className="font-semibold text-text mb-1">Structure des périodes</h2>
            <p className="text-xs text-text3 mb-4">
              Les périodes seront créées automatiquement selon votre choix.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {PERIOD_CONFIGS.map(pc => (
                <button key={pc.key} onClick={() => setPeriodConfig(pc.key)}
                  className={clsx(
                    'p-4 rounded-xl border text-left transition-all',
                    periodConfig === pc.key
                      ? 'border-blue bg-blue/5'
                      : 'border-border hover:border-blue/30'
                  )}>
                  <p className="text-xl mb-2">{pc.icon}</p>
                  <p className="font-semibold text-text text-sm">{pc.label}</p>
                  <p className="text-xs text-text3 mt-1">{pc.desc}</p>
                  <div className="flex gap-1 mt-2">
                    {pc.periods.map(p => (
                      <span key={p} className="text-[9px] bg-bg2 text-text3 px-1.5 py-0.5 rounded">
                        {p}
                      </span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </Card>

          {/* Notation */}
          <Card className="p-6 space-y-4">
            <h2 className="font-semibold text-text">Système de notation</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-text2">Barème de notation</label>
                <select value={form.grading_scale} onChange={e => set('grading_scale', e.target.value)}
                  className="w-full bg-bg2 border border-border rounded-xl px-4 py-2.5 text-sm text-text outline-none focus:border-blue/50">
                  <option value="20">Sur 20 (système français/haïtien)</option>
                  <option value="100">Sur 100 (système américain)</option>
                  <option value="10">Sur 10</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-text2">Note de passage</label>
                <select value={form.passing_grade} onChange={e => set('passing_grade', e.target.value)}
                  className="w-full bg-bg2 border border-border rounded-xl px-4 py-2.5 text-sm text-text outline-none focus:border-blue/50">
                  <option value="10">10/20 (standard haïtien)</option>
                  <option value="12">12/20</option>
                  <option value="60">60/100</option>
                  <option value="50">50/100</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-text2">Politique de redoublement</label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: 'level',   label: 'Niveau entier',  desc: 'L\'élève redouble toute la classe (lycée/école)', icon: '🏫' },
                  { value: 'subject', label: 'Matière seule',   desc: 'L\'étudiant reprend seulement les matières échouées (université)', icon: '🎓' },
                ].map(r => (
                  <button key={r.value} onClick={() => set('repeat_policy', r.value)}
                    className={clsx(
                      'p-3 rounded-xl border text-left transition-all',
                      form.repeat_policy === r.value
                        ? 'border-blue bg-blue/5'
                        : 'border-border hover:border-blue/30'
                    )}>
                    <p className="text-lg mb-1">{r.icon}</p>
                    <p className="font-medium text-text text-sm">{r.label}</p>
                    <p className="text-xs text-text3 mt-0.5">{r.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          </Card>

          {/* Résumé */}
          <div className="bg-blue/5 border border-blue/20 rounded-2xl p-5">
            <p className="text-sm font-semibold text-blue mb-2">Ce qui sera créé automatiquement</p>
            <ul className="text-xs text-text2 space-y-1">
              {PERIOD_CONFIGS.find(p => p.key === periodConfig)?.periods.map((p, i) => (
                <li key={p} className="flex items-center gap-2">
                  <span className="w-4 h-4 bg-blue/20 text-blue rounded-full flex items-center justify-center text-[9px] font-bold">{i + 1}</span>
                  {p} — avec dates calculées automatiquement et période d&apos;examen (2 dernières semaines)
                </li>
              ))}
            </ul>
          </div>

          <Button loading={loading} onClick={handleCreate} className="w-full">
            Créer l&apos;année académique et continuer →
          </Button>
        </div>
      </div>
    </DashboardLayout>
  )
}