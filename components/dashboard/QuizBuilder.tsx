'use client'

import { useState } from 'react'
import { Plus, Trash2, CheckCircle, HelpCircle, ToggleLeft, List, GripVertical } from 'lucide-react'
import { Button, Badge } from '@/components/ui'
import clsx from 'clsx'

export type QuizQuestion = {
  id: string
  type: 'single' | 'multiple' | 'true_false' | 'fill_blank'
  question: string
  options: { id: string; text: string; is_correct: boolean }[]
  explanation: string
  points: number
  order_num: number
}

interface QuizBuilderProps {
  questions: QuizQuestion[]
  onChange: (questions: QuizQuestion[]) => void
  passingScore?: number
  onPassingScoreChange?: (score: number) => void
}

function uid() { return Math.random().toString(36).substring(2, 9) }

const TYPE_CONFIG = {
  single:     { label: 'Choix unique',   icon: CheckCircle,   desc: '1 bonne réponse' },
  multiple:   { label: 'Choix multiple', icon: List,          desc: 'Plusieurs bonnes réponses' },
  true_false: { label: 'Vrai / Faux',    icon: ToggleLeft,    desc: '2 options' },
  fill_blank: { label: 'Compléter',      icon: HelpCircle,    desc: 'Réponse libre' },
}

function newQuestion(order: number): QuizQuestion {
  return {
    id: uid(),
    type: 'single',
    question: '',
    options: [
      { id: uid(), text: '', is_correct: true },
      { id: uid(), text: '', is_correct: false },
      { id: uid(), text: '', is_correct: false },
      { id: uid(), text: '', is_correct: false },
    ],
    explanation: '',
    points: 1,
    order_num: order,
  }
}

