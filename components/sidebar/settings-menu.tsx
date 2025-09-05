'use client'

import {
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem
} from '@/components/ui/sidebar'
import { BarChart3, BookOpen, Cog, FileText, LayoutGrid, Users } from 'lucide-react'
import Link from 'next/link'
import { useParams, usePathname } from 'next/navigation'

const TOP = [
  { key: 'browse', label: 'Browse Tools', icon: LayoutGrid },
  { key: 'my-tools', label: 'My Tools', icon: BookOpen },
  { key: 'analytics', label: 'Analytics', icon: BarChart3 },
  { key: 'users', label: 'Users', icon: Users },
  { key: 'logs', label: 'Logs', icon: FileText },
  { key: 'settings', label: 'Settings', icon: Cog }
]

const SUB: Record<string, { key: string; label: string }[]> = {
  analytics: [
    { key: 'overview', label: 'Overview' },
    { key: 'tools', label: 'Tools' },
    { key: 'llm-usage', label: 'LLM Usages' }
  ],
  settings: [
    { key: 'general', label: 'General' },
    { key: 'integrations', label: 'Integrations' },
    { key: 'billing', label: 'Billing' },
    { key: 'advanced', label: 'Advanced' }
  ]
}

export function SettingsMenu() {
  const pathname = usePathname()
  const params = useParams<{ slug?: string }>()
  const slug = params?.slug ?? ''

  if (!/^\/organizations\/.+\/settings(\/?|$)/.test(pathname || '')) {
    return null
  }

  const segments = (pathname || '').split('/')
  const tab = segments[4] || 'browse'
  const subtab = segments[5] || (tab === 'analytics' ? 'overview' : tab === 'settings' ? 'general' : '')

  const buildPath = (t: string, s?: string) => {
    if (t === 'analytics') {
      return `/organizations/${slug}/settings/analytics/${s || subtab || 'overview'}`
    }
    if (t === 'settings') {
      return `/organizations/${slug}/settings/settings/${s || subtab || 'general'}`
    }
    return `/organizations/${slug}/settings/${t}`
  }

  return (
    <SidebarMenu>
      {TOP.map(({ key, label, icon: Icon }) => {
        const isActive = tab === key
        const subTabs = SUB[key] || []
        return (
          <SidebarMenuItem key={key}>
            <SidebarMenuButton asChild isActive={isActive}>
              <Link href={buildPath(key, isActive ? subtab : undefined)} prefetch className="flex items-center gap-2">
                <Icon className="size-4" />
                <span>{label}</span>
              </Link>
            </SidebarMenuButton>
            {subTabs.length > 0 && isActive ? (
              <SidebarMenuSub>
                {subTabs.map(({ key: sKey, label: sLabel }) => (
                  <SidebarMenuSubItem key={sKey}>
                    <SidebarMenuSubButton asChild isActive={subtab === sKey}>
                      <Link href={buildPath(key, sKey)} prefetch className="flex items-center gap-2">
                        <span>{sLabel}</span>
                      </Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                ))}
              </SidebarMenuSub>
            ) : null}
          </SidebarMenuItem>
        )
      })}
    </SidebarMenu>
  )
}


