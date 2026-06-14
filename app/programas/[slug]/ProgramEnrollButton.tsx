'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import toast from 'react-hot-toast'
import { BookOpen, ArrowRight, CheckCircle } from 'lucide-react'

interface Props {
  programId: string
  pricingModel: string
  price?: number
  userEnrollment: any
  firstCourseSlug?: string
}

export default function ProgramEnrollButton({
  programId, pricingModel, price, userEnrollment, firstCourseSlug
}: Props) {
  const { isAuthenticated } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  if (userEnrollment) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 bg-green/10 border border-green/20 rounded-xl px-4 py-3">
          <CheckCircle size={16} className="text-green" />
          <div>
            <p className="text-sm font-semibold text-green">Inscrit</p>
            <p className="text-xs text-text3">{userEnrollment.progress_pct}% complété</p>
          </div>
        </div>
        {firstCourseSlug && (
          <button
            onClick={() => router.push(`/cursos/${firstCourseSlug}`)}
            className="w-full flex items-center justify-center gap-2 text-white font-semibold py-3 rounded-xl edha-gradient hover:opacity-90 transition-opacity"
          >
            Continuer le programme <ArrowRight size={15} />
          </button>
        )}
      </div>
    )
  }

  const handleEnroll = async () => {
    if (!isAuthenticated) {
      router.push(`/auth/inscription?redirect=/programas/${programId}`)
      return
    }

    if (pricingModel !== 'free') {
      toast.error('Le paiement pour les programmes sera disponible bientôt.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/programs/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ program_id: programId }),
      })
      const data = await res.json()
      if (data.enrolled) {
        toast.success('Inscription réussie ! Bonne formation !')
        if (firstCourseSlug) router.push(`/cursos/${firstCourseSlug}`)
        else router.refresh()
      } else {
        toast.error(data.error || 'Erreur lors de l\'inscription')
      }
    } catch {
      toast.error('Erreur réseau')
    }
    setLoading(false)
  }

  return (
    <button
      onClick={handleEnroll}
      disabled={loading}
      className="w-full flex items-center justify-center gap-2 text-white font-semibold py-3 rounded-xl edha-gradient hover:opacity-90 transition-opacity disabled:opacity-50"
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      ) : (
        <BookOpen size={15} />
      )}
      {pricingModel === 'free' ? 'S\'inscrire gratuitement' : `S\'inscrire — $${price} USD`}
    </button>
  )
}