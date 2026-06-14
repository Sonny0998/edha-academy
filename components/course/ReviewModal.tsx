'use client'

import { useState } from 'react'
import { Star } from 'lucide-react'
import { Button } from '@/components/ui'
import toast from 'react-hot-toast'

interface Props {
  courseId: string
  courseTitle: string
  onClose: () => void
  onSubmitted: () => void
}

export default function ReviewModal({ courseId, courseTitle, onClose, onSubmitted }: Props) {
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async () => {
    if (!rating) { toast.error('Sélectionnez une note'); return }
    setSaving(true)
    const res = await fetch('/api/reviews', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ course_id: courseId, rating, comment: comment.trim() || undefined }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { toast.error(data.error || 'Erreur'); return }
    toast.success('Merci pour votre avis ! ⭐')
    onSubmitted()
  }

  const labels = ['', 'Décevant', 'Insuffisant', 'Moyen', 'Bon', 'Excellent']

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md animate-fade-up">
        <div className="p-6">
          <h2 className="font-bold text-text text-lg mb-1">Donnez votre avis</h2>
          <p className="text-text3 text-sm mb-6 line-clamp-1">{courseTitle}</p>

          {/* Star rating */}
          <div className="flex justify-center gap-2 mb-3">
            {[1, 2, 3, 4, 5].map(n => (
              <button key={n}
                onMouseEnter={() => setHover(n)}
                onMouseLeave={() => setHover(0)}
                onClick={() => setRating(n)}
                className="transition-transform hover:scale-110">
                <Star size={36}
                  fill={n <= (hover || rating) ? '#f59e0b' : 'none'}
                  stroke={n <= (hover || rating) ? '#f59e0b' : '#44445a'}
                  strokeWidth={1.5} />
              </button>
            ))}
          </div>
          {(hover || rating) > 0 && (
            <p className="text-center text-sm font-medium text-yellow mb-5">{labels[hover || rating]}</p>
          )}

          <textarea value={comment} onChange={e => setComment(e.target.value)}
            placeholder="Partagez votre expérience avec ce cours (optionnel)..."
            rows={3}
            className="w-full bg-card2 border border-border2 rounded-xl px-4 py-3 text-text text-sm placeholder:text-text3 outline-none focus:border-blue/50 resize-none mb-5" />

          <div className="flex gap-3">
            <Button onClick={handleSubmit} loading={saving} className="flex-1 justify-center">
              Publier mon avis
            </Button>
            <Button variant="secondary" onClick={onClose}>Annuler</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
