"""Question metadata and listed awards must agree with difficulty scoring."""

from contextlib import asynccontextmanager

import pytest

from app.errors import ApiError
from app.schemas import CodeRequest
from app.services import arena, catalog
from tests.test_unlimited_rounds import USER_ID, accepted, round_db, run


def test_catalog_and_question_list_expose_difficulty_points(round_db, monkeypatch):
    rows = [
        {
            "id": index, "round_no": index, "title": difficulty,
            "difficulty": difficulty, "tags": [], "description": ["Solve this question."],
            "input_format": "An integer", "output_format": "An integer",
            "examples": [], "constraints": [], "hints": [], "mode": "io",
            "signature": None,
        }
        for index, difficulty in enumerate(("EASY", "MEDIUM", "HARD"), start=1)
    ]

    class CatalogConnection:
        async def fetch(self, query):
            return rows if "FROM public.problems" in query else []

    @asynccontextmanager
    async def acquire():
        yield CatalogConnection()

    # A legacy flat configuration must not override question difficulty.
    round_db.ev["dsa_points"] = 999
    round_db.ev["total_rounds"] = 3
    round_db.part["problem_order"] = [1, 2, 3]
    monkeypatch.setattr(catalog, "_problems", None)

    async def check():
        with monkeypatch.context() as catalog_patch:
            catalog_patch.setattr(catalog.db, "acquire", acquire)
            problems = await catalog._load_problems()
        assert [problems[index].public.points for index in (1, 2, 3)] == [100, 150, 200]
        listed = await arena.questions(USER_ID)
        assert [item.points for item in listed.items] == [100, 150, 200]

        async def judge(attempt, req, **kwargs):
            return await catalog.get_problem(attempt["problem_id"]), [], accepted()

        monkeypatch.setattr(arena, "_judge", judge)
        round_db.part["bonus_pts"] = 50
        round_db.part["total_pts"] = 50
        for number, expected_award, expected_total in [(1, 100, 150), (2, 150, 300), (3, 200, 500)]:
            round_db.attempt.update(round_no=number, problem_id=number, status="active", resolved_at=None)
            round_db.part["current_round"] = number
            before = round_db.part["round_pts"]
            response = await arena.submit(USER_ID, CodeRequest(language="python", code="print(42)", round=number))
            assert response.result == "accepted"
            assert round_db.attempt["points"] == expected_award
            assert response.participant.round_pts - before == expected_award
            assert response.participant.total_pts == expected_total
            assert response.participant.bonus_pts == 50
            assert response.participant.solved_count == number
            with pytest.raises(ApiError):
                await arena.submit(USER_ID, CodeRequest(language="python", code="print(42)", round=number))
            assert round_db.part["total_pts"] == expected_total

    run(check())
