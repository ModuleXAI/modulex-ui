'use client'

import {
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem
} from '@/components/ui/sidebar'
import { Plus } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function SidebarNewButton() {
  const pathname = usePathname() || ''
  const isSettings = /^\/organizations\/.+\/settings(\/?|$)/.test(pathname)

  if (isSettings) return null

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton asChild>
          <Link href="/" prefetch={false} className="flex items-center gap-2">
            <Plus className="size-4" />
            <span>New</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}


