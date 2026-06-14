import { createSupabaseServerClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Link from 'next/link'
import {
  BookOpen, Clock, Users, Award, CheckCircle,
  ChevronRight, Globe, BarChart2, Lock, Play, Zap
} from 'lucide-react'
import ProgramEnrollButton from './ProgramEnrollButton'

const LEVEL_LABELS: Record<string, string> = {
  debutant: 'Débutant',
  intermediaire: 'Intermédiaire',
  avance: 'Avancé',
}

const LANG_LABELS: Record<string, string> = {
  fr: 'Français', ht: 'Kreyòl', en: 'English', es: 'Español',
}

export default async function ProgramPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = await createSupabaseServerClient()

  const { data: program } = await supabase
    .from('programs')
    .select(`
      *,
      institution:profiles!institution_id(
        full_name, institution_name, institution_logo_url,
        institution_slug, bio, institution_type
      ),
      category:categories(name, slug)
    `)
    .eq('slug', slug)
    .eq('status', 'published')
    .single()

  if (!program) notFound()

  const { data: programCourses } = await supabase
    .from('program_courses')
    .select(`
      order_num, is_required,
      course:courses(
        id, title, slug, description, thumbnail_url,
        total_lessons, total_duration_min, level,
        category:categories(name)
      )
    `)
    .eq('program_id', program.id)
    .order('order_num')

  const { data: { user } } = await supabase.auth.getUser()
  let userEnrollment = null
  if (user) {
    const { data } = await supabase
      .from('program_enrollments')
      .select('id, status, progress_pct')
      .eq('student_id', user.id)
      .eq('program_id', program.id)
      .maybeSingle()
    userEnrollment = data
  }

  const courses = (programCourses || []) as any[]
  const totalDuration = courses.reduce((s: number, pc: any) => s + (pc.course?.total_duration_min || 0), 0)
  const totalLessons = courses.reduce((s: number, pc: any) => s + (pc.course?.total_lessons || 0), 0)
  const instName = (program as any).institution?.institution_name ||
                   (program as any).institution?.full_name

  return (
    <div className="min-h-screen bg-bg">
      <Navbar />

      {/* Hero */}
      <div className="bg-[#0f1a2e] pt-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">

            {/* Left: info */}
            <div className="lg:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xs bg-white/10 text-white/70 px-2.5 py-1 rounded-full">
                  {(program as any).category?.name}
                </span>
                <span className="text-xs bg-white/10 text-white/70 px-2.5 py-1 rounded-full">
                  {LEVEL_LABELS[(program as any).level] || 'Tous niveaux'}
                </span>
              </div>

              <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4 leading-tight">
                {(program as any).title}
              </h1>

              {(program as any).subtitle && (
                <p className="text-lg text-white/70 mb-5">{(program as any).subtitle}</p>
              )}

              <div className="flex flex-wrap gap-4 text-sm text-white/60 mb-6">
                <span className="flex items-center gap-1.5">
                  <BookOpen size={14} /> {courses.length} cours
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock size={14} /> {Math.round(totalDuration / 60)}h de contenu
                </span>
                <span className="flex items-center gap-1.5">
                  <Users size={14} /> {(program as any).enrolled_count} étudiants
                </span>
                <span className="flex items-center gap-1.5">
                  <Globe size={14} /> {LANG_LABELS[(program as any).language]}
                </span>
              </div>

              {/* Institution */}
              <Link
                href={`/instituciones/${(program as any).institution?.institution_slug || ''}`}
                className="inline-flex items-center gap-3 bg-white/10 hover:bg-white/15 transition-colors rounded-xl px-4 py-3"
              >
                {(program as any).institution?.institution_logo_url ? (
                  <img
                    src={(program as any).institution.institution_logo_url}
                    alt=""
                    className="w-9 h-9 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center">
                    <BarChart2 size={16} className="text-white/60" />
                  </div>
                )}
                <div>
                  <p className="text-xs text-white/50">Proposé par</p>
                  <p className="text-sm font-semibold text-white">{instName}</p>
                </div>
                <ChevronRight size={14} className="text-white/40 ml-2" />
              </Link>
            </div>

            {/* Right: enrollment card */}
            <div className="bg-white rounded-2xl shadow-2xl p-6 lg:sticky lg:top-24">
              {(program as any).thumbnail_url && (
                <img
                  src={(program as any).thumbnail_url}
                  alt=""
                  className="w-full h-40 object-cover rounded-xl mb-5 border border-border"
                />
              )}

              <div className="mb-4">
                {(program as any).pricing_model === 'free' ? (
                  <p className="text-2xl font-bold text-green">Gratuit</p>
                ) : (
                  <div>
                    <p className="text-2xl font-bold text-text">${(program as any).price} USD</p>
                    {(program as any).price_htg && (
                      <p className="text-sm text-text3">{(program as any).price_htg} HTG</p>
                    )}
                  </div>
                )}
              </div>

              <ProgramEnrollButton
                programId={(program as any).id}
                pricingModel={(program as any).pricing_model}
                price={(program as any).price}
                userEnrollment={userEnrollment}
                firstCourseSlug={(courses[0] as any)?.course?.slug}
              />

              <div className="mt-5 space-y-2.5">
                {[
                  { icon: BookOpen, text: `${courses.length} cours inclus` },
                  { icon: Clock, text: `${Math.round(totalDuration / 60)}h de contenu` },
                  { icon: Award, text: (program as any).certificate_title || 'Certificat de complétion' },
                  { icon: Zap, text: `${(program as any).practice_tools?.length || 0} outil(s) pratique(s)` },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-2.5 text-sm text-text2">
                    <Icon size={14} className="text-blue flex-shrink-0" />
                    {text}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 space-y-10">

            {/* Ce que vous apprendrez */}
            {(program as any).what_you_learn?.length > 0 && (
              <section>
                <h2 className="text-xl font-bold text-text mb-5">Ce que vous allez apprendre</h2>
                <div className="bg-card border border-border rounded-2xl p-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(program as any).what_you_learn.map((item: string) => (
                    <div key={item} className="flex items-start gap-2.5">
                      <CheckCircle size={15} className="text-green flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-text2">{item}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Cours du programme */}
            <section>
              <h2 className="text-xl font-bold text-text mb-2">
                Contenu du programme
              </h2>
              <p className="text-sm text-text3 mb-5">
                {courses.length} cours · {totalLessons} leçons · {Math.round(totalDuration / 60)}h au total
              </p>

              <div className="space-y-3">
                {courses.map((pc: any, idx: number) => (
                  <div key={pc.course?.id}
                    className="bg-card border border-border rounded-2xl p-5 flex items-start gap-4">
                    {/* Numéro */}
                    <div className="w-10 h-10 bg-blue/10 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-blue text-sm">
                      {idx + 1}
                    </div>

                    {/* Thumbnail */}
                    {pc.course?.thumbnail_url ? (
                      <img src={pc.course.thumbnail_url} alt=""
                        className="w-16 h-16 rounded-xl object-cover border border-border flex-shrink-0 hidden sm:block" />
                    ) : (
                      <div className="w-16 h-16 bg-bg2 rounded-xl flex items-center justify-center border border-border flex-shrink-0 hidden sm:block">
                        <BookOpen size={18} className="text-text3" />
                      </div>
                    )}

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-semibold text-text text-sm">{pc.course?.title}</h3>
                          <p className="text-xs text-text3 mt-0.5 line-clamp-2">{pc.course?.description}</p>
                          <div className="flex items-center gap-3 mt-2">
                            <span className="text-xs text-text3 flex items-center gap-1">
                              <Play size={10} /> {pc.course?.total_lessons} leçons
                            </span>
                            {pc.course?.total_duration_min > 0 && (
                              <span className="text-xs text-text3 flex items-center gap-1">
                                <Clock size={10} /> {Math.round(pc.course.total_duration_min / 60)}h
                              </span>
                            )}
                            {!pc.is_required && (
                              <span className="text-xs text-text3 italic">Optionnel</span>
                            )}
                          </div>
                        </div>
                        {userEnrollment ? (
                          <Link href={`/cursos/${pc.course?.slug}`}
                            className="flex items-center gap-1 text-xs text-blue hover:underline flex-shrink-0">
                            Accéder <ChevronRight size={12} />
                          </Link>
                        ) : (
                          <Lock size={14} className="text-text3 flex-shrink-0 mt-1" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* À propos de l'institution */}
            <section>
              <h2 className="text-xl font-bold text-text mb-5">À propos de l&apos;institution</h2>
              <div className="bg-card border border-border rounded-2xl p-6">
                <div className="flex items-center gap-4 mb-4">
                  {(program as any).institution?.institution_logo_url ? (
                    <img src={(program as any).institution.institution_logo_url}
                      alt="" className="w-14 h-14 rounded-xl object-cover border border-border" />
                  ) : (
                    <div className="w-14 h-14 bg-purple/10 rounded-xl flex items-center justify-center">
                      <BarChart2 size={22} className="text-purple" />
                    </div>
                  )}
                  <div>
                    <h3 className="font-bold text-text">{instName}</h3>
                    <p className="text-xs text-text3">{(program as any).institution?.institution_type}</p>
                  </div>
                </div>
                {(program as any).institution?.bio && (
                  <p className="text-sm text-text2 leading-relaxed">{(program as any).institution.bio}</p>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}