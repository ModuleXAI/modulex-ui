import { createOpenAI } from '@ai-sdk/openai'
import { CoreMessage, smoothStream, streamText, tool } from 'ai'
import { z } from 'zod'
import { getCurrentUserToken } from '../auth/get-current-user'
import { createQuestionTool } from '../tools/question'
import { retrieveTool } from '../tools/retrieve'
import { createSearchTool } from '../tools/search'
import { createVideoSearchTool } from '../tools/video-search'
import { getServerOrganizationId } from '../usage/manager'
import { getModel } from '../utils/registry'

// MCP Tool types - OpenAI function calling format
interface MCPTool {
  type: string
  function: {
    name: string
    description: string
    parameters?: {
      type: string
      properties?: Record<string, any>
      required?: string[]
    }
  }
  metadata?: {
    tool_key: string
    action: string
  }
}

// Resolve the base URL for AI-related tool operations.
function getAiToolBaseUrl(): string | null {
  return process.env.NEXT_PUBLIC_MODULEX_HOST ?? null
}

// Fetch MCP tools from server (optionally via AI proxy)
async function fetchMCPTools(userId?: string): Promise<MCPTool[]> {
  console.log('Fetching MCP tools. userId:', userId)
  try {
    const modulexServerUrl = getAiToolBaseUrl()
    
    if (!modulexServerUrl) {
      console.log('MCP server not configured')
      return []
    }

    // Get Supabase access token
    const supabaseToken = await getCurrentUserToken()
    if (!supabaseToken) {
      console.log('Unable to retrieve Supabase token')
      return []
    }

    let url = `${modulexServerUrl}/tools/openai-tools`
    console.log('URL:', url)
    try {
      // Try to read selected org from cookie in server context
      const { cookies } = await import('next/headers')
      const store = await cookies()
      const orgId = store.get('selected_organization_id')?.value
      if (orgId) {
        const u = new URL(url)
        u.searchParams.set('organization_id', orgId)
        url = u.toString()
      }
    } catch {
      console.log('Error getting org id')
    }
    // Fallback to server organization id if not present in cookies
    try {
      const orgId = await getServerOrganizationId()
      if (orgId) {
        const u = new URL(url)
        if (!u.searchParams.get('organization_id')) {
          u.searchParams.set('organization_id', orgId)
          url = u.toString()
        }
      }
    } catch {}
    console.log('[MCP] fetch tools final URL:', url)
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${supabaseToken}`
      }
    })

    if (!response.ok) {
      console.error('Failed to fetch MCP tools:', response.status, response.statusText)
      return []
    }
    console.log('[MCP] fetch tools status:', response.status)

    const body = await response.json()
    const tools = Array.isArray(body?.tools) ? body.tools : (Array.isArray(body) ? body : [])
    try {
      const toolCount = Array.isArray(tools) ? tools.length : 0
      const toolNames = Array.isArray(tools)
        ? tools.map((t: any) => t?.function?.name).filter((n: any) => !!n)
        : []
      console.log('[MCP] fetched tools count:', toolCount, 'names:', toolNames)
    } catch {}
    return tools
  } catch (error) {
    console.error('Error fetching MCP tools:', error)
    return []
  }
}

// Execute MCP tool using tool_key and action (optionally via AI proxy)
async function executeMCPTool(toolKey: string, action: string, parameters: any, userId: string): Promise<any> {
  try {
    const modulexServerUrl = getAiToolBaseUrl()
    
    if (!modulexServerUrl) {
      throw new Error('MCP server not configured or no user ID')
    }

    // Get Supabase access token
    const supabaseToken = await getCurrentUserToken()
    if (!supabaseToken) {
      throw new Error('Unable to retrieve Supabase token')
    }

    let url = `${modulexServerUrl}/tools/${toolKey}/execute`
    try {
      const { cookies } = await import('next/headers')
      const store = await cookies()
      const orgId = store.get('selected_organization_id')?.value
      if (orgId) {
        const u = new URL(url)
        u.searchParams.set('organization_id', orgId)
        url = u.toString()
      }
    } catch {}
    // Fallback to server organization id if not present in cookies
    try {
      const orgId = await getServerOrganizationId()
      if (orgId) {
        const u = new URL(url)
        if (!u.searchParams.get('organization_id')) {
          u.searchParams.set('organization_id', orgId)
          url = u.toString()
        }
      }
    } catch {}
    console.log('[MCP] execute tool request:', {
      toolKey,
      action,
      url,
      parameterKeys: Object.keys(parameters || {})
    })
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${supabaseToken}`
      },
      body: JSON.stringify({
        action: action,
        parameters: parameters || {}
      })
    })

    if (!response.ok) {
      let errorBody: any = null
      try {
        const text = await response.text()
        try { errorBody = JSON.parse(text) } catch { errorBody = text }
      } catch {}
      console.error('[MCP] execute tool error:', response.status, response.statusText, errorBody)
      throw new Error(`MCP tool execution failed: ${response.status} ${response.statusText}${errorBody ? ` - ${typeof errorBody === 'string' ? errorBody : JSON.stringify(errorBody)}` : ''}`)
    }
    console.log('[MCP] execute tool status:', response.status)

    const result = await response.json()
    // Return the result data
    try {
      console.log('[MCP] execute tool result keys:', Object.keys(result || {}))
    } catch {}
    return result.result || result
  } catch (error) {
    console.error(`Error executing MCP tool ${toolKey}/${action}:`, error)
    throw error
  }
}

