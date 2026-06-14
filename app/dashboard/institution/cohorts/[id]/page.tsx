'use client'
import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { createBrowserClient } from '@/lib/supabase/browser'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { Card, Spinner, EmptyState } from '@/components/ui'
import {
  LayoutDashboard, BookOpen, UserCheck, Users, BarChart2, Globe,
  Settings, Layers, GraduationCap, Users2, ArrowLeft, Plus,
  Search, X, User, CheckCircle, Clock, Award, TrendingUp,
  Calendar, ChevronRight
} from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import Link from 'next/link'

const navItems = [
  { label: 'Vue d\'ensemble', href: '/dashboard/institution',          icon: <LayoutDashboard size={16} /> },
  { label: 'Programmes',      href: '/dashboard/institution/programs', icon: <Layers size={16} /> },
  { label: 'Cohortes',        href: '/dashboard/institution/cohorts',  icon: <Users2 size={16} /> },
  { label: 'Mode académique', href: '/dashboard/institution/academic', icon: <GraduationCap size={16} /> },
  { label: 'Cours',           href: '/dashboard/institution/courses',  icon: <BookOpen size={16} /> },
  { label: 'Équipe',          href: '/dashboard/institution/teachers', icon: <UserCheck size={16} /> },
  { label: 'Étudiants',       href: '/dashboard/institution/students', icon: <Users size={16} /> },
  { label: 'Analytiques',     href: '/dashboard/institution/analytics',icon: <BarChart2 size={16} /> },
  { label: 'Page publique',   href: '/dashboard/institution/profile',  icon: <Globe size={16} /> },
  { label: 'Paramètres',      href: '/dashboard/institution/settings', icon: <Settings size={16} /> },
]

const STATUS_COLORS: Record<string, string> = {
  active:     'bg-green/10 text-green border-green/20',
  repeating:  'bg-yellow/10 text-yellow border-yellow/20',
  graduated:  'bg-blue/10 text-blue border-blue/20',
  withdrawn:  'bg-red/10 text-red border-red/20',
  suspended:  'bg-red/10 text-red border-red/20',
  transferred:'bg-text3/10 text-text3 border-text3/20',
}

