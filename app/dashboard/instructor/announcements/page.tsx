'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { instructorNav } from '@/lib/nav'
import { createBrowserClient } from '@/lib/supabase/browser'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { Card, Button, Spinner, Avatar } from '@/components/ui'
import { LayoutDashboard, BookOpen, BarChart2, User, MessageSquare, Megaphone, Plus, X, Send } from 'lucide-react'
import toast from 'react-hot-toast'

const navItems = [
  { label: 'Tableau de bord', href: '/dashboard/instructor',            icon: <LayoutDashboard size={16} /> },
  { label: 'Mes cours',       href: '/dashboard/instructor/courses',     icon: <BookOpen size={16} /> },
  { label: 'Messages Q&A',   href: '/dashboard/instructor/messages',    icon: <MessageSquare size={16} /> },
  { label: 'Annonces',       href: '/dashboard/instructor/announcements',icon: <Megaphone size={16} /> },
  { label: 'Analytiques',    href: '/dashboard/instructor/analytics',   icon: <BarChart2 size={16} /> },
  { label: 'Mon profil',     href: '/dashboard/instructor/profile',     icon: <User size={16} /> },
]

export default function AnnouncementsPage() {
  const { profile } = useAuth()
  const supabase = createBrowserClient()
  const [courses, setCourses] = useState<any[]>([])
  const [selectedCourse, setSelectedCourse] = useState('')
  const [announcements, setAnnouncements] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ title: '', body: '' })

  useEffect(() => {
    if (!profile) return
    supabase.from('courses').select('id,title,enrolled_count').eq('instructor_id', profile.id).eq('status', 'published')
      .then(({ data }) => {
        setCourses(data || [])
        if (data && data.length > 0) setSelectedCourse(data[0].id)
      })
  }, [profile])

  useEffect(() => {
    if (!selectedCourse) return
    setLoading(true)
    fetch(`/api/announcements?course_id=${selectedCourse}`)
      .then(r => r.json())
      .then(d => { setAnnouncements(d.announcements || []); setLoading(false) })
  }, [selectedCourse])

  const send = async () => {
    if (!form.title.trim() || !form.body.trim()) { toast.error('Titre et contenu requis'); return }
    setSaving(true)
    const res = await fetch('/api/announcements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ course_id: selectedCourse, title: form.title, body: form.body })
    })
    const data = await res.json()
    if (!res.ok) { toast.error(data.error); setSaving(false); return }
    setAnnouncements(a => [data.announcement, ...a])
    setForm({ title: '', body: '' })
    setShowForm(false)
    const course = courses.find(c => c.id === selectedCourse)
    toast.success(`Annonce envoyée à ${course?.enrolled_count || 0} étudiants !`)
    setSaving(false)
  }

  return (
    <DashboardLayout navItems={instructorNav} title="Annonces" role="instructor">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text">Annonces aux étudiants</h1>
          <p className="text-text3 text-sm mt-0.5">Communiquez avec tous vos inscrits</p>
        </div>
        <Button onClick={() => setShowForm(true)} disabled={!selectedCourse}>
          <Plus size={15} /> Nouvelle annonce
        </Button>
      </div>

      {courses.length > 1 && (
        <div className="mb-5">
          <select value={selectedCourse} onChange={e => setSelectedCourse(e.target.value)}
            className="bg-card2 border border-border rounded-xl px-4 py-2.5 text-sm text-text outline-none focus:border-blue">
            {courses.map(c => <option key={c.id} value={c.id}>{c.title} ({c.enrolled_count} inscrits)</option>)}
          </select>
        </div>
      )}

      {/* New announcement form */}
      {showForm && (
        <Card className="p-5 mb-5 border-blue/20">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-text flex items-center gap-2"><Megaphone size={16} className="text-cyan" /> Nouvelle annonce</h2>
            <button onClick={() => setShowForm(false)} className="text-text3 hover:text-text"><X size={16} /></button>
          </div>
          <div className="space-y-3">
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Titre de l'annonce..."
              className="w-full bg-card2 border border-border rounded-xl px-4 py-2.5 text-sm text-text outline-none focus:border-blue transition-colors" />
            <textarea value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
              placeholder="Message à envoyer à tous vos étudiants inscrits dans ce cours..."
              rows={5}
              className="w-full bg-card2 border border-border rounded-xl px-4 py-3 text-sm text-text outline-none focus:border-blue transition-colors resize-none" />
            <div className="flex items-center gap-3">
              <Button loading={saving} onClick={send}><Send size={14} /> Envoyer l'annonce</Button>
              <Button variant="secondary" onClick={() => setShowForm(false)}>Annuler</Button>
              {selectedCourse && (
                <p className="text-xs text-text3 ml-auto">
                  Envoi à {courses.find(c => c.id === selectedCourse)?.enrolled_count || 0} étudiants
                </p>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Announcements list */}
      {courses.length === 0 ? (
        <Card className="p-8 text-center">
          <Megaphone size={32} className="text-text3 mx-auto mb-3" />
          <p className="text-text2">Publiez d'abord un cours pour envoyer des annonces.</p>
        </Card>
      ) : loading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : announcements.length === 0 ? (
        <Card className="p-8 text-center">
          <Megaphone size={28} className="text-text3 mx-auto mb-2" />
          <p className="text-text2 font-medium">Aucune annonce envoyée</p>
          <p className="text-text3 text-sm mt-1">Informez vos étudiants d'une mise à jour, d'un nouveau contenu ou d'un événement.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {announcements.map((a: any) => (
            <Card key={a.id} className="p-5">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue/10 flex items-center justify-center flex-shrink-0">
                  <Megaphone size={16} className="text-cyan" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-text">{a.title}</h3>
                    <span className="text-xs text-text3">{new Date(a.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                  </div>
                  <p className="text-sm text-text2 leading-relaxed whitespace-pre-wrap">{a.body}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </DashboardLayout>
  )
}
