"""Fullscreen policy warnings are admin alerts, not disqualifications.

These checks use local fakes only; no shared competition data is changed.
"""

import asyncio
from contextlib import asynccontextmanager
from copy import deepcopy
from datetime import datetime, timezone

import httpx
import pytest
from pydantic import ValidationError

from app import security
from app.main import create_app
from app.schemas import ProctorEventRequest
from app.services import proctor


USER_ID = "00000000-0000-0000-0000-000000000001"


@pytest.fixture
def policy_db(monkeypatch):
    class Connection:
        def __init__(self):
            self.event_status = "live"
            self.profile = {"role": "participant", "approval_status": "approved"}
            self.participation = {
                "status": "playing", "current_round": 4,
                "round_pts": 250, "bonus_pts": 50, "total_pts": 300,
            }
            self.submissions = [{"round_no": 1, "code": "saved solution", "verdict": "accepted"}]
            self.statements = []
            self.recent_details = set()

        async def fetchrow(self, query, *args):
            if "public.profiles" in query:
                return self.profile
            assert query == "SELECT status, current_round FROM public.participations WHERE user_id = $1::uuid"
            assert args == (USER_ID,)
            return self.participation

        async def fetchval(self, query, *args):
            assert "SELECT 1 FROM public.proctor_events" in query
            assert args[:3] == (USER_ID, "RISK_CHEATING", 3.0)
            assert "AND detail = $4" in query
            return 1 if args[3] in self.recent_details else None

        async def execute(self, query, *args):
            assert query.startswith("INSERT INTO public.proctor_events ")
            self.statements.append((query, args))
            self.recent_details.add(args[4])
            return "INSERT 0 1"

    conn = Connection()

    @asynccontextmanager
    async def acquire():
        yield conn

    async def get_event():
        return {"status": conn.event_status}

    monkeypatch.setattr(proctor.db, "acquire", acquire)
    monkeypatch.setattr(proctor.db, "transaction", acquire)
    monkeypatch.setattr(proctor.event_service, "get_event", get_event)
    return conn


def test_policy_risk_records_current_round_without_changing_participation(policy_db):
    before_participation = deepcopy(policy_db.participation)
    before_submissions = deepcopy(policy_db.submissions)
    asyncio.run(proctor.report(USER_ID, "RISK_CHEATING", None))

    assert len(policy_db.statements) == 1
    _, args = policy_db.statements[0]
    assert args == (
        USER_ID, "RISK_CHEATING", "high", 4,
        "Competition screen policy warning displayed. Organizer review required.",
    )
    assert policy_db.participation == before_participation
    assert policy_db.submissions == before_submissions


@pytest.mark.parametrize("event_status,participant_status", [
    ("lobby", "playing"), ("ended", "playing"),
    ("live", "joined"), ("live", "finished"),
])
def test_policy_risk_is_ignored_outside_a_live_active_run(policy_db, event_status, participant_status):
    policy_db.event_status = event_status
    policy_db.participation["status"] = participant_status
    asyncio.run(proctor.report(USER_ID, "RISK_CHEATING", None))
    assert not policy_db.statements


def test_policy_risk_is_ignored_without_participation(policy_db):
    policy_db.participation = None
    asyncio.run(proctor.report(USER_ID, "RISK_CHEATING", None))
    assert not policy_db.statements


def test_duplicate_policy_report_is_deduplicated(policy_db):
    async def check():
        await proctor.report(USER_ID, "RISK_CHEATING", None)
        await proctor.report(USER_ID, "RISK_CHEATING", None)

    asyncio.run(check())
    assert len(policy_db.statements) == 1
    assert policy_db.participation["status"] == "playing"


def test_focus_and_fullscreen_warnings_are_separate_admin_incidents(policy_db):
    async def check():
        await proctor.report(USER_ID, "RISK_CHEATING", None, risk_reason="focus")
        await proctor.report(USER_ID, "RISK_CHEATING", None, risk_reason="fullscreen")
        await proctor.report(USER_ID, "RISK_CHEATING", None, risk_reason="fullscreen")

    asyncio.run(check())
    assert len(policy_db.statements) == 2
    details = [args[4] for _, args in policy_db.statements]
    assert "lost focus" in details[0]
    assert "Fullscreen exited" in details[1]
    assert policy_db.participation["status"] == "playing"


