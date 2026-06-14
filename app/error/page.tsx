'use client'
import Link from 'next/link'
import { AlertTriangle, Home } from 'lucide-react'

export default function ErrorPage() {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-red/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <AlertTriangle size={32} className="text-red" />
        </div>
        <h1 className="text-2xl font-bold text-text mb-2">Une erreur est survenue</h1>
        <p className="text-text3 mb-8">Quelque chose s'est mal passé. Veuillez réessayer.</p>
        <Link href="/" className="inline-flex items-center gap-2 bg-blue hover:bg-blue2 text-white px-6 py-3 rounded-xl font-medium transition-colors text-sm">
          <Home size={16} /> Retour à l'accueil
        </Link>
      </div>
    </div>
  )
}
