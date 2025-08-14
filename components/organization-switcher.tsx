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
import { Building2, ChevronDown } from 'lucide-react'
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

  const handleSelect = (org: Organization) => {
    setSelected(org)
    storeOrganization(org)
    try { setCookie('selected_organization_id', org.id) } catch {}
    try { window.dispatchEvent(new CustomEvent('organization-changed', { detail: org.id })) } catch {}
    // Reload the whole page when organization changes
    try {
      if (selected?.id !== org.id) {
        // SPA navigation to avoid white flash; ensure server refetches with new cookie
        if (pathname !== '/') {
          router.replace('/')
        }
        router.refresh()
      }
    } catch {}
  }

  const buttonLabel = selected?.name || (loading ? 'Loading...' : 'Select organization')

  return (
    <DropdownMenu>
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
              onSelect={() => {
                handleSelect(org)
              }}
              className={cn(
                'flex flex-col items-start gap-0.5',
                selected?.id === org.id && 'bg-accent/60'
              )}
            >
              <span className="w-full truncate font-medium">{org.name}</span>
              <span className="w-full truncate text-xs text-muted-foreground">
                {org.domain || org.slug}
              </span>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}


