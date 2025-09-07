"use client"

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import * as React from 'react'

type OverviewResponse = {
  success: boolean
  organization_id: string
  data: {
    overview: {
      total_members: number
      total_tools: number
      installed_tools: number
      plan_name: string
      max_llm_credit: number
      used_llm_credit: number
      subscription: {
        stripe_subscription_id: string
        current_period_start: string
        current_period_end: string
        stripe_product_id: string
      }
      credit_usage_logs: Array<{
        provider: string
        service: string
        credit_cost: number
        usage_time: string
        user_email: string
      }>
    }
  }
  meta: {
    timestamp: string
    limit: number
    offset: number
    cached: boolean
  }
}

function getSelectedOrganizationId(): string | null {
  try {
    const raw = localStorage.getItem('modulex_selected_organization')
    if (!raw) return null
    return (JSON.parse(raw) as { id?: string }).id ?? null
  } catch { return null }
}

export default function Page() {
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [data, setData] = React.useState<OverviewResponse['data']['overview'] | null>(null)
  const [limit] = React.useState(20)
  const [offset, setOffset] = React.useState(0)

  const fetchOverview = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const orgId = getSelectedOrganizationId()
      const qs = new URLSearchParams({ limit: String(limit), offset: String(offset) })
      if (orgId) qs.set('organization_id', orgId)
      const res = await fetch(`/api/analytics/overview?${qs.toString()}`)
      if (!res.ok) throw new Error(`Failed (${res.status})`)
      const json = (await res.json()) as OverviewResponse
      setData(json.data.overview)
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [limit, offset])

  React.useEffect(() => {
    fetchOverview()
    const onOrgChanged = async () => { await fetchOverview() }
    window.addEventListener('organization-changed', onOrgChanged as EventListener)
    return () => window.removeEventListener('organization-changed', onOrgChanged as EventListener)
  }, [fetchOverview])

  const totalTools = data?.total_tools ?? 0
  const installedTools = data?.installed_tools ?? 0
  const toolsRatio = totalTools > 0 ? `${installedTools}/${totalTools}` : '0/0'
  const toolsPct = totalTools > 0 ? Math.round((installedTools / totalTools) * 100) : 0
  const creditMax = Math.max(0, Math.round((data?.max_llm_credit ?? 0)))
  const creditUsed = Math.max(0, Math.round((data?.used_llm_credit ?? 0)))
  const creditPct = creditMax > 0 ? Math.min(100, Math.round((creditUsed / creditMax) * 100)) : 0

  return (
    <div className="pl-3 pr-3 pt-20 pb-3 space-y-6 flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Overview</h2>
          <p className="text-base text-muted-foreground mt-1">Organization analytics summary</p>
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
                <div className="rounded-md bg-accent border p-4"><Skeleton className="h-6 w-28" /><div className="mt-2"><Skeleton className="h-6 w-20" /></div></div>
                <div className="rounded-md bg-accent border p-4"><Skeleton className="h-6 w-32" /><div className="mt-2"><Skeleton className="h-6 w-24" /></div></div>
                <div className="rounded-md bg-accent border p-4"><Skeleton className="h-6 w-36" /><div className="mt-2"><Skeleton className="h-6 w-28" /></div></div>
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
          <div className="rounded-lg border bg-card overflow-hidden mt-4 flex-1 flex flex-col">
            <div className="h-10 border-b"><Skeleton className="h-10 w-full" /></div>
            <div className="flex-1"><Skeleton className="h-full w-full" /></div>
          </div>
        </>
      ) : error ? (
        <div className="text-sm text-red-500">{error}</div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 rounded-lg bg-card border p-4 sm:p-6">
              <div className="flex items-center gap-4 sm:gap-6">
                <div className="relative" style={{ width: 72, height: 72 }}>
                  <div className="rounded-full" style={{ width: '72px', height: '72px', background: `conic-gradient(#67E9AB ${creditPct * 3.6}deg, hsl(var(--border)) ${creditPct * 3.6}deg)` }} />
                  <div className="absolute inset-1 rounded-full bg-card border grid place-items-center">
                    <span className="text-xs text-foreground">{creditPct}%</span>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">LLM Credits Used</div>
                  <div className="mt-1 text-sm text-muted-foreground">{creditUsed} / {creditMax}</div>
                </div>
              </div>
              <div className="border-t my-4 sm:my-6" />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-md bg-accent border p-4">
                  <div className="text-xs text-muted-foreground">Members</div>
                  <div className="mt-1 text-2xl font-semibold text-foreground">{data?.total_members ?? 0}</div>
                </div>
                <div className="rounded-md bg-accent border p-4">
                  <div className="text-xs text-muted-foreground">Tools Installed</div>
                  <div className="mt-1 text-sm text-muted-foreground">{toolsRatio} • {toolsPct}%</div>
                </div>
                <div className="rounded-md bg-accent border p-4">
                  <div className="text-xs text-muted-foreground">Plan</div>
                  <div className="mt-1 text-sm text-muted-foreground">{data?.plan_name ?? '-'}</div>
                </div>
              </div>
            </div>
            <div className="rounded-lg bg-card border p-4 sm:p-6 flex flex-col gap-3 min-h-[220px]">
              <div>
                <div className="text-xs text-muted-foreground mb-2">Billing Period</div>
                <div className="text-sm text-muted-foreground">
                  {data?.subscription?.current_period_start ? new Date(data.subscription.current_period_start).toLocaleDateString() : '-'} {' '}–{' '}
                  {data?.subscription?.current_period_end ? new Date(data.subscription.current_period_end).toLocaleDateString() : '-'}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border bg-card overflow-hidden">
            <div className="grid grid-cols-[1fr_1fr_1fr_140px_200px] gap-4 px-4 py-3 text-xs text-muted-foreground border-b">
              <div>User</div>
              <div className="text-right">Provider</div>
              <div className="text-right">Service</div>
              <div className="text-right">Credit Cost</div>
              <div className="text-right">Usage Time</div>
            </div>
            {data?.credit_usage_logs?.length ? (
              <div className="max-h-[520px] overflow-y-auto divide-y divide-border">
                {data.credit_usage_logs.map((l, idx) => (
                  <div key={`${l.user_email}:${l.usage_time}:${idx}`} className="grid grid-cols-[1fr_1fr_1fr_140px_200px] items-center gap-4 px-4 py-3">
                    <div className="text-sm text-foreground truncate">{l.user_email}</div>
                    <div className="text-right text-xs text-muted-foreground truncate">{l.provider}</div>
                    <div className="text-right text-xs text-muted-foreground truncate">{l.service}</div>
                    <div className="text-right text-sm text-foreground">{l.credit_cost}</div>
                    <div className="text-right text-xs text-muted-foreground truncate">{new Date(l.usage_time).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex-1 px-4 py-6 text-sm text-muted-foreground">No logs.</div>
            )}
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <div className="text-xs text-muted-foreground">Page {Math.floor(offset / limit) + 1}</div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="bg-transparent border border-border text-foreground hover:bg-accent" onClick={() => setOffset(o => Math.max(0, o - limit))} disabled={offset === 0}>Prev</Button>
                <Button variant="outline" size="sm" className="bg-transparent border border-border text-foreground hover:bg-accent" onClick={() => setOffset(o => o + limit)} disabled={(data?.credit_usage_logs?.length || 0) < limit}>Next</Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}


