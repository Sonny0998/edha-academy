'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase/browser'
import Navbar from '@/components/Navbar'
import CourseCard from '@/components/course/CourseCard'
import { Button, Badge, Spinner } from "@/components/ui"
import { Search, SlidersHorizontal, X, ChevronDown } from 'lucide-react'
import type { Course } from '@/types'
import clsx from 'clsx'

const LEVELS = [
  { value: 'debutant', label: 'Débutant' },
  { value: 'intermediaire', label: 'Intermédiaire' },
  { value: 'avance', label: 'Avancé' },
]
const PRICING = [
  { value: 'free', label: 'Gratuit' },
  { value: 'paid', label: 'Payant' },
  { value: 'certificate_only', label: 'Certificat payant' },
]
const SORT_OPTIONS = [
  { value: 'rating', label: 'Mieux notés' },
  { value: 'enrolled', label: 'Plus populaires' },
  { value: 'newest', label: 'Plus récents' },
]
const LANGUAGES = [
  { value: 'fr', label: 'Français' },
  { value: 'ht', label: 'Créole haïtien' },
  { value: 'en', label: 'Anglais' },
]

export default function CoursesContent() {
  const searchParams = useSearchParams()
  const supabase = createBrowserClient()

  const [courses, setCourses] = useState<Course[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 12

  const [search, setSearch] = useState(searchParams.get('q') || '')
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('cat') || '')
  const [selectedLevel, setSelectedLevel] = useState(searchParams.get('level') || '')
  const [selectedPricing, setSelectedPricing] = useState(searchParams.get('pricing') || '')
  const [selectedLang, setSelectedLang] = useState(searchParams.get('lang') || '')
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'rating')

  useEffect(() => {
    supabase.from('categories').select('id,name,slug').is('parent_id', null).limit(20)
      .then(({ data }) => setCategories(data || []))
  }, [supabase])

  const loadCourses = useCallback(async () => {
    setLoading(true)
    const offset = (page - 1) * PAGE_SIZE

    let query = supabase
      .from('courses')
      .select(`*, instructor:profiles!instructor_id(full_name,avatar_url,institution_name), category:categories(name,slug)`, { count: 'exact' })
      .eq('status', 'published')
      .range(offset, offset + PAGE_SIZE - 1)

    if (search) query = query.ilike('title', `%${search}%`)
    if (selectedCategory) query = query.eq('category_id', selectedCategory)
    if (selectedLevel) query = query.eq('level', selectedLevel)
    if (selectedPricing) query = query.eq('pricing_model', selectedPricing)
    if (selectedLang) query = query.eq('language', selectedLang)

    switch (sortBy) {
      case 'rating': query = query.order('rating_avg', { ascending: false }); break
      case 'enrolled': query = query.order('enrolled_count', { ascending: false }); break
      case 'newest': query = query.order('published_at', { ascending: false }); break
    }

    const { data, count } = await query
    setCourses((data || []) as unknown as Course[])
    setTotal(count || 0)
    setLoading(false)
  }, [supabase, search, selectedCategory, selectedLevel, selectedPricing, selectedLang, sortBy, page])

  useEffect(() => { loadCourses() }, [loadCourses])

  const activeFiltersCount = [selectedCategory, selectedLevel, selectedPricing, selectedLang].filter(Boolean).length

  const clearFilters = () => {
    setSelectedCategory(''); setSelectedLevel('')
    setSelectedPricing(''); setSelectedLang(''); setPage(1)
  }

  const FilterSection = ({ title, options, value, onChange }: {
    title: string; options: { value: string; label: string }[]; value: string; onChange: (v: string) => void
  }) => (
    <div className="space-y-2">
      <h4 className="text-xs font-bold uppercase tracking-wider text-text3">{title}</h4>
      <div className="space-y-1">
        {options.map(opt => (
          <button key={opt.value} onClick={() => { onChange(value === opt.value ? '' : opt.value); setPage(1) }}
            className={clsx('w-full text-left text-sm px-3 py-2 rounded-lg transition-colors',
              value === opt.value ? 'bg-blue/10 text-blue' : 'text-text2 hover:bg-card2 hover:text-text')}>
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-bg">
      <Navbar />
      <div className="pt-16">
        {/* Search bar */}
        <div className="border-b border-border bg-surf/80 backdrop-blur-xl sticky top-16 z-30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
            <div className="flex gap-3 items-center">
              <div className="relative flex-1 max-w-xl">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text3" />
                <input type="text" value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1) }}
                  onKeyDown={e => e.key === 'Enter' && loadCourses()}
                  placeholder="Rechercher un cours..."
                  className="w-full bg-card2 border border-border2 rounded-xl pl-10 pr-4 py-2.5 text-sm text-text placeholder:text-text3 outline-none focus:border-blue/50" />
              </div>
              <button onClick={() => setShowFilters(!showFilters)}
                className={clsx('flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm border transition-all',
                  showFilters ? 'bg-blue/10 border-blue/40 text-blue' : 'bg-card2 border-border2 text-text2 hover:text-text')}>
                <SlidersHorizontal size={15} />Filtres
                {activeFiltersCount > 0 && (
                  <span className="w-5 h-5 rounded-full bg-blue text-white text-xs flex items-center justify-center font-bold">{activeFiltersCount}</span>
                )}
              </button>
              <div className="relative hidden sm:block">
                <select value={sortBy} onChange={e => { setSortBy(e.target.value); setPage(1) }}
                  className="bg-card2 border border-border2 rounded-xl px-3 py-2.5 text-sm text-text2 outline-none cursor-pointer pr-8 appearance-none">
                  {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text3 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex gap-8">
            {/* Sidebar */}
            {showFilters && (
              <aside className="w-56 flex-shrink-0 space-y-6">
                <FilterSection title="Catégorie" value={selectedCategory}
                  options={categories.map(c => ({ value: c.id, label: c.name }))} onChange={setSelectedCategory} />
                <div className="border-t border-border" />
                <FilterSection title="Niveau" value={selectedLevel} options={LEVELS} onChange={setSelectedLevel} />
                <div className="border-t border-border" />
                <FilterSection title="Prix" value={selectedPricing} options={PRICING} onChange={setSelectedPricing} />
                <div className="border-t border-border" />
                <FilterSection title="Langue" value={selectedLang} options={LANGUAGES} onChange={setSelectedLang} />
              </aside>
            )}

            {/* Grid */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-6">
                <p className="text-text3 text-sm">
                  {loading ? 'Chargement...' : `${total.toLocaleString()} cours trouvés`}
                </p>
                {activeFiltersCount > 0 && (
                  <button onClick={clearFilters} className="text-xs text-red hover:underline">Effacer filtres</button>
                )}
              </div>

              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="bg-card border border-border rounded-card overflow-hidden">
                      <div className="aspect-video bg-card2 animate-pulse rounded-xl" />
                      <div className="p-4 space-y-2">
                        <div className="h-4 bg-card2 animate-pulse rounded w-3/4" />
                        <div className="h-3 bg-card2 animate-pulse rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : courses.length === 0 ? (
                <div className="text-center py-20">
                  <Search size={40} className="text-text3 mx-auto mb-4" />
                  <h3 className="font-semibold text-text mb-2">Aucun cours trouvé</h3>
                  <p className="text-text3 text-sm mb-4">Modifiez vos filtres ou votre recherche</p>
                  <Button variant="secondary" size="sm" onClick={clearFilters}>Effacer les filtres</Button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {courses.map((course, i) => (
                      <div key={course.id} style={{ animationDelay: `${i * 0.04}s` }}>
                        <CourseCard course={course} />
                      </div>
                    ))}
                  </div>
                  {total > PAGE_SIZE && (
                    <div className="flex items-center justify-center gap-2 mt-10">
                      <Button variant="secondary" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>← Précédent</Button>
                      <span className="text-sm text-text3 px-4">Page {page} sur {Math.ceil(total / PAGE_SIZE)}</span>
                      <Button variant="secondary" size="sm" onClick={() => setPage(p => p + 1)} disabled={page * PAGE_SIZE >= total}>Suivant →</Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
