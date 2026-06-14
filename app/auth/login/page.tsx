'use client'
import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase/browser'
import { useLang } from '@/lib/LangContext'
import { Button, Input } from '@/components/ui'
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || null
  const supabase = createBrowserClient()
  const { t, lang } = useLang()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      toast.error(lang === 'ht' ? 'Imèl oswa modpas pa kòrèk' : lang === 'en' ? 'Incorrect email or password' : lang === 'es' ? 'Email o contraseña incorrectos' : 'Email ou mot de passe incorrect')
      setLoading(false)
      return
    }
    if (data.user) {
      const { data: profile } = await supabase.from('profiles').select('role,instructor_approved_at').eq('id', data.user.id).single()
      const role = profile?.role || 'student'
      if ((role === 'instructor' || role === 'institution') && !profile?.instructor_approved_at) {
        toast.error(lang === 'en' ? 'Your account is pending approval' : 'Votre compte est en attente d\'approbation')
        await supabase.auth.signOut()
        router.push('/pending')
        setLoading(false)
        return
      }
      let dest = redirect || '/dashboard/student'
      if (!redirect) {
        if (role === 'admin') dest = '/dashboard/admin'
        else if (role === 'institution') dest = '/dashboard/institution'
        else if (role === 'instructor') dest = '/dashboard/instructor'
      }
      toast.success(lang === 'ht' ? 'Koneksyon reyisi !' : lang === 'en' ? 'Login successful!' : lang === 'es' ? '¡Inicio de sesión exitoso!' : 'Connexion réussie !')
      router.push(dest)
      router.refresh()
    }
    setLoading(false)
  }

  const handleGoogle = async () => {
    setGoogleLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` }
    })
    if (error) { toast.error(error.message); setGoogleLoading(false) }
  }

  return (
    <div className="space-y-5">
      <button onClick={handleGoogle} disabled={googleLoading}
        className="w-full flex items-center justify-center gap-3 bg-white border border-border hover:bg-bg2 text-text font-medium py-3 rounded-xl transition-colors shadow-sm disabled:opacity-50">
        {googleLoading
          ? <div className="w-4 h-4 border-2 border-border border-t-blue rounded-full animate-spin"/>
          : <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
        }
        {t('auth.google')}
      </button>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-border"/>
        <span className="text-xs text-text3">{lang === 'ht' ? 'oswa ak imèl' : lang === 'en' ? 'or with email' : lang === 'es' ? 'o con correo' : 'ou avec email'}</span>
        <div className="flex-1 h-px bg-border"/>
      </div>

      <form onSubmit={handleLogin} className="space-y-4">
        <Input label={t('auth.email_label')} type="email" placeholder="vous@exemple.com" value={email} onChange={e => setEmail(e.target.value)} icon={<Mail size={15}/>} required />
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-text2">{t('auth.pwd_label')}</label>
          <div className="relative">
            <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text3" />
            <input type={showPwd ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required
              className="w-full bg-bg2 border border-border rounded-xl pl-10 pr-10 py-2.5 text-sm text-text outline-none focus:border-blue/50 transition-colors" />
            <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text3">
              {showPwd ? <EyeOff size={15}/> : <Eye size={15}/>}
            </button>
          </div>
        </div>
        <Button type="submit" loading={loading} className="w-full" size="lg">{t('auth.connect')}</Button>
      </form>

      <div className="text-center space-y-2">
        <p className="text-sm text-text3">{t('auth.no_account')}{' '}<Link href="/auth/inscription" className="text-blue hover:underline font-medium">{t('auth.register_link')}</Link></p>
        <p className="text-sm text-text3">{lang === 'en' ? 'Want to teach?' : lang === 'ht' ? 'Ou vle anseye?' : lang === 'es' ? '¿Quieres enseñar?' : 'Vous voulez enseigner ?'}{' '}
          <Link href="/auth/devenir-instructeur" className="text-blue hover:underline font-medium">{t('auth.teach_link')}</Link>
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  const { t } = useLang()
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3 mb-5">
            <img src="/logo.png" alt="EDHA" className="h-10 w-auto"/>
            <span className="font-bold text-xl text-text">EDHA <span className="text-cyan">Academy</span></span>
          </Link>
          <h1 className="text-2xl font-bold text-text">{t('auth.login_title')}</h1>
          <p className="text-text2 text-sm mt-1">{t('auth.login_sub')}</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-8 shadow-sm">
          <Suspense fallback={<div className="text-center py-4 text-text3">Chargement...</div>}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  )
}