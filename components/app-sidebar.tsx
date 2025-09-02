import {
    Sidebar,
    SidebarContent,
    SidebarHeader,
    SidebarRail,
    SidebarTrigger
} from '@/components/ui/sidebar'
import { isDefaultProvider } from '@/lib/auth/provider'
import { createClient } from '@/lib/supabase/server'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { Suspense } from 'react'
import OrganizationSwitcher from './organization-switcher'
import { ChatHistorySection } from './sidebar/chat-history-section'
import { ChatHistorySkeleton } from './sidebar/chat-history-skeleton'
import { SettingsMenu } from './sidebar/settings-menu'
import { SidebarNewButton } from './sidebar/sidebar-new-button'
import { SidebarSections } from './sidebar/sidebar-sections'
import { ModulexTextIcon } from './ui/icons'

export default async function AppSidebar() {
  let isAuthenticated = true
  if (!isDefaultProvider()) {
    try {
      const supabase = await createClient()
      const {
        data: { user }
      } = await supabase.auth.getUser()
      isAuthenticated = Boolean(user)
    } catch {
      isAuthenticated = false
    }
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <Sidebar side="left" variant="sidebar" collapsible="offcanvas">
      <SidebarHeader className="flex flex-col gap-2 py-2 px-4">
        <div className="flex flex-row justify-between items-center">
          <Link href="/" prefetch={false} className="flex items-center justify-center h-full">
            <ModulexTextIcon className={cn('size-20')} />
          </Link>
          <SidebarTrigger />
        </div>
        <div className="flex items-center">
          <OrganizationSwitcher />
        </div>
      </SidebarHeader>
      <SidebarContent className="flex flex-col px-2 py-0 h-full">
        <SidebarNewButton />
        <SidebarSections
          defaultContent={
            <Suspense fallback={<ChatHistorySkeleton />}>
              <ChatHistorySection />
            </Suspense>
          }
          settingsContent={<SettingsMenu />}
        />
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
