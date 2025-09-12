'use client'

import { cn } from '@/lib/utils'
import { getCookie } from '@/lib/utils/cookies'
import { ChatRequestOptions, JSONValue, Message, ToolInvocation } from 'ai'
import { useEffect, useMemo, useRef, useState } from 'react'
import { RenderMessage } from './render-message'
import { ToolSection } from './tool-section'
import { Spinner } from './ui/spinner'

// Import section structure interface
interface ChatSection {
  id: string
  userMessage: Message
  assistantMessages: Message[]
}

interface ChatMessagesProps {
  sections: ChatSection[] // Changed from messages to sections
  data: JSONValue[] | undefined
  onQuerySelect: (query: string) => void
  isLoading: boolean
  chatId?: string
  addToolResult?: (params: { toolCallId: string; result: any }) => void
  /** Ref for the scroll container */
  scrollContainerRef: React.RefObject<HTMLDivElement>
  /** Ref for the scroll content wrapper (to observe height changes) */
  scrollContentRef?: React.RefObject<HTMLDivElement>
  onUpdateMessage?: (messageId: string, newContent: string) => Promise<void>
  reload?: (
    messageId: string,
    options?: ChatRequestOptions
  ) => Promise<string | null | undefined>
  /** Dynamic padding to accommodate sticky editor height */
  bottomPadding?: number
}

