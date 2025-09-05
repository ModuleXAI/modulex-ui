'use client'

import { cn } from '@/lib/utils'

function IconLogo({ className, ...props }: React.ComponentProps<'img'>) {
  return (
    <img
      src="/modulex.svg"
      alt="Modulex Logo"
      className={cn('h-64 w-64', className)}
      {...props}
    />
  )
}

function ModulexIcon({ className, ...props }: React.ComponentProps<'img'>) {
  return (
    <img
      src="/modulex.svg"
      alt="Modulex Logo"
      className={cn('h-64 w-64', className)}
      {...props}
    />
  )
}

function ModulexTextIcon({ className, ...props }: React.ComponentProps<'img'>) {
  return (
    <img
      src="/modulex.svg"
      alt="Modulex Logo"
      width={32}
      height={32}
      className={cn('object-contain', className)}
      {...props}
    />
  )
}

export { IconLogo, ModulexIcon, ModulexTextIcon }

