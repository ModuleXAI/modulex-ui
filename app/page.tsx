import { Chat } from '@/components/chat'
import { getModels } from '@/lib/config/models'
import { generateId } from 'ai'
import { cookies } from 'next/headers'

export default async function Page() {
  const id = generateId()
  const models = await getModels()
  // Ensure selected org cookie exists early so downstream proxy gets organization_id
  const cookieStore = await cookies()
  cookieStore.get('selected_organization_id')?.value // touch so it’s read for edge runtime
  return <Chat id={id} models={models} />
}
