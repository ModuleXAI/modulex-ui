import { createOpenAI } from '@ai-sdk/openai'
import {
  CoreMessage,
  DataStreamWriter,
  generateId,
  generateText,
  JSONValue
} from 'ai'
import { z } from 'zod'
import { getCurrentUserToken } from '../auth/get-current-user'
import { searchSchema } from '../schema/search'
import { search } from '../tools/search'
import { ExtendedCoreMessage } from '../types'
import { getServerOrganizationId } from '../usage/manager'
import { getModel } from '../utils/registry'
import { parseToolCallXml } from './parse-tool-call'

interface ToolExecutionResult {
  toolCallDataAnnotation: ExtendedCoreMessage | null
  toolCallMessages: CoreMessage[]
}

export async function executeToolCall(
  coreMessages: CoreMessage[],
  dataStream: DataStreamWriter,
  model: string,
  searchMode: boolean
): Promise<ToolExecutionResult> {
  // If search mode is disabled, return empty tool call
  if (!searchMode) {
    return { toolCallDataAnnotation: null, toolCallMessages: [] }
  }

  // Convert Zod schema to string representation
  const searchSchemaString = Object.entries(searchSchema.shape)
    .map(([key, value]) => {
      const description = value.description
      const isOptional = value instanceof z.ZodOptional
      return `- ${key}${isOptional ? ' (optional)' : ''}: ${description}`
    })
    .join('\n')
  const defaultMaxResults = model?.includes('ollama') ? 5 : 20

  // Generate tool selection using XML format
  // Route OpenAI tool-selection generation via proxy when applicable
  let selectionModel = getModel(model)
  try {
    const [provider, ...nameParts] = model.split(':') ?? []
    const modelName = nameParts.join(':')
    if (provider === 'openai') {
      const baseUrl = process.env.NEXT_PUBLIC_MODULEX_HOST
      const supabaseToken = await getCurrentUserToken()
      const organizationId = await getServerOrganizationId()
      if (baseUrl && supabaseToken) {
        const base = `${baseUrl.replace(/\/$/, '')}/ai-proxy/providers/openai`
        const openaiViaProxy = createOpenAI({
          apiKey:'dummy-key',
          baseURL: base,
          headers: {
            Authorization: `Bearer ${supabaseToken}`,
            'X-Provider-Endpoint': 'https://api.openai.com/v1/chat/completions',
            ...(organizationId ? { 'X-Organization-Id': organizationId } : {})
          }
        })
        selectionModel = openaiViaProxy(modelName)
      }
    }
  } catch {}

  const toolSelectionResponse = await generateText({
    model: selectionModel,
    system: `You are an intelligent assistant that analyzes conversations to select the most appropriate tools and their parameters.
            You excel at understanding context to determine when and how to use available tools, including crafting effective search queries.
            Current date: ${new Date().toISOString().split('T')[0]}

            Do not include any other text in your response.
            Respond in XML format with the following structure:
            <tool_call>
              <tool>tool_name</tool>
              <parameters>
                <query>search query text</query>
                <max_results>number - ${defaultMaxResults} by default</max_results>
                <search_depth>basic or advanced</search_depth>
                <include_domains>domain1,domain2</include_domains>
                <exclude_domains>domain1,domain2</exclude_domains>
              </parameters>
            </tool_call>

            Available tools: search

            Search parameters:
            ${searchSchemaString}

            If you don't need a tool, respond with <tool_call><tool></tool></tool_call>`,
    messages: coreMessages
  })

  // Parse the tool selection XML using the search schema
  const toolCall = parseToolCallXml(toolSelectionResponse.text, searchSchema)

  if (!toolCall || toolCall.tool === '') {
    return { toolCallDataAnnotation: null, toolCallMessages: [] }
  }

  const toolCallAnnotation = {
    type: 'tool_call',
    data: {
      state: 'call',
      toolCallId: `call_${generateId()}`,
      toolName: toolCall.tool,
      args: JSON.stringify(toolCall.parameters)
    }
  }
  dataStream.writeData(toolCallAnnotation)

  // Support for search tool only for now

  const depth = (toolCall.parameters?.search_depth as 'basic' | 'advanced') || 'basic'
  const maxResults = toolCall.parameters?.max_results
  const query = toolCall.parameters?.query ?? ''


  const searchResults = await search(
    query,
    maxResults,
    depth,
    toolCall.parameters?.include_domains ?? [],
    toolCall.parameters?.exclude_domains ?? []
  )

  const updatedToolCallAnnotation = {
    ...toolCallAnnotation,
    data: {
      ...toolCallAnnotation.data,
      result: JSON.stringify(searchResults),
      state: 'result'
    }
  }
  dataStream.writeMessageAnnotation(updatedToolCallAnnotation)

  const toolCallDataAnnotation: ExtendedCoreMessage = {
    role: 'data',
    content: {
      type: 'tool_call',
      data: updatedToolCallAnnotation.data
    } as JSONValue
  }

  const toolCallMessages: CoreMessage[] = [
    {
      role: 'assistant',
      content: `Tool call result: ${JSON.stringify(searchResults)}`
    },
    {
      role: 'user',
      content: 'Now answer the user question.'
    }
  ]

  return { toolCallDataAnnotation, toolCallMessages }
}
