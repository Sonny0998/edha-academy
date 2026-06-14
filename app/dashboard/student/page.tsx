'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { studentNav } from '@/lib/nav'
import { createBrowserClient } from '@/lib/supabase/browser'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import Link from 'next/link'
import {
  LayoutDashboard, BookOpen, Award, Heart, User,
  Clock, CheckCircle, AlertTriangle, ChevronRight,
  Zap, Flame, Star, TrendingUp, FileText, Play,
  Calendar, BookMarked, Target, ArrowRight, Trophy
} from 'lucide-react'
import clsx from 'clsx'
import { RadialBarChart, RadialBar, ResponsiveContainer, Tooltip } from 'recharts'

const navItems = [
  { label: 'Tableau de bord', href: '/dashboard/student',             icon: <LayoutDashboard size={16} /> },
  { label: 'Mes cours',       href: '/dashboard/student/courses',     icon: <BookOpen size={16} /> },
  { label: 'Calendrier',      href: '/dashboard/student/calendar',    icon: <Calendar size={16} /> },
  { label: 'Certificats',     href: '/dashboard/student/certificates',icon: <Award size={16} /> },
  { label: 'Liste de souhaits',href: '/dashboard/student/wishlist',   icon: <Heart size={16} /> },
  { label: 'Mon profil',      href: '/dashboard/student/profile',     icon: <User size={16} /> },
]

