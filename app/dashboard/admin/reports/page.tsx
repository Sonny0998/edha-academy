'use client'
import { useState } from 'react'
import { createBrowserClient } from '@/lib/supabase/browser'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { Card, Button, Spinner } from '@/components/ui'
import {
  Users, BookOpen, CreditCard, Settings, LayoutDashboard,
  Tag, Activity, Ticket, BarChart2, Download, FileText
} from 'lucide-react'
import toast from 'react-hot-toast'

const navItems = [
  { label: 'Tableau de bord', href: '/dashboard/admin',           icon: <LayoutDashboard size={16} /> },
  { label: 'Utilisateurs',   href: '/dashboard/admin/users',      icon: <Users size={16} /> },
  { label: 'Cours',          href: '/dashboard/admin/courses',     icon: <BookOpen size={16} /> },
  { label: 'Catégories',     href: '/dashboard/admin/categories',  icon: <Tag size={16} /> },
  { label: 'Activité',       href: '/dashboard/admin/activity',    icon: <Activity size={16} /> },
  { label: 'Coupons',        href: '/dashboard/admin/coupons',     icon: <Ticket size={16} /> },
  { label: 'Rapports',       href: '/dashboard/admin/reports',     icon: <BarChart2 size={16} /> },
  { label: 'Paiements',      href: '/dashboard/admin/payments',    icon: <CreditCard size={16} /> },
  { label: 'Paramètres',     href: '/dashboard/admin/settings',    icon: <Settings size={16} /> },
]

