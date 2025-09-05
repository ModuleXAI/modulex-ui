"use client"

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Check } from 'lucide-react'
import * as React from 'react'
import { toast } from 'sonner'

type Plan = {
  id: string
  name: string
  max_seats?: number
  max_llm_credit?: number
  max_tool_call?: number
  own_api_allowed?: boolean
  price?: number
  features?: string[]
  is_selected?: boolean
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

function formatCompact(value: number): string {
  const abs = Math.abs(value)
  if (abs >= 1_000_000_000) {
    const v = value / 1_000_000_000
    const s = Number.isInteger(v) ? v.toFixed(0) : v.toFixed(1)
    return `${s}B`
  }
  if (abs >= 1_000_000) {
    const v = value / 1_000_000
    const s = Number.isInteger(v) ? v.toFixed(0) : v.toFixed(1)
    return `${s}M`
  }
  if (abs >= 1_000) {
    const v = value / 1_000
    const s = Number.isInteger(v) ? v.toFixed(0) : v.toFixed(1)
    return `${s}k`
  }
  return value.toLocaleString()
}

export default function Page() {
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [plans, setPlans] = React.useState<Plan[]>([])
  const [actingPlanId, setActingPlanId] = React.useState<string | null>(null)

  const selectedPlan = React.useMemo(() => plans.find(p => p.is_selected), [plans])

  const fetchPlans = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const orgId = getSelectedOrganizationId()
      if (!orgId) throw new Error('Select an organization first')
      const res = await fetch(`/api/subscriptions/organization-plans?organization_id=${encodeURIComponent(orgId)}`)
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(text || 'Failed to load plans')
      }
      const json = (await res.json()) as { plans?: Plan[] }
      setPlans(json?.plans || [])
    } catch (e: any) {
      setError(e?.message || 'Failed to load plans')
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchPlans()
  }, [fetchPlans])

  const handleChoose = async (planId: string) => {
    const orgId = getSelectedOrganizationId()
    if (!orgId) {
      toast('Select an organization first', { duration: 2500 })
      return
    }
    try {
      setActingPlanId(planId)
      const url = `/api/subscriptions/checkout-link?plan_id=${encodeURIComponent(planId)}&organization_id=${encodeURIComponent(orgId)}`
      const res = await fetch(url, { method: 'POST' })
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(text || 'Failed to create checkout link')
      }
      const data = (await res.json()) as { url?: string }
      const redirectUrl = data?.url
      if (!redirectUrl) throw new Error('Checkout URL not provided')
      window.location.href = redirectUrl
    } catch (e: any) {
      toast(e?.message || 'Failed to initiate checkout', { duration: 3000 })
    } finally {
      setActingPlanId(null)
    }
  }

  function PlanCard({ plan }: { plan: Plan }) {
    const selected = Boolean(plan.is_selected)
    return (
      <Card className={`h-full bg-[#161616] border-[#2A2A2A] transition-all hover:border-white/15 ${selected ? 'ring-1 ring-[#67E9AB]/40' : ''} flex flex-col`}>
        <CardHeader className="p-5 pb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <CardTitle className="text-white text-base tracking-wide">{plan.name}</CardTitle>
              {typeof plan.price === 'number' ? (
                <div className="text-white/90 mt-1">
                  <span className="text-xl font-semibold font-mono tabular-nums">${plan.price}</span>
                  <span className="text-xs text-white/60"> / month</span>
                </div>
              ) : null}
            </div>
            {selected ? (
              <div className="text-[10px] px-2 py-1 rounded bg-[#67E9AB]/15 text-[#67E9AB] border border-[#67E9AB]/30 uppercase tracking-wide">Current</div>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="px-5 pt-0 pb-5 flex flex-col flex-1">
          <div className="flex-1">
            <div className="text-xs text-white/80 grid grid-cols-2 gap-2 mb-6">
              {typeof plan.max_seats === 'number' ? (
                <div>Max seats: <span className="text-white font-mono tabular-nums">{plan.max_seats}</span></div>
              ) : null}
              {typeof plan.max_llm_credit === 'number' ? (
                <div>LLM credits/mo: <span className="text-white font-mono tabular-nums">{formatCompact(plan.max_llm_credit)}</span></div>
              ) : null}
              {typeof plan.max_tool_call === 'number' ? (
                <div>Tool calls/mo: <span className="text-white font-mono tabular-nums">{formatCompact(plan.max_tool_call)}</span></div>
              ) : null}
              <div>Own API keys: <span className="text-white">{plan.own_api_allowed ? 'Yes' : 'No'}</span></div>
            </div>
            {Array.isArray(plan.features) && plan.features.length > 0 ? (
              <ul className="mt-0 space-y-2">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-white/85">
                    <Check className="h-4 w-4 text-[#67E9AB] mt-0.5 shrink-0" />
                    <span className="leading-snug">{f}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          <div className="pt-4 mt-auto">
            {selected ? (
              <Button disabled className="w-full bg-transparent border border-white/15 text-white/70 hover:bg-transparent">Current plan</Button>
            ) : (() => {
              // Determine CTA based on selected plan max_seats
              let label: string | null = 'Choose plan'
              if (selectedPlan && typeof selectedPlan.max_seats === 'number' && typeof plan.max_seats === 'number') {
                if (plan.max_seats < selectedPlan.max_seats) {
                  label = null // hide for lower tiers
                } else if (plan.max_seats > selectedPlan.max_seats) {
                  label = 'Upgrade Plan'
                } else {
                  label = 'Choose plan'
                }
              }
              if (!label) return null
              return (
                <Button
                  onClick={() => handleChoose(plan.id)}
                  disabled={actingPlanId === plan.id}
                  className="w-full bg-[#67E9AB] text-black hover:bg-[#58D99C]"
                >
                  {actingPlanId === plan.id ? 'Redirecting…' : label}
                </Button>
              )
            })()}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="p-6 pt-14 space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Billing</h2>
        <p className="text-base text-muted-foreground mt-1">Choose a plan that fits your team and manage your subscription.</p>
      </div>

      {loading ? (
        <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-fr items-stretch">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="h-full bg-[#161616] border-[#2A2A2A] flex flex-col">
              <CardHeader className="p-5 pb-3">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-4 w-28" />
              </CardHeader>
              <CardContent className="px-5 pt-0 pb-5 space-y-2 flex flex-col">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-44" />
                <Skeleton className="h-4 w-36" />
                <div className="pt-4 mt-auto">
                  <Skeleton className="h-9 w-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : error ? (
        <div className="text-sm text-red-400">{error}</div>
      ) : (
        <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-fr items-stretch">
          {plans.map((p) => (
            <PlanCard key={p.id} plan={p} />
          ))}
        </div>
      )}
    </div>
  )
}


