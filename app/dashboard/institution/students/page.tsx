// ═══════════════════════════════════════════════
// STUDENTS PAGE
// app/dashboard/institution/students/page.tsx
// ═══════════════════════════════════════════════
'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { createBrowserClient } from '@/lib/supabase/browser'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { Card, EmptyState, Spinner } from '@/components/ui'
import {
  BookOpen, LayoutDashboard, BarChart2, Globe, Settings,
  Layers, UserCheck, Users, User, Search
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

export default function InstitutionStudentsPage() {
  const { profile } = useAuth()
  const supabase = createBrowserClient()
  const [enrollments, setEnrollments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!profile) return
    const load = async () => {
      const { data: programs } = await supabase
        .from('programs')
        .select('id')
        .eq('institution_id', profile.id)

      if (!programs?.length) { setLoading(false); return }

      const programIds = programs.map(p => p.id)
      const { data } = await supabase
        .from('program_enrollments')
        .select('*, student:profiles!student_id(full_name, email, avatar_url), program:programs(title)')
        .in('program_id', programIds)
        .order('enrolled_at', { ascending: false })

      setEnrollments(data || [])
      setLoading(false)
    }
    load()
  }, [profile])

  const filtered = enrollments.filter(e =>
    e.student?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    e.student?.email?.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return (
    <DashboardLayout navItems={navItems} title="Étudiants" role="institution">
      <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>
    </DashboardLayout>
  )

  return (
    <DashboardLayout navItems={navItems} title="Étudiants" role="institution">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text">Étudiants</h1>
          <p className="text-text3 text-sm mt-0.5">{enrollments.length} inscription{enrollments.length > 1 ? 's' : ''} au total</p>
        </div>
      </div>

      <div className="relative mb-5">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text3" />
        <input type="text" placeholder="Rechercher un étudiant..." value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-card border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm text-text outline-none focus:border-blue/50" />
      </div>

      {filtered.length === 0 ? (
        <Card className="p-12">
          <EmptyState icon={<Users size={32} />}
            title="Aucun étudiant inscrit"
            description="Les étudiants inscrits à vos programmes apparaîtront ici." />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full">
            <thead className="bg-bg2 border-b border-border">
              <tr>
                {['Étudiant', 'Programme', 'Progression', 'Inscrit le'].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-text3 px-5 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((e: any) => (
                <tr key={e.id} className="hover:bg-bg2 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      {e.student?.avatar_url ? (
                        <img src={e.student.avatar_url} alt=""
                          className="w-8 h-8 rounded-full object-cover border border-border flex-shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-bg2 border border-border flex items-center justify-center flex-shrink-0">
                          <User size={14} className="text-text3" />
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-text">{e.student?.full_name}</p>
                        <p className="text-xs text-text3">{e.student?.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <p className="text-sm text-text2 max-w-[200px] truncate">{e.program?.title}</p>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-1.5 bg-bg2 rounded-full overflow-hidden">
                        <div className="h-full bg-blue rounded-full"
                          style={{ width: `${e.progress_pct || 0}%` }} />
                      </div>
                      <span className="text-xs text-text3">{e.progress_pct || 0}%</span>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <p className="text-xs text-text3">
                      {new Date(e.enrolled_at).toLocaleDateString('fr-FR')}
                    </p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </DashboardLayout>
  )
}