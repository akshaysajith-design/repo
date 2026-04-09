import asyncio
import uuid
from datetime import datetime, timezone
from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

import anthropic_client as ac
import db
from config import settings
from models import (
    AgentConfig,
    LaunchSessionRequest,
    SteerRequest,
    ProvisionResult,
    AGENT_ROSTER,
)


# ── Startup ───────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    await db.init_db()
    yield

app = FastAPI(title="AIRE UI API", lifespan=lifespan, debug=True)

# Surface full exception details in responses during development
from fastapi.responses import JSONResponse
from fastapi.requests import Request
import traceback

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"error": str(exc), "detail": traceback.format_exc()},
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # allow all origins in dev
    allow_credentials=False,      # must be False when allow_origins=["*"]
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Helpers ───────────────────────────────────────────────────────────────────

async def get_roster() -> list[dict]:
    """Merge hardcoded roster with provisioned agent IDs from DB."""
    stored_ids = await db.get_agent_ids()
    roster = []
    for agent in AGENT_ROSTER:
        a = dict(agent)
        a["anthropic_agent_id"] = stored_ids.get(a["id"], a["anthropic_agent_id"])
        roster.append(a)
    return roster


async def find_agent(agent_id: str) -> dict:
    roster = await get_roster()
    agent = next((a for a in roster if a["id"] == agent_id), None)
    if not agent:
        raise HTTPException(404, f"Unknown agent: {agent_id}")
    return agent


def build_clone_url(repo_url: str, pat: str | None) -> str:
    if not pat:
        return repo_url
    # https://github.com/org/repo → https://<pat>@github.com/org/repo
    proto, rest = repo_url.split("://", 1)
    return f"{proto}://{pat}@{rest}"


def build_initial_message(clone_url: str, branch: str, task: str) -> str:
    return f"""First, set up the workspace:
1. git clone --branch {branch} {clone_url} /workspace/repo
2. cd /workspace/repo

Now perform the following task:

{task}

Write all output documents to /workspace/repo/.aire/ following AIRE conventions.
When complete, summarise what you did and list every file you created or modified."""


# ── Routes: Agents ────────────────────────────────────────────────────────────

@app.get("/api/agents", response_model=list[AgentConfig])
async def list_agents():
    return await get_roster()


@app.get("/api/agents/{agent_id}", response_model=AgentConfig)
async def get_agent(agent_id: str):
    return await find_agent(agent_id)


# ── Routes: Provisioning (one-time per agent) ─────────────────────────────────

@app.post("/api/provision/{agent_id}", response_model=ProvisionResult)
async def provision_agent(agent_id: str):
    """
    Registers an AIRE agent with Anthropic Managed Agents API.
    Call once per agent. Returns the Anthropic agent ID to store.
    """
    agent = await find_agent(agent_id)

    if agent["anthropic_agent_id"]:
        return ProvisionResult(
            anthropic_agent_id=agent["anthropic_agent_id"],
            hint="Already provisioned — ID retrieved from database.",
        )

    # Check if it already exists on Anthropic by name
    existing = await ac.list_agents()
    match = next((a for a in existing if a.get("name") == f"aire-{agent_id}"), None)
    if match:
        await db.save_agent_id(agent_id, match["id"])
        return ProvisionResult(
            anthropic_agent_id=match["id"],
            hint=f"Found existing agent on Anthropic. ID saved to database.",
        )

    # Load system prompt from prompts/ directory if available
    prompt_path = f"prompts/{agent_id}.md"
    try:
        with open(prompt_path) as f:
            system_prompt = f.read()
    except FileNotFoundError:
        system_prompt = (
            f"You are the AIRE {agent['name']} agent. {agent['description']}\n"
            "Follow AIRE conventions. Write findings to .aire/ in the working directory."
        )

    result = await ac.create_agent(
        name=f"aire-{agent_id}",
        model=agent["default_model"],
        system_prompt=system_prompt,
    )
    anthropic_agent_id = result["id"]
    await db.save_agent_id(agent_id, anthropic_agent_id)

    return ProvisionResult(
        anthropic_agent_id=anthropic_agent_id,
        hint=f"Agent provisioned. ID saved to database.",
    )


# ── Routes: Sessions ──────────────────────────────────────────────────────────

