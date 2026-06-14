'use client'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { Clock, Mail, CheckCircle, FileText, ArrowLeft, LogOut } from 'lucide-react'

export default function PendingPage() {
  const { profile, signOut } = useAuth()

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="w-full max-w-lg text-center">
        {/* Logo */}
        <Link href="/" className="inline-flex items-center gap-3 mb-10">
          <img src="/logo.png" alt="EDHA" className="h-10 w-auto"  />
          <span className="font-bold text-xl text-text">EDHA <span className="text-cyan">Academy</span></span>
        </Link>

        {/* Main card */}
        <div className="bg-card border border-border rounded-3xl p-10 shadow-sm">
          {/* Animated clock icon */}
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="w-20 h-20 bg-yellow/10 rounded-full flex items-center justify-center">
              <Clock size={36} className="text-yellow" />
            </div>
            <div className="absolute inset-0 rounded-full border-2 border-yellow/30 animate-ping" />
          </div>

          <h1 className="text-2xl font-bold text-text mb-3">
            Demande en cours d&apos;examen
          </h1>
          <p className="text-text2 leading-relaxed mb-6">
            Merci {profile?.full_name?.split(' ')[0]} ! Votre dossier a été soumis avec succès.
            Notre équipe va l&apos;examiner dans les prochaines <strong>48 heures</strong>.
          </p>

          {/* Status steps */}
          <div className="text-left space-y-3 mb-8">
            {[
              { icon: CheckCircle, label: 'Dossier soumis', done: true, color: 'text-green' },
              { icon: Clock,       label: 'Examen par l\'équipe EDHA', done: false, color: 'text-yellow', active: true },
              { icon: Mail,        label: 'Email de confirmation', done: false, color: 'text-text3' },
              { icon: CheckCircle, label: 'Accès à la plateforme', done: false, color: 'text-text3' },
            ].map(({ icon: Icon, label, done, color, active }) => (
              <div key={label} className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${active ? 'bg-yellow/5 border border-yellow/20' : 'bg-bg2'}`}>
                <Icon size={18} className={color} />
                <span className={`text-sm font-medium ${done ? 'text-green' : active ? 'text-yellow' : 'text-text3'}`}>
                  {label}
                </span>
                {done && <span className="ml-auto text-xs text-green font-medium">✓ Complété</span>}
                {active && <span className="ml-auto text-xs text-yellow font-medium">En cours…</span>}
              </div>
            ))}
          </div>

          {/* Info box */}
          <div className="bg-blue/5 border border-blue/20 rounded-xl p-4 mb-6 text-left">
            <p className="text-sm text-blue font-medium mb-1.5 flex items-center gap-2">
              <Mail size={14} /> Un email vous a été envoyé à {profile?.email}
            </p>
            <p className="text-xs text-text3 leading-relaxed">
              Vérifiez votre boîte de réception (et les spams). Vous serez notifié dès que votre compte sera approuvé ou si des informations supplémentaires sont nécessaires.
            </p>
          </div>

          {/* Documents reminder */}
          {profile?.instructor_application && !profile.instructor_application.cv_url && (
            <div className="bg-yellow/5 border border-yellow/20 rounded-xl p-4 mb-6 text-left">
              <p className="text-sm text-yellow font-medium flex items-center gap-2">
                <FileText size={14} /> Conseil : Ajoutez votre CV
              </p>
              <p className="text-xs text-text3 mt-1">
                Les dossiers avec CV sont traités plus rapidement. Contactez-nous pour en ajouter un.
              </p>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Link href="/"
              className="flex items-center justify-center gap-2 bg-bg2 border border-border text-text2 hover:text-text px-5 py-2.5 rounded-xl text-sm font-medium transition-colors">
              <ArrowLeft size={14} /> Retour à l&apos;accueil
            </Link>
            <button onClick={signOut}
              className="flex items-center justify-center gap-2 text-red hover:bg-red/10 px-5 py-2.5 rounded-xl text-sm transition-colors">
              <LogOut size={14} /> Se déconnecter
            </button>
          </div>
        </div>

        <p className="text-xs text-text3 mt-6">
          Des questions ? Écrivez-nous à{' '}
          <a href="mailto:contact@edhaacademy.ht" className="text-blue hover:underline">contact@edhaacademy.ht</a>
        </p>
      </div>
    </div>
  )
}
