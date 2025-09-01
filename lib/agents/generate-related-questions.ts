import { relatedSchema } from '@/lib/schema/related'
import { createOpenAI } from '@ai-sdk/openai'
import { CoreMessage, generateObject } from 'ai'
import { getCurrentUserToken } from '../auth/get-current-user'
import { getServerOrganizationId } from '../usage/manager'
import {
  getModel,
  isToolCallSupported
} from '../utils/registry'

export async function generateRelatedQuestions(
  messages: CoreMessage[],
  model: string
) {
  const lastMessages = messages.slice(-1).map(message => ({
    ...message,
    role: 'user'
  })) as CoreMessage[]

  const supportedModel = isToolCallSupported(model)
  const selected = supportedModel ? model : ((): string => {
    // getToolCallModel returns a wrapped model instance; we need provider:id form
    // For simplicity, fall back to original when unsupported
    return model
  })()

  // Route OpenAI via ModuleX AI proxy
  const [provider, ...nameParts] = selected.split(':') ?? []
  const modelName = nameParts.join(':')
  let currentModel = getModel(selected)

  if (provider === 'openai') {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_MODULEX_HOST
      const [token, organizationId] = await Promise.all([
        getCurrentUserToken(),
        getServerOrganizationId()
      ])
      if (baseUrl && token) {
        const base = `${baseUrl.replace(/\/$/, '')}/ai-proxy/providers/openai`
        const openaiViaProxy = createOpenAI({
          baseURL: base,
          apiKey:'dummy-key',
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Provider-Endpoint': 'https://api.openai.com/v1/chat/completions',
            ...(organizationId ? { 'X-Organization-Id': organizationId } : {})
          }
        })
        currentModel = openaiViaProxy(modelName)
      }
    } catch {}
  }

  const result = await generateObject({
    model: currentModel,
    system: `As a professional web researcher, your task is to generate a set of three queries that explore the subject matter more deeply, building upon the initial query and the information uncovered in its search results.

    For instance, if the original query was "Starship's third test flight key milestones", your output should follow this format:

    Aim to create queries that progressively delve into more specific aspects, implications, or adjacent topics related to the initial query. The goal is to anticipate the user's potential information needs and guide them towards a more comprehensive understanding of the subject matter.
    Please match the language of the response to the user's language.`,
    messages: lastMessages,
    schema: relatedSchema
  })

  return result
}
