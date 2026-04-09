from pydantic import BaseModel
from typing import Optional, Literal
from datetime import datetime


# ── Agent config (hardcoded roster — matches your AIRE agents) ────────────────

AGENT_ROSTER = [
    {
        "id": "archaeologist",
        "name": "Archaeologist",
        "icon": "🔍",
        "description": "Legacy code analyst. Discovers, counts, maps dependencies, documents findings in .aire/archaeology/.",
        "default_model": "claude-opus-4-6",
        "anthropic_agent_id": "",  # filled after provisioning
    },
    {
        "id": "architect",
        "name": "Architect",
        "icon": "🏛",
        "description": "Makes architecture decisions. Writes to .aire/decisions/.",
        "default_model": "claude-opus-4-6",
        "anthropic_agent_id": "",
    },
    {
        "id": "builder",
        "name": "Builder",
        "icon": "🔨",
        "description": "Implements features. Writes code, tests, and documentation.",
        "default_model": "claude-sonnet-4-6",
        "anthropic_agent_id": "",
    },
    {
        "id": "qa",
        "name": "QA",
        "icon": "✅",
        "description": "Validates implementations. Writes and runs tests.",
        "default_model": "claude-sonnet-4-6",
        "anthropic_agent_id": "",
    },
    {
        "id": "devops",
        "name": "DevOps",
        "icon": "🚀",
        "description": "CI/CD, infrastructure, deployment pipelines.",
        "default_model": "claude-sonnet-4-6",
        "anthropic_agent_id": "",
    },
]


# ── Pydantic models ───────────────────────────────────────────────────────────

class AgentConfig(BaseModel):
    id: str
    name: str
    icon: str
    description: str
    default_model: str
    anthropic_agent_id: str


SessionStatus = Literal["idle", "running", "completed", "terminated"]


class SessionRecord(BaseModel):
    id: str
    agent_id: str
    agent_name: str
    agent_icon: str
    anthropic_session_id: str
    anthropic_environment_id: str
    repo_url: str
    repo_branch: str
    task: str
    status: SessionStatus = "idle"
    created_at: datetime
    completed_at: Optional[datetime] = None


class LaunchSessionRequest(BaseModel):
    agent_id: str
    repo_url: str
    repo_branch: str = "main"
    github_pat: Optional[str] = None
    task: str


class SteerRequest(BaseModel):
    message: str


class ProvisionResult(BaseModel):
    anthropic_agent_id: str
    hint: str
