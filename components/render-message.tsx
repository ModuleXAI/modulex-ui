import { useArtifact } from '@/components/artifact/artifact-context'
import { cn } from '@/lib/utils'
import { ChatRequestOptions, JSONValue, Message, ToolInvocation } from 'ai'
import { ChevronDown, GitMerge } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { AnswerSection } from './answer-section'
import { QuestionConfirmation } from './question-confirmation'
import { ReasoningSection } from './reasoning-section'
import RelatedQuestions from './related-questions'
import { SearchResults } from './search-results'
import { SearchResultsImageSection } from './search-results-image'
import { ToolSection } from './tool-section'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible'
import { UltraTimeline, UltraTimelineItem } from './ultra-timeline'
import { UserMessage } from './user-message'

interface RenderMessageProps {
  message: Message
  messageId: string
  getIsOpen: (id: string) => boolean
  onOpenChange: (id: string, open: boolean) => void
  onQuerySelect: (query: string) => void
  chatId?: string
  addToolResult?: (params: { toolCallId: string; result: any }) => void
  onUpdateMessage?: (messageId: string, newContent: string) => Promise<void>
  reload?: (
    messageId: string,
    options?: ChatRequestOptions
  ) => Promise<string | null | undefined>
  /** When true, show RelatedQuestions under this assistant message */
  showRelatedQuestions?: boolean
  /** Only the latest assistant message should render placeholder/in-progress stages */
  renderPlaceholders?: boolean
  /** Optional ask_question result from previous assistant messages in the same section to merge into this timeline */
  mergeAskTool?: ToolInvocation
  /** Whether this message should include the ask_question stage in its timeline */
  includeAskInTimeline?: boolean
  /** If true, suppress standalone ask_question even if this message has no ultra annotations (section-level ultra present) */
  suppressAskPanels?: boolean
}

