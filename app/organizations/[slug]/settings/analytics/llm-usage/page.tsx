"use client"

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import * as React from 'react'

type LlmUsageResponse = {
  success: boolean
  organization_id: string
  data: {
    total_ai_request: number
    request_success_rate: number
    top_member: string | null
    total_completion_tokens: number
    total_prompt_tokens: number
    llm_usages: Array<{
      user_email: string
      provider: string
      model: string
      prompt_tokens: number
      completion_tokens: number
      request_time: string
      status: 'success' | 'error' | string
      usage_from_modulex: boolean
    }>
  }
  meta: {
    timestamp: string
    period: '24h' | '7d' | '30d' | '90d'
    cached: boolean
    limit: number
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
  const [data, setData] = React.useState<LlmUsageResponse['data'] | null>(null)
  const [limit] = React.useState(20)
  const [offset, setOffset] = React.useState(0)

  const fetchUsage = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const orgId = getSelectedOrganizationId()
      const qs = new URLSearchParams({ period, limit: String(limit), offset: String(offset) })
      if (orgId) qs.set('organization_id', orgId)
      const res = await fetch(`/api/analytics/llm-usage?${qs.toString()}`)
      if (!res.ok) throw new Error(`Failed (${res.status})`)
      const json = (await res.json()) as LlmUsageResponse
      setData(json.data)
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [period, limit, offset])

  React.useEffect(() => {
    fetchUsage()
    const onOrgChanged = async () => { await fetchUsage() }
    window.addEventListener('organization-changed', onOrgChanged as EventListener)
    return () => window.removeEventListener('organization-changed', onOrgChanged as EventListener)
  }, [fetchUsage])

  const successPct = Math.max(0, Math.min(100, Math.round(data?.request_success_rate ?? 0)))

  return (
    <div className="pl-3 pr-3 pt-20 pb-3 space-y-6 flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">LLM Usages</h2>
          <p className="text-base text-muted-foreground mt-1">Requests and token usage analytics</p>
        </div>
        <div className="flex items-center gap-2">
          {(['24h','7d','30d','90d'] as const).map(p => (
            <Button key={p} size="sm" variant={period===p ? 'default' : 'outline'} className={period===p ? '' : 'bg-transparent border border-border text-foreground hover:bg-accent'} onClick={() => setPeriod(p)}>
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
            <div className="flex-1"><Skeleton className="h-full w-full" /></div>
          </div>
        </>
      ) : error ? (
        <div className="text-sm text-red-500">{error}</div>
      ) : (
        <>
          {/* Summary - match Tools layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Left Wide Card */}
            <div className="lg:col-span-2 rounded-lg bg-card border p-4 sm:p-6">
              <div className="flex items-center gap-4 sm:gap-6">
                {/* Circular success indicator (mini donut) */}
                <div className="relative" style={{ width: 72, height: 72 }}>
                  <div
                    className="rounded-full"
                    style={{
                      width: '72px',
                      height: '72px',
                      background: `conic-gradient(#67E9AB ${successPct * 3.6}deg, hsl(var(--border)) ${successPct * 3.6}deg)`
                    }}
                  />
                  <div className="absolute inset-1 rounded-full bg-card border grid place-items-center">
                    <span className="text-xs text-foreground">{successPct}%</span>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Success Rate</div>
                  <div className="mt-1 text-sm text-muted-foreground">Overall</div>
                </div>
              </div>

              <div className="border-t my-4 sm:my-6" />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-md bg-accent border p-4">
                  <div className="text-xs text-muted-foreground">Total AI Requests</div>
                  <div className="mt-1 text-2xl font-semibold text-foreground">{data?.total_ai_request ?? 0}</div>
                </div>
                <div className="rounded-md bg-accent border p-4">
                  <div className="text-xs text-muted-foreground">Total Prompt Tokens</div>
                  <div className="mt-1 text-2xl font-semibold text-foreground">{data?.total_prompt_tokens ?? 0}</div>
                </div>
                <div className="rounded-md bg-accent border p-4">
                  <div className="text-xs text-muted-foreground">Total Completion Tokens</div>
                  <div className="mt-1 text-2xl font-semibold text-foreground">{data?.total_completion_tokens ?? 0}</div>
                </div>
              </div>
            </div>

            {/* Right Highlights */}
            <div className="rounded-lg bg-card border p-4 sm:p-6 flex flex-col gap-3 min-h-[220px]">
              <div>
                <div className="text-xs text-muted-foreground mb-2">Top Member</div>
                <div className="text-sm text-muted-foreground truncate">{data?.top_member ?? '-'}</div>
              </div>

              <div className="border-t mt-3 mb-1" />

              <div>
                <div className="text-xs text-muted-foreground mb-2">Top Model</div>
                <div className="inline-flex items-center rounded px-2 py-1 border text-xs text-muted-foreground">
                  {(() => {
                    const models = (data?.llm_usages || []).map(u => u.model)
                    if (!models.length) return '-'
                    const freq: Record<string, number> = {}
                    for (const m of models) freq[m] = (freq[m] || 0) + 1
                    const top = Object.entries(freq).sort((a,b) => b[1]-a[1])[0]?.[0]
                    return top || '-'
                  })()}
                </div>
              </div>
            </div>
          </div>

          {/* List */}
          <div className="rounded-lg border bg-card overflow-hidden flex-1 flex flex-col">
            <div className="grid grid-cols-[1fr_210px_1fr_140px_140px_120px_160px] gap-4 px-4 py-3 text-xs text-muted-foreground border-b">
              <div>User</div>
              <div className="text-right">Provider</div>
              <div className="text-right">Model</div>
              <div className="text-right">Prompt</div>
              <div className="text-right">Completion</div>
              <div className="text-right">Status</div>
              <div className="text-right">Key Resource</div>
            </div>
            {data?.llm_usages?.length ? (
              <div className="max-h-[520px] overflow-y-auto divide-y divide-border">
                {data.llm_usages.map((u, idx) => (
                  <div key={`${u.user_email}:${u.request_time}:${idx}`} className="grid grid-cols-[1fr_210px_1fr_140px_140px_120px_160px] items-center gap-4 px-4 py-3">
                    <div className="text-sm text-foreground truncate">{u.user_email}</div>
                    <div className="text-right text-xs text-muted-foreground truncate">{u.provider}</div>
                    <div className="text-right text-xs text-muted-foreground truncate">{u.model}</div>
                    <div className="text-right text-sm text-foreground">{u.prompt_tokens}</div>
                    <div className="text-right text-sm text-foreground">{u.completion_tokens}</div>
                    <div className="text-right text-xs">
                      <span className={`px-2 py-0.5 rounded border ${u.status === 'success' ? 'text-green-600 dark:text-green-400 border-green-400/30' : 'text-red-600 dark:text-red-400 border-red-400/30'}`}>{u.status}</span>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">{u.usage_from_modulex ? 'ModuleX' : 'Organization Key'}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex-1 px-4 py-6 text-sm text-muted-foreground">No usage found for this period.</div>
            )}
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <div className="text-xs text-muted-foreground">Page {Math.floor(offset / limit) + 1}</div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="bg-transparent border border-border text-foreground hover:bg-accent" onClick={() => setOffset(o => Math.max(0, o - limit))} disabled={offset === 0}>Prev</Button>
                <Button variant="outline" size="sm" className="bg-transparent border border-border text-foreground hover:bg-accent" onClick={() => setOffset(o => o + limit)} disabled={(data?.llm_usages?.length || 0) < limit}>Next</Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}


