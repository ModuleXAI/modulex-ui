'use client'

import { cn } from '@/lib/utils'
import { usePathname } from 'next/navigation'

interface SidebarSectionsProps {
  defaultContent: React.ReactNode
  settingsContent: React.ReactNode
}

export function SidebarSections({ defaultContent, settingsContent }: SidebarSectionsProps) {
  const pathname = usePathname()
  const isSettings = /^\/organizations\/.+\/settings(\/?|$)/.test(pathname || '')

  return (
    <div className="flex-1 overflow-y-auto no-scrollbar">
      <div className={cn(isSettings ? 'hidden' : 'block')}>{defaultContent}</div>
      <div className={cn(isSettings ? 'block mt-2' : 'hidden')}>{settingsContent}</div>
    </div>
  )
}


