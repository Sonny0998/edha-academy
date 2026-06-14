'use client'
import { useState, useRef, useEffect } from 'react'
import { Bot, X, Send, Minimize2, Loader2, Sparkles } from 'lucide-react'
import clsx from 'clsx'

interface Message { role: 'user'|'assistant'; content: string }

const SUGGESTIONS = [
  'Quel cours pour débuter en informatique ?',
  'Comment obtenir un certificat ?',
  'Comment devenir instructeur EDHA ?',
  'Ki klas ou rekòmande pou mwen ?',
]

export default function AiAssistant() {
  const [open, setOpen]         = useState(false)
  const [minimized, setMin]     = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [showBubble, setBubble] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const t = setTimeout(() => setBubble(true), 3000)
    const t2 = setTimeout(() => setBubble(false), 10000)
    return () => { clearTimeout(t); clearTimeout(t2) }
  }, [])

  useEffect(() => {
    if (open && !minimized) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
      inputRef.current?.focus()
    }
  }, [messages, open, minimized])

  const send = async (text?: string) => {
    const msg = (text || input).trim()
    if (!msg || loading) return
    setInput('')
    const history: Message[] = [...messages, { role: 'user', content: msg }]
    setMessages(history)
    setLoading(true)
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 500,
          system: `Tu es l'assistant IA d'EDHA Academy, plateforme d'apprentissage pour Haïti. Réponds en français par défaut, mais aussi en créole haïtien (Kreyòl), anglais ou espagnol selon la langue de l'utilisateur. Sois amical, concis et utile. EDHA Academy propose des cours en ligne, certificats, quiz, et des devoirs. Les instructeurs peuvent créer des cours, les étudiants peuvent s'inscrire et obtenir des certificats.`,
          messages: history.map(m => ({ role: m.role, content: m.content })),
        }),
      })
      const data = await res.json()
      const reply = data.content?.[0]?.text || 'Désolé, je n\'ai pas pu répondre.'
      setMessages(m => [...m, { role: 'assistant', content: reply }])
    } catch {
      setMessages(m => [...m, { role: 'assistant', content: 'Une erreur est survenue. Réessayez.' }])
    }
    setLoading(false)
  }

  return (
    <>
      {/* Button + bubble */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
        {showBubble && !open && (
          <div className="bg-card border border-border rounded-2xl rounded-br-sm px-4 py-2.5 shadow-lg animate-fade-up">
            <p className="text-xs font-medium text-text">Besoin d&apos;aide ? 👋</p>
            <p className="text-[10px] text-text3">Votre assistant EDHA est là !</p>
          </div>
        )}
        <button
          onClick={() => { setOpen(o => !o); setMin(false); setBubble(false) }}
          className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg edha-gradient hover:opacity-90 transition-opacity"
          aria-label="Assistant IA EDHA"
        >
          {open ? <X size={22} className="text-white"/> : <Bot size={24} className="text-white"/>}
        </button>
      </div>

      {/* Chat window */}
      {open && (
        <div className={clsx(
          'fixed bottom-24 right-6 z-50 w-80 sm:w-96 bg-card border border-border rounded-2xl shadow-2xl flex flex-col animate-slide-in overflow-hidden',
          minimized ? 'h-14' : 'h-[480px]'
        )}>
          <div className="h-0.5 bg-gradient-to-r from-blue via-cyan to-gold"/>
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border flex-shrink-0">
            <div className="w-8 h-8 rounded-xl edha-gradient flex items-center justify-center">
              <Sparkles size={15} className="text-white"/>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-text">Assistant EDHA</p>
              <p className="text-[10px] text-green flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green inline-block"/> En ligne · FR / KR / EN / ES
              </p>
            </div>
            <button onClick={()=>setMin(m=>!m)} className="p-1.5 hover:bg-bg2 rounded-lg text-text3">
              <Minimize2 size={13}/>
            </button>
            <button onClick={()=>setOpen(false)} className="p-1.5 hover:bg-bg2 rounded-lg text-text3">
              <X size={13}/>
            </button>
          </div>

          {!minimized && (<>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 && (
                <div className="text-center py-2">
                  <div className="w-12 h-12 rounded-2xl edha-gradient flex items-center justify-center mx-auto mb-3">
                    <Bot size={22} className="text-white"/>
                  </div>
                  <p className="text-sm font-medium text-text mb-1">Bonjour ! Je suis l&apos;assistant EDHA 👋</p>
                  <p className="text-xs text-text3 mb-4 leading-relaxed">
                    Je réponds en français, kreyòl, english ou español. Comment puis-je vous aider ?
                  </p>
                  <div className="space-y-1.5">
                    {SUGGESTIONS.map(s => (
                      <button key={s} onClick={()=>send(s)}
                        className="w-full text-left text-xs bg-bg2 hover:bg-blue/10 hover:text-blue border border-border hover:border-blue/30 rounded-xl px-3 py-2 transition-colors text-text2">
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={clsx('flex', m.role==='user'?'justify-end':'justify-start')}>
                  {m.role==='assistant' && (
                    <div className="w-6 h-6 rounded-lg edha-gradient flex items-center justify-center flex-shrink-0 mr-2 mt-0.5">
                      <Bot size={12} className="text-white"/>
                    </div>
                  )}
                  <div className={clsx(
                    'max-w-[82%] rounded-2xl px-3 py-2.5 text-sm leading-relaxed',
                    m.role==='user'
                      ? 'edha-gradient text-white rounded-tr-sm'
                      : 'bg-bg2 text-text rounded-tl-sm border border-border'
                  )}>
                    {m.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="w-6 h-6 rounded-lg edha-gradient flex items-center justify-center mr-2 flex-shrink-0">
                    <Bot size={12} className="text-white"/>
                  </div>
                  <div className="bg-bg2 border border-border rounded-2xl rounded-tl-sm px-4 py-3">
                    <div className="flex gap-1">
                      {[0,150,300].map(d => (
                        <div key={d} className="w-1.5 h-1.5 bg-text3 rounded-full animate-bounce" style={{animationDelay:`${d}ms`}}/>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={bottomRef}/>
            </div>
            {/* Input */}
            <div className="p-3 border-t border-border flex-shrink-0">
              <div className="flex items-center gap-2 bg-bg2 border border-border rounded-xl px-3 py-2 focus-within:border-blue/50 transition-colors">
                <input ref={inputRef} value={input} onChange={e=>setInput(e.target.value)}
                  onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&send()}
                  placeholder="Votre message..." disabled={loading}
                  className="flex-1 bg-transparent text-sm text-text outline-none placeholder-text3"/>
                <button onClick={()=>send()} disabled={!input.trim()||loading}
                  className="w-7 h-7 edha-gradient rounded-lg flex items-center justify-center disabled:opacity-40 flex-shrink-0">
                  {loading ? <Loader2 size={12} className="text-white animate-spin"/> : <Send size={12} className="text-white"/>}
                </button>
              </div>
              <p className="text-[10px] text-text3 text-center mt-1.5">Propulsé par Claude AI · EDHA Academy</p>
            </div>
          </>)}
        </div>
      )}
    </>
  )
}
