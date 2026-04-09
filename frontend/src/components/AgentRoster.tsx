import { Zap } from 'lucide-react'
import clsx from 'clsx'
import type { AgentConfig } from '../types'

interface Props {
  agents: AgentConfig[]
  selectedId: string | null
  onSelect: (agent: AgentConfig) => void
  onLaunch: (agent: AgentConfig) => void
  loading: boolean
}

export function AgentRoster({ agents, selectedId, onSelect, onLaunch, loading }: Props) {
  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-terminal-border">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-terminal-muted">
          Agents
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {loading ? (
          <div className="px-4 py-8 text-center text-terminal-muted text-sm">Loading…</div>
        ) : agents.length === 0 ? (
          <div className="px-4 py-8 text-center text-terminal-muted text-sm">
            No agents configured
          </div>
        ) : (
          agents.map(agent => (
            <button
              key={agent.id}
              onClick={() => onSelect(agent)}
              className={clsx(
                'w-full text-left px-4 py-3 transition-colors group',
                selectedId === agent.id
                  ? 'bg-terminal-surface border-l-2 border-terminal-blue'
                  : 'border-l-2 border-transparent hover:bg-terminal-surface/50'
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{agent.icon}</span>
                  <span className={clsx(
                    'text-sm font-medium',
                    selectedId === agent.id ? 'text-terminal-blue' : 'text-terminal-text'
                  )}>
                    {agent.name}
                  </span>
                </div>

                <button
                  onClick={(e) => { e.stopPropagation(); onLaunch(agent) }}
                  className={clsx(
                    'p-1 rounded transition-colors',
                    'opacity-0 group-hover:opacity-100',
                    'hover:bg-terminal-blue/20 text-terminal-blue'
                  )}
                  title={`Launch ${agent.name}`}
                >
                  <Zap size={14} />
                </button>
              </div>

              <p className="mt-1 text-xs text-terminal-muted leading-relaxed pl-7">
                {agent.description}
              </p>

              {!agent.anthropicAgentId && (
                <span className="mt-1 ml-7 inline-block text-xs text-terminal-yellow">
                  ⚠ Not provisioned
                </span>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  )
}