export function ChatMessages({
  sections,
  data,
  onQuerySelect,
  isLoading,
  chatId,
  addToolResult,
  scrollContainerRef,
  scrollContentRef,
  onUpdateMessage,
  reload,
  bottomPadding
}: ChatMessagesProps) {
  const [openStates, setOpenStates] = useState<Record<string, boolean>>({})
  const manualToolCallId = 'manual-tool-call'
  const [isSearchMode, setIsSearchMode] = useState<boolean>(true)
  const [autoScrollEnabled, setAutoScrollEnabled] = useState<boolean>(true)
  const prevLastUserIndexRef = useRef<number | null>(null)

  useEffect(() => {
    // Open manual tool call when the last section is a user message
    if (sections.length > 0) {
      const lastSection = sections[sections.length - 1]
      if (lastSection.userMessage.role === 'user') {
        setOpenStates({ [manualToolCallId]: true })
      }
    }
  }, [sections])

  useEffect(() => {
    // Read search mode preference from cookie
    try {
      const savedMode = getCookie('search-mode')
      if (savedMode !== null) {
        setIsSearchMode(savedMode === 'true')
      }
    } catch {}
  }, [])

  // get last tool data for manual tool call
  const lastToolData = useMemo(() => {
    if (!data || !Array.isArray(data) || data.length === 0) return null

    const lastItem = data[data.length - 1] as {
      type: 'tool_call'
      data: {
        toolCallId: string
        state: 'call' | 'result'
        toolName: string
        args: string
      }
    }

    if (lastItem.type !== 'tool_call') return null

    const toolData = lastItem.data
    return {
      state: 'call' as const,
      toolCallId: toolData.toolCallId,
      toolName: toolData.toolName,
      args: toolData.args ? JSON.parse(toolData.args) : undefined
    }
  }, [data])

  // Compute the last assistant message id to only show related questions there
  const lastAssistantMessageId = useMemo(() => {
    const allAssistantMessages = sections.flatMap(section => section.assistantMessages)
    return allAssistantMessages.length > 0
      ? allAssistantMessages[allAssistantMessages.length - 1].id
      : undefined
  }, [sections])

  // Get all messages as a flattened array
  const allMessages = sections.flatMap(section => [
    section.userMessage,
    ...section.assistantMessages
  ])

  const lastUserIndex =
    sections.length === 0
      ? -1
      : allMessages.length - 1 - [...allMessages].reverse().findIndex(msg => msg.role === 'user')

  // Check if loading indicator should be shown
  const showLoading =
    isLoading &&
    sections.length > 0 &&
    sections[sections.length - 1].assistantMessages.length === 0

  const getIsOpen = (id: string) => {
    if (id.includes('call')) {
      return openStates[id] ?? true
    }
    const baseId = id.endsWith('-related') ? id.slice(0, -8) : id
    const index = allMessages.findIndex(msg => msg.id === baseId)
    return openStates[id] ?? (lastUserIndex === -1 ? false : index >= lastUserIndex)
  }

  const handleOpenChange = (id: string, open: boolean) => {
    setOpenStates(prev => ({
      ...prev,
      [id]: open
    }))
  }

  // Enable auto-scroll when a new user message starts a fresh assistant response
  useEffect(() => {
    if (prevLastUserIndexRef.current === null) {
      prevLastUserIndexRef.current = lastUserIndex
      return
    }
    if (lastUserIndex > (prevLastUserIndexRef.current ?? -1)) {
      setAutoScrollEnabled(true)
    }
    prevLastUserIndexRef.current = lastUserIndex
  }, [lastUserIndex])

  // Cancel auto-scroll when user scrolls up beyond a threshold
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return
    const onScroll = () => {
      const distanceFromBottom = container.scrollHeight - (container.scrollTop + container.clientHeight)
      if (distanceFromBottom > 120) {
        setAutoScrollEnabled(false)
      }
    }
    container.addEventListener('scroll', onScroll, { passive: true })
    return () => container.removeEventListener('scroll', onScroll)
  }, [scrollContainerRef])

  // Scroll to bottom while streaming if auto-scroll is enabled
  useEffect(() => {
    const container = scrollContainerRef.current
    const content = scrollContentRef?.current || container
    if (!container || !content) return

    const ro = new ResizeObserver(() => {
      if (!autoScrollEnabled) return
      container.scrollTo({ top: container.scrollHeight, behavior: 'auto' })
    })
    ro.observe(content)
    return () => ro.disconnect()
  }, [autoScrollEnabled, scrollContainerRef, scrollContentRef])

  // Fallback: also scroll on sections changes (in case ResizeObserver misses)
  useEffect(() => {
    if (!autoScrollEnabled) return
    const container = scrollContainerRef.current
    if (!container) return
    container.scrollTo({ top: container.scrollHeight, behavior: 'auto' })
  }, [autoScrollEnabled, sections, scrollContainerRef])

  // Pre-compute ask_question result per section for merging into the last assistant's timeline
  const sectionIdToAskTool = useMemo(() => {
    const map = new Map<string, ToolInvocation | null>()
    for (const section of sections) {
      let found: ToolInvocation | null = null
      for (const m of section.assistantMessages) {
        const annotations = (m.annotations as any[] | undefined) || []
        const toolAnns = annotations.filter(a => (a as any)?.type === 'tool_call') as any[]
        for (const ann of toolAnns) {
          const data = (ann as any)?.data
          if (data?.toolName === 'ask_question' && data?.state === 'result') {
            try {
              found = {
                toolCallId: data.toolCallId,
                toolName: data.toolName,
                state: 'result',
                args: data.args ? JSON.parse(data.args) : {},
                result: data.result && data.result !== 'undefined' ? JSON.parse(data.result) : undefined
              } as ToolInvocation
              break
            } catch {}
          }
        }
        if (found) break
        const parts = (m.parts as any[] | undefined) || []
        for (const p of parts) {
          if (p?.type === 'tool-invocation' && p?.toolInvocation?.toolName === 'ask_question' && p?.toolInvocation?.state === 'result') {
            found = p.toolInvocation as ToolInvocation
            break
          }
        }
        if (found) break
      }
      map.set(section.id, found)
    }
    return map
  }, [sections])

  return (
    <div
      id="scroll-container"
      ref={scrollContainerRef}
      role="list"
      aria-roledescription="chat messages"
      className={cn(
        'relative w-full',
        sections.length > 0 ? 'pt-14 flex-1 overflow-y-auto' : 'hidden'
      )}
      style={{ paddingBottom: sections.length > 0 ? bottomPadding ?? 0 : 0 }}
    >
      {sections.length > 0 && (
      <div className={cn('relative mx-auto w-full max-w-3xl px-4')} ref={scrollContentRef}>
        {sections.map((section, sectionIndex) => (
          <div
            key={section.id}
            id={`section-${section.id}`}
            className={cn('chat-section', sectionIndex === sections.length - 1 ? 'mb-2' : 'mb-8')}
          >
            {/* User message */}
            <div className="flex flex-col gap-4 mb-4">
              <RenderMessage
                message={section.userMessage}
                messageId={section.userMessage.id}
                getIsOpen={getIsOpen}
                onOpenChange={handleOpenChange}
                onQuerySelect={onQuerySelect}
                chatId={chatId}
                addToolResult={addToolResult}
                onUpdateMessage={onUpdateMessage}
                reload={reload}
              />
              {showLoading && <Spinner />}
            </div>

            {/* Assistant messages */}
            {section.assistantMessages.map(assistantMessage => {
              const isLastAssistant = assistantMessage.id === lastAssistantMessageId
              const shouldShowRelated = isLastAssistant

              return (
                <div key={assistantMessage.id} className="flex flex-col gap-4">
                  <RenderMessage
                    message={assistantMessage}
                    messageId={assistantMessage.id}
                    getIsOpen={getIsOpen}
                    onOpenChange={handleOpenChange}
                    onQuerySelect={onQuerySelect}
                    chatId={chatId}
                    addToolResult={addToolResult}
                    onUpdateMessage={onUpdateMessage}
                    reload={reload}
                    showRelatedQuestions={shouldShowRelated}
                    renderPlaceholders={isLastAssistant}
                    mergeAskTool={isLastAssistant ? sectionIdToAskTool.get(section.id) || undefined : undefined}
                    includeAskInTimeline={isLastAssistant}
                  />
                </div>
              )
            })}
          </div>
        ))}

        {isSearchMode && showLoading && lastToolData && (
          <ToolSection
            key={manualToolCallId}
            tool={lastToolData}
            isOpen={getIsOpen(manualToolCallId)}
            onOpenChange={open => handleOpenChange(manualToolCallId, open)}
            addToolResult={addToolResult}
          />
        )}
      </div>
      )}
    </div>
  )
}