// Helper function to convert JSON schema to Zod schema
function jsonSchemaToZod(jsonSchema: any): z.ZodSchema {
  if (!jsonSchema || !jsonSchema.properties) {
    return z.object({})
  }

  const zodFields: Record<string, z.ZodSchema> = {}

  for (const [key, prop] of Object.entries(jsonSchema.properties)) {
    const propSchema = prop as any
    let zodType: z.ZodSchema

    switch (propSchema.type) {
      case 'string':
        zodType = z.string()
        if (propSchema.enum) {
          zodType = z.enum(propSchema.enum)
        }
        break
      case 'number':
      case 'integer':
        let numberType = z.number()
        if (propSchema.minimum !== undefined) {
          numberType = numberType.min(propSchema.minimum)
        }
        if (propSchema.maximum !== undefined) {
          numberType = numberType.max(propSchema.maximum)
        }
        zodType = numberType
        break
      case 'boolean':
        zodType = z.boolean()
        break
      case 'object':
        zodType = z.object({}).passthrough()
        break
      case 'array':
        zodType = z.array(z.any())
        break
      default:
        zodType = z.any()
    }

    if (propSchema.description) {
      zodType = zodType.describe(propSchema.description)
    }

    // Check if field is optional
    if (!jsonSchema.required || !jsonSchema.required.includes(key)) {
      zodType = zodType.optional()
    }

    zodFields[key] = zodType
  }

  return z.object(zodFields)
}

// Convert MCP tool schema to Zod schema
function convertMCPSchemaToZod(mcpTool: MCPTool): z.ZodSchema {
  // Handle case where parameters might be undefined or malformed
  if (!mcpTool.function.parameters) {
    console.warn(`MCP tool ${mcpTool.function.name} has no parameters, using empty schema`)
    return z.object({})
  }
  
  return jsonSchemaToZod(mcpTool.function.parameters)
}

// Create AI SDK tool from MCP tool
function createMCPTool(mcpTool: MCPTool, userId: string) {
  return tool({
    description: mcpTool.function.description,
    parameters: convertMCPSchemaToZod(mcpTool),
    execute: async (parameters) => {
      // Use the tool_key and action from metadata
      const toolKey = mcpTool.metadata?.tool_key
      const action = mcpTool.metadata?.action

      if (!toolKey || !action) {
        throw new Error(`Missing tool_key or action in metadata for ${mcpTool.function.name}`)
      }

      return await executeMCPTool(toolKey, action, parameters, userId)
    }
  })
}

