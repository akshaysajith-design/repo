import aiosqlite
from config import settings

DB = settings.database_path


async def init_db():
    async with aiosqlite.connect(DB) as conn:
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS sessions (
                id                      TEXT PRIMARY KEY,
                agent_id                TEXT NOT NULL,
                agent_name              TEXT NOT NULL,
                agent_icon              TEXT NOT NULL,
                anthropic_session_id    TEXT NOT NULL,
                anthropic_environment_id TEXT NOT NULL,
                repo_url                TEXT NOT NULL,
                repo_branch             TEXT NOT NULL,
                task                    TEXT NOT NULL,
                status                  TEXT NOT NULL DEFAULT 'idle',
                created_at              TEXT NOT NULL,
                completed_at            TEXT
            )
        """)
        # Store provisioned agent IDs so they survive restarts
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS agent_ids (
                agent_id            TEXT PRIMARY KEY,
                anthropic_agent_id  TEXT NOT NULL
            )
        """)
        await conn.commit()


async def insert_session(s: dict):
    async with aiosqlite.connect(DB) as conn:
        await conn.execute("""
            INSERT INTO sessions
                (id, agent_id, agent_name, agent_icon, anthropic_session_id,
                 anthropic_environment_id, repo_url, repo_branch, task, status, created_at)
            VALUES
                (:id, :agent_id, :agent_name, :agent_icon, :anthropic_session_id,
                 :anthropic_environment_id, :repo_url, :repo_branch, :task, :status, :created_at)
        """, s)
        await conn.commit()


async def update_session_status(session_id: str, status: str):
    async with aiosqlite.connect(DB) as conn:
        from datetime import datetime, timezone
        completed_at = datetime.now(timezone.utc).isoformat() \
            if status in ("completed", "terminated") else None
        await conn.execute(
            "UPDATE sessions SET status = ?, completed_at = ? WHERE id = ?",
            (status, completed_at, session_id)
        )
        await conn.commit()


async def list_sessions(limit: int = 50) -> list[dict]:
    async with aiosqlite.connect(DB) as conn:
        conn.row_factory = aiosqlite.Row
        async with conn.execute(
            "SELECT * FROM sessions ORDER BY created_at DESC LIMIT ?", (limit,)
        ) as cur:
            rows = await cur.fetchall()
            return [dict(r) for r in rows]


async def get_session(session_id: str) -> dict | None:
    async with aiosqlite.connect(DB) as conn:
        conn.row_factory = aiosqlite.Row
        async with conn.execute(
            "SELECT * FROM sessions WHERE id = ?", (session_id,)
        ) as cur:
            row = await cur.fetchone()
            return dict(row) if row else None


async def save_agent_id(agent_id: str, anthropic_agent_id: str):
    async with aiosqlite.connect(DB) as conn:
        await conn.execute(
            "INSERT OR REPLACE INTO agent_ids (agent_id, anthropic_agent_id) VALUES (?, ?)",
            (agent_id, anthropic_agent_id)
        )
        await conn.commit()


async def get_agent_ids() -> dict[str, str]:
    async with aiosqlite.connect(DB) as conn:
        conn.row_factory = aiosqlite.Row
        async with conn.execute("SELECT agent_id, anthropic_agent_id FROM agent_ids") as cur:
            rows = await cur.fetchall()
            return {r["agent_id"]: r["anthropic_agent_id"] for r in rows}
