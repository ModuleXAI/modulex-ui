'use client'

import { CHAT_ID } from '@/lib/constants'
import { Model } from '@/lib/types/models'
import { cn } from '@/lib/utils'
import { useChat } from '@ai-sdk/react'
import { ChatRequestOptions } from 'ai'
import { Message } from 'ai/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { ChatMessages } from './chat-messages'
import { ChatPanel } from './chat-panel'

// Define section structure
interface ChatSection {
  id: string // User message ID
  userMessage: Message
  assistantMessages: Message[]
}

export function Chat({
  id,
  savedMessages = [],
  query,
  models
}: {
  id: string
  savedMessages?: Message[]
  query?: string
  models?: Model[]
}) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const scrollContentRef = useRef<HTMLDivElement>(null)
  const [isAtBottom, setIsAtBottom] = useState(true)
  const [autoScrollActive, setAutoScrollActive] = useState(false)
  const prevStatusRef = useRef<string | null>(null)
  const isProgrammaticScrollRef = useRef(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const [panelHeight, setPanelHeight] = useState<number>(0)

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    status,
    setMessages,
    stop,
    append,
    data,
    setData,
    addToolResult,
    reload
  } = useChat({
    initialMessages: savedMessages,
    id: CHAT_ID,
    body: {
      id
    },
    onFinish: async (finalMessage) => {
      try {
        // Persist full conversation (including assistant) after stream completes
        if (process.env.NEXT_PUBLIC_ENABLE_SAVE_CHAT_HISTORY === 'true') {
          // Defer to ensure hook state is fully updated, then read latest messages
          const latestMessagesRef = { current: messages }
          // keep ref in sync until next tick
          // eslint-disable-next-line react-hooks/exhaustive-deps
          ;(latestMessagesRef.current = messages)
          setTimeout(() => {
            try {
              const base = latestMessagesRef.current || []
              const hasFinal = base.some(m => m.id === finalMessage?.id)
              const full = hasFinal ? base : [...base, finalMessage]
              fetch('/api/chats/save', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ id, messages: full })
              }).catch(() => {})
            } catch {}
          }, 0)
        }
      } finally {
        window.history.replaceState({}, '', `/search/${id}`)
        window.dispatchEvent(new CustomEvent('chat-history-updated'))
      }
    },
    onError: error => {
      toast.error(`Error in chat: ${error.message}`)
    },
    sendExtraMessageFields: false, // Disable extra message fields,
    experimental_throttle: 100
  })

  const isLoading = status === 'submitted' || status === 'streaming'

  // Convert messages array to sections array
  const sections = useMemo<ChatSection[]>(() => {
    const result: ChatSection[] = []
    let currentSection: ChatSection | null = null

    for (const message of messages) {
      if (message.role === 'user') {
        // Start a new section when a user message is found
        if (currentSection) {
          result.push(currentSection)
        }
        currentSection = {
          id: message.id,
          userMessage: message,
          assistantMessages: []
        }
      } else if (currentSection && message.role === 'assistant') {
        // Add assistant message to the current section
        currentSection.assistantMessages.push(message)
      }
      // Ignore other role types like 'system' for now
    }

    // Add the last section if exists
    if (currentSection) {
      result.push(currentSection)
    }

    return result
  }, [messages])

  // Detect if scroll container is at the bottom
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const handleScroll = () => {
      // Ignore programmatic scrolls
      if (isProgrammaticScrollRef.current) {
        isProgrammaticScrollRef.current = false
        return
      }
      const { scrollTop, scrollHeight, clientHeight } = container
      const threshold = 50 // threshold in pixels
      if (scrollHeight - scrollTop - clientHeight < threshold) {
        setIsAtBottom(true)
      } else {
        setIsAtBottom(false)
        // If user scrolls away while auto-scroll is active, stop auto-scroll for this stream
        setAutoScrollActive(prev => (prev ? false : prev))
      }
    }

    container.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll() // Set initial state

    return () => container.removeEventListener('scroll', handleScroll)
  }, [])

  // On initial mount, jump to bottom so chat opens at the latest messages
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return
    requestAnimationFrame(() => {
      isProgrammaticScrollRef.current = true
      container.scrollTop = container.scrollHeight
    })
  }, [])

  // Manage auto-scroll lifecycle based on streaming status transitions
  useEffect(() => {
    const prev = prevStatusRef.current
    const current = status
    // When a new stream starts, enable auto-scroll only if user is at bottom
    if ((current === 'submitted' || current === 'streaming') && prev !== 'submitted' && prev !== 'streaming') {
      setAutoScrollActive(true)
    }
    // When stream ends, disable auto-scroll
    if ((prev === 'submitted' || prev === 'streaming') && current !== 'submitted' && current !== 'streaming') {
      setAutoScrollActive(false)
    }
    prevStatusRef.current = current
  }, [status, isAtBottom])

  // While auto-scroll is active, keep the view pinned to bottom as content grows
  useEffect(() => {
    if (!autoScrollActive) return
    const container = scrollContainerRef.current
    if (!container) return
    // Use rAF to wait for layout
    const id = requestAnimationFrame(() => {
      isProgrammaticScrollRef.current = true
      container.scrollTop = container.scrollHeight
    })
    return () => cancelAnimationFrame(id)
  }, [autoScrollActive, messages, data, sections])

  // Additionally, observe content height changes to follow streams even if message arrays don't re-create
  useEffect(() => {
    const container = scrollContainerRef.current
    const content = scrollContentRef.current
    if (!container || !content) return
    let previousHeight = content.offsetHeight
    const ro = new ResizeObserver(() => {
      const nextHeight = content.offsetHeight
      if (autoScrollActive && nextHeight > previousHeight) {
        isProgrammaticScrollRef.current = true
        container.scrollTop = container.scrollHeight
      }
      previousHeight = nextHeight
    })
    ro.observe(content)
    return () => ro.disconnect()
  }, [autoScrollActive])

  // When a new user message is sent, jump to the bottom regardless of current position
  useEffect(() => {
    if (sections.length > 0) {
      const lastMessage = messages[messages.length - 1]
      if (lastMessage && lastMessage.role === 'user') {
        const container = scrollContainerRef.current
        if (container) {
          requestAnimationFrame(() => {
            isProgrammaticScrollRef.current = true
            container.scrollTop = container.scrollHeight
            setAutoScrollActive(true)
          })
        }
      }
    }
  }, [sections, messages])

  // Track chat panel height to set dynamic bottom padding for the scroll area
  useEffect(() => {
    const node = panelRef.current
    if (!node || typeof window === 'undefined') return
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        const h = entry.contentRect.height
        setPanelHeight(Math.ceil(h))
      }
    })
    ro.observe(node)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    setMessages(savedMessages)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const onQuerySelect = (query: string) => {
    append({
      role: 'user',
      content: query
    })
  }

  const handleUpdateAndReloadMessage = async (
    messageId: string,
    newContent: string
  ) => {
    setMessages(currentMessages =>
      currentMessages.map(msg =>
        msg.id === messageId ? { ...msg, content: newContent } : msg
      )
    )

    try {
      const messageIndex = messages.findIndex(msg => msg.id === messageId)
      if (messageIndex === -1) return

      const messagesUpToEdited = messages.slice(0, messageIndex + 1)

      setMessages(messagesUpToEdited)

      setData(undefined)

      await reload({
        body: {
          chatId: id,
          regenerate: true
        }
      })
    } catch (error) {
      console.error('Failed to reload after message update:', error)
      toast.error(`Failed to reload conversation: ${(error as Error).message}`)
    }
  }

  const handleReloadFrom = async (
    messageId: string,
    options?: ChatRequestOptions
  ) => {
    const messageIndex = messages.findIndex(m => m.id === messageId)
    if (messageIndex !== -1) {
      const userMessageIndex = messages
        .slice(0, messageIndex)
        .findLastIndex(m => m.role === 'user')
      if (userMessageIndex !== -1) {
        const trimmedMessages = messages.slice(0, userMessageIndex + 1)
        setMessages(trimmedMessages)
        return await reload(options)
      }
    }
    return await reload(options)
  }

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setData(undefined)
    // Force jump to bottom and enable auto-follow immediately upon submit
    const container = scrollContainerRef.current
    if (container) {
      isProgrammaticScrollRef.current = true
      container.scrollTop = container.scrollHeight
    }
    setAutoScrollActive(true)
    // Append-only save of the user message so assistant can be appended later onFinish
    if (process.env.NEXT_PUBLIC_ENABLE_SAVE_CHAT_HISTORY === 'true') {
      const userMsg = { role: 'user', content: input }
      try {
        fetch('/api/chats/save', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ id, messages: [userMsg], mode: 'append' })
        }).catch(() => {})
      } catch {}
    }
    handleSubmit(e)
  }

  return (
    <div
      className={cn(
        'relative flex h-full min-w-0 flex-1 flex-col',
        messages.length === 0 ? 'items-center justify-center' : ''
      )}
      data-testid="full-chat"
    >
      <ChatMessages
        sections={sections}
        data={data}
        onQuerySelect={onQuerySelect}
        isLoading={isLoading}
        chatId={id}
        addToolResult={addToolResult}
        scrollContainerRef={scrollContainerRef}
        scrollContentRef={scrollContentRef}
        onUpdateMessage={handleUpdateAndReloadMessage}
        reload={handleReloadFrom}
        bottomPadding={panelHeight}
      />
      <div ref={panelRef} className="w-full">
        <ChatPanel
        input={input}
        handleInputChange={handleInputChange}
        handleSubmit={onSubmit}
        isLoading={isLoading}
        messages={messages}
        setMessages={setMessages}
        stop={stop}
        query={query}
        append={append}
        models={models}
        showScrollToBottomButton={!isAtBottom}
        scrollContainerRef={scrollContainerRef}
        />
      </div>
    </div>
  )
}