export default function StudentDashboard() {
  const { profile } = useAuth()
  const supabase = createBrowserClient()
  const [loading, setLoading] = useState(true)

  // EDHA course enrollments
  const [courseEnrollments, setCourseEnrollments] = useState<any[]>([])
  const [programEnrollments, setProgramEnrollments] = useState<any[]>([])
  const [certificates, setCertificates] = useState<any[]>([])

  // Academic (institutional) data
  const [institutionalEnrollment, setInstitutionalEnrollment] = useState<any>(null)
  const [currentPeriodSubjects, setCurrentPeriodSubjects] = useState<any[]>([])
  const [studentGrades, setStudentGrades] = useState<any[]>([])
  const [upcomingExams, setUpcomingExams] = useState<any[]>([])
  const [bulletin, setBulletin] = useState<any>(null)

  const [stats, setStats] = useState({
    xp: 0, streak: 0, level: 1,
    coursesEnrolled: 0, coursesCompleted: 0, totalCerts: 0,
  })

  const firstName = profile?.full_name?.split(' ')[0] || 'Étudiant'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir'

  useEffect(() => {
    if (!profile) return
    const load = async () => {
      // 1. EDHA Courses
      const { data: enrolls } = await supabase
        .from('enrollments')
        .select('*, course:courses(id, title, slug, thumbnail_url, total_lessons, category:categories(name))')
        .eq('student_id', profile.id)
        .order('enrolled_at', { ascending: false })
        .limit(6)

      setCourseEnrollments(enrolls || [])

      // 2. Programs
      const { data: progEnrolls } = await supabase
        .from('program_enrollments')
        .select('*, program:programs(title, slug, thumbnail_url, total_courses, institution:profiles!institution_id(institution_name))')
        .eq('student_id', profile.id)
        .order('enrolled_at', { ascending: false })

      setProgramEnrollments(progEnrolls || [])

      // 3. Certificates
      const { data: certs } = await supabase
        .from('certificates')
        .select('*, course:courses(title)')
        .eq('student_id', profile.id)
        .limit(3)

      const { data: progCerts } = await supabase
        .from('program_certificates')
        .select('*, program:programs(title)')
        .eq('student_id', profile.id)
        .limit(3)

      setCertificates([...(certs || []), ...(progCerts || [])])

      // 4. Institutional enrollment (academic mode)
      const { data: instEnroll } = await supabase
        .from('institutional_enrollments')
        .select(`
          *,
          section:class_sections!class_section_id(
            name,
            level:class_levels!class_level_id(name),
            main_teacher:profiles!main_teacher_id(full_name)
          ),
          institution:profiles!institution_id(
            institution_name, institution_logo_url
          ),
          year:academic_years!academic_year_id(name, is_current)
        `)
        .eq('student_id', profile.id)
        .eq('status', 'active')
        .maybeSingle()

      setInstitutionalEnrollment(instEnroll)

      if (instEnroll) {
        // Find current period
        const { data: periods } = await supabase
          .from('academic_periods')
          .select('*')
          .eq('institution_id', instEnroll.institution_id)
          .eq('academic_year_id', instEnroll.academic_year_id)
          .order('order_num')

        const activePeriod = (periods || []).find((p: any) => p.status === 'active' || p.status === 'exam')
          || (periods || [])[0]

        // Upcoming exams
        const examPeriods = (periods || []).filter((p: any) =>
          p.status === 'exam' || p.status === 'upcoming'
        )
        setUpcomingExams(examPeriods.slice(0, 2))

        if (activePeriod) {
          // Period subjects for this section
          const { data: periodSubjects } = await supabase
            .from('period_subjects')
            .select('*, subject:academic_subjects(name, color, coefficient, code), teacher:profiles!teacher_id(full_name)')
            .eq('academic_period_id', activePeriod.id)
            .eq('class_section_id', instEnroll.class_section_id)

          setCurrentPeriodSubjects(periodSubjects || [])

          // Student grades for this period
          const { data: grades } = await supabase
            .from('period_grades')
            .select('*, period_subject:period_subjects!period_subject_id(subject:academic_subjects(name, color))')
            .eq('student_id', profile.id)
            .eq('institution_id', instEnroll.institution_id)
            .not('published_at', 'is', null)

          setStudentGrades(grades || [])
        }

        // Latest bulletin
        const { data: latestBulletin } = await supabase
          .from('bulletins')
          .select('*, period:academic_periods!academic_period_id(name)')
          .eq('student_id', profile.id)
          .not('published_at', 'is', null)
          .order('generated_at', { ascending: false })
          .maybeSingle()

        setBulletin(latestBulletin)
      }

      // 5. Stats
      const completed = (enrolls || []).filter(e => e.status === 'completed').length
      setStats({
        xp:               (profile as any).xp_points || 0,
        streak:           (profile as any).streak_days || 0,
        level:            Math.floor(((profile as any).xp_points || 0) / 100) + 1,
        coursesEnrolled:  (enrolls || []).length,
        coursesCompleted: completed,
        totalCerts:       ((certs?.length || 0) + (progCerts?.length || 0)),
      })
      setLoading(false)
    }
    load()
  }, [profile])

  const getGradeInfo = (grade: number | null) => {
    if (grade === null || grade === undefined) return { color: 'text-text3', bg: 'bg-bg2', label: '—' }
    if (grade >= 16) return { color: 'text-blue',   bg: 'bg-blue/10',   label: 'Excellent' }
    if (grade >= 14) return { color: 'text-green',  bg: 'bg-green/10',  label: 'Bien' }
    if (grade >= 12) return { color: 'text-cyan',   bg: 'bg-cyan/10',   label: 'Assez bien' }
    if (grade >= 10) return { color: 'text-yellow', bg: 'bg-yellow/10', label: 'Passable' }
    return { color: 'text-red', bg: 'bg-red/10', label: 'Insuffisant' }
  }

  const generalAverage = studentGrades.length > 0
    ? Math.round((studentGrades.reduce((s, g) => s + (g.period_average || 0), 0) / studentGrades.length) * 100) / 100
    : null

  const daysIntoStreak = stats.streak
  const xpToNextLevel = 100 - (stats.xp % 100)
  const xpProgress = stats.xp % 100

  if (loading) return (
    <DashboardLayout navItems={studentNav} title="Tableau de bord" role="student">
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue/20 border-t-blue rounded-full animate-spin" />
          <p className="text-sm text-text3">Chargement...</p>
        </div>
      </div>
    </DashboardLayout>
  )

  return (
    <DashboardLayout navItems={studentNav} title="Tableau de bord" role="student">
      <div className="space-y-6 pb-8">

        {/* ── HERO ── */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0f1a2e] to-[#1e3a5f] p-6">
          <div className="absolute inset-0 opacity-10"
            style={{ backgroundImage: 'radial-gradient(circle at 80% 50%, #3b82f6 0%, transparent 50%)' }} />

          <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
            <div>
              <p className="text-white/50 text-sm mb-1">{greeting} 👋</p>
              <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">{firstName}</h1>

              {/* Institutional info */}
              {institutionalEnrollment && (
                <div className="flex items-center gap-2 mb-3">
                  {institutionalEnrollment.institution?.institution_logo_url && (
                    <img src={institutionalEnrollment.institution.institution_logo_url}
                      alt="" className="w-5 h-5 rounded object-cover" />
                  )}
                  <span className="text-white/60 text-xs">
                    {institutionalEnrollment.institution?.institution_name} ·{' '}
                    {institutionalEnrollment.section?.level?.name} — Section {institutionalEnrollment.section?.name}
                  </span>
                </div>
              )}

              {/* XP bar */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 bg-white/10 border border-white/10 rounded-full px-3 py-1">
                  <Zap size={12} className="text-yellow fill-yellow" />
                  <span className="text-white font-bold text-xs">{stats.xp} XP</span>
                </div>
                {stats.streak > 0 && (
                  <div className="flex items-center gap-1.5 bg-orange-500/20 border border-orange-400/20 rounded-full px-3 py-1">
                    <Flame size={12} className="text-orange-400" />
                    <span className="text-orange-300 font-bold text-xs">{stats.streak} jours</span>
                  </div>
                )}
              </div>
            </div>

            {/* Level circle */}
            <div className="text-center">
              <div className="relative w-20 h-20">
                <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
                  <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="6" />
                  <circle cx="40" cy="40" r="34" fill="none" stroke="#3b82f6" strokeWidth="6"
                    strokeDasharray={`${(xpProgress / 100) * 213.6} 213.6`}
                    strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <Star size={14} className="text-yellow fill-yellow mb-0.5" />
                  <span className="text-white font-black text-lg leading-none">{stats.level}</span>
                </div>
              </div>
              <p className="text-white/40 text-[10px] mt-1">Niveau</p>
              <p className="text-white/40 text-[10px]">{xpToNextLevel} XP manquants</p>
            </div>
          </div>

          {/* Quick stats */}
          <div className="relative grid grid-cols-3 gap-3 mt-5 pt-5 border-t border-white/10">
            {[
              { label: 'Cours inscrits', value: stats.coursesEnrolled, icon: BookOpen },
              { label: 'Terminés',       value: stats.coursesCompleted, icon: CheckCircle },
              { label: 'Certificats',    value: stats.totalCerts,       icon: Award },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="text-center">
                <div className="text-2xl font-black text-white">{value}</div>
                <div className="flex items-center justify-center gap-1 mt-0.5">
                  <Icon size={10} className="text-white/40" />
                  <p className="text-white/40 text-[10px]">{label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── LEFT: Academic subjects (institutional) ── */}
          <div className="lg:col-span-2 space-y-5">

            {/* Current semester subjects */}
            {institutionalEnrollment && (
              <div className="bg-card border border-border rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="font-semibold text-text">Mes matières</h2>
                    <p className="text-xs text-text3 mt-0.5">
                      {institutionalEnrollment.section?.level?.name} — Section {institutionalEnrollment.section?.name}
                    </p>
                  </div>
                  {generalAverage !== null && (
                    <div className={clsx(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-sm font-bold',
                      getGradeInfo(generalAverage).color,
                      getGradeInfo(generalAverage).bg,
                      'border-current/20'
                    )}>
                      <Target size={13} />
                      Moy. {generalAverage}/20
                    </div>
                  )}
                </div>

                {currentPeriodSubjects.length === 0 ? (
                  <div className="text-center py-8">
                    <BookMarked size={24} className="text-text3 mx-auto mb-2" />
                    <p className="text-sm text-text2">Aucune matière assignée pour cette période</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {currentPeriodSubjects.map((ps: any) => {
                      const grade = studentGrades.find(g => g.period_subject_id === ps.id)
                      const gradeInfo = getGradeInfo(grade?.period_average ?? null)
                      return (
                        <div key={ps.id} className="border border-border rounded-xl p-4 hover:border-blue/20 hover:bg-bg2 transition-all">
                          <div className="flex items-start justify-between gap-2 mb-3">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full flex-shrink-0"
                                style={{ backgroundColor: ps.subject?.color || '#4f6ef7' }} />
                              <p className="font-semibold text-text text-sm">{ps.subject?.name}</p>
                            </div>
                            {grade?.period_average !== null && grade?.period_average !== undefined ? (
                              <span className={clsx(
                                'text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0',
                                gradeInfo.color, gradeInfo.bg
                              )}>
                                {grade.period_average.toFixed(1)}/20
                              </span>
                            ) : (
                              <span className="text-[10px] text-text3 italic">Non noté</span>
                            )}
                          </div>

                          {/* Grade bar */}
                          <div className="h-1.5 bg-bg2 rounded-full overflow-hidden mb-2">
                            <div className="h-full rounded-full transition-all duration-700"
                              style={{
                                width: grade?.period_average ? `${(grade.period_average / 20) * 100}%` : '0%',
                                backgroundColor: ps.subject?.color || '#4f6ef7',
                                opacity: grade?.period_average ? 1 : 0,
                              }} />
                          </div>

                          <div className="flex items-center justify-between">
                            <p className="text-[10px] text-text3">
                              {ps.teacher?.full_name ? `Prof. ${ps.teacher.full_name.split(' ')[1] || ps.teacher.full_name}` : 'Professeur non assigné'}
                            </p>
                            <p className="text-[10px] text-text3">
                              Coeff. {ps.subject?.coefficient}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Bulletin CTA */}
                {bulletin && (
                  <div className="mt-4 p-3 bg-purple/5 border border-purple/20 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText size={14} className="text-purple" />
                      <p className="text-xs font-medium text-text">Bulletin {bulletin.period?.name} disponible</p>
                    </div>
                    <Link href="/dashboard/student/bulletins"
                      className="text-xs text-purple hover:underline font-medium">
                      Voir →
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* EDHA Courses in progress */}
            {courseEnrollments.length > 0 && (
              <div className="bg-card border border-border rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-text">Cours EDHA en cours</h2>
                  <Link href="/dashboard/student/courses"
                    className="text-xs text-blue hover:underline flex items-center gap-1">
                    Voir tout <ChevronRight size={12} />
                  </Link>
                </div>
                <div className="space-y-3">
                  {courseEnrollments.filter(e => e.status === 'active').slice(0, 4).map((e: any) => (
                    <Link key={e.id} href={`/learn/${e.course?.slug}`}
                      className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-blue/20 hover:bg-bg2 transition-all group">
                      <div className="w-12 h-12 rounded-xl flex-shrink-0 overflow-hidden bg-bg2 border border-border">
                        {e.course?.thumbnail_url
                          ? <img src={e.course.thumbnail_url} alt="" className="w-full h-full object-cover" />
                          : <BookOpen size={18} className="text-text3 m-auto mt-3" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text truncate group-hover:text-blue transition-colors">
                          {e.course?.title}
                        </p>
                        <p className="text-[10px] text-text3">{e.course?.category?.name}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <div className="flex-1 h-1.5 bg-bg2 rounded-full overflow-hidden">
                            <div className="h-full bg-blue rounded-full" style={{ width: `${e.progress_pct || 0}%` }} />
                          </div>
                          <span className="text-[10px] text-text3 tabular-nums">{e.progress_pct || 0}%</span>
                        </div>
                      </div>
                      <Play size={14} className="text-text3 group-hover:text-blue transition-colors flex-shrink-0" />
                    </Link>
                  ))}

                  {courseEnrollments.filter(e => e.status === 'active').length === 0 && (
                    <div className="text-center py-6">
                      <BookOpen size={22} className="text-text3 mx-auto mb-2" />
                      <p className="text-sm text-text2">Aucun cours en cours</p>
                      <Link href="/cursos" className="text-xs text-blue hover:underline mt-1 block">
                        Explorer les cours →
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Programs */}
            {programEnrollments.length > 0 && (
              <div className="bg-card border border-border rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-text">Mes programmes</h2>
                </div>
                <div className="space-y-3">
                  {programEnrollments.map((pe: any) => (
                    <div key={pe.id} className="flex items-center gap-3 p-3 rounded-xl border border-border">
                      <div className="w-12 h-12 rounded-xl flex-shrink-0 overflow-hidden bg-purple/10 border border-border flex items-center justify-center">
                        {pe.program?.thumbnail_url
                          ? <img src={pe.program.thumbnail_url} alt="" className="w-full h-full object-cover" />
                          : <Trophy size={18} className="text-purple" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text truncate">{pe.program?.title}</p>
                        <p className="text-[10px] text-text3">
                          {pe.program?.institution?.institution_name} · {pe.program?.total_courses} cours
                        </p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <div className="flex-1 h-1.5 bg-bg2 rounded-full overflow-hidden">
                            <div className="h-full bg-purple rounded-full" style={{ width: `${pe.progress_pct || 0}%` }} />
                          </div>
                          <span className="text-[10px] text-text3">{pe.progress_pct || 0}%</span>
                        </div>
                      </div>
                      {pe.status === 'completed' && (
                        <Award size={16} className="text-yellow flex-shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── RIGHT col ── */}
          <div className="space-y-5">

            {/* Upcoming exams */}
            {upcomingExams.length > 0 && (
              <div className="bg-yellow/5 border border-yellow/20 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Clock size={15} className="text-yellow" />
                  <h3 className="font-semibold text-text text-sm">Examens à venir</h3>
                </div>
                <div className="space-y-2">
                  {upcomingExams.map((p: any) => {
                    const daysUntil = Math.ceil(
                      (new Date(p.exam_start_date || p.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                    )
                    return (
                      <div key={p.id} className="bg-white border border-yellow/10 rounded-xl p-3">
                        <p className="text-xs font-semibold text-text">{p.name}</p>
                        <p className="text-[10px] text-text3 mt-0.5">
                          {new Date(p.exam_start_date || p.end_date).toLocaleDateString('fr-FR', {
                            day: 'numeric', month: 'long'
                          })}
                        </p>
                        <p className={clsx(
                          'text-xs font-bold mt-1',
                          daysUntil <= 7 ? 'text-red' : daysUntil <= 14 ? 'text-yellow' : 'text-text3'
                        )}>
                          {daysUntil > 0 ? `Dans ${daysUntil} jour${daysUntil > 1 ? 's' : ''}` : 'Aujourd\'hui !'}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Certificates */}
            {certificates.length > 0 && (
              <div className="bg-card border border-border rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Award size={15} className="text-yellow" />
                  <h3 className="font-semibold text-text text-sm">Mes certificats</h3>
                </div>
                <div className="space-y-2">
                  {certificates.slice(0, 3).map((c: any, i) => (
                    <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl border border-border">
                      <div className="w-8 h-8 bg-yellow/10 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Award size={14} className="text-yellow" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-text truncate">
                          {c.course?.title || c.program?.title}
                        </p>
                        <p className="text-[10px] text-text3">
                          {new Date(c.issued_at).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <Link href="/dashboard/student/certificates"
                  className="mt-3 flex items-center justify-center gap-1.5 text-xs text-blue hover:underline">
                  Voir tous mes certificats <ArrowRight size={12} />
                </Link>
              </div>
            )}

            {/* Empty state if no enrollments */}
            {courseEnrollments.length === 0 && !institutionalEnrollment && (
              <div className="bg-card border border-border rounded-2xl p-6 text-center">
                <div className="w-14 h-14 bg-blue/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <BookOpen size={24} className="text-blue" />
                </div>
                <h3 className="font-semibold text-text mb-1">Commencez à apprendre</h3>
                <p className="text-xs text-text2 mb-4">
                  Explorez des centaines de cours et programmes pour développer vos compétences.
                </p>
                <Link href="/cursos"
                  className="inline-flex items-center gap-2 text-sm text-white font-medium px-4 py-2.5 rounded-xl edha-gradient hover:opacity-90 transition-opacity">
                  Explorer les cours →
                </Link>
              </div>
            )}

            {/* Motivation card */}
            <div className="bg-gradient-to-br from-blue/10 to-cyan/5 border border-blue/20 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={15} className="text-blue" />
                <h3 className="font-semibold text-text text-sm">Continuez comme ça !</h3>
              </div>
              <p className="text-xs text-text2 leading-relaxed">
                {stats.streak > 0
                  ? `Vous avez une série de ${stats.streak} jours consécutifs ! Continuez à apprendre tous les jours pour maintenir votre rythme.`
                  : 'Connectez-vous chaque jour pour construire votre série et gagner des XP bonus !'}
              </p>
              {stats.xp > 0 && (
                <div className="mt-3 flex items-center gap-2">
                  <div className="flex-1 h-2 bg-white/50 rounded-full overflow-hidden">
                    <div className="h-full bg-blue rounded-full" style={{ width: `${xpProgress}%` }} />
                  </div>
                  <span className="text-[10px] text-blue font-medium">{xpToNextLevel} XP → Niveau {stats.level + 1}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}