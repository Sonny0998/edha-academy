'use client'

import { AuthContext, useAuthState } from '@/hooks/useAuth'
import { useEffect, useRef } from 'react'

const INACTIVITY_TIMEOUT = 30 * 60 * 1000 // 30 minutes

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuthState()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!auth.isAuthenticated) return

    const resetTimer = () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(async () => {
        // Auto-logout after inactivity
        await auth.signOut()
      }, INACTIVITY_TIMEOUT)
    }

    // Track user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
    events.forEach(e => window.addEventListener(e, resetTimer, { passive: true }))
    resetTimer() // Start timer

    return () => {
      events.forEach(e => window.removeEventListener(e, resetTimer))
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [auth.isAuthenticated])

  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>
}
