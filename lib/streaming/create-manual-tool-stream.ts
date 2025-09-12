import {
  convertToCoreMessages,
  createDataStreamResponse,
  DataStreamWriter,
  JSONValue,
  streamText
} from 'ai'
import { manualResearcher } from '../agents/manual-researcher'
import { buildUltraFinalConfig } from '../agents/ultra-orchestrator'
import { ExtendedCoreMessage } from '../types'
import { getMaxAllowedTokens, truncateMessages } from '../utils/context-window'
import { handleStreamFinish } from './handle-stream-finish'
import { executeToolCall } from './tool-execution'
import { BaseStreamConfig } from './types'

export function createManualToolStreamResponse(config: BaseStreamConfig) {
  return createDataStreamResponse({
    execute: async (dataStream: DataStreamWriter) => {
      const { messages, model, chatId, searchMode, userId, ultraMode } = config
      const modelId = `${model.providerId}:${model.id}`
      let toolCallModelId = model.toolCallModel
        ? `${model.providerId}:${model.toolCallModel}`
        : modelId

      try {
        const coreMessages = convertToCoreMessages(messages)
        const truncatedMessages = truncateMessages(
          coreMessages,
          getMaxAllowedTokens(model)
        )

        const isFirstTurn = !truncatedMessages.some(m => m.role === 'assistant')

        const { toolCallDataAnnotation, toolCallMessages } =
          await executeToolCall(
            truncatedMessages,
            dataStream,
            toolCallModelId,
            searchMode && !(ultraMode && isFirstTurn)
          )

        const messagesForLLM = [...truncatedMessages, ...toolCallMessages]
        let extraAnnotations: any[] = []

        let researcherConfig = manualResearcher({
          messages: messagesForLLM,
          model: modelId,
          isSearchEnabled: searchMode,
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
            if ((finalConfig as any).ultraAnnotations) {
              extraAnnotations = (finalConfig as any).ultraAnnotations
            }
          } catch (e) {
            console.error('Ultra orchestrator failed, falling back to manual researcher:', e)
          }
        }

        // Variables to track the reasoning timing.
        let reasoningStartTime: number | null = null
        let reasoningDuration: number | null = null

        const result = streamText({
          ...researcherConfig,
          onFinish: async result => {
            const ultraExtended: ExtendedCoreMessage[] = (extraAnnotations || []).map(a => ({
              role: 'data',
              content: a as JSONValue
            }))

            const annotations: ExtendedCoreMessage[] = [
              ...(toolCallDataAnnotation ? [toolCallDataAnnotation] : []),
              ...ultraExtended,
              {
                role: 'data',
                content: {
                  type: 'reasoning',
                  data: {
                    time: reasoningDuration ?? 0,
                    reasoning: result.reasoning
                  }
                } as JSONValue
              }
            ]

            await handleStreamFinish({
              responseMessages: result.response.messages,
              originalMessages: messages,
              model: modelId,
              chatId,
              dataStream,
              userId,
              skipRelatedQuestions: true,
              annotations
            })

          },
          onChunk(event) {
            const chunkType = event.chunk?.type

            if (chunkType === 'reasoning') {
              if (reasoningStartTime === null) {
                reasoningStartTime = Date.now()
              }
            } else {
              if (reasoningStartTime !== null) {
                const elapsedTime = Date.now() - reasoningStartTime
                reasoningDuration = elapsedTime
                dataStream.writeMessageAnnotation({
                  type: 'reasoning',
                  data: { time: elapsedTime }
                } as JSONValue)
                reasoningStartTime = null
              }
            }
          }
        })

        result.mergeIntoDataStream(dataStream, {
          sendReasoning: true
        })
      } catch (error) {
        console.error('Stream execution error:', error)
      }
    },
    onError: error => {
      console.error('Stream error:', error)
      return error instanceof Error ? error.message : String(error)
    }
  })
}
