import type { ChatApiResponse, ChatMessage } from './types'

export interface ToolInfo {
  name: string
  description: string
}

export async function fetchTools(): Promise<ToolInfo[]> {
  const res = await fetch('/api/tools')
  if (!res.ok) throw new Error(`Request failed: ${res.status}`)
  return res.json()
}

export async function sendChat(params: {
  message: string
  version: string
  provider: string
  history: ChatMessage[]
  sessionId: string | null
}): Promise<ChatApiResponse> {
  const history = params.history
    .filter((m): m is Extract<ChatMessage, { role: 'user' | 'assistant' }> => m.role !== 'error')
    .map((m) => ({ role: m.role, content: m.content }))

  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: params.message,
      version: params.version,
      provider: params.provider,
      history,
      session_id: params.sessionId,
    }),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(body.detail || `Request failed: ${res.status}`)
  }
  return res.json()
}
