'use client'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { setCookie } from '@/lib/utils/cookies'
import { Building2, ChevronDown, Settings2 } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import React from 'react'

type Organization = {
  id: string
  slug: string
  name: string
  domain?: string | null
  role?: string | null
  joined_at?: string | null
  is_default?: boolean | null
}

type OrganizationsResponse = {
  success: boolean
  user_id: string
  organizations: Organization[]
  total: number
}

const STORAGE_KEY = 'modulex_selected_organization'

function truncateText(value: string | null | undefined, max: number = 25): string {
  const text = value ?? ''
  if (text.length <= max) return text
  return text.slice(0, max) + '...'
}

function loadStoredOrganization(): Organization | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as Organization
  } catch {
    return null
  }
}

function storeOrganization(org: Organization) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(org))
  } catch {}
}

export default function OrganizationSwitcher({
  className
}: {
  className?: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [organizations, setOrganizations] = React.useState<Organization[]>([])
  const [selected, setSelected] = React.useState<Organization | null>(null)
  const [loading, setLoading] = React.useState<boolean>(false)
  const [error, setError] = React.useState<string | null>(null)
  const [menuOpen, setMenuOpen] = React.useState<boolean>(false)

  // On mount, hydrate selection from localStorage to avoid SSR/client mismatch
  React.useEffect(() => {
    const stored = loadStoredOrganization()
    if (stored) {
      setSelected(stored)
      try { setCookie('selected_organization_id', stored.id) } catch {}
    }
  }, [])

  React.useEffect(() => {
    let isMounted = true
    async function fetchOrganizations() {
      setLoading(true)
      setError(null)
      try {
        const supabase = createClient()
        const { data } = await supabase.auth.getSession()
        const token = data.session?.access_token
        if (!token) {
          if (isMounted) {
            setLoading(false)
            setOrganizations([])
          }
          return
        }

        const response = await fetch(
          'https://ixunqceqxxezymhvbdpe.supabase.co/functions/v1/api/auth/me/organizations',
          {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        )
        if (!response.ok) {
          throw new Error('Failed to load organizations')
        }
        const json = (await response.json()) as OrganizationsResponse
        if (!json.success) {
          throw new Error('Unable to fetch organizations')
        }
        const orgs = json.organizations || []
        if (isMounted) {
          setOrganizations(orgs)
          // If nothing selected yet, choose first available
          if (!loadStoredOrganization() && !selected && orgs.length > 0) {
            setSelected(orgs[0])
            storeOrganization(orgs[0])
            try { setCookie('selected_organization_id', orgs[0].id) } catch {}
          }
        }
      } catch (err: any) {
        if (isMounted) setError(err?.message || 'An error occurred')
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    // initial fetch
    fetchOrganizations()
    return () => {
      isMounted = false
    }
  }, [selected])

  const isSettingsPath = React.useMemo(() => {
    if (!pathname) return false
    return /^\/organizations\/.+\/settings(\/?|$)/.test(pathname)
  }, [pathname])

  const isAdminOrOwner = (role?: string | null) => {
    const r = (role || '').toLowerCase()
    return r === 'admin' || r === 'owner'
  }

  const handleSelect = (org: Organization) => {
    const nextIsSettings = isSettingsPath
    const canAccessSettings = isAdminOrOwner(org.role)

    setSelected(org)
    storeOrganization(org)
    try { setCookie('selected_organization_id', org.id) } catch {}
    try { window.dispatchEvent(new CustomEvent('organization-changed', { detail: org.id })) } catch {}

    try {
      if (selected?.id !== org.id) {
        if (nextIsSettings) {
          if (canAccessSettings) {
            router.push(`/organizations/${org.slug}/settings`)
            router.refresh()
          }
          // If cannot access settings here, do nothing (disabled in UI already)
        } else {
          if (pathname !== '/') {
            router.replace('/')
          }
          router.refresh()
        }
      }
    } catch {}
  }

  const buttonLabel = selected?.name || (loading ? 'Loading...' : 'Select organization')

  return (
    <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn('gap-2 h-9 w-56', className)}
          aria-label="Select organization"
        >
          <Building2 className="h-4 w-4" />
          <span className="flex-1 truncate text-left">{buttonLabel}</span>
          <ChevronDown className="h-4 w-4 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Organizations</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {error ? (
          <DropdownMenuItem disabled>{error}</DropdownMenuItem>
        ) : organizations.length === 0 ? (
          <DropdownMenuItem disabled>
            {loading ? 'Loading...' : 'No organizations'}
          </DropdownMenuItem>
        ) : (
          organizations.map(org => (
            <DropdownMenuItem
              key={org.id}
              disabled={isSettingsPath && !isAdminOrOwner(org.role)}
              onSelect={event => {
                if (isSettingsPath && !isAdminOrOwner(org.role)) {
                  event.preventDefault()
                  return
                }
                handleSelect(org)
              }}
              className={cn(
                'flex items-center gap-2',
                selected?.id === org.id && 'bg-accent/60'
              )}
            >
              <div className="flex min-w-0 flex-1 flex-col items-start gap-0.5">
                <span className="w-full truncate font-medium">{truncateText(org.name, 30)}</span>
                <span className="w-full truncate text-xs text-muted-foreground">
                  {truncateText(org.domain || org.slug, 30)}
                </span>
              </div>
              {!isSettingsPath && ['admin', 'owner'].includes((org.role || '').toLowerCase()) ? (
                <button
                  type="button"
                  className="ml-2 inline-flex items-center justify-center rounded hover:bg-accent p-1 text-muted-foreground"
                  aria-label="Open organization settings"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    try {
                      router.push(`/organizations/${org.slug}/settings`)
                      setMenuOpen(false)
                    } catch {}
                  }}
                >
                  <Settings2 className="h-4 w-4" />
                </button>
              ) : null}
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}


