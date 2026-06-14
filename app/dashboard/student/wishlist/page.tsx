'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { studentNav } from '@/lib/nav'
import { createBrowserClient } from '@/lib/supabase/browser'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { Card, Badge, EmptyState, Spinner, Button } from '@/components/ui'
import Link from 'next/link'
import { Heart, BookOpen, Award, LayoutDashboard, User, Trash2 , Calendar} from 'lucide-react'
import toast from 'react-hot-toast'

const navItems = [
  { label: 'Tableau de bord',  href: '/dashboard/student',              icon: <LayoutDashboard size={16}/> },
  { label: 'Mes cours',        href: '/dashboard/student/courses',       icon: <BookOpen size={16}/> },
  { label: 'Calendrier',       href: '/dashboard/student/calendar',      icon: <Calendar size={16}/> },
  { label: 'Certificats',      href: '/dashboard/student/certificates',  icon: <Award size={16}/> },
  { label: 'Liste de souhaits',href: '/dashboard/student/wishlist',      icon: <Heart size={16}/> },
  { label: 'Mon profil',       href: '/dashboard/student/profile',       icon: <User size={16}/> },
]

export default function WishlistPage() {
  const { profile } = useAuth()
  const supabase = createBrowserClient()
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile) return
    load()
  }, [profile])

  const load = () => {
    supabase.from('wishlist')
      .select('*,course:courses(id,title,slug,thumbnail_url,pricing_model,price,rating_avg,rating_count,enrolled_count,instructor:profiles!instructor_id(full_name))')
      .eq('student_id', profile!.id)
      .then(({ data }) => { setItems(data || []); setLoading(false) })
  }

  const remove = async (id: string) => {
    await supabase.from('wishlist').delete().eq('id', id)
    setItems(items.filter(i => i.id !== id))
    toast.success('Retiré de la liste de souhaits')
  }

  if (loading) return (
    <DashboardLayout navItems={studentNav} title="Liste de souhaits" role="student">
      <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>
    </DashboardLayout>
  )

  return (
    <DashboardLayout navItems={studentNav} title="Liste de souhaits" role="student">
      <h1 className="text-2xl font-bold text-text mb-6">Liste de souhaits</h1>

      {items.length === 0 ? (
        <Card className="p-8">
          <EmptyState icon={<Heart size={24} />} title="Liste vide" description="Ajoutez des cours à votre liste de souhaits depuis le catalogue."
            action={<Link href="/cursos" className="bg-blue text-white text-sm px-4 py-2 rounded-xl">Explorer les cours</Link>} />
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((w: any) => (
            <Card key={w.id} className="overflow-hidden hover:border-blue/30 transition-colors">
              <div className="h-36 bg-card2 relative">
                {w.course?.thumbnail_url
                  ? <img src={w.course.thumbnail_url} alt="" className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center"><BookOpen size={28} className="text-text3" /></div>}
                <button onClick={() => remove(w.id)} className="absolute top-2 right-2 bg-bg/80 hover:bg-red/20 text-text3 hover:text-red p-1.5 rounded-lg transition-all">
                  <Trash2 size={13} />
                </button>
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-text text-sm mb-1 line-clamp-2">{w.course?.title}</h3>
                <p className="text-xs text-text3 mb-3">{w.course?.instructor?.full_name}</p>
                <div className="flex items-center justify-between">
                  <Badge variant={w.course?.pricing_model === 'free' ? 'green' : 'blue'}>
                    {w.course?.pricing_model === 'free' ? 'Gratuit' : `$${w.course?.price}`}
                  </Badge>
                  <Link href={`/cursos/${w.course?.slug}`}
                    className="text-xs text-blue hover:underline">Voir le cours →</Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </DashboardLayout>
  )
}
