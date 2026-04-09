import { useEffect, useRef } from 'react'
import { Terminal, Wifi, WifiOff, Trash2, Send, Square } from 'lucide-react'
import clsx from 'clsx'
import { format } from 'date-fns'
import type { TerminalLine, SessionStatus } from '../types'

interface Props {
  sessionId: string | null
  agentName?: string
  agentIcon?: string
  status: SessionStatus | null
  lines: TerminalLine[]
  connected: boolean
  steerMessage: string
  onSteerChange: (v: string) => void
  onSteer: () => void
  onInterrupt: () => void
  onClear: () => void
}

const lineStyles: Record<TerminalLine['type'], string> = {
  system:  'text-terminal-muted italic',
  info:    'text-terminal-blue',
  tool:    'text-terminal-purple',
  output:  'text-terminal-text',
  error:   'text-terminal-red',
}

const statusBadge: Record<SessionStatus, string> = {
  idle:       'bg-terminal-muted/20 text-terminal-muted',
  running:    'bg-terminal-green/20 text-terminal-green',
  completed:  'bg-terminal-blue/20 text-terminal-blue',
  terminated: 'bg-terminal-red/20 text-terminal-red',
}

export function LiveTerminal({
  sessionId, agentName, agentIcon, status, lines, connected,
  steerMessage, onSteerChange, onSteer, onInterrupt, onClear
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [lines])

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      onSteer()
    }
  }

  if (!sessionId) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-terminal-muted gap-4">
        <Terminal size={40} className="opacity-20" />
        <p className="text-sm">Select a session or launch a new one</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">

      {/* Terminal header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-terminal-border bg-terminal-surface shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-lg">{agentIcon}</span>
          <div>
            <span className="text-sm font-medium text-terminal-text">{agentName}</span>
            <span className="ml-2 text-xs font-mono text-terminal-muted">#{sessionId}</span>
          </div>
          {status && (
            <span className={clsx(
              'text-xs px-2 py-0.5 rounded-full font-medium',
              statusBadge[status]
            )}>
              {status}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {connected
            ? <Wifi size={14} className="text-terminal-green" title="Stream connected" />
            : <WifiOff size={14} className="text-terminal-muted" title="Stream disconnected" />
          }
          {status === 'running' && (
            <button
              onClick={onInterrupt}
              className="flex items-center gap-1 px-2.5 py-1 text-xs rounded
                         bg-terminal-red/10 text-terminal-red hover:bg-terminal-red/20 transition-colors"
              title="Interrupt agent"
            >
              <Square size={12} />
              Stop
            </button>
          )}
          <button
            onClick={onClear}
            className="p-1.5 rounded text-terminal-muted hover:text-terminal-text hover:bg-terminal-border transition-colors"
            title="Clear terminal"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Output */}
      <div className="flex-1 overflow-y-auto p-4 font-mono text-xs leading-relaxed space-y-0.5">
        {lines.length === 0 ? (
          <span className="text-terminal-muted italic">Waiting for agent output…</span>
        ) : (
          lines.map(line => (
            <div key={line.id} className="flex gap-3 group">
              <span className="shrink-0 text-terminal-muted/40 select-none w-16 text-right">
                {format(line.timestamp, 'HH:mm:ss')}
              </span>
              <span className={clsx('whitespace-pre-wrap break-all', lineStyles[line.type])}>
                {line.content}
              </span>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Steer input */}
      <div className="shrink-0 border-t border-terminal-border bg-terminal-surface p-3">
        <div className="flex gap-2">
          <textarea
            value={steerMessage}
            onChange={e => onSteerChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Steer the agent… (⌘↵ to send)"
            rows={2}
            disabled={status !== 'running'}
            className="flex-1 bg-terminal-bg border border-terminal-border rounded-lg px-3 py-2
                       text-xs text-terminal-text placeholder-terminal-muted/50 font-mono
                       focus:outline-none focus:border-terminal-blue transition-colors
                       disabled:opacity-40 disabled:cursor-not-allowed resize-none"
          />
          <button
            onClick={onSteer}
            disabled={!steerMessage.trim() || status !== 'running'}
            className="px-3 rounded-lg bg-terminal-blue/20 text-terminal-blue
                       hover:bg-terminal-blue/30 disabled:opacity-40 disabled:cursor-not-allowed
                       transition-colors flex items-center"
            title="Send steering message"
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
