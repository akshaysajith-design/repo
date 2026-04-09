import type { AgentConfig, SessionSummary, LaunchSessionRequest } from '../types'

const BASE = '/api'

export const api = {
  // ─── Agents ────────────────────────────────────────────────────────────────
  async getAgents(): Promise<AgentConfig[]> {
    const res = await fetch(`${BASE}/agents`)
    if (!res.ok) throw new Error('Failed to load agents')
    return res.json()
  },

  // ─── Sessions ──────────────────────────────────────────────────────────────
  async getSessions(): Promise<SessionSummary[]> {
    const res = await fetch(`${BASE}/sessions`)
    if (!res.ok) throw new Error('Failed to load sessions')
    return res.json()
  },

  async getSession(id: string): Promise<SessionSummary> {
    const res = await fetch(`${BASE}/sessions/${id}`)
    if (!res.ok) throw new Error('Session not found')
    return res.json()
  },

  async launchSession(req: LaunchSessionRequest): Promise<{ id: string; anthropicSessionId: string }> {
    const res = await fetch(`${BASE}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    })
    if (!res.ok) {
      const err = await res.text()
      throw new Error(err || 'Failed to launch session')
    }
    return res.json()
  },

  async steerSession(id: string, message: string): Promise<void> {
    const res = await fetch(`${BASE}/sessions/${id}/steer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    })
    if (!res.ok) throw new Error('Failed to send message')
  },

  async interruptSession(id: string): Promise<void> {
    const res = await fetch(`${BASE}/sessions/${id}/interrupt`, {
      method: 'POST',
    })
    if (!res.ok) throw new Error('Failed to interrupt session')
  },

  // ─── Provisioning ──────────────────────────────────────────────────────────
  async provisionAgent(id: string): Promise<{ anthropicAgentId: string; hint: string }> {
    const res = await fetch(`${BASE}/provision/agents/${id}`, { method: 'POST' })
    if (!res.ok) {
      const err = await res.text()
      throw new Error(err || 'Failed to provision agent')
    }
    return res.json()
  },
}

// ─── SSE stream helper ────────────────────────────────────────────────────────

export function connectToSessionStream(
  sessionId: string,
  onLine: (line: string) => void,
  onError: (err: Event) => void
): EventSource {
  const es = new EventSource(`${BASE}/sessions/${sessionId}/stream`)
  es.onmessage = (e) => onLine(e.data)
  es.onerror = onError
  return es
}
