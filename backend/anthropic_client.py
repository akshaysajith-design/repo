"""
Thin async client for the Anthropic Managed Agents API.
Docs: https://platform.claude.com/docs/en/managed-agents/overview
"""
import httpx
from typing import AsyncIterator
from config import settings

HEADERS = {
    "x-api-key": settings.anthropic_api_key,
    "anthropic-version": settings.anthropic_version,
    "anthropic-beta": settings.anthropic_beta,
    "content-type": "application/json",
}

BASE = settings.anthropic_base_url


# ── Agents ────────────────────────────────────────────────────────────────────

async def create_agent(name: str, model: str, system_prompt: str) -> dict:
    async with httpx.AsyncClient() as client:
        r = await client.post(f"{BASE}/v1/agents", headers=HEADERS, json={
            "name": name,
            "model": model,
            "system_prompt": system_prompt,
            "tools": [
                {"type": "bash"},
                {"type": "text_editor_20241022"},
            ],
        })
        r.raise_for_status()
        return r.json()


async def list_agents() -> list[dict]:
    async with httpx.AsyncClient() as client:
        r = await client.get(f"{BASE}/v1/agents", headers=HEADERS)
        r.raise_for_status()
        return r.json().get("data", [])


# ── Environments ──────────────────────────────────────────────────────────────

async def create_environment(name: str) -> dict:
    async with httpx.AsyncClient() as client:
        r = await client.post(f"{BASE}/v1/environments", headers=HEADERS, json={
            "name": name,
            "config": {
                "type": "cloud",
                "networking": {"type": "unrestricted"},
            },
        })
        r.raise_for_status()
        return r.json()


# ── Sessions ──────────────────────────────────────────────────────────────────

async def create_session(anthropic_agent_id: str, environment_id: str) -> dict:
    async with httpx.AsyncClient() as client:
        r = await client.post(f"{BASE}/v1/sessions", headers=HEADERS, json={
            "agent": anthropic_agent_id,
            "environment_id": environment_id,
        })
        r.raise_for_status()
        return r.json()


async def get_session_status(anthropic_session_id: str) -> dict:
    async with httpx.AsyncClient() as client:
        r = await client.get(f"{BASE}/v1/sessions/{anthropic_session_id}", headers=HEADERS)
        r.raise_for_status()
        return r.json()


# ── Events ────────────────────────────────────────────────────────────────────

async def send_message_stream(
    anthropic_session_id: str,
    message: str,
) -> AsyncIterator[bytes]:
    """
    Sends a user message with stream=True.
    Yields raw SSE bytes from Anthropic — caller writes them to the HTTP response.
    """
    payload = {
        "stream": True,
        "events": [
            {
                "type": "user.message",
                "content": [{"type": "text", "text": message}],
            }
        ],
    }
    async with httpx.AsyncClient(timeout=None) as client:
        async with client.stream(
            "POST",
            f"{BASE}/v1/sessions/{anthropic_session_id}/events",
            headers=HEADERS,
            json=payload,
        ) as response:
            response.raise_for_status()
            async for chunk in response.aiter_bytes():
                yield chunk


async def interrupt_session(anthropic_session_id: str) -> dict:
    async with httpx.AsyncClient() as client:
        r = await client.post(
            f"{BASE}/v1/sessions/{anthropic_session_id}/events",
            headers=HEADERS,
            json={
                "stream": False,
                "events": [{"type": "user.interrupt"}],
            },
        )
        r.raise_for_status()
        return r.json()
