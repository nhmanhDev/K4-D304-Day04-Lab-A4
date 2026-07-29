import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { fetchTools, sendChat, type ToolInfo } from './api'
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

const QUICK_CHIPS = [
  'Tin tức AI hôm nay',
  'Tweet của Sam Altman',
  'Tìm paper về LLM trên arXiv',
  'LLM là gì?',
  'Thời tiết Hà Nội',
  'Digest tin AI tuần này',
]


function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M7 2V12M2 7H12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

function SendIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M12.5 1.5L6.5 7.5M12.5 1.5L8.5 12.5L6.5 7.5L1.5 5.5L12.5 1.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
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

function AgentAvatar() {
  return (
    <div className="hero-avatar">
      <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
        <circle cx="13" cy="13" r="5" stroke="#10b981" strokeWidth="1.8" />
        <circle cx="13" cy="13" r="2" fill="#10b981" />
        <path d="M13 3A10 10 0 0 1 23 13" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="2 3" />
        <path d="M13 23A10 10 0 0 1 3 13" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="2 3" />
      </svg>
    </div>
  )
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
  // A round with no tool calls is the final answer — its assistant_text is
  // the same text already shown in full in the chat bubble on the left, so
  // repeating it here (as a small italic paragraph) is just noisy duplication.
  const noteText = hasTools ? round.assistant_text : null
  return (
    <div className="round-block">
      <div className={`round-header ${hasTools ? 'has-tools' : ''}`}>
        <span className="round-title">Round {round.round}</span>
        {noteText && <p className="round-text">{noteText}</p>}
        {!hasTools && round.assistant_text && <p className="round-text">Final answer — xem trong khung chat.</p>}
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

function Composer({
  value,
  onChange,
  onSend,
  onKeyDown,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  onSend: () => void
  onKeyDown: (e: KeyboardEvent<HTMLTextAreaElement>) => void
  placeholder: string
}) {
  const active = value.trim().length > 0
  return (
    <div className="composer-card">
      <textarea value={value} onChange={(e) => onChange(e.target.value)} onKeyDown={onKeyDown} placeholder={placeholder} rows={2} />
      <div className="composer-card-actions">
        <button className={`composer-send ${active ? 'active' : ''}`} onClick={onSend} disabled={!active}>
          Gửi <SendIcon />
        </button>
      </div>
    </div>
  )
}

const STORAGE_KEY = 'research-agent-ui-session'

interface StoredSession {
  version: string
  sessionId: string | null
  messages: ChatMessage[]
  selectedId: string | null
}

function loadStoredSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as StoredSession) : null
  } catch {
    return null
  }
}

export default function App() {
  const [theme, toggleTheme] = useTheme()
  const stored = useMemo(loadStoredSession, [])
  const [version, setVersion] = useState(stored?.version ?? 'v3')
  const [provider] = useState('openrouter')
  const [sessionId, setSessionId] = useState<string | null>(stored?.sessionId ?? null)
  const [messages, setMessages] = useState<ChatMessage[]>(stored?.messages ?? [])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(stored?.selectedId ?? null)
  const [tools, setTools] = useState<ToolInfo[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchTools()
      .then(setTools)
      .catch(() => setTools([]))
  }, [])

  // Persist the conversation so a page reload / re-open doesn't lose it.
  useEffect(() => {
    const snapshot: StoredSession = { version, sessionId, messages, selectedId }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot))
  }, [version, sessionId, messages, selectedId])

  const selected = useMemo(
    () => messages.find((m) => m.id === selectedId && m.role === 'assistant'),
    [messages, selectedId],
  ) as Extract<ChatMessage, { role: 'assistant' }> | undefined

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend(overrideText?: string) {
    const text = (overrideText ?? input).trim()
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

  function handleComposerKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function handleNewSession() {
    setMessages([])
    setSessionId(null)
    setSelectedId(null)
    setInput('')
  }

  return (
    <div className="app-shell">
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="3" stroke="white" strokeWidth="1.5" />
              <path d="M7 1.5A5.5 5.5 0 0 1 12.5 7" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
              <circle cx="7" cy="7" r="1.2" fill="white" />
            </svg>
          </div>
          <span>Research Agent</span>
        </div>

        <div className="sidebar-newchat">
          <button className="btn-newchat" onClick={handleNewSession}>
            <PlusIcon />
            New session
          </button>
        </div>

        <div className="sidebar-body">
          <p className="sidebar-section-title">Tools ({tools.length})</p>
          {tools.map((t) => (
            <div key={t.name} className="sidebar-tool-item">
              <code>{t.name}</code>
              <span>{t.description}</span>
            </div>
          ))}
        </div>

        <div className="sidebar-footer">Day 04 Lab v2 · Research Agent</div>
      </aside>

      {/* ── Main ── */}
      <div className="main">
        <header className="topbar">
          <span className="topbar-title">Research Agent — Demo UI</span>
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
            <div className="topbar-divider" />
            <button className="icon-btn" onClick={toggleTheme} title={theme === 'dark' ? 'Light mode' : 'Dark mode'} aria-label="Toggle theme">
              <ThemeIcon theme={theme} />
            </button>
          </div>
        </header>

        <div className="content">
          <div className="chat-col">
            {messages.length === 0 ? (
              <div className="hero">
                <AgentAvatar />
                <h1>
                  Chào, tôi là <span>Research Agent</span>. Tôi giúp gì được cho bạn?
                </h1>
                <p className="subtitle">Tìm tin tức, tra cứu kiến thức, đọc bài báo, theo dõi mạng xã hội — hỏi trực tiếp hoặc bấm gợi ý bên dưới.</p>
                <div className="chips">
                  {QUICK_CHIPS.map((chip) => (
                    <button key={chip} className="chip" onClick={() => handleSend(chip)}>
                      {chip}
                    </button>
                  ))}
                </div>
                <Composer value={input} onChange={setInput} onSend={() => handleSend()} onKeyDown={handleComposerKey} placeholder="Nhập request..." />
              </div>
            ) : (
              <div className="messages">
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
                <div ref={messagesEndRef} />
              </div>
            )}

            {messages.length > 0 && (
              <div className="composer-bar">
                <Composer value={input} onChange={setInput} onSend={() => handleSend()} onKeyDown={handleComposerKey} placeholder="Nhập request..." />
              </div>
            )}
          </div>

          {/* ── Tool trace panel ── */}
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
        </div>
      </div>
    </div>
  )
}
