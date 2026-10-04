"""Opt-in real SQL checks for fullscreen policy alerts, using temporary tables only.

Run with RUN_POLICY_DB_TESTS=1. The proctor event CHECK is copied from the deployed
schema; all service reads/writes are redirected to pg_temp and use a private sequence.
No shared participant, score, submission, or proctor event rows are changed.
"""

import os
import re
from contextlib import asynccontextmanager

import asyncpg
import httpx
import pytest
import pytest_asyncio

from app import security
from app.config import get_settings
from app.main import create_app
from app.services import proctor


pytestmark = pytest.mark.skipif(
    os.environ.get("RUN_POLICY_DB_TESTS") != "1",
    reason="Opt-in: needs configured PostgreSQL, uses only temporary tables",
)

USER_ID = "00000000-0000-0000-0000-000000000101"


class TemporaryConnection:
    tables = {"profiles", "participations", "proctor_events"}

    def __init__(self, conn):
        self.conn = conn
        self.statements = []

    def sql(self, query):
        def replace(match):
            name = match.group(1)
            assert name in self.tables, f"Unexpected shared table access: {name}"
            return f"pg_temp.{name}"

        rewritten = re.sub(r"public\.([a-z_]+)", replace, query)
        assert "public." not in rewritten
        self.statements.append(rewritten)
        return rewritten

    async def fetch(self, query, *args):
        return await self.conn.fetch(self.sql(query), *args)

    async def fetchrow(self, query, *args):
        return await self.conn.fetchrow(self.sql(query), *args)

    async def fetchval(self, query, *args):
        return await self.conn.fetchval(self.sql(query), *args)

    async def execute(self, query, *args):
        return await self.conn.execute(self.sql(query), *args)


@pytest_asyncio.fixture
async def isolated_policy_db(monkeypatch):
    settings = get_settings()
    conn = await asyncpg.connect(
        settings.database_url,
        ssl="require" if "supabase" in settings.database_url else None,
        statement_cache_size=0,
        command_timeout=30,
    )
    proxy = TemporaryConnection(conn)
    try:
        await conn.execute(
            "CREATE TEMP TABLE profiles (id UUID PRIMARY KEY, full_name TEXT, player_no INTEGER, "
            "role TEXT, approval_status TEXT)"
        )
        await conn.execute(
            "CREATE TEMP TABLE participations (user_id UUID PRIMARY KEY, status TEXT, current_round INTEGER, "
            "round_pts INTEGER, bonus_pts INTEGER, total_pts INTEGER)"
        )
        # Copy deployed validation, but omit defaults: the shared BIGSERIAL sequence must not be used.
        await conn.execute("CREATE TEMP TABLE proctor_events (LIKE public.proctor_events INCLUDING CONSTRAINTS)")
        await conn.execute("ALTER TABLE pg_temp.proctor_events ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY")
        await conn.execute("ALTER TABLE pg_temp.proctor_events ALTER COLUMN acknowledged SET DEFAULT FALSE")
        await conn.execute("ALTER TABLE pg_temp.proctor_events ALTER COLUMN dismissed SET DEFAULT FALSE")
        await conn.execute("ALTER TABLE pg_temp.proctor_events ALTER COLUMN created_at SET DEFAULT NOW()")
        await conn.execute(
            "INSERT INTO pg_temp.profiles (id, full_name, player_no, role, approval_status) "
            "VALUES ($1::uuid, 'Policy SQL Test Player', 101, 'participant', 'approved')",
            USER_ID,
        )
        await conn.execute(
            "INSERT INTO pg_temp.participations (user_id, status, current_round, round_pts, bonus_pts, total_pts) "
            "VALUES ($1::uuid, 'playing', 4, 250, 50, 300)",
            USER_ID,
        )

        @asynccontextmanager
        async def acquire():
            yield proxy

        @asynccontextmanager
        async def transaction():
            async with conn.transaction():
                yield proxy

        async def get_event():
            return {"status": "live"}

        monkeypatch.setattr(proctor.db, "acquire", acquire)
        monkeypatch.setattr(proctor.db, "transaction", transaction)
        monkeypatch.setattr(proctor.event_service, "get_event", get_event)
        yield proxy
    finally:
        # Closing this dedicated connection removes all temporary rows and its private identity sequence.
        await conn.close()


@pytest.mark.asyncio
async def test_policy_alert_constraint_deduplication_and_admin_feed(isolated_policy_db):
    database = isolated_policy_db
    before = dict(await database.fetchrow("SELECT * FROM public.participations WHERE user_id=$1::uuid", USER_ID))
    app = create_app()
    app.dependency_overrides[security.optional_user] = lambda: security.AuthUser(USER_ID, None, "participant")

    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        for reason in ("focus", "fullscreen", "focus"):
            response = await client.post("/api/proctor/events", json={"type": "RISK_CHEATING", "riskReason": reason})
            assert response.status_code == 204

    stored = await database.fetch("SELECT * FROM public.proctor_events ORDER BY id")
    assert len(stored) == 2
    assert [row["id"] for row in stored] == [1, 2]  # IDs come from this temporary table's private sequence.
    assert all(row["type"] == "RISK_CHEATING" and row["severity"] == "high" and row["round_no"] == 4 for row in stored)
    assert "lost focus" in stored[0]["detail"] and "Fullscreen exited" in stored[1]["detail"]

    after = dict(await database.fetchrow("SELECT * FROM public.participations WHERE user_id=$1::uuid", USER_ID))
    assert after == before
    alerts = await proctor.list_alerts()
    assert len(alerts) == 2
    assert all(alert.type == "RISK_CHEATING" and alert.severity == "high" and alert.round == 4 for alert in alerts)
    assert all(alert.player_id == "CAD-0101" for alert in alerts)
    assert all("public." not in statement for statement in database.statements)

    # The copied deployed CHECK still rejects unknown event kinds.
    with pytest.raises(asyncpg.CheckViolationError):
        async with database.conn.transaction():
            await database.execute(
                "INSERT INTO public.proctor_events (user_id, type, severity, round_no, detail) "
                "VALUES ($1::uuid, 'INVALID_POLICY_EVENT', 'high', 4, 'Invalid fixture')",
                USER_ID,
            )
