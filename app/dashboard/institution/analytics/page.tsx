'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { createBrowserClient } from '@/lib/supabase/browser'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { Card, Spinner } from '@/components/ui'
import {
  BookOpen, LayoutDashboard, BarChart2, Globe, Settings,
  Layers, UserCheck, Users, TrendingUp, Award, Star
} from 'lucide-react'

const navItems = [
  { label: 'Vue d\'ensemble', href: '/dashboard/institution',           icon: <LayoutDashboard size={16} /> },
  { label: 'Mes programmes',  href: '/dashboard/institution/programs',  icon: <Layers size={16} /> },
  { label: 'Mes cours',       href: '/dashboard/institution/courses',   icon: <BookOpen size={16} /> },
  { label: 'Mon équipe',      href: '/dashboard/institution/teachers',  icon: <UserCheck size={16} /> },
  { label: 'Étudiants',       href: '/dashboard/institution/students',  icon: <Users size={16} /> },
  { label: 'Analytiques',     href: '/dashboard/institution/analytics', icon: <BarChart2 size={16} /> },
  { label: 'Page publique',   href: '/dashboard/institution/profile',   icon: <Globe size={16} /> },
  { label: 'Paramètres',      href: '/dashboard/institution/settings',  icon: <Settings size={16} /> },
]

export default function InstitutionAnalyticsPage() {
  const { profile } = useAuth()
  const supabase = createBrowserClient()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalPrograms: 0, publishedPrograms: 0,
    totalStudents: 0, totalCourses: 0,
    avgRating: 0, topPrograms: [] as any[],
  })

  useEffect(() => {
    if (!profile) return
    const load = async () => {
      const { data: programs } = await supabase
        .from('programs')
        .select('id, title, status, enrolled_count, total_courses')
        .eq('institution_id', profile.id)

      const { data: courses } = await supabase
        .from('courses')
        .select('id, rating_avg, rating_count')
        .eq('instructor_id', profile.id)

      const totalStudents = (programs || []).reduce((s: number, p: any) => s + (p.enrolled_count || 0), 0)
      const ratedCourses = (courses || []).filter((c: any) => c.rating_count > 0)
      const avgRating = ratedCourses.length > 0
        ? ratedCourses.reduce((s: number, c: any) => s + c.rating_avg, 0) / ratedCourses.length
        : 0
      const topPrograms = [...(programs || [])]
        .sort((a: any, b: any) => (b.enrolled_count || 0) - (a.enrolled_count || 0))
        .slice(0, 5)

      setStats({
        totalPrograms: (programs || []).length,
        publishedPrograms: (programs || []).filter((p: any) => p.status === 'published').length,
        totalStudents,
        totalCourses: (courses || []).length,
        avgRating,
        topPrograms,
      })
      setLoading(false)
    }
    load()
  }, [profile])

  if (loading) return (
    <DashboardLayout navItems={navItems} title="Analytiques" role="institution">
      <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>
    </DashboardLayout>
  )

  return (
    <DashboardLayout navItems={navItems} title="Analytiques" role="institution">
      <h1 className="text-2xl font-bold text-text mb-6">Analytiques</h1>

      {/* Stats globales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Programmes publiés', value: `${stats.publishedPrograms}/${stats.totalPrograms}`, icon: Layers,      color: 'text-purple', bg: 'bg-purple/10' },
          { label: 'Cours créés',        value: stats.totalCourses,   icon: BookOpen,    color: 'text-blue',   bg: 'bg-blue/10' },
          { label: 'Total étudiants',    value: stats.totalStudents,  icon: Users,       color: 'text-cyan',   bg: 'bg-cyan/10' },
          { label: 'Note moyenne',       value: stats.avgRating > 0 ? `★ ${stats.avgRating.toFixed(1)}` : '—', icon: Star, color: 'text-yellow', bg: 'bg-yellow/10' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label} className="p-5">
            <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center mb-3`}>
              <Icon size={18} className={color} />
            </div>
            <div className="text-2xl font-bold text-text">{value}</div>
            <div className="text-xs text-text3 mt-0.5">{label}</div>
          </Card>
        ))}
      </div>

      {/* Top programmes */}
      {stats.topPrograms.length > 0 && (
        <Card className="p-6">
          <h2 className="font-semibold text-text mb-4 flex items-center gap-2">
            <TrendingUp size={16} className="text-blue" /> Top programmes
          </h2>
          <div className="space-y-3">
            {stats.topPrograms.map((p: any, i: number) => (
              <div key={p.id} className="flex items-center gap-4">
                <span className="text-sm font-bold text-text3 w-5 flex-shrink-0">#{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text truncate">{p.title}</p>
                  <p className="text-xs text-text3">{p.total_courses} cours</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-text">{p.enrolled_count || 0}</p>
                  <p className="text-xs text-text3">étudiants</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Message si pas encore de données */}
      {stats.totalStudents === 0 && (
        <div className="text-center py-12 text-text3">
          <BarChart2 size={36} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Les statistiques apparaîtront ici dès que des étudiants s&apos;inscriront à vos programmes.</p>
        </div>
      )}
    </DashboardLayout>
  )
}