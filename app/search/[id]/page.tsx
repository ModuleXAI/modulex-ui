import { Chat } from '@/components/chat'
import { getChat } from '@/lib/actions/chat'
import { getCurrentUserId } from '@/lib/auth/get-current-user'
import { getModels } from '@/lib/config/models'
import { convertToUIMessages } from '@/lib/utils'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'

export const maxDuration = 60

export async function generateMetadata(props: {
  params: Promise<{ id: string }>
}) {
  const { id } = await props.params
  const userId = await getCurrentUserId()
  const cookieStore = await cookies()
  const organizationId = cookieStore.get('selected_organization_id')?.value
  const chat = await getChat(id, userId, organizationId)
  return {
    title: chat?.title.toString().slice(0, 50) || 'Search'
  }
}

export default async function SearchPage(props: {
  params: Promise<{ id: string }>
}) {
  const userId = await getCurrentUserId()
  const cookieStore = await cookies()
  const organizationId = cookieStore.get('selected_organization_id')?.value
  const { id } = await props.params

  const chat = await getChat(id, userId, organizationId)
  // convertToUIMessages for useChat hook
  const messages = convertToUIMessages(chat?.messages || [])

  if (chat && chat.userId !== userId && chat.userId !== 'anonymous') {
    notFound()
  }

  const models = await getModels()
  return <Chat id={id} savedMessages={messages} models={models} />
}
