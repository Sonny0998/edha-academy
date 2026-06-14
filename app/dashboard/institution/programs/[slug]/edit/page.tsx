'use client'
import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { createBrowserClient } from '@/lib/supabase/browser'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { Card, Spinner, Badge } from '@/components/ui'
import Link from 'next/link'
import {
  Layers, BookOpen, UserCheck, Users, BarChart2, Globe,
  Settings, LayoutDashboard, GripVertical, Plus, X, Search,
  ChevronUp, ChevronDown, Send, Eye, CheckCircle, Clock,
  AlertCircle, ArrowLeft, Zap
} from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const navItems = [
  { label: 'Vue d\'ensemble', href: '/dashboard/institution',             icon: <LayoutDashboard size={16} /> },
  { label: 'Mes programmes',  href: '/dashboard/institution/programs',    icon: <Layers size={16} /> },
  { label: 'Mes cours',       href: '/dashboard/institution/courses',     icon: <BookOpen size={16} /> },
  { label: 'Mon équipe',      href: '/dashboard/institution/teachers',    icon: <UserCheck size={16} /> },
  { label: 'Étudiants',       href: '/dashboard/institution/students',    icon: <Users size={16} /> },
  { label: 'Analytiques',     href: '/dashboard/institution/analytics',   icon: <BarChart2 size={16} /> },
  { label: 'Page publique',   href: '/dashboard/institution/profile',     icon: <Globe size={16} /> },
  { label: 'Paramètres',      href: '/dashboard/institution/settings',    icon: <Settings size={16} /> },
]

