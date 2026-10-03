"""Email disclosure follows current database approval, including cached rankings."""

import asyncio
from contextlib import asynccontextmanager
from types import SimpleNamespace

import httpx
import pytest
from fastapi import FastAPI

from app import security
from app.routers import public
from app.services import event, people

VIEWER_ID = "00000000-0000-0000-0000-000000000001"


@pytest.fixture
def board(monkeypatch):
    state = SimpleNamespace(
        profile={"role": "participant", "approval_status": "approved"},
        ranking_reads=0,
        profile_reads=0,
        rows=[
            {"rank": rank, "user_id": f"00000000-0000-0000-0000-{rank:012d}",
             "full_name": "Same Name", "email": email, "player_no": rank,
             "round_pts": 100, "bonus_pts": 0, "total_pts": 100,
             "total_time_ms": rank * 1000}
            for rank, email in enumerate(
                ["first.player@college.example", "second.player@college.example"], start=1
            )
        ],
    )

    class Connection:
        async def fetch(self, query):
            assert "p.email" in query
            assert "p.role = 'participant'" in query
            state.ranking_reads += 1
            return [row.copy() for row in state.rows]

        async def fetchrow(self, query, viewer_id):
            assert "approval_status" in query and "public.profiles" in query
            assert viewer_id == VIEWER_ID
            state.profile_reads += 1
            return state.profile.copy() if state.profile else None

    @asynccontextmanager
    async def acquire():
        yield Connection()

    async def get_event():
        return {"status": "live"}

    monkeypatch.setattr(people.db, "acquire", acquire)
    monkeypatch.setattr(event, "get_event", get_event)
    monkeypatch.setattr(people, "_leaderboard_cache", None)
    monkeypatch.setattr(people, "_LEADERBOARD_TTL_S", 60.0)
    return state


@pytest.mark.parametrize("profile,allowed", [
    ({"role": "participant", "approval_status": "approved"}, True),
    ({"role": "admin", "approval_status": "pending"}, True),
    ({"role": "participant", "approval_status": "pending"}, False),
    ({"role": "participant", "approval_status": "rejected"}, False),
    ({"role": "unknown", "approval_status": "approved"}, False),
    (None, False),
])
def test_only_approved_participants_and_admins_receive_emails(board, profile, allowed):
    board.profile = profile
    result = asyncio.run(people.leaderboard(VIEWER_ID, None))
    assert [entry.email for entry in result.entries] == (
        [row["email"] for row in board.rows] if allowed else [None, None]
    )
    assert result.total == 2
    assert [entry.name for entry in result.entries] == ["Same Name", "Same Name"]
    assert [entry.total for entry in result.entries] == [100, 100]
    assert [entry.self for entry in result.entries] == [True, False]
    assert result.entries[0].id != result.entries[1].id


@pytest.mark.parametrize("first_viewer", [VIEWER_ID, None])
def test_shared_ranking_cache_does_not_share_email_visibility(board, first_viewer):
    async def check():
        await people.leaderboard(first_viewer, None)
        guest = await people.leaderboard(None, 1)
        approved = await people.leaderboard(VIEWER_ID, None)
        assert guest.total == 2 and len(guest.entries) == 1
        assert guest.entries[0].email is None and not guest.entries[0].self
        assert [entry.email for entry in approved.entries] == [row["email"] for row in board.rows]
        assert board.ranking_reads == 1

    asyncio.run(check())


def test_revoked_approval_or_role_hides_emails_on_next_cached_request(board):
    async def check():
        assert (await people.leaderboard(VIEWER_ID, None)).entries[0].email
        board.profile["approval_status"] = "rejected"
        assert all(entry.email is None for entry in (await people.leaderboard(VIEWER_ID, None)).entries)
        board.profile.update(role="admin", approval_status="pending")
        assert (await people.leaderboard(VIEWER_ID, None)).entries[0].email
        board.profile["role"] = "participant"
        assert all(entry.email is None for entry in (await people.leaderboard(VIEWER_ID, None)).entries)
        assert board.ranking_reads == 1 and board.profile_reads == 4

    asyncio.run(check())


def test_missing_player_email_is_supported(board):
    board.rows[0]["email"] = None
    result = asyncio.run(people.leaderboard(VIEWER_ID, None))
    assert result.entries[0].email is None
    assert result.entries[1].email == board.rows[1]["email"]


def test_api_redacts_emails_ignores_stale_role_claim_and_prevents_browser_caching(board):
    app = FastAPI()
    app.include_router(public.router)
    viewer = security.AuthUser(VIEWER_ID, "untrusted@claim.example", "admin")
    app.dependency_overrides[security.optional_user] = lambda: viewer

    async def check():
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
            approved = await client.get("/api/leaderboard")
            assert approved.status_code == 200
            assert approved.headers["cache-control"] == "private, no-store"
            assert approved.json()["entries"][0]["email"] == board.rows[0]["email"]
            board.profile["approval_status"] = "pending"
            pending = await client.get("/api/leaderboard")
            assert pending.status_code == 200
            assert all(entry["email"] is None for entry in pending.json()["entries"])
            app.dependency_overrides[security.optional_user] = lambda: None
            guest = await client.get("/api/leaderboard")
            assert guest.status_code == 200
            assert guest.headers["cache-control"] == "private, no-store"
            assert all(entry["email"] is None for entry in guest.json()["entries"])
            assert "@" not in guest.text

    asyncio.run(check())
