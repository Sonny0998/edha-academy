'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { createBrowserClient } from '@/lib/supabase/browser'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { Input, Button, Spinner } from '@/components/ui'
import {
  Layers, BookOpen, UserCheck, Users, BarChart2,
  Globe, Settings, LayoutDashboard, Plus, X,
  Code, Calculator, Palette, HelpCircle, Zap,
  FileText, Table, ExternalLink, FileCode, Check
} from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import { PRACTICE_TOOLS_CATALOG, type PracticeToolType } from '@/types'

const navItems = [
  { label: 'Vue d\'ensemble',  href: '/dashboard/institution',                icon: <LayoutDashboard size={16} /> },
  { label: 'Mes programmes',   href: '/dashboard/institution/programs',       icon: <Layers size={16} /> },
  { label: 'Mes cours',        href: '/dashboard/institution/courses',        icon: <BookOpen size={16} /> },
  { label: 'Mon équipe',       href: '/dashboard/institution/teachers',       icon: <UserCheck size={16} /> },
  { label: 'Étudiants',        href: '/dashboard/institution/students',       icon: <Users size={16} /> },
  { label: 'Analytiques',      href: '/dashboard/institution/analytics',      icon: <BarChart2 size={16} /> },
  { label: 'Page publique',    href: '/dashboard/institution/profile',        icon: <Globe size={16} /> },
  { label: 'Paramètres',       href: '/dashboard/institution/settings',       icon: <Settings size={16} /> },
]

const TOOL_ICONS: Record<PracticeToolType, any> = {
  code_editor:     Code,
  notebook:        FileCode,
  math_tool:       Calculator,
  design_tool:     Palette,
  quiz_native:     HelpCircle,
  flashcards:      Layers,
  simulation:      Zap,
  document_editor: FileText,
  spreadsheet:     Table,
  external_link:   ExternalLink,
}

const LEVELS = [
  { value: 'debutant',      label: 'Débutant' },
  { value: 'intermediaire', label: 'Intermédiaire' },
  { value: 'avance',        label: 'Avancé' },
]

const LANGUAGES = [
  { value: 'fr', label: 'Français' },
  { value: 'ht', label: 'Kreyòl ayisyen' },
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
]

const PRICING = [
  { value: 'free', label: 'Gratuit', desc: 'Accessible à tous sans paiement' },
  { value: 'paid', label: 'Payant', desc: 'Les étudiants paient pour s\'inscrire' },
]

