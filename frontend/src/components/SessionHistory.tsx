import { Clock, GitBranch, CheckCircle, XCircle, Loader, Circle } from 'lucide-react'
import clsx from 'clsx'
import { formatDistanceToNow } from 'date-fns'
import type { SessionSummary, SessionStatus } from '../types'

interface Props {
  sessions: SessionSummary[]
  activeId: string | null
  onSelect: (session: SessionSummary) => void
  loading: boolean
}

const StatusIcon = ({ status }: { status: SessionStatus }) => {
  switch (status) {
    case 'running':    return <Loader size={12} className="text-terminal-green animate-spin" />
    case 'completed':  return <CheckCircle size={12} className="text-terminal-blue" />
    case 'terminated': return <XCircle size={12} className="text-terminal-red" />
    default:           return <Circle size={12} className="text-terminal-muted" />
  }
}

export function SessionHistory({ sessions, activeId, onSelect, loading }: Props) {
  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-terminal-border flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-terminal-muted">
          Sessions
        </h2>
        <span className="text-xs text-terminal-muted">{sessions.length}</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="px-4 py-8 text-center text-terminal-muted text-sm">Loading…</div>
        ) : sessions.length === 0 ? (
          <div className="px-4 py-8 text-center text-terminal-muted text-xs">
            No sessions yet.<br />Launch an agent to get started.
          </div>
        ) : (
          sessions.map(session => (
            <button
              key={session.id}
              onClick={() => onSelect(session)}
              className={clsx(
                'w-full text-left px-4 py-3 border-b border-terminal-border/50 transition-colors',
                activeId === session.id
                  ? 'bg-terminal-surface border-l-2 border-l-terminal-blue'
                  : 'border-l-2 border-l-transparent hover:bg-terminal-surface/50'
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-base">{session.agentIcon}</span>
                  <span className="text-xs font-medium text-terminal-text">{session.agentName}</span>
                </div>
                <StatusIcon status={session.status} />
              </div>

              <p className="text-xs text-terminal-muted truncate mb-1.5" title={session.task}>
                {session.task}
              </p>

              <div className="flex items-center gap-3 text-xs text-terminal-muted/60">
                <span className="flex items-center gap-1">
                  <GitBranch size={10} />
                  <span className="truncate max-w-[120px]" title={session.repoUrl}>
                    {session.repoUrl.replace('https://github.com/', '')}
                  </span>
                </span>
                <span className="flex items-center gap-1">
                  <Clock size={10} />
                  {formatDistanceToNow(new Date(session.createdAt), { addSuffix: true })}
                </span>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