const SYSTEM_PROMPT = `
Instructions:

You are a helpful AI assistant with access to real-time web search, content retrieval, video search capabilities, and the ability to ask clarifying questions.

When asked a question, you should:
1. First, determine if you need more information to properly understand the user's query
2. **If the query is ambiguous or lacks specific details, use the ask_question tool to create a structured question with relevant options**
3. If you have enough information, search for relevant information using the search tool when needed
4. Use the retrieve tool to get detailed content from specific URLs
5. Use the video search tool when looking for video content
6. Analyze all search results to provide accurate, up-to-date information
7. Always cite sources using the [number](url) format, matching the order of search results. If multiple sources are relevant, include all of them, and comma separate them. Only use information that has a URL available for citation.
8. If results are not relevant or helpful, rely on your general knowledge
9. Provide comprehensive and detailed responses based on search results, ensuring thorough coverage of the user's question
10. Use markdown to structure your responses. Use headings to break up the content into sections.
11. **Use the retrieve tool only with user-provided URLs.**

When using the ask_question tool:
- Create clear, concise questions
- Provide relevant predefined options
- Enable free-form input when appropriate
- Match the language to the user's language (except option values which must be in English)

Citation Format:
[number](url)
`

type ResearcherReturn = Parameters<typeof streamText>[0]

export async function researcher({
  messages,
  model,
  searchMode,
  userId
}: {
  messages: CoreMessage[]
  model: string
  searchMode: boolean
  userId?: string
}): Promise<ResearcherReturn> {
  try {
    const currentDate = new Date().toLocaleString()

    // Create model-specific tools
    const searchTool = createSearchTool(model)
    const videoSearchTool = createVideoSearchTool(model)
    const askQuestionTool = createQuestionTool(model)

    // Base tools
    const baseTools = {
      search: searchTool,
      retrieve: retrieveTool,
      videoSearch: videoSearchTool,
      ask_question: askQuestionTool
    }

    const systemTools = ['ask_question']
    const baseActiveTools = ['search', 'retrieve', 'videoSearch']

    // Fetch MCP tools (no longer gated by userId)
    let mcpTools: Record<string, any> = {}
    let mcpActiveTools: string[] = []

    try {
      const mcpToolsData = await fetchMCPTools(userId)
      console.log('Raw MCP tools data:', JSON.stringify(mcpToolsData, null, 2))
      
      for (const mcpTool of mcpToolsData) {
        const toolName = mcpTool.function.name
        const toolKey = mcpTool.metadata?.tool_key
        const action = mcpTool.metadata?.action
        
        console.log(`Processing MCP tool: ${toolName} (${toolKey}/${action})`)
        console.log(`Parameters:`, mcpTool.function.parameters)
        
        const toolInstance = createMCPTool(mcpTool, userId || '')
        mcpTools[toolName] = toolInstance
        mcpActiveTools.push(toolName)
      }
      
      console.log(`Loaded ${mcpToolsData.length} MCP tools`)
    } catch (error) {
      console.error('Failed to load MCP tools:', error)
    }

    // Combine base tools with MCP tools
    const allTools = { ...baseTools, ...mcpTools }
    const allActiveTools = searchMode ? [...baseActiveTools, ...mcpActiveTools, ...systemTools] : [...mcpActiveTools, ...systemTools]
    console.log('[researcher] searchMode:', searchMode, 'active tools:', allActiveTools)

    // Resolve model, routing OpenAI via ModuleX AI proxy with per-request headers
    const [provider, ...modelNameParts] = model.split(':') ?? []
    const modelName = modelNameParts.join(':')
    let resolvedModel = getModel(model)
    console.log('[researcher] resolvedModel:', resolvedModel)
    console.log('[researcher] modelName:', modelName)

    if (provider === 'openai') {
      try {
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
              ...(organizationId ? { 'X-Organization-Id': organizationId } : {}),
              'X-Model-Id': modelName
            }
          })
          resolvedModel = openaiViaProxy(modelName)
        }
      } catch (e) {
        // Fallback to default model resolution if proxy setup fails
        resolvedModel = getModel(model)
      }
    }

    return {
      model: resolvedModel,
      system: `${SYSTEM_PROMPT}\nCurrent date and time: ${currentDate}`,
      messages,
      tools: allTools,
      experimental_activeTools: allActiveTools,
      maxSteps: searchMode ? 5 : (mcpActiveTools.length > 0 ? 3 : 2),
      experimental_transform: smoothStream()
    }
  } catch (error) {
    console.error('Error in chatResearcher:', error)
    throw error
  }
}
