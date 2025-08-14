'use client'

import { cn } from '@/lib/utils'
import { getCookie, setCookie } from '@/lib/utils/cookies'
import {
  ChevronRight,
  ExternalLink,
  Settings,
  Unplug
} from 'lucide-react'
import Image from 'next/image'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Badge } from './ui/badge'
import { Button } from './ui/button'

import { Switch } from './ui/switch'

interface ToolAction {
  name: string
  description: string
  is_active: boolean
}

interface Tool {
  name: string
  display_name: string
  is_authenticated: boolean
  is_active: boolean
  health_status: boolean
  actions: ToolAction[]
}

interface ToolsData {
  tools: Tool[]
}

// API functions
const getSelectedOrganizationId = (): string | null => {
  try {
    const raw = localStorage.getItem('modulex_selected_organization')
    if (!raw) return null
    const parsed = JSON.parse(raw) as { id?: string }
    return parsed?.id ?? null
  } catch {
    return null
  }
}

const fetchToolsData = async (): Promise<ToolsData | null> => {
  try {
    const orgId = getSelectedOrganizationId()
    const url = orgId ? `/api/tools?organization_id=${encodeURIComponent(orgId)}` : '/api/tools'
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      console.error('Failed to fetch tools:', response.status, response.statusText)
      return null
    }

    return await response.json()
  } catch (error) {
    console.error('Error fetching tools:', error)
    return null
  }
}

const updateToolsData = async (toolsData: ToolsData): Promise<boolean> => {
  try {
    const orgId = getSelectedOrganizationId()
    const url = orgId ? `/api/tools?organization_id=${encodeURIComponent(orgId)}` : '/api/tools'
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(toolsData)
    })

    if (!response.ok) {
      console.error('Failed to update tools:', response.status, response.statusText)
      return false
    }

    return true
  } catch (error) {
    console.error('Error updating tools:', error)
    return false
  }
}

// API functions for specific tool operations
const toggleToolStatus = async (toolName: string, isActive: boolean): Promise<boolean> => {
  try {
    const orgId = getSelectedOrganizationId()
    const url = orgId ? `/api/tools/toggle-tool?organization_id=${encodeURIComponent(orgId)}` : '/api/tools/toggle-tool'
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ toolName, isActive })
    })

    if (!response.ok) {
      console.error('Failed to toggle tool status:', response.status, response.statusText)
      return false
    }

    return true
  } catch (error) {
    console.error('Error toggling tool status:', error)
    return false
  }
}

const toggleActionStatus = async (toolName: string, actionName: string, isActive: boolean): Promise<boolean> => {
  try {
    const orgId = getSelectedOrganizationId()
    const url = orgId ? `/api/tools/toggle-action?organization_id=${encodeURIComponent(orgId)}` : '/api/tools/toggle-action'
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ toolName, actionName, isActive })
    })

    if (!response.ok) {
      console.error('Failed to toggle action status:', response.status, response.statusText)
      return false
    }

    return true
  } catch (error) {
    console.error('Error toggling action status:', error)
    return false
  }
}

