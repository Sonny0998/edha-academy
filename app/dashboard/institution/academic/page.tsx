'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { createBrowserClient } from '@/lib/supabase/browser'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { Card, Spinner, EmptyState } from '@/components/ui'
import Link from 'next/link'
import {
  LayoutDashboard, BookOpen, UserCheck, Users, BarChart2,
  Globe, Settings, Layers, GraduationCap, Calendar,
  ChevronRight, CheckCircle, Clock, AlertCircle, Plus,
  BookMarked, ClipboardList, FileText
} from 'lucide-react'
import clsx from 'clsx'

const navItems = [
  { label: 'Vue d\'ensemble',   href: '/dashboard/institution',                  icon: <LayoutDashboard size={16} /> },
  { label: 'Programmes',        href: '/dashboard/institution/programs',          icon: <Layers size={16} /> },
  { label: 'Cours',             href: '/dashboard/institution/courses',           icon: <BookOpen size={16} /> },
  { label: 'Mode académique',   href: '/dashboard/institution/academic',          icon: <GraduationCap size={16} /> },
  { label: 'Équipe',            href: '/dashboard/institution/teachers',          icon: <UserCheck size={16} /> },
  { label: 'Étudiants',         href: '/dashboard/institution/students',          icon: <Users size={16} /> },
  { label: 'Analytiques',       href: '/dashboard/institution/analytics',         icon: <BarChart2 size={16} /> },
  { label: 'Page publique',     href: '/dashboard/institution/profile',           icon: <Globe size={16} /> },
  { label: 'Paramètres',        href: '/dashboard/institution/settings',          icon: <Settings size={16} /> },
]

const STEPS = [
  { key: 'year',      label: 'Année académique',  icon: Calendar,      href: '/dashboard/institution/academic/years' },
  { key: 'levels',    label: 'Niveaux de classe', icon: GraduationCap, href: '/dashboard/institution/academic/levels' },
  { key: 'sections',  label: 'Sections',           icon: Users,         href: '/dashboard/institution/academic/sections' },
  { key: 'periods',   label: 'Périodes',           icon: Clock,         href: '/dashboard/institution/academic/periods' },
  { key: 'subjects',  label: 'Matières',           icon: BookMarked,    href: '/dashboard/institution/academic/subjects' },
  { key: 'assign',    label: 'Assignation',        icon: ClipboardList, href: '/dashboard/institution/academic/assign' },
  { key: 'enroll',    label: 'Inscrire les élèves',icon: UserCheck,     href: '/dashboard/institution/academic/enroll' },
]

