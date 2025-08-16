import { getSearchSchemaForModel } from '@/lib/schema/search'
import { tool } from 'ai'

/**
 * Creates a video search tool with the appropriate schema for the model.
 */
export function createVideoSearchTool(fullModel: string) {
  return tool({
    description: 'Search for videos from YouTube',
    parameters: getSearchSchemaForModel(fullModel),
    execute: async ({ query }) => {
      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' }
        headers['X-API-KEY'] = process.env.SERPER_API_KEY || ''
        const response = await fetch('https://google.serper.dev/videos', {
          method: 'POST',
          headers,
          body: JSON.stringify({ q: query })
        })

        if (!response.ok) {
          throw new Error('Network response was not ok')
        }
 
        return await response.json()
      } catch (error) {
        console.error('Video Search API error:', error)
        return null
      }
    }
  })
}

// Default export for backward compatibility, using a default model
export const videoSearchTool = createVideoSearchTool('openai:gpt-4o-mini')