export default function QuizBuilder({ questions, onChange, passingScore = 70, onPassingScoreChange }: QuizBuilderProps) {
  const [expandedId, setExpandedId] = useState<string | null>(questions[0]?.id || null)

  const add = () => {
    const q = newQuestion(questions.length + 1)
    onChange([...questions, q])
    setExpandedId(q.id)
  }

  const remove = (id: string) => {
    onChange(questions.filter(q => q.id !== id))
  }

  const update = (id: string, patch: Partial<QuizQuestion>) => {
    onChange(questions.map(q => q.id === id ? { ...q, ...patch } : q))
  }

  const updateOption = (qId: string, optId: string, patch: { text?: string; is_correct?: boolean }, type: QuizQuestion['type']) => {
    const q = questions.find(q => q.id === qId)!
    let opts = q.options.map(o => o.id === optId ? { ...o, ...patch } : o)

    // For single/true_false: only one correct answer
    if (patch.is_correct && (type === 'single' || type === 'true_false')) {
      opts = opts.map(o => ({ ...o, is_correct: o.id === optId }))
    }
    update(qId, { options: opts })
  }

  const setType = (qId: string, type: QuizQuestion['type']) => {
    let opts: QuizQuestion['options']
    if (type === 'true_false') {
      opts = [
        { id: uid(), text: 'Vrai', is_correct: true },
        { id: uid(), text: 'Faux', is_correct: false },
      ]
    } else if (type === 'fill_blank') {
      opts = [{ id: uid(), text: '', is_correct: true }]
    } else {
      opts = [
        { id: uid(), text: '', is_correct: true },
        { id: uid(), text: '', is_correct: false },
        { id: uid(), text: '', is_correct: false },
        { id: uid(), text: '', is_correct: false },
      ]
    }
    update(qId, { type, options: opts })
  }

  const addOption = (qId: string) => {
    const q = questions.find(q => q.id === qId)!
    if (q.options.length >= 6) return
    update(qId, { options: [...q.options, { id: uid(), text: '', is_correct: false }] })
  }

  const removeOption = (qId: string, optId: string) => {
    const q = questions.find(q => q.id === qId)!
    if (q.options.length <= 2) return
    update(qId, { options: q.options.filter(o => o.id !== optId) })
  }

  const totalPoints = questions.reduce((s, q) => s + q.points, 0)

  return (
    <div className="space-y-4">
      {/* Quiz settings bar */}
      <div className="flex items-center gap-4 bg-card2 rounded-xl p-3">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-text3">Questions:</span>
          <Badge variant="blue">{questions.length}</Badge>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-text3">Points total:</span>
          <Badge variant="default">{totalPoints}</Badge>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs text-text3">Score minimum pour réussir:</span>
          <input
            type="number" min={0} max={100} value={passingScore}
            onChange={e => onPassingScoreChange?.(parseInt(e.target.value) || 70)}
            className="w-16 bg-card border border-border rounded-lg px-2 py-1 text-sm text-text text-center outline-none focus:border-blue"
          />
          <span className="text-xs text-text3">%</span>
        </div>
      </div>

      {/* Questions list */}
      {questions.map((q, qi) => {
        const isOpen = expandedId === q.id
        const TypeIcon = TYPE_CONFIG[q.type].icon
        const hasError = !q.question.trim()

        return (
          <div key={q.id} className={clsx('bg-card border rounded-2xl overflow-hidden transition-colors',
            hasError && !isOpen ? 'border-yellow/30' : 'border-border', isOpen && 'border-blue/30')}>

            {/* Question header */}
            <div
              className="w-full flex items-center gap-3 p-4 hover:bg-card2 transition-colors text-left cursor-pointer"
              onClick={() => setExpandedId(isOpen ? null : q.id)}>
              <span className="w-6 h-6 rounded-full bg-blue/10 text-blue text-xs font-bold flex items-center justify-center flex-shrink-0">
                {qi + 1}
              </span>
              <TypeIcon size={15} className="text-text3 flex-shrink-0" />
              <p className={clsx('flex-1 text-sm truncate', q.question ? 'text-text font-medium' : 'text-text3 italic')}>
                {q.question || 'Question sans titre...'}
              </p>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Badge variant="default">{q.points} pt{q.points > 1 ? 's' : ''}</Badge>
                <Badge variant="blue">{TYPE_CONFIG[q.type].label}</Badge>
                <div
                  onClick={e => { e.stopPropagation(); remove(q.id) }}
                  className="p-1 text-text3 hover:text-red hover:bg-red/10 rounded-lg transition-all cursor-pointer">
                  <Trash2 size={13} />
                </div>
              </div>
            </div>

            {/* Expanded editor */}
            {isOpen && (
              <div className="border-t border-border p-5 space-y-5">
                {/* Type selector */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {Object.entries(TYPE_CONFIG).map(([type, cfg]) => {
                    const Icon = cfg.icon
                    return (
                      <button key={type} onClick={() => setType(q.id, type as QuizQuestion['type'])}
                        className={clsx('flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all',
                          q.type === type ? 'border-blue bg-blue/10' : 'border-border hover:border-blue/30 bg-card2')}>
                        <Icon size={16} className={q.type === type ? 'text-blue' : 'text-text3'} />
                        <span className="text-xs font-medium text-text">{cfg.label}</span>
                        <span className="text-[10px] text-text3">{cfg.desc}</span>
                      </button>
                    )
                  })}
                </div>

                {/* Question text */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-text2">Question *</label>
                  <textarea value={q.question} onChange={e => update(q.id, { question: e.target.value })}
                    placeholder="Écrivez votre question ici..."
                    rows={2}
                    className="w-full bg-card2 border border-border rounded-xl px-4 py-2.5 text-sm text-text outline-none focus:border-blue transition-colors resize-none" />
                </div>

                {/* Options */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-text2">
                    {q.type === 'fill_blank' ? 'Réponse correcte' : q.type === 'multiple' ? 'Réponses (cochez toutes les bonnes)' : 'Options (cochez la bonne réponse)'}
                  </label>

                  {q.type === 'fill_blank' ? (
                    <input value={q.options[0]?.text || ''} onChange={e => updateOption(q.id, q.options[0].id, { text: e.target.value }, q.type)}
                      placeholder="Réponse exacte attendue..."
                      className="w-full bg-card2 border border-border rounded-xl px-4 py-2.5 text-sm text-text outline-none focus:border-blue" />
                  ) : (
                    <div className="space-y-2">
                      {q.options.map((opt, oi) => (
                        <div key={opt.id} className={clsx('flex items-center gap-3 p-3 rounded-xl border transition-colors',
                          opt.is_correct ? 'border-green/30 bg-green/5' : 'border-border bg-card2')}>
                          <input
                            type={q.type === 'multiple' ? 'checkbox' : 'radio'}
                            checked={opt.is_correct}
                            onChange={e => updateOption(q.id, opt.id, { is_correct: e.target.checked }, q.type)}
                            className="w-4 h-4 flex-shrink-0"
                            style={{ accentColor: 'var(--blue)' }}
                          />
                          <input value={opt.text} onChange={e => updateOption(q.id, opt.id, { text: e.target.value }, q.type)}
                            placeholder={`Option ${oi + 1}${opt.is_correct ? ' (correcte)' : ''}...`}
                            disabled={q.type === 'true_false'}
                            className="flex-1 bg-transparent text-sm text-text outline-none placeholder-text3 disabled:cursor-default" />
                          {opt.is_correct && <CheckCircle size={14} className="text-green flex-shrink-0" />}
                          {q.type !== 'true_false' && q.options.length > 2 && (
                            <button onClick={() => removeOption(q.id, opt.id)}
                              className="text-text3 hover:text-red p-0.5 transition-colors flex-shrink-0">
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      ))}
                      {q.type !== 'true_false' && q.options.length < 6 && (
                        <button onClick={() => addOption(q.id)}
                          className="flex items-center gap-1.5 text-xs text-blue hover:text-cyan transition-colors mt-1">
                          <Plus size={12} /> Ajouter une option
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Explanation + Points */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="block text-sm font-medium text-text2">Explication (montrée après réponse)</label>
                    <textarea value={q.explanation} onChange={e => update(q.id, { explanation: e.target.value })}
                      placeholder="Pourquoi cette réponse est correcte... (optionnel)"
                      rows={2}
                      className="w-full bg-card2 border border-border rounded-xl px-4 py-2.5 text-sm text-text outline-none focus:border-blue transition-colors resize-none" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-text2">Points</label>
                    <input type="number" min={1} max={10} value={q.points} onChange={e => update(q.id, { points: parseInt(e.target.value) || 1 })}
                      className="w-full bg-card2 border border-border rounded-xl px-4 py-2.5 text-sm text-text text-center outline-none focus:border-blue" />
                    <p className="text-xs text-text3 text-center">Points attribués</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      })}

      {/* Add question button */}
      <button onClick={add}
        className="w-full border-2 border-dashed border-border hover:border-blue/50 rounded-2xl py-4 flex items-center justify-center gap-2 text-sm text-text2 hover:text-blue transition-all">
        <Plus size={16} /> Ajouter une question
      </button>
    </div>
  )
}
