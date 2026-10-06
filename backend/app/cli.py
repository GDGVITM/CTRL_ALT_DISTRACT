"""Operational commands:  python -m app.cli <migrate | seed --pdf FILE | make-admin EMAIL | status>"""

from __future__ import annotations

import argparse
import asyncio
import sys
from pathlib import Path

import asyncpg

from .config import BACKEND_DIR, get_settings
from .db import db
from .seed.loader import seed_problems, seed_rows

MIGRATIONS_DIR = BACKEND_DIR.parent / "supabase" / "migrations"
# Applied by hand before this runner existed; recorded (not re-run) the first time we see them.
BASELINE = ("001_create_profiles_and_roles.sql", "002_auto_confirm_users.sql",
            "003_confirm_all_existing_users.sql", "004_performance_indexes.sql")


async def migrate(conn: asyncpg.Connection) -> list[str]:
    await conn.execute(
        "CREATE TABLE IF NOT EXISTS public.app_migrations "
        "(name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())"
    )
    applied = {r["name"] for r in await conn.fetch("SELECT name FROM public.app_migrations")}
    if not applied and await conn.fetchval("SELECT to_regclass('public.profiles')"):
        for name in BASELINE:
            await conn.execute("INSERT INTO public.app_migrations (name) VALUES ($1) ON CONFLICT DO NOTHING", name)
        applied = set(BASELINE)

    ran: list[str] = []
    for path in sorted(Path(MIGRATIONS_DIR).glob("*.sql")):
        if path.name in applied:
            continue
        async with conn.transaction():
            await conn.execute(path.read_text(encoding="utf-8"))
            await conn.execute("INSERT INTO public.app_migrations (name) VALUES ($1)", path.name)
        ran.append(path.name)
    return ran


async def make_admin(conn: asyncpg.Connection, email: str) -> bool:
    async with conn.transaction():
        user_id = await conn.fetchval("SELECT id FROM auth.users WHERE lower(email) = lower($1)", email)
        if user_id is None:
            return False
        await conn.execute(
            "UPDATE public.profiles SET role = 'admin', approval_status = 'approved' WHERE id = $1", user_id
        )
        await conn.execute(
            "UPDATE auth.users SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) "
            "|| jsonb_build_object('role', 'admin') WHERE id = $1",
            user_id,
        )
    return True


async def status(conn: asyncpg.Connection) -> None:
    event = await conn.fetchrow("SELECT status, started_at, ended_at, total_rounds FROM public.event_config")
    print("event:", dict(event) if event else None)
    for table in ("profiles", "problems", "problem_tests", "participations", "round_attempts", "submissions", "proctor_events"):
        exists = await conn.fetchval("SELECT to_regclass($1)", f"public.{table}")
        count = await conn.fetchval(f"SELECT count(*) FROM public.{table}") if exists else "missing"
        print(f"  {table:<18} {count}")


async def _run(args: argparse.Namespace) -> int:
    get_settings()  # fail fast on missing configuration
    await db.connect()
    try:
        async with db.acquire() as conn:
            if args.command == "migrate":
                ran = await migrate(conn)
                print("applied:", ", ".join(ran) if ran else "nothing to do")
            elif args.command == "reset-event":
                for table in ("proctor_events", "distraction_events", "submissions", "round_attempts", "participations"):
                    await conn.execute(f"DELETE FROM public.{table}")
                await conn.execute(
                    "UPDATE public.event_config SET status='lobby', started_at=NULL, ended_at=NULL, updated_at=now()"
                )
                print("Event reset successfully: all previous test runs and participations wiped.")
            elif args.command == "seed":
                if args.force:
                    for table in ("proctor_events", "distraction_events", "submissions", "round_attempts", "participations"):
                        await conn.execute(f"DELETE FROM public.{table}")
                    await conn.execute(
                        "UPDATE public.event_config SET status='lobby', started_at=NULL, ended_at=NULL, updated_at=now()"
                    )
                if args.pdf:
                    from .seed.pdf_import import build_rows, parse_questions

                    built, notes = build_rows(parse_questions(args.pdf), trust_oracle=args.trust_oracle)
                    for note in notes:
                        print("  CORRECTED:", note)
                    report = await seed_rows(conn, built, rounds=args.rounds)
                elif args.demo:
                    report = await seed_problems(conn)
                else:
                    print("choose a source: --pdf <file> (the event questions) or --demo", file=sys.stderr)
                    return 2
                for round_no, slug, n in report:
                    print(f"  round {round_no:>2}  {slug:<32} {n} tests")
                total = await conn.fetchval("SELECT total_rounds FROM public.event_config")
                print(f"{len(report)} questions in the pool; each player plays {total} of them, chosen at random")
            elif args.command == "make-admin":
                if not await make_admin(conn, args.email):
                    print(f"no user with email {args.email!r} (they must sign up first)", file=sys.stderr)
                    return 1
                print(f"{args.email} is now an admin (they must sign in again to refresh their token)")
            elif args.command == "status":
                await status(conn)
    finally:
        await db.close()
    return 0


def main() -> None:
    parser = argparse.ArgumentParser(prog="app.cli")
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("migrate", help="apply pending SQL migrations")
    sub.add_parser("reset-event", help="wipe run data and reset event state to lobby")
    seed = sub.add_parser("seed", help="load the problem set and test cases (replaces the current set)")
    seed.add_argument("--pdf", help="the organisers' 'Coding Solutions' PDF (questions, examples, hidden tests)")
    seed.add_argument("--trust-oracle", action="store_true",
                      help="when the PDF contradicts itself, use the statement-consistent answer instead of refusing")
    seed.add_argument("--rounds", type=int, help="questions each player is dealt (default: keep the current setting)")
    seed.add_argument("--demo", action="store_true", help="the built-in function-style demo problems")
    seed.add_argument("--force", action="store_true", help="wipe participations and reset event before seeding")
    sub.add_parser("status", help="print row counts")
    admin = sub.add_parser("make-admin", help="promote an existing user to admin")
    admin.add_argument("email")
    sys.exit(asyncio.run(_run(parser.parse_args())))


if __name__ == "__main__":
    main()