export default function NewProgramPage() {
  const router = useRouter()
  const { profile } = useAuth()
  const supabase = createBrowserClient()
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'info' | 'tools' | 'courses'>('info')

  const [form, setForm] = useState({
    title: '',
    subtitle: '',
    description: '',
    language: 'fr',
    level: 'debutant',
    pricing_model: 'free',
    price: '',
    price_htg: '',
    certificate_title: '',
    what_you_learn: [''],
    requirements: [''],
    tags: '',
  })

  const [selectedTools, setSelectedTools] = useState<PracticeToolType[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})

  const set = (k: string, v: string) => {
    setForm(f => ({ ...f, [k]: v }))
    if (errors[k]) setErrors(e => ({ ...e, [k]: '' }))
  }

  const toggleTool = (type: PracticeToolType) => {
    setSelectedTools(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    )
  }

  const addListItem = (field: 'what_you_learn' | 'requirements') => {
    setForm(f => ({ ...f, [field]: [...f[field], ''] }))
  }

  const updateListItem = (field: 'what_you_learn' | 'requirements', idx: number, val: string) => {
    setForm(f => {
      const arr = [...f[field]]
      arr[idx] = val
      return { ...f, [field]: arr }
    })
  }

  const removeListItem = (field: 'what_you_learn' | 'requirements', idx: number) => {
    setForm(f => ({ ...f, [field]: f[field].filter((_, i) => i !== idx) }))
  }

  const validateInfo = () => {
    const e: Record<string, string> = {}
    if (!form.title.trim()) e.title = 'Titre requis'
    if (!form.description.trim()) e.description = 'Description requise'
    if (form.pricing_model === 'paid' && !form.price) e.price = 'Prix requis'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async () => {
    if (!profile) return
    setLoading(true)

    try {
      const slug = form.title
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') +
        '-' + Date.now().toString(36)

      const practiceTools = PRACTICE_TOOLS_CATALOG
        .filter(t => selectedTools.includes(t.type))
        .map(t => ({
          type: t.type,
          label: t.label,
          url: t.embedUrl,
          embed: t.type !== 'external_link',
        }))

      const { data, error } = await supabase
        .from('programs')
        .insert({
          institution_id: profile.id,
          title: form.title.trim(),
          slug,
          subtitle: form.subtitle.trim() || null,
          description: form.description.trim(),
          language: form.language,
          level: form.level,
          pricing_model: form.pricing_model,
          price: form.pricing_model === 'paid' ? parseFloat(form.price) : null,
          price_htg: form.pricing_model === 'paid' && form.price_htg ? parseFloat(form.price_htg) : null,
          certificate_title: form.certificate_title.trim() || null,
          what_you_learn: form.what_you_learn.filter(Boolean),
          requirements: form.requirements.filter(Boolean),
          tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
          practice_tools: practiceTools,
          status: 'draft',
        })
        .select()
        .single()

      if (error) { toast.error(error.message); setLoading(false); return }

      toast.success('Programme créé ! Ajoutez maintenant vos cours.')
      router.push(`/dashboard/institution/programs/${data.id}/edit`)
    } catch (err) {
      toast.error('Erreur lors de la création')
    }
    setLoading(false)
  }

  return (
    <DashboardLayout navItems={navItems} title="Nouveau programme" role="institution">
      <div className="max-w-3xl">

        {/* Stepper */}
        <div className="flex items-center gap-3 mb-8">
          {[
            { key: 'info',    label: 'Informations' },
            { key: 'tools',   label: 'Outils pratiques' },
            { key: 'courses', label: 'Finaliser' },
          ].map(({ key, label }, i) => {
            const steps = ['info', 'tools', 'courses']
            const done = steps.indexOf(step) > i
            const active = step === key
            return (
              <div key={key} className="flex items-center gap-3">
                <div className={clsx(
                  'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                  done ? 'bg-green border-green text-white' :
                  active ? 'border-blue text-blue bg-blue/10' :
                  'border-border text-text3'
                )}>
                  {done ? <Check size={12} /> : <span>{i + 1}</span>}
                  {label}
                </div>
                {i < 2 && <div className={clsx('h-0.5 w-8', done ? 'bg-green' : 'bg-border')} />}
              </div>
            )
          })}
        </div>

        {/* ── STEP 1: Informations ── */}
        {step === 'info' && (
          <div className="space-y-6">
            <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
              <h2 className="font-semibold text-text">Informations du programme</h2>

              <Input
                label="Titre du programme *"
                value={form.title}
                onChange={e => set('title', e.target.value)}
                placeholder="ex: Préparation au Baccalauréat — Philosophie"
                error={errors.title}
              />

              <Input
                label="Sous-titre (optionnel)"
                value={form.subtitle}
                onChange={e => set('subtitle', e.target.value)}
                placeholder="ex: Programme complet de 5 cours — niveau Terminale"
              />

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-text2">Description *</label>
                <textarea
                  value={form.description}
                  onChange={e => set('description', e.target.value)}
                  rows={4}
                  placeholder="Décrivez le programme : objectifs, public cible, débouchés..."
                  className="w-full bg-bg2 border border-border rounded-xl px-4 py-3 text-sm text-text outline-none focus:border-blue/50 resize-none"
                />
                {errors.description && <p className="text-xs text-red">{errors.description}</p>}
              </div>

              {/* Langue & Niveau */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-text2">Langue d&apos;enseignement</label>
                  <select
                    value={form.language}
                    onChange={e => set('language', e.target.value)}
                    className="w-full bg-bg2 border border-border rounded-xl px-4 py-2.5 text-sm text-text outline-none focus:border-blue/50"
                  >
                    {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-text2">Niveau</label>
                  <select
                    value={form.level}
                    onChange={e => set('level', e.target.value)}
                    className="w-full bg-bg2 border border-border rounded-xl px-4 py-2.5 text-sm text-text outline-none focus:border-blue/50"
                  >
                    {LEVELS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Tarification */}
            <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
              <h2 className="font-semibold text-text">Tarification</h2>
              <div className="grid grid-cols-2 gap-3">
                {PRICING.map(p => (
                  <button
                    key={p.value}
                    onClick={() => set('pricing_model', p.value)}
                    className={clsx(
                      'p-4 rounded-xl border text-left transition-all',
                      form.pricing_model === p.value
                        ? 'border-blue bg-blue/5'
                        : 'border-border hover:border-blue/30'
                    )}
                  >
                    <p className="font-medium text-text text-sm">{p.label}</p>
                    <p className="text-xs text-text3 mt-0.5">{p.desc}</p>
                  </button>
                ))}
              </div>
              {form.pricing_model === 'paid' && (
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <Input
                    label="Prix (USD) *"
                    type="number"
                    value={form.price}
                    onChange={e => set('price', e.target.value)}
                    placeholder="29.99"
                    error={errors.price}
                  />
                  <Input
                    label="Prix (HTG) optionnel"
                    type="number"
                    value={form.price_htg}
                    onChange={e => set('price_htg', e.target.value)}
                    placeholder="3500"
                  />
                </div>
              )}
            </div>

            {/* Ce que l'étudiant apprend */}
            <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
              <h2 className="font-semibold text-text">Ce que l&apos;étudiant va apprendre</h2>
              {form.what_you_learn.map((item, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    type="text"
                    value={item}
                    onChange={e => updateListItem('what_you_learn', i, e.target.value)}
                    placeholder={`Compétence ou objectif ${i + 1}`}
                    className="flex-1 bg-bg2 border border-border rounded-xl px-4 py-2.5 text-sm text-text outline-none focus:border-blue/50"
                  />
                  {form.what_you_learn.length > 1 && (
                    <button onClick={() => removeListItem('what_you_learn', i)}
                      className="text-text3 hover:text-red transition-colors p-2">
                      <X size={15} />
                    </button>
                  )}
                </div>
              ))}
              <button onClick={() => addListItem('what_you_learn')}
                className="text-sm text-blue hover:underline flex items-center gap-1">
                <Plus size={13} /> Ajouter un objectif
              </button>
            </div>

            {/* Certificat */}
            <div className="bg-card border border-border rounded-2xl p-6">
              <h2 className="font-semibold text-text mb-4">Certificat de fin de programme</h2>
              <Input
                label="Intitulé du certificat"
                value={form.certificate_title}
                onChange={e => set('certificate_title', e.target.value)}
                placeholder="ex: Certificat de préparation au Baccalauréat — Philosophie"
              />
              <p className="text-xs text-text3 mt-2">
                Ce titre apparaîtra sur le certificat remis aux étudiants qui complètent tous les cours du programme.
              </p>
            </div>

            <div className="flex justify-end">
              <Button onClick={() => { if (validateInfo()) setStep('tools') }}>
                Suivant : Outils pratiques →
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP 2: Outils pratiques ── */}
        {step === 'tools' && (
          <div className="space-y-6">
            <div className="bg-card border border-border rounded-2xl p-6">
              <h2 className="font-semibold text-text mb-1">Outils pratiques du programme</h2>
              <p className="text-sm text-text2 mb-6">
                Choisissez les outils que vos étudiants auront à disposition pour pratiquer.
                Ces outils s&apos;intégreront directement dans les leçons — les étudiants n&apos;ont rien à installer.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {PRACTICE_TOOLS_CATALOG.map(tool => {
                  const Icon = TOOL_ICONS[tool.type]
                  const selected = selectedTools.includes(tool.type)
                  return (
                    <button
                      key={tool.type}
                      onClick={() => toggleTool(tool.type)}
                      className={clsx(
                        'flex items-start gap-3 p-4 rounded-xl border text-left transition-all',
                        selected
                          ? 'border-blue bg-blue/5'
                          : 'border-border hover:border-blue/30 hover:bg-bg2'
                      )}
                    >
                      <div className={clsx(
                        'w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5',
                        selected ? 'bg-blue text-white' : 'bg-bg2 text-text3'
                      )}>
                        <Icon size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text">{tool.label}</p>
                        <p className="text-xs text-text3 mt-0.5">{tool.description}</p>
                        <p className="text-[10px] text-text3 mt-1 italic">
                          {tool.disciplines.join(' · ')}
                        </p>
                      </div>
                      {selected && (
                        <div className="w-5 h-5 bg-blue rounded-full flex items-center justify-center shrink-0">
                          <Check size={11} className="text-white" />
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>

              {selectedTools.length > 0 && (
                <div className="mt-4 p-3 bg-blue/5 border border-blue/20 rounded-xl">
                  <p className="text-xs text-blue font-medium">
                    {selectedTools.length} outil{selectedTools.length > 1 ? 's' : ''} sélectionné{selectedTools.length > 1 ? 's' : ''} —
                    les instructeurs pourront les attribuer à chaque leçon
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-between">
              <Button variant="secondary" onClick={() => setStep('info')}>← Retour</Button>
              <Button onClick={() => setStep('courses')}>Suivant : Finaliser →</Button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Finaliser ── */}
        {step === 'courses' && (
          <div className="space-y-6">
            <div className="bg-card border border-border rounded-2xl p-6">
              <h2 className="font-semibold text-text mb-4">Récapitulatif</h2>

              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-sm text-text3">Titre</span>
                  <span className="text-sm font-medium text-text">{form.title}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-sm text-text3">Niveau</span>
                  <span className="text-sm text-text">
                    {LEVELS.find(l => l.value === form.level)?.label}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-sm text-text3">Tarification</span>
                  <span className="text-sm text-text">
                    {form.pricing_model === 'free' ? 'Gratuit' : `${form.price} USD`}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-sm text-text3">Outils pratiques</span>
                  <span className="text-sm text-text">{selectedTools.length} outil{selectedTools.length > 1 ? 's' : ''}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-sm text-text3">Certificat</span>
                  <span className="text-sm text-text">{form.certificate_title || 'Non défini'}</span>
                </div>
              </div>
            </div>

            <div className="bg-blue/5 border border-blue/20 rounded-2xl p-5">
              <p className="text-sm font-semibold text-blue mb-1">Prochaine étape</p>
              <p className="text-sm text-text2">
                Après la création, vous serez redirigé vers l&apos;éditeur du programme pour y ajouter et ordonner vos cours.
              </p>
            </div>

            <div className="flex justify-between">
              <Button variant="secondary" onClick={() => setStep('tools')}>← Retour</Button>
              <Button loading={loading} onClick={handleSubmit}>
                Créer le programme
              </Button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}