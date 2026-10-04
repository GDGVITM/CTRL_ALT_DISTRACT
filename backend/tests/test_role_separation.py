"""Admin accounts cannot enter player APIs, including with stale JWT role claims."""

import asyncio
from contextlib import asynccontextmanager
from unittest.mock import AsyncMock

import httpx
import pytest

from app import security
from app.errors import ApiError
from app.main import create_app
from app.schemas import MeResponse
from app.services import arena, people, proctor

USER_ID = "00000000-0000-0000-0000-000000000001"

PLAYER_REQUESTS = [
    ("POST", "/api/participant/join", None),
    ("POST", "/api/participant/leave", None),
    ("GET", "/api/lobby", None),
    ("GET", "/api/results/me", None),
    ("POST", "/api/proctor/events", {"type": "TAB_SWITCH", "seconds": 1}),
    ("GET", "/api/arena/state", None),
    ("POST", "/api/arena/start", None),
    ("GET", "/api/arena/questions", None),
    ("POST", "/api/arena/select", {"round": 1}),
    ("POST", "/api/arena/exit", None),
    ("GET", "/api/arena/problem", None),
    ("POST", "/api/arena/run", {"language": "python", "code": "print(1)", "round": 1}),
    ("POST", "/api/arena/submit", {"language": "python", "code": "print(1)", "round": 1}),
    ("POST", "/api/arena/distraction/start", {"round": 1}),
    ("POST", "/api/arena/distraction/resolve", {"round": 1, "result": "passed", "timeTaken": 1}),
]


def account(monkeypatch, profile):
    class Connection:
        async def fetchrow(self, query, *args):
            return profile

        async def fetchval(self, query, *args):
            return profile["role"] if profile else None

    @asynccontextmanager
    async def acquire():
        yield Connection()

    monkeypatch.setattr(security.db, "acquire", acquire)
    security._admin_cache.clear()


@pytest.mark.parametrize("method,url,body", PLAYER_REQUESTS)
def test_admin_cannot_reach_any_player_operation(monkeypatch, method, url, body):
    account(monkeypatch, {"role": "admin", "approval_status": "approved"})
    spies = []
    for module, names in [
        (arena, ["join", "leave", "results", "get_state", "start_or_advance", "questions", "select_question",
                 "exit_challenge", "current_problem", "run", "submit", "distraction_start", "distraction_resolve"]),
        (people, ["lobby"]),
        (proctor, ["report"]),
    ]:
        for name in names:
            spy = AsyncMock(side_effect=AssertionError("Player handler must not run for an admin"))
            monkeypatch.setattr(module, name, spy)
            spies.append(spy)

    app = create_app()
    # A JWT still claiming participant cannot bypass the current database role.
    app.dependency_overrides[security.optional_user] = lambda: security.AuthUser(USER_ID, None, "participant")

    async def check():
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
            response = await client.request(method, url, json=body)
            assert response.status_code == 403
            assert response.json()["error"] == "participant_only"
        for spy in spies:
            spy.assert_not_awaited()

    asyncio.run(check())


@pytest.mark.parametrize("role,status,code", [
    ("participant", "pending", "approval_pending"),
    ("participant", "rejected", "account_rejected"),
    ("admin", "pending", "participant_only"),
])
def test_player_guard_preserves_approval_and_role_rules(monkeypatch, role, status, code):
    account(monkeypatch, {"role": role, "approval_status": status})
    with pytest.raises(ApiError) as exc:
        asyncio.run(security.require_participant(security.AuthUser(USER_ID, None, "admin")))
    assert exc.value.status == 403 and exc.value.code == code


def test_role_promotion_blocks_the_next_request_without_a_new_token(monkeypatch):
    profile = {"role": "participant", "approval_status": "approved"}
    account(monkeypatch, profile)
    user = security.AuthUser(USER_ID, None, "participant")
    assert asyncio.run(security.require_participant(user)) == user
    profile["role"] = "admin"
    with pytest.raises(ApiError) as exc:
        asyncio.run(security.require_participant(user))
    assert exc.value.code == "participant_only"


def test_missing_profile_and_session_fail_closed(monkeypatch):
    account(monkeypatch, None)
    with pytest.raises(ApiError) as exc:
        asyncio.run(security.require_participant(security.AuthUser(USER_ID, None, "participant")))
    assert exc.value.code == "account_unavailable"
    with pytest.raises(ApiError) as exc:
        asyncio.run(security.require_participant(None))
    assert exc.value.status == 401


def test_approved_participant_can_still_join(monkeypatch):
    account(monkeypatch, {"role": "participant", "approval_status": "approved"})
    join = AsyncMock()
    monkeypatch.setattr(arena, "join", join)
    app = create_app()
    # Authorization uses the database even if a token's role claim is stale.
    app.dependency_overrides[security.optional_user] = lambda: security.AuthUser(USER_ID, None, "admin")

    async def check():
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
            assert (await client.post("/api/participant/join")).status_code == 204
        join.assert_awaited_once_with(USER_ID)

    asyncio.run(check())


def test_admin_keeps_console_and_shared_profile_access(monkeypatch):
    account(monkeypatch, {"role": "admin", "approval_status": "approved"})
    me = MeResponse(id=USER_ID, email=None, full_name="Admin", role="admin", player_code="CAD-0001", participation=None)
    monkeypatch.setattr(people, "me", AsyncMock(return_value=me))
    monkeypatch.setattr(people, "admin_overview", AsyncMock(return_value={
        "status": "live", "started_at": None, "ended_at": None, "server_time": 1,
        "players": 1, "playing": 1, "finished": 0, "open_alerts": 0, "high_open_alerts": 0,
    }))
    app = create_app()
    app.dependency_overrides[security.optional_user] = lambda: security.AuthUser(USER_ID, None, "participant")

    async def check():
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
            profile = await client.get("/api/me")
            assert profile.status_code == 200 and profile.json()["participation"] is None
            assert (await client.get("/api/admin/overview")).status_code == 200

    asyncio.run(check())
