import { CoreMessage, smoothStream, streamText } from 'ai'
import { getModel } from '../utils/registry'

const BASE_SYSTEM_PROMPT = `
Instructions:

You are a helpful AI assistant providing accurate information.

1. Provide comprehensive and detailed responses to user questions
2. Use markdown to structure your responses with appropriate headings
3. Acknowledge when you are uncertain about specific details
4. Focus on maintaining high accuracy in your responses
`

const SEARCH_ENABLED_PROMPT = `
${BASE_SYSTEM_PROMPT}

When analyzing search results:
1. Analyze the provided search results carefully to answer the user's question
2. Always cite sources using the [number](url) format, matching the order of search results
3. If multiple sources are relevant, include all of them using comma-separated citations
4. Only use information that has a URL available for citation
5. If the search results don't contain relevant information, acknowledge this and provide a general response

Citation Format:
[number](url)
`

const SEARCH_DISABLED_PROMPT = `
${BASE_SYSTEM_PROMPT}

Important:
1. Provide responses based on your general knowledge
2. Be clear about any limitations in your knowledge
3. Suggest when searching for additional information might be beneficial
`

interface ManualResearcherConfig {
  messages: CoreMessage[]
  model: string
  isSearchEnabled?: boolean
  ultraMode?: boolean
}

type ManualResearcherReturn = Parameters<typeof streamText>[0]

export function manualResearcher({
  messages,
  model,
  isSearchEnabled = true,
  ultraMode = false
}: ManualResearcherConfig): ManualResearcherReturn {
  try {
    const currentDate = new Date().toLocaleString()
    const base = isSearchEnabled ? SEARCH_ENABLED_PROMPT : SEARCH_DISABLED_PROMPT
    const ultraAddendum = ultraMode
      ? `\nUltraModulex mode is enabled. On the first user input, you must initiate a structured clarifying question (ask_question) before answering. After confirmation, use deeper, multi-step reasoning to craft the best answer.`
      : ''
    const systemPrompt = `${base}${ultraAddendum}`

    return {
      model: getModel(model),
      system: `${systemPrompt}\nCurrent date and time: ${currentDate}`,
      messages,
      temperature: ultraMode ? 0.3 : 0.6,
      topP: 1,
      topK: 40,
      experimental_transform: smoothStream()
    }
  } catch (error) {
    console.error('Error in manualResearcher:', error)
    throw error
  }
}
