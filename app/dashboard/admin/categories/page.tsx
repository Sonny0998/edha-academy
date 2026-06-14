'use client'
import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase/browser'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { Card, Button, Input, Spinner } from '@/components/ui'
import {
  Users, BookOpen, CreditCard, Settings, LayoutDashboard, Tag, Activity, Ticket, BarChart2,
  Plus, Trash2, Pencil, Save, X,
  Calculator, FlaskConical, Landmark, Brain, Code, Globe, Palette,
  TrendingUp, Music, Camera, Heart, Star, Zap, Microscope, Gavel,
  Leaf, Dumbbell, ChefHat, Plane, Laptop, PenTool, MessageSquare,
  Lightbulb, Briefcase, GraduationCap, Languages, Film
} from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const navItems = [
  { label: 'Tableau de bord', href: '/dashboard/admin',           icon: <LayoutDashboard size={16}/> },
  { label: 'Utilisateurs',   href: '/dashboard/admin/users',      icon: <Users size={16}/> },
  { label: 'Cours',          href: '/dashboard/admin/courses',     icon: <BookOpen size={16}/> },
  { label: 'Catégories',     href: '/dashboard/admin/categories',  icon: <Tag size={16}/> },
  { label: 'Activité',       href: '/dashboard/admin/activity',    icon: <Activity size={16}/> },
  { label: 'Coupons',        href: '/dashboard/admin/coupons',     icon: <Ticket size={16}/> },
  { label: 'Rapports',       href: '/dashboard/admin/reports',     icon: <BarChart2 size={16}/> },
  { label: 'Paiements',      href: '/dashboard/admin/payments',    icon: <CreditCard size={16}/> },
  { label: 'Paramètres',     href: '/dashboard/admin/settings',    icon: <Settings size={16}/> },
]

// Icon registry — REAL Lucide components
const ICONS: Record<string, React.ReactNode> = {
  BookOpen:    <BookOpen size={20}/>,
  Calculator:  <Calculator size={20}/>,
  FlaskConical:<FlaskConical size={20}/>,
  Landmark:    <Landmark size={20}/>,
  Brain:       <Brain size={20}/>,
  Code:        <Code size={20}/>,
  Globe:       <Globe size={20}/>,
  Palette:     <Palette size={20}/>,
  TrendingUp:  <TrendingUp size={20}/>,
  Music:       <Music size={20}/>,
  Camera:      <Camera size={20}/>,
  Heart:       <Heart size={20}/>,
  Star:        <Star size={20}/>,
  Zap:         <Zap size={20}/>,
  Microscope:  <Microscope size={20}/>,
  Gavel:       <Gavel size={20}/>,
  Leaf:        <Leaf size={20}/>,
  Dumbbell:    <Dumbbell size={20}/>,
  ChefHat:     <ChefHat size={20}/>,
  Plane:       <Plane size={20}/>,
  Laptop:      <Laptop size={20}/>,
  PenTool:     <PenTool size={20}/>,
  Lightbulb:   <Lightbulb size={20}/>,
  Briefcase:   <Briefcase size={20}/>,
  GraduationCap:<GraduationCap size={20}/>,
  Languages:   <Languages size={20}/>,
  Film:        <Film size={20}/>,
  MessageSquare:<MessageSquare size={20}/>,
  Users:       <Users size={20}/>,
}
const ICON_NAMES = Object.keys(ICONS)
const COLORS = ['#0891b2','#8b5cf6','#10b981','#d97706','#ec4899','#06b6d4','#f97316','#3b82f6','#ef4444','#14b8a6','#6366f1','#84cc16','#a855f7','#0ea5e9']

function getIcon(name: string) { return ICONS[name] || <BookOpen size={20}/> }

