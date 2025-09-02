'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import Image from 'next/image'
import { useParams, useRouter } from 'next/navigation'
import * as React from 'react'

type ToolDetail = {
  id: number
  name: string
  display_name: string
  description: string
  logo?: string
  categories?: { id: string; name: string }[]
  version?: string
  actions?: { name: string; description: string }[]
}

type AvailableResponse = ToolDetail | { tool?: ToolDetail }

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

export default function ToolDetailPage() {
  const params = useParams<{ slug?: string; tool?: string }>()
  const router = useRouter()
  const toolParam = params?.tool || ''
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [tool, setTool] = React.useState<ToolDetail | null>(null)
  const [searchAction, setSearchAction] = React.useState('')

  const fetchTool = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const orgId = getSelectedOrganizationId()
      const url = orgId ? `/api/integrations/available?organization_id=${encodeURIComponent(orgId)}` : '/api/integrations/available'
      const res = await fetch(url, { headers: { 'Content-Type': 'application/json' } })
      if (!res.ok) throw new Error(`Failed to load tool (${res.status})`)
      const data = await res.json()
      const list: ToolDetail[] = Array.isArray(data) ? data : (data.tools ?? [])
      const found = list.find((t) => t.name === toolParam)
      if (!found) throw new Error('Tool not found')
      setTool(found)
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load tool')
    } finally {
      setLoading(false)
    }
  }, [toolParam])

  React.useEffect(() => {
    fetchTool()
  }, [fetchTool])

  const filteredActions = React.useMemo(() => {
    if (!tool) return []
    if (!searchAction) return tool.actions || []
    const q = searchAction.toLowerCase()
    return (tool.actions || []).filter(a => a.name.toLowerCase().includes(q) || a.description.toLowerCase().includes(q))
  }, [tool, searchAction])

  return (
    <div className="p-6 pt-10 space-y-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          {loading ? (
            <Skeleton className="h-8 w-8 rounded" />
          ) : tool ? (
            <Image src={tool.logo || `/icons/tools/${tool.name}.svg`} alt={tool.display_name} width={32} height={32} className="rounded"/>
          ) : null}
          <div>
            <div className="text-xl font-semibold">
              {loading ? <Skeleton className="h-6 w-40" /> : tool?.display_name || 'Tool'}
            </div>
            <div className="text-sm text-muted-foreground">
              {loading ? <Skeleton className="h-4 w-48" /> : tool?.description}
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {loading ? (
                <Skeleton className="h-5 w-24" />
              ) : (
                (tool?.categories || []).map(c => (
                  <Badge key={c.id} variant="secondary" className="text-[10px] py-0.5 px-2">{c.name}</Badge>
                ))
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => router.back()}>Back</Button>
          <Button>Install Tool</Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="font-medium">Actions</div>
            <div className="w-64">
              <Input placeholder="Search actions" value={searchAction} onChange={(e) => setSearchAction(e.target.value)} />
            </div>
          </div>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="text-sm text-red-500">{error}</div>
          ) : (
            <div className="divide-y border rounded-md">
              {(filteredActions || []).map((a) => (
                <div key={a.name} className="flex items-center justify-between py-3 px-4">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{a.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{a.description}</div>
                  </div>
                  <div>
                    <Button variant="outline" size="sm">Run</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}


