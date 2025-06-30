'use client'

import { cn } from '@/lib/utils'
import { getCookie, setCookie } from '@/lib/utils/cookies'
import {
  ChevronRight,
  ExternalLink,
  Settings,
  ShieldCheck,
  ShieldX,
  Unplug,
  X
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from './ui/button'
import {
  Collapsible,
  CollapsibleContent
} from './ui/collapsible'
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from './ui/popover'
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
const fetchToolsData = async (): Promise<ToolsData | null> => {
  try {
    const response = await fetch('/api/tools', {
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
    const response = await fetch('/api/tools', {
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
    const response = await fetch('/api/tools/toggle-tool', {
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
    const response = await fetch('/api/tools/toggle-action', {
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
    const response = await fetch(`/api/tools/auth-url?toolName=${encodeURIComponent(toolName)}`, {
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
    const response = await fetch('/api/tools/disconnect', {
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
  const [expandedTools, setExpandedTools] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(false)
  const [operationInProgress, setOperationInProgress] = useState<{ type: string, id: string } | null>(null)

  useEffect(() => {
    loadToolsData()
    loadExpandedState()
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

  const loadExpandedState = () => {
    const savedExpandedTools = getCookie('expandedTools')
    if (savedExpandedTools) {
      try {
        const parsedExpanded = JSON.parse(savedExpandedTools) as string[]
        setExpandedTools(new Set(parsedExpanded))
      } catch (e) {
        console.error('Failed to parse expanded tools:', e)
      }
    }
  }

  // Sadece fallback durumları için kullanılacak
  const saveToolsStateLocally = (newToolsData: ToolsData) => {
    setToolsData(newToolsData)
    setCookie('toolsState', JSON.stringify(newToolsData))
  }

  const saveExpandedState = (newExpanded: Set<string>) => {
    setExpandedTools(newExpanded)
    setCookie('expandedTools', JSON.stringify(Array.from(newExpanded)))
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
        // Tools verisini yeniden yükle
        await loadToolsData()
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
        // Tools verisini yeniden yükle
        await loadToolsData()
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
             const response = await fetch(`/api/tools`, {
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

  const toggleToolExpanded = (toolName: string) => {
    const newExpanded = new Set(expandedTools)
    if (newExpanded.has(toolName)) {
      newExpanded.delete(toolName)
    } else {
      newExpanded.add(toolName)
    }
    saveExpandedState(newExpanded)
  }

  const getHealthIcon = (healthStatus: boolean) => {
    return healthStatus ? (
      <ShieldCheck className="h-4 w-4 text-green-500" />
    ) : (
      <ShieldX className="h-4 w-4 text-red-500" />
    )
  }

  const activeToolsCount = toolsData.tools.filter(tool => tool.is_active).length

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="button"
          aria-expanded={open}
          className="text-sm rounded-full shadow-none focus:ring-0 gap-1"
        >
          <Settings className="h-4 w-4" />
          <span className="text-xs">Tools</span>
          {activeToolsCount > 0 && (
            <span className="bg-accent-blue text-accent-blue-foreground text-xs rounded-full px-1.5 py-0.5 min-w-5 h-5 flex items-center justify-center">
              {activeToolsCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 max-h-96" align="start">
        <div className="p-4 flex flex-col max-h-96">
          <div className="flex items-center justify-between mb-3 flex-shrink-0">
            <h3 className="font-semibold text-sm">Available Tools</h3>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="space-y-2 overflow-y-auto flex-1 pr-1">
            {isLoading ? (
              <div className="text-center py-6 text-muted-foreground text-sm">
                Loading tools...
              </div>
            ) : (
              toolsData.tools.map((tool) => (
                <div key={tool.name} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1">
                      {getHealthIcon(tool.health_status)}
                      <div className="flex-1">
                        <div className="font-medium text-sm">{tool.display_name}</div>
                        <div className="text-xs text-muted-foreground">
                          {tool.is_authenticated ? 'Authenticated' : 'Not authenticated'}
                        </div>
                      </div>
                    </div>
                  
                  <div className="flex items-center gap-2">
                    {tool.is_authenticated ? (
                      <>
                        <Switch
                          checked={tool.is_active}
                          onCheckedChange={() => handleToolToggle(tool.name)}
                          size="sm"
                          disabled={operationInProgress?.type === 'tool' && operationInProgress?.id === tool.name}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDisconnect(tool.name)}
                          disabled={operationInProgress?.type === 'disconnect' && operationInProgress?.id === tool.name}
                          title="Disconnect tool"
                        >
                          <Unplug className="h-3 w-3" />
                        </Button>
                        {tool.is_active && tool.actions.length > 0 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => toggleToolExpanded(tool.name)}
                          >
                            <ChevronRight 
                              className={cn(
                                "h-4 w-4 transition-transform",
                                expandedTools.has(tool.name) && "rotate-90"
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
                        className="text-xs h-7"
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Auth
                      </Button>
                    )}
                  </div>
                </div>

                {/* Actions - show only if tool is authenticated, active, and expanded */}
                {tool.is_authenticated && tool.is_active && expandedTools.has(tool.name) && (
                  <Collapsible open={expandedTools.has(tool.name)}>
                    <CollapsibleContent className="mt-3 pt-3 border-t">
                      <div className="space-y-2">
                        <div className="text-xs font-medium text-muted-foreground mb-2">Actions</div>
                        {tool.actions.map((action) => (
                          <div key={action.name} className="flex items-center justify-between py-1">
                            <div className="flex-1">
                              <div className="text-sm font-medium">{action.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {action.description}
                              </div>
                            </div>
                            <Switch
                              checked={action.is_active}
                              onCheckedChange={() => handleActionToggle(tool.name, action.name)}
                              size="sm"
                              disabled={operationInProgress?.type === 'action' && operationInProgress?.id === `${tool.name}-${action.name}`}
                            />
                          </div>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}
                </div>
              ))
            )}
          </div>
          
          {!isLoading && toolsData.tools.length === 0 && (
            <div className="text-center py-6 text-muted-foreground text-sm">
              No tools available
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
} 