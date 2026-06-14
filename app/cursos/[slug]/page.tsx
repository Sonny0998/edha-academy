import { createSupabaseServerClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import CheckoutButton from '@/components/checkout/CheckoutButton'
import { StarRating, Badge, Avatar } from '@/components/ui'
import {
  CheckCircle, Clock, BookOpen, Users, Globe, Award,
  Play, ChevronDown, Lock, FileText, HelpCircle, Video
} from 'lucide-react'

interface PageProps { params: Promise<{ slug: string }> }

const LEVEL_LABELS: Record<string, string> = {
  debutant: 'Débutant', intermediaire: 'Intermédiaire', avance: 'Avancé'
}
const LANG_LABELS: Record<string, string> = { fr: 'Français', ht: 'Créole haïtien', en: 'Anglais' }

export default async function CourseDetailPage({ params }: PageProps) {
  const { slug } = await params
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Check if requester is instructor or admin (can see draft/review)
  let courseQuery = supabase
    .from('courses')
    .select(`
      *,
      instructor:profiles!instructor_id(id, full_name, avatar_url, bio, institution_name, institution_verified),
      category:categories(name, slug),
      modules:modules(
        *,
        lessons:lessons(id, title, duration_min, content_type, is_free_preview, is_published, order_num)
      )
    `)
    .eq('slug', slug)

  // Try published first
  const { data: courseData } = await courseQuery.eq('status', 'published').single()
  let finalCourse = courseData

  // If not published, check if user is owner or admin
  if (!finalCourse && user) {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role === 'admin' || profile?.role === 'instructor') {
      const { data: draftCourse } = await supabase
        .from('courses')
        .select(`*,instructor:profiles!instructor_id(id, full_name, avatar_url, bio, institution_name),category:categories(name, slug),modules:modules(*,lessons:lessons(id, title, duration_min, content_type, is_free_preview, is_published, order_num))`)
        .eq('slug', slug)
        .eq('instructor_id', user.id)
        .single()
      finalCourse = draftCourse
    }
  }

  if (!finalCourse) notFound()
  const courseData2 = finalCourse
  const course = (courseData2 || courseData) as any

  // Sort modules and lessons
  if (course.modules) {
    course.modules.sort((a: any, b: any) => a.order_num - b.order_num)
    course.modules.forEach((m: any) => {
      if (m.lessons) m.lessons.sort((a: any, b: any) => a.order_num - b.order_num)
    })
  }

  let isEnrolled = false
  if (user) {
    const { data: enrollment } = await supabase
      .from('enrollments').select('id').eq('student_id', user.id).eq('course_id', course.id).maybeSingle()
    isEnrolled = !!enrollment
  }

  const { data: related } = await supabase
    .from('courses')
    .select('id,title,slug,thumbnail_url,pricing_model,price,rating_avg,enrolled_count,instructor:profiles!instructor_id(full_name)')
    .eq('status', 'published').eq('category_id', course.category_id).neq('id', course.id).limit(3)

  const { data: reviews } = await supabase
    .from('reviews')
    .select('*, student:profiles!student_id(full_name, avatar_url)')
    .eq('course_id', course.id).order('helpful_count', { ascending: false }).limit(6)

  const totalLessons = (course.modules || []).reduce((s: number, m: any) => s + (m.lessons?.length || 0), 0)
  const freeLessons = (course.modules || []).reduce((s: number, m: any) => s + (m.lessons?.filter((l: any) => l.is_free_preview).length || 0), 0)
  const price = course.pricing_model === 'free' ? 'Gratuit' : course.price ? `$${course.price} USD` : 'Gratuit'

  return (
    <div className="min-h-screen bg-bg">
      <Navbar />
      <div className="pt-16">

        {/* Hero */}
        <div className="bg-gradient-to-r from-bg2 to-bg border-b border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

              {/* Left */}
              <div className="lg:col-span-2">
                {course.category && (
                  <Link href={`/categorias/${course.category.slug}`} className="text-blue text-sm font-semibold hover:underline mb-3 block">
                    {course.category.name}
                  </Link>
                )}
                <h1 className="text-3xl font-bold text-text mb-3">{course.title}</h1>
                {course.subtitle && <p className="text-lg text-text2 mb-5">{course.subtitle}</p>}

                <div className="flex flex-wrap items-center gap-4 mb-5">
                  <div className="flex items-center gap-2">
                    <StarRating rating={course.rating_avg || 0} size={16} />
                    <span className="text-yellow font-bold text-sm">{(course.rating_avg || 0).toFixed(1)}</span>
                    <span className="text-text3 text-sm">({course.rating_count || 0} avis)</span>
                  </div>
                  <span className="flex items-center gap-1.5 text-sm text-text2"><Users size={14} /> {course.enrolled_count || 0} étudiants</span>
                  <Badge variant="default">{LEVEL_LABELS[course.level] || course.level}</Badge>
                  <span className="flex items-center gap-1.5 text-sm text-text2"><Globe size={14} /> {LANG_LABELS[course.language] || course.language}</span>
                </div>

                {course.instructor && (
                  <div className="flex items-center gap-3">
                    <Avatar src={course.instructor.avatar_url} name={course.instructor.full_name} size="md" />
                    <div>
                      <p className="text-xs text-text3">Instructeur</p>
                      <p className="text-sm font-semibold text-text">{course.instructor.full_name}</p>
                      {course.instructor.institution_name && <p className="text-xs text-text3">{course.instructor.institution_name}</p>}
                    </div>
                  </div>
                )}
              </div>

              {/* Right — purchase card (desktop) */}
              <div className="hidden lg:block">
                <div className="bg-card border border-border rounded-2xl p-5 sticky top-24">
                  {course.thumbnail_url && (
                    <div className="aspect-video rounded-xl overflow-hidden mb-4 bg-card2">
                      <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="mb-4">
                    {course.pricing_model === 'free'
                      ? <p className="text-3xl font-bold text-green">Gratuit</p>
                      : <p className="text-3xl font-bold text-text">{price}</p>}
                  </div>
                  <CheckoutButton
                    courseId={course.id}
                    courseSlug={course.slug}
                    pricingModel={course.pricing_model}
                    price={course.price}
                    isEnrolled={isEnrolled}
                  />
                  <div className="mt-4 space-y-2">
                    {[
                      { icon: BookOpen, text: `${totalLessons} leçons` },
                      { icon: Clock, text: `${Math.round((course.total_duration_min || 0) / 60)}h de contenu` },
                      { icon: Award, text: 'Certificat de complétion' },
                      { icon: Globe, text: 'Accès illimité' },
                    ].map(({ icon: Icon, text }) => (
                      <div key={text} className="flex items-center gap-2 text-sm text-text2">
                        <Icon size={14} className="text-text3" />{text}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2 space-y-10">

              {/* What you'll learn */}
              {course.what_you_learn?.length > 0 && (
                <section>
                  <h2 className="text-xl font-bold text-text mb-5">Ce que vous allez apprendre</h2>
                  <div className="bg-card border border-border rounded-2xl p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {course.what_you_learn.map((item: string, i: number) => (
                      <div key={i} className="flex items-start gap-2 text-sm text-text2">
                        <CheckCircle size={14} className="text-green mt-0.5 flex-shrink-0" />{item}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Curriculum */}
              {course.modules?.length > 0 && (
                <section>
                  <h2 className="text-xl font-bold text-text mb-2">Programme du cours</h2>
                  <p className="text-sm text-text3 mb-5">
                    {course.modules.length} modules · {totalLessons} leçons
                    {freeLessons > 0 && ` · ${freeLessons} aperçus gratuits`}
                  </p>
                  <div className="space-y-2">
                    {course.modules.map((mod: any) => (
                      <details key={mod.id} className="bg-card border border-border rounded-xl overflow-hidden group">
                        <summary className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-card2 transition-colors list-none">
                          <div className="flex items-center gap-3">
                            <ChevronDown size={16} className="text-text3 group-open:rotate-180 transition-transform" />
                            <span className="font-medium text-text text-sm">{mod.title}</span>
                          </div>
                          <span className="text-xs text-text3">{mod.lessons?.length || 0} leçons</span>
                        </summary>
                        <div className="border-t border-border">
                          {(mod.lessons || []).map((lesson: any) => (
                            <div key={lesson.id} className="flex items-center gap-3 px-5 py-3 border-b border-border/50 last:border-0">
                              <div className="text-text3 flex-shrink-0">
                                {lesson.content_type === 'video' ? <Play size={14} /> : lesson.content_type === 'quiz' ? <HelpCircle size={14} /> : <FileText size={14} />}
                              </div>
                              <span className="text-sm text-text2 flex-1">{lesson.title}</span>
                              <div className="flex items-center gap-2">
                                {lesson.is_free_preview
                                  ? <Badge variant="green">Aperçu</Badge>
                                  : <Lock size={12} className="text-text3" />}
                                {lesson.duration_min && <span className="text-xs text-text3">{lesson.duration_min}min</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </details>
                    ))}
                  </div>
                </section>
              )}

              {/* Requirements */}
              {course.requirements?.length > 0 && (
                <section>
                  <h2 className="text-xl font-bold text-text mb-4">Prérequis</h2>
                  <ul className="space-y-2">
                    {course.requirements.map((r: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-text2">
                        <span className="text-text3 mt-1">•</span>{r}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Instructor */}
              {course.instructor && (
                <section>
                  <h2 className="text-xl font-bold text-text mb-5">Votre instructeur</h2>
                  <div className="flex items-start gap-4">
                    <Avatar src={course.instructor.avatar_url} name={course.instructor.full_name} size="xl" className="flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold text-text mb-1">{course.instructor.full_name}</h3>
                      {course.instructor.institution_name && <p className="text-sm text-blue mb-2">{course.instructor.institution_name}</p>}
                      {course.instructor.bio && <p className="text-sm text-text2 leading-relaxed">{course.instructor.bio}</p>}
                    </div>
                  </div>
                </section>
              )}

              {/* Reviews */}
              {reviews && reviews.length > 0 && (
                <section>
                  <h2 className="text-xl font-bold text-text mb-5">Avis des apprenants</h2>
                  <div className="flex items-center gap-6 mb-6">
                    <div className="text-center">
                      <div className="text-5xl font-bold text-text">{(course.rating_avg || 0).toFixed(1)}</div>
                      <StarRating rating={course.rating_avg || 0} size={18} />
                      <p className="text-xs text-text3 mt-1">Note globale</p>
                    </div>
                    <div className="flex-1 space-y-1">
                      {[5, 4, 3, 2, 1].map(star => {
                        const count = (reviews || []).filter((r: any) => Math.round(r.rating) === star).length
                        const pct = reviews.length > 0 ? (count / reviews.length) * 100 : 0
                        return (
                          <div key={star} className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-border rounded-full overflow-hidden">
                              <div className="h-full bg-yellow rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs text-text3 w-4">{star}★</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                  <div className="space-y-5">
                    {reviews.map((review: any) => (
                      <div key={review.id} className="border-b border-border pb-5 last:border-0">
                        <div className="flex items-start gap-3 mb-2">
                          <Avatar src={review.student?.avatar_url} name={review.student?.full_name || 'A'} size="sm" />
                          <div>
                            <p className="text-sm font-semibold text-text">{review.student?.full_name}</p>
                            <StarRating rating={review.rating} size={12} />
                          </div>
                        </div>
                        {review.comment && <p className="text-sm text-text2 ml-10">{review.comment}</p>}
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>

            {/* Right sidebar — Related courses */}
            <div className="space-y-6">
              {related && related.length > 0 && (
                <div>
                  <h3 className="font-semibold text-text mb-4">Cours similaires</h3>
                  <div className="space-y-3">
                    {related.map((c: any) => (
                      <Link key={c.id} href={`/cursos/${c.slug}`} className="flex items-center gap-3 bg-card border border-border rounded-xl p-3 hover:border-blue/30 transition-colors">
                        <div className="w-14 h-10 bg-card2 rounded-lg flex-shrink-0 overflow-hidden">
                          {c.thumbnail_url ? <img src={c.thumbnail_url} alt="" className="w-full h-full object-cover" /> : <BookOpen size={14} className="text-text3 m-auto mt-2" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-text truncate">{c.title}</p>
                          <p className="text-xs text-text3">{(c.instructor as any)?.full_name}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Mobile purchase */}
          <div className="lg:hidden mt-8">
            <div className="bg-card border border-border rounded-2xl p-5">
              <div className="mb-4">
                {course.pricing_model === 'free' ? <p className="text-2xl font-bold text-green">Gratuit</p> : <p className="text-2xl font-bold text-text">{price}</p>}
              </div>
              <CheckoutButton courseId={course.id} courseSlug={course.slug} pricingModel={course.pricing_model} price={course.price} isEnrolled={isEnrolled} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
