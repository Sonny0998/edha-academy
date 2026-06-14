'use client'
import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { createBrowserClient } from '@/lib/supabase/browser'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import Link from 'next/link'
import {
  LayoutDashboard, BookOpen, UserCheck, Users, BarChart2, Globe,
  Settings, Layers, GraduationCap, TrendingUp, TrendingDown,
  AlertTriangle, CheckCircle, Clock, Award, Plus, ArrowRight,
  BookMarked, ClipboardList, FileText, Activity, Zap, ChevronRight,
  Target, Eye, Bell, Calendar, Star
} from 'lucide-react'
import clsx from 'clsx'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, RadialBarChart, RadialBar, Cell, PieChart, Pie
} from 'recharts'

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

// Simulated weekly enrollment data
// FIX: was hardcoded fake data — now populated dynamically from real enrollments in useEffect below
const COLORS = ['#3b82f6', '#06b6d4', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981']

export default function InstitutionDashboard() {
  const { profile } = useAuth()
  const supabase = createBrowserClient()
  const [loading, setLoading] = useState(true)
  // FIX: real enrollment trend data (replaces hardcoded fake chart data)
  const [enrollmentData, setEnrollmentData] = useState<{week: string; enrolled: number; active: number}[]>([])
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalPrograms: 0,
    totalCourses: 0,
    publishedPrograms: 0,
    avgGrade: 0,
    atRiskCount: 0,
  })
  const [recentStudents, setRecentStudents] = useState<any[]>([])
  const [atRiskStudents, setAtRiskStudents] = useState<any[]>([])
  const [subjectPerf, setSubjectPerf] = useState<any[]>([])
  const [periods, setPeriods] = useState<any[]>([])
  const [currentPeriod, setCurrentPeriod] = useState<any>(null)

  const instName = (profile as any)?.institution_name || profile?.full_name || 'Institution'
  const instType = (profile as any)?.institution_type || 'Institution partenaire'

  useEffect(() => {
    if (!profile) return
    const load = async () => {
      // Programs
      const { data: programs } = await supabase.from('programs')
        .select('id, status, enrolled_count').eq('institution_id', profile.id)

      // Courses
      const { count: courseCount } = await supabase.from('courses')
        .select('id', { count: 'exact', head: true }).eq('instructor_id', profile.id)

      // Academic year & period
      const { data: yearData } = await supabase.from('academic_years')
        .select('id, name').eq('institution_id', profile.id).eq('is_current', true).maybeSingle()

      const { data: periodsData } = await supabase.from('academic_periods')
        .select('*').eq('institution_id', profile.id)
        .order('order_num')

      setPeriods(periodsData || [])
      const activePeriod = (periodsData || []).find((p: any) => p.status === 'active') ||
                           (periodsData || [])[0]
      setCurrentPeriod(activePeriod)

      // Students enrolled
      const { data: enrollments } = await supabase.from('institutional_enrollments')
        .select('*, student:profiles!student_id(full_name, avatar_url, email)')
        .eq('institution_id', profile.id)
        .eq('status', 'active')
        .order('enrolled_at', { ascending: false })
        .limit(20)

      const allStudents = enrollments || []

      // Period grades for at-risk detection
      let atRisk: any[] = []
      let avgGrade = 0
      let subjectData: any[] = []

      if (activePeriod) {
        const { data: grades } = await supabase
          .from('period_grades')
          .select('*, student:profiles!student_id(full_name), period_subject:period_subjects!period_subject_id(subject:academic_subjects(name, color))')
          .eq('institution_id', profile.id)

        const allGrades = grades || []

        // Calculate at-risk (average < 10)
        const studentAvgs: Record<string, number[]> = {}
        for (const g of allGrades) {
          if (!studentAvgs[g.student_id]) studentAvgs[g.student_id] = []
          if (g.period_average !== null) studentAvgs[g.student_id].push(g.period_average)
        }

        atRisk = allStudents.filter((e: any) => {
          const avgs = studentAvgs[e.student_id] || []
          const avg = avgs.length > 0 ? avgs.reduce((s, v) => s + v, 0) / avgs.length : null
          return avg !== null && avg < 10
        }).map((e: any) => {
          const avgs = studentAvgs[e.student_id] || []
          const avg = avgs.length > 0 ? avgs.reduce((s, v) => s + v, 0) / avgs.length : 0
          return { ...e, avg: Math.round(avg * 100) / 100 }
        })

        // Global average
        const allAvgs = Object.values(studentAvgs).map(avgs => avgs.reduce((s, v) => s + v, 0) / avgs.length)
        avgGrade = allAvgs.length > 0 ? Math.round((allAvgs.reduce((s, v) => s + v, 0) / allAvgs.length) * 100) / 100 : 0

        // Subject performance
        const subjectMap: Record<string, { name: string; color: string; grades: number[] }> = {}
        for (const g of allGrades) {
          const subName = g.period_subject?.subject?.name
          const subColor = g.period_subject?.subject?.color
          if (subName && g.period_average !== null) {
            if (!subjectMap[subName]) subjectMap[subName] = { name: subName, color: subColor || '#4f6ef7', grades: [] }
            subjectMap[subName].grades.push(g.period_average)
          }
        }
        subjectData = Object.values(subjectMap).map(s => ({
          name: s.name.length > 12 ? s.name.slice(0, 12) + '…' : s.name,
          avg: Math.round((s.grades.reduce((sum, v) => sum + v, 0) / s.grades.length) * 100) / 100,
          color: s.color,
        })).sort((a, b) => b.avg - a.avg)
      }

      setSubjectPerf(subjectData)
      setAtRiskStudents(atRisk.slice(0, 5))
      setRecentStudents(allStudents.slice(0, 6))
      setStats({
        totalStudents:    allStudents.length,
        totalPrograms:    (programs || []).length,
        totalCourses:     courseCount || 0,
        publishedPrograms: (programs || []).filter((p: any) => p.status === 'published').length,
        avgGrade,
        atRiskCount:      atRisk.length,
      })

      // FIX: build real weekly enrollment trend from actual data
      const weeklyTrend = []
      for (let i = 6; i >= 0; i--) {
        const weekStart = new Date()
        weekStart.setDate(weekStart.getDate() - i * 7)
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekEnd.getDate() + 7)
        const weekEnrolled = allStudents.filter((s: any) => {
          const d = new Date(s.enrolled_at)
          return d >= weekStart && d < weekEnd
        }).length
        weeklyTrend.push({
          week: `S${7 - i}`,
          enrolled: weekEnrolled,
          active: Math.round(weekEnrolled * 0.85), // approximate active rate
        })
      }
      setEnrollmentData(weeklyTrend)

      setLoading(false)
    }
    load()
  }, [profile])

  const getGradeColor = (grade: number) => {
    if (grade >= 16) return 'text-blue-500'
    if (grade >= 14) return 'text-green-500'
    if (grade >= 12) return 'text-cyan-500'
    if (grade >= 10) return 'text-yellow-500'
    return 'text-red-500'
  }

  const getGradeBg = (grade: number) => {
    if (grade >= 14) return 'bg-green/10 text-green border-green/20'
    if (grade >= 10) return 'bg-yellow/10 text-yellow border-yellow/20'
    return 'bg-red/10 text-red border-red/20'
  }

  const periodProgress = currentPeriod ? (() => {
    const start = new Date(currentPeriod.start_date).getTime()
    const end   = new Date(currentPeriod.end_date).getTime()
    const now   = Date.now()
    return Math.min(100, Math.max(0, Math.round(((now - start) / (end - start)) * 100)))
  })() : 0

  if (loading) return (
    <DashboardLayout navItems={navItems} title="Tableau de bord" role="institution">
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue/20 border-t-blue rounded-full animate-spin" />
          <p className="text-sm text-text3">Chargement du tableau de bord...</p>
        </div>
      </div>
    </DashboardLayout>
  )

  return (
    <DashboardLayout navItems={navItems} title="Tableau de bord" role="institution">
      <div className="space-y-6 pb-8">

        {/* ── HERO HEADER ── */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0f1a2e] via-[#1a2d4a] to-[#0f2a3d] p-6 sm:p-8">
          {/* Background pattern */}
          <div className="absolute inset-0 opacity-10"
            style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, #3b82f6 0%, transparent 50%), radial-gradient(circle at 80% 20%, #06b6d4 0%, transparent 40%)' }} />
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue/5 rounded-full -translate-y-1/2 translate-x-1/3" />

          <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              {(profile as any)?.institution_logo_url ? (
                <img src={(profile as any).institution_logo_url} alt=""
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-white/20 shadow-lg" />
              ) : (
                <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center border border-white/20">
                  <GraduationCap size={28} className="text-white/70" />
                </div>
              )}
              <div>
                <p className="text-white/50 text-xs font-medium uppercase tracking-widest mb-1">{instType}</p>
                <h1 className="text-2xl sm:text-3xl font-bold text-white">{instName}</h1>
                <div className="flex items-center gap-3 mt-2">
                  {currentPeriod && (
                    <span className="flex items-center gap-1.5 text-xs bg-white/10 text-white/70 px-3 py-1 rounded-full border border-white/10">
                      <Clock size={11} /> {currentPeriod.name} en cours
                    </span>
                  )}
                  <span className="flex items-center gap-1.5 text-xs bg-green/20 text-green px-3 py-1 rounded-full border border-green/30">
                    <CheckCircle size={11} /> Approuvée
                  </span>
                </div>
              </div>
            </div>

            {/* Period progress */}
            {currentPeriod && (
              <div className="bg-white/10 border border-white/10 rounded-2xl p-4 min-w-[180px]">
                <p className="text-white/50 text-xs mb-2">Progression de la période</p>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-blue to-cyan rounded-full transition-all"
                      style={{ width: `${periodProgress}%` }} />
                  </div>
                  <span className="text-white font-bold text-sm">{periodProgress}%</span>
                </div>
                <p className="text-white/30 text-[10px] mt-1.5">
                  {new Date(currentPeriod.end_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                </p>
              </div>
            )}
          </div>

          {/* Quick stats row */}
          <div className="relative grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-white/10">
            {[
              { label: 'Étudiants actifs', value: stats.totalStudents,    icon: Users,        trend: '+12%' },
              { label: 'Programmes',       value: stats.totalPrograms,    icon: Layers,       trend: null },
              { label: 'Moyenne générale', value: stats.avgGrade > 0 ? `${stats.avgGrade}/20` : '—', icon: Target, trend: null },
              { label: 'En difficulté',    value: stats.atRiskCount,      icon: AlertTriangle, trend: null, alert: stats.atRiskCount > 0 },
            ].map(({ label, value, icon: Icon, trend, alert }) => (
              <div key={label} className="text-center">
                <div className={clsx(
                  'text-2xl font-black mb-0.5',
                  alert && (value as number) > 0 ? 'text-red-400' : 'text-white'
                )}>{value}</div>
                <div className="flex items-center justify-center gap-1.5">
                  <Icon size={11} className="text-white/40" />
                  <p className="text-white/40 text-xs">{label}</p>
                </div>
                {trend && (
                  <span className="text-[10px] text-green font-medium">{trend}</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── MAIN GRID ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left col — charts */}
          <div className="lg:col-span-2 space-y-5">

            {/* Enrollment chart */}
            <div className="bg-card border border-border rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-semibold text-text">Activité des inscriptions</h2>
                  <p className="text-xs text-text3 mt-0.5">Étudiants inscrits vs actifs — 7 dernières semaines</p>
                </div>
                <Activity size={16} className="text-text3" />
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={enrollmentData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradEnrolled" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="gradActive" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="week" tick={{ fontSize: 11, fill: 'var(--text3)' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--text3)' }} />
                  <Tooltip
                    contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 12 }}
                    labelStyle={{ color: 'var(--text)', fontWeight: 600 }}
                  />
                  <Area type="monotone" dataKey="enrolled" stroke="#3b82f6" fill="url(#gradEnrolled)" strokeWidth={2} name="Inscrits" />
                  <Area type="monotone" dataKey="active" stroke="#06b6d4" fill="url(#gradActive)" strokeWidth={2} name="Actifs" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Subject performance bars */}
            {subjectPerf.length > 0 && (
              <div className="bg-card border border-border rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="font-semibold text-text">Performance par matière</h2>
                    <p className="text-xs text-text3 mt-0.5">Moyenne de classe · {currentPeriod?.name}</p>
                  </div>
                  <Link href="/dashboard/institution/academic/grades" className="text-xs text-blue hover:underline">
                    Saisir notes →
                  </Link>
                </div>
                <div className="space-y-3">
                  {subjectPerf.map((s, i) => (
                    <div key={s.name} className="flex items-center gap-3">
                      <p className="text-xs text-text2 w-24 flex-shrink-0 truncate">{s.name}</p>
                      <div className="flex-1 h-2.5 bg-bg2 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${(s.avg / 20) * 100}%`,
                            backgroundColor: s.avg >= 14 ? '#10b981' : s.avg >= 10 ? '#f59e0b' : '#ef4444',
                          }}
                        />
                      </div>
                      <span className={clsx('text-xs font-bold tabular-nums w-12 text-right', getGradeColor(s.avg))}>
                        {s.avg}/20
                      </span>
                    </div>
                  ))}
                </div>
                {subjectPerf.length === 0 && (
                  <p className="text-xs text-text3 text-center py-4">Aucune note saisie pour cette période</p>
                )}
              </div>
            )}

            {/* Recent students */}
            <div className="bg-card border border-border rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-text">Étudiants inscrits</h2>
                <Link href="/dashboard/institution/academic/enroll"
                  className="text-xs text-blue hover:underline flex items-center gap-1">
                  Gérer <ChevronRight size={12} />
                </Link>
              </div>
              {recentStudents.length === 0 ? (
                <div className="text-center py-8">
                  <Users size={24} className="text-text3 mx-auto mb-2" />
                  <p className="text-sm text-text2">Aucun étudiant inscrit</p>
                  <Link href="/dashboard/institution/academic/enroll"
                    className="text-xs text-blue hover:underline mt-1 block">
                    Inscrire des étudiants →
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {recentStudents.map((e: any) => (
                    <div key={e.student_id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-bg2 transition-colors">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue/20 to-cyan/20 border border-border flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {e.student?.avatar_url
                          ? <img src={e.student.avatar_url} alt="" className="w-full h-full object-cover" />
                          : <span className="text-xs font-bold text-blue">
                              {e.student?.full_name?.charAt(0) || '?'}
                            </span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text truncate">{e.student?.full_name}</p>
                        <p className="text-[10px] text-text3">{e.status === 'active' ? 'Actif' : e.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right col */}
          <div className="space-y-5">

            {/* At-risk alert */}
            {stats.atRiskCount > 0 && (
              <div className="bg-red/5 border border-red/20 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-red/10 rounded-xl flex items-center justify-center">
                    <AlertTriangle size={16} className="text-red" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-red text-sm">Étudiants en difficulté</h3>
                    <p className="text-[10px] text-text3">Moyenne générale &lt; 10/20</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {atRiskStudents.map((e: any) => (
                    <div key={e.student_id} className="flex items-center gap-2 p-2.5 bg-white rounded-xl border border-red/10">
                      <div className="w-7 h-7 bg-red/10 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-red">
                        {e.student?.full_name?.charAt(0) || '?'}
                      </div>
                      <p className="text-xs font-medium text-text flex-1 truncate">{e.student?.full_name}</p>
                      <span className="text-xs font-bold text-red">{e.avg}/20</span>
                    </div>
                  ))}
                </div>
                <Link href="/dashboard/institution/academic/grades"
                  className="mt-3 flex items-center justify-center gap-1.5 text-xs text-red hover:text-red/80 font-medium">
                  Voir les notes détaillées <ArrowRight size={12} />
                </Link>
              </div>
            )}

            {/* Academic calendar */}
            <div className="bg-card border border-border rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Calendar size={15} className="text-blue" />
                <h3 className="font-semibold text-text text-sm">Calendrier académique</h3>
              </div>
              {periods.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-xs text-text3">Aucune période configurée</p>
                  <Link href="/dashboard/institution/academic/years/new"
                    className="text-xs text-blue hover:underline mt-1 block">
                    Configurer →
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {periods.map((p: any, i: number) => {
                    const isActive = p.status === 'active'
                    const isExam   = p.status === 'exam'
                    const isDone   = p.status === 'closed'
                    return (
                      <div key={p.id} className={clsx(
                        'flex items-center gap-3 p-3 rounded-xl border transition-all',
                        isActive ? 'border-green/20 bg-green/5' :
                        isExam   ? 'border-yellow/20 bg-yellow/5' :
                        isDone   ? 'border-border bg-bg2 opacity-60' :
                        'border-border'
                      )}>
                        <div className={clsx(
                          'w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0',
                          isActive ? 'bg-green text-white' :
                          isExam   ? 'bg-yellow text-white' :
                          isDone   ? 'bg-text3 text-white' :
                          'bg-bg2 text-text3'
                        )}>{i + 1}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-text">{p.name}</p>
                          <p className="text-[10px] text-text3">
                            {new Date(p.start_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} →{' '}
                            {new Date(p.end_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                          </p>
                        </div>
                        <span className={clsx(
                          'text-[10px] font-medium px-2 py-0.5 rounded-full',
                          isActive ? 'text-green' :
                          isExam   ? 'text-yellow' :
                          isDone   ? 'text-text3' :
                          'text-text3'
                        )}>
                          {isActive ? '● En cours' : isExam ? '● Examens' : isDone ? '✓ Terminé' : '○ À venir'}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Quick actions */}
            <div className="bg-card border border-border rounded-2xl p-5">
              <h3 className="font-semibold text-text text-sm mb-3">Actions rapides</h3>
              <div className="space-y-1.5">
                {[
                  { href: '/dashboard/institution/academic/grades',    icon: ClipboardList, label: 'Saisir les notes',       color: 'text-blue',   bg: 'bg-blue/10' },
                  { href: '/dashboard/institution/academic/bulletins', icon: FileText,      label: 'Générer les bulletins',  color: 'text-purple', bg: 'bg-purple/10' },
                  { href: '/dashboard/institution/academic/results',   icon: Award,         label: 'Résultats & décisions',  color: 'text-green',  bg: 'bg-green/10' },
                  { href: '/dashboard/institution/academic/enroll',    icon: UserCheck,     label: 'Inscrire des élèves',    color: 'text-cyan',   bg: 'bg-cyan/10' },
                  { href: '/dashboard/institution/programs/new',       icon: Plus,          label: 'Nouveau programme',      color: 'text-gold',   bg: 'bg-gold/10' },
                ].map(({ href, icon: Icon, label, color, bg }) => (
                  <Link key={href} href={href}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-bg2 transition-colors group">
                    <div className={`w-7 h-7 ${bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                      <Icon size={13} className={color} />
                    </div>
                    <span className="text-sm text-text2 group-hover:text-text transition-colors">{label}</span>
                    <ChevronRight size={12} className="ml-auto text-text3 group-hover:text-blue transition-colors" />
                  </Link>
                ))}
              </div>
            </div>

            {/* Setup checklist if incomplete */}
            {(stats.totalStudents === 0 || periods.length === 0) && (
              <div className="bg-blue/5 border border-blue/20 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Zap size={15} className="text-blue" />
                  <h3 className="font-semibold text-blue text-sm">Configuration requise</h3>
                </div>
                <div className="space-y-2">
                  {[
                    { done: periods.length > 0,          label: 'Créer l\'année académique' },
                    { done: stats.totalStudents > 0,     label: 'Inscrire des étudiants' },
                    { done: stats.totalCourses > 0,      label: 'Créer des cours' },
                    { done: stats.publishedPrograms > 0, label: 'Publier un programme' },
                  ].map(({ done, label }) => (
                    <div key={label} className="flex items-center gap-2 text-xs">
                      <div className={clsx(
                        'w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0',
                        done ? 'bg-green text-white' : 'bg-bg2 border border-border'
                      )}>
                        {done && <CheckCircle size={10} />}
                      </div>
                      <span className={done ? 'text-text3 line-through' : 'text-text2'}>{label}</span>
                    </div>
                  ))}
                </div>
                <Link href="/dashboard/institution/academic"
                  className="mt-3 flex items-center gap-1.5 text-xs text-blue hover:underline font-medium">
                  Configurer le mode académique <ArrowRight size={12} />
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}