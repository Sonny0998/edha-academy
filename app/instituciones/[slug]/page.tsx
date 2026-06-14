import { createSupabaseServerClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Link from 'next/link'
import {
  Building2, BookOpen, Users, Award, Globe, MapPin,
  Phone, ExternalLink, Layers, ChevronRight, CheckCircle,
  Clock, BarChart2
} from 'lucide-react'
import { CourseCard } from '@/components/course/CourseCard'

const LEVEL_LABELS: Record<string, string> = {
  debutant: 'Débutant', intermediaire: 'Intermédiaire', avance: 'Avancé',
}

export default async function InstitutionPublicPage({
  params,
}: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createSupabaseServerClient()

  // Fetch institution profile
  const { data: institution } = await supabase
    .from('profiles')
    .select('*')
    .eq('institution_slug', slug)
    .eq('role', 'institution')
    .single()

  if (!institution) notFound()

  // Fetch published programs
  const { data: programs } = await supabase
    .from('programs')
    .select('*, category:categories(name)')
    .eq('institution_id', institution.id)
    .eq('status', 'published')
    .order('enrolled_count', { ascending: false })

  // Fetch published courses
  const { data: courses } = await supabase
    .from('courses')
    .select('*, instructor:profiles!instructor_id(full_name,avatar_url), category:categories(name,slug)')
    .eq('instructor_id', institution.id)
    .eq('status', 'published')
    .order('enrolled_count', { ascending: false })
    .limit(6)

  const totalStudents = (programs || []).reduce(
    (s: number, p: any) => s + (p.enrolled_count || 0), 0
  )

  return (
    <div className="min-h-screen bg-bg">
      <Navbar />

      {/* Hero banner */}
      <div className="bg-[#0f1a2e] pt-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            {institution.institution_logo_url ? (
              <img
                src={institution.institution_logo_url}
                alt={institution.institution_name || ''}
                className="w-24 h-24 rounded-2xl object-cover border-2 border-white/20 flex-shrink-0"
              />
            ) : (
              <div className="w-24 h-24 bg-white/10 rounded-2xl flex items-center justify-center flex-shrink-0">
                <Building2 size={36} className="text-white/50" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs bg-white/10 text-white/60 px-2.5 py-1 rounded-full">
                  {institution.institution_type || 'Institution partenaire'}
                </span>
                {institution.institution_verified && (
                  <span className="text-xs bg-green/20 text-green border border-green/30 px-2.5 py-1 rounded-full flex items-center gap-1">
                    <CheckCircle size={10} /> Vérifiée
                  </span>
                )}
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">
                {institution.institution_name || institution.full_name}
              </h1>
              <div className="flex flex-wrap gap-4 text-sm text-white/50">
                {institution.institution_address && (
                  <span className="flex items-center gap-1.5">
                    <MapPin size={13} /> {institution.institution_address}
                  </span>
                )}
                {institution.website && (
                  <a href={institution.website} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 hover:text-white/80 transition-colors">
                    <Globe size={13} /> Site web <ExternalLink size={10} />
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mt-10 border-t border-white/10 pt-8">
            {[
              { value: (programs || []).length, label: 'Programmes', icon: Layers },
              { value: (courses || []).length, label: 'Cours', icon: BookOpen },
              { value: totalStudents, label: 'Étudiants', icon: Users },
            ].map(({ value, label, icon: Icon }) => (
              <div key={label} className="text-center">
                <div className="text-2xl font-bold text-white">{value}</div>
                <div className="text-xs text-white/50 mt-1 flex items-center justify-center gap-1">
                  <Icon size={11} /> {label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 space-y-14">

        {/* Description */}
        {(institution.institution_description || institution.bio) && (
          <section>
            <h2 className="text-xl font-bold text-text mb-4">À propos</h2>
            <p className="text-text2 leading-relaxed max-w-3xl">
              {institution.institution_description || institution.bio}
            </p>
          </section>
        )}

        {/* Programmes */}
        {(programs || []).length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-text">Programmes</h2>
                <p className="text-sm text-text3 mt-0.5">
                  Parcours complets avec certificat
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {(programs || []).map((p: any) => (
                <Link key={p.id} href={`/programas/${p.slug}`}
                  className="bg-card border border-border rounded-2xl overflow-hidden hover:shadow-md hover:border-border2 transition-all group">
                  {p.thumbnail_url ? (
                    <img src={p.thumbnail_url} alt=""
                      className="w-full h-36 object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-36 bg-purple/10 flex items-center justify-center">
                      <Layers size={32} className="text-purple/40" />
                    </div>
                  )}
                  <div className="p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] bg-purple/10 text-purple px-2 py-0.5 rounded-full font-medium">
                        {p.category?.name}
                      </span>
                      <span className="text-[10px] text-text3">
                        {LEVEL_LABELS[p.level] || p.level}
                      </span>
                    </div>
                    <h3 className="font-semibold text-text mb-1 line-clamp-2 group-hover:text-blue transition-colors">
                      {p.title}
                    </h3>
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-3 text-xs text-text3">
                        <span className="flex items-center gap-1">
                          <BookOpen size={11} /> {p.total_courses} cours
                        </span>
                        <span className="flex items-center gap-1">
                          <Users size={11} /> {p.enrolled_count}
                        </span>
                      </div>
                      <span className={p.pricing_model === 'free'
                        ? 'text-xs font-semibold text-green'
                        : 'text-xs font-semibold text-text'}>
                        {p.pricing_model === 'free' ? 'Gratuit' : `$${p.price}`}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Cours individuels */}
        {(courses || []).length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-text">Cours individuels</h2>
                <p className="text-sm text-text3 mt-0.5">
                  Disponibles à l&apos;unité
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {(courses || []).map((course: any) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
          </section>
        )}

        {/* Empty state */}
        {(programs || []).length === 0 && (courses || []).length === 0 && (
          <div className="text-center py-20">
            <BookOpen size={36} className="text-text3 mx-auto mb-3" />
            <p className="text-text2 font-medium">Aucun contenu publié pour le moment</p>
            <p className="text-sm text-text3 mt-1">Revenez bientôt !</p>
          </div>
        )}
      </div>
    </div>
  )
}