import { createSupabaseServerClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, Clock, ArrowLeft, Eye, Video, FileText, HelpCircle } from 'lucide-react'

interface Props { params: Promise<{ courseId: string }> }

export default async function CoursePreviewPage({ params }: Props) {
  const { courseId } = await params
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const { data: course } = await supabase
    .from('courses')
    .select('*,instructor:profiles!instructor_id(full_name,avatar_url),category:categories(name),modules:modules(*,lessons:lessons(id,title,content_type,duration_min,is_free_preview,order_num))')
    .eq('id', courseId).single()

  if (!course) notFound()
  if (profile?.role !== 'admin' && course.instructor_id !== user.id) redirect('/dashboard/instructor')

  course.modules?.sort((a: any, b: any) => a.order_num - b.order_num)
  course.modules?.forEach((m: any) => m.lessons?.sort((a: any, b: any) => a.order_num - b.order_num))

  const totalLessons = course.modules?.reduce((s: number, m: any) => s + (m.lessons?.length || 0), 0) || 0

  const TICON: Record<string, React.ReactNode> = {
    video: <Video size={13} className="text-blue"/>,
    text: <FileText size={13} className="text-green"/>,
    quiz: <HelpCircle size={13} className="text-yellow"/>,
  }

  const statusMap: Record<string, { label: string; cls: string }> = {
    draft: { label: 'Brouillon', cls: 'bg-bg2 text-text3' },
    review: { label: '⏳ En révision', cls: 'bg-yellow/10 text-yellow border border-yellow/20' },
    published: { label: '✓ Publié', cls: 'bg-green/10 text-green border border-green/20' },
  }
  const st = statusMap[course.status] || statusMap.draft

  return (
    <div className="min-h-screen bg-bg">
      {/* Banner */}
      <div className="bg-blue/5 border-b border-blue/20 px-4 sm:px-6 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Eye size={16} className="text-blue flex-shrink-0"/>
            <span className="text-sm font-medium text-blue hidden sm:block">Prévisualisation du cours</span>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${st.cls}`}>{st.label}</span>
          </div>
          <Link href="/dashboard/instructor/courses"
            className="flex items-center gap-1.5 text-sm text-text2 hover:text-text bg-card border border-border px-3 py-1.5 rounded-lg transition-colors flex-shrink-0">
            <ArrowLeft size={13}/> Retour
          </Link>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
          <div className="lg:col-span-2">
            {course.category?.name && <p className="text-xs font-medium text-blue mb-2 uppercase tracking-wider">{course.category.name}</p>}
            <h1 className="text-3xl font-bold text-text mb-3 leading-tight">{course.title}</h1>
            {course.subtitle && <p className="text-lg text-text2 mb-4">{course.subtitle}</p>}
            <p className="text-text2 leading-relaxed mb-6">{course.description}</p>
            <div className="flex flex-wrap gap-4 text-sm text-text3">
              <span>📚 {course.modules?.length || 0} modules</span>
              <span>🎓 {totalLessons} leçons</span>
              <span>🌐 {course.language === 'fr' ? 'Français' : course.language === 'ht' ? 'Créole haïtien' : 'Anglais'}</span>
              <span>📊 {course.level}</span>
            </div>
          </div>
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm h-fit">
            {course.thumbnail_url && <img src={course.thumbnail_url} alt="" className="w-full aspect-video object-cover rounded-xl mb-4"/>}
            <div className="text-2xl font-bold text-text mb-3">
              {course.pricing_model === 'free' ? '🆓 Gratuit' : `$${course.price}`}
            </div>
            <div className="w-full bg-bg2 border border-border text-text3 text-sm py-2.5 rounded-xl text-center mb-2 cursor-not-allowed">
              S&apos;inscrire (désactivé en prévisualisation)
            </div>
            <p className="text-xs text-text3 text-center">Les étudiants verront le vrai bouton ici</p>
          </div>
        </div>

        {course.what_you_learn?.length > 0 && (
          <div className="bg-bg2 rounded-2xl p-6 mb-8 border border-border">
            <h2 className="text-xl font-bold text-text mb-4">Ce que vous apprendrez</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {course.what_you_learn.map((item: string, i: number) => (
                <div key={i} className="flex items-start gap-2 text-sm text-text2">
                  <CheckCircle size={13} className="text-green mt-0.5 flex-shrink-0"/> {item}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mb-8">
          <h2 className="text-xl font-bold text-text mb-4">Contenu du cours</h2>
          <div className="space-y-2">
            {course.modules?.map((mod: any, mi: number) => (
              <div key={mod.id} className="border border-border rounded-xl overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3 bg-bg2">
                  <span className="text-sm font-semibold text-text">Module {mi + 1} : {mod.title}</span>
                  <span className="ml-auto text-xs text-text3">{mod.lessons?.length || 0} leçon{(mod.lessons?.length || 0) > 1 ? 's' : ''}</span>
                </div>
                <div className="divide-y divide-border">
                  {mod.lessons?.map((lesson: any) => (
                    <div key={lesson.id} className="flex items-center gap-3 px-4 py-2.5 bg-card">
                      <span className="flex-shrink-0">{TICON[lesson.content_type] || <FileText size={13}/>}</span>
                      <span className="text-sm text-text2 flex-1">{lesson.title}</span>
                      {lesson.is_free_preview && <span className="text-[10px] bg-green/10 text-green px-2 py-0.5 rounded-full">Aperçu</span>}
                      {lesson.duration_min && <span className="text-[10px] text-text3 flex items-center gap-1"><Clock size={10}/> {lesson.duration_min}min</span>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={`rounded-xl p-4 text-center text-sm font-medium border ${
          course.status === 'review' ? 'bg-yellow/5 border-yellow/20 text-yellow' :
          course.status === 'published' ? 'bg-green/5 border-green/20 text-green' :
          'bg-blue/5 border-blue/20 text-blue'
        }`}>
          {course.status === 'draft' && '📋 Ce cours est un brouillon. Soumettez-le via "Mes cours" pour révision.'}
          {course.status === 'review' && '⏳ Votre cours est en attente de révision par l\'équipe EDHA Academy.'}
          {course.status === 'published' && '✅ Votre cours est publié et accessible à tous les étudiants !'}
        </div>
      </div>
    </div>
  )
}
