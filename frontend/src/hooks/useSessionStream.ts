import { useState, useEffect, useRef, useCallback } from 'react'
import { connectToSessionStream } from '../services/api'
import type { TerminalLine, SseEvent } from '../types'

function parseTerminalLine(raw: string): TerminalLine {
  const id = crypto.randomUUID()
  const timestamp = new Date()

  try {
    const event: SseEvent = JSON.parse(raw)

    switch (event.type) {
      case 'connected':
        return { id, timestamp, type: 'system', content: '● Connected to agent stream' }

      case 'content_block_delta': {
        const delta = event.delta as { type: string; text?: string } | undefined
        const text = delta?.text ?? ''
        return { id, timestamp, type: 'output', content: text }
      }

      case 'tool_use':
        return {
          id, timestamp, type: 'tool',
          content: `▶ ${(event.name as string) ?? 'tool'} ${JSON.stringify(event.input ?? '')}`
        }

      case 'tool_result':
        return {
          id, timestamp, type: 'info',
          content: `◀ ${String(event.content ?? '').slice(0, 300)}`
        }

      case 'error':
        return { id, timestamp, type: 'error', content: `✗ ${event.message ?? raw}` }

      case 'message_stop':
        return { id, timestamp, type: 'system', content: '✓ Agent turn complete' }

      default:
        return { id, timestamp, type: 'info', content: raw }
    }
  } catch {
    return { id, timestamp, type: 'output', content: raw }
  }
}

export function useSessionStream(sessionId: string | null) {
  const [lines, setLines] = useState<TerminalLine[]>([])
  const [connected, setConnected] = useState(false)
  const esRef = useRef<EventSource | null>(null)

  const clear = useCallback(() => setLines([]), [])

  useEffect(() => {
    if (!sessionId) return

    setLines([])
    setConnected(false)

    const es = connectToSessionStream(
      sessionId,
      (raw) => {
        if (!connected) setConnected(true)
        setLines(prev => [...prev, parseTerminalLine(raw)])
      },
      () => {
        setConnected(false)
      }
    )

    esRef.current = es
    setConnected(true)

    return () => {
      es.close()
      esRef.current = null
    }
  }, [sessionId])

  return { lines, connected, clear }
}
