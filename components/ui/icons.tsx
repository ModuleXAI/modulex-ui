'use client'

import { cn } from '@/lib/utils'

function IconLogo({ className, ...props }: React.ComponentProps<'img'>) {
  return (
    <img
      src="/modulex-logo.svg"
      alt="Modulex Logo"
      className={cn('h-64 w-64', className)}
      {...props}
    />
  )
}

function ModulexIcon({ className, ...props }: React.ComponentProps<'img'>) {
  return (
    <img
      src="/modulex-iconlogo.svg"
      alt="Modulex Logo"
      className={cn('h-64 w-64', className)}
      {...props}
    />
  )
}

function ModulexTextIcon({ className, ...props }: React.ComponentProps<'img'>) {
  return (
    <img
      src="/modulex-textlogo.svg"
      alt="Modulex Logo"
      className={cn('h-12 w-12', className)}
      {...props}
    />
  )
}

export { IconLogo, ModulexIcon, ModulexTextIcon }