export default function ProgramEditorPage() {
  const { slug } = useParams<{ slug: string }>()
  const programId = slug
  const { profile } = useAuth()
  const supabase = createBrowserClient()
  const router = useRouter()

  const [program, setProgram] = useState<any>(null)
  const [programCourses, setProgramCourses] = useState<any[]>([])
  const [availableCourses, setAvailableCourses] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [showPicker, setShowPicker] = useState(false)

  const load = useCallback(async () => {
    if (!profile) return

    const { data: prog } = await supabase
      .from('programs')
      .select('*, category:categories(name)')
      .eq('id', programId)
      .eq('institution_id', profile.id)
      .single()

    if (!prog) { router.replace('/dashboard/institution/programs'); return }
    setProgram(prog)

    const { data: pc } = await supabase
      .from('program_courses')
      .select('*, course:courses(id,title,slug,thumbnail_url,level,total_lessons,total_duration_min,enrolled_count,status,category:categories(name))')
      .eq('program_id', programId)
      .order('order_num')

    setProgramCourses(pc || [])

    const { data: myCourses } = await supabase
      .from('courses')
      .select('id,title,slug,thumbnail_url,level,total_lessons,total_duration_min,status,category:categories(name)')
      .eq('instructor_id', profile.id)
      .eq('status', 'published')
      .order('title')

    setAvailableCourses(myCourses || [])
    setLoading(false)
  }, [profile, programId])

  useEffect(() => { load() }, [load])

  const addCourse = async (course: any) => {
    const alreadyIn = programCourses.some(pc => pc.course_id === course.id)
    if (alreadyIn) { toast.error('Ce cours est déjà dans le programme'); return }

    const newOrder = programCourses.length + 1
    const { data, error } = await supabase
      .from('program_courses')
      .insert({ program_id: programId, course_id: course.id, order_num: newOrder, is_required: true })
      .select('*, course:courses(id,title,slug,thumbnail_url,level,total_lessons,total_duration_min,enrolled_count,status,category:categories(name))')
      .single()

    if (error) { toast.error('Erreur lors de l\'ajout'); return }

    setProgramCourses(prev => [...prev, data])
    await supabase.from('programs').update({ total_courses: programCourses.length + 1 }).eq('id', programId)
    toast.success(`"${course.title}" ajouté au programme`)
  }

  const removeCourse = async (pcId: string) => {
    const { error } = await supabase.from('program_courses').delete().eq('id', pcId)
    if (error) { toast.error('Erreur'); return }
    const updated = programCourses.filter(pc => pc.id !== pcId)
    setProgramCourses(updated)
    await reorderAfterRemoval(updated)
    toast.success('Cours retiré du programme')
  }

  const reorderAfterRemoval = async (list: any[]) => {
    const updates = list.map((pc, i) => ({ id: pc.id, order_num: i + 1 }))
    for (const u of updates) {
      await supabase.from('program_courses').update({ order_num: u.order_num }).eq('id', u.id)
    }
  }

  const moveUp = async (idx: number) => {
    if (idx === 0) return
    const updated = [...programCourses]
    ;[updated[idx - 1], updated[idx]] = [updated[idx], updated[idx - 1]]
    setProgramCourses(updated)
    setSaving(true)
    await supabase.from('program_courses').update({ order_num: idx }).eq('id', updated[idx - 1].id)
    await supabase.from('program_courses').update({ order_num: idx + 1 }).eq('id', updated[idx].id)
    setSaving(false)
  }

  const moveDown = async (idx: number) => {
    if (idx === programCourses.length - 1) return
    const updated = [...programCourses]
    ;[updated[idx], updated[idx + 1]] = [updated[idx + 1], updated[idx]]
    setProgramCourses(updated)
    setSaving(true)
    await supabase.from('program_courses').update({ order_num: idx + 1 }).eq('id', updated[idx].id)
    await supabase.from('program_courses').update({ order_num: idx + 2 }).eq('id', updated[idx + 1].id)
    setSaving(false)
  }

  const submitForReview = async () => {
    if (programCourses.length === 0) {
      toast.error('Ajoutez au moins un cours avant de soumettre')
      return
    }
    setSubmitting(true)
    const { error } = await supabase
      .from('programs')
      .update({ status: 'review' })
      .eq('id', programId)
    if (!error) {
      setProgram((p: any) => ({ ...p, status: 'review' }))
      toast.success('Programme soumis pour révision !')
    }
    setSubmitting(false)
  }

  const filteredCourses = availableCourses.filter(c =>
    c.title.toLowerCase().includes(search.toLowerCase()) &&
    !programCourses.some(pc => pc.course_id === c.id)
  )

  const totalDuration = programCourses.reduce(
    (s, pc) => s + (pc.course?.total_duration_min || 0), 0
  )
  const totalLessons = programCourses.reduce(
    (s, pc) => s + (pc.course?.total_lessons || 0), 0
  )

  const STATUS_INFO: Record<string, { label: string; color: string; icon: any }> = {
    draft:     { label: 'Brouillon',    color: 'text-text3',  icon: Clock },
    review:    { label: 'En révision',  color: 'text-yellow', icon: Clock },
    published: { label: 'Publié',       color: 'text-green',  icon: CheckCircle },
    archived:  { label: 'Archivé',      color: 'text-text3',  icon: Clock },
  }

  if (loading) return (
    <DashboardLayout navItems={navItems} title="Chargement..." role="institution">
      <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>
    </DashboardLayout>
  )

  const si = STATUS_INFO[program?.status] || STATUS_INFO.draft
  const StatusIcon = si.icon

  return (
    <DashboardLayout navItems={navItems} title={program?.title || 'Programme'} role="institution">
      <div className="max-w-4xl">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <Link href="/dashboard/institution/programs"
              className="inline-flex items-center gap-1.5 text-xs text-text3 hover:text-text mb-2 transition-colors">
              <ArrowLeft size={12} /> Mes programmes
            </Link>
            <h1 className="text-xl font-bold text-text">{program?.title}</h1>
            <div className="flex items-center gap-3 mt-1">
              <span className={clsx('flex items-center gap-1 text-xs font-medium', si.color)}>
                <StatusIcon size={11} /> {si.label}
              </span>
              <span className="text-xs text-text3">{programCourses.length} cours</span>
              {totalDuration > 0 && (
                <span className="text-xs text-text3">{Math.round(totalDuration / 60)}h de contenu</span>
              )}
              {saving && <span className="text-xs text-text3">Sauvegarde...</span>}
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            {program?.status === 'published' && (
              <Link href={`/programas/${program?.slug}`} target="_blank"
                className="flex items-center gap-1.5 text-xs bg-green/10 text-green border border-green/20 px-3 py-2 rounded-xl hover:bg-green/20 transition-colors font-medium">
                <Eye size={13} /> Voir la page
              </Link>
            )}
            {program?.status === 'draft' && (
              <button onClick={submitForReview} disabled={submitting}
                className="flex items-center gap-1.5 text-xs text-white edha-gradient px-4 py-2 rounded-xl font-medium disabled:opacity-50 hover:opacity-90 transition-opacity">
                {submitting ? <Spinner size="sm" /> : <Send size={13} />}
                Soumettre pour révision
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Cours du programme (gauche) ── */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-text">
                Cours du programme
                <span className="text-text3 font-normal text-sm ml-2">
                  ({programCourses.length} cours · {totalLessons} leçons)
                </span>
              </h2>
              <button
                onClick={() => setShowPicker(!showPicker)}
                className="flex items-center gap-1.5 text-sm text-blue hover:underline font-medium"
              >
                <Plus size={14} /> Ajouter un cours
              </button>
            </div>

            {programCourses.length === 0 ? (
              <Card className="p-8 text-center">
                <BookOpen size={28} className="text-text3 mx-auto mb-3" />
                <p className="text-sm font-medium text-text mb-1">Aucun cours dans ce programme</p>
                <p className="text-xs text-text3 mb-4">
                  Ajoutez vos cours publiés et ordonnez-les pour créer le parcours de l&apos;étudiant.
                </p>
                <button
                  onClick={() => setShowPicker(true)}
                  className="inline-flex items-center gap-2 text-sm text-blue hover:underline"
                >
                  <Plus size={13} /> Ajouter le premier cours
                </button>
              </Card>
            ) : (
              <div className="space-y-2">
                {programCourses.map((pc, idx) => (
                  <Card key={pc.id} className="p-4">
                    <div className="flex items-center gap-3">
                      {/* Ordre visuel */}
                      <div className="flex flex-col items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => moveUp(idx)}
                          disabled={idx === 0}
                          className="text-text3 hover:text-text disabled:opacity-20 transition-colors"
                        >
                          <ChevronUp size={16} />
                        </button>
                        <span className="text-xs font-bold text-text3 w-5 text-center">
                          {idx + 1}
                        </span>
                        <button
                          onClick={() => moveDown(idx)}
                          disabled={idx === programCourses.length - 1}
                          className="text-text3 hover:text-text disabled:opacity-20 transition-colors"
                        >
                          <ChevronDown size={16} />
                        </button>
                      </div>

                      {/* Thumbnail */}
                      {pc.course?.thumbnail_url ? (
                        <img src={pc.course.thumbnail_url} alt=""
                          className="w-14 h-14 rounded-xl object-cover border border-border flex-shrink-0" />
                      ) : (
                        <div className="w-14 h-14 bg-bg2 rounded-xl flex items-center justify-center flex-shrink-0 border border-border">
                          <BookOpen size={18} className="text-text3" />
                        </div>
                      )}

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-text text-sm truncate">{pc.course?.title}</p>
                        <p className="text-xs text-text3 mt-0.5">
                          {pc.course?.category?.name} · {pc.course?.total_lessons} leçons
                          {pc.course?.total_duration_min > 0 &&
                            ` · ${Math.round(pc.course.total_duration_min / 60)}h`}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <label className="flex items-center gap-1.5 text-xs text-text3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={pc.is_required}
                            onChange={async (e) => {
                              await supabase.from('program_courses')
                                .update({ is_required: e.target.checked }).eq('id', pc.id)
                              setProgramCourses(prev =>
                                prev.map(p => p.id === pc.id ? { ...p, is_required: e.target.checked } : p))
                            }}
                            className="rounded"
                          />
                          Obligatoire
                        </label>
                        <button
                          onClick={() => removeCourse(pc.id)}
                          className="text-text3 hover:text-red transition-colors p-1.5 rounded-lg hover:bg-red/10"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* Info outils pratiques */}
            {program?.practice_tools?.length > 0 && (
              <div className="bg-blue/5 border border-blue/20 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Zap size={14} className="text-blue" />
                  <p className="text-sm font-medium text-blue">Outils pratiques activés</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {program.practice_tools.map((t: any) => (
                    <span key={t.type}
                      className="text-xs bg-white border border-blue/20 text-blue px-2.5 py-1 rounded-full">
                      {t.label}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-text3 mt-2">
                  Les instructeurs peuvent attribuer ces outils à chaque leçon lors de la création des cours.
                </p>
              </div>
            )}
          </div>

          {/* ── Sélecteur de cours (droite) ── */}
          <div className="space-y-4">
            <h2 className="font-semibold text-text">Ajouter des cours</h2>

            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text3" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-bg2 border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm text-text outline-none focus:border-blue/50"
              />
            </div>

            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {filteredCourses.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-xs text-text3">
                    {availableCourses.length === 0
                      ? 'Aucun cours publié. Créez des cours d\'abord.'
                      : 'Tous vos cours sont déjà dans le programme.'}
                  </p>
                  {availableCourses.length === 0 && (
                    <Link href="/dashboard/institution/courses/new"
                      className="text-xs text-blue hover:underline mt-2 block">
                      Créer un cours →
                    </Link>
                  )}
                </div>
              ) : (
                filteredCourses.map(course => (
                  <button
                    key={course.id}
                    onClick={() => addCourse(course)}
                    className="w-full flex items-center gap-3 p-3 bg-card border border-border rounded-xl hover:border-blue/30 hover:bg-bg2 transition-all text-left group"
                  >
                    {course.thumbnail_url ? (
                      <img src={course.thumbnail_url} alt=""
                        className="w-10 h-10 rounded-lg object-cover border border-border flex-shrink-0" />
                    ) : (
                      <div className="w-10 h-10 bg-bg2 rounded-lg flex items-center justify-center flex-shrink-0">
                        <BookOpen size={14} className="text-text3" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-text truncate group-hover:text-blue transition-colors">
                        {course.title}
                      </p>
                      <p className="text-[10px] text-text3">{course.total_lessons} leçons</p>
                    </div>
                    <Plus size={14} className="text-text3 group-hover:text-blue transition-colors flex-shrink-0" />
                  </button>
                ))
              )}
            </div>

            {/* Avertissement si pas de cours publiés */}
            {availableCourses.length === 0 && (
              <div className="bg-yellow/5 border border-yellow/20 rounded-xl p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle size={14} className="text-yellow flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-text2">
                    Vous devez avoir des <strong>cours publiés</strong> pour les ajouter à un programme.
                    Créez et publiez vos cours d&apos;abord.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}