export default function AcademicDashboard() {
  const { profile } = useAuth()
  const supabase = createBrowserClient()
  const [loading, setLoading] = useState(true)
  const [currentYear, setCurrentYear] = useState<any>(null)
  const [counts, setCounts] = useState({
    years: 0, levels: 0, sections: 0, periods: 0,
    subjects: 0, assignments: 0, students: 0,
  })
  const [recentGrades, setRecentGrades] = useState<any[]>([])

  useEffect(() => {
    if (!profile) return
    const load = async () => {
      const [yearRes, levelRes, secRes, perRes, subRes, assignRes, stuRes] = await Promise.all([
        supabase.from('academic_years').select('*').eq('institution_id', profile.id).eq('is_current', true).maybeSingle(),
        supabase.from('class_levels').select('id', { count: 'exact', head: true }).eq('institution_id', profile.id),
        supabase.from('class_sections').select('id', { count: 'exact', head: true }).eq('institution_id', profile.id),
        supabase.from('academic_periods').select('id', { count: 'exact', head: true }).eq('institution_id', profile.id),
        supabase.from('academic_subjects').select('id', { count: 'exact', head: true }).eq('institution_id', profile.id),
        supabase.from('period_subjects').select('id', { count: 'exact', head: true }).eq('institution_id', profile.id),
        supabase.from('institutional_enrollments').select('id', { count: 'exact', head: true }).eq('institution_id', profile.id),
      ])
      setCurrentYear(yearRes.data)
      setCounts({
        years:       0,
        levels:      levelRes.count  || 0,
        sections:    secRes.count    || 0,
        periods:     perRes.count    || 0,
        subjects:    subRes.count    || 0,
        assignments: assignRes.count || 0,
        students:    stuRes.count    || 0,
      })
      setLoading(false)
    }
    load()
  }, [profile])

  const getStepStatus = (key: string) => {
    const map: Record<string, number> = {
      year: currentYear ? 1 : 0,
      levels: counts.levels,
      sections: counts.sections,
      periods: counts.periods,
      subjects: counts.subjects,
      assign: counts.assignments,
      enroll: counts.students,
    }
    return (map[key] || 0) > 0 ? 'done' : 'todo'
  }

  const completedSteps = STEPS.filter(s => getStepStatus(s.key) === 'done').length

  if (loading) return (
    <DashboardLayout navItems={navItems} title="Mode académique" role="institution">
      <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>
    </DashboardLayout>
  )

  return (
    <DashboardLayout navItems={navItems} title="Mode académique" role="institution">

      {/* Header */}
      <div className="flex items-start justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">Mode académique</h1>
          <p className="text-text3 text-sm mt-1">
            Gérez vos années scolaires, matières, notes et bulletins comme une vraie institution.
          </p>
        </div>
        <Link href="/dashboard/institution/academic/years/new"
          className="flex items-center gap-2 text-sm text-white font-medium px-4 py-2.5 rounded-xl edha-gradient hover:opacity-90 transition-opacity shadow-sm flex-shrink-0">
          <Plus size={15} /> Nouvelle année académique
        </Link>
      </div>

      {/* Current year banner */}
      {currentYear ? (
        <div className="bg-green/5 border border-green/20 rounded-2xl p-5 mb-8 flex items-center gap-4">
          <div className="w-12 h-12 bg-green/10 rounded-xl flex items-center justify-center flex-shrink-0">
            <Calendar size={22} className="text-green" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-text">Année en cours: {currentYear.name}</p>
            <p className="text-xs text-text3 mt-0.5">
              {new Date(currentYear.start_date).toLocaleDateString('fr-FR')} →{' '}
              {new Date(currentYear.end_date).toLocaleDateString('fr-FR')}
            </p>
          </div>
          <span className={clsx(
            'text-xs font-medium px-3 py-1.5 rounded-full',
            currentYear.status === 'active'    ? 'bg-green/10 text-green' :
            currentYear.status === 'exam'      ? 'bg-yellow/10 text-yellow' :
            currentYear.status === 'completed' ? 'bg-blue/10 text-blue' :
            'bg-bg2 text-text3'
          )}>
            {currentYear.status === 'active'    ? 'En cours' :
             currentYear.status === 'exam'      ? 'Période d\'examen' :
             currentYear.status === 'completed' ? 'Terminée' : 'À venir'}
          </span>
        </div>
      ) : (
        <div className="bg-yellow/5 border border-yellow/20 rounded-2xl p-5 mb-8 flex items-center gap-4">
          <AlertCircle size={22} className="text-yellow flex-shrink-0" />
          <div>
            <p className="font-semibold text-text">Aucune année académique créée</p>
            <p className="text-sm text-text2 mt-0.5">
              Commencez par créer l&apos;année scolaire 2024-2025 pour configurer votre institution.
            </p>
          </div>
          <Link href="/dashboard/institution/academic/years/new"
            className="flex items-center gap-1.5 text-sm text-blue hover:underline flex-shrink-0 font-medium">
            Créer <ChevronRight size={14} />
          </Link>
        </div>
      )}

      {/* Setup checklist */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-text">Configuration ({completedSteps}/{STEPS.length})</h2>
          <div className="w-32 h-2 bg-bg2 rounded-full overflow-hidden">
            <div className="h-full bg-green rounded-full transition-all"
              style={{ width: `${(completedSteps / STEPS.length) * 100}%` }} />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {STEPS.map((step, i) => {
            const status = getStepStatus(step.key)
            const Icon = step.icon
            const prevDone = i === 0 || getStepStatus(STEPS[i - 1].key) === 'done'
            return (
              <Link key={step.key} href={step.href}
                className={clsx(
                  'flex items-center gap-3 p-4 rounded-2xl border transition-all group',
                  status === 'done'
                    ? 'border-green/20 bg-green/5 hover:bg-green/10'
                    : prevDone
                      ? 'border-blue/20 bg-blue/5 hover:bg-blue/10'
                      : 'border-border bg-card opacity-60 cursor-default pointer-events-none'
                )}>
                <div className={clsx(
                  'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0',
                  status === 'done' ? 'bg-green/20' : prevDone ? 'bg-blue/10' : 'bg-bg2'
                )}>
                  {status === 'done'
                    ? <CheckCircle size={16} className="text-green" />
                    : <Icon size={16} className={prevDone ? 'text-blue' : 'text-text3'} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={clsx('text-xs font-medium',
                    status === 'done' ? 'text-green' : prevDone ? 'text-blue' : 'text-text3')}>
                    {i + 1}. {step.label}
                  </p>
                  {status === 'done' && (
                    <p className="text-[10px] text-green/70 mt-0.5">Configuré ✓</p>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Stats rapides */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Niveaux',    value: counts.levels,   icon: GraduationCap, color: 'text-blue',   bg: 'bg-blue/10',   href: '/dashboard/institution/academic/levels' },
          { label: 'Sections',   value: counts.sections,  icon: Users,         color: 'text-cyan',   bg: 'bg-cyan/10',   href: '/dashboard/institution/academic/sections' },
          { label: 'Matières',   value: counts.subjects,  icon: BookMarked,    color: 'text-purple', bg: 'bg-purple/10', href: '/dashboard/institution/academic/subjects' },
          { label: 'Élèves',     value: counts.students,  icon: UserCheck,     color: 'text-green',  bg: 'bg-green/10',  href: '/dashboard/institution/academic/enroll' },
        ].map(({ label, value, icon: Icon, color, bg, href }) => (
          <Link key={label} href={href}>
            <Card className="p-5 hover:border-border2 transition-colors cursor-pointer">
              <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center mb-3`}>
                <Icon size={18} className={color} />
              </div>
              <div className="text-2xl font-bold text-text">{value}</div>
              <div className="text-xs text-text3 mt-0.5">{label}</div>
            </Card>
          </Link>
        ))}
      </div>

      {/* Actions rapides */}
      <div>
        <h2 className="font-semibold text-text mb-4">Actions rapides</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { href: '/dashboard/institution/academic/grades',    icon: ClipboardList, label: 'Saisir les notes',       desc: 'Évaluations continues et examens',    color: 'text-blue',   bg: 'bg-blue/10' },
            { href: '/dashboard/institution/academic/bulletins', icon: FileText,      label: 'Générer les bulletins',  desc: 'Bulletins de trimestre et annuels',   color: 'text-purple', bg: 'bg-purple/10' },
            { href: '/dashboard/institution/academic/results',   icon: BarChart2,     label: 'Résultats & décisions',  desc: 'Promu · Redouble · Diplômé',          color: 'text-green',  bg: 'bg-green/10' },
          ].map(({ href, icon: Icon, label, desc, color, bg }) => (
            <Link key={href} href={href}
              className="flex items-center gap-3 p-4 bg-card border border-border rounded-2xl hover:border-blue/20 hover:bg-bg2 transition-all group">
              <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                <Icon size={18} className={color} />
              </div>
              <div>
                <p className="text-sm font-medium text-text group-hover:text-blue transition-colors">{label}</p>
                <p className="text-xs text-text3">{desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

    </DashboardLayout>
  )
}