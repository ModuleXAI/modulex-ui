import { getChat, saveChat } from '@/lib/actions/chat'
import { generateRelatedQuestions } from '@/lib/agents/generate-related-questions'
import { ExtendedCoreMessage } from '@/lib/types'
import { convertToExtendedCoreMessages } from '@/lib/utils'
import { CoreMessage, DataStreamWriter, JSONValue, Message } from 'ai'

interface HandleStreamFinishParams {
  responseMessages: CoreMessage[]
  originalMessages: Message[]
  model: string
  chatId: string
  dataStream: DataStreamWriter
  userId: string
  skipRelatedQuestions?: boolean
  annotations?: ExtendedCoreMessage[]
}

export async function handleStreamFinish({
  responseMessages,
  originalMessages,
  model,
  chatId,
  dataStream,
  userId,
  skipRelatedQuestions = false,
  annotations = []
}: HandleStreamFinishParams) {
  try {
    const extendedCoreMessages = convertToExtendedCoreMessages(originalMessages)
    let allAnnotations = [...annotations]

    if (!skipRelatedQuestions) {
      // Notify related questions loading
      const relatedQuestionsAnnotation: JSONValue = {
        type: 'related-questions',
        data: { items: [] }
      }
      dataStream.writeMessageAnnotation(relatedQuestionsAnnotation)

      // Generate related questions
      const relatedQuestions = await generateRelatedQuestions(
        responseMessages,
        model
      )

      // Prepare related questions annotation JSON
      const relatedAnnotationJson: JSONValue = {
        type: 'related-questions',
        data: relatedQuestions.object
      }

      // Emit to stream for immediate UI feedback
      dataStream.writeMessageAnnotation(relatedAnnotationJson)

      // Instead of pushing a separate data message, we'll embed it on the last assistant message later
      allAnnotations.push({
        role: 'data',
        content: relatedAnnotationJson
      } as ExtendedCoreMessage)
    }

    // Create the messages to save, embedding annotations into the last assistant message
    const baseMessages = [
      ...extendedCoreMessages,
      ...responseMessages
    ] as ExtendedCoreMessage[]

    // Attach accumulated annotations to the last assistant message
    let lastAssistantIndex = -1
    for (let i = baseMessages.length - 1; i >= 0; i--) {
      if ((baseMessages[i] as any)?.role === 'assistant') {
        lastAssistantIndex = i
        break
      }
    }

    if (lastAssistantIndex >= 0) {
      const lastAssistant = baseMessages[lastAssistantIndex] as any
      const prev = Array.isArray(lastAssistant.annotations)
        ? ([...lastAssistant.annotations] as JSONValue[])
        : []

      // Extract JSON annotations from data messages we produced locally
      const jsonAnnotations: JSONValue[] = allAnnotations
        .filter(a => a.role === 'data' && a.content)
        .map(a => a.content as JSONValue)

      const combined = [...prev, ...jsonAnnotations]
      const deduped = Array.from(
        new Map(combined.map(a => [JSON.stringify(a), a])).values()
      )
      baseMessages[lastAssistantIndex] = {
        ...lastAssistant,
        annotations: deduped
      }
    }

    const generatedMessages = baseMessages

    if (process.env.ENABLE_SAVE_CHAT_HISTORY !== 'true') {
      return
    }

    // Get the chat from the database if it exists, otherwise create a new one
    const savedChat = (await getChat(chatId, userId)) ?? {
      messages: [],
      createdAt: new Date(),
      userId: userId,
      path: `/search/${chatId}`,
      title: originalMessages[0].content,
      id: chatId
    }

    // Save chat with complete response and related questions
    await saveChat(
      {
        ...savedChat,
        messages: generatedMessages
      },
      userId
    ).catch(error => {
      console.error('Failed to save chat:', error)
      throw new Error('Failed to save chat history')
    })
  } catch (error) {
    console.error('Error in handleStreamFinish:', error)
    throw error
  }
}
