import { createOpenAI } from '@ai-sdk/openai'
import { CoreMessage, DataStreamWriter, generateText, smoothStream } from 'ai'
import { getCurrentUserToken } from '../auth/get-current-user'
import { executeToolCall } from '../streaming/tool-execution'
import { getServerOrganizationId } from '../usage/manager'
import { getModel } from '../utils/registry'

interface UltraFinalConfig {
  model: any
  system: string
  messages: CoreMessage[]
  temperature: number
  experimental_transform: ReturnType<typeof smoothStream>
  ultraAnnotations?: any[]
  topP?: number
  topK?: number
}

// Fast model for lightweight tasks (stage title/headers)
const BASIC_TASK_MODEL = 'openai:gpt-4.1-nano'

function nowString() {
  return new Date().toLocaleString()
}

async function resolveModel(modelId: string) {
  let resolved = getModel(modelId)
  try {
    const [provider, ...modelNameParts] = modelId.split(':') ?? []
    const modelName = modelNameParts.join(':')
    if (provider === 'openai') {
      const baseUrl = process.env.NEXT_PUBLIC_MODULEX_HOST
      const supabaseToken = await getCurrentUserToken()
      const organizationId = await getServerOrganizationId()
      if (baseUrl && supabaseToken) {
        const base = `${baseUrl.replace(/\/$/, '')}/ai-proxy/providers/openai`
        const openaiViaProxy = createOpenAI({
          apiKey: 'dummy-key',
          baseURL: base,
          headers: {
            Authorization: `Bearer ${supabaseToken}`,
            'X-Provider-Endpoint': 'https://api.openai.com/v1/chat/completions',
            ...(organizationId ? { 'X-Organization-Id': organizationId } : {}),
            'X-Model-Id': modelName
          }
        })
        resolved = openaiViaProxy(modelName)
      }
    }
  } catch {}
  return resolved
}

