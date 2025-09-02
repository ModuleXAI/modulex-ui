"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { getApiErrorMessage } from "@/lib/utils/api-error"
import Image from "next/image"
import { useParams } from "next/navigation"
import * as React from "react"
import { toast } from "sonner"

type InstalledTool = {
  id: number
  name: string
  display_name: string
  description: string
  author?: string
  version?: string
  logo?: string
  app_url?: string
  categories?: { id: string; name: string }[]
  enabled_actions?: { name: string; description: string }[]
  disabled_actions?: { name: string; description: string }[]
  environment_variables?: Record<string, string>
}

type InstalledResponse = { success?: boolean; tools?: InstalledTool[] } | { tools: InstalledTool[] }

function getSelectedOrganizationId(): string | null {
  try {
    const raw = localStorage.getItem('modulex_selected_organization')
    if (!raw) return null
    return (JSON.parse(raw) as { id?: string }).id ?? null
  } catch { return null }
}

export default function Page() {
  const params = useParams<{ slug?: string }>()
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [tools, setTools] = React.useState<InstalledTool[]>([])
  const [query, setQuery] = React.useState("")
  const [selectedTool, setSelectedTool] = React.useState<InstalledTool | null>(null)
  const [activeTab, setActiveTab] = React.useState<'actions' | 'environment' | 'settings'>('actions')
  const [envDraft, setEnvDraft] = React.useState<Record<string, string>>({})

  const fetchInstalled = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const orgId = getSelectedOrganizationId()
      const url = orgId ? `/api/integrations/installed?organization_id=${encodeURIComponent(orgId)}` : '/api/integrations/installed'
      const res = await fetch(url)
      if (!res.ok) throw new Error(`Failed (${res.status})`)
      const data: InstalledResponse = await res.json()
      const list = (data as any).tools ?? []
      setTools(list)
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchInstalled()
    const onOrgChanged = async () => { await fetchInstalled() }
    window.addEventListener('organization-changed', onOrgChanged as EventListener)
    return () => window.removeEventListener('organization-changed', onOrgChanged as EventListener)
  }, [fetchInstalled])

  const filtered = React.useMemo(() => {
    if (!query) return tools
    const q = query.toLowerCase()
    return tools.filter(t =>
      t.display_name.toLowerCase().includes(q) ||
      t.name.toLowerCase().includes(q) ||
      t.description?.toLowerCase().includes(q)
    )
  }, [tools, query])

  const getAuthTypeColor = (authType?: string) => {
    const t = (authType || '').toLowerCase()
    if (t === 'oauth2') return 'text-blue-400 bg-transparent border border-white/15'
    if (t === 'bearer_token') return 'text-purple-400 bg-transparent border border-white/15'
    if (t === 'api_key') return 'text-pink-400 bg-transparent border border-white/15'
    return 'text-white/70 bg-transparent border border-white/15'
  }

  const handleUninstall = async (toolName: string) => {
    if (!confirm(`Are you sure you want to uninstall ${toolName}?`)) return
    const orgId = getSelectedOrganizationId()
    const url = orgId ? `/api/integrations/${encodeURIComponent(toolName)}?organization_id=${encodeURIComponent(orgId)}` : `/api/integrations/${encodeURIComponent(toolName)}`
    const res = await fetch(url, { method: 'DELETE' })
    if (res.ok) {
      await fetchInstalled()
      setSelectedTool(null)
    } else {
      const message = await getApiErrorMessage(res, 'Failed to uninstall tool')
      toast(message, { duration: 3000 })
    }
  }

  const handleEnvUpdate = async (toolName: string) => {
    const orgId = getSelectedOrganizationId()
    const url = orgId ? `/api/integrations/${encodeURIComponent(toolName)}/environment?organization_id=${encodeURIComponent(orgId)}` : `/api/integrations/${encodeURIComponent(toolName)}/environment`
    const res = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ environment_variables: envDraft })
    })
    if (res.ok) {
      await fetchInstalled()
      toast('Environment updated', { duration: 2500 })
    } else {
      const message = await getApiErrorMessage(res, 'Failed to update environment')
      toast(message, { duration: 3000 })
    }
  }

  const count = query ? filtered.length : tools.length

  return (
    <div className="p-6 pt-14 space-y-4">
      {!selectedTool ? (
        <div>
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-xl font-semibold">My Tools</h2>
              <p className="text-base text-muted-foreground mt-1">Installed tools in your organization.</p>
            </div>
          </div>
          <div className="mt-6 flex items-center justify-between">
            <div className="w-64">
              <Input placeholder="Search tools..." value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
            <div className="text-xs text-white/60">{count} tools</div>
          </div>
        </div>
      ) : null}

      {selectedTool ? (
        <div className="rounded-lg bg-[#1D1D1D] border border-[#292929] p-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-2.5">
              <button onClick={() => setSelectedTool(null)} className="p-3 rounded-lg hover:bg-[#232323] transition-colors" aria-label="Back">
                <span className="inline-block rotate-180 select-none text-white/80">›</span>
              </button>
              <Image src={selectedTool.logo || `/icons/tools/${selectedTool.name}.svg`} alt={selectedTool.display_name} width={48} height={48} className="rounded" />
              <div>
                <div className="text-2xl font-bold text-white">{selectedTool.display_name}</div>
                <div className="text-xs text-white/60 uppercase tracking-wide">{selectedTool.name}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {selectedTool.app_url ? (
                <Button variant="outline" className="bg-transparent border-[#292929] text-white hover:bg-[#232323]" onClick={() => window.open(selectedTool.app_url!, '_blank')}>View Documentation</Button>
              ) : null}
              <Button variant="outline" className="bg-transparent border-red-500/40 text-red-400 hover:bg-red-500/10" onClick={() => handleUninstall(selectedTool.name)}>Uninstall</Button>
            </div>
          </div>

          <div className="mb-4">
            <div className="flex items-center gap-2 text-xs">
              {selectedTool && (
                <span className={`px-2 py-1 rounded ${getAuthTypeColor((selectedTool as any).auth_type)}`}>{((selectedTool as any).auth_type || 'auth').toUpperCase()}</span>
              )}
              <span className="px-2 py-1 rounded border border-white/15 text-[#67E9AB]">INSTALLED</span>
              <span className="px-2 py-1 rounded border border-white/15 text-white/70">{(selectedTool.enabled_actions || []).length} Actions</span>
              {selectedTool.version ? (
                <span className="px-2 py-1 rounded border border-white/15 text-white/70">v{selectedTool.version}</span>
              ) : null}
            </div>
          </div>

          <div className="mb-4 border-b border-[#292929]">
            <div className="flex gap-3 text-sm">
              {(['actions','environment','settings'] as const).map(t => (
                <button key={t} onClick={() => setActiveTab(t)} className={`px-3 py-2 rounded-t ${activeTab===t ? 'bg-[#232323] text-white' : 'text-white/70 hover:text-white'}`}>{t[0].toUpperCase()+t.slice(1)}</button>
              ))}
            </div>
          </div>

          {activeTab === 'actions' && (
            <div className="rounded-lg border border-[#292929] divide-y divide-[#292929] bg-[#1D1D1D]">
              {(selectedTool.enabled_actions || []).map(a => (
                <div key={a.name} className="grid grid-cols-[220px_1fr_100px] items-start gap-4 p-4">
                  <div className="text-sm text-white font-medium truncate">{a.name}</div>
                  <div className="text-sm text-[#7E7E7E] leading-relaxed">{a.description}</div>
                  <div className="text-xs text-green-400 text-right">Enabled</div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'environment' && (
            <div className="space-y-4">
              <div className="text-sm text-white/80">Environment Variables</div>
              <div className="space-y-3">
                {Object.entries(selectedTool.environment_variables || {}).map(([k,v]) => (
                  <div key={k} className="grid grid-cols-[260px_1fr] gap-3 items-center">
                    <div className="text-xs text-white/70">{k}</div>
                    <Input defaultValue={v} onChange={(e) => setEnvDraft(prev => ({ ...prev, [k]: e.target.value }))} className="bg-[#1D1D1D] border-[#292929] text-white placeholder:text-white/40" />
                  </div>
                ))}
              </div>
              <div className="flex justify-end">
                <Button onClick={() => handleEnvUpdate(selectedTool.name)} className="bg-[#67E9AB] text-black hover:bg-[#58D99C]">Update Variables</Button>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-3">
              <div className="text-sm font-medium text-white">Tool Configuration</div>
              <p className="text-sm text-[#7E7E7E]">This tool is installed and ready to use. You can manage its environment variables in the Environment tab or uninstall it using the uninstall button in the header.</p>
              <div className="text-sm text-green-400">Tool is active and configured</div>
            </div>
          )}
        </div>
      ) : loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="space-y-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-full" />
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-6 w-24" />
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-16" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : error ? (
        <div className="text-sm text-red-500">{error}</div>
      ) : filtered.length === 0 ? (
        <div className="text-sm text-muted-foreground">No tools found.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((tool) => {
            const shortDesc = tool.description?.length > 100 ? tool.description.substring(0, 100) + '...' : tool.description
            return (
              <div key={tool.id} className="bg-[#1D1D1D] text-white rounded-lg border-[1px] border-[#292929] p-6 hover:bg-[#232323] hover:shadow-lg hover:ring-1 hover:ring-white/10 transition-colors transition-shadow duration-200 cursor-pointer" onClick={() => setSelectedTool(tool)}>
                <div className="flex items-start space-x-4 mb-4">
                  <Image src={tool.logo || `/icons/tools/${tool.name}.svg`} alt={tool.display_name} width={48} height={48} className="w-12 h-12 rounded-lg" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-white mb-1">{tool.display_name}</h3>
                    <p className="text-xs text-white/60 uppercase tracking-wide">{tool.name}</p>
                  </div>
                </div>
                <p className="text-sm text-[#7E7E7E] mb-4 leading-relaxed">{shortDesc}</p>
                <div className="flex items-center justify-start">
                  <div className="flex flex-wrap gap-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getAuthTypeColor((tool as any).auth_type)}`}>{(((tool as any).auth_type) || 'auth').toUpperCase()}</span>
                    <span className="px-2 py-1 rounded text-xs font-medium border border-white/15 text-[#67E9AB]">INSTALLED</span>
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