export default function AdminCategoriesPage() {
  const supabase = createBrowserClient()
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading]       = useState(true)
  const [editingId, setEditingId]   = useState<string|null>(null)
  const [showNew, setShowNew]       = useState(false)
  const [saving, setSaving]         = useState(false)
  const blank = { name:'', slug:'', description:'', icon:'BookOpen', color:'#0891b2' }
  const [form, setForm] = useState(blank)
  const slugify = (s:string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')
  const setf = (k:string, v:string) => setForm(f => ({...f,[k]:v,...(k==='name'?{slug:slugify(v)}:{})}))

  const load = async () => {
    const { data } = await supabase.from('categories').select('*').order('order_num')
    setCategories(data||[])
    setLoading(false)
  }
  useEffect(()=>{load()},[])

  const save = async (id?:string) => {
    if (!form.name.trim()) { toast.error('Nom requis'); return }
    setSaving(true)
    if (id) {
      await supabase.from('categories').update({ name:form.name, slug:form.slug, description:form.description||null, icon:form.icon, color:form.color }).eq('id',id)
      setEditingId(null)
    } else {
      await supabase.from('categories').insert({ name:form.name, slug:form.slug||slugify(form.name), description:form.description||null, icon:form.icon, color:form.color, order_num:categories.length+1 })
      setShowNew(false)
      setForm(blank)
    }
    toast.success(id?'Mise à jour !':'Catégorie créée !')
    load()
    setSaving(false)
  }

  const del = async (id:string,name:string) => {
    if(!confirm(`Supprimer "${name}" ?`)) return
    await supabase.from('categories').delete().eq('id',id)
    toast.success('Supprimée')
    load()
  }

  const FormFields = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Input label="Nom *" value={form.name} onChange={e=>setf('name',e.target.value)} placeholder="Ex: Mathématiques"/>
        <Input label="Slug (URL)" value={form.slug} onChange={e=>setf('slug',e.target.value)} placeholder="mathematiques"/>
      </div>
      <Input label="Description" value={form.description} onChange={e=>setf('description',e.target.value)} placeholder="Optionnel"/>

      {/* Icon picker */}
      <div>
        <label className="block text-sm font-medium text-text2 mb-2">Icône</label>
        <div className="grid grid-cols-7 sm:grid-cols-10 gap-1.5 p-3 bg-bg2 rounded-xl border border-border max-h-36 overflow-y-auto">
          {ICON_NAMES.map(name => (
            <button key={name} type="button" onClick={()=>setf('icon',name)} title={name}
              className={clsx('w-9 h-9 rounded-lg flex items-center justify-center border transition-all',
                form.icon===name?'border-blue bg-blue/10 text-blue':'border-transparent hover:border-border text-text3 hover:text-text hover:bg-card')}>
              {ICONS[name]}
            </button>
          ))}
        </div>
        <p className="text-xs text-text3 mt-1">Sélectionné: <strong className="text-blue">{form.icon}</strong></p>
      </div>

      {/* Color picker */}
      <div>
        <label className="block text-sm font-medium text-text2 mb-2">Couleur</label>
        <div className="flex flex-wrap gap-2">
          {COLORS.map(c => (
            <button key={c} type="button" onClick={()=>setf('color',c)}
              className={clsx('w-8 h-8 rounded-lg border-2 transition-all',form.color===c?'border-text3 scale-110 shadow-md':'border-transparent hover:scale-105')}
              style={{backgroundColor:c}}/>
          ))}
        </div>
      </div>

      {/* Preview */}
      <div className="flex items-center gap-3 bg-bg2 border border-border rounded-xl p-3">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white flex-shrink-0"
          style={{backgroundColor:form.color}}>
          {getIcon(form.icon)}
        </div>
        <div>
          <p className="font-semibold text-text">{form.name||'Nom de la catégorie'}</p>
          <p className="text-xs text-text3">/{form.slug||'slug'}</p>
        </div>
      </div>
    </div>
  )

  if (loading) return (
    <DashboardLayout navItems={navItems} title="Catégories" role="admin">
      <div className="flex justify-center py-16"><Spinner size="lg"/></div>
    </DashboardLayout>
  )

  return (
    <DashboardLayout navItems={navItems} title="Catégories" role="admin">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-text">Catégories <span className="text-text3 font-normal text-lg">({categories.length})</span></h1>
        <Button onClick={()=>{setShowNew(true);setEditingId(null);setForm(blank)}}><Plus size={15}/> Nouvelle</Button>
      </div>

      {showNew && (
        <Card className="p-6 mb-5 border-blue/30">
          <div className="flex justify-between mb-4">
            <h2 className="font-semibold text-text">Nouvelle catégorie</h2>
            <button onClick={()=>setShowNew(false)}><X size={16} className="text-text3"/></button>
          </div>
          <FormFields/>
          <div className="flex gap-3 mt-5">
            <Button onClick={()=>save()} loading={saving}><Save size={15}/> Créer</Button>
            <Button variant="secondary" onClick={()=>setShowNew(false)}>Annuler</Button>
          </div>
        </Card>
      )}

      <div className="space-y-2">
        {categories.map(cat => (
          <Card key={cat.id} className="overflow-hidden">
            {editingId===cat.id ? (
              <div className="p-5">
                <div className="flex justify-between mb-4">
                  <h3 className="font-semibold text-text">Modifier : {cat.name}</h3>
                  <button onClick={()=>setEditingId(null)}><X size={16} className="text-text3"/></button>
                </div>
                <FormFields/>
                <div className="flex gap-3 mt-5">
                  <Button onClick={()=>save(cat.id)} loading={saving}><Save size={15}/> Sauvegarder</Button>
                  <Button variant="secondary" onClick={()=>setEditingId(null)}>Annuler</Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4 p-4">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white flex-shrink-0"
                  style={{backgroundColor:cat.color}}>
                  {getIcon(cat.icon)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-text">{cat.name}</p>
                  <p className="text-xs text-text3 font-mono">/{cat.slug}</p>
                </div>
                <div className="flex gap-1.5">
                  <button onClick={()=>{setEditingId(cat.id);setForm({name:cat.name,slug:cat.slug,description:cat.description||'',icon:cat.icon||'BookOpen',color:cat.color})}}
                    className="p-1.5 bg-bg2 hover:bg-blue/10 rounded-lg text-text3 hover:text-blue transition-colors">
                    <Pencil size={14}/>
                  </button>
                  <button onClick={()=>del(cat.id,cat.name)}
                    className="p-1.5 bg-bg2 hover:bg-red/10 rounded-lg text-text3 hover:text-red transition-colors">
                    <Trash2 size={14}/>
                  </button>
                </div>
              </div>
            )}
          </Card>
        ))}
        {categories.length===0 && (
          <Card className="p-10 text-center">
            <Tag size={28} className="text-text3 mx-auto mb-2"/>
            <p className="text-text2 font-medium">Aucune catégorie</p>
            <p className="text-text3 text-sm mt-1">Créez votre première catégorie</p>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
