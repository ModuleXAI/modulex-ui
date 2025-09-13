'use client'

import { cn } from '@/lib/utils'
import { getCookie, setCookie } from '@/lib/utils/cookies'
import { Brain, Globe } from 'lucide-react'
import { useEffect, useState } from 'react'

export function ModeSwitch() {
  const [webOn, setWebOn] = useState(true)
  const [ultraOn, setUltraOn] = useState(false)

  useEffect(() => {
    try {
      const savedWeb = getCookie('search-mode')
      const savedUltra = getCookie('ultra-mode')
      if (savedWeb !== null) setWebOn(savedWeb === 'true')
      if (savedUltra !== null) setUltraOn(savedUltra === 'true')
      if (savedWeb === null) setCookie('search-mode', 'true')
      if (savedUltra === null) setCookie('ultra-mode', 'false')
    } catch {}
  }, [])

  const toggleWeb = () => {
    const next = !webOn
    setWebOn(next)
    setCookie('search-mode', String(next))
  }

  const toggleUltra = () => {
    const next = !ultraOn
    setUltraOn(next)
    setCookie('ultra-mode', String(next))
  }

  return (
    <div
      className={cn(
        'inline-flex items-center h-8 rounded-3xl border border-input bg-background overflow-hidden',
        'text-muted-foreground'
      )}
      role="group"
      aria-label="Mode switch"
    >
      <button
        type="button"
        onClick={toggleWeb}
        className={cn(
          'flex items-center gap-1 px-3 h-full text-xs',
          'transition-colors',
          webOn
            ? 'bg-accent-blue text-accent-blue-foreground'
            : 'hover:bg-accent hover:text-accent-foreground'
        )}
        aria-pressed={webOn}
      >
        <Globe className="h-3.5 w-3.5" />
        <span>Web</span>
      </button>
      <div className="w-px h-5 bg-border/70" aria-hidden />
      <button
        type="button"
        onClick={toggleUltra}
        className={cn(
          'flex items-center gap-1 px-3 h-full text-xs',
          'transition-colors',
          ultraOn
            ? 'bg-purple-600/90 text-white'
            : 'hover:bg-accent hover:text-accent-foreground'
        )}
        aria-pressed={ultraOn}
      >
        <Brain className="h-3.5 w-3.5" />
        <span>Ultra</span>
      </button>
    </div>
  )
}


