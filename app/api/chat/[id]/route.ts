import { deleteChat } from '@/lib/actions/chat'
import { getCurrentUserId } from '@/lib/auth/get-current-user'
import { NextResponse } from 'next/server'

export async function DELETE(
  request: Request,
  context: any
) {
  const enableSaveChatHistory = process.env.ENABLE_SAVE_CHAT_HISTORY === 'true'
  if (!enableSaveChatHistory) {
    return NextResponse.json(
      { error: 'Chat history saving is disabled.' },
      { status: 403 }
    )
  }

  const { params } = (context || {}) as { params: { id: string } }
  const chatId = params?.id
  if (!chatId) {
    return NextResponse.json({ error: 'Chat ID is required' }, { status: 400 })
  }

  const userId = await getCurrentUserId()

  try {
    const result = await deleteChat(chatId, userId)

    if (result.error) {
      const statusCode = result.error === 'Chat not found' ? 404 : 500
      return NextResponse.json({ error: result.error }, { status: statusCode })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error(`API route error deleting chat ${chatId}:`, error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}
