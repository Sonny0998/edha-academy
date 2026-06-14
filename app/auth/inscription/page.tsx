'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase/browser'
import { Button, Input } from '@/components/ui'
import { Mail, Lock, User, Eye, EyeOff, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'

export default function InscriptionPage() {
  const router = useRouter()
  const supabase = createBrowserClient()
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const set = (k: string, v: string) => {
    setForm(f => ({ ...f, [k]: v }))
    if (errors[k]) setErrors(e => ({ ...e, [k]: '' }))
  }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = 'Nom requis'
    if (!form.email.includes('@')) e.email = 'Email invalide'
    if (form.password.length < 6) e.password = 'Minimum 6 caractères'
    if (form.password !== form.confirm) e.confirm = 'Mots de passe différents'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)

    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { full_name: form.name, role: 'student' } }
    })

    if (error) {
      if (error.message.includes('already registered')) {
        toast.error('Cet email est déjà utilisé')
      } else {
        toast.error(error.message)
      }
      setLoading(false)
      return
    }

    setDone(true)
    setLoading(false)
  }

  if (done) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <Link href="/" className="inline-flex items-center gap-3 mb-8">
            <img src="/logo.png" alt="EDHA" className="h-10 w-auto"  />
            <span className="font-bold text-xl text-text">EDHA <span className="text-cyan">Academy</span></span>
          </Link>
          <div className="bg-card border border-border rounded-2xl p-8 shadow-sm">
            <div className="w-16 h-16 bg-green/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={32} className="text-green" />
            </div>
            <h2 className="text-xl font-bold text-text mb-2">Inscription réussie ! 🎉</h2>
            <p className="text-text2 text-sm leading-relaxed mb-6">
              Un email de confirmation a été envoyé à <strong>{form.email}</strong>.
              Vérifiez votre boîte de réception et cliquez sur le lien pour activer votre compte.
            </p>
            <div className="bg-blue/5 border border-blue/20 rounded-xl p-3 mb-6 text-xs text-blue/90 text-left">
              📧 Vérifiez aussi votre dossier <strong>Spam</strong> si vous ne voyez pas l&apos;email.
            </div>
            <Link href="/auth/login"
              className="block w-full text-center edha-gradient text-white py-3 rounded-xl font-medium text-sm hover:opacity-90">
              Aller à la connexion
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3 mb-5">
            <img src="/logo.png" alt="EDHA" className="h-10 w-auto"  />
            <span className="font-bold text-xl text-text">EDHA <span className="text-cyan">Academy</span></span>
          </Link>
          <h1 className="text-2xl font-bold text-text">Créer un compte étudiant</h1>
          <p className="text-text2 text-sm mt-1">Accédez à des milliers de cours gratuits</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-8 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Nom complet *" value={form.name} onChange={e => set('name', e.target.value)}
              icon={<User size={15} />} error={errors.name} placeholder="Jean Dupont" required />
            <Input label="Email *" type="email" value={form.email} onChange={e => set('email', e.target.value)}
              icon={<Mail size={15} />} error={errors.email} placeholder="vous@exemple.com" required />

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-text2">Mot de passe *</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text3" />
                <input type={showPwd ? 'text' : 'password'} value={form.password}
                  onChange={e => set('password', e.target.value)} placeholder="Minimum 6 caractères" required
                  className="w-full bg-bg2 border border-border rounded-xl pl-10 pr-10 py-2.5 text-sm text-text outline-none focus:border-blue/50" />
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text3">
                  {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red">{errors.password}</p>}
            </div>

            <Input label="Confirmer le mot de passe *" type="password" value={form.confirm}
              onChange={e => set('confirm', e.target.value)} icon={<Lock size={15} />}
              error={errors.confirm} placeholder="••••••••" />

            <Button type="submit" loading={loading} className="w-full" size="lg">
              Créer mon compte
            </Button>
          </form>

          <div className="mt-4 text-center space-y-2">
            <p className="text-sm text-text3">
              Déjà un compte ?{' '}
              <Link href="/auth/login" className="text-blue hover:underline font-medium">Se connecter</Link>
            </p>
            <p className="text-sm text-text3">
              Vous voulez enseigner ?{' '}
              <Link href="/auth/devenir-instructeur" className="text-blue hover:underline font-medium">Devenir instructeur</Link>
            </p>
          </div>
        </div>

        <p className="text-xs text-text3 text-center mt-4">
          En vous inscrivant, vous acceptez nos{' '}
          <Link href="/terms" className="text-blue hover:underline">CGU</Link> et notre{' '}
          <Link href="/privacy" className="text-blue hover:underline">politique de confidentialité</Link>.
        </p>
      </div>
    </div>
  )
}
