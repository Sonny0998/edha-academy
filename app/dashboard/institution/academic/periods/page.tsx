'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { createBrowserClient } from '@/lib/supabase/browser'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { Card, Spinner } from '@/components/ui'
import {
  LayoutDashboard, BookOpen, UserCheck, Users, BarChart2,
  Globe, Settings, GraduationCap, ArrowLeft, ArrowRight,
  Clock, CheckCircle, AlertTriangle, BookMarked
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

const STATUS_OPTIONS = [
  { value: 'upcoming', label: 'À venir',          color: 'text-text3  bg-bg2' },
  { value: 'active',   label: 'En cours',          color: 'text-green  bg-green/10' },
  { value: 'exam',     label: 'Période d\'examen', color: 'text-yellow bg-yellow/10' },
  { value: 'grading',  label: 'Correction',        color: 'text-blue   bg-blue/10' },
  { value: 'closed',   label: 'Terminée',          color: 'text-text3  bg-bg2' },
]

export default function PeriodsPage() {
  const { profile } = useAuth()
  const supabase = createBrowserClient()
  const [periods, setPeriods] = useState<any[]>([])
  const [years, setYears]     = useState<any[]>([])
  const [selectedYear, setSelectedYear] = useState('')
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)

  useEffect(() => {
    if (!profile) return
    const load = async () => {
      const { data: y } = await supabase.from('academic_years')
        .select('*').eq('institution_id', profile.id).order('created_at', { ascending: false })
      setYears(y || [])
      const curr = (y || []).find((yr: any) => yr.is_current)
      if (curr) setSelectedYear(curr.id)
      setLoading(false)
    }
    load()
  }, [profile])

  useEffect(() => {
    if (!selectedYear || !profile) return
    const load = async () => {
      const { data } = await supabase.from('academic_periods')
        .select('*').eq('institution_id', profile.id)
        .eq('academic_year_id', selectedYear).order('order_num')
      setPeriods(data || [])
    }
    load()
  }, [selectedYear, profile])

  const updateStatus = async (periodId: string, status: string) => {
    setUpdating(periodId)
    const { error } = await supabase.from('academic_periods')
      .update({ status }).eq('id', periodId)
    if (error) toast.error(error.message)
    else {
      setPeriods(p => p.map(per => per.id === periodId ? { ...per, status } : per))
      toast.success('Statut mis à jour')
    }
    setUpdating(null)
  }

  const updateDates = async (periodId: string, field: string, value: string) => {
    await supabase.from('academic_periods').update({ [field]: value }).eq('id', periodId)
    setPeriods(p => p.map(per => per.id === periodId ? { ...per, [field]: value } : per))
  }

  if (loading) return (
    <DashboardLayout navItems={navItems} title="Périodes" role="institution">
      <div className="flex justify-center py-16"><Spinner size="lg" /></div>
    </DashboardLayout>
  )

  return (
    <DashboardLayout navItems={navItems} title="Périodes académiques" role="institution">
      <div className="max-w-2xl">
        <Link href="/dashboard/institution/academic/sections"
          className="inline-flex items-center gap-1.5 text-xs text-text3 hover:text-text mb-6 transition-colors">
          <ArrowLeft size={12} /> Sections
        </Link>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-text">Périodes académiques</h1>
            <p className="text-text3 text-sm mt-0.5">Créées automatiquement — ajustez les dates et statuts</p>
          </div>
          {years.length > 1 && (
            <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)}
              className="bg-bg2 border border-border rounded-xl px-4 py-2.5 text-sm text-text outline-none focus:border-blue/50">
              {years.map(y => <option key={y.id} value={y.id}>{y.name}{y.is_current ? ' ✓' : ''}</option>)}
            </select>
          )}
        </div>

        {periods.length === 0 ? (
          <Card className="p-10 text-center">
            <Clock size={28} className="text-text3 mx-auto mb-3" />
            <p className="text-sm text-text2">Aucune période trouvée pour cette année.</p>
            <p className="text-xs text-text3 mt-1">
              Les périodes sont créées automatiquement lors de la création de l&apos;année académique.
            </p>
            <Link href="/dashboard/institution/academic/years/new"
              className="inline-flex items-center gap-2 mt-4 text-sm text-blue hover:underline">
              Créer une année académique →
            </Link>
          </Card>
        ) : (
          <div className="space-y-4">
            {periods.map((p: any) => {
              const statusOpt = STATUS_OPTIONS.find(s => s.value === p.status)
              return (
                <Card key={p.id} className={clsx('p-5',
                  p.status === 'active' ? 'border-green/20 bg-green/5' :
                  p.status === 'exam'   ? 'border-yellow/20 bg-yellow/5' : '')}>
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-text">{p.name}</h3>
                        <span className={clsx('text-[10px] font-medium px-2 py-0.5 rounded-full', statusOpt?.color)}>
                          {statusOpt?.label}
                        </span>
                      </div>
                      <p className="text-xs text-text3 mt-0.5">Poids : {p.weight_pct}% de la moyenne annuelle</p>
                    </div>
                    <select value={p.status}
                      onChange={e => updateStatus(p.id, e.target.value)}
                      disabled={updating === p.id}
                      className="bg-bg2 border border-border rounded-lg px-3 py-1.5 text-xs text-text outline-none focus:border-blue/50">
                      {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-medium text-text3 uppercase tracking-wider">Début</label>
                      <input type="date" defaultValue={p.start_date}
                        onBlur={e => updateDates(p.id, 'start_date', e.target.value)}
                        className="w-full bg-bg2 border border-border rounded-lg px-3 py-2 text-sm text-text outline-none focus:border-blue/50" />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] font-medium text-text3 uppercase tracking-wider">Fin</label>
                      <input type="date" defaultValue={p.end_date}
                        onBlur={e => updateDates(p.id, 'end_date', e.target.value)}
                        className="w-full bg-bg2 border border-border rounded-lg px-3 py-2 text-sm text-text outline-none focus:border-blue/50" />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] font-medium text-text3 uppercase tracking-wider">Début examens</label>
                      <input type="date" defaultValue={p.exam_start_date}
                        onBlur={e => updateDates(p.id, 'exam_start_date', e.target.value)}
                        className="w-full bg-bg2 border border-border rounded-lg px-3 py-2 text-sm text-text outline-none focus:border-blue/50" />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] font-medium text-text3 uppercase tracking-wider">Fin examens</label>
                      <input type="date" defaultValue={p.exam_end_date}
                        onBlur={e => updateDates(p.id, 'exam_end_date', e.target.value)}
                        className="w-full bg-bg2 border border-border rounded-lg px-3 py-2 text-sm text-text outline-none focus:border-blue/50" />
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}

        {periods.length > 0 && (
          <div className="flex justify-end mt-6">
            <Link href="/dashboard/institution/academic/subjects"
              className="flex items-center gap-1.5 text-sm text-blue hover:underline font-medium">
              Suivant : Matières <ArrowRight size={14} />
            </Link>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}