def test_policy_risk_serializes_in_admin_feed():
    alert = proctor._alert({
        "id": 1, "type": "RISK_CHEATING", "severity": "high", "round_no": 4,
        "full_name": "Policy Test Player", "player_no": 9,
        "created_at": datetime(2026, 10, 3, tzinfo=timezone.utc),
        "detail": proctor._detail("RISK_CHEATING", None), "acknowledged": False,
    })
    assert alert.type == "RISK_CHEATING" and alert.severity == "high"
    assert alert.player_id == "CAD-0009" and alert.round == 4
    assert "review required" in alert.detail
    assert not alert.acknowledged


@pytest.mark.parametrize("reason,detail_fragment", [
    ("fullscreen", "Fullscreen exited"),
    ("focus", "lost focus"),
    ("visibility", "became hidden"),
    ("navigation", "attempted to leave"),
    (None, "screen policy warning"),
])
def test_policy_risk_endpoint_accepts_authenticated_approved_participant(policy_db, reason, detail_fragment):
    app = create_app()
    # Database role / approval still apply even when the token role claim is stale.
    app.dependency_overrides[security.optional_user] = lambda: security.AuthUser(USER_ID, None, "admin")

    async def check():
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
            body = {"type": "RISK_CHEATING"}
            if reason is not None:
                body["riskReason"] = reason
            response = await client.post("/api/proctor/events", json=body)
            assert response.status_code == 204

    asyncio.run(check())
    assert len(policy_db.statements) == 1
    assert detail_fragment in policy_db.statements[0][1][4]
    assert policy_db.participation["status"] == "playing"


@pytest.mark.parametrize("profile,expected_status", [
    ({"role": "admin", "approval_status": "approved"}, 403),
    ({"role": "participant", "approval_status": "pending"}, 403),
    ({"role": "participant", "approval_status": "rejected"}, 403),
    (None, 403),
])
def test_policy_risk_endpoint_keeps_account_access_rules(policy_db, profile, expected_status):
    policy_db.profile = profile
    app = create_app()
    app.dependency_overrides[security.optional_user] = lambda: security.AuthUser(USER_ID, None, "participant")

    async def check():
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post("/api/proctor/events", json={"type": "RISK_CHEATING"})
            assert response.status_code == expected_status

    asyncio.run(check())
    assert not policy_db.statements


def test_policy_risk_endpoint_requires_authentication(policy_db):
    app = create_app()
    app.dependency_overrides[security.optional_user] = lambda: None

    async def check():
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post("/api/proctor/events", json={"type": "RISK_CHEATING"})
            assert response.status_code == 401

    asyncio.run(check())
    assert not policy_db.statements


def test_unknown_policy_type_is_rejected():
    with pytest.raises(ValidationError):
        ProctorEventRequest(type="DISQUALIFIED")


@pytest.mark.parametrize("reason", ["confirmed cheating by participant", "leave_anyway"])
def test_unsupported_policy_reason_is_rejected(reason):
    with pytest.raises(ValidationError):
        ProctorEventRequest(type="RISK_CHEATING", riskReason=reason)


def test_non_risk_report_uses_existing_detail_and_deduplication():
    class Connection:
        async def fetchval(self, query, *args):
            assert "detail =" not in query
            assert args == (USER_ID, "TAB_SWITCH", 3.0)
            return None

        async def execute(self, query, *args):
            assert args == (USER_ID, "TAB_SWITCH", "medium", 4, "Tab lost focus for 12s")

    assert asyncio.run(proctor.record(Connection(), USER_ID, "TAB_SWITCH", 4, seconds=12))
    assert proctor._detail("TAB_SWITCH", 12, risk_reason="focus") == "Tab lost focus for 12s"
