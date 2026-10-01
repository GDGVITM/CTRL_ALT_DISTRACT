"""Dev-only harness for driving the real UI without a Supabase login.

Creates throwaway users (ui-*@test.invalid) directly in the database, then serves the real API on
:8001 (HARNESS_PORT) with ONLY the token check replaced: a bearer token of the form `test-<user uuid>` is accepted as
that user. Everything else (Postgres, Judge0, scoring, admin role lookup) is real.

    python -m tests.ui_harness            # create users, print browser sessions, serve until Ctrl+C
    python -m tests.ui_harness cleanup    # delete the throwaway users and reopen the lobby

Never run this against a deployment other people use: it disables authentication.
"""

from __future__ import annotations

import asyncio
import json
import os
import sys
import time

import uvicorn

from app.db import db
from app.main import create_app
from app.security import AuthUser, current_user, optional_user
from fastapi import Header

from .e2e_flow import DOMAIN, make_user

REF = "prczdinpsfafsqzgkbfh"


def session_json(uid: str, name: str, role: str) -> str:
    now = int(time.time())
    return json.dumps(
        {
            "access_token": f"test-{uid}",
            "refresh_token": "ui-harness",
            "token_type": "bearer",
            "expires_in": 31_536_000,
            "expires_at": now + 31_536_000,
            "user": {
                "id": uid, "aud": "authenticated", "role": "authenticated", "email": f"ui-{uid[:8]}@{DOMAIN}",
                "app_metadata": {"role": role}, "user_metadata": {"full_name": name},
                "created_at": "2026-01-01T00:00:00Z",
            },
        }
    )


async def cleanup() -> None:
    await db.connect()
    async with db.acquire() as conn:
        await conn.execute("DELETE FROM auth.users WHERE email LIKE $1", f"ui-%@{DOMAIN}")
        await conn.execute("UPDATE public.event_config SET status='lobby', started_at=NULL, ended_at=NULL")
    await db.close()
    print("cleaned up: throwaway users removed, event reset to lobby")


async def prepare() -> dict[str, str]:
    await db.connect()
    async with db.acquire() as conn:
        ev = await conn.fetchrow("SELECT status FROM public.event_config")
        real = await conn.fetchval(
            "SELECT count(*) FROM public.participations pa JOIN public.profiles p ON p.id = pa.user_id WHERE p.email NOT LIKE $1",
            f"ui-%@{DOMAIN}",
        )
        if real or ev["status"] != "lobby":
            raise SystemExit(f"refusing: event={ev['status']} real participants={real}")
        ada = await make_user(conn, "Ada Lovelace", "ui")
        root = await make_user(conn, "Root Admin", "ui")
        await conn.execute("UPDATE public.profiles SET role = 'admin' WHERE id = $1::uuid", root)
    await db.close()
    return {"ada": ada, "root": root}


def serve() -> None:
    app = create_app()

    async def fake_user(authorization: str = Header()) -> AuthUser:
        return AuthUser(id=authorization.removeprefix("Bearer test-"), email=None, token_role="participant")

    async def fake_optional(authorization: str | None = Header(default=None)) -> AuthUser | None:
        if not authorization or not authorization.startswith("Bearer test-"):
            return None
        return AuthUser(id=authorization.removeprefix("Bearer test-"), email=None, token_role="participant")

    app.dependency_overrides[current_user] = fake_user
    app.dependency_overrides[optional_user] = fake_optional
    uvicorn.run(app, host="127.0.0.1", port=int(os.environ.get("HARNESS_PORT", "8001")), log_level="warning")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "cleanup":
        asyncio.run(cleanup())
    else:
        users = asyncio.run(prepare())
        sessions = {
            "player": session_json(users["ada"], "Ada Lovelace", "participant"),
            "admin": session_json(users["root"], "Root Admin", "admin"),
        }
        with open("tests/.ui_sessions.json", "w", encoding="utf-8") as fh:
            json.dump(sessions, fh)
        print("ui harness ready; sessions written to tests/.ui_sessions.json", flush=True)
        try:
            serve()
        finally:
            asyncio.run(cleanup())