export function RenderMessage({
  message,
  messageId,
  getIsOpen,
  onOpenChange,
  onQuerySelect,
  chatId,
  addToolResult,
  onUpdateMessage,
  reload,
  showRelatedQuestions = false,
  renderPlaceholders = true,
  mergeAskTool,
  includeAskInTimeline = true,
  suppressAskPanels = false
}: RenderMessageProps) {
  const relatedQuestions = useMemo(
    () =>
      message.annotations?.filter(
        annotation => (annotation as any)?.type === 'related-questions'
      ),
    [message.annotations]
  )

  // Render for manual tool call
  const toolData = useMemo(() => {
    const toolAnnotations =
      (message.annotations?.filter(
        annotation =>
          (annotation as unknown as { type: string }).type === 'tool_call'
      ) as unknown as Array<{
        data: {
          args: string
          toolCallId: string
          toolName: string
          result?: string
          state: 'call' | 'result'
        }
      }>) || []

    const toolDataMap = toolAnnotations.reduce((acc, annotation) => {
      const existing = acc.get(annotation.data.toolCallId)
      if (!existing || annotation.data.state === 'result') {
        acc.set(annotation.data.toolCallId, {
          ...annotation.data,
          args: annotation.data.args ? JSON.parse(annotation.data.args) : {},
          result:
            annotation.data.result && annotation.data.result !== 'undefined'
              ? JSON.parse(annotation.data.result)
              : undefined
        } as ToolInvocation)
      }
      return acc
    }, new Map<string, ToolInvocation>())

    return Array.from(toolDataMap.values())
  }, [message.annotations])

  // Extract the unified reasoning annotation directly.
  const reasoningAnnotation = useMemo(() => {
    const annotations = message.annotations as any[] | undefined
    if (!annotations) return null
    return (
      annotations.find(a => a.type === 'reasoning' && a.data !== undefined) ||
      null
    )
  }, [message.annotations])
  // Extract Ultra stage annotations (planner, research, writer, critic)
  const ultraStages = useMemo(() => {
    const annotations = (message.annotations as any[] | undefined) || []
    return annotations
      .filter(a => a?.type === 'ultra-stage' && a?.data)
      .map(
        a =>
          a.data as {
            stage: 'planner' | 'research' | 'writer' | 'critic'
            text: string
            title?: string
            resultTitle?: string
          }
      )
  }, [message.annotations])

  const ultraStageHeaders = useMemo(() => {
    const annotations = (message.annotations as any[] | undefined) || []
    return annotations
      .filter(a => a?.type === 'ultra-stage-header' && a?.data)
      .map(
        a =>
          a.data as {
            stage: 'planner' | 'research' | 'writer' | 'critic'
            title?: string
            text?: string
          }
      )
  }, [message.annotations])

  const isUltraMessage = useMemo(() => {
    return (
      ((message.annotations as any[] | undefined) || []).some(a => a?.type === 'ultra-stage') ||
      ((message.annotations as any[] | undefined) || []).some(a => a?.type === 'ultra-stage-header')
    )
  }, [message.annotations])

  const hasFinalTextPart = useMemo(
    () => message.parts?.some(p => p.type === 'text') ?? false,
    [message.parts]
  )

  // Detect if there is any pending tool-call (streaming/interactive state)
  const hasPendingCall = useMemo(() => {
    const anyAnnotationPending = toolData.some(t => t.state === 'call')
    const parts = (message.parts as any[] | undefined) || []
    const anyPartsPending = parts.some(
      p => p?.type === 'tool-invocation' && p?.toolInvocation?.state === 'call'
    )
    return anyAnnotationPending || anyPartsPending
  }, [toolData, message.parts])

  // Fallback: capture ask_question tool invocation from parts when annotations are missing
  const askQuestionFromParts = useMemo(() => {
    const parts = (message.parts as any[] | undefined) || []
    const candidates = parts
      .filter(p => p?.type === 'tool-invocation' && p?.toolInvocation?.toolName === 'ask_question')
      .map(p => p.toolInvocation as ToolInvocation)
    if (candidates.length === 0) return null
    return candidates.find(c => c.state === 'result') || candidates[candidates.length - 1]
  }, [message.parts])

  const latestStage = useMemo(
    () => (ultraStages.length > 0 ? ultraStages[ultraStages.length - 1].stage : null),
    [ultraStages]
  )

  

  // Auto-manage open state: show current stage open, previous closed; when final text exists, close all.
  useEffect(() => {
    if (ultraStages.length === 0) return
    const resultIds = ['planner', 'writer', 'critic'].map(s => `${messageId}-ultra-${s}`)
    const headerIds = ['planner', 'writer', 'critic'].map(s => `${messageId}-ultra-h-${s}`)
    if (hasFinalTextPart) {
      ;[...resultIds, ...headerIds].forEach(id => {
        if (getIsOpen(id)) onOpenChange(id, false)
      })
      return
    }
    const current = latestStage
    ;[...resultIds, ...headerIds].forEach(id => {
      const isCurrent = id.endsWith(`${current}`)
      if (getIsOpen(id) !== isCurrent) onOpenChange(id, isCurrent)
    })
  }, [ultraStages, latestStage, hasFinalTextPart])

  // Compact Research renderer for timeline; opens full Search UI in the artifact sidebar on click
  function CompactResearch({
    tool,
    results,
    images,
    query,
    moreCount
  }: {
    tool: ToolInvocation
    results: any[]
    images?: any[]
    query?: string
    moreCount: number
  }) {
    const { open } = useArtifact()
    const openFull = () => open({ type: 'tool-invocation', toolInvocation: tool })
    return (
      <div className="space-y-2">
        <button type="button" onClick={openFull} className="text-xs font-medium text-foreground/80 hover:underline">
          Sources
        </button>
        {Array.isArray(images) && images.length > 0 && (
          <div className="scale-[0.95] origin-top-left">
            <SearchResultsImageSection images={images as any} query={query} />
          </div>
        )}
        <div className="scale-[0.95] origin-top-left">
          <SearchResults results={results as any} displayMode="list" />
        </div>
        {moreCount > 0 && (
          <button type="button" onClick={openFull} className="text-[11px] text-muted-foreground hover:underline">
            +{moreCount} more
          </button>
        )}
      </div>
    )
  }
  // Build timeline items from headers + results
  const timelineItems: UltraTimelineItem[] = useMemo(() => {
    const stageTitleMap: Record<'planner' | 'research' | 'writer' | 'critic', string> = {
      planner: 'Planning',
      research: 'Research',
      writer: 'Drafting',
      critic: 'Critiquing'
    }
    const map: Record<'ask' | 'planner' | 'research' | 'writer' | 'critic', UltraTimelineItem> = {
      ask: {
        stage: 'ask',
        headerTitle: '',
        headerText: '',
        status: 'pending'
      },
      planner: {
        stage: 'planner',
        headerTitle: '',
        headerText: '',
        status: 'pending'
      },
      research: {
        stage: 'research',
        headerTitle: '',
        headerText: '',
        status: 'pending'
      },
      writer: {
        stage: 'writer',
        headerTitle: '',
        headerText: '',
        status: 'pending'
      },
      critic: {
        stage: 'critic',
        headerTitle: '',
        headerText: '',
        status: 'pending'
      }
    }

    ultraStageHeaders.forEach(h => {
      const k = h.stage
      if (!map[k]) return
      // Normalize header title to concise stage labels
      map[k].headerTitle = stageTitleMap[k]
      map[k].headerText = h.text || map[k].headerText
    })

    ultraStages.forEach(s => {
      const k = s.stage
      if (!map[k]) return
      // Ensure concise header title when a stage result arrives
      if (!map[k].headerTitle) map[k].headerTitle = stageTitleMap[k]
      map[k].resultTitle = s.resultTitle
      map[k].resultText = s.text
      map[k].status = 'done'
    })

    // Avoid duplicate "Sources" heading for Research: timeline will render our compact header/button
    if (map.research) {
      map.research.resultTitle = undefined
    }

    // Compact Research stage only when Search tools are used (search/retrieve/videoSearch)
    const researchTools = toolData.filter(t => ['search', 'retrieve', 'videoSearch'].includes(t.toolName))
    const collected: Array<{ title: string; url: string }> = []
    researchTools.forEach(t => {
      const res: any = (t.state === 'result' ? t.result : undefined)
      const items: any[] | undefined = res?.results
      if (Array.isArray(items)) {
        items.forEach(item => {
          const url = String(item?.url || '')
          const title = String(item?.title || item?.content || url)
          if (url) collected.push({ title, url })
        })
      }
    })
    // If any research tool is in call, show Research header as in_progress
    const anyResearchInProgress = researchTools.some(t => t.state === 'call')
    if (anyResearchInProgress && !map.research.headerTitle) {
      map.research.headerTitle = stageTitleMap.research
      map.research.headerText = 'Execute planned searches and collect sources'
      map.research.status = 'in_progress'
    }
    if (researchTools.length > 0) {
      // Prefer the last search tool result for full fidelity UI (images + sources)
      const last = researchTools[researchTools.length - 1]
      const res: any = last.state === 'result' ? last.result : undefined
      const results: any[] | undefined = res?.results
      const images: any[] | undefined = res?.images
      if (Array.isArray(results) && results.length > 0) {
        const maxItems = 3
        const subset = results.slice(0, maxItems)
        const moreCount = Math.max(0, results.length - subset.length)
        map.research.render = (
          <CompactResearch
            tool={last}
            results={subset as any}
            images={images as any}
            query={(last.args as any)?.query}
            moreCount={moreCount}
          />
        )
        map.research.status = 'done'
      }
    }

    // If Research is active but not yet done, suppress Writer header/status until Research completes
    const researchActive = anyResearchInProgress || Boolean(map.research.headerTitle)
    if (researchActive && map.research.status !== 'done') {
      // Ensure research dot is active (in_progress) while waiting
      map.research.status = 'in_progress'
      map.writer.headerTitle = ''
      map.writer.headerText = ''
      if (map.writer.status !== 'done') {
        map.writer.status = 'pending'
      }
    }

    // Map ask_question tool into the timeline (from annotations, parts, or merged)
    if (includeAskInTimeline) {
      const ask = (toolData.find(t => t.toolName === 'ask_question') || askQuestionFromParts || mergeAskTool) as ToolInvocation | undefined | null
      if (ask) {
        map.ask.headerTitle = 'Clarifying question'
        map.ask.headerText = 'Confirm or refine the question to proceed'
        if (ask.state === 'call') {
          map.ask.status = 'in_progress'
          map.ask.render = (
            <QuestionConfirmation
              toolInvocation={ask}
              variant="timeline"
              onConfirm={(toolCallId, approved, response) => {
                if (!addToolResult) return
                addToolResult({
                  toolCallId,
                  result: approved
                    ? response
                    : {
                        declined: true,
                        skipped: response?.skipped,
                        message: 'User declined this question'
                      }
                })
              }}
            />
          )
        } else if (ask.state === 'result') {
          map.ask.status = 'done'
          map.ask.render = (
            <QuestionConfirmation
              toolInvocation={ask}
              isCompleted={true}
              variant="timeline"
              onConfirm={() => {}}
            />
          )
        }
      }
    }

    // Mark current stage as in_progress while the final text hasn't arrived yet
    if (renderPlaceholders && !hasFinalTextPart) {
      ;(['planner', 'research', 'writer', 'critic'] as const).forEach(k => {
        const hasResult = Boolean(map[k].resultText || map[k].render)
        if (map[k].headerTitle && !hasResult) {
          map[k].status = 'in_progress'
        }
      })
    }

    // Ensure progressive visibility: when a stage completes, immediately show the next stage title
    // and mark it as in_progress (active dot) while waiting for its result.
    const showNextIfMissing = (
      completed: 'ask' | 'planner' | 'research' | 'writer',
      next: 'planner' | 'research' | 'writer' | 'critic'
    ) => {
      const isCompleted = map[completed].status === 'done'
      const nextHasResult = Boolean(map[next].resultText)
      const nextHasHeader = Boolean(map[next].headerTitle)
      if (isCompleted && !nextHasResult && !nextHasHeader) {
        map[next].headerTitle = stageTitleMap[next]
        map[next].status = 'in_progress'
      }
    }

    if (renderPlaceholders && !hasFinalTextPart) {
      showNextIfMissing('ask', 'planner')
      const hasResearchActivity = anyResearchInProgress || collected.length > 0
      if (hasResearchActivity) {
        showNextIfMissing('planner', 'research')
        showNextIfMissing('research', 'writer')
      } else {
        // If no research activity, go directly from planner to writer
        showNextIfMissing('planner', 'writer')
      }
      showNextIfMissing('writer', 'critic')
    }

    const ordered = (['ask', 'planner', 'research', 'writer', 'critic'] as const).map(k => map[k])
    let items = hasFinalTextPart || !renderPlaceholders
      ? ordered.filter(it => Boolean(it.resultText || it.render))
      : ordered.filter(it => Boolean(it.headerTitle || it.resultText || it.render))

    // While Research is active but not done, completely hide Writer from the list
    if (researchActive && map.research.status !== 'done') {
      items = items.filter(it => it.stage !== 'writer')
    }

    return items
  }, [ultraStageHeaders, ultraStages, toolData, askQuestionFromParts, addToolResult, hasFinalTextPart, renderPlaceholders])

  


  // Extract the reasoning time and reasoning content from the annotation.
  // If annotation.data is an object, use its fields. Otherwise, default to a time of 0.
  const reasoningTime = useMemo(() => {
    if (!reasoningAnnotation) return 0
    if (
      typeof reasoningAnnotation.data === 'object' &&
      reasoningAnnotation.data !== null
    ) {
      return reasoningAnnotation.data.time ?? 0
    }
    return 0
  }, [reasoningAnnotation])

  if (message.role === 'user') {
    return (
      <UserMessage
        message={message.content}
        messageId={messageId}
        onUpdateMessage={onUpdateMessage}
      />
    )
  }

  // Ultra mode detection
  const isUltra = useMemo(() => {
    const annotations = (message.annotations as any[] | undefined) || []
    return annotations.some(a => a?.type === 'ultra-stage' || a?.type === 'ultra-stage-header')
  }, [message.annotations])

  // Detect if parts already include tool invocations (to avoid duplicate rendering with annotations)
  const hasPartsTools = useMemo(() => {
    const parts = (message.parts as any[] | undefined) || []
    return parts.some(p => p?.type === 'tool-invocation' && p?.toolInvocation?.toolName && p?.toolInvocation?.toolName !== 'ask_question')
  }, [message.parts])

  // New way: Use parts instead of toolInvocations
  return (
    <>
      {/* Tool panels from annotations (fallback) - only when NOT Ultra and parts don't already include tools */}
      {!isUltra && !hasPartsTools && toolData.length > 0 && (
        toolData.map(tool => (
          <ToolSection
            key={`ann-${tool.toolCallId}`}
            tool={tool}
            isOpen={getIsOpen(tool.toolCallId)}
            onOpenChange={open => onOpenChange(tool.toolCallId, open)}
            addToolResult={addToolResult}
          />
        ))
      )}

      {/* Tool panels are rendered via message.parts below. */}
      {/* Timeline view only for Ultra mode */}
      {isUltra && timelineItems.length > 0 && (
        hasFinalTextPart ? (
          <Collapsible defaultOpen={false}>
            <CollapsibleTrigger asChild>
              <button
                className={cn(
                  'group inline-flex items-center gap-2 rounded-full border px-2.5 py-1.5',
                  'bg-card hover:bg-accent/40 transition-colors shadow-sm hover:shadow',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/40'
                )}
                aria-label="Toggle steps"
              >
                <GitMerge className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Steps</span>
                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="px-1 pt-2">
              <UltraTimeline items={timelineItems} />
            </CollapsibleContent>
          </Collapsible>
        ) : (
          <UltraTimeline items={timelineItems} />
        )
      )}

      {/* After Critiquing: show final preparation indicator until the final text arrives */}
      {isUltra && ultraStages.some(s => s.stage === 'critic') && !hasFinalTextPart && (
        <div className="mt-2 px-3 py-2 rounded-md border bg-card">
          <div className="text-xs text-muted-foreground animate-pulse">Preparing final answer…</div>
        </div>
      )}

      {/* Removed old box-style stage rendering; timeline replaces it. */}
      {message.parts?.map((part, index) => {
        // Check if this is the last part in the array
        const isLastPart = index === (message.parts?.length ?? 0) - 1

        switch (part.type) {
          case 'tool-invocation':
            // In Ultra mode, always suppress standalone ask_question UI since it's shown in the timeline
            if ((isUltra || suppressAskPanels) && part.toolInvocation.toolName === 'ask_question') {
              return null
            }
            // In Ultra mode, hide heavy tool panels since we show compact Research in timeline
            if (
              isUltra &&
              (part.toolInvocation.toolName === 'search' || part.toolInvocation.toolName === 'retrieve' || part.toolInvocation.toolName === 'videoSearch')
            ) {
              return null
            }
            return (
              <ToolSection
                key={`${messageId}-tool-${index}`}
                tool={part.toolInvocation}
                isOpen={getIsOpen(part.toolInvocation.toolCallId)}
                onOpenChange={open =>
                  onOpenChange(part.toolInvocation.toolCallId, open)
                }
                addToolResult={addToolResult}
              />
            )
          case 'text':
            // Only show actions if this is the last part and it's a text part
            return (
              <AnswerSection
                key={`${messageId}-text-${index}`}
                content={part.text}
                isOpen={getIsOpen(messageId)}
                onOpenChange={open => onOpenChange(messageId, open)}
                chatId={chatId}
                showActions={isLastPart}
                messageId={messageId}
                reload={reload}
              />
            )
          case 'reasoning':
            return (
              <ReasoningSection
                key={`${messageId}-reasoning-${index}`}
                content={{
                  reasoning: part.reasoning,
                  time: reasoningTime
                }}
                isOpen={getIsOpen(messageId)}
                onOpenChange={open => onOpenChange(messageId, open)}
              />
            )
          // Add other part types as needed
          default:
            return null
        }
      })}
      {showRelatedQuestions && (
        <RelatedQuestions
          annotations={(relatedQuestions as JSONValue[]) || []}
          onQuerySelect={onQuerySelect}
          isOpen={getIsOpen(`${messageId}-related`)}
          onOpenChange={open => onOpenChange(`${messageId}-related`, open)}
        />
      )}
    </>
  )
}
