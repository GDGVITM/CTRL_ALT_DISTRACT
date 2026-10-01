"""End-to-end run of the seeded whole-program (io) question set: real Postgres + real Judge0.

    python -m tests.e2e_io "<path to the questions PDF>"

A throwaway player plays all rounds using the PDF's Python solutions (Q10 uses a corrected one, see
pdf_import). Also checks Run/Submit failure modes. Creates and deletes its own users; refuses to run
if real participants exist or the event is not in the lobby.
"""

from __future__ import annotations

import asyncio
import os
import sys

os.environ.setdefault("RUN_INTERVAL_S", "0")
os.environ.setdefault("SUBMIT_INTERVAL_S", "0")

import httpx  # noqa: E402
from fastapi import Header  # noqa: E402

from app.db import db  # noqa: E402
from app.judge.judge0 import Judge0Client  # noqa: E402
from app.main import create_app  # noqa: E402
from app.security import AuthUser, current_user, optional_user  # noqa: E402
from app.seed.pdf_import import parse_questions  # noqa: E402
from app.services import arena as arena_service  # noqa: E402
from app.services import event as event_service  # noqa: E402

from .e2e_flow import DOMAIN, make_user  # noqa: E402

Q10_FIXED = "n = int(input())\ns = list(map(int, input().split()))\nprint(*[1 + sum(y > x for y in s) for x in s])\n"
passed = failed = 0


async def _new_player(database, name: str) -> str:
    async with database.acquire() as conn:
        return await make_user(conn, name, "e2e")


def check(label: str, ok: bool, extra: object = "") -> None:
    global passed, failed
    passed += ok
    failed += not ok
    print(f"  {'ok  ' if ok else 'FAIL'} {label}{'' if ok else f'  -> {extra}'}")


