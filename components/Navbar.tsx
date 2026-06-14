'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useLang } from '@/lib/LangContext'
import { Avatar } from '@/components/ui'
import {
  Search, BookOpen, ChevronDown, Menu, X, GraduationCap,
  LayoutDashboard, LogOut, User, Building2, Shield, Plus, Globe
} from 'lucide-react'
import clsx from 'clsx'
import Image from 'next/image'
import type { Lang } from '@/lib/i18n'

const LANGS: { code: Lang; label: string; flag: string }[] = [
  { code: 'fr', label: 'Français', flag: 'FR' },
  { code: 'ht', label: 'Kreyòl',  flag: 'HT' },
  { code: 'en', label: 'English',  flag: 'EN' },
  { code: 'es', label: 'Español',  flag: 'ES' },
]

export default function Navbar() {
  const { profile, isAuthenticated, signOut } = useAuth()
  const { lang, setLang, t } = useLang()
  const pathname = usePathname()
  const [scrolled, setScrolled]       = useState(false)
  const [mobileOpen, setMobileOpen]   = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [langOpen, setLangOpen]       = useState(false)
  const [search, setSearch]           = useState('')
  const langRef    = useRef<HTMLDivElement>(null)
  const profileRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', h)
    return () => window.removeEventListener('scroll', h)
  }, [])

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false)
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const getDashLink = () => {
    if (profile?.role === 'admin') return '/dashboard/admin'
    if (profile?.role === 'instructor') return '/dashboard/instructor'
    return '/dashboard/student'
  }

  const currentLang = LANGS.find(l => l.code === lang) || LANGS[0]

  return (
    <header className={clsx(
      'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
      scrolled
        ? 'bg-card/95 backdrop-blur-xl border-b border-border shadow-sm'
        : 'bg-card border-b border-border'
    )}>
      <div className="h-0.5 bg-gradient-to-r from-blue via-cyan to-gold" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center gap-4 h-16">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 flex-shrink-0">
            <Image src="/logo.png" alt="EDHA" width={120} height={36} className="h-9 w-auto" priority />
            <div className="hidden sm:block">
              <span className="font-bold text-sm text-text leading-tight block">EDHA Academy</span>
              <span className="text-[10px] text-text3 leading-tight block tracking-wide">Éducation d&apos;Haïti</span>
            </div>
          </Link>

          {/* Search */}
          <div className="flex-1 max-w-md hidden sm:block">
            <form onSubmit={e => { e.preventDefault(); window.location.href = `/cursos?q=${search}` }}>
              <div className="relative">
                <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text3" />
                <input
                  type="text" value={search} onChange={e => setSearch(e.target.value)}
                  placeholder={t('nav.search')}
                  className="w-full bg-bg2 border border-border rounded-xl pl-9 pr-4 py-2 text-sm text-text outline-none focus:border-blue/50 transition-colors"
                />
              </div>
            </form>
          </div>

          {/* Nav links */}
          <nav className="hidden lg:flex items-center gap-1">
            <Link href="/cursos"
              className={clsx('text-sm px-3 py-2 rounded-lg transition-colors font-medium',
                pathname?.startsWith('/cursos')
                  ? 'text-blue bg-blue/10'
                  : 'text-text2 hover:text-text hover:bg-bg2')}>
              {t('nav.explore')}
            </Link>
            {!isAuthenticated && (
              <Link href="/auth/devenir-instructeur"
                className="text-sm px-3 py-2 rounded-lg text-text2 hover:text-text hover:bg-bg2 transition-colors font-medium">
                {t('nav.teach')}
              </Link>
            )}
          </nav>

          <div className="flex items-center gap-1.5 flex-shrink-0 ml-auto">

            {/* Language switcher */}
            <div className="relative" ref={langRef}>
              <button
                onClick={() => setLangOpen(!langOpen)}
                className="flex items-center gap-1.5 text-sm px-2.5 py-2 rounded-lg text-text2 hover:text-text hover:bg-bg2 transition-colors"
              >
                <Globe size={15} />
                <span className="hidden sm:flex items-center gap-1.5">
                  <span className="text-[10px] font-bold bg-blue/10 text-blue px-1.5 py-0.5 rounded">{currentLang.flag}</span>
                  {currentLang.label}
                </span>
                <ChevronDown size={12} className={clsx('transition-transform', langOpen && 'rotate-180')} />
              </button>
              {langOpen && (
                <div className="absolute right-0 top-full mt-1 w-40 bg-card border border-border rounded-xl shadow-lg z-20">
                  <div className="p-1">
                    {LANGS.map(l => (
                      <button key={l.code} onClick={() => { setLang(l.code); setLangOpen(false) }}
                        className={clsx('w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors',
                          lang === l.code
                            ? 'bg-blue/10 text-blue font-medium'
                            : 'text-text2 hover:bg-bg2 hover:text-text')}>
                        <span className="text-[10px] font-bold bg-blue/10 text-blue px-1.5 py-0.5 rounded w-7 text-center">{l.flag}</span>
                        <span>{l.label}</span>
                        {lang === l.code && <span className="ml-auto text-xs">✓</span>}
                      </button>
                    ))}
                  </div>
                  <div className="px-3 pb-2 pt-1 border-t border-border">
                    <p className="text-[10px] text-text3 text-center">
                      {lang === 'fr' ? 'Langue de la plateforme' :
                       lang === 'ht' ? 'Lang platfòm nan' :
                       lang === 'en' ? 'Platform language' : 'Idioma de la plataforma'}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {!isAuthenticated ? (
              <>
                <Link href="/auth/login"
                  className="hidden sm:block text-sm px-4 py-2 rounded-xl text-text2 hover:text-text hover:bg-bg2 transition-colors font-medium">
                  {t('nav.login')}
                </Link>
                <Link href="/auth/inscription"
                  className="text-sm px-4 py-2 rounded-xl text-white font-medium edha-gradient hover:opacity-90 transition-opacity">
                  {t('nav.register')}
                </Link>
              </>
            ) : (
              <div className="flex items-center gap-1.5">
                {profile?.role === 'instructor' && (
                  <Link href="/dashboard/instructor/courses/new"
                    className="hidden lg:flex items-center gap-1.5 text-xs bg-blue/10 hover:bg-blue text-blue hover:text-white px-3 py-1.5 rounded-lg transition-all border border-blue/20 font-medium">
                    <Plus size={12} /> {lang === 'ht' ? 'Nouvo kou' : lang === 'en' ? 'New course' : lang === 'es' ? 'Nuevo curso' : 'Nouveau cours'}
                  </Link>
                )}

                {/* Profile dropdown */}
                <div className="relative" ref={profileRef}>
                  <button onClick={() => setProfileOpen(!profileOpen)}
                    className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-bg2 transition-colors">
                    <Avatar src={profile?.avatar_url} name={profile?.full_name || 'U'} size="sm" />
                    <ChevronDown size={13} className={clsx('text-text3 hidden sm:block transition-transform', profileOpen && 'rotate-180')} />
                  </button>

                  {profileOpen && (
                    <div className="absolute right-0 top-full mt-2 w-64 bg-card border border-border rounded-xl shadow-xl z-20">
                      <div className="h-0.5 rounded-t-xl bg-gradient-to-r from-blue via-cyan to-gold" />
                      <div className="p-3 border-b border-border">
                        <div className="flex items-center gap-2.5">
                          <Avatar src={profile?.avatar_url} name={profile?.full_name} size="md" />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-text truncate">{profile?.full_name}</p>
                            <p className="text-xs text-text3 truncate">{profile?.email}</p>
                          </div>
                        </div>
                        <div className="mt-2">
                          {profile?.role === 'admin' && <span className="inline-flex items-center gap-1 text-[10px] bg-purple/10 text-purple border border-purple/20 px-2 py-0.5 rounded-full"><Shield size={9} /> Admin EDHA</span>}
                          {profile?.role === 'instructor' && <span className="inline-flex items-center gap-1 text-[10px] bg-blue/10 text-cyan border border-blue/20 px-2 py-0.5 rounded-full"><Building2 size={9} /> Instructeur</span>}
                          {profile?.role === 'student' && <span className="inline-flex items-center gap-1 text-[10px] bg-green/10 text-green border border-green/20 px-2 py-0.5 rounded-full"><User size={9} /> {lang === 'ht' ? 'Elèv' : lang === 'en' ? 'Student' : lang === 'es' ? 'Estudiante' : 'Étudiant'}</span>}
                        </div>
                      </div>
                      <div className="p-2">
                        <Link href={getDashLink()} onClick={() => setProfileOpen(false)} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-text2 hover:bg-bg2 hover:text-text transition-colors">
                          <LayoutDashboard size={14} /> {t('nav.dashboard')}
                        </Link>
                        {profile?.role === 'student' && (<>
                          <Link href="/dashboard/student/courses" onClick={() => setProfileOpen(false)} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-text2 hover:bg-bg2 hover:text-text transition-colors">
                            <BookOpen size={14} /> {t('dashboard.my_courses')}
                          </Link>
                          <Link href="/dashboard/student/certificates" onClick={() => setProfileOpen(false)} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-text2 hover:bg-bg2 hover:text-text transition-colors">
                            <GraduationCap size={14} /> {t('dashboard.certs')}
                          </Link>
                          <Link href="/dashboard/student/profile" onClick={() => setProfileOpen(false)} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-text2 hover:bg-bg2 hover:text-text transition-colors">
                            <User size={14} /> {t('dashboard.profile')}
                          </Link>
                        </>)}
                        {profile?.role === 'instructor' && (<>
                          <Link href="/dashboard/instructor/courses/new" onClick={() => setProfileOpen(false)} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-text2 hover:bg-bg2 hover:text-text transition-colors">
                            <Plus size={14} /> {lang === 'en' ? 'New course' : lang === 'es' ? 'Nuevo curso' : lang === 'ht' ? 'Nouvo kou' : 'Nouveau cours'}
                          </Link>
                        </>)}
                        <div className="border-t border-border mt-1 pt-1">
                          <button onClick={() => { setProfileOpen(false); signOut() }} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red hover:bg-red/10 transition-colors">
                            <LogOut size={14} /> {t('nav.logout')}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <button className="lg:hidden p-2 text-text2 hover:text-text" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="lg:hidden bg-card border-t border-border shadow-lg">
          <div className="px-4 py-4 space-y-2">
            <form onSubmit={e => { e.preventDefault(); window.location.href = `/cursos?q=${search}`; setMobileOpen(false) }} className="relative mb-3">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text3" />
              <input type="text" placeholder={t('nav.search')} value={search} onChange={e => setSearch(e.target.value)}
                className="w-full bg-bg2 border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm text-text outline-none" />
            </form>
            <Link href="/cursos" className="block text-text2 py-2 text-sm hover:text-text font-medium" onClick={() => setMobileOpen(false)}>🔍 {t('nav.explore')}</Link>
            {!isAuthenticated && <Link href="/auth/devenir-instructeur" className="block text-text2 py-2 text-sm hover:text-text" onClick={() => setMobileOpen(false)}>🎓 {t('nav.teach')}</Link>}
            {isAuthenticated && (
              <button onClick={() => { setMobileOpen(false); signOut() }} className="block text-red py-2 text-sm w-full text-left">{t('nav.logout')}</button>
            )}
            {!isAuthenticated && (
              <div className="flex gap-2 pt-2">
                <Link href="/auth/login" className="flex-1 text-center bg-bg2 border border-border text-text py-2.5 rounded-xl text-sm font-medium" onClick={() => setMobileOpen(false)}>{t('nav.login')}</Link>
                <Link href="/auth/inscription" className="flex-1 text-center text-white py-2.5 rounded-xl text-sm font-medium edha-gradient" onClick={() => setMobileOpen(false)}>{t('nav.register')}</Link>
              </div>
            )}
            {/* Language mobile */}
            <div className="pt-2 border-t border-border">
              <p className="text-xs text-text3 mb-2">
                {lang === 'fr' ? 'Langue' : lang === 'ht' ? 'Lang' : lang === 'en' ? 'Language' : 'Idioma'}
              </p>
              <div className="flex gap-2 flex-wrap">
                {LANGS.map(l => (
                  <button key={l.code} onClick={() => setLang(l.code)}
                    className={clsx('text-xs px-3 py-1.5 rounded-lg border transition-colors',
                      lang === l.code ? 'border-blue bg-blue/10 text-blue font-medium' : 'border-border text-text2')}>
                    <span className="text-[10px] font-bold bg-blue/10 text-blue px-1.5 py-0.5 rounded">{l.flag}</span> {l.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