export async function buildUltraFinalConfig(params: {
  messages: CoreMessage[]
  modelId: string
  dataStream?: DataStreamWriter
  searchMode?: boolean
}): Promise<UltraFinalConfig> {
  const { messages, modelId, dataStream, searchMode = false } = params
  const model = await resolveModel(modelId)
  const currentDate = nowString()
  const ultraAnnotations: any[] = []
  
  // Extract a concise user snippet for stage header prompts
  function extractUserSnippet(): string {
    try {
      const latestUser = [...messages].reverse().find(m => m.role === 'user')
      const content: any = latestUser?.content
      let text = ''
      if (typeof content === 'string') text = content
      else if (Array.isArray(content)) text = content.map((c: any) => (c?.type === 'text' ? c.text : '')).join(' ')
      else if ((content as any)?.text) text = String((content as any).text)
      return text.replace(/\s+/g, ' ').trim().slice(0, 160)
    } catch {
      return ''
    }
  }
  const userSnippet = extractUserSnippet()
  
  // Use standardized, non-dynamic titles for each stage
  const TITLE_PLANNER_FALLBACK = 'Plan — objective, steps, coverage'
  const TITLE_WRITER_FALLBACK = 'Draft — initial comprehensive answer'
  const TITLE_CRITIC_FALLBACK = 'Critique — issues and improvements'
  const RESULT_PLANNER = 'Analysis and plan results'
  const RESULT_WRITER = 'Draft results'
  const RESULT_CRITIC = 'Critique results'
  const HEADER_PLANNER_TEXT = 'Planning — objective, steps, coverage'
  const HEADER_WRITER_TEXT = 'Drafting — content generation'
  const HEADER_CRITIC_TEXT = 'Critiquing — quality review'

  function extractPlanTitle(plan: string): string | null {
    try {
      const lines = plan
        .split(/\r?\n/)
        .map(l => l.trim())
        .filter(l => l.length > 0)
      // Prefer first numbered step like "1. ..."
      const numbered = lines.find(l => /^\d+\.\s+/.test(l))
      if (numbered) {
        return numbered.replace(/^\d+\.\s+/, '').trim().replace(/[.:\-\s]+$/, '').slice(0, 140)
      }
      // Fallback: a line starting with dash
      const dashed = lines.find(l => /^[-•]\s+/.test(l))
      if (dashed) {
        return dashed.replace(/^[-•]\s+/, '').trim().replace(/[.:\-\s]+$/, '').slice(0, 140)
      }
      // Fallback: a line starting with "Objective:" or "Goal:"
      const objective = lines.find(l => /^(Objective|Goal)\s*:/i.test(l))
      if (objective) {
        return objective.replace(/^(Objective|Goal)\s*:/i, '').trim().replace(/[.:\-\s]+$/, '').slice(0, 140)
      }
    } catch {}
    return null
  }

  // Stage 1: Planner
  const plannerSystem = `You are the Planner. Analyze the latest user request and produce ONLY a concise, numbered plan for how to answer it. Do not write the answer itself.
Output requirements:
- Identify the end goal in one sentence
- List the concrete steps you will take (2–6 steps)
- List the key topics to cover (bulleted)
No preamble, no extra text, return ONLY the plan.`

  // Build planner header text early (uses fast model title separately if needed)
  const plannerHeaderText = `Analyze the user's question${userSnippet ? ` about "${userSnippet}"` : ''} and produce a plan only (no answer).\nInclude:\n- Objective in one sentence\n- 2–6 numbered steps you will take\n- Key topics to cover as bullets\n- Verification/acceptance criteria if relevant`

  // Emit header early via fast model (to show timeline dot immediately)
  try {
    const earlyHeader = {
      type: 'ultra-stage-header',
      data: {
        stage: 'planner',
        title: (userSnippet ? `Planning: ${userSnippet}` : TITLE_PLANNER_FALLBACK),
        text: plannerHeaderText
      }
    }
    dataStream?.writeMessageAnnotation(earlyHeader as any)
    ultraAnnotations.push(earlyHeader)
  } catch {}

  const planner = await generateText({
    model,
    system: `${plannerSystem}\nCurrent date and time: ${currentDate}`,
    messages,
    temperature: 0
  })

  const planText = planner.text.trim()
  const planTitle = extractPlanTitle(planText)
  try {
    // Stage header box (collapsible)
    const headerAnn = {
      type: 'ultra-stage-header',
      data: {
        stage: 'planner',
        title: (userSnippet
          ? `Planning: ${userSnippet}`
          : (planTitle ? `Planning: ${planTitle}` : TITLE_PLANNER_FALLBACK)),
        text: plannerHeaderText
      }
    }
    dataStream?.writeMessageAnnotation(headerAnn as any)
    ultraAnnotations.push(headerAnn)
    const stageAnn = {
      type: 'ultra-stage',
      data: {
        stage: 'planner',
        text: planText,
        title: (planTitle
          ? `Plan Results: ${planTitle}`
          : (userSnippet ? `Plan Results: ${userSnippet}` : 'Plan Results')),
        resultTitle: RESULT_PLANNER
      }
    }
    dataStream?.writeMessageAnnotation(stageAnn as any)
    ultraAnnotations.push(stageAnn)

    // Immediately announce Research header when search mode is enabled so the client doesn't briefly show Drafting
    if (searchMode) {
      const researchHeader = {
        type: 'ultra-stage-header',
        data: {
          stage: 'research',
          title: 'Research',
          text: 'Execute planned searches and collect sources'
        }
      }
      dataStream?.writeMessageAnnotation(researchHeader as any)
      ultraAnnotations.push(researchHeader)
    }
  } catch {}

  // Stage 2: Research (optional, only if search mode enabled)
  let writerMessages: CoreMessage[] = []
  if (searchMode) {
    try {
      const { toolCallMessages, extraAnnotations, toolCallDataAnnotation } = await executeToolCall(
        messages,
        dataStream as DataStreamWriter,
        modelId,
        true,
        true
      )
      // Persist any research annotations under ultraAnnotations too (for robustness)
      if (Array.isArray(extraAnnotations)) {
        for (const ann of extraAnnotations) {
          ultraAnnotations.push(ann)
        }
      }
      // Persist the tool_call annotation so the client can reconstruct full Search UI after reload
      if (toolCallDataAnnotation) {
        ultraAnnotations.push(toolCallDataAnnotation as any)
      }
      // Use search results as context for writing
      writerMessages = [
        ...messages,
        { role: 'user', content: `Plan:\n${planText}` },
        ...toolCallMessages,
        { role: 'user', content: 'Now write the draft based on the plan and sources.' }
      ]
    } catch {
      writerMessages = [
        ...messages,
        { role: 'user', content: `Plan:\n${planText}\n\nWrite a comprehensive first draft that follows this plan. Avoid unnecessary repetition.` }
      ]
    }
  } else {
    writerMessages = [
      ...messages,
      { role: 'user', content: `Plan:\n${planText}\n\nWrite a comprehensive first draft that follows this plan. Avoid unnecessary repetition.` }
    ]
  }

  const writerSystem = `You are the Writer. Using the provided plan${searchMode ? ' and the research results (sources)' : ''}, produce a thorough first draft of the answer. Focus on content completeness. Do not worry about perfect style or citations in this stage.`
  const draft = await generateText({
    model,
    system: `${writerSystem}\nCurrent date and time: ${currentDate}`,
    messages: writerMessages,
    temperature: 0.7,
    topP: 0.95
  })

  const draftText = draft.text.trim()
  const writerHeaderText = `Using the plan${planTitle ? ` "${planTitle}"` : ''}${userSnippet ? ` for "${userSnippet}"` : ''}, write a comprehensive first draft.\nGuidelines:\n- Focus on content completeness and clarity\n- Provide examples/explanations where helpful\n- Avoid redundancy; no citations/styling optimization yet`
  try {
    // Stage header box (collapsible)
    const headerAnn = {
      type: 'ultra-stage-header',
      data: {
        stage: 'writer',
        title: userSnippet
          ? `Drafting: ${userSnippet}`
          : (planTitle ? `Drafting: ${planTitle}` : TITLE_WRITER_FALLBACK),
        text: writerHeaderText
      }
    }
    dataStream?.writeMessageAnnotation(headerAnn as any)
    ultraAnnotations.push(headerAnn)
    // Stage result box (collapsible)
    const stageAnn = {
      type: 'ultra-stage',
      data: {
        stage: 'writer',
        text: draftText.slice(0, 1200),
        title: userSnippet
          ? `Draft Results: ${userSnippet}`
          : (planTitle ? `Draft Results: ${planTitle}` : 'Draft Results'),
        resultTitle: RESULT_WRITER
      }
    }
    dataStream?.writeMessageAnnotation(stageAnn as any)
    ultraAnnotations.push(stageAnn)
  } catch {}

  // Stage 3: Critic
  const criticSystem = `You are the Critic. Review the draft rigorously. Output ONLY a list of issues and improvements, no rewriting.
Checklist:
1) Missing or superficial points
2) Logical errors or contradictions
3) Needed clarifications or additional info
4) Redundancy or confusion`
  const criticMessages: CoreMessage[] = [
    { role: 'user', content: `Draft:\n${draftText}\n\nList issues and improvements ONLY.` }
  ]
  const critique = await generateText({
    model,
    system: `${criticSystem}\nCurrent date and time: ${currentDate}`,
    messages: criticMessages,
    temperature: 0
  })

  const critiqueText = critique.text.trim()
  const criticHeaderText = `Review the draft${userSnippet ? ` for "${userSnippet}"` : ''} and output only issues and improvements.\nEvaluate:\n- Missing or superficial points\n- Logical errors/contradictions\n- Needed clarifications or additional info\n- Redundancy or confusion`
  try {
    // Stage header box (collapsible)
    const headerAnn = {
      type: 'ultra-stage-header',
      data: {
        stage: 'critic',
        title: userSnippet
          ? `Critiquing: ${userSnippet}`
          : (planTitle ? `Critiquing: ${planTitle}` : TITLE_CRITIC_FALLBACK),
        text: criticHeaderText
      }
    }
    dataStream?.writeMessageAnnotation(headerAnn as any)
    ultraAnnotations.push(headerAnn)
    // Stage result box (collapsible)
    const stageAnn = {
      type: 'ultra-stage',
      data: {
        stage: 'critic',
        text: critiqueText,
        title: planTitle
          ? `Critique Results: ${planTitle}`
          : (userSnippet ? `Critique Results: ${userSnippet}` : 'Critique Results'),
        resultTitle: RESULT_CRITIC
      }
    }
    dataStream?.writeMessageAnnotation(stageAnn as any)
    ultraAnnotations.push(stageAnn)
  } catch {}

  // Stage 4: Refiner (Final Answer) — streamed later by caller
  const refinerSystem = `You are the Refiner. Using the draft and the critique, produce the final, polished, highly detailed answer for the user.
Quality rules:
- Be comprehensive and authoritative; cover the topic end-to-end without hand-waving
- Integrate all relevant insights from the plan and critique; resolve contradictions
- Use clear structure with informative headings, subheadings, and bullet points
- Include step-by-step guidance, concrete examples, and practical recommendations
- Call out edge cases, pitfalls, and trade-offs; add brief FAQs where helpful
- If earlier steps summarized external sources, maintain cautious wording and avoid overclaiming
- Ensure tight logical flow and remove redundancy
- Aim for substantial depth (at least several well-developed sections) while staying organized
- Conclude with a concise "Final answer" section summarizing key takeaways`

  const finalMessages: CoreMessage[] = [
    ...messages,
    { role: 'user', content: `Draft:\n${draftText}\n\nCritique:\n${critiqueText}\n\nProduce the final, user-ready answer.` }
  ]

  return {
    model,
    system: `${refinerSystem}\nCurrent date and time: ${currentDate}`,
    messages: finalMessages,
    temperature: 0.25,
    topP: 0.95,
    topK: 40,
    experimental_transform: smoothStream(),
    ultraAnnotations
  }
}


