import { useEffect, useMemo, useState } from 'react'
import { sendChat } from './api'
import { toolStatus, type ChatMessage, type RoundRecord, type ToolEvent } from './types'
import './App.css'

function uid() {
  return Math.random().toString(36).slice(2, 10)
}

type Theme = 'light' | 'dark'

function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem('ui-theme')
    if (stored === 'light' || stored === 'dark') return stored
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })

  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark')
    document.documentElement.classList.add(theme)
    localStorage.setItem('ui-theme', theme)
  }, [theme])

  return [theme, () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))]
}

function JsonBlock({ data }: { data: unknown }) {
  if (data === null || data === undefined) {
    return <span className="muted">null</span>
  }
  return <pre>{JSON.stringify(data, null, 2)}</pre>
}

function ToolEventRow({ event }: { event: ToolEvent }) {
  const [open, setOpen] = useState(false)
  const status = toolStatus(event)
  return (
    <li className="tool-event">
      <button className="tool-event-head" onClick={() => setOpen((v) => !v)}>
        <span className="tool-name">{event.tool}</span>
        <span className={`badge badge-${status}`} data-tool-status={status}>
          {status}
        </span>
        <span className={`chevron ${open ? 'open' : ''}`}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 4L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>
      {open && (
        <div className="tool-event-body">
          <div className="tool-event-body-item">
            <span className="label">args</span>
            <JsonBlock data={event.args ?? {}} />
          </div>
          <div className="tool-event-body-item">
            <span className="label">result</span>
            <JsonBlock data={event.result ?? null} />
          </div>
        </div>
      )}
    </li>
  )
}

function RoundBlock({ round }: { round: RoundRecord }) {
  const hasTools = round.tool_results.length > 0
  return (
    <div className="round-block">
      <div className={`round-header ${hasTools ? 'has-tools' : ''}`}>
        <span className="round-title">Round {round.round}</span>
        {round.assistant_text && <p className="round-text">{round.assistant_text}</p>}
      </div>
      {hasTools && (
        <ul className="tool-event-list">
          {round.tool_results.map((event, idx) => (
            <ToolEventRow key={idx} event={event} />
          ))}
        </ul>
      )}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path
            d="M9 3.5C5.96 3.5 3.5 5.96 3.5 9C3.5 12.04 5.96 14.5 9 14.5C12.04 14.5 14.5 12.04 14.5 9"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
          <path d="M12 3L14.5 5.5L12 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="9" cy="9" r="1.2" fill="currentColor" />
        </svg>
      </div>
      <p>Nhập một research request để bắt đầu.</p>
      <p className="hint">Thay đổi Version ở trên để so sánh kết quả giữa các phiên bản agent.</p>
    </div>
  )
}

function ThemeIcon({ theme }: { theme: Theme }) {
  if (theme === 'dark') {
    return (
      <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
        <circle cx="6.5" cy="6.5" r="3" stroke="currentColor" strokeWidth="1.3" />
        <path
          d="M6.5 1V2M6.5 11V12M1 6.5H2M11 6.5H12M2.8 2.8L3.5 3.5M9.5 9.5L10.2 10.2M2.8 10.2L3.5 9.5M9.5 3.5L10.2 2.8"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
        />
      </svg>
    )
  }
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <path
        d="M11 7.5C10.3 9.6 8.1 11 5.7 10.7C3.3 10.4 1.5 8.3 1.5 6C1.5 3.7 3 1.8 5.1 1.2C3.8 3.2 4.1 5.9 5.9 7.5C7.7 9.1 10.1 9.1 11 7.5Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function App() {
  const [theme, toggleTheme] = useTheme()
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

  function handleComposerKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
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
            <span>Version</span>
            <input
              list="version-options"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              placeholder="v0"
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
          <button
            className="icon-btn"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
            aria-label="Toggle theme"
          >
            <ThemeIcon theme={theme} />
          </button>
        </div>
      </header>

      <main className="layout">
        <section className="chat-panel">
          <div className="messages">
            {messages.length === 0 && <EmptyState />}
            {messages.map((m) => (
              <div
                key={m.id}
                className={`message message-${m.role} ${m.role === 'assistant' && selectedId === m.id ? 'selected' : ''}`}
              >
                {m.role === 'user' && <div className="bubble bubble-user">{m.content}</div>}
                {m.role === 'assistant' && (
                  <button
                    className="bubble bubble-assistant"
                    onClick={() => setSelectedId(m.id === selectedId ? null : m.id)}
                  >
                    <div className="bubble-meta">
                      <span className="tag">{m.artifactVersion}</span>
                      <span className="tag tag-status">{m.status}</span>
                    </div>
                    {m.content}
                  </button>
                )}
                {m.role === 'error' && (
                  <div className="bubble bubble-error">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M7 1L13 12H1L7 1Z" stroke="#dc2626" strokeWidth="1.4" strokeLinejoin="round" />
                      <path d="M7 5.5V8" stroke="#dc2626" strokeWidth="1.4" strokeLinecap="round" />
                      <circle cx="7" cy="10" r="0.7" fill="#dc2626" />
                    </svg>
                    <p>{m.content}</p>
                  </div>
                )}
              </div>
            ))}
            {loading && <p className="muted">Agent đang xử lý…</p>}
          </div>
          <div className="composer">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleComposerKey}
              placeholder="Nhập request..."
              rows={2}
            />
            <button onClick={handleSend} disabled={loading || !input.trim()}>
              Gửi
            </button>
          </div>
        </section>

        <aside className="trace-panel">
          <div className="trace-header">
            <span>Tool trace</span>
          </div>
          {!selected && (
            <div className="trace-empty">
              <p>Chọn 1 tin nhắn của agent để xem tool trace của lượt đó.</p>
            </div>
          )}
          {selected && (
            <div className="trace-body">
              <div className="trace-meta">
                <div className="trace-meta-item">
                  <span className="label">artifact_version</span>
                  <span className="tag">{selected.artifactVersion}</span>
                </div>
                <div className="trace-meta-item">
                  <span className="label">status</span>
                  <span className="tag tag-status">{selected.status}</span>
                </div>
              </div>
              {selected.rounds.length === 0 && <p className="muted">Không có tool call ở lượt này.</p>}
              <div className="rounds">
                {selected.rounds.map((round) => (
                  <RoundBlock key={round.round} round={round} />
                ))}
              </div>
            </div>
          )}
        </aside>
      </main>
    </div>
  )
}
