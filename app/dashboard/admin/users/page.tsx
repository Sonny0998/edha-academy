'use client'
import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase/browser'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { Card, Badge, Avatar, Spinner, Button } from '@/components/ui'
import {
  Users, BookOpen, CreditCard, Settings, LayoutDashboard, Tag, Activity, Ticket, BarChart2,
  Search, CheckCircle, XCircle, Eye, FileText, X, Download, Shield, User, Building2
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

export default function AdminUsersPage() {
  const supabase = createBrowserClient()
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all'|'student'|'instructor'|'admin'>('all')
  const [selectedUser, setSelectedUser] = useState<any|null>(null)

  const load = async () => {
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
    setUsers(data || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const approveInstructor = async (id: string, approve: boolean) => {
    const user = users.find(u => u.id === id)
    await supabase.from('profiles').update({
      instructor_approved_at: approve ? new Date().toISOString() : null,
      ...(approve ? {} : { role: 'student', instructor_application: null })
    }).eq('id', id)
    if (user) {
      await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: approve ? 'instructor_approved' : 'instructor_rejected',
          userId: id, email: user.email, name: user.full_name,
        }),
      })
    }
    toast.success(approve ? '✅ Instructeur approuvé — email envoyé !' : '❌ Demande refusée — email envoyé')
    load()
  }

  const changeRole = async (id: string, role: string, currentName: string) => {
    if (role === 'admin') {
      const ok = confirm(`⚠️ Êtes-vous certain de vouloir donner les droits ADMIN à "${currentName}" ?`)
      if (!ok) return
    }
    await supabase.from('profiles').update({ role }).eq('id', id)
    toast.success(`Rôle modifié → ${role}`)
    load()
  }

  const filtered = users.filter(u => {
    const matchRole = filter === 'all' || u.role === filter
    const matchSearch = !search || u.full_name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase())
    return matchRole && matchSearch
  })

  const pending = users.filter(u => u.role === 'instructor' && !u.instructor_approved_at)

  if (loading) return (
    <DashboardLayout navItems={navItems} title="Utilisateurs" role="admin">
      <div className="flex items-center justify-center h-64"><Spinner size="lg"/></div>
    </DashboardLayout>
  )

  return (
    <DashboardLayout navItems={navItems} title="Utilisateurs" role="admin">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text">Utilisateurs <span className="text-text3 font-normal text-lg">({users.length})</span></h1>
          {pending.length > 0 && (
            <p className="text-sm text-yellow flex items-center gap-1.5 mt-0.5">
              ⏳ {pending.length} instructeur{pending.length>1?'s':''} en attente d'approbation
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text3"/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher..."
            className="w-full bg-card border border-border rounded-xl pl-9 pr-4 py-2 text-sm text-text outline-none focus:border-blue/50"/>
        </div>
        <div className="flex gap-1.5">
          {(['all','student','instructor','admin'] as const).map(r => (
            <button key={r} onClick={()=>setFilter(r)}
              className={clsx('text-xs px-3 py-2 rounded-xl transition-colors font-medium',
                filter===r ? 'edha-gradient text-white' : 'bg-card border border-border text-text2 hover:text-text')}>
              {r==='all'?'Tous':r==='student'?'Étudiants':r==='instructor'?'Instructeurs':'Admins'}
              {' '}({users.filter(u=>r==='all'||u.role===r).length})
            </button>
          ))}
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-bg2 text-left">
                <th className="py-3 px-4 text-xs font-semibold text-text3 uppercase tracking-wider">Utilisateur</th>
                <th className="py-3 px-4 text-xs font-semibold text-text3 uppercase tracking-wider">Rôle</th>
                <th className="py-3 px-4 text-xs font-semibold text-text3 uppercase tracking-wider hidden sm:table-cell">Inscription</th>
                <th className="py-3 px-4 text-xs font-semibold text-text3 uppercase tracking-wider">Statut</th>
                <th className="py-3 px-4 text-xs font-semibold text-text3 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(u => (
                <tr key={u.id} className="hover:bg-bg2 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <Avatar src={u.avatar_url} name={u.full_name} size="sm"/>
                      <div className="min-w-0">
                        <p className="font-medium text-text truncate">{u.full_name}</p>
                        <p className="text-xs text-text3 truncate">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant={u.role==='admin'?'purple':u.role==='instructor'?'blue':'green'}>
                      {u.role==='admin'?'Admin':u.role==='instructor'?'Instructeur':'Étudiant'}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-text3 text-xs hidden sm:table-cell">
                    {new Date(u.created_at).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="py-3 px-4">
                    {u.role==='instructor' && !u.instructor_approved_at && <Badge variant="yellow">⏳ En attente</Badge>}
                    {u.role==='instructor' && u.instructor_approved_at && <Badge variant="green">✓ Approuvé</Badge>}
                    {u.role==='student' && <Badge variant="default">Actif</Badge>}
                    {u.role==='admin' && <Badge variant="purple"><Shield size={9}/> Admin</Badge>}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1.5 justify-end">
                      <button onClick={()=>setSelectedUser(u)} title="Voir détails"
                        className="p-1.5 bg-bg2 hover:bg-blue/10 rounded-lg text-text3 hover:text-blue transition-colors">
                        <Eye size={14}/>
                      </button>
                      {u.role==='instructor' && !u.instructor_approved_at && (<>
                        <button onClick={()=>approveInstructor(u.id,true)} title="Approuver"
                          className="p-1.5 bg-green/10 hover:bg-green/20 rounded-lg text-green transition-colors">
                          <CheckCircle size={14}/>
                        </button>
                        <button onClick={()=>approveInstructor(u.id,false)} title="Refuser"
                          className="p-1.5 bg-red/10 hover:bg-red/20 rounded-lg text-red transition-colors">
                          <XCircle size={14}/>
                        </button>
                      </>)}
                      {u.role!=='admin' && (
                        <select onChange={e=>changeRole(u.id,e.target.value,u.full_name)} defaultValue=""
                          className="text-xs bg-bg2 border border-border rounded-lg px-2 py-1.5 text-text3 outline-none">
                          <option value="" disabled>Changer rôle</option>
                          <option value="student">→ Étudiant</option>
                          <option value="instructor">→ Instructeur</option>
                          <option value="admin">→ Admin</option>
                        </select>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-10 text-text3">Aucun utilisateur trouvé</div>
          )}
        </div>
      </Card>

      {/* Modal détail instructeur */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={()=>setSelectedUser(null)}/>
          <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="h-1 rounded-t-2xl bg-gradient-to-r from-blue via-cyan to-gold"/>
            <div className="p-6">
              <div className="flex items-start justify-between mb-5">
                <div className="flex items-center gap-3">
                  <Avatar src={selectedUser.avatar_url} name={selectedUser.full_name} size="lg"/>
                  <div>
                    <h2 className="text-lg font-bold text-text">{selectedUser.full_name}</h2>
                    <p className="text-sm text-text3">{selectedUser.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={selectedUser.role==='admin'?'purple':selectedUser.role==='instructor'?'blue':'green'}>
                        {selectedUser.role}
                      </Badge>
                      {selectedUser.instructor_approved_at && <Badge variant="green">✓ Approuvé</Badge>}
                      {selectedUser.role==='instructor' && !selectedUser.instructor_approved_at && <Badge variant="yellow">⏳ En attente</Badge>}
                    </div>
                  </div>
                </div>
                <button onClick={()=>setSelectedUser(null)} className="p-2 hover:bg-bg2 rounded-lg text-text3 hover:text-text">
                  <X size={18}/>
                </button>
              </div>

              {selectedUser.institution_name && (
                <div className="bg-blue/5 border border-blue/10 rounded-xl p-3 mb-4 flex items-center gap-2">
                  <Building2 size={15} className="text-blue"/>
                  <span className="text-sm text-text font-medium">{selectedUser.institution_name}</span>
                </div>
              )}

              {selectedUser.instructor_application ? (
                <div className="space-y-4">

                  {/* Type de demande */}
                  <div className="flex items-center gap-2 bg-blue/5 border border-blue/10 rounded-xl px-4 py-2.5">
                    <span className="text-xs font-semibold text-blue uppercase tracking-wide">
                      {selectedUser.instructor_application.type === 'institution' ? '🏫 Institution' : '👤 Instructeur individuel'}
                    </span>
                    {selectedUser.instructor_application.experience_years && (
                      <span className="ml-auto text-xs text-text3">
                        Expérience : <strong>{selectedUser.instructor_application.experience_years}</strong> ans
                      </span>
                    )}
                  </div>

                  {/* Bio */}
                  {selectedUser.bio && (
                    <div className="bg-bg2 rounded-xl p-4">
                      <p className="text-xs font-semibold text-text3 uppercase tracking-wider mb-2">👤 Bio</p>
                      <p className="text-sm text-text2 leading-relaxed">{selectedUser.bio}</p>
                    </div>
                  )}

                  {/* Website */}
                  {selectedUser.website && (
                    <div className="flex items-center gap-2 bg-bg2 rounded-xl px-4 py-2.5">
                      <span className="text-xs text-text3">🌐 Site web :</span>
                      <a href={selectedUser.website} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-blue hover:underline">{selectedUser.website}</a>
                    </div>
                  )}

                  {/* Institution details */}
                  {selectedUser.instructor_application.type === 'institution' && (
                    <div className="bg-bg2 rounded-xl p-4 space-y-2">
                      <p className="text-xs font-semibold text-text3 uppercase tracking-wider mb-3">🏫 Détails de l'institution</p>
                      {selectedUser.instructor_application.director_name && (
                        <div className="flex justify-between text-sm">
                          <span className="text-text3">Directeur</span>
                          <span className="font-medium text-text">{selectedUser.instructor_application.director_name}</span>
                        </div>
                      )}
                      {selectedUser.instructor_application.institution_type && (
                        <div className="flex justify-between text-sm">
                          <span className="text-text3">Type</span>
                          <span className="font-medium text-text">{selectedUser.instructor_application.institution_type.replace(/_/g, ' ')}</span>
                        </div>
                      )}
                      {selectedUser.instructor_application.institution_address && (
                        <div className="flex justify-between text-sm">
                          <span className="text-text3">Adresse</span>
                          <span className="font-medium text-text">{selectedUser.instructor_application.institution_address}</span>
                        </div>
                      )}
                      {selectedUser.instructor_application.registration_number && (
                        <div className="flex justify-between text-sm">
                          <span className="text-text3">N° enregistrement</span>
                          <span className="font-medium text-text">{selectedUser.instructor_application.registration_number}</span>
                        </div>
                      )}
                      {selectedUser.instructor_application.phone && (
                        <div className="flex justify-between text-sm">
                          <span className="text-text3">Téléphone</span>
                          <span className="font-medium text-text">{selectedUser.instructor_application.phone}</span>
                        </div>
                      )}
                      {selectedUser.instructor_application.institution_description && (
                        <div className="pt-2 border-t border-border">
                          <p className="text-xs text-text3 mb-1">Description</p>
                          <p className="text-sm text-text2 leading-relaxed">{selectedUser.instructor_application.institution_description}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Qualifications */}
                  {selectedUser.instructor_application.qualifications && (
                    <div className="bg-bg2 rounded-xl p-4">
                      <p className="text-xs font-semibold text-text3 uppercase tracking-wider mb-2">📋 Qualifications & Expérience</p>
                      <p className="text-sm text-text2 leading-relaxed whitespace-pre-wrap">{selectedUser.instructor_application.qualifications}</p>
                    </div>
                  )}

                  {/* Motivation */}
                  {selectedUser.instructor_application.motivation && (
                    <div className="bg-bg2 rounded-xl p-4">
                      <p className="text-xs font-semibold text-text3 uppercase tracking-wider mb-2">💡 Motivation</p>
                      <p className="text-sm text-text2 leading-relaxed whitespace-pre-wrap">{selectedUser.instructor_application.motivation}</p>
                    </div>
                  )}

                  {/* CV */}
                  {selectedUser.instructor_application.cv_url && (
                    <div className="bg-bg2 rounded-xl p-4">
                      <p className="text-xs font-semibold text-text3 uppercase tracking-wider mb-3">📄 Document principal / CV</p>
                      <a href={selectedUser.instructor_application.cv_url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3 hover:border-blue/30 transition-colors group">
                        <FileText size={18} className="text-blue flex-shrink-0"/>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-text truncate">{selectedUser.instructor_application.cv_name || 'Document principal'}</p>
                          <p className="text-xs text-text3">Cliquez pour ouvrir</p>
                        </div>
                        <Download size={15} className="text-text3 group-hover:text-blue"/>
                      </a>
                    </div>
                  )}

                  {/* Documents supplémentaires */}
                  {selectedUser.instructor_application.documents?.length > 0 && (
                    <div className="bg-bg2 rounded-xl p-4">
                      <p className="text-xs font-semibold text-text3 uppercase tracking-wider mb-3">
                        📁 Documents supplémentaires ({selectedUser.instructor_application.documents.length})
                      </p>
                      <div className="space-y-2">
                        {selectedUser.instructor_application.documents.map((doc: any, i: number) => (
                          <a key={i} href={doc.url} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-2.5 hover:border-blue/30 group">
                            <FileText size={14} className="text-gold"/>
                            <p className="text-sm text-text flex-1 truncate">{doc.name}</p>
                            <Download size={13} className="text-text3 group-hover:text-blue"/>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Fecha envío */}
                  <div className="flex items-center justify-between bg-bg2 rounded-xl px-4 py-2.5 text-xs text-text3">
                    <span>Soumis le {new Date(selectedUser.instructor_application.submitted_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                    <Badge variant={selectedUser.instructor_approved_at ? 'green' : 'yellow'}>
                      {selectedUser.instructor_approved_at ? '✓ Approuvé' : '⏳ En attente'}
                    </Badge>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-text3">
                  <User size={24} className="mx-auto mb-2"/>
                  <p className="text-sm">Aucune demande d'inscription soumise</p>
                </div>
              )}

              {/* Botones aprobar/rechazar */}
              {!selectedUser.instructor_approved_at && selectedUser.role === 'instructor' && (
                <div className="flex gap-3 mt-5 pt-4 border-t border-border">
                  <button onClick={() => { approveInstructor(selectedUser.id, true); setSelectedUser(null) }}
                    className="flex-1 flex items-center justify-center gap-2 bg-green/10 hover:bg-green/20 text-green border border-green/20 py-2.5 rounded-xl text-sm font-medium transition-colors">
                    <CheckCircle size={16}/> Approuver l'instructeur
                  </button>
                  <button onClick={() => { approveInstructor(selectedUser.id, false); setSelectedUser(null) }}
                    className="flex-1 flex items-center justify-center gap-2 bg-red/10 hover:bg-red/20 text-red border border-red/20 py-2.5 rounded-xl text-sm font-medium transition-colors">
                    <XCircle size={16}/> Refuser la demande
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}