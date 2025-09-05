"use client"

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import * as React from 'react'

type LogsResponse = {
  success: boolean
  organization_id: string
  logs: Array<{
    id: string
    timestamp: string
    log_type: string
    level: 'INFO' | 'WARN' | 'ERROR' | string
    user_id: string | null
    message: string
    success: boolean
    tool_name: string | null
    category: string | null
    details?: string | null
  }>
  pagination: {
    total_count: number
    limit: number
    offset: number
    has_next: boolean
    has_previous: boolean
  }
  filters: {
    start_date: string | null
    end_date: string | null
    log_type: string | null
    level: string | null
    period: '24h' | '7d' | '30d' | '90d' | string | null
  }
}

function getSelectedOrganizationId(): string | null {
  try {
    const raw = localStorage.getItem('modulex_selected_organization')
    if (!raw) return null
    const parsed = JSON.parse(raw) as { id?: string }
    return parsed?.id ?? null
  } catch {
    return null
  }
}

export default function Page() {
  const [period, setPeriod] = React.useState<'24h' | '7d' | '30d' | '90d'>('24h')
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [resp, setResp] = React.useState<LogsResponse | null>(null)
  const [limit] = React.useState(50)
  const [offset, setOffset] = React.useState(0)

  const fetchLogs = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const orgId = getSelectedOrganizationId()
      const qs = new URLSearchParams({ period, limit: String(limit), offset: String(offset) })
      if (orgId) qs.set('organization_id', orgId)
      const res = await fetch(`/api/logs?${qs.toString()}`)
      if (!res.ok) throw new Error(`Failed (${res.status})`)
      const data = (await res.json()) as LogsResponse
      setResp(data)
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [period, limit, offset])

  React.useEffect(() => {
    fetchLogs()
    const onOrgChanged = async () => { setOffset(0); await fetchLogs() }
    window.addEventListener('organization-changed', onOrgChanged as EventListener)
    return () => window.removeEventListener('organization-changed', onOrgChanged as EventListener)
  }, [fetchLogs])

  const logs = resp?.logs ?? []
  const totalCount = resp?.pagination?.total_count ?? 0
  const successCount = logs.filter(l => l.success).length
  const errorCount = logs.filter(l => !l.success || (l.level || '').toUpperCase() === 'ERROR').length
  const infoCount = logs.filter(l => (l.level || '').toUpperCase() === 'INFO').length
  const warnCount = logs.filter(l => (l.level || '').toUpperCase() === 'WARN').length
  const successRate = logs.length > 0 ? Math.round((successCount / logs.length) * 100) : 0

  return (
    <div className="p-6 pt-20 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Logs</h2>
          <p className="text-base text-muted-foreground mt-1">System and organization events</p>
        </div>
        <div className="flex items-center gap-2">
          {(['24h','7d','30d','90d'] as const).map(p => (
            <Button key={p} size="sm" variant={period===p ? 'default' : 'outline'} className={period===p ? '' : 'bg-transparent border border-border text-foreground hover:bg-accent'} onClick={() => { setOffset(0); setPeriod(p) }}>
              {p}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 rounded-lg bg-card border p-4 sm:p-6">
              <div className="flex items-center gap-4 sm:gap-6">
                <Skeleton className="h-18 w-18 rounded-full" />
                <div>
                  <Skeleton className="h-3 w-28" />
                  <div className="mt-2"><Skeleton className="h-4 w-24" /></div>
                </div>
              </div>
              <div className="my-6"><Skeleton className="h-px w-full" /></div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-md bg-accent border p-4"><Skeleton className="h-6 w-36" /><div className="mt-2"><Skeleton className="h-6 w-24" /></div></div>
                <div className="rounded-md bg-accent border p-4"><Skeleton className="h-6 w-40" /><div className="mt-2"><Skeleton className="h-6 w-28" /></div></div>
                <div className="rounded-md bg-accent border p-4"><Skeleton className="h-6 w-48" /><div className="mt-2"><Skeleton className="h-6 w-32" /></div></div>
              </div>
            </div>
            <div className="rounded-lg bg-card border p-4 sm:p-6">
              <Skeleton className="h-4 w-28 mb-3" />
              <Skeleton className="h-5 w-48" />
              <div className="my-4"><Skeleton className="h-px w-full" /></div>
              <Skeleton className="h-4 w-28 mb-3" />
              <Skeleton className="h-5 w-60" />
            </div>
          </div>
          <div className="rounded-lg border bg-card overflow-hidden">
            <div className="h-10 border-b"><Skeleton className="h-10 w-full" /></div>
            <div className="h-80"><Skeleton className="h-full w-full" /></div>
          </div>
        </>
      ) : error ? (
        <div className="text-sm text-red-500">{error}</div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Left wide card */}
            <div className="lg:col-span-2 rounded-lg bg-card border p-4 sm:p-6">
              <div className="flex items-center gap-4 sm:gap-6">
                <div className="relative" style={{ width: 72, height: 72 }}>
                  <div
                    className="rounded-full"
                    style={{ width: '72px', height: '72px', background: `conic-gradient(#67E9AB ${successRate * 3.6}deg, hsl(var(--border)) ${successRate * 3.6}deg)` }}
                  />
                  <div className="absolute inset-1 rounded-full bg-card border grid place-items-center">
                    <span className="text-xs text-foreground">{successRate}%</span>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Success Rate</div>
                  <div className="mt-1 text-sm text-muted-foreground">In current view</div>
                </div>
              </div>
              <div className="border-t my-4 sm:my-6" />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-md bg-accent border p-4">
                  <div className="text-xs text-muted-foreground">Total Logs (page)</div>
                  <div className="mt-1 text-2xl font-semibold text-foreground">{logs.length}</div>
                </div>
                <div className="rounded-md bg-accent border p-4">
                  <div className="text-xs text-muted-foreground">Success</div>
                  <div className="mt-1 text-2xl font-semibold text-foreground">{successCount}</div>
                </div>
                <div className="rounded-md bg-accent border p-4">
                  <div className="text-xs text-muted-foreground">Errors</div>
                  <div className="mt-1 text-2xl font-semibold text-foreground">{errorCount}</div>
                </div>
              </div>
            </div>
            {/* Right highlights */}
            <div className="rounded-lg bg-card border p-4 sm:p-6 flex flex-col gap-3 min-h-[220px]">
              <div>
                <div className="text-xs text-muted-foreground mb-2">Levels (page)</div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded px-2 py-1 border text-xs text-muted-foreground">INFO: {infoCount}</div>
                  <div className="rounded px-2 py-1 border text-xs text-muted-foreground">WARN: {warnCount}</div>
                  <div className="rounded px-2 py-1 border text-xs text-muted-foreground">ERROR: {errorCount}</div>
                </div>
              </div>
              <div className="border-t mt-3 mb-1" />
              <div>
                <div className="text-xs text-muted-foreground mb-2">Total (backend)</div>
                <div className="text-sm text-muted-foreground">{totalCount}</div>
              </div>
            </div>
          </div>

          {/* List */}
          <div className="rounded-lg border bg-card overflow-hidden">
            <div className="grid grid-cols-[220px_100px_100px_1fr] gap-4 px-4 py-3 text-xs text-muted-foreground border-b">
              <div>Time</div>
              <div className="text-right">Type</div>
              <div className="text-right">Level</div>
              <div className="text-left">Message</div>
            </div>
            {logs.length ? (
              <div className="h-80 overflow-y-auto divide-y divide-border">
                {logs.map(l => (
                  <div key={l.id} className="grid grid-cols-[220px_100px_100px_1fr] items-center gap-4 px-4 py-3">
                    <div className="text-xs text-muted-foreground font-mono tabular-nums whitespace-nowrap">{new Date(l.timestamp).toLocaleString()}</div>
                    <div className="text-right text-xs text-muted-foreground truncate">{l.log_type}</div>
                    <div className="text-right text-xs">
                      <span className={`px-2 py-0.5 rounded border ${((l.level || '').toUpperCase() === 'ERROR') ? 'text-red-600 dark:text-red-400 border-red-400/30' : (l.level || '').toUpperCase() === 'WARN' ? 'text-yellow-600 dark:text-yellow-300 border-yellow-300/30' : 'text-foreground/80 border-border'}`}>{l.level}</span>
                    </div>
                    <div className="text-sm text-foreground truncate" title={l.message}>{l.message}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-4 py-6 text-sm text-muted-foreground">No logs found for this period.</div>
            )}
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <div className="text-xs text-muted-foreground">Page {Math.floor(offset / limit) + 1}</div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="bg-transparent border border-border text-foreground hover:bg-accent" onClick={() => setOffset(o => Math.max(0, o - limit))} disabled={offset === 0}>Prev</Button>
                <Button variant="outline" size="sm" className="bg-transparent border border-border text-foreground hover:bg-accent" onClick={() => setOffset(o => o + limit)} disabled={!resp?.pagination?.has_next}>Next</Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}


