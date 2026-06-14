'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { instructorNav } from '@/lib/nav'
import { createBrowserClient } from '@/lib/supabase/browser'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { Card, Spinner } from '@/components/ui'
import { BookOpen, LayoutDashboard, BarChart2, User, MessageSquare, Megaphone, Users, Star, TrendingUp, Award } from 'lucide-react'

const navItems = [
  { label: 'Tableau de bord', href: '/dashboard/instructor',            icon: <LayoutDashboard size={16} /> },
  { label: 'Mes cours',       href: '/dashboard/instructor/courses',     icon: <BookOpen size={16} /> },
  { label: 'Messages Q&A',   href: '/dashboard/instructor/messages',    icon: <MessageSquare size={16} /> },
  { label: 'Annonces',       href: '/dashboard/instructor/announcements',icon: <Megaphone size={16} /> },
  { label: 'Analytiques',    href: '/dashboard/instructor/analytics',   icon: <BarChart2 size={16} /> },
  { label: 'Mon profil',     href: '/dashboard/instructor/profile',     icon: <User size={16} /> },
]

export default function InstructorAnalyticsPage() {
  const { profile } = useAuth()
  const supabase = createBrowserClient()
  const [courses, setCourses] = useState<any[]>([])
  const [enrollments, setEnrollments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile) return
    const load = async () => {
      const { data: coursesData } = await supabase
        .from('courses').select('id,title,enrolled_count,rating_avg,rating_count,status,pricing_model,price,created_at')
        .eq('instructor_id', profile.id).order('enrolled_count', { ascending: false })

      // Get enrollments by month for the chart
      const { data: enrollData } = await supabase
        .from('enrollments')
        .select('enrolled_at,course_id')
        .in('course_id', (coursesData || []).map((c: any) => c.id))
        .order('enrolled_at', { ascending: true })

      setCourses(coursesData || [])
      setEnrollments(enrollData || [])
      setLoading(false)
    }
    load()
  }, [profile])

  // Build monthly enrollment data (last 6 months)
  const monthlyData = (() => {
    const months: { label: string; count: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      const label = d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })
      const y = d.getFullYear(), m = d.getMonth()
      const count = enrollments.filter(e => {
        const ed = new Date(e.enrolled_at)
        return ed.getFullYear() === y && ed.getMonth() === m
      }).length
      months.push({ label, count })
    }
    return months
  })()

  const maxCount = Math.max(...monthlyData.map(m => m.count), 1)
  const totalStudents = courses.reduce((s, c) => s + (c.enrolled_count || 0), 0)
  const publishedCourses = courses.filter(c => c.status === 'published')
  const avgRating = publishedCourses.filter(c => c.rating_count > 0).reduce((s, c, _, a) => s + c.rating_avg / a.length, 0)

  if (loading) return (
    <DashboardLayout navItems={instructorNav} title="Analytiques" role="instructor">
      <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>
    </DashboardLayout>
  )

  return (
    <DashboardLayout navItems={instructorNav} title="Analytiques" role="instructor">
      <h1 className="text-2xl font-bold text-text mb-6">Analytiques</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total cours', value: courses.length, icon: BookOpen, color: 'blue' },
          { label: 'Cours publiés', value: publishedCourses.length, icon: TrendingUp, color: 'green' },
          { label: 'Total étudiants', value: totalStudents, icon: Users, color: 'purple' },
          { label: 'Note moyenne', value: avgRating > 0 ? avgRating.toFixed(1) + '★' : '—', icon: Star, color: 'yellow' },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="p-5">
            <div className={`w-10 h-10 rounded-xl bg-${color}/10 flex items-center justify-center mb-3`}>
              <Icon size={18} className={`text-${color}`} />
            </div>
            <div className="text-2xl font-bold text-text">{value}</div>
            <div className="text-xs text-text3 mt-0.5">{label}</div>
          </Card>
        ))}
      </div>

      {/* Enrollment chart */}
      <Card className="p-5 mb-6">
        <h2 className="font-semibold text-text mb-5">Inscriptions par mois (6 derniers mois)</h2>
        {enrollments.length === 0 ? (
          <div className="text-center py-8 text-text3">
            <TrendingUp size={28} className="mx-auto mb-2" />
            <p className="text-sm">Aucune inscription enregistrée</p>
          </div>
        ) : (
          <div className="flex items-end gap-3 h-48">
            {monthlyData.map((m, i) => {
              const h = maxCount > 0 ? Math.round((m.count / maxCount) * 160) : 0
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-2">
                  <span className="text-xs text-text3 font-medium">{m.count > 0 ? m.count : ''}</span>
                  <div className="w-full flex items-end" style={{ height: '160px' }}>
                    <div
                      className="w-full rounded-t-lg transition-all duration-500"
                      style={{
                        height: h > 0 ? `${h}px` : '4px',
                        background: h > 0 ? 'linear-gradient(to top, var(--blue), var(--cyan))' : 'var(--border)',
                        minHeight: '4px',
                      }}
                    />
                  </div>
                  <span className="text-xs text-text3">{m.label}</span>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {/* Course performance table */}
      <Card className="p-5">
        <h2 className="font-semibold text-text mb-4">Performance par cours</h2>
        {courses.length === 0 ? (
          <p className="text-text3 text-sm text-center py-6">Aucun cours créé</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-text3 text-xs border-b border-border">
                <th className="text-left py-2 pb-3">Cours</th>
                <th className="text-right py-2 pb-3">Étudiants</th>
                <th className="text-right py-2 pb-3">Note</th>
                <th className="text-right py-2 pb-3">Avis</th>
                <th className="text-right py-2 pb-3">Statut</th>
              </tr></thead>
              <tbody className="divide-y divide-border">
                {courses.map((c: any) => (
                  <tr key={c.id} className="hover:bg-card2/50 transition-colors">
                    <td className="py-3">
                      <p className="text-text font-medium truncate max-w-xs">{c.title}</p>
                      <p className="text-xs text-text3">{c.pricing_model === 'free' ? 'Gratuit' : `$${c.price}`}</p>
                    </td>
                    <td className="py-3 text-right">
                      <span className="font-semibold text-text">{c.enrolled_count}</span>
                    </td>
                    <td className="py-3 text-right text-yellow">
                      {c.rating_count > 0 ? `★ ${c.rating_avg}` : <span className="text-text3">—</span>}
                    </td>
                    <td className="py-3 text-right text-text3">{c.rating_count}</td>
                    <td className="py-3 text-right">
                      <span className={`text-xs px-2 py-1 rounded-lg ${
                        c.status === 'published' ? 'bg-green/10 text-green' :
                        c.status === 'review' ? 'bg-yellow/10 text-yellow' : 'bg-card2 text-text3'
                      }`}>{c.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </DashboardLayout>
  )
}
