"""Live approval flow against configured Supabase, without changing event data.

Run: python -m tests.live_registration_check
Creates isolated test accounts and removes those exact accounts in finally.
No existing admin credentials or Judge0 requests are used.
"""

import asyncio
import os
import secrets
import uuid

import httpx
from dotenv import dotenv_values

from app.cli import make_admin
from app.config import BACKEND_DIR, get_settings
from app.db import db
from app.main import create_app


async def main():
    env = dotenv_values(BACKEND_DIR / ".env")
    anon_key = os.environ.get("SUPABASE_ANON_KEY") or env.get("SUPABASE_ANON_KEY")
    if not anon_key:
        raise RuntimeError("SUPABASE_ANON_KEY is required for the live registration check")
    url = get_settings().supabase_url.rstrip("/") + "/auth/v1"
    prefix = "approval-check-" + uuid.uuid4().hex[:12]
    users = {}
    emails = []
    password = secrets.token_urlsafe(24)
    await db.connect()
    try:
        async with httpx.AsyncClient(timeout=30, headers={"apikey": anon_key}) as auth:
            bulk_names = [f"bulk{i:02}" for i in range(23)]
            for name in ["admin", "approve", "reject", "race", *bulk_names]:
                email = f"{prefix}-{name}@example.com"
                emails.append(email)
                response = await auth.post(url + "/signup", json={
                    "email": email, "password": password,
                    "data": {"full_name": f"{prefix} {name}", "role": "admin", "approval_status": "approved"},
                })
                assert response.status_code == 200, f"Signup failed ({response.status_code})"
                data = response.json()
                user = data.get("user") or data
                users[name] = {"id": user["id"], "email": email, "token": data.get("access_token")}
                async with db.acquire() as conn:
                    row = await conn.fetchrow(
                        """SELECT p.role::text AS role, p.approval_status, u.banned_until > now() AS blocked
                           FROM public.profiles p JOIN auth.users u ON u.id = p.id WHERE p.id = $1::uuid""",
                        user["id"],
                    )
                assert dict(row) == {"role": "participant", "approval_status": "pending", "blocked": True}
                login = await auth.post(url + "/token?grant_type=password", json={"email": email, "password": password})
                assert login.status_code == 400 and login.json().get("error_code") == "user_banned"
            print("PASS: signup defaults to pending, ignores client role/status, and Supabase blocks sign-in")

            async with db.acquire() as conn:
                assert await make_admin(conn, users["admin"]["email"])
            login = await auth.post(url + "/token?grant_type=password", json={"email": users["admin"]["email"], "password": password})
            assert login.status_code == 200
            admin_token = login.json()["access_token"]
            headers = {"Authorization": "Bearer " + admin_token}

            async with httpx.AsyncClient(transport=httpx.ASGITransport(app=create_app()), base_url="http://api") as api:
                for name in ("approve", "reject"):
                    token = users[name]["token"]
                    assert token, "Expected auto-confirmed signup session to test stale token enforcement"
                    response = await api.get("/api/me", headers={"Authorization": "Bearer " + token})
                    assert response.status_code == 403 and response.json()["error"] == "approval_pending"
                assert (await api.get("/api/admin/registrations")).status_code == 401
                response = await api.get("/api/admin/registrations", headers=headers, params={"search": prefix, "limit": 1})
                assert response.status_code == 200 and response.json()["total"] == 26 and len(response.json()["items"]) == 1
                print("PASS: pending tokens cannot access the API; admin review list is protected and paginated")

                for name, decision in (("approve", "approved"), ("reject", "rejected")):
                    response = await api.post(f"/api/admin/registrations/{users[name]['id']}/review", headers=headers, json={"decision": decision})
                    assert response.status_code == 200 and response.json()["approvalStatus"] == decision
                    async with db.acquire() as conn:
                        reviewed_by = await conn.fetchval("SELECT reviewed_by::text FROM public.profiles WHERE id=$1::uuid", users[name]["id"])
                    assert reviewed_by == users["admin"]["id"]

                approved = await auth.post(url + "/token?grant_type=password", json={"email": users["approve"]["email"], "password": password})
                assert approved.status_code == 200 and approved.json()["user"]["app_metadata"]["approval_status"] == "approved"
                player_headers = {"Authorization": "Bearer " + approved.json()["access_token"]}
                assert (await api.get("/api/me", headers=player_headers)).status_code == 200
                assert (await api.get("/api/admin/registrations", headers=player_headers)).status_code == 403
                assert (await api.post(f"/api/admin/registrations/{users['race']['id']}/review", headers=player_headers, json={"decision": "approved"})).status_code == 403
                assert (await api.post("/api/admin/registrations/approve", headers=player_headers, json={"allPending": True})).status_code == 403
                rejected = await auth.post(url + "/token?grant_type=password", json={"email": users["reject"]["email"], "password": password})
                assert rejected.status_code == 400 and rejected.json()["error_code"] == "user_banned"
                response = await api.get("/api/me", headers={"Authorization": "Bearer " + users["reject"]["token"]})
                assert response.status_code == 403 and response.json()["error"] == "account_rejected"
                print("PASS: approval enables real sign-in; rejection blocks both sign-in and previously issued tokens")

                # Supabase Data API must not allow a participant to change review fields.
                response = await auth.patch(get_settings().supabase_url.rstrip("/") + "/rest/v1/profiles", params={"id": "eq." + users["approve"]["id"]}, headers=player_headers, json={"approval_status": "approved", "role": "admin"})
                assert response.status_code == 403
                response = await auth.patch(get_settings().supabase_url.rstrip("/") + "/rest/v1/profiles", params={"id": "eq." + users["approve"]["id"]}, headers=player_headers, json={"full_name": prefix + " updated"})
                assert response.status_code in (200, 204)
                print("PASS: participant self-approval/role changes are denied; display-name edits still work")

                response = await api.post("/api/admin/registrations/approve", headers=headers, json={
                    "allPending": True, "search": prefix + "-bulk", "excludedIds": [users["bulk00"]["id"]],
                })
                assert response.status_code == 200 and response.json()["approvedCount"] == 22
                async with db.acquire() as conn:
                    rows = await conn.fetch(
                        """SELECT p.id::text, p.approval_status, p.reviewed_by::text, p.reviewed_at,
                                  u.banned_until IS NULL AS enabled
                           FROM public.profiles p JOIN auth.users u ON u.id=p.id
                           WHERE p.id = ANY($1::uuid[])""",
                        [uuid.UUID(users[name]["id"]) for name in bulk_names],
                    )
                for row in rows:
                    if row["id"] == users["bulk00"]["id"]:
                        assert row["approval_status"] == "pending" and not row["enabled"]
                    else:
                        assert row["approval_status"] == "approved" and row["enabled"]
                        assert row["reviewed_by"] == users["admin"]["id"] and row["reviewed_at"]
                bulk_login = await auth.post(url + "/token?grant_type=password", json={"email": users["bulk22"]["email"], "password": password})
                assert bulk_login.status_code == 200
                # Explicit selection tolerates duplicates/stale rows without overturning a rejection.
                response = await api.post("/api/admin/registrations/approve", headers=headers, json={
                    "ids": [users[name]["id"] for name in ["bulk00", "bulk00", "reject", "admin", "approve"]],
                })
                assert response.status_code == 200 and response.json()["approvedCount"] == 1
                response = await api.post("/api/admin/registrations/approve", headers=headers, json={"allPending": True, "search": prefix + "-bulk"})
                assert response.status_code == 200 and response.json()["approvedCount"] == 0
                async with db.acquire() as conn:
                    assert await conn.fetchval("SELECT approval_status FROM public.profiles WHERE id=$1::uuid", users["reject"]["id"]) == "rejected"
                    assert await conn.fetchval("SELECT approval_status FROM public.profiles WHERE id=$1::uuid", users["race"]["id"]) == "pending"
                print("PASS: select all approves beyond one page, respects search/exclusions, syncs login, and skips reviewed/admin accounts")

                responses = await asyncio.gather(*[
                    api.post(f"/api/admin/registrations/{users['race']['id']}/review", headers=headers, json={"decision": decision})
                    for decision in ("approved", "rejected")
                ])
                assert sorted(response.status_code for response in responses) == [200, 409]
                assert next(response for response in responses if response.status_code == 409).json()["error"] == "already_reviewed"
                assert (await api.post(f"/api/admin/registrations/{users['admin']['id']}/review", headers=headers, json={"decision": "rejected"})).status_code == 404
                print("PASS: concurrent reviews allow one decision; admins cannot be reviewed as participants")
    finally:
        async with db.acquire() as conn:
            for email in emails:
                await conn.execute("DELETE FROM auth.users WHERE email = $1", email)
            assert not await conn.fetchval("SELECT count(*) FROM auth.users WHERE email = ANY($1::text[])", emails)
        await db.close()
        print("Cleanup complete: only test accounts removed; event and existing registrations unchanged")


if __name__ == "__main__":
    asyncio.run(main())
