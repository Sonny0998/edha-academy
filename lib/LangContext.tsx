'use client'
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import type { Lang } from './i18n'
import { t as translate } from './i18n'

interface LangContextType {
  lang: Lang
  setLang: (l: Lang) => void
  t: (key: string) => string
}

const LangContext = createContext<LangContextType>({
  lang: 'fr',
  setLang: () => {},
  t: (key) => key,
})

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('fr')

  useEffect(() => {
    // Restore persisted language preference
    const saved = localStorage.getItem('edha_lang') as Lang | null
    if (saved && ['fr', 'ht', 'en', 'es'].includes(saved)) {
      setLangState(saved)
      document.documentElement.lang = saved
    }
  }, [])

  const setLang = (l: Lang) => {
    setLangState(l)
    localStorage.setItem('edha_lang', l)
    document.documentElement.lang = l
  }

  const t = (key: string) => translate(key, lang)

  return (
    <LangContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LangContext.Provider>
  )
}

export function useLang() {
  return useContext(LangContext)
}
