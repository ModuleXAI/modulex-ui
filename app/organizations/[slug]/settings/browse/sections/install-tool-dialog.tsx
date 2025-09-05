'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { getApiErrorMessage } from '@/lib/utils/api-error'
import * as React from 'react'
import { toast } from 'sonner'

type EnvironmentVariable = {
  name: string
  about_url?: string
  description: string
  sample_format: string
  required?: boolean
  type?: 'string' | 'number' | 'boolean' | 'url' | 'secret' | 'password'
  // Optional UI helpers (may be present from backend)
  title?: string
  defaultValue?: string
  disabled?: boolean
  subtitle?: string
}

type AuthSchema = {
  auth_type: string
  setup_environment_variables: EnvironmentVariable[]
  system_has_oauth2_variables?: boolean
}

type Tool = {
  name: string
  display_name: string
  oauth2_env_available?: boolean
  auth_schemas?: AuthSchema[]
}

export default function InstallToolDialog({
  tool,
  open,
  onOpenChange
}: {
  tool: Tool
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [step, setStep] = React.useState<'auth' | 'config'>('auth')
  const [selectedAuthType, setSelectedAuthType] = React.useState<string>('')
  const [envVars, setEnvVars] = React.useState<Record<string, string>>({})
  const [useCustomCredentials, setUseCustomCredentials] = React.useState<boolean>(false)

  React.useEffect(() => {
    if (open) {
      setStep('auth')
      setSelectedAuthType('')
      setEnvVars({})
      setUseCustomCredentials(false)
    }
  }, [open, tool?.name])

  const selectedSchema = React.useMemo(() => tool.auth_schemas?.find(s => s.auth_type === selectedAuthType), [tool, selectedAuthType])

  const handleInstall = async () => {
    if (!selectedAuthType) return
    const orgId = (() => {
      try {
        const raw = localStorage.getItem('modulex_selected_organization')
        if (!raw) return null
        return (JSON.parse(raw) as { id?: string }).id ?? null
      } catch { return null }
    })()

    const isOAuth2WithSystemCredentials = selectedAuthType === 'oauth2' && tool.oauth2_env_available && !useCustomCredentials
    let configToSend: Record<string, string> | undefined = undefined
    if (!isOAuth2WithSystemCredentials) {
      if (selectedAuthType === 'oauth2') {
        configToSend = Object.fromEntries(Object.entries(envVars).filter(([k]) => k !== 'redirect_uri'))
      } else {
        configToSend = envVars
      }
    }

    const url = orgId ? `/api/integrations/install?organization_id=${encodeURIComponent(orgId)}` : '/api/integrations/install'
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tool_name: tool.name,
        ...(configToSend ? { config_data: configToSend } : {})
      })
    })
    if (res.ok) {
      onOpenChange(false)
    } else {
      const message = await getApiErrorMessage(res, 'Failed to install tool')
      toast(message, { duration: 3000 })
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[540px] p-0 bg-background text-foreground border-l">
        <div className="h-full flex flex-col">
          <SheetHeader className="p-4 border-b">
            <SheetTitle>Install {tool.display_name}</SheetTitle>
          </SheetHeader>

          <div className="flex-1 min-h-0 overflow-hidden p-4">
            {step === 'auth' ? (
              <div className="h-full max-h-[calc(100vh-180px)] overflow-y-auto overflow-x-hidden">
                <div className="space-y-3">
                  {(tool.auth_schemas || []).map(schema => (
                    <Card key={schema.auth_type} className={`cursor-pointer transition-all duration-200 bg-card border ${selectedAuthType === schema.auth_type ? 'border-[#67E9AB]' : 'hover:border-border'}`} onClick={() => { setSelectedAuthType(schema.auth_type); setStep('config') }}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center justify-between">
                          <span className="capitalize">{schema.auth_type}</span>
                          <Badge variant="outline" className="text-xs">{schema.setup_environment_variables.length} variables required</Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0 text-xs text-muted-foreground">
                        Select {schema.auth_type} authentication method
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-full max-h-[calc(100vh-180px)] overflow-y-auto overflow-x-hidden">
                <div className="space-y-4">
                  {selectedAuthType === 'oauth2' && tool.oauth2_env_available ? (
                    <Card className="bg-card border">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">OAuth2 Credentials</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="flex items-start space-x-3 p-3 border rounded-lg">
                            <input type="radio" id="system" name="oauth-credentials" value="system" checked={!useCustomCredentials} onChange={() => setUseCustomCredentials(false)} className="mt-1 h-4 w-4" />
                            <div className="flex-1">
                              <Label htmlFor="system" className="text-sm font-medium cursor-pointer">Use system OAuth2 credentials (Recommended)</Label>
                              <p className="text-xs text-muted-foreground mt-1">No setup required.</p>
                            </div>
                          </div>
                          <div className="flex items-start space-x-3 p-3 border rounded-lg">
                            <input type="radio" id="custom" name="oauth-credentials" value="custom" checked={useCustomCredentials} onChange={() => setUseCustomCredentials(true)} className="mt-1 h-4 w-4" />
                            <div className="flex-1">
                              <Label htmlFor="custom" className="text-sm font-medium cursor-pointer">Use your own developer credentials</Label>
                              <p className="text-xs text-muted-foreground mt-1">Provide credentials from your OAuth2 app.</p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ) : null}

                  {(
                    // Show fields when:
                    // - Auth type is NOT oauth2, OR
                    // - Auth type is oauth2 but using custom credentials, OR
                    // - Auth type is oauth2 and system credentials option is not available
                    selectedAuthType !== 'oauth2' || useCustomCredentials || !tool.oauth2_env_available
                  ) && (
                    <>
                      {(selectedSchema?.setup_environment_variables || []).map(field => (
                        <div key={field.name} className="space-y-2">
                          <Label className="text-xs font-medium">{field.title || field.name}</Label>
                          <Input
                            type={field.type === 'secret' || field.type === 'password' ? 'password' : 'text'}
                            value={envVars[field.name] ?? (field.defaultValue as any) ?? ''}
                            onChange={(e) => setEnvVars(prev => ({ ...prev, [field.name]: e.target.value }))}
                            disabled={field.disabled}
                            placeholder={field.sample_format}
                            className="bg-background border-input text-foreground placeholder:text-muted-foreground"
                          />
                          {field.subtitle ? <p className="text-[11px] text-muted-foreground">{field.subtitle}</p> : null}
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="border-t bg-background p-4">
            {step === 'auth' ? (
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenChange(false)}
                  className="h-9 text-xs bg-transparent border border-border text-foreground hover:bg-accent"
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <div className="flex justify-between items-center">
                <div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onOpenChange(false)}
                    className="h-9 text-xs bg-transparent border border-border text-foreground hover:bg-accent"
                  >
                    Cancel
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleInstall}
                    disabled={!selectedAuthType}
                    className="h-9 text-xs bg-[#67E9AB] text-black hover:bg-[#58D99C]"
                  >
                    Install Tool
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}


