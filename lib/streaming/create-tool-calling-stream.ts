import { researcher } from '@/lib/agents/researcher'
import { buildUltraFinalConfig } from '@/lib/agents/ultra-orchestrator'
import {
  convertToCoreMessages,
  CoreMessage,
  createDataStreamResponse,
  DataStreamWriter,
  JSONValue,
  streamText
} from 'ai'
import { getMaxAllowedTokens, truncateMessages } from '../utils/context-window'
import { isReasoningModel } from '../utils/registry'
import { handleStreamFinish } from './handle-stream-finish'
import { executeToolCall } from './tool-execution'
import { BaseStreamConfig } from './types'

// Function to check if a message contains ask_question tool invocation
function containsAskQuestionTool(message: CoreMessage) {
  // For CoreMessage format, we check the content array
  if (message.role !== 'assistant' || !Array.isArray(message.content)) {
    return false
  }

  // Check if any content item is a tool-call with ask_question tool
  return message.content.some(
    item => item.type === 'tool-call' && item.toolName === 'ask_question'
  )
}

export function createToolCallingStreamResponse(config: BaseStreamConfig) {
  return createDataStreamResponse({
    execute: async (dataStream: DataStreamWriter) => {
      const { messages, model, chatId, searchMode, userId, ultraMode } = config
      const modelId = `${model.providerId}:${model.id}`

      try {
        const coreMessages = convertToCoreMessages(messages)
        const truncatedMessages = truncateMessages(
          coreMessages,
          getMaxAllowedTokens(model)
        )

        // Determine if this is the very first turn (no assistant messages yet)
        const isFirstTurn = !truncatedMessages.some(m => m.role === 'assistant')

        // Pre-execute tool call (search) unless Ultra first-turn requires ask_question first
        const { toolCallDataAnnotation, toolCallMessages } = await executeToolCall(
          truncatedMessages,
          dataStream,
          modelId,
          searchMode && !(ultraMode && isFirstTurn)
        )

        const messagesForLLM = [...truncatedMessages, ...toolCallMessages]
        let extraAnnotations: any[] = []

        let researcherConfig = await researcher({
          messages: messagesForLLM,
          model: modelId,
          searchMode,
          userId,
          ultraMode
        })

        // If Ultra mode and NOT the first turn, run 4-stage orchestrator for higher quality final answer
        if (ultraMode && !isFirstTurn) {
          try {
            const finalConfig = await buildUltraFinalConfig({
              messages: messagesForLLM,
              modelId,
              dataStream
            })
            researcherConfig = finalConfig as any
            // Capture Ultra annotations for persistence
            if ((finalConfig as any).ultraAnnotations) {
              extraAnnotations = (finalConfig as any).ultraAnnotations
            }
          } catch (e) {
            console.error('Ultra orchestrator failed, falling back to researcher:', e)
          }
        }

        const result = streamText({
          ...researcherConfig,
          onFinish: async result => {
            // Check if the last message contains an ask_question tool invocation
            const shouldSkipRelatedQuestions =
              isReasoningModel(modelId) ||
              (result.response.messages.length > 0 &&
                containsAskQuestionTool(
                  result.response.messages[
                    result.response.messages.length - 1
                  ] as CoreMessage
                ))

            // Convert ultra annotations to ExtendedCoreMessage[] for saving
            const ultraExtended = (extraAnnotations || []).map(a => ({
              role: 'data' as const,
              content: a as unknown as JSONValue
            }))

            await handleStreamFinish({
              responseMessages: result.response.messages,
              originalMessages: messages,
              model: modelId,
              chatId,
              dataStream,
              userId,
              skipRelatedQuestions: shouldSkipRelatedQuestions,
              annotations: ultraExtended
            })

          }
        })

        result.mergeIntoDataStream(dataStream)
      } catch (error) {
        console.error('Stream execution error:', error)
        throw error
      }
    },
    onError: error => {
      // console.error('Stream error:', error)
      return error instanceof Error ? error.message : String(error)
    }
  })
}
