'use client'

import { SidebarTrigger, useSidebar } from '@/components/ui/sidebar'
import { cn } from '@/lib/utils'
import { User } from '@supabase/supabase-js'
// import Link from 'next/link' // No longer needed directly here for Sign In button
import * as React from 'react'
// import { Button } from './ui/button' // No longer needed directly here for Sign In button
import GuestMenu from './guest-menu'; // Import the new GuestMenu component
import UserMenu from './user-menu'

interface HeaderProps {
  user: User | null
}

export const Header: React.FC<HeaderProps> = ({ user }) => {
  const { open } = useSidebar()
  return (
    <header
      className={cn(
        'absolute top-1 right-0 p-2 flex justify-between items-center z-10 backdrop-blur lg:backdrop-blur-none bg-background/80 lg:bg-transparent transition-[width] duration-200 ease-linear border-b',
        open ? 'md:w-[calc(100%-var(--sidebar-width))]' : 'md:w-full',
        'w-full'
      )}
    >
      <div className="flex items-center">
        <div className="flex flex-col items-center">
          <SidebarTrigger />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex flex-col items-center">
          {user ? <UserMenu user={user} /> : <GuestMenu />}
        </div>
      </div>
    </header>
  )
}

export default Header
