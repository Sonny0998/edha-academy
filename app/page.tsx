import { createSupabaseServerClient } from '@/lib/supabase/server'
import Navbar from '@/components/Navbar'
import HomeClient from './HomeClient'

export default async function HomePage() {
  const supabase = await createSupabaseServerClient()
  const [coursesRes, catsRes, statsRes] = await Promise.all([
    supabase.from('courses')
      .select('*,instructor:profiles!instructor_id(full_name,avatar_url),category:categories(name,slug)')
      .eq('status', 'published').eq('is_featured', true).limit(6),
    supabase.from('categories').select('*').order('order_num').limit(8),
    supabase.from('platform_stats').select('*').single(),
  ])

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <HomeClient
        featuredCourses={coursesRes.data || []}
        categories={catsRes.data || []}
        stats={statsRes.data}
      />
    </div>
  )
}