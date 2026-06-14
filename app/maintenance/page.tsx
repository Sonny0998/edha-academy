import Link from 'next/link'
import { Wrench, Clock } from 'lucide-react'

export default function MaintenancePage() {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="max-w-md text-center">
        <div className="w-20 h-20 bg-yellow/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Wrench size={36} className="text-yellow"/>
        </div>
        <h1 className="text-2xl font-bold text-text mb-3">Maintenance en cours</h1>
        <p className="text-text2 mb-6 leading-relaxed">
          EDHA Academy est temporairement indisponible pour maintenance. Nous serons de retour très bientôt !
        </p>
        <div className="flex items-center justify-center gap-2 text-text3 text-sm">
          <Clock size={15}/> Durée estimée : moins d&apos;une heure
        </div>
        <p className="mt-6 text-xs text-text3">
          Contactez-nous : <a href="mailto:contact@edhaacademy.ht" className="text-blue hover:underline">contact@edhaacademy.ht</a>
        </p>
      </div>
    </div>
  )
}
