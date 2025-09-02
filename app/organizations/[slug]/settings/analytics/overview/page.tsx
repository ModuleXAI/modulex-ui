"use client"

import { Button } from '@/components/ui/button'
import { Shield } from 'lucide-react'
import * as React from 'react'

type OverviewData = {
  overview: {
    total_members: number
    total_tools: number
    installed_tools: number
    system_health: string
    user_growth: number
    system_performance: number
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
  const [period, setPeriod] = React.useState<'24h' | '7d' | '30d' | '90d'>('24h')
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [data, setData] = React.useState<OverviewData | null>(null)

  const fetchOverview = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const orgId = getSelectedOrganizationId()
      const qs = new URLSearchParams({ period })
      if (orgId) qs.set('organization_id', orgId)
      const res = await fetch(`/api/analytics/overview?${qs.toString()}`)
      if (!res.ok) throw new Error(`Failed (${res.status})`)
      const json = await res.json()
      setData(json.data)
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [period])

  React.useEffect(() => {
    fetchOverview()
    const onOrgChanged = async () => { await fetchOverview() }
    window.addEventListener('organization-changed', onOrgChanged as EventListener)
    return () => window.removeEventListener('organization-changed', onOrgChanged as EventListener)
  }, [fetchOverview])

  const totalTools = data?.overview.total_tools ?? 0
  const installedTools = data?.overview.installed_tools ?? 0
  const toolsRatio = totalTools > 0 ? `${installedTools}/${totalTools}` : '0/0'
  const toolsPct = totalTools > 0 ? Math.round((installedTools / totalTools) * 100) : 0
  const perfPct = Math.max(0, Math.min(100, Math.round(data?.overview.system_performance ?? 0)))
  const growthPct = Math.round((data?.overview.user_growth ?? 0) * 10) / 10
  const growthBar = Math.max(2, Math.min(100, Math.abs(growthPct)))
  const health = (data?.overview.system_health || '-').toString().toLowerCase()

  return (
    <div className="p-6 pt-14 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Overview</h2>
          <p className="text-base text-muted-foreground mt-1">Organization analytics summary</p>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Members (square) with centered number */}
          <div className="rounded-lg bg-[#1D1D1D] border border-[#292929] aspect-square relative p-4">
            <div className="absolute top-4 left-4 text-xs text-white/60">Members</div>
            <div className="w-full h-full grid place-items-center">
              <div className="text-5xl font-semibold text-white leading-none">{data?.overview.total_members ?? 0}</div>
            </div>
          </div>

          {/* User Growth (square) */}
          <div className="rounded-lg bg-[#1D1D1D] border border-[#292929] p-4 aspect-square flex flex-col justify-between">
            <div className="text-xs text-white/60">User Growth</div>
            <div>
              <div className="h-2 w-full rounded bg-[#232323] overflow-hidden">
                <div className="h-full bg-[#67E9AB]" style={{ width: `${growthBar}%` }} />
              </div>
              <div className="mt-2 text-sm text-white/80">{growthPct}% over selected period</div>
            </div>
          </div>

          {/* Tools donut (square) */}
          <div className="rounded-lg bg-[#1D1D1D] border border-[#292929] p-4 aspect-square grid place-items-center">
            <div className="flex items-center gap-4">
              <div className="relative" style={{ width: 84, height: 84 }}>
                <div
                  className="rounded-full"
                  style={{
                    width: '84px',
                    height: '84px',
                    background: `conic-gradient(#67E9AB ${toolsPct * 3.6}deg, #292929 ${toolsPct * 3.6}deg)`
                  }}
                />
                <div className="absolute inset-1 rounded-full bg-[#1D1D1D] border border-[#292929] grid place-items-center">
                  <span className="text-xs text-white">{toolsRatio}</span>
                </div>
              </div>
              <div>
                <div className="text-xs text-white/60">Tools</div>
                <div className="mt-1 text-sm text-white/80">{toolsPct}% installed</div>
              </div>
            </div>
          </div>

          {/* System Health (square) - shield indicator */}
          <div className="rounded-lg bg-[#1D1D1D] border border-[#292929] p-4 aspect-square grid place-items-center text-center">
            <div>
              <div className="text-xs text-white/60 mb-3">System Health</div>
              <Shield className={`${health==='optimal' ? 'text-green-400' : health==='degraded' ? 'text-amber-400' : health==='critical' ? 'text-red-400' : 'text-white/60'} w-10 h-10 mx-auto mb-2`} />
              <div className={`inline-block px-2 py-1 rounded text-xs border ${health==='optimal' ? 'text-green-400 border-green-400/30' : health==='degraded' ? 'text-amber-400 border-amber-400/30' : health==='critical' ? 'text-red-400 border-red-400/30' : 'text-white/70 border-white/20'}`}>{data?.overview.system_health ?? '-'}</div>
            </div>
          </div>

          {/* System Performance (square) */}
          <div className="rounded-lg bg-[#1D1D1D] border border-[#292929] p-4 aspect-square flex flex-col justify-between">
            <div className="text-xs text-white/60">System Performance</div>
            <div>
              <div className="h-2 w-full rounded bg-[#232323] overflow-hidden">
                <div className="h-full bg-[#67E9AB]" style={{ width: `${perfPct}%` }} />
              </div>
              <div className="mt-2 text-sm text-white/80">{perfPct}% efficiency</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


