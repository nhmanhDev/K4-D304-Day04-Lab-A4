import { useMemo, useState } from 'react'
import { sendChat } from './api'
import type { ChatMessage, RoundRecord, ToolEvent } from './types'
import './App.css'

function uid() {
  return Math.random().toString(36).slice(2, 10)
}

function ToolResultBadge({ result }: { result: unknown }) {
  const hasError =
    typeof result === 'object' && result !== null && 'error' in (result as Record<string, unknown>)
  return <span className={`badge ${hasError ? 'badge-error' : 'badge-ok'}`}>{hasError ? 'error' : 'ok'}</span>
}

function ToolEventRow({ event }: { event: ToolEvent }) {
  const [open, setOpen] = useState(false)
  return (
    <li className="tool-event">
      <button className="tool-event-head" onClick={() => setOpen((v) => !v)}>
        <span className="tool-name">{event.tool}</span>
        <ToolResultBadge result={event.result} />
        <span className="chevron">{open ? '▾' : '▸'}</span>
      </button>
      {open && (
        <div className="tool-event-body">
          <div>
            <span className="label">args</span>
            <pre>{JSON.stringify(event.args ?? {}, null, 2)}</pre>
          </div>
          <div>
            <span className="label">result</span>
            <pre>{JSON.stringify(event.result ?? {}, null, 2)}</pre>
          </div>
        </div>
      )}
    </li>
  )
}

function RoundBlock({ round }: { round: RoundRecord }) {
  return (
    <div className="round-block">
      <div className="round-title">Round {round.round}</div>
      {round.assistant_text && <p className="round-text">{round.assistant_text}</p>}
      {round.tool_results.length > 0 && (
        <ul className="tool-event-list">
          {round.tool_results.map((event, idx) => (
            <ToolEventRow key={idx} event={event} />
          ))}
        </ul>
      )}
    </div>
  )
}

function TraceEmptyState() {
  return <p className="muted">Chọn 1 tin nhắn của agent để xem tool trace của lượt đó.</p>
}

export default function App() {
  const [version, setVersion] = useState('v0')
  const [provider] = useState('openrouter')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const selected = useMemo(
    () => messages.find((m) => m.id === selectedId && m.role === 'assistant'),
    [messages, selectedId],
  ) as Extract<ChatMessage, { role: 'assistant' }> | undefined

  async function handleSend() {
    const text = input.trim()
    if (!text || loading) return
    const userMsg: ChatMessage = { id: uid(), role: 'user', content: text }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)
    try {
      const res = await sendChat({ message: text, version, provider, history: messages, sessionId })
      setSessionId(res.session_id)
      const assistantMsg: ChatMessage = {
        id: uid(),
        role: 'assistant',
        content: res.assistant_text,
        status: res.status,
        artifactVersion: res.artifact_version,
        rounds: res.rounds,
        toolEvents: res.tool_events,
      }
      setMessages((prev) => [...prev, assistantMsg])
      setSelectedId(assistantMsg.id)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setMessages((prev) => [...prev, { id: uid(), role: 'error', content: message }])
    } finally {
      setLoading(false)
    }
  }

  function handleNewSession() {
    setMessages([])
    setSessionId(null)
    setSelectedId(null)
  }

  return (
    <div className="app">
      <header className="topbar">
        <h1>Research Agent — Demo UI</h1>
        <div className="topbar-controls">
          <label>
            Version
            <input
              list="version-options"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              className="version-input"
            />
            <datalist id="version-options">
              <option value="v0" />
              <option value="v1" />
              <option value="v2" />
              <option value="v3" />
            </datalist>
          </label>
          <span className="session-id">session: {sessionId ?? '(new)'}</span>
          <button onClick={handleNewSession} className="secondary">
            New session
          </button>
        </div>
      </header>

      <main className="layout">
        <section className="chat-panel">
          <div className="messages">
            {messages.length === 0 && (
              <p className="muted">
                Gõ 1 request để test agent (ví dụ: "tin tức AI hôm nay"). Đổi version rồi hỏi lại cùng câu để so
                sánh cải thiện giữa các version.
              </p>
            )}
            {messages.map((m) => (
              <div
                key={m.id}
                className={`message message-${m.role} ${m.role === 'assistant' && selectedId === m.id ? 'selected' : ''}`}
                onClick={() => m.role === 'assistant' && setSelectedId(m.id)}
              >
                {m.role === 'user' && <div className="bubble bubble-user">{m.content}</div>}
                {m.role === 'assistant' && (
                  <div className="bubble bubble-assistant">
                    <div className="bubble-meta">
                      <span className="tag">{m.artifactVersion}</span>
                      <span className="tag tag-status">{m.status}</span>
                    </div>
                    {m.content}
                  </div>
                )}
                {m.role === 'error' && <div className="bubble bubble-error">⚠ {m.content}</div>}
              </div>
            ))}
            {loading && <div className="muted">Agent đang xử lý…</div>}
          </div>
          <div className="composer">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
              placeholder="Nhập request..."
              rows={2}
            />
            <button onClick={handleSend} disabled={loading || !input.trim()}>
              Gửi
            </button>
          </div>
        </section>

        <aside className="trace-panel">
          <h2>Tool trace</h2>
          {!selected && <TraceEmptyState />}
          {selected && (
            <>
              <div className="trace-meta">
                <div>
                  <span className="label">artifact_version</span>
                  <code>{selected.artifactVersion}</code>
                </div>
                <div>
                  <span className="label">status</span>
                  <code>{selected.status}</code>
                </div>
              </div>
              {selected.rounds.length === 0 && <p className="muted">Không có tool call ở lượt này.</p>}
              {selected.rounds.map((round) => (
                <RoundBlock key={round.round} round={round} />
              ))}
            </>
          )}
        </aside>
      </main>
    </div>
  )
}
