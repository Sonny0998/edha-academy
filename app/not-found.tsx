import Link from 'next/link'
import { GraduationCap, Home, Search } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-blue/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <GraduationCap size={32} className="text-blue" />
        </div>
        <h1 className="text-6xl font-bold text-text mb-3">404</h1>
        <h2 className="text-xl font-semibold text-text mb-2">Page introuvable</h2>
        <p className="text-text3 mb-8">La page que vous cherchez n'existe pas ou a été déplacée.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/" className="flex items-center justify-center gap-2 bg-blue hover:bg-blue2 text-white px-6 py-3 rounded-xl font-medium transition-colors text-sm">
            <Home size={16} /> Accueil
          </Link>
          <Link href="/cursos" className="flex items-center justify-center gap-2 bg-card2 border border-border text-text px-6 py-3 rounded-xl font-medium hover:bg-card transition-colors text-sm">
            <Search size={16} /> Explorer les cours
          </Link>
        </div>
      </div>
    </div>
  )
}