const getAuthUrl = async (toolName: string): Promise<{ auth_url: string; state: string; tool_name: string } | null> => {
  try {
    const orgId = getSelectedOrganizationId()
    const qs = new URLSearchParams({ toolName })
    if (orgId) qs.set('organization_id', orgId)
    const response = await fetch(`/api/tools/auth-url?${qs.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    })

    if (!response.ok) {
      console.error('Failed to get auth URL:', response.status, response.statusText)
      return null
    }

    const result = await response.json()
    return result
  } catch (error) {
    console.error('Error getting auth URL:', error)
    return null
  }
}

const disconnectTool = async (toolName: string): Promise<boolean> => {
  try {
    const orgId = getSelectedOrganizationId()
    const url = orgId ? `/api/tools/disconnect?organization_id=${encodeURIComponent(orgId)}` : '/api/tools/disconnect'
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ toolName })
    })

    if (!response.ok) {
      console.error('Failed to disconnect tool:', response.status, response.statusText)
      return false
    }

    return true
  } catch (error) {
    console.error('Error disconnecting tool:', error)
    return false
  }
}

// Fallback mock data - API başarısız olursa kullanılacak
const fallbackToolsData: ToolsData = {
  "tools": [
    {
      "name": "r2r",
      "display_name": "R2R Retrieval System",
      "is_authenticated": true,
      "is_active": true,
      "health_status": true,
      "actions": [
        {
          "name": "search",
          "description": "Perform a vector search in the R2R knowledge base",
          "is_active": true
        },
        {
          "name": "rag",
          "description": "Perform a Retrieval-Augmented Generation query",
          "is_active": true
        },
        {
          "name": "list_documents",
          "description": "List documents in the R2R system",
          "is_active": true
        },
        {
          "name": "get_document",
          "description": "Get detailed information about a specific document",
          "is_active": true
        },
        {
          "name": "list_collections",
          "description": "List collections in the R2R system",
          "is_active": true
        }
      ]
    },
    {
      "name": "github",
      "display_name": "GitHub",
      "is_authenticated": true,
      "is_active": true,
      "health_status": true,
      "actions": [
        {
          "name": "list_repositories",
          "description": "List user's GitHub repositories",
          "is_active": true
        },
        {
          "name": "create_repository",
          "description": "Create a new GitHub repository",
          "is_active": true
        },
        {
          "name": "get_user_info",
          "description": "Get authenticated user information",
          "is_active": true
        }
      ]
    }
  ]
}

export function ToolsToggle() {
  const [open, setOpen] = useState(false)
  const [toolsData, setToolsData] = useState<ToolsData>(fallbackToolsData)
  const [selectedTool, setSelectedTool] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [operationInProgress, setOperationInProgress] = useState<{
    type: 'tool' | 'action' | 'disconnect' | 'auth'
    id: string
  } | null>(null)
  const [searchValue, setSearchValue] = useState('')
  
  // Add refs and state for dynamic positioning
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [openUpward, setOpenUpward] = useState(false)

  // Calculate if dialog should open upward or downward
  useEffect(() => {
    const calculatePosition = () => {
      if (open && buttonRef.current) {
        const buttonRect = buttonRef.current.getBoundingClientRect()
        const viewportHeight = window.innerHeight
        const dialogHeight = 350 // Approximate height of the dialog (320px + margins)
        
        // Check if there's enough space below the button
        const spaceBelow = viewportHeight - buttonRect.bottom
        const spaceAbove = buttonRect.top
        
        // Open upward if there's not enough space below but enough above
        setOpenUpward(spaceBelow < dialogHeight && spaceAbove > dialogHeight)
      }
    }

    calculatePosition()
    
    // Recalculate on window resize or scroll
    const handleResize = () => calculatePosition()
    const handleScroll = () => calculatePosition()
    
    if (open) {
      window.addEventListener('resize', handleResize)
      window.addEventListener('scroll', handleScroll)
      
      return () => {
        window.removeEventListener('resize', handleResize)
        window.removeEventListener('scroll', handleScroll)
      }
    }
  }, [open])

  useEffect(() => {
    loadToolsData()
    const onOrgChanged = async () => {
      await loadToolsData()
    }
    window.addEventListener('organization-changed', onOrgChanged as EventListener)
    return () => window.removeEventListener('organization-changed', onOrgChanged as EventListener)
  }, [])

  const loadToolsData = async () => {
    setIsLoading(true)
    try {
      // First try to load from API
      const apiData = await fetchToolsData()
      if (apiData) {
        setToolsData(apiData)
        return
      }

      // If API fails, try to load from cookies
      const savedToolsState = getCookie('toolsState')
      if (savedToolsState) {
        try {
          const parsedState = JSON.parse(savedToolsState) as ToolsData
          setToolsData(parsedState)
        } catch (e) {
          console.error('Failed to parse saved tools state:', e)
          // Use fallback data if both API and cookies fail
          setToolsData(fallbackToolsData)
        }
      } else {
        // Use fallback data if no saved state
        setToolsData(fallbackToolsData)
      }
    } catch (error) {
      console.error('Error loading tools data:', error)
      setToolsData(fallbackToolsData)
    } finally {
      setIsLoading(false)
    }
  }

  // Sadece fallback durumları için kullanılacak
  const saveToolsStateLocally = (newToolsData: ToolsData) => {
    setToolsData(newToolsData)
    setCookie('toolsState', JSON.stringify(newToolsData))
  }

  const handleToolToggle = async (toolName: string) => {
    const tool = toolsData.tools.find(t => t.name === toolName)
    if (!tool) return

    setOperationInProgress({ type: 'tool', id: toolName })
    
    try {
      const newIsActive = !tool.is_active
      
      // Optimistic update - UI'yi hemen güncelle
      const newToolsData = { ...toolsData }
      const toolToUpdate = newToolsData.tools.find(t => t.name === toolName)
      if (toolToUpdate) {
        toolToUpdate.is_active = newIsActive
        setToolsData(newToolsData)
      }

      // API isteğini gönder
      const success = await toggleToolStatus(toolName, newIsActive)
      
      if (success) {
        // Server'dan başarı gelirse local cache'i de güncelle
        setCookie('toolsState', JSON.stringify(newToolsData))
        // Optimistic update zaten yapıldı, yeniden yüklemeye gerek yok
      } else {
        // API başarısızsa geri al
        const revertedToolsData = { ...toolsData }
        const toolToRevert = revertedToolsData.tools.find(t => t.name === toolName)
        if (toolToRevert) {
          toolToRevert.is_active = tool.is_active // Eski değere döndür
          setToolsData(revertedToolsData)
        }
        console.error('Failed to toggle tool status on server')
      }
    } finally {
      setOperationInProgress(null)
    }
  }

  const handleActionToggle = async (toolName: string, actionName: string) => {
    const tool = toolsData.tools.find(t => t.name === toolName)
    if (!tool) return
    
    const action = tool.actions.find(a => a.name === actionName)
    if (!action) return

    setOperationInProgress({ type: 'action', id: `${toolName}-${actionName}` })
    
    try {
      const newIsActive = !action.is_active
      
      // Optimistic update - UI'yi hemen güncelle
      const newToolsData = { ...toolsData }
      const toolToUpdate = newToolsData.tools.find(t => t.name === toolName)
      if (toolToUpdate) {
        const actionToUpdate = toolToUpdate.actions.find(a => a.name === actionName)
        if (actionToUpdate) {
          actionToUpdate.is_active = newIsActive
          setToolsData(newToolsData)
        }
      }

      // API isteğini gönder
      const success = await toggleActionStatus(toolName, actionName, newIsActive)
      
      if (success) {
        // Server'dan başarı gelirse local cache'i de güncelle
        setCookie('toolsState', JSON.stringify(newToolsData))
        // Optimistic update zaten yapıldı, yeniden yüklemeye gerek yok
      } else {
        // API başarısızsa geri al
        const revertedToolsData = { ...toolsData }
        const toolToRevert = revertedToolsData.tools.find(t => t.name === toolName)
        if (toolToRevert) {
          const actionToRevert = toolToRevert.actions.find(a => a.name === actionName)
          if (actionToRevert) {
            actionToRevert.is_active = action.is_active // Eski değere döndür
            setToolsData(revertedToolsData)
          }
        }
        console.error('Failed to toggle action status on server')
      }
    } finally {
      setOperationInProgress(null)
    }
  }

  const handleAuthenticate = async (toolName: string) => {
    try {
      // Auth URL'ini al
      const authData = await getAuthUrl(toolName)
      
      if (authData && authData.auth_url) {
        // Auth URL'ini popup'ta aç
        const popup = window.open(
          authData.auth_url, 
          'auth_popup', 
          'width=600,height=700,scrollbars=yes,resizable=yes,status=yes,location=yes,toolbar=no,menubar=no'
        )
        
        console.log(`Authentication started for ${toolName}`)
        console.log(`Auth URL: ${authData.auth_url}`)
        console.log(`State: ${authData.state}`)
        
        // PostMessage listener ekle - auth başarılı olduğunda popup'tan mesaj bekle
        const handleMessage = async (event: MessageEvent) => {
          // Güvenlik için origin kontrolü yapabilirsiniz
          if (event.data.type === 'AUTH_SUCCESS') {
            console.log('Auth başarılı! Popup kapatılıyor ve tools yeniden yükleniyor...')
            
            // Popup'ı kapat
            if (popup && !popup.closed) {
              popup.close()
            }
            
            // Tools verisini hemen yeniden yükle
            await loadToolsData()
            
            // Event listener'ı temizle
            window.removeEventListener('message', handleMessage)
          } else if (event.data.type === 'AUTH_ERROR') {
            console.log('Auth başarısız!')
            
            // Popup'ı kapat
            if (popup && !popup.closed) {
              popup.close()
            }
            
            // Event listener'ı temizle
            window.removeEventListener('message', handleMessage)
          }
        }
        
                 // Message listener'ını ekle
         window.addEventListener('message', handleMessage)
         
         // Auth durumunu 3 saniyede bir kontrol et (COOP nedeniyle popup.closed kullanamıyoruz)
          const checkAuth = setInterval(async () => {
           try {
             console.log(`Checking auth status for ${toolName}...`)
              const orgId = getSelectedOrganizationId()
              const url = orgId ? `/api/tools?organization_id=${encodeURIComponent(orgId)}` : '/api/tools'
              const response = await fetch(url, {
                method: 'GET',
                headers: {
                  'Content-Type': 'application/json',
                }
              })
             
             if (response.ok) {
               const data = await response.json()
               console.log(`Tools data received:`, data)
               const tool = data.tools?.find((t: any) => t.name === toolName)
               console.log(`Found tool ${toolName}:`, tool)
               
               if (tool && tool.is_authenticated) {
                 console.log('🎉 Auth başarılı (polling ile tespit edildi)! Popup kapatılıyor...')
                 
                 // Popup'ı kapatmaya çalış (COOP nedeniyle çalışmayabilir)
                 try {
                   popup?.close()
                 } catch (e) {
                   console.log('Popup kapatılamadı (COOP policy), kullanıcı manuel kapatmalı')
                 }
                 
                 // Tools verisini yeniden yükle
                 await loadToolsData()
                 
                 // Temizle
                 clearInterval(checkAuth)
                 window.removeEventListener('message', handleMessage)
               } else {
                 console.log(`Tool ${toolName} not yet authenticated:`, tool?.is_authenticated)
               }
             } else {
               console.log('Failed to fetch tools data:', response.status)
             }
           } catch (error) {
             // Polling error, devam et
             console.log('Auth polling error:', error)
           }
         }, 3000)
        
                 // 5 dakika sonra interval ve listener'ı temizle (güvenlik)
         setTimeout(() => {
           clearInterval(checkAuth)
           window.removeEventListener('message', handleMessage)
         }, 300000)
      } else {
        console.error('Failed to get auth URL')
      }
    } catch (error) {
      console.error('Error during authentication:', error)
    }
  }

  const handleDisconnect = async (toolName: string) => {
    if (!confirm(`Are you sure you want to disconnect ${toolName}? This will remove all authentication and deactivate the tool.`)) {
      return
    }

    setOperationInProgress({ type: 'disconnect', id: toolName })
    
    try {
      const success = await disconnectTool(toolName)
      
      if (success) {
        console.log(`Successfully disconnected ${toolName}`)
        // Tools verisini yeniden yükle
        await loadToolsData()
      } else {
        console.error('Failed to disconnect tool')
      }
    } catch (error) {
      console.error('Error during disconnect:', error)
    } finally {
      setOperationInProgress(null)
    }
  }

  const openActionsDialog = (toolName: string) => {
    setSelectedTool(selectedTool === toolName ? null : toolName)
  }

  // Helper functions - define before use
  const getToolIcon = (toolName: string) => {
    return `/icons/tools/${toolName}.svg`
  }

  // Format action name for display (snake_case -> Title Case)
  const formatActionName = (actionName: string) => {
    return actionName
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
  }

  const activeToolsCount = toolsData.tools.filter(tool => tool.is_active).length

  // Group tools by status - active first, then inactive, then not connected
  const groupedTools = useMemo(() => ({
    'Active': toolsData.tools.filter(tool => tool.is_authenticated && tool.is_active),
    'Inactive': toolsData.tools.filter(tool => tool.is_authenticated && !tool.is_active),
    'Not Connected': toolsData.tools.filter(tool => !tool.is_authenticated)
  }), [toolsData.tools])

  // Filter tools based on search - optimized with useMemo
  const filteredGroupedTools = useMemo(() => {
    return Object.entries(groupedTools).reduce((acc, [group, tools]) => {
      const filtered = tools.filter(tool => 
        tool.display_name.toLowerCase().includes(searchValue.toLowerCase()) ||
        tool.name.toLowerCase().includes(searchValue.toLowerCase()) ||
        tool.actions.some(action => 
          action.name.toLowerCase().includes(searchValue.toLowerCase()) ||
          formatActionName(action.name).toLowerCase().includes(searchValue.toLowerCase()) ||
          action.description.toLowerCase().includes(searchValue.toLowerCase())
        )
      )
      if (filtered.length > 0) {
        acc[group] = filtered
      }
      return acc
    }, {} as Record<string, Tool[]>)
  }, [searchValue, groupedTools])

  return (
    <div className="relative">
      {/* Tools Button */}
      <Button
        variant="outline"
        role="combobox"
        aria-expanded={open}
        className="text-sm rounded-full shadow-none focus:ring-0"
        onClick={() => setOpen(!open)}
        ref={buttonRef}
      >
        <div className="flex items-center space-x-1">
          <Settings className="h-4 w-4" />
          <span className="text-xs font-medium">Tools</span>
          {activeToolsCount > 0 && (
            <Badge variant="secondary" className="bg-accent-blue text-accent-blue-foreground text-xs h-4 px-1.5">
              {activeToolsCount}
            </Badge>
          )}
        </div>
      </Button>

      {/* Custom Fixed Position Dialog */}
      {open && (
        <>
          {/* Backdrop - click to close */}
          <div 
            className="fixed inset-0 z-40"
            onClick={() => {
              setOpen(false)
              setSelectedTool(null)
              setSearchValue('')
            }}
          />
          
                      {/* Main Tools Dialog - Dynamic Position */}
            <div className={cn(
              "absolute left-0 w-80 z-50 bg-background border rounded-md shadow-lg",
              openUpward ? "bottom-full mb-1" : "top-full mt-1"
            )}>
            {/* Custom Search Input */}
            <div className="flex items-center border-b px-3">
              <input
                type="text"
                placeholder="Search tools and actions..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            
            {/* Tools List - Fixed height to prevent positioning issues */}
            <div className="h-80 overflow-y-auto">
              {isLoading ? (
                <div className="p-3 text-center text-muted-foreground text-sm">
                  Loading tools...
                </div>
              ) : Object.keys(filteredGroupedTools).length === 0 ? (
                <div className="p-3 text-center text-muted-foreground text-sm">
                  {searchValue ? 'No tools found.' : 'No tools available'}
                </div>
              ) : (
                Object.entries(filteredGroupedTools).map(([group, tools]) => (
                  <div key={group} className="p-2">
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                      {group}
                    </div>
                    <div className="space-y-1">
                      {tools.map((tool) => (
                        <div key={tool.name} className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors">
                          <div className="flex items-center space-x-2 flex-1">
                            <div className="relative">
                              <Image
                                src={getToolIcon(tool.name)}
                                alt={tool.display_name}
                                width={24}
                                height={24}
                                className="rounded"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement
                                  target.src = '/icons/tools/default.svg'
                                }}
                              />
                              {/* Small status indicator - only shows for connected tools */}
                              {tool.is_authenticated && (
                                <div className={cn(
                                  "absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full",
                                  tool.is_active ? "bg-green-500" : "bg-red-500"
                                )} />
                              )}
                            </div>
                            <div>
                              <div className="font-medium text-xs">{tool.display_name}</div>
                              <div className="text-xs text-muted-foreground">
                                {tool.is_authenticated ? 'Connected' : 'Not connected'}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-1">
                            {tool.is_authenticated ? (
                              <>
                                {tool.is_authenticated && tool.actions.length > 0 && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5"
                                    onClick={() => openActionsDialog(tool.name)}
                                  >
                                    <ChevronRight 
                                      className={cn(
                                        "h-3 w-3 transition-transform",
                                        selectedTool === tool.name && "rotate-90"
                                      )}
                                    />
                                  </Button>
                                )}
                              </>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleAuthenticate(tool.name)}
                                className="text-xs h-6 px-2"
                              >
                                <ExternalLink className="h-3 w-3 mr-1" />
                                Connect
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Actions Side Panel - Fixed Position */}
          {selectedTool && (
            (() => {
              const selectedToolData = toolsData.tools.find(t => t.name === selectedTool)
              if (!selectedToolData) return null
              
              // Filter actions based on search
              const filteredActions = selectedToolData.actions.filter(action =>
                action.name.toLowerCase().includes(searchValue.toLowerCase()) ||
                formatActionName(action.name).toLowerCase().includes(searchValue.toLowerCase()) ||
                action.description.toLowerCase().includes(searchValue.toLowerCase())
              )
              
              return (
                <div className={cn(
                  "absolute left-80 ml-3 w-72 z-50 bg-background border rounded-md shadow-lg",
                  openUpward ? "bottom-full mb-1" : "top-full mt-1"
                )}>
                  <div className="border-b p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="relative">
                          <Image
                            src={getToolIcon(selectedTool)}
                            alt={selectedToolData.display_name}
                            width={20}
                            height={20}
                            className="rounded"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement
                              target.src = '/icons/tools/default.svg'
                            }}
                          />
                        </div>
                        <div>
                          <div className="font-medium text-sm">
                            {selectedToolData.display_name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Actions • {selectedToolData.actions.filter(action => action.is_active).length}/{selectedToolData.actions.length}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={selectedToolData.is_active}
                          onCheckedChange={() => handleToolToggle(selectedTool)}
                          variant="green"
                          size="xs"
                          disabled={operationInProgress?.type === 'tool' && operationInProgress?.id === selectedTool}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 text-muted-foreground hover:text-red-500"
                          onClick={() => handleDisconnect(selectedTool)}
                          disabled={operationInProgress?.type === 'disconnect' && operationInProgress?.id === selectedTool}
                          title="Disconnect tool"
                        >
                          <Unplug className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Actions List - No Command needed, just styled divs */}
                  <div className="p-2 space-y-1 h-80 overflow-y-auto">
                    {filteredActions.length === 0 ? (
                      <div className="p-3 text-center text-muted-foreground text-sm">
                        {searchValue ? 'No actions match your search.' : 'No actions available.'}
                      </div>
                    ) : (
                      filteredActions.map((action) => {
                        const isToolActive = selectedToolData.is_active
                        const isActionDisabled = !isToolActive
                        
                        return (
                          <div 
                            key={action.name} 
                            className={cn(
                              "flex items-center justify-between py-2 px-3 rounded-md transition-colors",
                              isActionDisabled 
                                ? "opacity-50 cursor-not-allowed" 
                                : "hover:bg-muted/50 cursor-pointer"
                            )}
                            onClick={isActionDisabled ? undefined : () => handleActionToggle(selectedTool, action.name)}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2">
                                <div className="font-medium text-xs">{formatActionName(action.name)}</div>
                                {action.is_active && (
                                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground mt-0.5 truncate">
                                {action.description}
                              </div>
                            </div>
                            
                            {/* Loading indicator for this specific action */}
                            {operationInProgress?.type === 'action' && 
                             operationInProgress?.id === `${selectedTool}-${action.name}` && (
                              <div className="w-3 h-3 border border-gray-300 border-t-transparent rounded-full animate-spin" />
                            )}
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              )
            })()
          )}
        </>
      )}
    </div>
  )
}