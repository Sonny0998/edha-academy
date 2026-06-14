'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { createBrowserClient } from '@/lib/supabase/browser'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { Card, Spinner, EmptyState } from '@/components/ui'
import {
  LayoutDashboard, BookOpen, UserCheck, Users, BarChart2,
  Globe, Settings, GraduationCap, Plus, X, Search,
  User, ArrowLeft, CheckCircle
} from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import Link from 'next/link'

const navItems = [
  { label: 'Vue d\'ensemble', href: '/dashboard/institution',          icon: <LayoutDashboard size={16} /> },
  { label: 'Mode académique', href: '/dashboard/institution/academic', icon: <GraduationCap size={16} /> },
  { label: 'Cours',           href: '/dashboard/institution/courses',  icon: <BookOpen size={16} /> },
  { label: 'Équipe',          href: '/dashboard/institution/teachers', icon: <UserCheck size={16} /> },
  { label: 'Étudiants',       href: '/dashboard/institution/students', icon: <Users size={16} /> },
  { label: 'Analytiques',     href: '/dashboard/institution/analytics',icon: <BarChart2 size={16} /> },
  { label: 'Page publique',   href: '/dashboard/institution/profile',  icon: <Globe size={16} /> },
  { label: 'Paramètres',      href: '/dashboard/institution/settings', icon: <Settings size={16} /> },
]

