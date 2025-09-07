'use client'

import { SidebarTrigger, useSidebar } from '@/components/ui/sidebar'
import { cn } from '@/lib/utils'
import { User } from '@supabase/supabase-js'
// import Link from 'next/link' // No longer needed directly here for Sign In button
import * as React from 'react'
// import { Button } from './ui/button' // No longer needed directly here for Sign In button
import { usePathname } from 'next/navigation'
import GuestMenu from './guest-menu'; // Import the new GuestMenu component
import UserMenu from './user-menu'

interface HeaderProps {
  user: User | null
}

export const Header: React.FC<HeaderProps> = ({ user }) => {
  const { open } = useSidebar()
  const pathname = usePathname()
  const isSettings = React.useMemo(() => /^\/organizations\/.+\/settings(\/?|$)/.test(pathname || ''), [pathname])
  return (
    <header
      className={cn(
        'absolute top-2 right-0 px-0 py-0 z-10 backdrop-blur lg:backdrop-blur-none bg-background/80 lg:bg-transparent transition-[width] duration-200 ease-linear',
        open ? 'md:w-[calc(100%-var(--sidebar-width))]' : 'md:w-full',
        'w-full'
      )}
    >
      <div className={cn('flex items-center w-full h-14 -translate-x-0', isSettings && 'mx-0 relative after:absolute after:left-0 after:right-2.5 after:bottom-0 after:h-px after:bg-border')}> 
        <div className="flex-1 flex items-center">
          <div className="flex flex-col items-center translate-x-2">
            <SidebarTrigger />
          </div>
        </div>
        <div className="flex items-center gap-2 -translate-x-6">
          <div className="flex flex-col items-center">
            {user ? <UserMenu user={user} /> : <GuestMenu />}
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header
