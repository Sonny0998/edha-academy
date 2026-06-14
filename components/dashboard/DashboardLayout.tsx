'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { createBrowserClient } from '@/lib/supabase/browser'
import { Avatar, Spinner } from '@/components/ui'
import { LogOut, Menu, X, Bell, ChevronRight, MessageSquare } from 'lucide-react'
import clsx from 'clsx'

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
  badge?: number
}

interface DashboardLayoutProps {
  children: React.ReactNode
  navItems: NavItem[]
  title: string
  role: 'student' | 'instructor' | 'institution' | 'admin'
}

export default function DashboardLayout({ children, navItems, title, role }: DashboardLayoutProps) {
  const { user, profile, isLoading, signOut } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notifications, setNotifications] = useState<number>(0)
  const [showNotifs, setShowNotifs] = useState(false)

  // FIX: was using require() inside component body — replaced with proper ESM import
  const supabase = createBrowserClient()

  useEffect(() => {
    if (!profile) return
    const loadNotifCount = async () => {
      if (role === 'instructor') {
        const courseRes = await supabase.from('courses').select('id').eq('instructor_id', profile.id)
        const courseIds = (courseRes.data || []).map((c: any) => c.id)
        if (courseIds.length > 0) {
          const { count } = await supabase.from('lesson_qa')
            .select('id', { count: 'exact', head: true })
            .in('course_id', courseIds).is('answer', null)
          setNotifications(count || 0)
        }
      }
    }
    loadNotifCount()
  }, [profile, role])

  useEffect(() => {
    // Still loading auth — wait
    if (isLoading) return

    // No user at all — redirect to login
    if (!user) {
      router.replace('/auth/login')
      return
    }

    // User exists but profile not yet loaded — wait (fetchProfile is async)
    if (!profile) return

    // Profile loaded — check role match
    const profileRole = profile.role
    if (role === 'admin' && profileRole !== 'admin') {
      router.replace('/dashboard/student')
      return
    }
    if (role === 'instructor' && profileRole !== 'instructor' && profileRole !== 'admin') {
      router.replace('/dashboard/student')
      return
    }
    if (role === 'institution' && profileRole !== 'institution' && profileRole !== 'admin') {
      router.replace('/dashboard/student')
      return
    }
  }, [isLoading, user, profile, role, router])

  // Show spinner while: auth loading, OR user exists but profile not yet loaded
  if (isLoading || (user && !profile)) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  // Not logged in — show nothing (redirect happening)
  if (!user || !profile) return null

  const roleConfig: Record<string, { label: string; cls: string }> = {
    student:     { label: 'Étudiant',    cls: 'text-green bg-green/10 border-green/20' },
    instructor:  { label: 'Instructeur', cls: 'text-blue bg-blue/10 border-blue/20' },
    institution: { label: 'Institution', cls: 'text-purple bg-purple/10 border-purple/20' },
    admin:       { label: 'Admin',       cls: 'text-red bg-red/10 border-red/20' },
  }
  const rc = roleConfig[role] || roleConfig['student']

  return (
    <div className="min-h-screen bg-bg flex">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/30 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── SIDEBAR ── */}
      <aside className={clsx(
        'fixed left-0 top-0 h-full w-64 bg-card border-r border-border z-50 flex flex-col shadow-lg transition-transform duration-300',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}>
        <div className="h-1 bg-gradient-to-r from-blue via-cyan to-gold" />

        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <img src="/logo.png" alt="EDHA" className="h-8 w-auto" />
            <div>
              <span className="font-bold text-sm text-text block leading-tight">EDHA Academy</span>
              <span className="text-[9px] text-text3 block leading-tight tracking-wide">Éducation d&apos;Haïti</span>
            </div>
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-text3 hover:text-text p-1">
            <X size={16} />
          </button>
        </div>

        <div className="px-4 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <Avatar src={profile.avatar_url} name={profile.full_name} size="md" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-text truncate">{profile.full_name}</p>
              <span className={clsx('text-[10px] font-medium px-2 py-0.5 rounded-full border inline-block mt-0.5', rc.cls)}>
                {rc.label}
              </span>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {navItems.map(item => {
            const isActive = pathname === item.href ||
              (item.href !== `/dashboard/${role}` && pathname?.startsWith(item.href))
            return (
              <Link key={item.href} href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                  isActive
                    ? 'edha-gradient text-white shadow-sm shadow-blue/20'
                    : 'text-text2 hover:text-text hover:bg-bg2'
                )}>
                <span className="flex-shrink-0">{item.icon}</span>
                <span className="flex-1">{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="bg-red text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        <div className="p-3 border-t border-border">
          <button onClick={signOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-text2 hover:text-red hover:bg-red/10 transition-colors">
            <LogOut size={16} /> Se déconnecter
          </button>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        <header className="sticky top-0 z-30 bg-card/95 backdrop-blur border-b border-border px-4 sm:px-6 h-16 flex items-center gap-4 shadow-sm">
          <button onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-text2 hover:text-text p-1.5 rounded-lg hover:bg-bg2">
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-1.5 text-sm text-text3">
            <Link href="/" className="hover:text-text transition-colors">Accueil</Link>
            <ChevronRight size={12} />
            <span className="text-text font-medium">{title}</span>
          </div>
          <div className="flex-1" />
          <div className="relative">
            <button onClick={() => setShowNotifs(!showNotifs)}
              className="relative text-text2 hover:text-text p-2 rounded-lg hover:bg-bg2 transition-colors">
              <Bell size={18} />
              {notifications > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {notifications > 9 ? '9+' : notifications}
                </span>
              )}
            </button>
            {showNotifs && notifications > 0 && role === 'instructor' && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-card border border-border rounded-xl shadow-xl z-30">
                <div className="p-3 border-b border-border">
                  <p className="text-xs font-semibold text-text">{notifications} question{notifications > 1 ? 's' : ''} sans réponse</p>
                </div>
                <div className="p-2">
                  <a href="/dashboard/instructor/messages"
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-blue hover:bg-blue/10 transition-colors font-medium">
                    <MessageSquare size={14}/> Répondre aux questions
                  </a>
                </div>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}