import { cn } from '@/lib/utils'
import { ChatRequestOptions, JSONValue, Message, ToolInvocation } from 'ai'
import { ChevronDown, GitMerge } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { AnswerSection } from './answer-section'
import { QuestionConfirmation } from './question-confirmation'
import { ReasoningSection } from './reasoning-section'
import RelatedQuestions from './related-questions'
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
  includeAskInTimeline = true
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
  // Extract Ultra stage annotations (planner, writer, critic)
  const ultraStages = useMemo(() => {
    const annotations = (message.annotations as any[] | undefined) || []
    return annotations
      .filter(a => a?.type === 'ultra-stage' && a?.data)
      .map(
        a =>
          a.data as {
            stage: 'planner' | 'writer' | 'critic'
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
            stage: 'planner' | 'writer' | 'critic'
            title?: string
            text?: string
          }
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
  // Build timeline items from headers + results
  const timelineItems: UltraTimelineItem[] = useMemo(() => {
    const stageTitleMap: Record<'planner' | 'writer' | 'critic', string> = {
      planner: 'Planning',
      writer: 'Drafting',
      critic: 'Critiquing'
    }
    const map: Record<'ask' | 'planner' | 'writer' | 'critic', UltraTimelineItem> = {
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
      ;(['planner', 'writer', 'critic'] as const).forEach(k => {
        const hasResult = Boolean(map[k].resultText || map[k].render)
        if (map[k].headerTitle && !hasResult) {
          map[k].status = 'in_progress'
        }
      })
    }

    // Ensure progressive visibility: when a stage completes, immediately show the next stage title
    // and mark it as in_progress (active dot) while waiting for its result.
    const showNextIfMissing = (
      completed: 'ask' | 'planner' | 'writer',
      next: 'planner' | 'writer' | 'critic'
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
      showNextIfMissing('planner', 'writer')
      showNextIfMissing('writer', 'critic')
    }

    const ordered = (['ask', 'planner', 'writer', 'critic'] as const).map(k => map[k])
    return hasFinalTextPart || !renderPlaceholders
      ? ordered.filter(it => Boolean(it.resultText || it.render))
      : ordered.filter(it => Boolean(it.headerTitle || it.resultText || it.render))
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

  // New way: Use parts instead of toolInvocations
  return (
    <>
      {/* Tool panels are rendered via message.parts below. */}
      {/* Timeline view for Ultra stages with fold when final text starts */}
      {timelineItems.length > 0 && (
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
      {ultraStages.some(s => s.stage === 'critic') && !hasFinalTextPart && (
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
            if (part.toolInvocation.toolName === 'ask_question') {
              // ask_question is shown inside the Ultra timeline's first stage
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
