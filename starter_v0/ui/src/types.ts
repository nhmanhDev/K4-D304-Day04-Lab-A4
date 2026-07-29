export interface ToolEvent {
  tool: string
  args?: Record<string, unknown>
  result?: unknown
}

export interface RoundRecord {
  round: number
  assistant_text: string | null
  tool_calls: { name: string; args: Record<string, unknown> }[]
  tool_results: ToolEvent[]
}

export interface ChatApiResponse {
  status: string
  assistant_text: string
  rounds: RoundRecord[]
  tool_events: ToolEvent[]
  artifact_version: string
  session_id: string
}

export type ChatMessage =
  | { id: string; role: 'user'; content: string }
  | {
      id: string
      role: 'assistant'
      content: string
      status: string
      artifactVersion: string
      rounds: RoundRecord[]
      toolEvents: ToolEvent[]
    }
  | { id: string; role: 'error'; content: string }

export type ToolStatus = 'ok' | 'error' | 'pending'

export function toolStatus(event: ToolEvent): ToolStatus {
  const result = event.result as Record<string, unknown> | null | undefined
  if (result && typeof result === 'object') {
    if (result.awaiting_user) return 'pending'
    if ('error' in result) return 'error'
  }
  return 'ok'
}
