import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarRail
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
      <SidebarHeader className="flex flex-col gap-2 py-2 px-2">
        <div className="flex flex-row items-center gap-2">
          <Link href="/" prefetch={false} className="flex items-center justify-center w-12 h-12 flex-none shrink-0">
            <ModulexTextIcon className={cn('size-8 shrink-0')} />
          </Link>
          <OrganizationSwitcher className={cn('h-8 w-48 mt-0 -ml-0 translate-x-[-10px] shrink-0')} />
          <div className="ml-auto" />
        </div>
      </SidebarHeader>
      <SidebarContent className="flex flex-col px-2 py-1 h-full">
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
