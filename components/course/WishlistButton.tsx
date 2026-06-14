'use client'

import { useState, useEffect } from 'react'
import { Heart } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import clsx from 'clsx'
import toast from 'react-hot-toast'

interface Props {
  courseId: string
  size?: 'sm' | 'md'
  className?: string
}

export default function WishlistButton({ courseId, size = 'md', className }: Props) {
  const { isAuthenticated } = useAuth()
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isAuthenticated) return
    fetch('/api/wishlist')
      .then(r => r.json())
      .then(d => { if (d.items) setSaved(d.items.includes(courseId)) })
  }, [courseId, isAuthenticated])

  const toggle = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!isAuthenticated) {
      toast.error('Connectez-vous pour sauvegarder ce cours')
      return
    }
    setLoading(true)
    const res = await fetch('/api/wishlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ course_id: courseId }),
    })
    const data = await res.json()
    if (data.saved !== undefined) {
      setSaved(data.saved)
      toast.success(data.saved ? 'Ajouté à ma liste ❤️' : 'Retiré de ma liste')
    }
    setLoading(false)
  }

  const iconSize = size === 'sm' ? 14 : 17

  return (
    <button
      onClick={toggle}
      disabled={loading}
      title={saved ? 'Retirer de ma liste' : 'Sauvegarder'}
      className={clsx(
        'rounded-full transition-all active:scale-90 disabled:opacity-50',
        size === 'sm' ? 'p-1.5' : 'p-2',
        saved
          ? 'bg-red/20 text-red hover:bg-red/30'
          : 'bg-black/40 text-white hover:bg-black/60 backdrop-blur-sm',
        className
      )}>
      <Heart size={iconSize} fill={saved ? 'currentColor' : 'none'} />
    </button>
  )
}
