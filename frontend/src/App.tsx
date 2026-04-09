import { useState, useEffect, useCallback } from 'react'
import { Layers } from 'lucide-react'
import { AgentRoster } from './components/AgentRoster'
import { SessionHistory } from './components/SessionHistory'
import { LiveTerminal } from './components/LiveTerminal'
import { SessionLauncher } from './components/SessionLauncher'
import { api } from './services/api'
import { useSessionStream } from './hooks/useSessionStream'
import type { AgentConfig, SessionSummary, LaunchSessionRequest } from './types'

export default function App() {
  const [agents, setAgents] = useState<AgentConfig[]>([])
  const [sessions, setSessions] = useState<SessionSummary[]>([])
  const [agentsLoading, setAgentsLoading] = useState(true)
  const [sessionsLoading, setSessionsLoading] = useState(true)

  const [selectedAgent, setSelectedAgent] = useState<AgentConfig | null>(null)
  const [activeSession, setActiveSession] = useState<SessionSummary | null>(null)
  const [launchTarget, setLaunchTarget] = useState<AgentConfig | null>(null)
  const [steerMessage, setSteerMessage] = useState('')

  // SSE stream for active session
  const { lines, connected, clear } = useSessionStream(activeSession?.id ?? null)

  // ─── Load agents ────────────────────────────────────────────────────────────
  useEffect(() => {
    api.getAgents()
      .then(setAgents)
      .catch(console.error)
      .finally(() => setAgentsLoading(false))
  }, [])

  // ─── Load + poll sessions ───────────────────────────────────────────────────
  const loadSessions = useCallback(async () => {
    try {
      const data = await api.getSessions()
      setSessions(data)
      // Refresh active session status
      if (activeSession) {
        const updated = data.find(s => s.id === activeSession.id)
        if (updated) setActiveSession(updated)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSessionsLoading(false)
    }
  }, [activeSession])

  useEffect(() => {
    loadSessions()
    const interval = setInterval(loadSessions, 5000)
    return () => clearInterval(interval)
  }, [loadSessions])

  // ─── Launch ─────────────────────────────────────────────────────────────────
  async function handleLaunch(req: LaunchSessionRequest) {
    const result = await api.launchSession(req)
    await loadSessions()
    // Auto-select the new session
    const newSession = sessions.find(s => s.id === result.id) ?? {
      id: result.id,
      agentId: req.agentId,
      agentName: agents.find(a => a.id === req.agentId)?.name ?? req.agentId,
      agentIcon: agents.find(a => a.id === req.agentId)?.icon ?? '🤖',
      repoUrl: req.repoUrl,
      task: req.task,
      status: 'running' as const,
      createdAt: new Date().toISOString(),
    }
    setActiveSession(newSession)
  }

  // ─── Steer ──────────────────────────────────────────────────────────────────
  async function handleSteer() {
    if (!activeSession || !steerMessage.trim()) return
    await api.steerSession(activeSession.id, steerMessage)
    setSteerMessage('')
  }

  // ─── Interrupt ──────────────────────────────────────────────────────────────
  async function handleInterrupt() {
    if (!activeSession) return
    await api.interruptSession(activeSession.id)
    await loadSessions()
  }

  return (
    <div className="flex h-screen bg-terminal-bg text-terminal-text font-mono overflow-hidden">

      {/* ── Left sidebar: Agents ──────────────────────────────────────── */}
      <aside className="w-56 shrink-0 border-r border-terminal-border flex flex-col">
        {/* Brand */}
        <div className="px-4 py-4 border-b border-terminal-border flex items-center gap-2.5">
          <Layers size={16} className="text-terminal-blue" />
          <span className="text-sm font-semibold text-terminal-text tracking-wide">AIRE</span>
          <span className="text-xs text-terminal-muted">Control Panel</span>
        </div>

        <div className="flex-1 overflow-hidden">
          <AgentRoster
            agents={agents}
            selectedId={selectedAgent?.id ?? null}
            onSelect={setSelectedAgent}
            onLaunch={setLaunchTarget}
            loading={agentsLoading}
          />
        </div>
      </aside>

      {/* ── Centre: Live terminal ─────────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <LiveTerminal
          sessionId={activeSession?.id ?? null}
          agentName={activeSession?.agentName}
          agentIcon={activeSession?.agentIcon}
          status={activeSession?.status ?? null}
          lines={lines}
          connected={connected}
          steerMessage={steerMessage}
          onSteerChange={setSteerMessage}
          onSteer={handleSteer}
          onInterrupt={handleInterrupt}
          onClear={clear}
        />
      </main>

      {/* ── Right sidebar: Session history ────────────────────────────── */}
      <aside className="w-64 shrink-0 border-l border-terminal-border">
        <SessionHistory
          sessions={sessions}
          activeId={activeSession?.id ?? null}
          onSelect={setActiveSession}
          loading={sessionsLoading}
        />
      </aside>

      {/* ── Launch modal ─────────────────────────────────────────────── */}
      {launchTarget && (
        <SessionLauncher
          agent={launchTarget}
          onLaunch={handleLaunch}
          onClose={() => setLaunchTarget(null)}
        />
      )}
    </div>
  )
}
