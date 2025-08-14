import { getCurrentUserId, getCurrentUserToken } from '@/lib/auth/get-current-user'
import { createManualToolStreamResponse } from '@/lib/streaming/create-manual-tool-stream'
import { createToolCallingStreamResponse } from '@/lib/streaming/create-tool-calling-stream'
import { Model } from '@/lib/types/models'
import { isProviderEnabled } from '@/lib/utils/registry'
import { cookies } from 'next/headers'

export const maxDuration = 30
export const runtime = 'edge'
export const dynamic = 'force-dynamic'

const DEFAULT_MODEL: Model = {
  id: 'gpt-4o-mini',
  name: 'GPT-4o mini',
  provider: 'OpenAI',
  providerId: 'openai',
  enabled: true,
  toolCallType: 'native'
}

export async function POST(req: Request) {
  try {
    const { messages, id: chatId } = await req.json()
    const referer = req.headers.get('referer')
    const isSharePage = referer?.includes('/share/')
    const userId = await getCurrentUserId()

    if (isSharePage) {
      return new Response('Chat API is not available on share pages', {
        status: 403,
        statusText: 'Forbidden'
      })
    }

    const cookieStore = await cookies()
    const modelJson = cookieStore.get('selectedModel')?.value
    const searchMode = cookieStore.get('search-mode')?.value === 'true'

    let selectedModel = DEFAULT_MODEL

    if (modelJson) {
      try {
        selectedModel = JSON.parse(modelJson) as Model
      } catch (e) {
        console.error('Failed to parse selected model:', e)
      }
    }

    // If an AI proxy is configured, forward the entire request to the proxy endpoint.
    const aiProxy = (process.env.AI_PROXY_URL || process.env.NEXT_PUBLIC_AI_PROXY)?.trim()
    console.log('aiProxy', aiProxy)
    if (aiProxy) {
      const supabaseToken = await getCurrentUserToken()
      const proxyPayload = {
        messages,
        id: chatId,
        selectedModel,
        searchMode,
        userId
      }

      const proxyRes = await fetch(aiProxy, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(supabaseToken ? { Authorization: `Bearer ${supabaseToken}` } : {})
        },
        body: JSON.stringify(proxyPayload)
      })

      const headers = new Headers(proxyRes.headers)
      // Ensure AI SDK stream header and content-type are preserved for the client parser
      if (!headers.has('x-vercel-ai-data-stream')) headers.set('x-vercel-ai-data-stream', 'v1')
      if (!headers.has('content-type')) headers.set('content-type', 'text/plain; charset=utf-8')
      headers.set('cache-control', 'no-store')

      // Do not save here; saving is handled on client onFinish with full transcript

      return new Response(proxyRes.body, {
        status: proxyRes.status,
        statusText: proxyRes.statusText,
        headers
      })
    }

    if (
      !isProviderEnabled(selectedModel.providerId) ||
      selectedModel.enabled === false
    ) {
      return new Response(
        `Selected provider is not enabled ${selectedModel.providerId}`,
        {
          status: 404,
          statusText: 'Not Found'
        }
      )
    }

    const supportsToolCalling = selectedModel.toolCallType === 'native'

    const baseResp = supportsToolCalling
      ? createToolCallingStreamResponse({
          messages,
          model: selectedModel,
          chatId,
          searchMode,
          userId
        })
      : createManualToolStreamResponse({
          messages,
          model: selectedModel,
          chatId,
          searchMode,
          userId
        })

    // Normalize headers for FE data-stream parser
    const headers = new Headers((baseResp as Response).headers)
    if (!headers.has('x-vercel-ai-data-stream')) headers.set('x-vercel-ai-data-stream', 'v1')
    if (!headers.has('content-type')) headers.set('content-type', 'text/plain; charset=utf-8')
    headers.set('cache-control', 'no-store')
    headers.set('x-ai-proxy-used', '0')
    return new Response((baseResp as Response).body, {
      status: (baseResp as Response).status,
      statusText: (baseResp as Response).statusText,
      headers
    })
  } catch (error) {
    console.error('API route error:', error)
    return new Response('Error processing your request', {
      status: 500,
      statusText: 'Internal Server Error'
    })
  }
}
