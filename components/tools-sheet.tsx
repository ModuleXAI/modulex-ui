'use client'

import { Settings } from 'lucide-react'
import { useEffect, useState } from 'react'
import { ToolsToggle } from './tools-toggle'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from './ui/sheet'

export function ToolsSheet() {
  const [open, setOpen] = useState(false)
  const [activeCount, setActiveCount] = useState(0)

  // ToolsToggle already fetches and manages tool state.
  // We listen for storage change to update badge, fallback to a polling on open.
  useEffect(() => {
    const updateBadge = () => {
      try {
        const raw = document.cookie.split('; ').find(r => r.startsWith('toolsState='))?.split('=')[1]
        if (!raw) return
        const parsed = JSON.parse(decodeURIComponent(raw))
        const count = Array.isArray(parsed?.tools) ? parsed.tools.filter((t: any) => t.is_active).length : 0
        setActiveCount(count)
      } catch {}
    }
    updateBadge()
    const id = setInterval(updateBadge, 2000)
    return () => clearInterval(id)
  }, [])

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-8 text-sm rounded-3xl shadow-none focus:ring-0"
        >
          <div className="flex items-center space-x-1">
            <Settings className="h-4 w-4" />
            <span className="text-xs font-medium">Tools</span>
            {activeCount > 0 && (
              <Badge variant="secondary" className="bg-accent-blue text-accent-blue-foreground text-xs h-4 px-1.5">
                {activeCount}
              </Badge>
            )}
          </div>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Tools</SheetTitle>
        </SheetHeader>
        <div className="mt-2">
          {/* Reuse existing ToolsToggle UI inside the sheet */}
          <ToolsToggle />
        </div>
      </SheetContent>
    </Sheet>
  )
}


