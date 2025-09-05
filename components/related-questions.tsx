'use client'

import { CHAT_ID } from '@/lib/constants'
import { useChat } from '@ai-sdk/react'
import { JSONValue } from 'ai'
import { ArrowRight } from 'lucide-react'
import * as React from 'react'
import { CollapsibleMessage } from './collapsible-message'
import { Section } from './section'
import { Button } from './ui/button'
import { Skeleton } from './ui/skeleton'

export interface RelatedQuestionsProps {
  annotations?: JSONValue[]
  onQuerySelect: (query: string) => void
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

interface RelatedQuestionsAnnotation extends Record<string, JSONValue> {
  type: 'related-questions'
  data: {
    items: Array<{ query: string }>
  }
}

export const RelatedQuestions: React.FC<RelatedQuestionsProps> = ({
  annotations,
  onQuerySelect,
  isOpen,
  onOpenChange
}) => {
  const { status, messages } = useChat({
    id: CHAT_ID
  })
  const isLoading = status === 'submitted' || status === 'streaming'

  // If annotations are missing (e.g., proxy didn't emit the loading annotation),
  // we still want to render a loading skeleton while streaming.
  const safeAnnotations = Array.isArray(annotations) ? annotations : []

  const lastRelatedQuestionsAnnotation = safeAnnotations[
    safeAnnotations.length - 1
  ] as RelatedQuestionsAnnotation

  const relatedQuestions = lastRelatedQuestionsAnnotation?.data
  if ((!relatedQuestions || !relatedQuestions.items) && !isLoading) {
    // We might try client-side fallback via a separate related endpoint.
    // If no items and not streaming, we'll attempt once and render if available.
  }

  // Client-side fallback: fetch related questions from a dedicated proxy endpoint
  // when streaming is finished and no annotations arrived from server.
  const [externalItems] = React.useState<Array<{ query: string }> | null>(null)
  const [externalLoading] = React.useState(false)

  // Persist external related items to chat history by adding them as an annotation
  // to the last assistant message and calling /api/chats/save in merge mode.
  React.useEffect(() => {
    if (!externalItems || externalItems.length === 0) return
    try {
      // Derive chat id from URL: /search/:id
      const pathname = typeof window !== 'undefined' ? window.location.pathname : ''
      const match = pathname.match(/\/search\/([^/]+)/)
      const chatId = match?.[1]
      if (!chatId) return

      // Clone messages and inject annotation into the last assistant message
      const base = Array.isArray(messages) ? [...messages] : []
      let lastAssistantIndex = -1
      for (let i = base.length - 1; i >= 0; i--) {
        if ((base[i] as any)?.role === 'assistant') {
          lastAssistantIndex = i
          break
        }
      }
      if (lastAssistantIndex < 0) return

      const lastAssistant = base[lastAssistantIndex] as any
      const prevAnnotations: any[] = Array.isArray(lastAssistant.annotations)
        ? [...lastAssistant.annotations]
        : []
      const relatedAnnotation = {
        type: 'related-questions',
        data: { items: externalItems }
      }
      const updatedAssistant = {
        ...lastAssistant,
        annotations: [...prevAnnotations, relatedAnnotation]
      }
      const payloadMessages = [...base]
      payloadMessages[lastAssistantIndex] = updatedAssistant

      // Fire and forget; backend merges to avoid duplicates
      fetch('/api/chats/save', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: chatId, messages: payloadMessages, mode: 'merge' })
      }).catch(() => {})
    } catch {}
  }, [externalItems, messages])

  const itemsToRender = Array.isArray(relatedQuestions?.items) && relatedQuestions!.items.length > 0
    ? relatedQuestions!.items
    : externalItems || []

  if ((!relatedQuestions || relatedQuestions.items?.length === 0) && isLoading) {
    return (
      <CollapsibleMessage
        role="assistant"
        isCollapsible={false}
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        showIcon={false}
      >
        <Skeleton className="w-full h-6" />
      </CollapsibleMessage>
    )
  }

  return (
    <CollapsibleMessage
      role="assistant"
      isCollapsible={false}
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      showIcon={false}
      showBorder={false}
    >
      <Section title="Related" className="pt-0 pb-0">
        <div className="flex flex-col">
          {Array.isArray(itemsToRender) && itemsToRender.length > 0 ? (
            itemsToRender
              .filter(item => item?.query !== '')
              .map((item, index) => (
                <div className="flex items-start w-full" key={index}>
                  <ArrowRight className="h-4 w-4 mr-2 mt-1 flex-shrink-0 text-accent-foreground/50" />
                  <Button
                    variant="link"
                    className="flex-1 justify-start px-0 py-0.5 h-fit font-semibold text-accent-foreground/50 whitespace-normal text-left"
                    type="submit"
                    name={'related_query'}
                    value={item?.query}
                    onClick={() => onQuerySelect(item?.query)}
                  >
                    {item?.query}
                  </Button>
                </div>
              ))
          ) : externalLoading ? (
            <Skeleton className="w-full h-6" />
          ) : null}
        </div>
      </Section>
    </CollapsibleMessage>
  )
}
export default RelatedQuestions