export default function CohortDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { profile } = useAuth()
  const supabase = createBrowserClient()
  const router = useRouter()

  const [cohort, setCohort] = useState<any>(null)
  const [enrollments, setEnrollments] = useState<any[]>([])
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [sections, setSections] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [studentCode, setStudentCode] = useState('')
  const [selectedSection, setSelectedSection] = useState('')

  const load = useCallback(async () => {
    if (!profile || !id) return

    const { data: c } = await supabase.from('cohorts')
      .select('*, program:programs(title), year:academic_years(name)')
      .eq('id', id).eq('institution_id', profile.id).single()

    if (!c) { router.replace('/dashboard/institution/cohorts'); return }
    setCohort(c)

    const { data: enr } = await supabase.from('cohort_enrollments')
      .select('*, student:profiles!student_id(full_name, email, avatar_url), section:class_sections!class_section_id(name, level:class_levels(name))')
      .eq('cohort_id', id).order('enrolled_at', { ascending: false })

    setEnrollments(enr || [])

    const { data: sec } = await supabase.from('class_sections')
      .select('id, name, level:class_levels(name)').eq('institution_id', profile.id)
    setSections(sec || [])
    setLoading(false)
  }, [profile, id])

  useEffect(() => { load() }, [load])

  const handleSearch = async () => {
    if (!search.trim()) return
    const { data } = await supabase.from('profiles')
      .select('id, full_name, email, avatar_url').eq('role', 'student')
      .ilike('full_name', `%${search}%`).limit(10)
    setSearchResults(data || [])
  }

  const enroll = async (student: any) => {
    if (!profile || !id) return
    const alreadyIn = enrollments.some(e => e.student_id === student.id)
    if (alreadyIn) { toast.error('Déjà inscrit dans cette cohorte'); return }
    setSaving(true)
    const { error } = await supabase.from('cohort_enrollments').insert({
      cohort_id:        id,
      student_id:       student.id,
      institution_id:   profile.id,
      class_section_id: selectedSection || null,
      student_code:     studentCode || null,
      status:           'active',
    })
    if (error) toast.error(error.message)
    else {
      toast.success(`${student.full_name} inscrit dans la cohorte !`)
      setSearch(''); setStudentCode(''); setSearchResults([]); load()
    }
    setSaving(false)
  }

  const unenroll = async (enrollId: string, name: string) => {
    if (!confirm(`Retirer ${name} de cette cohorte ?`)) return
    await supabase.from('cohort_enrollments').delete().eq('id', enrollId)
    toast.success(`${name} retiré(e)`)
    load()
  }

  const updateStatus = async (enrollId: string, status: string) => {
    await supabase.from('cohort_enrollments').update({ status }).eq('id', enrollId)
    setEnrollments(e => e.map(en => en.id === enrollId ? { ...en, status } : en))
    toast.success('Statut mis à jour')
  }

  const activeCount    = enrollments.filter(e => e.status === 'active').length
  const graduatedCount = enrollments.filter(e => e.status === 'graduated').length
  const capacityPct    = Math.round((enrollments.length / (cohort?.max_capacity || 40)) * 100)

  if (loading) return (
    <DashboardLayout navItems={navItems} title="Cohorte" role="institution">
      <div className="flex justify-center py-16"><Spinner size="lg" /></div>
    </DashboardLayout>
  )

  return (
    <DashboardLayout navItems={navItems} title={cohort?.name || 'Cohorte'} role="institution">
      <div className="max-w-4xl">

        {/* Header */}
        <Link href="/dashboard/institution/cohorts"
          className="inline-flex items-center gap-1.5 text-xs text-text3 hover:text-text mb-5 transition-colors">
          <ArrowLeft size={12} /> Toutes les cohortes
        </Link>

        {/* Cohort info card */}
        <div className="bg-gradient-to-br from-[#0f1a2e] to-[#1e3a5f] rounded-2xl p-6 mb-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              {cohort?.code && (
                <span className="text-[10px] font-mono text-white/40 bg-white/10 px-2 py-0.5 rounded mb-2 inline-block">
                  {cohort.code}
                </span>
              )}
              <h1 className="text-xl font-bold text-white">{cohort?.name}</h1>
              {cohort?.program?.title && (
                <p className="text-white/50 text-sm mt-0.5">{cohort.program.title}</p>
              )}
              {cohort?.start_date && (
                <div className="flex items-center gap-1.5 text-white/40 text-xs mt-1">
                  <Calendar size={11} />
                  {new Date(cohort.start_date).getFullYear()} → {cohort.expected_end_date ? new Date(cohort.expected_end_date).getFullYear() : '?'}
                </div>
              )}
            </div>
            <span className={clsx('text-xs font-medium px-3 py-1.5 rounded-full border', STATUS_COLORS[cohort?.status] || STATUS_COLORS.active)}>
              {cohort?.status}
            </span>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 pt-4 border-t border-white/10">
            {[
              { label: 'Total inscrits', value: enrollments.length, icon: Users },
              { label: 'Actifs',         value: activeCount,        icon: CheckCircle },
              { label: 'Diplômés',       value: graduatedCount,     icon: Award },
              { label: 'Capacité',       value: `${capacityPct}%`,  icon: TrendingUp },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="text-center">
                <div className="text-xl font-bold text-white">{value}</div>
                <div className="flex items-center justify-center gap-1 mt-0.5">
                  <Icon size={10} className="text-white/40" />
                  <p className="text-white/40 text-[10px]">{label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Capacity bar */}
          <div className="mt-3 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div className={clsx('h-full rounded-full transition-all',
              capacityPct >= 90 ? 'bg-red' : capacityPct >= 70 ? 'bg-yellow' : 'bg-green')}
              style={{ width: `${Math.min(capacityPct, 100)}%` }} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Search & enroll */}
          <div className="space-y-4">
            <h2 className="font-semibold text-text text-sm">Inscrire un étudiant</h2>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text3" />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  placeholder="Nom de l'étudiant..."
                  className="w-full bg-bg2 border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm text-text outline-none focus:border-blue/50" />
              </div>
              <button onClick={handleSearch}
                className="px-3 py-2 bg-bg2 border border-border rounded-xl text-sm hover:bg-card transition-colors">
                🔍
              </button>
            </div>

            {sections.length > 0 && (
              <select value={selectedSection} onChange={e => setSelectedSection(e.target.value)}
                className="w-full bg-bg2 border border-border rounded-xl px-4 py-2.5 text-sm text-text outline-none focus:border-blue/50">
                <option value="">Aucune section</option>
                {sections.map(s => <option key={s.id} value={s.id}>{s.level?.name} — {s.name}</option>)}
              </select>
            )}

            <input value={studentCode} onChange={e => setStudentCode(e.target.value)}
              placeholder="Matricule (optionnel)"
              className="w-full bg-bg2 border border-border rounded-xl px-4 py-2.5 text-sm text-text outline-none focus:border-blue/50" />

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {searchResults.map(s => {
                const alreadyIn = enrollments.some(e => e.student_id === s.id)
                return (
                  <div key={s.id} className={clsx(
                    'flex items-center gap-3 p-3 rounded-xl border transition-all',
                    alreadyIn ? 'border-green/20 bg-green/5' : 'border-border bg-card hover:border-blue/20'
                  )}>
                    <div className="w-8 h-8 rounded-full bg-bg2 flex items-center justify-center text-xs font-bold text-blue flex-shrink-0">
                      {s.avatar_url
                        ? <img src={s.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                        : s.full_name?.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text truncate">{s.full_name}</p>
                      <p className="text-[10px] text-text3 truncate">{s.email}</p>
                    </div>
                    {alreadyIn ? (
                      <CheckCircle size={14} className="text-green flex-shrink-0" />
                    ) : (
                      <button onClick={() => enroll(s)} disabled={saving}
                        className="text-xs text-blue border border-blue/20 bg-blue/5 hover:bg-blue/10 px-2.5 py-1 rounded-lg transition-colors disabled:opacity-40">
                        <Plus size={11} />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Students list */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-text text-sm">
                Étudiants inscrits
                <span className="ml-2 text-xs bg-bg2 text-text3 px-2 py-0.5 rounded-full">{enrollments.length}</span>
              </h2>
            </div>

            {enrollments.length === 0 ? (
              <Card className="p-10 text-center">
                <EmptyState icon={<Users size={28} />}
                  title="Aucun étudiant dans cette cohorte"
                  description="Recherchez et inscrivez des étudiants dans le panel de gauche." />
              </Card>
            ) : (
              <div className="space-y-2">
                {enrollments.map(e => (
                  <Card key={e.id} className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue/20 to-cyan/20 border border-border flex items-center justify-center flex-shrink-0 overflow-hidden text-xs font-bold text-blue">
                        {e.student?.avatar_url
                          ? <img src={e.student.avatar_url} alt="" className="w-full h-full object-cover" />
                          : e.student?.full_name?.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text">{e.student?.full_name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {e.student_code && (
                            <span className="text-[10px] font-mono text-text3">{e.student_code}</span>
                          )}
                          {e.section && (
                            <span className="text-[10px] text-text3">
                              {e.section.level?.name} — {e.section.name}
                            </span>
                          )}
                        </div>
                      </div>
                      <select value={e.status} onChange={ev => updateStatus(e.id, ev.target.value)}
                        className={clsx('text-[10px] font-medium px-2 py-1 rounded-full border outline-none cursor-pointer', STATUS_COLORS[e.status] || STATUS_COLORS.active)}>
                        <option value="active">Actif</option>
                        <option value="repeating">Redoublant</option>
                        <option value="graduated">Diplômé</option>
                        <option value="withdrawn">Retiré</option>
                        <option value="suspended">Suspendu</option>
                        <option value="transferred">Transféré</option>
                      </select>
                      <button onClick={() => unenroll(e.id, e.student?.full_name)}
                        className="w-7 h-7 hover:bg-red/10 rounded-lg flex items-center justify-center text-text3 hover:text-red transition-all flex-shrink-0">
                        <X size={12} />
                      </button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}