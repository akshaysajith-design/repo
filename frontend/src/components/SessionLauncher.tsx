import { useState } from 'react'
import { X, Rocket, Eye, EyeOff } from 'lucide-react'
import type { AgentConfig, LaunchSessionRequest } from '../types'

interface Props {
  agent: AgentConfig
  onLaunch: (req: LaunchSessionRequest) => Promise<void>
  onClose: () => void
}

export function SessionLauncher({ agent, onLaunch, onClose }: Props) {
  const [repoUrl, setRepoUrl] = useState('')
  const [branch, setBranch] = useState('main')
  const [pat, setPat] = useState('')
  const [showPat, setShowPat] = useState(false)
  const [task, setTask] = useState('')
  const [launching, setLaunching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!repoUrl.trim() || !task.trim()) return

    setLaunching(true)
    setError(null)
    try {
      await onLaunch({
        agentId: agent.id,
        repoUrl: repoUrl.trim(),
        repoBranch: branch.trim() || 'main',
        gitHubPat: pat.trim() || undefined,
        task: task.trim(),
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Launch failed')
    } finally {
      setLaunching(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-lg bg-terminal-surface border border-terminal-border rounded-xl shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-terminal-border">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{agent.icon}</span>
            <div>
              <h2 className="text-base font-semibold text-terminal-text">
                Launch {agent.name}
              </h2>
              <p className="text-xs text-terminal-muted">{agent.description}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-terminal-border transition-colors text-terminal-muted hover:text-terminal-text"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">

          {/* Repo URL */}
          <div>
            <label className="block text-xs font-medium text-terminal-muted mb-1.5 uppercase tracking-wide">
              GitHub Repo URL
            </label>
            <input
              type="url"
              value={repoUrl}
              onChange={e => setRepoUrl(e.target.value)}
              placeholder="https://github.com/your-org/your-repo"
              required
              className="w-full bg-terminal-bg border border-terminal-border rounded-lg px-3 py-2
                         text-sm text-terminal-text placeholder-terminal-muted/50
                         focus:outline-none focus:border-terminal-blue transition-colors font-mono"
            />
          </div>

          {/* Branch */}
          <div>
            <label className="block text-xs font-medium text-terminal-muted mb-1.5 uppercase tracking-wide">
              Branch
            </label>
            <input
              type="text"
              value={branch}
              onChange={e => setBranch(e.target.value)}
              placeholder="main"
              className="w-full bg-terminal-bg border border-terminal-border rounded-lg px-3 py-2
                         text-sm text-terminal-text placeholder-terminal-muted/50
                         focus:outline-none focus:border-terminal-blue transition-colors font-mono"
            />
          </div>

          {/* GitHub PAT */}
          <div>
            <label className="block text-xs font-medium text-terminal-muted mb-1.5 uppercase tracking-wide">
              GitHub PAT <span className="normal-case text-terminal-muted">(private repos only)</span>
            </label>
            <div className="relative">
              <input
                type={showPat ? 'text' : 'password'}
                value={pat}
                onChange={e => setPat(e.target.value)}
                placeholder="ghp_xxxxxxxxxxxx"
                className="w-full bg-terminal-bg border border-terminal-border rounded-lg px-3 py-2 pr-10
                           text-sm text-terminal-text placeholder-terminal-muted/50
                           focus:outline-none focus:border-terminal-blue transition-colors font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPat(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-terminal-muted hover:text-terminal-text"
              >
                {showPat ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            <p className="mt-1 text-xs text-terminal-muted">
              Token is sent directly to the backend and never stored in the browser.
            </p>
          </div>

          {/* Task */}
          <div>
            <label className="block text-xs font-medium text-terminal-muted mb-1.5 uppercase tracking-wide">
              Task
            </label>
            <textarea
              value={task}
              onChange={e => setTask(e.target.value)}
              placeholder={`Describe what you want the ${agent.name} to do…`}
              required
              rows={5}
              className="w-full bg-terminal-bg border border-terminal-border rounded-lg px-3 py-2
                         text-sm text-terminal-text placeholder-terminal-muted/50
                         focus:outline-none focus:border-terminal-blue transition-colors
                         resize-none font-mono leading-relaxed"
            />
          </div>

          {error && (
            <div className="px-3 py-2 rounded-lg bg-terminal-red/10 border border-terminal-red/30 text-terminal-red text-sm">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-lg border border-terminal-border
                         text-terminal-muted hover:text-terminal-text hover:border-terminal-text
                         transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={launching || !repoUrl.trim() || !task.trim()}
              className="flex items-center gap-2 px-5 py-2 text-sm font-medium rounded-lg
                         bg-terminal-blue text-terminal-bg hover:bg-terminal-blue/90
                         disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Rocket size={14} />
              {launching ? 'Launching…' : 'Launch Session'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
