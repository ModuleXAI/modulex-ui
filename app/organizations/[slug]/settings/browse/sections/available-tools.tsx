'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { ExternalLink, Plus } from 'lucide-react'
import Image from 'next/image'
import { useParams } from 'next/navigation'
import * as React from 'react'
import InstallToolDialog from './install-tool-dialog'

type AvailableTool = {
  id: number
  name: string
  display_name: string
  description: string
  logo?: string
  categories?: { id: string; name: string }[]
  app_url?: string
  actions?: { name: string; description: string }[]
  auth_schemas?: { auth_type: string; setup_environment_variables: any[]; system_has_oauth2_variables?: boolean }[]
  version?: string
}

type AvailableResponse = {
  success?: boolean
  tools?: AvailableTool[]
  total?: number
} | AvailableTool[]

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

export default function AvailableTools() {
  const params = useParams<{ slug?: string }>()
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [tools, setTools] = React.useState<AvailableTool[]>([])
  const [query, setQuery] = React.useState('')
  const [selectedTool, setSelectedTool] = React.useState<AvailableTool | null>(null)
  const [showInstallDialog, setShowInstallDialog] = React.useState(false)
  const [selectedToolForInstall, setSelectedToolForInstall] = React.useState<AvailableTool | null>(null)

  const fetchTools = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const orgId = getSelectedOrganizationId()
      const url = orgId ? `/api/integrations/available?organization_id=${encodeURIComponent(orgId)}` : '/api/integrations/available'
      const res = await fetch(url, { headers: { 'Content-Type': 'application/json' } })
      if (!res.ok) {
        throw new Error(`Failed to load tools (${res.status})`)
      }
      const data: AvailableResponse = await res.json()
      const list = Array.isArray(data) ? data : (data.tools ?? [])
      setTools(list)
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load tools')
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchTools()
    const onOrgChanged = async () => { await fetchTools() }
    window.addEventListener('organization-changed', onOrgChanged as EventListener)
    return () => window.removeEventListener('organization-changed', onOrgChanged as EventListener)
  }, [fetchTools])

  const filtered = React.useMemo(() => {
    if (!query) return tools
    const q = query.toLowerCase()
    return tools.filter(t =>
      t.display_name.toLowerCase().includes(q) ||
      t.name.toLowerCase().includes(q) ||
      t.description?.toLowerCase().includes(q) ||
      (t.categories || []).some(c => c.name.toLowerCase().includes(q))
    )
  }, [tools, query])

  const getAuthTypeColor = (authType: string) => {
    switch (authType) {
      case 'oauth2':
        return 'text-blue-400 bg-transparent border border-white/15'
      case 'bearer_token':
        return 'text-purple-400 bg-transparent border border-white/15'
      case 'api_key':
        return 'text-pink-400 bg-transparent border border-white/15'
      default:
        return 'text-white/70 bg-transparent border border-white/15'
    }
  }

  const renderToolDetail = () => {
    if (!selectedTool) return null
    return (
      <div className="rounded-lg bg-[#1D1D1D] border border-[#292929] p-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-start gap-2.5">
            {/* Back icon restored earlier change was reverted per request */}
            <button
              onClick={() => setSelectedTool(null)}
              className="p-3 rounded-lg hover:bg-[#232323] transition-colors"
              aria-label="Back"
            >
              {/* simple chevron */}
              <span className="inline-block rotate-180 select-none text-white/80">›</span>
            </button>
            <div className="flex items-center gap-2.5">
              <Image src={selectedTool.logo || `/icons/tools/${selectedTool.name}.svg`} alt={selectedTool.display_name} width={48} height={48} className="rounded" />
              <div>
                <div className="text-2xl font-bold text-white">{selectedTool.display_name}</div>
                <div className="text-xs text-white/60 uppercase tracking-wide">{selectedTool.name}</div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {selectedTool.app_url && (
              <Button
                variant="outline"
                onClick={() => window.open(selectedTool.app_url!, '_blank')}
                className="bg-transparent border-[#292929] text-white hover:bg-[#232323]"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                View Documentation
              </Button>
            )}
            <Button
              onClick={() => { setSelectedToolForInstall(selectedTool); setShowInstallDialog(true) }}
              size="sm"
              className="h-9 bg-[#67E9AB] text-black hover:bg-[#58D99C] text-xs"
            >
              <Plus className="w-3 h-3 mr-1" />
              Install Tool
            </Button>
          </div>
        </div>

        <div className="space-y-3 mb-8">
          {selectedTool.description ? (
            <div className="text-sm text-[#7E7E7E]">{selectedTool.description}</div>
          ) : null}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Auth type (styled like grid) */}
            {(() => {
              const authType = (selectedTool.auth_schemas?.[0]?.auth_type || 'auth')
              return (
                <span className={`px-2 py-1 rounded ${getAuthTypeColor(authType)}`}>{authType.toUpperCase()}</span>
              )
            })()}
            <span className="px-2 py-1 rounded border border-white/15 text-white/70">{selectedTool.actions?.length || 0} Actions</span>
            {selectedTool.version ? (
              <span className="px-2 py-1 rounded border border-white/15 text-white/70">v{selectedTool.version}</span>
            ) : null}
          </div>
          <div className="text-xs text-white/70">
            {`Categories: ${(selectedTool.categories || []).map(c => c.name).join(', ') || '—'}`}
          </div>
        </div>

        <div>
          <div className="text-sm font-medium text-white mb-3">Actions</div>
          <div className="rounded-lg border border-[#292929] divide-y divide-[#292929] bg-[#1D1D1D]">
            {(selectedTool.actions || []).length === 0 ? (
              <div className="p-4 text-sm text-white/60">No actions available.</div>
            ) : (
              (selectedTool.actions || []).map(action => (
                <div key={action.name} className="grid grid-cols-[220px_1fr] items-start gap-4 p-4">
                  <div className="text-sm text-white font-medium truncate">{action.name}</div>
                  <div className="text-sm text-[#7E7E7E] leading-relaxed">{action.description}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 pt-14 space-y-4">
      {!selectedTool ? (
        <div>
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-xl font-semibold">All Tools</h2>
              <p className="text-base text-muted-foreground mt-1">All the tools that we support.</p>
            </div>
          </div>
          <div className="mt-6 flex items-center justify-between">
            <div className="w-64">
              <Input
                placeholder="Search tools..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="text-xs text-white/60">{(query ? filtered.length : tools.length)} tools</div>
          </div>
        </div>
      ) : null}

      {selectedTool ? (
        renderToolDetail()
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
              <div
                key={tool.id}
                className="bg-[#1D1D1D] text-white rounded-lg border-[1px] border-[#292929] p-6 hover:bg-[#232323] hover:shadow-lg hover:ring-1 hover:ring-white/10 transition-colors transition-shadow duration-200 cursor-pointer"
                onClick={() => setSelectedTool(tool)}
              >
                <div className="flex items-start space-x-4 mb-4">
                  <Image src={tool.logo || `/icons/tools/${tool.name}.svg`} alt={tool.display_name} width={48} height={48} className="w-12 h-12 rounded-lg" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-white mb-1">{tool.display_name}</h3>
                    <p className="text-xs text-white/60 uppercase tracking-wide">{tool.name}</p>
                  </div>
                </div>

                <p className="text-sm text-[#7E7E7E] mb-4 leading-relaxed">{shortDesc}</p>

                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap gap-2">
                    {(tool.auth_schemas || []).map((schema, index) => (
                      <span key={index} className={`px-2 py-1 rounded text-xs font-medium ${getAuthTypeColor(schema.auth_type)}`}>
                        {schema.auth_type.toUpperCase()}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-white/60">
                    <span>{tool.actions?.length || 0} actions</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <InstallToolDialog
        tool={(selectedToolForInstall as any) || { name: '', display_name: '' }}
        open={showInstallDialog && !!selectedToolForInstall}
        onOpenChange={(o) => { if (!o) { setShowInstallDialog(false); setSelectedToolForInstall(null) } else { setShowInstallDialog(true) } }}
      />
    </div>
  )
}


