'use client'

import { Star, Loader2 } from 'lucide-react'
import clsx from 'clsx'
import type { ButtonHTMLAttributes, InputHTMLAttributes } from 'react'

/* ── BUTTON ── */
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}
export function Button({ variant = 'primary', size = 'md', loading, disabled, children, className, ...props }: ButtonProps) {
  const base = 'inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed'
  const sizes = { sm: 'text-xs px-3 py-1.5', md: 'text-sm px-4 py-2.5', lg: 'text-base px-6 py-3' }
  const variants = {
    primary:   'edha-gradient text-white hover:opacity-90 shadow-sm',
    secondary: 'bg-bg2 hover:bg-border border border-border text-text',
    danger:    'bg-red/10 hover:bg-red/20 border border-red/20 text-red',
    ghost:     'hover:bg-bg2 text-text2 hover:text-text',
  }
  return (
    <button disabled={disabled || loading} className={clsx(base, sizes[size], variants[variant], className)} {...props}>
      {loading && <Loader2 size={14} className="animate-spin" />}
      {children}
    </button>
  )
}

/* ── INPUT ── */
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  icon?: React.ReactNode
}
export function Input({ label, error, icon, className, ...props }: InputProps) {
  return (
    <div className="space-y-1.5">
      {label && <label className="block text-sm font-medium text-text2">{label}</label>}
      <div className="relative">
        {icon && <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text3">{icon}</span>}
        <input
          className={clsx(
            'w-full bg-bg2 border rounded-xl py-2.5 text-sm text-text outline-none transition-colors placeholder:text-text3',
            icon ? 'pl-10 pr-4' : 'px-4',
            error ? 'border-red/50 focus:border-red' : 'border-border focus:border-blue/50',
            className
          )}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-red">{error}</p>}
    </div>
  )
}

/* ── TEXTAREA ── */
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}
export function Textarea({ label, error, className, ...props }: TextareaProps) {
  return (
    <div className="space-y-1.5">
      {label && <label className="block text-sm font-medium text-text2">{label}</label>}
      <textarea
        className={clsx(
          'w-full bg-bg2 border rounded-xl px-4 py-2.5 text-sm text-text outline-none transition-colors placeholder:text-text3 resize-none',
          error ? 'border-red/50 focus:border-red' : 'border-border focus:border-blue/50',
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-red">{error}</p>}
    </div>
  )
}

/* ── SELECT ── */
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
}
export function Select({ label, className, children, ...props }: SelectProps) {
  return (
    <div className="space-y-1.5">
      {label && <label className="block text-sm font-medium text-text2">{label}</label>}
      <select
        className={clsx(
          'w-full bg-bg2 border border-border rounded-xl px-4 py-2.5 text-sm text-text outline-none focus:border-blue/50 transition-colors',
          className
        )}
        {...props}
      >
        {children}
      </select>
    </div>
  )
}

/* ── BADGE ── */
interface BadgeProps {
  variant?: 'default' | 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'gold'
  children: React.ReactNode
  className?: string
}
export function Badge({ variant = 'default', children, className }: BadgeProps) {
  const variants = {
    default: 'bg-bg2 text-text2 border-border',
    blue:    'bg-blue/10 text-blue border-blue/20',
    green:   'bg-green/10 text-green border-green/20',
    red:     'bg-red/10 text-red border-red/20',
    yellow:  'bg-yellow/10 text-yellow border-yellow/20',
    purple:  'bg-purple/10 text-purple border-purple/20',
    gold:    'bg-gold/10 text-gold border-gold/20',
  }
  return (
    <span className={clsx(
      'inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border',
      variants[variant], className
    )}>
      {children}
    </span>
  )
}

/* ── AVATAR ── */
interface AvatarProps {
  src?: string | null
  name?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}
export function Avatar({ src, name, size = 'md', className }: AvatarProps) {
  const sizes = { xs: 'w-6 h-6 text-[10px]', sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-12 h-12 text-base', xl: 'w-16 h-16 text-lg' }
  const initials = name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'
  if (src) {
    return <img src={src} alt={name || 'Avatar'} className={clsx('rounded-full object-cover border border-border', sizes[size], className)} />
  }
  return (
    <div className={clsx('rounded-full flex items-center justify-center font-bold text-white edha-gradient flex-shrink-0', sizes[size], className)}>
      {initials}
    </div>
  )
}

/* ── STAR RATING ── */
export function StarRating({ rating, count, size = 14 }: { rating: number; count?: number; size?: number }) {
  return (
    <div className="flex items-center gap-1">
      <div className="flex">
        {[1, 2, 3, 4, 5].map(i => (
          <Star key={i} size={size}
            className={i <= Math.round(rating) ? 'text-yellow fill-yellow' : 'text-border fill-border'} />
        ))}
      </div>
      <span className="text-xs text-text2 font-medium">{rating.toFixed(1)}</span>
      {count !== undefined && <span className="text-xs text-text3">({count})</span>}
    </div>
  )
}

/* ── CARD ── */
export function Card({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={clsx('bg-card border border-border rounded-2xl', className)} {...props}>
      {children}
    </div>
  )
}

/* ── SPINNER ── */
export function Spinner({ size = 'md', className }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' }
  return (
    <div className={clsx('border-2 border-border border-t-blue rounded-full animate-spin', sizes[size], className)} />
  )
}

/* ── PROGRESS BAR ── */
export function ProgressBar({ value, max = 100, className }: { value: number; max?: number; className?: string }) {
  const pct = Math.min(100, Math.round((value / max) * 100))
  return (
    <div className={clsx('w-full bg-bg2 rounded-full h-2 overflow-hidden', className)}>
      <div className="h-full edha-gradient rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
    </div>
  )
}

/* ── EMPTY STATE ── */
export function EmptyState({ icon, title, description, action }: {
  icon: React.ReactNode; title: string; description?: string; action?: React.ReactNode
}) {
  return (
    <div className="text-center py-12">
      <div className="w-16 h-16 bg-bg2 rounded-2xl flex items-center justify-center mx-auto mb-4 text-text3">
        {icon}
      </div>
      <p className="font-semibold text-text mb-1">{title}</p>
      {description && <p className="text-sm text-text3 max-w-sm mx-auto mb-4">{description}</p>}
      {action}
    </div>
  )
}
