'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase/browser'
import { Button, Input } from '@/components/ui'
import {
  Mail, Lock, User, Building2, Eye, EyeOff,
  FileText, Globe, Upload, X, CheckCircle, ChevronRight
} from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'

type Step = 'type' | 'info' | 'qualif' | 'docs'
type UserType = 'instructor' | 'institution'

export default function DevenirInstructeurPage() {
  const router = useRouter()
  const supabase = createBrowserClient()
  const [step, setStep] = useState<Step>('type')
  const [userType, setUserType] = useState<UserType>('instructor')
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '', email: '', password: '', confirm: '',
    bio: '', website: '',
    qualifications: '', motivation: '', experience_years: '',
    institution_name: '', director_name: '', institution_type: '',
    institution_address: '', registration_number: '', phone: '',
    institution_description: '',
  })
  const [cvFile, setCvFile] = useState<File | null>(null)
  const [docFiles, setDocFiles] = useState<File[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})

  const set = (k: string, v: string) => {
    setForm(f => ({ ...f, [k]: v }))
    if (errors[k]) setErrors(e => ({ ...e, [k]: '' }))
  }

  const validateStep = () => {
    const e: Record<string, string> = {}
    if (step === 'info') {
      if (!form.name.trim()) e.name = 'Nom requis'
      if (!form.email.includes('@')) e.email = 'Email invalide'
      if (form.password.length < 8) e.password = 'Minimum 8 caractères'
      if (form.password !== form.confirm) e.confirm = 'Mots de passe différents'
      if (userType === 'institution') {
        if (!form.institution_name.trim()) e.institution_name = 'Nom de l\'institution requis'
        if (!form.director_name.trim()) e.director_name = 'Nom du directeur requis'
      }
    }
    if (step === 'qualif') {
      if (!form.qualifications.trim()) e.qualifications = 'Qualifications requises'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const nextStep = (target: Step) => {
    if (validateStep()) setStep(target)
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      // 1. Create auth account
      const { data, error } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: { data: { full_name: form.name, role: 'instructor' } }
      })

      if (error) { toast.error(error.message); setLoading(false); return }
      if (!data.user) { toast.error('Erreur lors de la création du compte'); setLoading(false); return }

      const userId = data.user.id

      // 2. Build application object — all fields saved here
      const application: any = {
        type: userType,
        qualifications: form.qualifications,
        motivation: form.motivation,
        experience_years: form.experience_years || null,
        submitted_at: new Date().toISOString(),
        status: 'pending',
        ...(userType === 'institution' ? {
          director_name: form.director_name,
          institution_type: form.institution_type,
          institution_address: form.institution_address,
          registration_number: form.registration_number,
          phone: form.phone,
          institution_description: form.institution_description,
        } : {}),
      }

      // 3. Upload CV
      if (cvFile) {
        const cvPath = `instructor-docs/${userId}/cv-${Date.now()}${cvFile.name.includes('.') ? '.' + cvFile.name.split('.').pop() : '.pdf'}`
        const { error: cvErr } = await supabase.storage.from('course-resources').upload(cvPath, cvFile, { contentType: cvFile.type })
        if (!cvErr) {
          const { data: urlData } = supabase.storage.from('course-resources').getPublicUrl(cvPath)
          application.cv_url = urlData.publicUrl
          application.cv_name = cvFile.name
        }
      }

      // 4. Upload extra documents
      if (docFiles.length > 0) {
        const docUrls: { name: string; url: string }[] = []
        for (const doc of docFiles) {
          const docPath = `instructor-docs/${userId}/doc-${Date.now()}-${doc.name.replace(/\s/g, '_')}`
          const { error: docErr } = await supabase.storage.from('course-resources').upload(docPath, doc)
          if (!docErr) {
            const { data: urlData } = supabase.storage.from('course-resources').getPublicUrl(docPath)
            docUrls.push({ name: doc.name, url: urlData.publicUrl })
          }
        }
        if (docUrls.length > 0) application.documents = docUrls
      }

      // 5. Wait for profile trigger then update
      await new Promise(resolve => setTimeout(resolve, 1500))

      const { error: profileErr } = await supabase.from('profiles').update({
        role: 'instructor',
        bio: form.bio || null,
        website: form.website || null,
        institution_name: userType === 'institution' ? form.institution_name : null,
        instructor_application: application,
        instructor_approved_at: null,
      }).eq('id', userId)

      if (profileErr) console.error('Profile update error:', profileErr)

      // 6. Send email BEFORE signOut
      try {
        await fetch('/api/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'instructor_pending',
            userId,
            email: form.email,
            name: form.name,
          }),
        })
      } catch (emailErr) {
        console.error('Email send failed:', emailErr)
      }

      // 7. Sign out
      await supabase.auth.signOut()

      // 8. Redirect
      router.push('/pending-confirmation')

    } catch (err) {
      console.error(err)
      toast.error('Une erreur est survenue. Réessayez.')
    }
    setLoading(false)
  }

  const STEPS: Step[] = ['type', 'info', 'qualif', 'docs']
  const stepIdx = STEPS.indexOf(step)

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3 mb-5">
            <img src="/logo.png" alt="EDHA" className="h-10 w-auto" />
            <span className="font-bold text-xl text-text">EDHA <span className="text-cyan">Academy</span></span>
          </Link>
          <h1 className="text-2xl font-bold text-text">Rejoindre en tant qu&apos;enseignant</h1>
          <p className="text-text2 text-sm mt-1">Votre profil sera examiné avant activation</p>
        </div>

        {/* Progress stepper */}
        {step !== 'type' && (
          <div className="flex items-center justify-center gap-2 mb-6">
            {([['info', 'Infos'], ['qualif', 'Qualif.'], ['docs', 'Documents']] as const).map(([s, l], i) => {
              const idx = STEPS.indexOf(s)
              const done = idx < stepIdx
              const active = s === step
              return (
                <div key={s} className="flex items-center gap-2">
                  <div className={clsx('w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all',
                    done ? 'bg-green border-green text-white' :
                    active ? 'border-blue text-blue bg-blue/10' : 'border-border text-text3')}>
                    {done ? '✓' : i + 1}
                  </div>
                  <span className={clsx('text-xs hidden sm:block', active ? 'text-blue font-medium' : 'text-text3')}>{l}</span>
                  {i < 2 && <div className={clsx('w-8 h-0.5', done ? 'bg-green' : 'bg-border')} />}
                </div>
              )
            })}
          </div>
        )}

        {/* STEP: Type */}
        {step === 'type' && (
          <div className="grid grid-cols-2 gap-4">
            {[
              { type: 'instructor' as UserType, icon: User, title: 'Instructeur individuel', desc: 'Expert ou enseignant indépendant', examples: 'Professeur, consultant, expert' },
              { type: 'institution' as UserType, icon: Building2, title: 'Institution', desc: 'École, université, organisation', examples: 'École privée, université, ONG' },
            ].map(({ type, icon: Icon, title, desc, examples }) => (
              <button key={type} onClick={() => { setUserType(type); setStep('info') }}
                className="bg-card border border-border hover:border-blue/40 rounded-2xl p-6 text-left transition-all group hover:shadow-md">
                <div className="w-12 h-12 bg-blue/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-blue/20 transition-colors">
                  <Icon size={22} className="text-blue" />
                </div>
                <h3 className="font-semibold text-text mb-1 text-sm">{title}</h3>
                <p className="text-xs text-text3 mb-2">{desc}</p>
                <p className="text-[10px] text-text3 italic">{examples}</p>
                <div className="mt-3 flex items-center gap-1 text-xs text-blue font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  Choisir <ChevronRight size={12} />
                </div>
              </button>
            ))}
          </div>
        )}

        {/* STEP: Info */}
        {step === 'info' && (
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
            <h2 className="font-semibold text-text">
              {userType === 'institution' ? '🏫 Informations de l\'institution' : '👤 Informations personnelles'}
            </h2>

            <Input label="Votre nom complet *" value={form.name} onChange={e => set('name', e.target.value)}
              icon={<User size={15} />} error={errors.name} placeholder="Jean Dupont" />

            {userType === 'institution' && (
              <>
                <Input label="Nom de l'institution *" value={form.institution_name} onChange={e => set('institution_name', e.target.value)}
                  icon={<Building2 size={15} />} error={errors.institution_name} placeholder="École Nationale de..." />
                <Input label="Nom du directeur / responsable *" value={form.director_name} onChange={e => set('director_name', e.target.value)}
                  icon={<User size={15} />} error={errors.director_name} placeholder="Nom du directeur" />
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-text2">Type d&apos;institution</label>
                  <select value={form.institution_type} onChange={e => set('institution_type', e.target.value)}
                    className="w-full bg-bg2 border border-border rounded-xl px-4 py-2.5 text-sm text-text outline-none focus:border-blue/50">
                    <option value="">Sélectionner...</option>
                    <option value="ecole_primaire">École primaire</option>
                    <option value="ecole_secondaire">École secondaire / lycée</option>
                    <option value="universite">Université / collège</option>
                    <option value="centre_formation">Centre de formation</option>
                    <option value="ong">ONG / organisation</option>
                    <option value="entreprise">Entreprise</option>
                    <option value="autre">Autre</option>
                  </select>
                </div>
                <Input label="Adresse" value={form.institution_address} onChange={e => set('institution_address', e.target.value)}
                  placeholder="Ville, département, Haïti" />
                <div className="grid grid-cols-2 gap-3">
                  <Input label="N° d'enregistrement légal" value={form.registration_number}
                    onChange={e => set('registration_number', e.target.value)} placeholder="Optionnel" />
                  <Input label="Téléphone" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+509..." />
                </div>
              </>
            )}

            <Input label="Email *" type="email" value={form.email} onChange={e => set('email', e.target.value)}
              icon={<Mail size={15} />} error={errors.email} placeholder="vous@exemple.com" />
            <Input label="Site web (optionnel)" type="url" value={form.website} onChange={e => set('website', e.target.value)}
              icon={<Globe size={15} />} placeholder="https://..." />

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-text2">Mot de passe * <span className="text-text3 font-normal">(min. 8 caractères)</span></label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text3" />
                <input type={showPwd ? 'text' : 'password'} value={form.password} onChange={e => set('password', e.target.value)}
                  placeholder="Minimum 8 caractères"
                  className="w-full bg-bg2 border border-border rounded-xl pl-10 pr-10 py-2.5 text-sm text-text outline-none focus:border-blue/50" />
                <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text3">
                  {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red">{errors.password}</p>}
            </div>

            <Input label="Confirmer le mot de passe *" type="password" value={form.confirm}
              onChange={e => set('confirm', e.target.value)} icon={<Lock size={15} />} error={errors.confirm} />

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-text2">Bio / Présentation <span className="text-text3 font-normal">(optionnel)</span></label>
              <textarea value={form.bio} onChange={e => set('bio', e.target.value)}
                placeholder="Présentez-vous en quelques lignes..."
                rows={2} className="w-full bg-bg2 border border-border rounded-xl px-4 py-3 text-sm text-text outline-none focus:border-blue/50 resize-none" />
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="secondary" onClick={() => setStep('type')}>← Retour</Button>
              <Button className="flex-1" onClick={() => nextStep('qualif')}>Suivant →</Button>
            </div>
          </div>
        )}

        {/* STEP: Qualifications */}
        {step === 'qualif' && (
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
            <h2 className="font-semibold text-text">
              {userType === 'institution' ? '🏫 À propos de l\'institution' : '🎓 Qualifications & Motivation'}
            </h2>

            {userType === 'institution' && (
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-text2">Description de l&apos;institution *</label>
                <textarea value={form.institution_description} onChange={e => set('institution_description', e.target.value)}
                  placeholder="Décrivez votre institution : mission, nombre d'élèves, années d'existence, programmes proposés..."
                  rows={3} className="w-full bg-bg2 border border-border rounded-xl px-4 py-3 text-sm text-text outline-none focus:border-blue/50 resize-none" />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-text2">
                {userType === 'institution' ? 'Qualifications de l\'équipe enseignante *' : 'Vos qualifications & expérience *'}
              </label>
              <textarea value={form.qualifications} onChange={e => set('qualifications', e.target.value)}
                placeholder={userType === 'institution'
                  ? 'Niveaux académiques des enseignants, certifications, accréditations...'
                  : 'Diplômes obtenus, certifications, années d\'expérience, domaines d\'expertise...'}
                rows={4} className="w-full bg-bg2 border border-border rounded-xl px-4 py-3 text-sm text-text outline-none focus:border-blue/50 resize-none" />
              {errors.qualifications && <p className="text-xs text-red">{errors.qualifications}</p>}
            </div>

            {userType === 'instructor' && (
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-text2">Années d&apos;expérience</label>
                <select value={form.experience_years} onChange={e => set('experience_years', e.target.value)}
                  className="w-full bg-bg2 border border-border rounded-xl px-4 py-2.5 text-sm text-text outline-none focus:border-blue/50">
                  <option value="">Sélectionner</option>
                  <option value="moins_1">Moins d'1 an</option>
                  <option value="1-3">1 à 3 ans</option>
                  <option value="3-5">3 à 5 ans</option>
                  <option value="5-10">5 à 10 ans</option>
                  <option value="10+">Plus de 10 ans</option>
                </select>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-text2">Motivation — Pourquoi rejoindre EDHA Academy ?</label>
              <textarea value={form.motivation} onChange={e => set('motivation', e.target.value)}
                placeholder="Qu'espérez-vous apporter à la communauté EDHA ? Quels cours souhaitez-vous proposer ?"
                rows={3} className="w-full bg-bg2 border border-border rounded-xl px-4 py-3 text-sm text-text outline-none focus:border-blue/50 resize-none" />
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="secondary" onClick={() => setStep('info')}>← Retour</Button>
              <Button className="flex-1" onClick={() => nextStep('docs')}>Suivant →</Button>
            </div>
          </div>
        )}

        {/* STEP: Documents */}
        {step === 'docs' && (
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-5">
            <div>
              <h2 className="font-semibold text-text">📁 CV & Documents</h2>
              <p className="text-xs text-text3 mt-1">
                {userType === 'institution'
                  ? 'Permis d\'exploitation, accréditations, liste des enseignants... (optionnel mais recommandé)'
                  : 'CV, diplômes, certifications... (optionnel mais accélère l\'approbation)'}
              </p>
            </div>

            {/* CV */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-text2">
                {userType === 'institution' ? 'Document principal (permis, accréditation)' : 'CV / Curriculum Vitae'}
                <span className="text-text3 font-normal ml-1">(PDF ou Word, max 5 MB)</span>
              </label>
              {cvFile ? (
                <div className="flex items-center gap-3 bg-green/10 border border-green/20 rounded-xl px-4 py-3">
                  <CheckCircle size={16} className="text-green flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text truncate">{cvFile.name}</p>
                    <p className="text-xs text-text3">{(cvFile.size / 1024).toFixed(0)} KB</p>
                  </div>
                  <button onClick={() => setCvFile(null)} className="text-text3 hover:text-red transition-colors"><X size={16} /></button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border hover:border-blue/40 rounded-xl py-6 cursor-pointer hover:bg-blue/5 transition-colors">
                  <Upload size={20} className="text-text3" />
                  <span className="text-sm text-text2">Cliquez pour télécharger</span>
                  <span className="text-xs text-text3">PDF, DOC, DOCX · max 5 MB</span>
                  <input type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={e => {
                    const f = e.target.files?.[0]
                    if (!f) return
                    if (f.size > 5 * 1024 * 1024) { toast.error('Max 5 MB'); return }
                    setCvFile(f)
                  }} />
                </label>
              )}
            </div>

            {/* Docs extra */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-text2">
                Documents supplémentaires <span className="text-text3 font-normal">(max 5 fichiers)</span>
              </label>
              <p className="text-xs text-text3">
                {userType === 'institution'
                  ? 'Accréditations, liste d\'enseignants, rapport annuel, photos...'
                  : 'Diplômes, certifications, lettre de recommandation...'}
              </p>
              {docFiles.map((doc, i) => (
                <div key={i} className="flex items-center gap-3 bg-bg2 border border-border rounded-xl px-4 py-2.5">
                  <FileText size={14} className="text-blue flex-shrink-0" />
                  <p className="text-sm text-text flex-1 truncate">{doc.name}</p>
                  <p className="text-xs text-text3">{(doc.size / 1024).toFixed(0)} KB</p>
                  <button onClick={() => setDocFiles(d => d.filter((_, j) => j !== i))} className="text-text3 hover:text-red"><X size={14} /></button>
                </div>
              ))}
              {docFiles.length < 5 && (
                <label className="flex items-center justify-center gap-2 border border-dashed border-border hover:border-blue/40 rounded-xl py-3 cursor-pointer hover:bg-blue/5 transition-colors">
                  <Upload size={15} className="text-text3" />
                  <span className="text-sm text-text2">{docFiles.length === 0 ? 'Ajouter des documents' : '+ Ajouter un document'}</span>
                  <input type="file" multiple accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" className="hidden" onChange={e => {
                    const files = Array.from(e.target.files || []).filter(f => f.size <= 10 * 1024 * 1024)
                    setDocFiles(prev => [...prev, ...files].slice(0, 5))
                  }} />
                </label>
              )}
            </div>

            {/* Aviso */}
            <div className="bg-yellow/5 border border-yellow/20 rounded-xl p-4">
              <p className="text-sm font-semibold text-yellow mb-1">⚠️ Important</p>
              <p className="text-xs text-text2 leading-relaxed">
                Après soumission, vous <strong>ne pourrez pas accéder à la plateforme immédiatement</strong>.
                Vous recevrez un email de confirmation. L&apos;équipe EDHA examinera votre dossier dans les 48h.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="secondary" onClick={() => setStep('qualif')}>← Retour</Button>
              <Button className="flex-1" loading={loading} onClick={handleSubmit}>
                🚀 Envoyer ma demande
              </Button>
            </div>
          </div>
        )}

        <p className="text-center text-sm text-text3 mt-4">
          Déjà un compte ? <Link href="/auth/login" className="text-blue hover:underline font-medium">Se connecter</Link>
        </p>
      </div>
    </div>
  )
}