async def main(pdf: str) -> int:
    questions = {q.number: q for q in parse_questions(pdf)}
    await db.connect()
    judge_client = Judge0Client()
    arena_service.set_judge_client(judge_client)
    app = create_app()

    async def fake_user(x_test_user: str = Header()) -> AuthUser:
        return AuthUser(id=x_test_user, email=None, token_role="participant")

    async def fake_optional(x_test_user: str | None = Header(default=None)) -> AuthUser | None:
        return AuthUser(id=x_test_user, email=None, token_role="participant") if x_test_user else None

    app.dependency_overrides[current_user] = fake_user
    app.dependency_overrides[optional_user] = fake_optional

    async with db.acquire() as conn:
        ev = await conn.fetchrow("SELECT status, total_rounds FROM public.event_config")
        real = await conn.fetchval("SELECT count(*) FROM public.participations")
        modes = await conn.fetchval("SELECT count(*) FROM public.problems WHERE mode = 'io'")
        if ev["status"] != "lobby" or real or modes < ev["total_rounds"]:
            print(f"refusing: event={ev['status']} participations={real} io_problems={modes} (need at least {ev['total_rounds']})")
            return 2
        total_rounds = ev["total_rounds"]
        ada = await make_user(conn, "Ada Lovelace", "e2e")
        root = await make_user(conn, "Root Admin", "e2e")
        await conn.execute("UPDATE public.profiles SET role = 'admin' WHERE id = $1::uuid", root)

    client = httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://api", timeout=180)

    async def call(method, url, user, **kw):
        return await client.request(method, url, headers={"x-test-user": user}, **kw)

    try:
        await call("POST", "/api/participant/join", ada)
        check("admin starts the event", (await call("POST", "/api/admin/event/start", root)).status_code == 204)
        st = (await call("POST", "/api/arena/start", ada)).json()
        check("round 1 begins", st["round"]["round"] == 1)

        print("\n[each player is dealt their own questions]")
        by_title = {q.title: q for q in questions.values()}
        extra_players = [await _new_player(db, f"Player {i}") for i in range(1, 6)]
        for uid in extra_players:
            await call("POST", "/api/participant/join", uid)
        async with db.acquire() as conn:
            pool = [r["id"] for r in await conn.fetch("SELECT id FROM public.problems WHERE is_active")]
            dealt = {
                u: await conn.fetchval("SELECT problem_order FROM public.participations WHERE user_id = $1::uuid", u)
                for u in [ada, *extra_players]
            }
        check("the pool has more questions than rounds", len(pool) > total_rounds, (len(pool), total_rounds))
        check(
            "each player is dealt exactly the configured number of distinct pool questions",
            all(len(o) == total_rounds and len(set(o)) == total_rounds and set(o) <= set(pool) for o in dealt.values()),
            dealt,
        )
        check("players get different selections/orders", len({tuple(o) for o in dealt.values()}) > 1, dealt)
        rejoin = await call("POST", "/api/participant/join", ada)
        async with db.acquire() as conn:
            again = await conn.fetchval("SELECT problem_order FROM public.participations WHERE user_id = $1::uuid", ada)
        check("rejoining cannot re-roll the questions", again == dealt[ada], (rejoin.status_code, again, dealt[ada]))

        print("\n[round 1: payload + failure modes]")
        prob = (await call("GET", "/api/arena/problem", ada)).json()
        first = by_title.get(prob["title"])
        check("round 1 serves a pool question numbered round 1", first is not None and prob["round"] == 1, prob["title"])
        async with db.acquire() as conn:
            first_id = await conn.fetchval(
                "SELECT problem_id FROM public.round_attempts WHERE user_id = $1::uuid AND round_no = 1", ada
            )
        check("...and it is the first question she was dealt", first_id == dealt[ada][0], (first_id, dealt[ada][0]))
        check(
            "starter code is a whole-program skeleton",
            prob["starterCode"]["python"].startswith("import sys") and "public class Main" in prob["starterCode"]["java"],
        )
        check(
            "one sample case (the statement example)",
            len(prob["samples"]) == 1 and prob["samples"][0]["input"] == first.example_input,
            prob["samples"],
        )

        def solution_for(title: str) -> str:
            q = by_title[title]
            return Q10_FIXED if q.number == 10 else q.solutions["python"]

        r = (await call("POST", "/api/arena/run", ada, json={"language": "python", "code": "print('nope')\n"})).json()
        check(
            "run: wrong output -> failed, shows the real output",
            r["result"] == "failed" and r["cases"][0]["actual"] == "nope" and r["cases"][0]["expected"] == first.example_output,
            r,
        )
        r = (await call("POST", "/api/arena/run", ada, json={"language": "python", "code": solution_for(prob["title"])})).json()
        check("run: reference solution passes the sample", r["result"] == "passed" and r["total"] == 1, r)
        r = (await call("POST", "/api/arena/run", ada, json={"language": "python", "code": "print(1\n"})).json()
        check("run: unterminated call -> compile-error at end of file", r["result"] == "compile-error" and r["compile"]["line"] == 2, r["compile"])
        r = (await call("POST", "/api/arena/run", ada, json={"language": "python", "code": "print(1 // 0)\n"})).json()
        check("run: runtime error is reported per case", r["result"] == "failed" and "ZeroDivision" in (r["cases"][0]["message"] or ""), r["cases"])
        r = (await call("POST", "/api/arena/run", ada, json={"language": "cpp", "code": "int main() { return x; }\n"})).json()
        check("run: C++ compile error -> solution.cpp, line 1", r["result"] == "compile-error" and r["compile"]["file"] == "solution.cpp" and r["compile"]["line"] == 1, r["compile"])
        r = (await call("POST", "/api/arena/submit", ada, json={"language": "python", "code": "while True:\n    pass\n"})).json()
        check("submit: infinite loop -> TIME LIMIT EXCEEDED", r["result"] == "wrong" and r["headline"] == "TIME LIMIT EXCEEDED", r)
        r = (await call("POST", "/api/arena/submit", ada, json={"language": "python", "code": "print('definitely wrong')\n"})).json()
        check("submit: wrong answer scores nothing", r["headline"] == "WRONG ANSWER" and r["participant"]["totalPts"] == 0, r)

        print("\n[ada plays every round she was dealt]")
        seen_titles = []
        for n in range(1, total_rounds + 1):
            if n > 1:
                st = (await call("POST", "/api/arena/start", ada)).json()
                assert st["round"]["round"] == n, st
            title = (await call("GET", "/api/arena/problem", ada)).json()["title"]
            seen_titles.append(title)
            sub = (await call("POST", "/api/arena/submit", ada, json={"language": "python", "code": solution_for(title)})).json()
            check(f"round {n:>2} {title:<28} {sub.get('passed')}/{sub.get('total')}", sub.get("result") == "accepted", sub)
        check("she saw as many different questions as rounds", len(set(seen_titles)) == total_rounds, seen_titles)

        st = (await call("GET", "/api/arena/state", ada)).json()
        check(
            "finishing the last round finishes the player",
            st["finished"] and st["participant"]["roundPts"] == 100 * total_rounds,
            st["participant"],
        )

        other = extra_players[0]
        await call("POST", "/api/arena/start", other)
        other_title = (await call("GET", "/api/arena/problem", other)).json()["title"]
        async with db.acquire() as conn:
            want = await conn.fetchval("SELECT title FROM public.problems WHERE id = $1", dealt[other][0])
        check("another player is served their own first question", other_title == want, (other_title, want))
        r = await call("GET", f"/api/arena/problem?round={total_rounds + 1}", other)
        check("a round beyond the last is not available", r.status_code in (403, 409), r.status_code)

        print("\n[other languages on one question]")
        print("\n[other languages on one question]")
        # Re-judge Q1 in every language directly (the round is closed, so use the judge service).
        from app.judge.service import JudgeCase, JudgeLanguage, judge_io

        async with db.acquire() as conn:
            rows = await conn.fetch(
                "SELECT t.stdin, t.expected FROM public.problem_tests t JOIN public.problems p ON p.id = t.problem_id "
                "WHERE p.round_no = 1 ORDER BY t.ord"
            )
        cases = [JudgeCase(r["stdin"], r["expected"]) for r in rows]
        for lang, jid, fname, mult in [("c", 50, "solution.c", 1), ("cpp", 54, "solution.cpp", 1), ("java", 62, "Solution.java", 2)]:
            ev_ = await judge_io(judge_client, language=JudgeLanguage(lang, jid, fname, mult), time_limit_ms=2000,
                                 memory_limit_kb=262144, cases=cases, code=questions[1].solutions[lang])
            check(f"Q1 {lang} reference passes all {ev_.total} stored cases", ev_.all_passed, [c for c in ev_.cases if c.status != 'pass'])

        lb = (await call("GET", "/api/leaderboard", ada)).json()
        check("leaderboard shows the finished player on top", lb["entries"][0]["total"] == 100 * total_rounds and lb["entries"][0]["self"], lb["entries"])
        await call("POST", "/api/admin/event/end", root)
    finally:
        await client.aclose()
        async with db.acquire() as conn:
            await conn.execute("DELETE FROM auth.users WHERE email LIKE $1", f"e2e-%@{DOMAIN}")
            await conn.execute("UPDATE public.event_config SET status='lobby', started_at=NULL, ended_at=NULL")
        event_service.invalidate()
        await judge_client.close()
        await db.close()
        print("\ncleanup done: test users removed, event reset to lobby")

    print(f"{passed} passed, {failed} failed")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main(sys.argv[1])))
