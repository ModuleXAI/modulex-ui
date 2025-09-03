"use client"

import { Button } from '@/components/ui/button'
import Image from 'next/image'
import * as React from 'react'

type ToolsAnalyticsResponse = {
  success: boolean
  organization_id: string
  data: {
    total_tools: number
    installed_tools: number
    total_tool_executions: number
    period_tool_executions: number
    success_rate: number
    most_used_action: string | null
    most_used_category: string | null
    actions: Array<{
      action: string
      tool: string
      execute_amount: number
      success_rate: number
    }>
  }
  meta: {
    timestamp: string
    period: '24h' | '7d' | '30d' | '90d'
    category: string | null
    cached: boolean
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

function formatActionName(name?: string | null) {
  if (!name) return '-'
  return name.split('_').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ')
}

function getToolIcon(tool: string) {
  return `/icons/tools/${tool}.svg`
}

export default function Page() {
  const [period, setPeriod] = React.useState<'24h' | '7d' | '30d' | '90d'>('7d')
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [data, setData] = React.useState<ToolsAnalyticsResponse['data'] | null>(null)

  const fetchToolsAnalytics = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const orgId = getSelectedOrganizationId()
      const qs = new URLSearchParams({ period })
      if (orgId) qs.set('organization_id', orgId)
      const res = await fetch(`/api/analytics/tools?${qs.toString()}`)
      if (!res.ok) throw new Error(`Failed (${res.status})`)
      const json = (await res.json()) as ToolsAnalyticsResponse
      setData(json.data)
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [period])

  React.useEffect(() => {
    fetchToolsAnalytics()
    const onOrgChanged = async () => { await fetchToolsAnalytics() }
    window.addEventListener('organization-changed', onOrgChanged as EventListener)
    return () => window.removeEventListener('organization-changed', onOrgChanged as EventListener)
  }, [fetchToolsAnalytics])

  const totalTools = data?.total_tools ?? 0
  const installedTools = data?.installed_tools ?? 0
  const toolsRatio = totalTools > 0 ? `${installedTools}/${totalTools}` : '0/0'
  const toolsPct = totalTools > 0 ? Math.round((installedTools / totalTools) * 100) : 0
  const successPct = Math.max(0, Math.min(100, Math.round(data?.success_rate ?? 0)))

  return (
    <div className="p-6 pt-14 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Tools</h2>
          <p className="text-base text-muted-foreground mt-1">Tool usage and performance analytics</p>
        </div>
        <div className="flex items-center gap-2">
          {(['24h','7d','30d','90d'] as const).map(p => (
            <Button key={p} size="sm" variant={period===p ? 'default' : 'outline'} className={period===p ? '' : 'bg-transparent border-[#292929] text-white hover:bg-[#232323]'} onClick={() => setPeriod(p)}>
              {p}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading...</div>
      ) : error ? (
        <div className="text-sm text-red-500">{error}</div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Usage Summary (wide) */}
            <div className="lg:col-span-2 rounded-lg bg-[#1D1D1D] border border-[#292929] p-4 sm:p-6">
              <div className="flex items-center gap-4 sm:gap-6">
                <div className="relative" style={{ width: 72, height: 72 }}>
                  <div
                    className="rounded-full"
                    style={{
                      width: '72px',
                      height: '72px',
                      background: `conic-gradient(#67E9AB ${toolsPct * 3.6}deg, #292929 ${toolsPct * 3.6}deg)`
                    }}
                  />
                  <div className="absolute inset-1 rounded-full bg-[#1D1D1D] border border-[#292929] grid place-items-center">
                    <span className="text-xs text-white">{toolsRatio}</span>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-white/60">Tools Installed</div>
                  <div className="mt-1 text-sm text-white/80">{toolsPct}% installed</div>
                </div>
              </div>

              <div className="border-t border-[#292929] my-4 sm:my-6" />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-md bg-[#232323] border border-[#2F2F2F] p-4">
                  <div className="text-xs text-white/60">Total Executions</div>
                  <div className="mt-1 text-2xl font-semibold text-white">{data?.total_tool_executions ?? 0}</div>
                  <div className="text-xs text-white/60 mt-1">All time</div>
                </div>
                <div className="rounded-md bg-[#232323] border border-[#2F2F2F] p-4">
                  <div className="text-xs text-white/60">Period Executions</div>
                  <div className="mt-1 text-2xl font-semibold text-white">{data?.period_tool_executions ?? 0}</div>
                  <div className="text-xs text-white/60 mt-1">In selected period</div>
                </div>
                <div className="rounded-md bg-[#232323] border border-[#2F2F2F] p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-white/60">Success Rate</div>
                    <div className="text-xs text-white/80">{successPct}%</div>
                  </div>
                  <div className="mt-2 h-2 rounded bg-[#2A2A2A] overflow-hidden">
                    <div className="h-2 rounded bg-[#67E9AB]" style={{ width: `${successPct}%` }} />
                  </div>
                  <div className="text-xs text-white/60 mt-1">Overall</div>
                </div>
              </div>
            </div>

            {/* Highlights */}
            <div className="rounded-lg bg-[#1D1D1D] border border-[#292929] p-4 sm:p-6 flex flex-col gap-3 min-h-[220px]">
              <div>
                <div className="text-xs text-white/60 mb-2">Most Used Action</div>
                <div className="flex items-center gap-3">
                  {(() => {
                    const top = data?.actions?.[0]
                    if (!top || !data?.most_used_action) return <div className="text-sm text-white/70">-</div>
                    return (
                      <>
                        <Image src={getToolIcon(top.tool)} alt={top.tool} width={28} height={28} className="rounded" />
                        <div>
                          <div className="text-white text-sm font-medium">{formatActionName(data.most_used_action)}</div>
                          <div className="text-xs text-white/60">{top.tool}</div>
                        </div>
                      </>
                    )
                  })()}
                </div>
              </div>

              <div className="border-t border-[#292929] mt-3 mb-1" />

              <div>
                <div className="text-xs text-white/60 mb-2">Most Used Category</div>
                <div className="inline-flex items-center rounded px-2 py-1 border border-white/15 text-xs text-white/80">
                  {data?.most_used_category ?? '-'}
                </div>
              </div>
            </div>
          </div>

          {/* Actions list */}
          <div className="rounded-lg border border-[#292929] bg-[#1D1D1D] overflow-hidden">
            <div className="grid grid-cols-[1fr_120px_160px_140px] gap-4 px-4 py-3 text-xs text-white/60 border-b border-[#292929]">
              <div>Action</div>
              <div className="text-right">Tool</div>
              <div className="text-right">Executions</div>
              <div className="text-right">Success Rate</div>
            </div>
            {data?.actions?.length ? (
              <div className="h-80 overflow-y-auto divide-y divide-white/10">
                {data.actions.map((a) => (
                  <div key={`${a.tool}:${a.action}`} className="grid grid-cols-[1fr_120px_160px_140px] items-center gap-4 px-4 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <Image src={getToolIcon(a.tool)} alt={a.tool} width={24} height={24} className="rounded shrink-0" />
                      <div className="truncate">
                        <div className="text-sm text-white truncate">{formatActionName(a.action)}</div>
                        <div className="text-xs text-white/60 truncate">{a.tool}</div>
                      </div>
                    </div>
                    <div className="text-right text-xs text-white/80">{a.tool}</div>
                    <div className="text-right text-sm text-white">{a.execute_amount}</div>
                    <div className="text-right text-sm text-white">{Math.round((a.success_rate ?? 0))}%</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-4 py-6 text-sm text-muted-foreground">No actions found for this period.</div>
            )}
          </div>
        </>
      )}
    </div>
  )
}


