# AIRE Control Panel

UI for managing AIRE agents via the Anthropic Managed Agents API.

```
┌──────────────┬──────────────────────────────────┬─────────────────┐
│   Agents     │        Live Terminal              │  Session        │
│              │                                  │  History        │
│ 🔍 Archaeo   │  > git clone https://github...   │                 │
│ 🏛 Architect │  > Reading VB6/Nightly_Svcs/...  │ ● running  x1   │
│ 🔨 Builder   │  > Found 155 VBS scripts...      │ ✓ complete x3   │
│ ✅ QA        │  ─────────────────────────────── │                 │
│ 🚀 DevOps    │  [Steer the agent…]  [⌘↵ Send]   │                 │
└──────────────┴──────────────────────────────────┴─────────────────┘
```

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Tailwind CSS + Vite |
| Backend | FastAPI (Python 3.12) |
| Streaming | Server-Sent Events (SSE) |
| Agent execution | Anthropic Managed Agents API |
| Session storage | SQLite (aiosqlite) |

---

## Prerequisites

- Python 3.12+
- Node.js 20+
- Anthropic API key (with Managed Agents beta access)

---

## Setup

### 1. Backend

```bash
cd backend
cp .env.example .env
# Edit .env — add your ANTHROPIC_API_KEY

python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt

uvicorn main:app --reload --port 8000
# API running at http://localhost:8000
# Swagger docs at http://localhost:8000/docs
```

### 2. Provision agents (one-time)

Each AIRE agent needs to be registered once with Anthropic. This creates the agent
on their platform and stores the returned ID in the local SQLite database.

```bash
# Provision each agent
curl -X POST http://localhost:8000/api/provision/archaeologist
curl -X POST http://localhost:8000/api/provision/architect
curl -X POST http://localhost:8000/api/provision/builder
curl -X POST http://localhost:8000/api/provision/qa
curl -X POST http://localhost:8000/api/provision/devops
```

To use custom system prompts, add Markdown files before provisioning:

```
backend/prompts/archaeologist.md
backend/prompts/architect.md
...
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
# http://localhost:5173
```

---

## Usage

1. Click **⚡** next to any agent in the left sidebar
2. Fill in the launcher:
   - **GitHub repo URL** — `https://github.com/your-org/your-repo`
   - **Branch** — defaults to `main`
   - **GitHub PAT** — private repos only (`ghp_xxxx`) — never stored, injected into clone URL only
   - **Task** — describe what you want the agent to do
3. Click **Launch Session** — agent clones the repo and starts working
4. Watch live output stream in the terminal
5. Use the steer box to guide the agent mid-run
6. Hit **Stop** to interrupt

---

## Architecture

```
Browser (React, port 5173)
  └── Vite proxy /api → FastAPI (port 8000)
        ├── GET  /api/agents                  — agent roster
        ├── POST /api/provision/{id}           — one-time Anthropic agent registration
        ├── GET  /api/sessions                 — session history (SQLite)
        ├── POST /api/sessions                 — create environment + session + fire task
        ├── GET  /api/sessions/{id}/stream     — SSE proxy from Anthropic → browser
        ├── POST /api/sessions/{id}/steer      — inject steering message
        └── POST /api/sessions/{id}/interrupt  — send interrupt event
```

## GitHub Access

| Scenario | Works? | How |
|---|---|---|
| Public GitHub repo | ✅ | Paste HTTPS URL |
| Private GitHub repo | ✅ | Paste URL + GitHub PAT in launcher |
| Local repo not on GitHub | ⚠️ | Push branch to GitHub first |

The PAT is injected directly into the `git clone` URL and is never written to disk or the database.
