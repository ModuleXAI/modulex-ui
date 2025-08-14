import { getChat, saveChat } from '@/lib/actions/chat'
import { getCurrentUserId } from '@/lib/auth/get-current-user'
import { convertToExtendedCoreMessages } from '@/lib/utils'
import { NextResponse } from 'next/server'

export const runtime = 'edge'

export async function POST(req: Request) {
  try {
    // Respect feature flag
    if (process.env.ENABLE_SAVE_CHAT_HISTORY !== 'true') {
      return NextResponse.json({ ok: true, skipped: true })
    }

    const { id, messages, title, userId: userIdFromUpstream, mode } = (await req.json().catch(() => ({}))) as {
      id?: string
      messages?: unknown[]
      title?: string
      userId?: string
      mode?: 'append' | 'merge'
    }

    if (!id || !Array.isArray(messages)) {
      return NextResponse.json({ ok: false, error: 'Invalid payload' }, { status: 400 })
    }

    // Prefer upstream-provided userId (trusted: called from our own API),
    // otherwise fall back to resolving from session
    const userId = userIdFromUpstream || (await getCurrentUserId())
    const existing = await getChat(id, userId).catch(() => null)

    const derivedTitle =
      title ||
      existing?.title ||
      ((): string => {
        // derive from first user message across incoming or existing
        try {
          const userFromIncoming = ((messages as any[]) || []).find(m => m?.role === 'user')
          const userFromExisting = (existing?.messages as any[])?.find?.(m => m?.role === 'user')
          const firstUser = userFromIncoming || userFromExisting
          if (!firstUser) return 'New chat'
          const c = firstUser.content
          if (typeof c === 'string' && c.trim()) return c.slice(0, 120)
          const parts = (firstUser as any).parts
          if (Array.isArray(parts)) {
            const text = parts
              .filter((p: any) => p?.type === 'text' && typeof p.text === 'string')
              .map((p: any) => p.text)
              .join(' ')
              .trim()
            if (text) return text.slice(0, 120)
          }
        } catch {}
        return 'New chat'
      })()

    // Normalize ui/react messages to ensure content string exists
    const normalized = ((messages as any[]) || []).map(m => {
      if (!m) return m
      if (typeof m.content === 'string' && m.content.trim()) return m

      // Prefer parts[] -> text
      const parts = (m as any).parts
      if (Array.isArray(parts)) {
        const text = parts
          .filter((p: any) => p?.type === 'text' && typeof p.text === 'string')
          .map((p: any) => p.text)
          .join(' ')
          .trim()
        if (text) {
          return { ...m, content: text }
        }
      }

      // Also handle content[] -> text (when UI sends structured content)
      const contentArr = (m as any).content
      if (Array.isArray(contentArr)) {
        const text = contentArr
          .filter((p: any) => p?.type === 'text' && typeof p.text === 'string')
          .map((p: any) => p.text)
          .join(' ')
          .trim()
        if (text) {
          return { ...m, content: text }
        }
      }

      return m
    })

    const extended = convertToExtendedCoreMessages(normalized as any[])

    // Helper to canonicalize content to avoid duplicates caused by
    // differing shapes (string vs array-of-text-parts)
    const extractText = (val: any): string => {
      if (typeof val === 'string') return val.trim()
      if (Array.isArray(val)) {
        try {
          return val
            .filter((p: any) => p && typeof p === 'object' && p.type === 'text' && typeof p.text === 'string')
            .map((p: any) => p.text)
            .join(' ')
            .trim()
        } catch {
          return ''
        }
      }
      return ''
    }

    const canonicalKey = (m: any): string => {
      const role = m?.role || ''
      if (role === 'data') {
        return `${role}|${JSON.stringify(m?.content ?? null)}`
      }
      const textFromContent = extractText(m?.content)
      if (textFromContent) return `${role}|${textFromContent}`
      const textFromParts = extractText((m as any)?.parts)
      if (textFromParts) return `${role}|${textFromParts}`
      return `${role}|${JSON.stringify(m?.content ?? null)}`
    }

    // Merge/append with existing saved chat (if any) to avoid race conditions
    let finalMessages = extended
    if (existing && Array.isArray(existing.messages)) {
      const existingMsgs = existing.messages as any[]
      const existingKeys = new Set(existingMsgs.map(canonicalKey))
      const toAppend: any[] = []
      for (const m of extended) {
        const k = canonicalKey(m)
        if (!existingKeys.has(k)) {
          toAppend.push(m)
        }
      }

      // Partition new messages: 'data' annotations vs others
      const incomingData = toAppend.filter(m => m?.role === 'data')
      const incomingOthers = toAppend.filter(m => m?.role !== 'data')

      // Start with existing
      const merged = [...existingMsgs]

      // Insert incoming data messages before the last assistant message to preserve UI semantics
      if (incomingData.length > 0) {
        let lastAssistantIndex = -1
        for (let i = merged.length - 1; i >= 0; i--) {
          if ((merged[i] as any)?.role === 'assistant') {
            lastAssistantIndex = i
            break
          }
        }
        if (lastAssistantIndex >= 0) {
          merged.splice(lastAssistantIndex, 0, ...incomingData)
        } else {
          merged.push(...incomingData)
        }
      }

      // Append any non-data items (rare in our merge path)
      if (incomingOthers.length > 0) {
        merged.push(...incomingOthers)
      }

      finalMessages = merged
    }

    await saveChat(
      {
        id,
        userId,
        path: `/search/${id}`,
        title: derivedTitle,
        createdAt: existing?.createdAt ? new Date(existing.createdAt) : new Date(),
        messages: finalMessages as any
      } as any,
      userId
    )

    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}


