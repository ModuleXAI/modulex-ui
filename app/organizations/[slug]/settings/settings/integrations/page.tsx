"use client"

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { getApiErrorMessage } from '@/lib/utils/api-error'
import * as React from 'react'
import { toast } from 'sonner'

type AllowedKey = {
  key_id: string
  display_name: string
  description?: string
}

type MaskedKey = {
  key_id: string
  status?: 'enabled' | 'disabled'
  masked_value?: string | null
  created_date?: string | null
  updated_date?: string | null
}

function getSelectedOrganizationId(): string | null {
  try {
    const raw = localStorage.getItem('modulex_selected_organization')
    if (!raw) return null
    return (JSON.parse(raw) as { id?: string }).id ?? null
  } catch {
    return null
  }
}

export default function Page() {
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [allowed, setAllowed] = React.useState<AllowedKey[]>([])
  const [masked, setMasked] = React.useState<Record<string, MaskedKey>>({})
  const [operationKey, setOperationKey] = React.useState<string | null>(null)
  const [drafts, setDrafts] = React.useState<Record<string, string>>({})

  const fetchData = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const orgId = getSelectedOrganizationId()
      const qs = orgId ? `?organization_id=${encodeURIComponent(orgId)}` : ''
      const [aRes, mRes] = await Promise.all([
        fetch(`/api/integrations/service-keys/allowed${qs}`),
        fetch(`/api/integrations/service-keys/masked${qs}`)
      ])
      if (!aRes.ok) throw new Error(await getApiErrorMessage(aRes, 'Failed to load allowed keys'))
      if (!mRes.ok) throw new Error(await getApiErrorMessage(mRes, 'Failed to load keys'))
      const aJson = await aRes.json()
      const mJson = await mRes.json()
      const allowedKeys: AllowedKey[] = (aJson?.keys as AllowedKey[]) || []
      const maskedList: MaskedKey[] = (mJson?.keys as MaskedKey[]) || []
      const maskedMap: Record<string, MaskedKey> = {}
      for (const k of maskedList) maskedMap[k.key_id] = k
      // Initialize drafts using masked values if present
      const nextDrafts: Record<string, string> = {}
      for (const k of allowedKeys) {
        nextDrafts[k.key_id] = maskedMap[k.key_id]?.masked_value || ''
      }
      setAllowed(allowedKeys)
      setMasked(maskedMap)
      setDrafts(nextDrafts)
    } catch (e: any) {
      setError(e?.message || 'Failed to load API keys')
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchData()
    const onOrgChanged = async () => {
      setDrafts({})
      await fetchData()
    }
    window.addEventListener('organization-changed', onOrgChanged as EventListener)
    return () => window.removeEventListener('organization-changed', onOrgChanged as EventListener)
  }, [fetchData])

  const handleToggle = async (keyId: string, nextEnabled: boolean) => {
    try {
      setOperationKey(keyId)
      const orgId = getSelectedOrganizationId()
      const qs = orgId ? `?organization_id=${encodeURIComponent(orgId)}` : ''
      const res = await fetch(`/api/integrations/service-keys/${encodeURIComponent(keyId)}/status${qs}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextEnabled ? 'enabled' : 'disabled' })
      })
      if (!res.ok) {
        const msg = await getApiErrorMessage(res, 'Failed to update status')
        throw new Error(msg)
      }
      await fetchData()
      toast('Status updated', { duration: 2000 })
    } catch (e: any) {
      toast(e?.message || 'Failed to update status', { duration: 3000 })
    } finally {
      setOperationKey(null)
    }
  }

  const handleDelete = async (keyId: string) => {
    try {
      setOperationKey(keyId)
      const orgId = getSelectedOrganizationId()
      const qs = orgId ? `?organization_id=${encodeURIComponent(orgId)}` : ''
      const res = await fetch(`/api/integrations/service-keys/${encodeURIComponent(keyId)}${qs}`, { method: 'DELETE' })
      if (!res.ok) {
        const msg = await getApiErrorMessage(res, 'Failed to delete key')
        throw new Error(msg)
      }
      await fetchData()
      toast('Key removed', { duration: 2000 })
    } catch (e: any) {
      toast(e?.message || 'Failed to delete key', { duration: 3000 })
    } finally {
      setOperationKey(null)
    }
  }

  const handleSaveValue = async (keyId: string) => {
    const value = (drafts[keyId] || '').trim()
    if (!value) {
      toast('Please enter a key value', { duration: 2500 })
      return
    }
    // Prevent submitting the unchanged masked value
    const existingMasked = masked[keyId]?.masked_value || ''
    if (existingMasked && value === existingMasked) {
      toast('Please enter a new key value (not the masked one).', { duration: 3000 })
      return
    }
    try {
      setOperationKey(keyId)
      const orgId = getSelectedOrganizationId()
      const qs = orgId ? `?organization_id=${encodeURIComponent(orgId)}` : ''
      const res = await fetch(`/api/integrations/service-keys${qs}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key_id: keyId, key_value: value, verify: true, status: 'enabled' })
      })
      if (!res.ok) {
        const msg = await getApiErrorMessage(res, 'Failed to save key')
        throw new Error(msg)
      }
      const data = await res.json().catch(() => ({}))
      if (data?.verified === false) {
        toast('Key verification failed. Please check the value.', { duration: 3500 })
        return
      }
      toast('Key saved', { duration: 2000 })
      await fetchData()
    } catch (e: any) {
      toast(e?.message || 'Failed to save key', { duration: 3000 })
    } finally {
      setOperationKey(null)
    }
  }

  const items = React.useMemo(() => {
    return allowed.map((k) => ({
      ...k,
      masked: masked[k.key_id]
    }))
  }, [allowed, masked])

  function renderDescription(description?: string) {
    if (!description) return null
    const openIdx = description.indexOf('[')
    const closeIdx = description.indexOf(']', openIdx + 1)
    if (openIdx > 0 && closeIdx > openIdx + 1) {
      const url = description.slice(openIdx + 1, closeIdx)
      const before = description.slice(0, openIdx)
      const after = description.slice(closeIdx + 1)
      const match = before.match(/^(.*?)([^\s]+)\s+([^\s]+)\s*$/)
      if (match) {
        const prefix = match[1] || ''
        const word1 = match[2]
        const word2 = match[3]
        return (
          <div className="text-xs text-white/70 mt-1 break-words">
            {prefix}
            <a href={url} target="_blank" rel="noreferrer" className="underline text-white hover:text-[#67E9AB]">
              {word1} {word2}
            </a>
            {after}
          </div>
        )
      }
    }
    return <div className="text-xs text-white/70 mt-1 break-words">{description}</div>
  }

  return (
    <div className="p-6 pt-14 space-y-6">
      <div>
        <h2 className="text-xl font-semibold">API Keys</h2>
        <p className="text-base text-muted-foreground mt-1">Connect your own provider keys to use services at cost.</p>
      </div>

      {loading ? (
        <div className="rounded-lg bg-[#1D1D1D] border border-[#292929] p-4 sm:p-6">
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="grid grid-cols-[1fr_auto] gap-4 items-center py-2">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-72" />
                </div>
                <Skeleton className="h-6 w-32" />
              </div>
            ))}
          </div>
        </div>
      ) : error ? (
        <div className="text-sm text-red-500">{error}</div>
      ) : (
        <div className="rounded-lg bg-[#1D1D1D] border border-[#292929] divide-y divide-[#292929]">
          {items.map((item) => {
            const exists = Boolean(item.masked)
            const enabled = (item.masked?.status || 'disabled') === 'enabled'
            return (
              <div key={item.key_id} className="p-3 sm:p-4">
                <div className="grid grid-cols-1 md:grid-cols-[minmax(220px,280px)_minmax(260px,1fr)_auto] items-start md:items-center gap-3">
                  <div className="min-w-0">
                    <div className="text-white font-medium truncate flex items-center gap-2">
                      <span className="truncate">{item.display_name}</span>
                      {exists ? (
                        <Switch
                          checked={enabled}
                          onCheckedChange={(checked) => handleToggle(item.key_id, checked)}
                          variant="green"
                          size="xs"
                          className="scale-90"
                          disabled={operationKey === item.key_id}
                        />
                      ) : null}
                    </div>
                    {item.description ? renderDescription(item.description) : null}
                    {exists && item.masked?.updated_date ? (
                      <div className="text-[10px] text-white/40 mt-1">Updated: {new Date(item.masked.updated_date!).toLocaleString()}</div>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-2">
                    <Input
                      value={drafts[item.key_id] || ''}
                      onChange={(e) => setDrafts((prev) => ({ ...prev, [item.key_id]: e.target.value }))}
                      placeholder={exists ? 'Enter new key value' : 'Enter key value'}
                      className="bg-[#1D1D1D] border-[#292929] text-white placeholder:text-white/40 h-9"
                    />
                  </div>

                  <div className="flex items-center gap-2 justify-end">
                    {(() => {
                      const currentDraft = (drafts[item.key_id] || '').trim()
                      const maskedValue = (masked[item.key_id]?.masked_value || '')
                      const hasChangeExisting = exists && currentDraft && currentDraft !== maskedValue
                      const shouldShowSave = (!exists) || hasChangeExisting
                      return (
                        <>
                          {shouldShowSave ? (
                            <Button
                              variant="outline"
                              className="bg-transparent border-[#67E9AB] text-[#67E9AB] hover:bg-[#67E9AB]/10 hover:text-[#67E9AB] disabled:text-white/70 disabled:border-white/20 disabled:hover:bg-transparent disabled:hover:text-white/70"
                              onClick={() => handleSaveValue(item.key_id)}
                              disabled={operationKey === item.key_id || !currentDraft || (exists && currentDraft === maskedValue)}
                            >
                              {operationKey === item.key_id ? 'Saving...' : 'Save'}
                            </Button>
                          ) : null}
                          {exists ? (
                            <>
                              {!hasChangeExisting ? (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="outline"
                                      className="bg-transparent border-red-500/40 text-red-400 hover:bg-red-500/10"
                                      disabled={operationKey === item.key_id}
                                    >
                                      Delete
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Remove API Key</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        This will delete the key {item.display_name} for your organization. This action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleDelete(item.key_id)} className="bg-red-500 text-white hover:bg-red-600">
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              ) : null}
                            </>
                          ) : null}
                        </>
                      )
                    })()}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}


