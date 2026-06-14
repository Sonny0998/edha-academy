'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { createBrowserClient } from '@/lib/supabase/browser'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { studentNav } from '@/lib/nav'
import { Card, ProgressBar, Badge, EmptyState, Spinner } from '@/components/ui'
import Link from 'next/link'
import { BookOpen, Play, Award, CheckCircle, FileText, Layers } from 'lucide-react'

export default function StudentCoursesPage() {
  const { profile } = useAuth()
  const supabase = createBrowserClient()
  const [enrollments, setEnrollments] = useState<any[]>([])
  const [programEnrollments, setProgramEnrollments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all')
  const [tab, setTab] = useState<'courses' | 'programs'>('courses')

  useEffect(() => {
    if (!profile) return
    const load = async () => {
      const [cRes, pRes] = await Promise.all([
        supabase.from('enrollments')
          .select('*,course:courses(id,title,slug,thumbnail_url,total_lessons,total_duration_min,instructor:profiles!instructor_id(full_name),category:categories(name))')
          .eq('student_id', profile.id)
          .order('enrolled_at', { ascending: false }),
        // FIX: also load program enrollments — previously missing from this page
        supabase.from('program_enrollments')
          .select('*,program:programs(id,title,slug,thumbnail_url,total_courses,institution:profiles!institution_id(full_name,institution_name))')
          .eq('student_id', profile.id)
          .order('enrolled_at', { ascending: false }),
      ])
      setEnrollments(cRes.data || [])
      setProgramEnrollments(pRes.data || [])
      setLoading(false)
    }
    load()
  }, [profile])

  const filtered = enrollments.filter(e => {
    if (filter === 'active') return e.progress_pct < 100
    if (filter === 'completed') return e.progress_pct === 100
    return true
  })

  if (loading) return (
    <DashboardLayout navItems={studentNav} title="Mes cours" role="student">
      <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>
    </DashboardLayout>
  )

  return (
    <DashboardLayout navItems={studentNav} title="Mes cours" role="student">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-text">Mes cours</h1>
        <Link href="/cursos"
          className="bg-blue hover:bg-blue2 text-white text-sm px-4 py-2 rounded-xl transition-colors">
          + Trouver un cours
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-border">
        <button onClick={() => setTab('courses')}
          className={`text-sm px-4 py-2 font-medium border-b-2 transition-colors ${tab === 'courses' ? 'border-blue text-blue' : 'border-transparent text-text3 hover:text-text'}`}>
          <BookOpen size={14} className="inline mr-1.5" />
          Cours individuels ({enrollments.length})
        </button>
        <button onClick={() => setTab('programs')}
          className={`text-sm px-4 py-2 font-medium border-b-2 transition-colors ${tab === 'programs' ? 'border-blue text-blue' : 'border-transparent text-text3 hover:text-text'}`}>
          <Layers size={14} className="inline mr-1.5" />
          Programmes ({programEnrollments.length})
        </button>
      </div>

      {tab === 'courses' && (
        <>
          <div className="flex gap-2 mb-6">
            {([['all', 'Tous'], ['active', 'En cours'], ['completed', 'Terminés']] as const).map(([val, label]) => (
              <button key={val} onClick={() => setFilter(val)}
                className={`text-sm px-4 py-1.5 rounded-xl transition-colors ${filter === val ? 'bg-blue text-white' : 'bg-card2 text-text2 hover:text-text'}`}>
                {label}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <Card className="p-8">
              <EmptyState icon={<BookOpen size={24} />} title="Aucun cours"
                description="Vous n'êtes inscrit à aucun cours pour le moment." />
            </Card>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((e: any) => (
                <Card key={e.id} className="p-0 overflow-hidden hover:border-blue/30 transition-colors">
                  {e.course?.thumbnail_url && (
                    <img src={e.course.thumbnail_url} alt={e.course?.title}
                      className="w-full h-36 object-cover" />
                  )}
                  <div className="p-4">
                    <p className="text-xs text-text3 mb-1">{e.course?.category?.name}</p>
                    <h3 className="font-semibold text-text text-sm mb-1 line-clamp-2">{e.course?.title}</h3>
                    <p className="text-xs text-text3 mb-3">{e.course?.instructor?.full_name}</p>
                    <ProgressBar value={e.progress_pct || 0} className="mb-1" />
                    <p className="text-xs text-text3 mb-4">{e.progress_pct || 0}% complété</p>
                    {e.progress_pct === 100 ? (
                      <div className="flex gap-2">
                        <Link href={`/learn/${e.course?.slug}`}
                          className="flex-1 flex items-center justify-center gap-1.5 bg-green/10 text-green text-xs py-2 rounded-xl">
                          <CheckCircle size={13} /> Revoir
                        </Link>
                        <Link href="/dashboard/student/certificates"
                          className="flex-1 flex items-center justify-center gap-1.5 bg-yellow/10 text-yellow text-xs py-2 rounded-xl">
                          <Award size={13} /> Certificat
                        </Link>
                      </div>
                    ) : (
                      <Link href={`/learn/${e.course?.slug}`}
                        className="w-full flex items-center justify-center gap-1.5 bg-blue hover:bg-blue2 text-white text-xs py-2 rounded-xl transition-colors">
                        <Play size={13} /> Continuer
                      </Link>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'programs' && (
        <>
          {programEnrollments.length === 0 ? (
            <Card className="p-8">
              <EmptyState icon={<Layers size={24} />} title="Aucun programme"
                description="Vous n'êtes inscrit à aucun programme pour le moment." />
            </Card>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {programEnrollments.map((e: any) => (
                <Card key={e.id} className="p-0 overflow-hidden hover:border-blue/30 transition-colors">
                  {e.program?.thumbnail_url && (
                    <img src={e.program.thumbnail_url} alt={e.program?.title}
                      className="w-full h-36 object-cover" />
                  )}
                  <div className="p-4">
                    <p className="text-xs text-blue mb-1 font-medium">
                      {e.program?.institution?.institution_name || e.program?.institution?.full_name}
                    </p>
                    <h3 className="font-semibold text-text text-sm mb-1 line-clamp-2">{e.program?.title}</h3>
                    <p className="text-xs text-text3 mb-3">{e.program?.total_courses} cours</p>
                    <ProgressBar value={e.progress_pct || 0} className="mb-1" />
                    <p className="text-xs text-text3 mb-4">{e.progress_pct || 0}% complété</p>
                    <Link href={`/programas/${e.program?.slug}`}
                      className="w-full flex items-center justify-center gap-1.5 bg-blue hover:bg-blue2 text-white text-xs py-2 rounded-xl transition-colors">
                      <FileText size={13} /> Voir le programme
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  )
}
