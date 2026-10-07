"""Regression checks for Run -> Submit pacing without extra judge traffic."""

import asyncio
from types import SimpleNamespace

import pytest

from app.errors import ApiError
from app.services import limits


@pytest.fixture
def clock(monkeypatch):
    state = SimpleNamespace(now=0.0, waits=[])

    async def sleep(delay):
        state.waits.append(delay)
        state.now += delay

    monkeypatch.setattr(limits, "time", SimpleNamespace(monotonic=lambda: state.now))
    monkeypatch.setattr(limits, "asyncio", SimpleNamespace(sleep=sleep))
    return state


def test_submit_after_run_waits_instead_of_rejecting(clock):
    async def scenario():
        gate = limits.JudgeGate()
        async with gate.guard("player", 2):
            clock.now += 2
        async with gate.guard("player", 3):
            assert clock.now == 3
        assert clock.waits == [1]

    asyncio.run(scenario())


def test_long_judging_has_no_extra_cooldown(clock):
    async def scenario():
        gate = limits.JudgeGate()
        async with gate.guard("player", 2):
            clock.now += 10
        async with gate.guard("player", 3):
            pass
        assert clock.waits == []

    asyncio.run(scenario())


def test_first_call_and_other_players_do_not_wait(clock):
    async def scenario():
        gate = limits.JudgeGate()
        async with gate.guard("player", 3):
            async with gate.guard("other-player", 3):
                pass
        assert clock.waits == []

    asyncio.run(scenario())


def test_simultaneous_call_is_still_rejected(clock):
    async def scenario():
        gate = limits.JudgeGate()
        async with gate.guard("player", 3):
            with pytest.raises(ApiError) as error:
                async with gate.guard("player", 3):
                    pytest.fail("A second job must not reach the judge")
            assert error.value.code == "judge_busy"
        assert not gate._inflight

    asyncio.run(scenario())


def test_wait_reserves_user_and_cancellation_releases_it(clock, monkeypatch):
    async def scenario():
        gate = limits.JudgeGate()
        async with gate.guard("player", 3):
            pass
        waiting = asyncio.Event()

        async def sleep(delay):
            waiting.set()
            await asyncio.Event().wait()

        monkeypatch.setattr(limits, "asyncio", SimpleNamespace(sleep=sleep))

        async def submit():
            async with gate.guard("player", 3):
                pytest.fail("Cancelled cooldown must not start judging")

        task = asyncio.create_task(submit())
        await waiting.wait()
        with pytest.raises(ApiError) as error:
            async with gate.guard("player", 3):
                pass
        assert error.value.code == "judge_busy"
        task.cancel()
        with pytest.raises(asyncio.CancelledError):
            await task
        assert not gate._inflight
        clock.now = 3
        async with gate.guard("player", 3):
            pass

    asyncio.run(scenario())


def test_judge_failure_releases_user(clock):
    async def scenario():
        gate = limits.JudgeGate()
        with pytest.raises(RuntimeError):
            async with gate.guard("player", 3):
                raise RuntimeError("judge unavailable")
        assert not gate._inflight
        async with gate.guard("player", 3):
            pass
        assert clock.waits == [3]

    asyncio.run(scenario())
