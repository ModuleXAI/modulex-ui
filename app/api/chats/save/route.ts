import { saveChat } from '@/lib/actions/chat'
import { getCurrentUserId } from '@/lib/auth/get-current-user'
import { NextResponse } from 'next/server'

export const runtime = 'edge'

export async function POST(req: Request) {
  try {
    // Respect feature flag
    if (process.env.ENABLE_SAVE_CHAT_HISTORY !== 'true') {
      return NextResponse.json({ ok: true, skipped: true })
    }

    const { id, messages, title, userId: userIdFromUpstream } = (await req.json().catch(() => ({}))) as {
      id?: string
      messages?: unknown[]
      title?: string
      userId?: string
    }

    if (!id || !Array.isArray(messages)) {
      return NextResponse.json({ ok: false, error: 'Invalid payload' }, { status: 400 })
    }

    // Prefer upstream-provided userId (trusted: called from our own API),
    // otherwise fall back to resolving from session
    const userId = userIdFromUpstream || (await getCurrentUserId())
    const derivedTitle =
      title ||
      ((): string => {
        try {
          const firstUser = (messages as any[]).find(m => m?.role === 'user')
          const content = firstUser?.content
          if (typeof content === 'string') return content.slice(0, 120)
          if (Array.isArray(content)) {
            const text = content
              .filter((p: any) => p?.type === 'text' && typeof p.text === 'string')
              .map((p: any) => p.text)
              .join(' ')
              .trim()
            if (text) return text.slice(0, 120)
          }
        } catch {}
        return 'New chat'
      })()

    await saveChat(
      {
        id,
        userId,
        path: `/search/${id}`,
        title: derivedTitle,
        createdAt: new Date(),
        messages: messages as any
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


