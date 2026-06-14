'use client'

import { useState } from 'react'
import { Calendar, Clock, Lock, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react'
import clsx from 'clsx'

export type Schedule = {
  opens_at: string        // número de días como string ej: "3" o ''
  due_at: string          // número de días como string ej: "10" o ''
  closes_at: string       // número de días como string ej: "14" o ''
  time_limit_min: number | null
  max_attempts: number
  grading_method: 'highest' | 'average' | 'first' | 'last'
  shuffle_questions: boolean
  show_answers_after: boolean
  password: string
}

export const defaultSchedule = (): Schedule => ({
  opens_at: '',
  due_at: '',
  closes_at: '',
  time_limit_min: null,
  max_attempts: 1,
  grading_method: 'highest',
  shuffle_questions: false,
  show_answers_after: true,
  password: '',
})

interface ScheduleSettingsProps {
  type: 'quiz' | 'assignment'
  value: Schedule
  onChange: (s: Schedule) => void
}

// Calculate real date from enrollment date + days
export function calcDate(enrolledAt: string, days: string): Date | null {
  if (!days || !enrolledAt) return null
  const d = parseInt(days)
  if (isNaN(d)) return null
  const date = new Date(enrolledAt)
  date.setDate(date.getDate() + d)
  return date
}

export default function ScheduleSettings({ type, value, onChange }: ScheduleSettingsProps) {
  const [expanded, setExpanded] = useState(false)
  const set = (k: keyof Schedule, v: any) => onChange({ ...value, [k]: v })

  const opensDay  = parseInt(value.opens_at) || 0
  const dueDay    = parseInt(value.due_at) || 0
  const closesDay = parseInt(value.closes_at) || 0

  const opensDueOk  = !value.opens_at || !value.due_at   || dueDay > opensDay
  const dueCutoffOk = !value.due_at   || !value.closes_at || closesDay >= dueDay
  const hasSchedule = value.opens_at || value.due_at || value.closes_at || value.time_limit_min || value.password

  const DayInput = ({ label, field, description, color }: {
    label: string, field: keyof Schedule, description: string, color: string
  }) => (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-text3">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="number" min={0} max={365}
          value={value[field] as string}
          onChange={e => set(field, e.target.value)}
          placeholder="—"
          className="w-20 bg-card border border-border rounded-xl px-3 py-2 text-sm text-text text-center outline-none focus:border-blue transition-colors"
        />
        <span className="text-xs text-text3">jours après inscription</span>
      </div>
      <p className={`text-[10px] ${color}`}>{description}</p>
    </div>
  )

  return (
    <div className={clsx('rounded-xl border transition-colors overflow-hidden', expanded ? 'border-blue/30' : 'border-border')}>
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-card2 transition-colors text-left"
      >
        <div className="w-8 h-8 rounded-lg bg-blue/10 flex items-center justify-center flex-shrink-0">
          <Calendar size={15} className="text-blue" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-text">
            {type === 'quiz' ? 'Paramètres du quiz & calendrier' : 'Calendrier & paramètres de remise'}
          </p>
          {!expanded && hasSchedule && (
            <p className="text-xs text-cyan mt-0.5 flex items-center gap-1">
              <Clock size={10} /> Calendrier configuré (relatif à l'inscription)
            </p>
          )}
          {!expanded && !hasSchedule && (
            <p className="text-xs text-text3 mt-0.5">Configurer les délais, durée, tentatives…</p>
          )}
        </div>
        {expanded ? <ChevronUp size={15} className="text-text3" /> : <ChevronDown size={15} className="text-text3" />}
      </button>

      {expanded && (
        <div className="px-4 pb-5 pt-2 space-y-5 border-t border-border bg-card2/30">

          {/* Explanation banner */}
          <div className="bg-blue/5 border border-blue/15 rounded-xl px-4 py-3 text-xs text-blue flex items-start gap-2">
            <Calendar size={13} className="flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium mb-0.5">Calendrier relatif à l'inscription</p>
              <p className="text-blue/70">
                Les délais sont calculés automatiquement pour chaque étudiant à partir de sa date d'inscription.
                Ex: "7 jours" = l'étudiant a 7 jours depuis qu'il s'est inscrit pour compléter cet élément.
              </p>
            </div>
          </div>

          {/* Days inputs */}
          <div>
            <p className="text-xs font-semibold text-text2 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Calendar size={11} /> Disponibilité
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <DayInput
                label="📅 Disponible après"
                field="opens_at"
                description="Laisser vide = disponible immédiatement"
                color="text-text3"
              />
              <DayInput
                label="⏰ Date limite"
                field="due_at"
                description="Après ce délai : marqué en retard"
                color="text-yellow"
              />
              <DayInput
                label="🔒 Fermeture"
                field="closes_at"
                description="Après ce délai : plus accessible"
                color="text-red"
              />
            </div>

            {/* Warnings */}
            {!opensDueOk && (
              <div className="mt-2 flex items-center gap-2 text-xs text-red bg-red/10 px-3 py-2 rounded-lg">
                La date limite doit être après l'ouverture
              </div>
            )}
            {!dueCutoffOk && (
              <div className="mt-2 flex items-center gap-2 text-xs text-red bg-red/10 px-3 py-2 rounded-lg">
                La fermeture doit être après la date limite
              </div>
            )}

            {/* Visual timeline */}
            {(value.opens_at || value.due_at || value.closes_at) && opensDueOk && dueCutoffOk && (
              <div className="mt-3 bg-card border border-border rounded-xl p-3">
                <p className="text-xs text-text3 mb-2 font-medium">Aperçu (exemple: inscrit aujourd'hui)</p>
                <div className="flex items-center gap-1 text-xs overflow-x-auto">
                  <span className="text-text3 whitespace-nowrap">Inscription</span>
                  <div className="flex-1 flex items-center min-w-0">
                    <div className="h-0.5 bg-border flex-1" />
                    {value.opens_at && (
                      <div className="flex flex-col items-center mx-2 flex-shrink-0">
                        <div className="w-2 h-2 rounded-full bg-green" />
                        <span className="text-green text-[10px] mt-0.5 whitespace-nowrap">
                          Ouvre<br />J+{value.opens_at}
                        </span>
                      </div>
                    )}
                    <div className="h-0.5 bg-cyan flex-1" />
                    {value.due_at && (
                      <div className="flex flex-col items-center mx-2 flex-shrink-0">
                        <div className="w-2 h-2 rounded-full bg-yellow" />
                        <span className="text-yellow text-[10px] mt-0.5 whitespace-nowrap">
                          Limite<br />J+{value.due_at}
                        </span>
                      </div>
                    )}
                    <div className="h-0.5 bg-orange-400/50 flex-1" />
                    {value.closes_at && (
                      <div className="flex flex-col items-center mx-2 flex-shrink-0">
                        <div className="w-2 h-2 rounded-full bg-red" />
                        <span className="text-red text-[10px] mt-0.5 whitespace-nowrap">
                          Ferme<br />J+{value.closes_at}
                        </span>
                      </div>
                    )}
                    <div className="h-0.5 bg-border flex-1" />
                  </div>
                  <span className="text-text3 whitespace-nowrap">Fermé</span>
                </div>
              </div>
            )}
          </div>

          {/* Time limit */}
          <div>
            <p className="text-xs font-semibold text-text2 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Clock size={11} /> Durée
            </p>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={value.time_limit_min !== null}
                  onChange={e => set('time_limit_min', e.target.checked ? 60 : null)}
                  className="w-4 h-4" style={{ accentColor: 'var(--blue)' }} />
                <span className="text-sm text-text2">Limiter la durée</span>
              </label>
              {value.time_limit_min !== null && (
                <div className="flex items-center gap-2">
                  <input type="number" min={1} max={600} value={value.time_limit_min}
                    onChange={e => set('time_limit_min', parseInt(e.target.value) || 60)}
                    className="w-20 bg-card border border-border rounded-lg px-3 py-1.5 text-sm text-text text-center outline-none focus:border-blue" />
                  <span className="text-sm text-text3">minutes</span>
                  <span className="text-xs text-text3 bg-card2 px-2 py-1 rounded-lg">
                    = {Math.floor(value.time_limit_min / 60)}h {value.time_limit_min % 60}min
                  </span>
                </div>
              )}
            </div>
            {value.time_limit_min !== null && (
              <p className="text-xs text-text3 mt-1.5 flex items-center gap-1">
                <Clock size={10} /> Compte à rebours visible. Soumission automatique à 0:00.
              </p>
            )}
          </div>

          {/* Quiz specific */}
          {type === 'quiz' && (
            <div>
              <p className="text-xs font-semibold text-text2 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <RefreshCw size={11} /> Tentatives & notation
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-text3">Tentatives autorisées</label>
                  <select value={value.max_attempts} onChange={e => set('max_attempts', parseInt(e.target.value))}
                    className="w-full bg-card border border-border rounded-xl px-3 py-2 text-sm text-text outline-none focus:border-blue">
                    <option value={1}>1 tentative</option>
                    <option value={2}>2 tentatives</option>
                    <option value={3}>3 tentatives</option>
                    <option value={5}>5 tentatives</option>
                    <option value={99}>Illimité</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-text3">Méthode de notation</label>
                  <select value={value.grading_method} onChange={e => set('grading_method', e.target.value as any)}
                    className="w-full bg-card border border-border rounded-xl px-3 py-2 text-sm text-text outline-none focus:border-blue"
                    disabled={value.max_attempts === 1}>
                    <option value="highest">Meilleure note</option>
                    <option value="average">Moyenne des tentatives</option>
                    <option value="first">Première tentative</option>
                    <option value="last">Dernière tentative</option>
                  </select>
                </div>
              </div>
              <div className="mt-4 space-y-2.5">
                <label className="flex items-center gap-2.5 cursor-pointer group">
                  <input type="checkbox" checked={value.shuffle_questions}
                    onChange={e => set('shuffle_questions', e.target.checked)}
                    className="w-4 h-4" style={{ accentColor: 'var(--blue)' }} />
                  <div>
                    <span className="text-sm text-text2">Mélanger les questions</span>
                    <p className="text-xs text-text3">Ordre aléatoire pour chaque étudiant</p>
                  </div>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer group">
                  <input type="checkbox" checked={value.show_answers_after}
                    onChange={e => set('show_answers_after', e.target.checked)}
                    className="w-4 h-4" style={{ accentColor: 'var(--blue)' }} />
                  <div>
                    <span className="text-sm text-text2">Afficher les corrections après</span>
                    <p className="text-xs text-text3">Visible immédiatement après la soumission</p>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Password */}
          <div>
            <p className="text-xs font-semibold text-text2 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Lock size={11} /> Sécurité
            </p>
            <input type="text" value={value.password} onChange={e => set('password', e.target.value)}
              placeholder="Mot de passe d'accès (optionnel)..."
              className="w-full bg-card border border-border rounded-xl px-3 py-2 text-sm text-text outline-none focus:border-blue" />
            {value.password && (
              <p className="text-xs text-yellow mt-1 flex items-center gap-1">
                <Lock size={10} /> Les étudiants devront saisir ce mot de passe.
              </p>
            )}
          </div>

          {/* Summary */}
          <div className="bg-card border border-border rounded-xl p-3 text-xs text-text3 space-y-1">
            <p className="font-medium text-text2 mb-1.5">📋 Résumé :</p>
            <p>• Disponible : {value.opens_at ? `J+${value.opens_at} après inscription` : <span className="text-green">Immédiatement</span>}</p>
            <p>• Date limite : {value.due_at ? `J+${value.due_at} après inscription` : <span className="text-text3">Aucune</span>}</p>
            <p>• Fermeture : {value.closes_at ? `J+${value.closes_at} après inscription` : <span className="text-text3">Jamais</span>}</p>
            <p>• Durée : {value.time_limit_min ? `${value.time_limit_min} minutes` : <span className="text-text3">Illimitée</span>}</p>
            {type === 'quiz' && <p>• Tentatives : {value.max_attempts === 99 ? 'Illimitées' : value.max_attempts}</p>}
            {value.password && <p>• <span className="text-yellow">Mot de passe requis</span></p>}
          </div>
        </div>
      )}
    </div>
  )
}