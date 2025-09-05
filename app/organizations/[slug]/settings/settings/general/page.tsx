"use client"

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import * as React from 'react'

type Organization = {
  id: string
  name: string
  slug?: string
  domain?: string | null
}

function getSelectedOrganization(): Organization | null {
  try {
    const raw = localStorage.getItem('modulex_selected_organization')
    if (!raw) return null
    return JSON.parse(raw) as Organization
  } catch {
    return null
  }
}

export default function Page() {
  const [loading, setLoading] = React.useState(true)
  const [updating, setUpdating] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [organization, setOrganization] = React.useState<Organization | null>(null)
  const [name, setName] = React.useState('')

  React.useEffect(() => {
    const org = getSelectedOrganization()
    setOrganization(org)
    setName(org?.name || '')
    setLoading(false)
  }, [])

  const canSave = React.useMemo(() => {
    if (!organization) return false
    const trimmed = name.trim()
    return trimmed.length > 0 && trimmed !== (organization.name || '')
  }, [name, organization])

  const handleSave = async () => {
    if (!organization) return
    const trimmed = name.trim()
    if (!trimmed) return
    try {
      setUpdating(true)
      setError(null)
      const res = await fetch(`/api/organizations/${encodeURIComponent(organization.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed })
      })
      if (!res.ok) {
        const msg = await res.text().catch(() => '')
        throw new Error(msg || `Failed (${res.status})`)
      }
      const next = { ...organization, name: trimmed }
      setOrganization(next)
      setName(trimmed)
      try { localStorage.setItem('modulex_selected_organization', JSON.stringify(next)) } catch {}
      try { window.dispatchEvent(new CustomEvent('organization-changed', { detail: next.id })) } catch {}
    } catch (e: any) {
      setError(e?.message || 'Failed to update name')
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div className="p-6 pt-20 space-y-6">
      <div>
        <h2 className="text-xl font-semibold">General</h2>
        <p className="text-base text-muted-foreground mt-1">Organization details and preferences.</p>
      </div>

      {loading ? (
        <div className="rounded-lg bg-card border p-4 sm:p-6">
          <div className="space-y-3 max-w-xl">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-9 w-full" />
            <div className="flex gap-2 justify-end">
              <Skeleton className="h-9 w-24" />
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-lg bg-card border p-4 sm:p-6 max-w-xl">
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Organization Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter organization name"
              />
              {error ? <div className="mt-2 text-xs text-red-400">{error}</div> : null}
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="outline"
                className="bg-transparent border border-border text-foreground hover:bg-accent"
                onClick={() => {
                  setName(organization?.name || '')
                  setError(null)
                }}
                disabled={!organization || updating || name.trim() === (organization?.name || '')}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={!canSave || updating}
                className="bg-[#67E9AB] text-black hover:bg-[#58D99C]"
              >
                {updating ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