export default function EnrollPage() {
  const { profile } = useAuth()
  const supabase = createBrowserClient()

  const [loading, setLoading]           = useState(true)
  const [sections, setSections]         = useState<any[]>([])
  const [years, setYears]               = useState<any[]>([])
  const [enrollments, setEnrollments]   = useState<any[]>([])
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [search, setSearch]             = useState('')
  const [selectedSection, setSelectedSection] = useState('')
  const [selectedYear,    setSelectedYear]    = useState('')
  const [studentCode,     setStudentCode]     = useState('')
  const [saving, setSaving]             = useState(false)

  const load = async () => {
    if (!profile) return
    const [secRes, yearRes] = await Promise.all([
      supabase.from('class_sections').select('*, level:class_levels(name)').eq('institution_id', profile.id),
      supabase.from('academic_years').select('*').eq('institution_id', profile.id).order('created_at', { ascending: false }),
    ])
    setSections(secRes.data || [])
    setYears(yearRes.data || [])
    const currentYear = (yearRes.data || []).find((y: any) => y.is_current)
    if (currentYear) setSelectedYear(currentYear.id)
    setLoading(false)
  }

  const loadEnrollments = async () => {
    if (!profile || !selectedSection || !selectedYear) return
    const { data } = await supabase
      .from('institutional_enrollments')
      .select('*, student:profiles!student_id(full_name, email, avatar_url)')
      .eq('institution_id', profile.id)
      .eq('class_section_id', selectedSection)
      .eq('academic_year_id', selectedYear)
      .order('created_at')
    setEnrollments(data || [])
  }

  useEffect(() => { load() }, [profile])
  useEffect(() => { loadEnrollments() }, [selectedSection, selectedYear])

  const handleSearch = async () => {
    if (!search.trim()) return
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email, avatar_url')
      .eq('role', 'student')
      .ilike('full_name', `%${search}%`)
      .limit(10)
    setSearchResults(data || [])
  }

  const handleEnroll = async (studentId: string, studentName: string) => {
    if (!profile || !selectedSection || !selectedYear) {
      toast.error('Sélectionnez une section et une année')
      return
    }
    setSaving(true)
    const { error } = await supabase.from('institutional_enrollments').upsert({
      institution_id:   profile.id,
      student_id:       studentId,
      academic_year_id: selectedYear,
      class_section_id: selectedSection,
      status:           'active',
      student_code:     studentCode || null,
    }, { onConflict: 'institution_id,student_id,academic_year_id' })

    if (error) toast.error(error.message)
    else {
      toast.success(`${studentName} inscrit(e) dans la section !`)
      setSearch('')
      setStudentCode('')
      setSearchResults([])
      loadEnrollments()
    }
    setSaving(false)
  }

  const handleUnenroll = async (id: string, name: string) => {
    if (!confirm(`Retirer ${name} de cette section ?`)) return
    await supabase.from('institutional_enrollments').delete().eq('id', id)
    toast.success(`${name} retiré(e)`)
    loadEnrollments()
  }

  const selectedSectionData = sections.find(s => s.id === selectedSection)

  if (loading) return (
    <DashboardLayout navItems={navItems} title="Inscription élèves" role="institution">
      <div className="flex justify-center py-16"><Spinner size="lg" /></div>
    </DashboardLayout>
  )

  return (
    <DashboardLayout navItems={navItems} title="Inscrire les élèves" role="institution">
      <div className="max-w-3xl">
        <Link href="/dashboard/institution/academic/assign"
          className="inline-flex items-center gap-1.5 text-xs text-text3 hover:text-text mb-6 transition-colors">
          <ArrowLeft size={12} /> Assignation
        </Link>

        <h1 className="text-xl font-bold text-text mb-6">Inscrire les élèves</h1>

        {/* Selector */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-text2">Année académique</label>
            <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)}
              className="w-full bg-bg2 border border-border rounded-xl px-4 py-2.5 text-sm text-text outline-none focus:border-blue/50">
              <option value="">Choisir...</option>
              {years.map(y => <option key={y.id} value={y.id}>{y.name}{y.is_current ? ' ✓' : ''}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-text2">Section</label>
            <select value={selectedSection} onChange={e => setSelectedSection(e.target.value)}
              className="w-full bg-bg2 border border-border rounded-xl px-4 py-2.5 text-sm text-text outline-none focus:border-blue/50">
              <option value="">Choisir une section...</option>
              {sections.map(s => <option key={s.id} value={s.id}>{s.level?.name} — Section {s.name}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Search & add */}
          <div>
            <h2 className="text-sm font-semibold text-text mb-3">Rechercher et inscrire</h2>
            <div className="flex gap-2 mb-2">
              <div className="relative flex-1">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text3" />
                <input type="text" value={search}
                  onChange={e => setSearch(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  placeholder="Nom de l'élève..."
                  className="w-full bg-bg2 border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm text-text outline-none focus:border-blue/50" />
              </div>
              <button onClick={handleSearch}
                className="px-4 py-2.5 bg-bg2 border border-border rounded-xl text-sm text-text hover:bg-card transition-colors">
                Chercher
              </button>
            </div>

            <input type="text" value={studentCode} onChange={e => setStudentCode(e.target.value)}
              placeholder="Numéro matricule (optionnel)"
              className="w-full bg-bg2 border border-border rounded-xl px-4 py-2 text-sm text-text outline-none focus:border-blue/50 mb-3" />

            <div className="space-y-2 max-h-72 overflow-y-auto">
              {searchResults.map(s => {
                const alreadyIn = enrollments.some(e => e.student_id === s.id)
                return (
                  <div key={s.id} className={clsx(
                    'flex items-center gap-3 p-3 rounded-xl border transition-all',
                    alreadyIn ? 'border-green/20 bg-green/5' : 'border-border bg-card hover:border-blue/30'
                  )}>
                    <div className="w-8 h-8 rounded-full bg-bg2 flex items-center justify-center flex-shrink-0">
                      {s.avatar_url
                        ? <img src={s.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                        : <User size={14} className="text-text3" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text truncate">{s.full_name}</p>
                      <p className="text-xs text-text3 truncate">{s.email}</p>
                    </div>
                    {alreadyIn ? (
                      <CheckCircle size={16} className="text-green flex-shrink-0" />
                    ) : (
                      <button onClick={() => handleEnroll(s.id, s.full_name)}
                        disabled={saving || !selectedSection || !selectedYear}
                        className="flex items-center gap-1 text-xs text-blue border border-blue/20 bg-blue/5 hover:bg-blue/10 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40">
                        <Plus size={11} /> Inscrire
                      </button>
                    )}
                  </div>
                )
              })}
              {searchResults.length === 0 && search && (
                <p className="text-xs text-text3 text-center py-3">Aucun résultat pour "{search}"</p>
              )}
            </div>
          </div>

          {/* Enrolled list */}
          <div>
            <h2 className="text-sm font-semibold text-text mb-3">
              Élèves inscrits
              {selectedSectionData && (
                <span className="font-normal text-text3 ml-1">
                  — {selectedSectionData.level?.name} {selectedSectionData.name}
                </span>
              )}
              <span className="ml-2 text-xs bg-bg2 text-text3 px-2 py-0.5 rounded-full">{enrollments.length}</span>
            </h2>

            {!selectedSection ? (
              <p className="text-xs text-text3 italic">Sélectionnez une section</p>
            ) : enrollments.length === 0 ? (
              <p className="text-xs text-text3 italic">Aucun élève inscrit dans cette section</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {enrollments.map((e: any, idx: number) => (
                  <div key={e.id} className="flex items-center gap-3 p-3 bg-card border border-border rounded-xl">
                    <span className="text-xs text-text3 w-5 flex-shrink-0">{idx + 1}</span>
                    <div className="w-7 h-7 rounded-full bg-bg2 flex items-center justify-center flex-shrink-0">
                      {e.student?.avatar_url
                        ? <img src={e.student.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                        : <User size={12} className="text-text3" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text truncate">{e.student?.full_name}</p>
                      {e.student_code && <p className="text-[10px] text-text3">{e.student_code}</p>}
                    </div>
                    <button onClick={() => handleUnenroll(e.id, e.student?.full_name)}
                      className="w-6 h-6 hover:bg-red/10 rounded flex items-center justify-center text-text3 hover:text-red transition-all flex-shrink-0">
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {enrollments.length > 0 && (
          <div className="flex justify-end mt-8">
            <Link href="/dashboard/institution/academic/grades"
              className="flex items-center gap-2 text-sm text-white font-medium px-5 py-2.5 rounded-xl edha-gradient hover:opacity-90 transition-opacity">
              Configuration terminée — Saisir les notes →
            </Link>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}