@app.get("/api/sessions")
async def list_sessions():
    return await db.list_sessions()


@app.get("/api/sessions/{session_id}")
async def get_session(session_id: str):
    session = await db.get_session(session_id)
    if not session:
        raise HTTPException(404, "Session not found")
    return session


@app.post("/api/sessions")
async def launch_session(req: LaunchSessionRequest):
    agent = await find_agent(req.agent_id)

    if not agent["anthropic_agent_id"]:
        raise HTTPException(
            400,
            f"Agent '{req.agent_id}' is not provisioned. "
            f"Call POST /api/provision/{req.agent_id} first."
        )

    # 1. Create a fresh environment for this session
    env_name = f"aire-{req.agent_id}-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}"
    env = await ac.create_environment(env_name)

    # 2. Create the Anthropic session
    anthropic_session = await ac.create_session(
        agent["anthropic_agent_id"], env["id"]
    )

    # 3. Persist locally
    local_id = uuid.uuid4().hex[:12]
    await db.insert_session({
        "id": local_id,
        "agent_id": agent["id"],
        "agent_name": agent["name"],
        "agent_icon": agent["icon"],
        "anthropic_session_id": anthropic_session["id"],
        "anthropic_environment_id": env["id"],
        "repo_url": req.repo_url,
        "repo_branch": req.repo_branch,
        "task": req.task,
        "status": "idle",
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    # 4. Fire the initial task in the background
    #    The /stream endpoint lets the client watch live output
    clone_url = build_clone_url(req.repo_url, req.github_pat)
    initial_message = build_initial_message(clone_url, req.repo_branch, req.task)

    asyncio.create_task(
        _run_initial_task(local_id, anthropic_session["id"], initial_message)
    )

    return {"id": local_id, "anthropic_session_id": anthropic_session["id"]}


async def _run_initial_task(local_id: str, anthropic_session_id: str, message: str):
    """Background task: sends the initial message and tracks completion."""
    await db.update_session_status(local_id, "running")
    try:
        # Drain the stream (the /stream endpoint handles live delivery to the browser)
        async for _ in ac.send_message_stream(anthropic_session_id, message):
            pass
        await db.update_session_status(local_id, "completed")
    except Exception as e:
        print(f"Session {local_id} failed: {e}")
        await db.update_session_status(local_id, "terminated")


# ── Routes: Streaming ─────────────────────────────────────────────────────────

@app.get("/api/sessions/{session_id}/stream")
async def stream_session(session_id: str):
    """
    SSE endpoint — proxies the live Anthropic event stream to the browser.
    The frontend connects here with EventSource.
    """
    session = await db.get_session(session_id)
    if not session:
        raise HTTPException(404, "Session not found")

    anthropic_session_id = session["anthropic_session_id"]

    async def event_generator() -> AsyncIterator[bytes]:
        # Send a connected ping first
        yield b"data: {\"type\": \"connected\"}\n\n"
        try:
            async for chunk in ac.send_message_stream(
                anthropic_session_id,
                # Empty message — just subscribe to the ongoing stream
                # In practice: re-send the task or subscribe to the session's event log
                "_stream_subscribe"
            ):
                yield chunk
        except Exception as e:
            yield f"data: {{\"type\": \"error\", \"message\": \"{e}\"}}\n\n".encode()

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


# ── Routes: Steer + Interrupt ─────────────────────────────────────────────────

@app.post("/api/sessions/{session_id}/steer")
async def steer_session(session_id: str, req: SteerRequest):
    session = await db.get_session(session_id)
    if not session:
        raise HTTPException(404, "Session not found")

    # Steer message — stream it but don't wait for completion
    asyncio.create_task(_send_steer(session["anthropic_session_id"], req.message))
    return {"status": "sent"}


async def _send_steer(anthropic_session_id: str, message: str):
    async for _ in ac.send_message_stream(anthropic_session_id, message):
        pass


@app.post("/api/sessions/{session_id}/interrupt")
async def interrupt_session(session_id: str):
    session = await db.get_session(session_id)
    if not session:
        raise HTTPException(404, "Session not found")

    await ac.interrupt_session(session["anthropic_session_id"])
    await db.update_session_status(session_id, "idle")
    return {"status": "interrupted"}
