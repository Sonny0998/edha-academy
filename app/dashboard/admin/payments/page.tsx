'use client'
import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase/browser'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { Card, Badge, Spinner } from '@/components/ui'
import { Users, BookOpen, CreditCard, Settings, LayoutDashboard, Tag, Activity, Ticket, BarChart2, DollarSign } from 'lucide-react'

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

export default function AdminPaymentsPage() {
  const supabase = createBrowserClient()
  const [payments, setPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('payments').select('*,student:profiles!student_id(full_name,email),course:courses(title)').order('created_at', { ascending: false })
      .then(({ data }) => { setPayments(data || []); setLoading(false) })
  }, [])

  const totalRevenue = payments.filter(p => p.status === 'completed').reduce((s, p) => s + p.amount, 0)

  const STATUS_COLORS: Record<string, any> = { completed: 'green', pending: 'yellow', failed: 'red', refunded: 'default' }

  if (loading) return <DashboardLayout navItems={navItems} title="Paiements" role="admin"><div className="flex items-center justify-center h-64"><Spinner size="lg" /></div></DashboardLayout>

  return (
    <DashboardLayout navItems={navItems} title="Paiements" role="admin">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-text">Paiements</h1>
        <div className="bg-green/10 border border-green/20 rounded-xl px-4 py-2 flex items-center gap-2">
          <DollarSign size={16} className="text-green" />
          <span className="text-green font-semibold">${totalRevenue.toFixed(2)} total</span>
        </div>
      </div>
      {payments.length === 0 ? (
        <Card className="p-8 text-center"><p className="text-text3">Aucun paiement enregistré</p></Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-text3 text-xs border-b border-border">
                <th className="text-left px-5 py-3">Étudiant</th>
                <th className="text-left px-5 py-3">Cours</th>
                <th className="text-left px-5 py-3">Montant</th>
                <th className="text-left px-5 py-3">Méthode</th>
                <th className="text-left px-5 py-3">Statut</th>
                <th className="text-left px-5 py-3">Date</th>
              </tr></thead>
              <tbody className="divide-y divide-border">
                {payments.map(p => (
                  <tr key={p.id} className="hover:bg-card2/50">
                    <td className="px-5 py-3">
                      <p className="text-text font-medium">{p.student?.full_name}</p>
                      <p className="text-xs text-text3">{p.student?.email}</p>
                    </td>
                    <td className="px-5 py-3 text-text2 max-w-xs truncate">{p.course?.title || '—'}</td>
                    <td className="px-5 py-3 font-medium text-text">{p.currency} {p.amount}</td>
                    <td className="px-5 py-3 text-text3">{p.provider}</td>
                    <td className="px-5 py-3"><Badge variant={STATUS_COLORS[p.status]}>{p.status}</Badge></td>
                    <td className="px-5 py-3 text-text3 text-xs">{new Date(p.created_at).toLocaleDateString('fr-FR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </DashboardLayout>
  )
}
