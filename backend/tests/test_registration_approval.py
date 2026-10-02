"""Approval enforcement and admin review contracts, without a live database."""

import asyncio
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from uuid import UUID

import httpx
import pytest

from app import security
from app.errors import ApiError
from app.main import create_app
from app.services import registrations

USER_ID = "00000000-0000-0000-0000-000000000001"
ADMIN_ID = "00000000-0000-0000-0000-000000000002"


def run(coro):
    return asyncio.run(coro)


def connection(monkeypatch, profile):
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


@pytest.mark.parametrize("status,code", [("pending", "approval_pending"), ("rejected", "account_rejected")])
def test_unapproved_stale_tokens_are_blocked(monkeypatch, status, code):
    connection(monkeypatch, {"role": "participant", "approval_status": status})
    # Even a token claiming admin cannot override the authoritative profile.
    user = security.AuthUser(USER_ID, "player@example.com", "admin")
    with pytest.raises(ApiError) as exc:
        run(security.current_user(user))
    assert exc.value.status == 403 and exc.value.code == code


@pytest.mark.parametrize("role", ["participant", "admin"])
def test_approved_accounts_keep_access(monkeypatch, role):
    connection(monkeypatch, {"role": role, "approval_status": "approved"})
    user = security.AuthUser(USER_ID, "player@example.com", role)
    assert run(security.current_user(user)) == user


def test_missing_profile_fails_closed(monkeypatch):
    connection(monkeypatch, None)
    with pytest.raises(ApiError) as exc:
        run(security.current_user(security.AuthUser(USER_ID, None, "admin")))
    assert exc.value.code == "account_unavailable"


def test_no_session_is_unauthorized():
    with pytest.raises(ApiError) as exc:
        run(security.current_user(None))
    assert exc.value.status == 401


@pytest.mark.parametrize("user,status,code", [
    (None, 401, "unauthorized"),
    (security.AuthUser(USER_ID, None, "participant"), 403, "forbidden"),
])
def test_non_admin_cannot_list_or_review_registrations(monkeypatch, user, status, code):
    connection(monkeypatch, {"role": "participant", "approval_status": "approved"})
    app = create_app()
    app.dependency_overrides[security.optional_user] = lambda: user

    async def check():
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
            for method, url, body in [
                ("GET", "/api/admin/registrations", None),
                ("POST", f"/api/admin/registrations/{USER_ID}/review", {"decision": "approved"}),
                ("POST", "/api/admin/registrations/approve", {"allPending": True}),
            ]:
                response = await client.request(method, url, json=body)
                assert response.status_code == status and response.json()["error"] == code

    run(check())


def test_admin_review_validates_target_and_decision(monkeypatch):
    connection(monkeypatch, {"role": "admin", "approval_status": "approved"})
    app = create_app()
    app.dependency_overrides[security.optional_user] = lambda: security.AuthUser(ADMIN_ID, None, "admin")

    async def check():
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
            for target, decision in [("not-a-uuid", "approved"), (USER_ID, "admin"), (USER_ID, "pending")]:
                response = await client.post(f"/api/admin/registrations/{target}/review", json={"decision": decision})
                assert response.status_code == 422
            assert (await client.get("/api/admin/registrations?status=unknown")).status_code == 422
            assert (await client.get("/api/admin/registrations?limit=101")).status_code == 422
            for body in [{}, {"ids": ["invalid"]}, {"allPending": True, "ids": [USER_ID]},
                         {"ids": [USER_ID], "excludedIds": [USER_ID]}, {"allPending": True, "search": "x" * 101}]:
                assert (await client.post("/api/admin/registrations/approve", json=body)).status_code == 422

    run(check())


@pytest.mark.parametrize("decision", ["approved", "rejected"])
def test_review_records_reviewer_and_rejects_a_second_decision(monkeypatch, decision):
    row = {
        "id": UUID(USER_ID), "full_name": "New Player", "email": "new@example.com",
        "approval_status": "pending", "created_at": datetime.now(timezone.utc), "reviewed_at": None,
    }

    class Connection:
        async def fetchrow(self, query, *args):
            if query.startswith("SELECT"):
                assert "FOR UPDATE" in query and "role = 'participant'" in query
            else:
                assert args[1] == decision and args[2] == ADMIN_ID
                row["approval_status"] = decision
                row["reviewed_at"] = datetime.now(timezone.utc)
            return row

    @asynccontextmanager
    async def transaction():
        yield Connection()

    monkeypatch.setattr(registrations.db, "transaction", transaction)

    async def check():
        result = await registrations.review_registration(UUID(USER_ID), ADMIN_ID, decision)
        assert result.approval_status == decision and result.reviewed_at is not None
        with pytest.raises(ApiError) as exc:
            await registrations.review_registration(UUID(USER_ID), ADMIN_ID, "rejected")
        assert exc.value.status == 409 and exc.value.code == "already_reviewed"

    run(check())
