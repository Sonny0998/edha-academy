'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { Spinner } from '@/components/ui'
import { Play, ShoppingCart } from 'lucide-react'
import toast from 'react-hot-toast'

interface CheckoutButtonProps {
  courseId: string
  courseSlug: string
  pricingModel: string
  price?: number
  isEnrolled?: boolean
}

export default function CheckoutButton({ courseId, courseSlug, pricingModel, price, isEnrolled }: CheckoutButtonProps) {
  const { isAuthenticated } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleAction = async () => {
    if (!isAuthenticated) {
      router.push(`/auth/login?redirect=/cursos/${courseSlug}`)
      return
    }

    if (isEnrolled) {
      router.push(`/learn/${courseSlug}`)
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ course_id: courseId }),
      })
      const data = await res.json()

      if (data.requires_payment) {
        toast.error('Ce cours est payant. Les paiements seront disponibles bientôt.')
      } else if (data.enrolled) {
        toast.success('Inscription réussie !')
        router.push(`/learn/${courseSlug}`)
      } else {
        toast.error(data.error || 'Erreur lors de l\'inscription')
      }
    } catch {
      toast.error('Une erreur est survenue')
    }
    setLoading(false)
  }

  if (isEnrolled) {
    return (
      <button onClick={handleAction}
        className="w-full flex items-center justify-center gap-2 bg-green hover:bg-green/90 text-white font-semibold py-3.5 rounded-xl transition-colors text-sm">
        <Play size={16} fill="white" /> Continuer le cours
      </button>
    )
  }

  if (pricingModel === 'free') {
    return (
      <button onClick={handleAction} disabled={loading}
        className="w-full flex items-center justify-center gap-2 bg-blue hover:bg-blue2 text-white font-semibold py-3.5 rounded-xl transition-colors text-sm disabled:opacity-60">
        {loading ? <Spinner size="sm" /> : <Play size={16} />}
        {loading ? 'Inscription...' : 'S\'inscrire gratuitement'}
      </button>
    )
  }

  return (
    <button onClick={handleAction} disabled={loading}
      className="w-full flex items-center justify-center gap-2 bg-blue hover:bg-blue2 text-white font-semibold py-3.5 rounded-xl transition-colors text-sm disabled:opacity-60">
      {loading ? <Spinner size="sm" /> : <ShoppingCart size={16} />}
      {loading ? 'Traitement...' : `Acheter — $${price}`}
    </button>
  )
}
