'use client'

import { cn } from '@/lib/utils'
import { ChevronDown, FileText, ListChecks, SearchCheck } from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible'

type UltraStage = 'planner' | 'writer' | 'critic'

export function UltraStageSection({
  stage,
  text,
  isOpen,
  onOpenChange,
  title,
  resultTitle,
  headerText
}: {
  stage: UltraStage
  text: string
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  resultTitle?: string
  headerText?: string
}) {
  const meta = getMeta(stage)
  const displayTitle = title || meta.title

  return (
    <div className="mb-2">
      <Collapsible open={isOpen} onOpenChange={onOpenChange}>
        <CollapsibleTrigger asChild>
          <button
            className={cn(
              'w-full flex items-center justify-between rounded-md border px-3 py-2',
              'text-left bg-card hover:bg-accent/50 transition-colors'
            )}
            aria-label={`${title} section`}
          >
            <div className="flex items-center gap-2">
              <div className="p-1 rounded-sm bg-muted text-foreground">
                {meta.icon}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium">{displayTitle}</span>
                <span className="text-xs text-muted-foreground">{headerText || meta.description}</span>
              </div>
            </div>
            <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', isOpen ? 'rotate-180' : 'rotate-0')} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="px-3 py-2 border border-t-0 rounded-b-md">
          {resultTitle && (
            <div className="mb-2 text-xs font-medium text-foreground/80">
              {resultTitle}
            </div>
          )}
          <pre className="whitespace-pre-wrap break-words text-sm text-muted-foreground">{text}</pre>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}

function getMeta(stage: UltraStage): { title: string; description: string; icon: JSX.Element } {
  switch (stage) {
    case 'planner':
      return {
        title: 'Planner',
        description: 'Analysis and plan of action',
        icon: <ListChecks className="h-4 w-4" />
      }
    case 'writer':
      return {
        title: 'Writer',
        description: 'First comprehensive draft',
        icon: <FileText className="h-4 w-4" />
      }
    case 'critic':
      return {
        title: 'Critic',
        description: 'Issues and improvements checklist',
        icon: <SearchCheck className="h-4 w-4" />
      }
    default:
      return { title: 'Stage', description: 'Details', icon: <FileText className="h-4 w-4" /> }
  }
}


