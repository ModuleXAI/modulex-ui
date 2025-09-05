'use client'

import { cn } from '@/lib/utils'
import { useTheme } from 'next-themes'
import * as React from 'react'

function useModulexLogoSrc() {
  const { theme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return '/modulex.svg'

  const effectiveTheme = theme === 'system' ? resolvedTheme : theme
  return effectiveTheme === 'light' ? '/modulex-light.svg' : '/modulex.svg'
}

function IconLogo({ className, ...props }: React.ComponentProps<'img'>) {
  const logoSrc = useModulexLogoSrc()
  return (
    <img
      src={logoSrc}
      alt="Modulex Logo"
      className={cn('h-64 w-64', className)}
      {...props}
    />
  )
}

function ModulexIcon({ className, ...props }: React.ComponentProps<'img'>) {
  const logoSrc = useModulexLogoSrc()
  return (
    <img
      src={logoSrc}
      alt="Modulex Logo"
      className={cn('h-64 w-64', className)}
      {...props}
    />
  )
}

function ModulexTextIcon({ className, ...props }: React.ComponentProps<'img'>) {
  const logoSrc = useModulexLogoSrc()
  return (
    <img
      src={logoSrc}
      alt="Modulex Logo"
      width={32}
      height={32}
      className={cn('object-contain', className)}
      {...props}
    />
  )
}

export { IconLogo, ModulexIcon, ModulexTextIcon }

