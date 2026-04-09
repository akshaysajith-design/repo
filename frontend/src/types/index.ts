export interface AgentConfig {
  id: string
  name: string
  icon: string
  description: string
  defaultModel: string
  anthropicAgentId: string
}

export type SessionStatus = 'idle' | 'running' | 'completed' | 'terminated'

export interface SessionSummary {
  id: string
  agentId: string
  agentName: string
  agentIcon: string
  repoUrl: string
  task: string
  status: SessionStatus
  createdAt: string
  completedAt?: string
}

export interface LaunchSessionRequest {
  agentId: string
  repoUrl: string
  repoBranch: string
  gitHubPat?: string
  task: string
}

export interface TerminalLine {
  id: string
  timestamp: Date
  type: 'info' | 'tool' | 'output' | 'error' | 'system'
  content: string
}

export interface SseEvent {
  type: string
  [key: string]: unknown
}
