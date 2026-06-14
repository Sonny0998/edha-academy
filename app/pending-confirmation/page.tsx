import Link from 'next/link'
import { CheckCircle, Mail, Clock } from 'lucide-react'

export default function PendingConfirmationPage() {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <Link href="/" className="inline-flex items-center gap-3 mb-10">
          <img src="/logo.png" alt="EDHA" className="h-10 w-auto"  />
          <span className="font-bold text-xl text-text">EDHA <span className="text-cyan">Academy</span></span>
        </Link>

        <div className="bg-card border border-border rounded-3xl p-10 shadow-sm">
          <div className="w-20 h-20 bg-green/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={40} className="text-green" />
          </div>

          <h1 className="text-2xl font-bold text-text mb-3">Demande envoyée !</h1>
          <p className="text-text2 leading-relaxed mb-6">
            Votre dossier a été soumis avec succès à l&apos;équipe EDHA Academy.
          </p>

          <div className="bg-bg2 border border-border rounded-xl p-5 mb-6 text-left space-y-3">
            <div className="flex items-center gap-3">
              <Mail size={18} className="text-blue flex-shrink-0" />
              <p className="text-sm text-text">Un email de confirmation vous a été envoyé</p>
            </div>
            <div className="flex items-center gap-3">
              <Clock size={18} className="text-yellow flex-shrink-0" />
              <p className="text-sm text-text">Délai d&apos;examen : <strong>48 heures maximum</strong></p>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle size={18} className="text-green flex-shrink-0" />
              <p className="text-sm text-text">Vous serez notifié par email dès approbation</p>
            </div>
          </div>

          <div className="bg-blue/5 border border-blue/20 rounded-xl p-4 mb-6 text-sm text-blue/90 text-left">
            <strong>📌 Note :</strong> Vous ne pouvez pas vous connecter tant que votre compte n&apos;est pas approuvé.
            Vérifiez votre boîte email (et les spams).
          </div>

          <Link href="/"
            className="block w-full text-center bg-bg2 border border-border text-text hover:bg-border py-3 rounded-xl text-sm font-medium transition-colors">
            Retour à l&apos;accueil
          </Link>
        </div>

        <p className="text-xs text-text3 mt-6">
          Questions ? <a href="mailto:contact@edhaacademy.ht" className="text-blue hover:underline">contact@edhaacademy.ht</a>
        </p>
      </div>
    </div>
  )
}
