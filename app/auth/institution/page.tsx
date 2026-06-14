'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase/browser'
import { Button, Input } from '@/components/ui'
import { Building2, CheckCircle, Globe, Mail, Lock, Eye, EyeOff, User } from 'lucide-react'
import toast from 'react-hot-toast'

const INSTITUTION_TYPES = [
  { value: 'university',       label: '🎓 Université' },
  { value: 'college',          label: '🏫 Collège / Lycée' },
  { value: 'school',           label: '📚 École primaire / secondaire' },
  { value: 'training_center',  label: '⚙️ Centre de formation' },
  { value: 'other',            label: '🏢 Autre' },
]

export default function InstitutionRegisterPage() {
  const router = useRouter()
  const supabase = createBrowserClient()
  const [step, setStep] = useState<'form' | 'done'>('form')
  const [loading, setLoading] = useState(false)
  const [showPwd, setShowPwd] = useState(false)
  const [form, setForm] = useState({
    name: '', email: '', password: '',
    institution_name: '', institution_type: 'university',
    institution_website: '', institution_country: 'HT',
    institution_description: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const set = (k: string, v: string) => {
    setForm(f => ({ ...f, [k]: v }))
    if (errors[k]) setErrors(e => ({ ...e, [k]: '' }))
  }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.name.trim())             e.name = 'Nom du responsable requis'
    if (!form.email.includes('@'))     e.email = 'Email invalide'
    if (form.password.length < 8)     e.password = 'Minimum 8 caractères'
    if (!form.institution_name.trim()) e.institution_name = 'Nom de l\'institution requis'
    if (!form.institution_type)        e.institution_type = 'Type requis'
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
      options: {
        data: {
          full_name: form.name,
          role: 'student', // Always starts as student — admin promotes to institution
          institution_name: form.institution_name,
          institution_type: form.institution_type,
          institution_website: form.institution_website,
          institution_country: form.institution_country,
          institution_description: form.institution_description,
          requested_role: 'institution', // flag for admin to review
        },
      },
    })

    if (error) {
      toast.error(error.message.includes('already registered')
        ? 'Cet email est déjà utilisé'
        : error.message)
      setLoading(false)
      return
    }

    setStep('done')
    setLoading(false)
  }

  if (step === 'done') return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <Link href="/" className="inline-flex items-center gap-3 mb-8">
          <img src="/logo.png" alt="EDHA" className="h-10 w-auto" />
          <span className="font-bold text-xl text-text">EDHA <span className="text-cyan">Academy</span></span>
        </Link>
        <div className="bg-card border border-border rounded-2xl p-8 shadow-sm">
          <div className="w-16 h-16 bg-green/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-green" />
          </div>
          <h2 className="text-xl font-bold text-text mb-2">Demande envoyée ! 🎉</h2>
          <p className="text-text2 text-sm leading-relaxed mb-4">
            Votre demande d'accès institutionnel pour <strong>{form.institution_name}</strong> a été enregistrée.
          </p>
          <div className="bg-blue/5 border border-blue/20 rounded-xl p-4 mb-6 text-left space-y-2">
            <p className="text-xs text-blue font-semibold">Prochaines étapes :</p>
            <p className="text-xs text-text2">1. Vérifiez votre email et confirmez votre compte</p>
            <p className="text-xs text-text2">2. Notre équipe examinera votre demande (1–3 jours)</p>
            <p className="text-xs text-text2">3. Vous recevrez un email de confirmation d'accès</p>
          </div>
          <Link href="/auth/login"
            className="block w-full text-center edha-gradient text-white py-3 rounded-xl font-medium text-sm">
            Aller à la connexion
          </Link>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3 mb-5">
            <img src="/logo.png" alt="EDHA" className="h-10 w-auto" />
            <span className="font-bold text-xl text-text">EDHA <span className="text-cyan">Academy</span></span>
          </Link>
          <h1 className="text-2xl font-bold text-text">Inscription institutionnelle</h1>
          <p className="text-text2 text-sm mt-1">Pour universités, collèges et centres de formation</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-card border border-border rounded-2xl p-8 shadow-sm space-y-5">
          <div className="border-b border-border pb-4 mb-2">
            <p className="text-xs font-semibold text-text3 uppercase tracking-wide mb-3">
              Responsable du compte
            </p>
            <div className="space-y-4">
              <Input label="Nom du responsable" value={form.name}
                onChange={e => set('name', e.target.value)}
                icon={<User size={16} />} error={errors.name} placeholder="Prénom Nom" />
              <Input label="Email professionnel" type="email" value={form.email}
                onChange={e => set('email', e.target.value)}
                icon={<Mail size={16} />} error={errors.email} placeholder="direction@monecole.edu" />
              <div className="relative">
                <Input label="Mot de passe" type={showPwd ? 'text' : 'password'}
                  value={form.password} onChange={e => set('password', e.target.value)}
                  icon={<Lock size={16} />} error={errors.password} placeholder="Minimum 8 caractères" />
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-8 text-text3 hover:text-text">
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-text3 uppercase tracking-wide mb-3">
              Informations de l&apos;institution
            </p>
            <div className="space-y-4">
              <Input label="Nom de l'institution" value={form.institution_name}
                onChange={e => set('institution_name', e.target.value)}
                icon={<Building2 size={16} />} error={errors.institution_name}
                placeholder="Université d'État d'Haïti" />

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-text2">Type d&apos;institution</label>
                <div className="grid grid-cols-1 gap-2">
                  {INSTITUTION_TYPES.map(({ value, label }) => (
                    <button type="button" key={value}
                      onClick={() => set('institution_type', value)}
                      className={`text-left px-4 py-2.5 rounded-xl border text-sm transition-all ${
                        form.institution_type === value
                          ? 'border-blue bg-blue/5 text-blue font-medium'
                          : 'border-border text-text2 hover:border-blue/30'
                      }`}>{label}</button>
                  ))}
                </div>
              </div>

              <Input label="Site web (optionnel)" value={form.institution_website}
                onChange={e => set('institution_website', e.target.value)}
                icon={<Globe size={16} />} placeholder="https://monecole.edu.ht" />

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-text2">Description (optionnel)</label>
                <textarea value={form.institution_description}
                  onChange={e => set('institution_description', e.target.value)}
                  rows={3} placeholder="Décrivez brièvement votre institution..."
                  className="w-full bg-bg2 border border-border rounded-xl px-4 py-2.5 text-sm text-text outline-none focus:border-blue/50 resize-none" />
              </div>
            </div>
          </div>

          <Button type="submit" loading={loading} className="w-full" size="lg">
            <Building2 size={16} /> Soumettre la demande d&apos;accès
          </Button>

          <p className="text-center text-xs text-text3">
            Vous avez déjà un compte ?{' '}
            <Link href="/auth/login" className="text-blue hover:underline">Se connecter</Link>
          </p>
          <p className="text-center text-xs text-text3">
            Inscription comme étudiant ?{' '}
            <Link href="/auth/inscription" className="text-blue hover:underline">Par ici</Link>
          </p>
        </form>
      </div>
    </div>
  )
}
