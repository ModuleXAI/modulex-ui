'use client'

import { cn } from '@/lib/utils'
import { getCookie, setCookie } from '@/lib/utils/cookies'
import { Brain } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Toggle } from './ui/toggle'

export function UltraModeToggle() {
  const [isUltraMode, setIsUltraMode] = useState(false)

  useEffect(() => {
    const saved = getCookie('ultra-mode')
    if (saved !== null) {
      setIsUltraMode(saved === 'true')
    } else {
      setCookie('ultra-mode', 'false')
    }
  }, [])

  const handleChange = (pressed: boolean) => {
    setIsUltraMode(pressed)
    setCookie('ultra-mode', pressed.toString())
  }

  return (
    <Toggle
      aria-label="Toggle UltraModulex mode"
      pressed={isUltraMode}
      onPressedChange={handleChange}
      variant="outline"
      className={cn(
        'gap-1 px-3 border border-input text-muted-foreground bg-background',
        'data-[state=on]:bg-purple-600/90',
        'data-[state=on]:text-white',
        'data-[state=on]:border-purple-500',
        'hover:bg-accent hover:text-accent-foreground rounded-full'
      )}
    >
      <Brain className="size-4" />
      <span className="text-xs">Ultra</span>
    </Toggle>
  )
}


