import { createSupabaseServerClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { CourseCard } from '@/components/course/CourseCard'
import { BookOpen } from 'lucide-react'
import Link from 'next/link'

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createSupabaseServerClient()
  const { data: category } = await supabase.from('categories').select('*').eq('slug', slug).single()
  if (!category) notFound()

  const { data: courses } = await supabase.from('courses')
    .select('*, instructor:profiles!instructor_id(full_name,avatar_url,institution_name), category:categories(name,slug)')
    .eq('category_id', category.id).eq('status', 'published')
    .order('enrolled_count', { ascending: false }).limit(24)

  return (
    <div className="min-h-screen bg-bg">
      <Navbar />
      <div className="pt-24 pb-16 max-w-7xl mx-auto px-4 sm:px-6">
        <div className="mb-8">
          <Link href="/cursos" className="text-sm text-text3 hover:text-text2 mb-2 block">← Tous les cours</Link>
          <h1 className="text-3xl font-bold text-text">{category.name}</h1>
          {category.description && <p className="text-text2 mt-2">{category.description}</p>}
          <p className="text-text3 text-sm mt-1">{(courses || []).length} cours disponibles</p>
        </div>

        {(courses || []).length === 0 ? (
          <div className="text-center py-20">
            <BookOpen size={40} className="text-text3 mx-auto mb-3" />
            <p className="text-text2">Aucun cours dans cette catégorie pour le moment.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {(courses || []).map((course: any) => <CourseCard key={course.id} course={course} />)}
          </div>
        )}
      </div>
    </div>
  )
}
