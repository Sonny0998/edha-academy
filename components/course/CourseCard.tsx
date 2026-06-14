'use client'

import Link from 'next/link'
import { StarRating, Badge, Avatar } from '@/components/ui'
import WishlistButton from './WishlistButton'
import { Users, Clock, BookOpen, Play } from 'lucide-react'
import type { Course } from '@/types'
import clsx from 'clsx'

interface CourseCardProps {
  course: any
  variant?: 'default' | 'horizontal' | 'compact'
  showInstructor?: boolean
}

export function CourseCard({ course, variant = 'default', showInstructor = true }: CourseCardProps) {
  const price = course.pricing_model === 'free' ? 'Gratuit'
    : course.pricing_model === 'certificate_only' ? `Cert. $${course.certificate_price}`
    : course.price ? `$${course.price}` : 'Gratuit'

  if (variant === 'compact') {
    return (
      <Link href={`/cursos/${course.slug}`} className="flex items-center gap-3 p-3 rounded-xl hover:bg-card2 transition-colors group">
        <div className="w-14 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-card2">
          {course.thumbnail_url
            ? <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center"><BookOpen size={14} className="text-text3" /></div>}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text group-hover:text-blue transition-colors line-clamp-1">{course.title}</p>
          <p className="text-xs text-text3">{course.instructor?.full_name}</p>
        </div>
        <span className="text-sm font-bold text-blue flex-shrink-0">{price}</span>
      </Link>
    )
  }

  return (
    <div className="flex flex-col bg-card border border-border rounded-2xl overflow-hidden hover:border-border2 transition-all group">
      <Link href={`/cursos/${course.slug}`}>
        <div className="relative aspect-video bg-card2 overflow-hidden">
          {course.thumbnail_url
            ? <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            : <div className="w-full h-full flex items-center justify-center"><BookOpen size={40} className="text-text3" /></div>}
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Play size={18} className="text-white fill-white" />
            </div>
          </div>
          {course.is_featured && (
            <div className="absolute top-2 left-2"><Badge variant="blue">⭐ Vedette</Badge></div>
          )}
          <div className="absolute bottom-2 right-2">
            <span className={clsx('text-xs font-bold px-2.5 py-1 rounded-full',
              course.pricing_model === 'free'
                ? 'bg-green/20 text-green border border-green/30'
                : 'bg-black/70 text-white border border-white/20')}>
              {price}
            </span>
          </div>
        </div>
      </Link>

      <div className="flex flex-col flex-1 p-4">
        {course.category && <p className="text-xs text-blue font-semibold uppercase tracking-wider mb-1.5">{course.category.name}</p>}
        <Link href={`/cursos/${course.slug}`}>
          <h3 className="font-semibold text-text text-sm leading-snug line-clamp-2 mb-1 hover:text-blue transition-colors">{course.title}</h3>
        </Link>
        {course.subtitle && <p className="text-xs text-text3 line-clamp-1 mb-3">{course.subtitle}</p>}

        {showInstructor && course.instructor && (
          <div className="flex items-center gap-2 mb-3">
            <Avatar name={course.instructor.full_name} src={course.instructor.avatar_url} size="sm" />
            <p className="text-xs font-medium text-text2 truncate">{course.instructor.full_name}</p>
          </div>
        )}

        <div className="flex items-center gap-3 text-xs text-text3 mb-3">
          <span className="flex items-center gap-1"><Users size={10} />{(course.enrolled_count || 0).toLocaleString()}</span>
          {course.total_duration_min > 0 && <span className="flex items-center gap-1"><Clock size={10} />{Math.round(course.total_duration_min / 60)}h</span>}
          <span className="flex items-center gap-1"><BookOpen size={10} />{course.total_lessons || 0} leçons</span>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-border">
          <div className="flex items-center gap-2">
            <StarRating rating={course.rating_avg || 0} size={13} />
            <span className="text-xs font-bold text-yellow">{(course.rating_avg || 0).toFixed(1)}</span>
            <span className="text-xs text-text3">({course.rating_count || 0})</span>
          </div>
          <WishlistButton courseId={course.id} />
        </div>
      </div>
    </div>
  )
}

export default CourseCard