function toCSV(rows: any[], columns: { key: string; label: string }[]) {
  const header = columns.map(c => c.label).join(',')
  const lines  = rows.map(row =>
    columns.map(c => {
      const val = String(row[c.key] ?? '').replace(/"/g, '""')
      return `"${val}"`
    }).join(',')
  )
  return [header, ...lines].join('\n')
}

function downloadCSV(content: string, filename: string) {
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

export default function AdminReportsPage() {
  const supabase = createBrowserClient()
  const [loading, setLoading] = useState<string | null>(null)

  const exportStudents = async () => {
    setLoading('students')
    const { data } = await supabase
      .from('profiles').select('full_name,email,country,preferred_language,created_at')
      .eq('role', 'student').order('created_at', { ascending: false })
    if (!data?.length) { toast.error('Aucune donnée'); setLoading(null); return }
    downloadCSV(toCSV(data, [
      { key: 'full_name', label: 'Nom complet' },
      { key: 'email',     label: 'Email' },
      { key: 'country',   label: 'Pays' },
      { key: 'preferred_language', label: 'Langue' },
      { key: 'created_at', label: 'Date inscription' },
    ]), `etudiants_${new Date().toISOString().slice(0,10)}.csv`)
    toast.success(`${data.length} étudiants exportés`)
    setLoading(null)
  }

  const exportInstructors = async () => {
    setLoading('instructors')
    const { data } = await supabase
      .from('profiles').select('full_name,email,institution_name,instructor_approved_at,created_at')
      .eq('role', 'instructor').order('created_at', { ascending: false })
    if (!data?.length) { toast.error('Aucune donnée'); setLoading(null); return }
    downloadCSV(toCSV(data, [
      { key: 'full_name',    label: 'Nom complet' },
      { key: 'email',        label: 'Email' },
      { key: 'institution_name', label: 'Institution' },
      { key: 'instructor_approved_at', label: 'Date approbation' },
      { key: 'created_at',  label: 'Date inscription' },
    ]), `instructeurs_${new Date().toISOString().slice(0,10)}.csv`)
    toast.success(`${data.length} instructeurs exportés`)
    setLoading(null)
  }

  const exportCourses = async () => {
    setLoading('courses')
    const { data } = await supabase
      .from('courses')
      .select('title,status,pricing_model,price,enrolled_count,rating_avg,rating_count,published_at,created_at')
      .order('created_at', { ascending: false })
    if (!data?.length) { toast.error('Aucune donnée'); setLoading(null); return }
    downloadCSV(toCSV(data, [
      { key: 'title',          label: 'Titre' },
      { key: 'status',         label: 'Statut' },
      { key: 'pricing_model',  label: 'Modèle tarifaire' },
      { key: 'price',          label: 'Prix ($)' },
      { key: 'enrolled_count', label: 'Étudiants inscrits' },
      { key: 'rating_avg',     label: 'Note moyenne' },
      { key: 'rating_count',   label: 'Nombre avis' },
      { key: 'published_at',   label: 'Date publication' },
      { key: 'created_at',     label: 'Date création' },
    ]), `cours_${new Date().toISOString().slice(0,10)}.csv`)
    toast.success(`${data.length} cours exportés`)
    setLoading(null)
  }

  const exportEnrollments = async () => {
    setLoading('enrollments')
    const { data } = await supabase
      .from('enrollments')
      .select('student_id,course_id,status,progress_pct,enrolled_at,completed_at')
      .order('enrolled_at', { ascending: false })
    if (!data?.length) { toast.error('Aucune donnée'); setLoading(null); return }
    downloadCSV(toCSV(data, [
      { key: 'student_id',   label: 'ID Étudiant' },
      { key: 'course_id',    label: 'ID Cours' },
      { key: 'status',       label: 'Statut' },
      { key: 'progress_pct', label: 'Progression (%)' },
      { key: 'enrolled_at',  label: 'Date inscription' },
      { key: 'completed_at', label: 'Date complétion' },
    ]), `inscriptions_${new Date().toISOString().slice(0,10)}.csv`)
    toast.success(`${data.length} inscriptions exportées`)
    setLoading(null)
  }

  const exportPayments = async () => {
    setLoading('payments')
    const { data } = await supabase
      .from('payments')
      .select('amount,currency,provider,status,created_at')
      .order('created_at', { ascending: false })
    if (!data?.length) { toast.error('Aucune donnée'); setLoading(null); return }
    downloadCSV(toCSV(data, [
      { key: 'amount',   label: 'Montant' },
      { key: 'currency', label: 'Devise' },
      { key: 'provider', label: 'Méthode' },
      { key: 'status',   label: 'Statut' },
      { key: 'created_at', label: 'Date' },
    ]), `paiements_${new Date().toISOString().slice(0,10)}.csv`)
    toast.success(`${data.length} paiements exportés`)
    setLoading(null)
  }

  const exportCertificates = async () => {
    setLoading('certs')
    const { data } = await supabase
      .from('certificates')
      .select('certificate_number,status,issued_at')
      .order('issued_at', { ascending: false })
    if (!data?.length) { toast.error('Aucune donnée'); setLoading(null); return }
    downloadCSV(toCSV(data, [
      { key: 'certificate_number', label: 'Numéro certificat' },
      { key: 'status',   label: 'Statut' },
      { key: 'issued_at', label: 'Date émission' },
    ]), `certificats_${new Date().toISOString().slice(0,10)}.csv`)
    toast.success(`${data.length} certificats exportés`)
    setLoading(null)
  }

  const reports = [
    { id: 'students',    label: 'Étudiants',       desc: 'Nom, email, pays, langue, date inscription', icon: Users,     action: exportStudents,    color: 'blue' },
    { id: 'instructors', label: 'Instructeurs',     desc: 'Nom, email, institution, date approbation', icon: BookOpen,  action: exportInstructors, color: 'purple' },
    { id: 'courses',     label: 'Cours',            desc: 'Titre, statut, prix, inscrits, notes',       icon: FileText,  action: exportCourses,     color: 'green' },
    { id: 'enrollments', label: 'Inscriptions',     desc: 'Étudiant, cours, progression, statut',       icon: BarChart2, action: exportEnrollments, color: 'yellow' },
    { id: 'payments',    label: 'Paiements',        desc: 'Montant, devise, méthode, statut, date',     icon: CreditCard,action: exportPayments,    color: 'green' },
    { id: 'certs',       label: 'Certificats',      desc: 'Numéro, statut, date émission',              icon: Download,  action: exportCertificates,color: 'yellow' },
  ]

  return (
    <DashboardLayout navItems={navItems} title="Rapports" role="admin">
      <h1 className="text-2xl font-bold text-text mb-2">Rapports & Exports</h1>
      <p className="text-text3 text-sm mb-8">Téléchargez les données de la plateforme en format CSV (compatible Excel, Google Sheets).</p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {reports.map(({ id, label, desc, icon: Icon, action, color }) => (
          <Card key={id} className="p-5 hover:border-blue/30 transition-colors">
            <div className={`w-11 h-11 rounded-xl bg-${color}/10 flex items-center justify-center mb-4`}>
              <Icon size={20} className={`text-${color}`} />
            </div>
            <h3 className="font-semibold text-text mb-1">{label}</h3>
            <p className="text-xs text-text3 mb-5 leading-relaxed">{desc}</p>
            <Button
              onClick={action}
              loading={loading === id}
              variant="secondary"
              className="w-full justify-center"
              size="sm"
            >
              <Download size={13} />
              {loading === id ? 'Génération...' : `Exporter ${label}.csv`}
            </Button>
          </Card>
        ))}
      </div>

      <div className="mt-6 bg-blue/10 border border-blue/20 rounded-xl p-4">
        <p className="text-sm text-blue font-medium mb-1">💡 Conseil</p>
        <p className="text-xs text-blue/80">
          Les fichiers CSV sont encodés en UTF-8 avec BOM pour un affichage correct des accents dans Excel.
          Dans Excel: Données → Depuis texte/CSV → sélectionner le fichier.
        </p>
      </div>
    </DashboardLayout>
  )
}
