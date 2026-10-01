"""Offline tests: wire protocol, harness generation, result evaluation. No network, no database."""

import subprocess
import sys

import pytest

from app.judge.evaluate import evaluate
from app.judge.harness import SUPPORTED_LANGUAGES, build_source, starter_code
from app.judge.judge0 import COMPILE_ERROR, INTERNAL_ERROR, TIME_LIMIT, JudgeRun
from app.judge.protocol import (
    display_input,
    display_output_line,
    encode_case,
    encode_input,
    encode_output,
    outputs_equal,
    validate_signature,
)
from app.seed.loader import build_problem
from app.seed.problems import PROBLEMS

from .solutions import SOLUTIONS

SIG = {"function": "solve", "params": [{"name": "nums", "type": "int[]"}, {"name": "k", "type": "int"}], "returns": "int[]"}


def _run(status_id=3, stdout="", stderr="", compile_output="", message="", status="Accepted") -> JudgeRun:
    return JudgeRun(status_id, status, stdout, stderr, compile_output, message, 10, 1000)


def test_wire_format_round_trip():
    assert encode_case(SIG, [[2, 7, 11], 9]) == "3\n2 7 11\n9"
    assert encode_case(SIG, [[], 0]) == "0\n\n0"
    assert encode_input(["a", "b"]) == "2\na\nb\n"
    assert encode_output("int[]", [0, 1]) == "0 1"
    assert encode_output("bool", True) == "true"
    assert outputs_equal("int[]", "0 1", " 0   1 \r")
    assert not outputs_equal("string", "ab", "ab ")


def test_display_helpers():
    assert display_input(SIG, [[2, 7], 9]) == "nums = [2, 7], k = 9"
    assert display_output_line("int[]", "0 1") == "[0, 1]"
    assert display_output_line("bool", "true") == "true"
    assert display_output_line("string", "abc") == '"abc"'


def test_signature_validation_rejects_bad_types():
    with pytest.raises(ValueError):
        validate_signature({"function": "f", "params": [{"name": "x", "type": "float"}], "returns": "int"})
    with pytest.raises(ValueError):
        validate_signature({"function": "not valid", "params": [], "returns": "int"})


@pytest.mark.parametrize("language", SUPPORTED_LANGUAGES)
def test_every_language_builds_for_every_problem(language):
    for p in PROBLEMS:
        built = build_source(language, p.signature, starter_code(language, p.signature))
        assert "@@CAD@@" in built.source
        assert built.source.splitlines()[built.line_offset].strip() != ""  # player code starts right after the prelude


def test_java_public_class_is_made_package_private():
    sig = {"function": "f", "params": [{"name": "n", "type": "int"}], "returns": "int"}
    built = build_source("java", sig, "public class Solution { public int f(int n) { return n; } }")
    assert "public class Solution" not in built.source and "class Solution" in built.source


@pytest.mark.parametrize("slug", sorted(SOLUTIONS))
def test_python_harness_matches_reference_locally(slug):
    """Execute the generated Python program on this machine; it must reproduce every expected output."""
    problem = next(p for p in PROBLEMS if p.slug == slug)
    row, tests = build_problem(problem)
    built = build_source("python", row["signature"], SOLUTIONS[slug]["python"])
    proc = subprocess.run(
        [sys.executable, "-c", built.source],
        input=encode_input([t["stdin"] for t in tests]),
        capture_output=True, text=True, timeout=60,
    )
    run = _run(stdout=proc.stdout, stderr=proc.stderr)
    ev = evaluate(
        language="python", returns=row["signature"]["returns"], expected=[t["expected"] for t in tests],
        run=run, built=built, user_code=SOLUTIONS[slug]["python"], filename="solution.py",
    )
    assert ev.all_passed, [c for c in ev.cases if c.status != "pass"][:2]


def _evaluate(stdout="", status_id=3, **kw):
    built = build_source("python", SIG, "class Solution:\n    def solve(self, nums, k):\n        pass\n")
    return evaluate(
        language=kw.pop("language", "python"), returns="int[]", expected=["0 1", "1 2", "0 1"],
        run=_run(status_id=status_id, stdout=stdout, **kw), built=built, user_code="x\n", filename="solution.py",
    )


def test_evaluate_marks_pass_fail_and_ignores_noise():
    out = "debug junk@@CAD@@0@@OK@@0 1\n@@CAD@@1@@OK@@2 2\n@@CAD@@2@@OK@@0 1\n"
    ev = _evaluate(out)
    assert [c.status for c in ev.cases] == ["pass", "fail", "pass"]
    assert ev.cases[1].actual == "[2, 2]" and ev.headline() == "WRONG ANSWER" and ev.passed == 2


def test_evaluate_caught_exception_only_fails_its_own_case():
    ev = _evaluate("@@CAD@@0@@OK@@0 1\n@@CAD@@1@@ERR@@ValueError: boom\n@@CAD@@2@@OK@@0 1\n")
    assert [c.status for c in ev.cases] == ["pass", "error", "pass"]
    assert ev.cases[1].message == "ValueError: boom" and ev.headline() == "RUNTIME ERROR"


def test_evaluate_crash_stops_later_cases():
    ev = _evaluate("@@CAD@@0@@OK@@0 1\n", status_id=11, stderr="Segmentation fault", status="Runtime Error (NZEC)")
    assert [c.status for c in ev.cases] == ["pass", "error", "not_run"]
    assert ev.cases[1].message == "Runtime Error: Segmentation fault"


def test_evaluate_clean_exit_without_output_is_an_error():
    ev = _evaluate("@@CAD@@0@@OK@@0 1\n")
    assert [c.status for c in ev.cases] == ["pass", "error", "not_run"] and ev.cases[1].message == "No output produced"


def test_evaluate_timeout_attributed_to_first_missing_case():
    ev = _evaluate("@@CAD@@0@@OK@@0 1\n", status_id=TIME_LIMIT, status="Time Limit Exceeded")
    assert [c.status for c in ev.cases] == ["pass", "tle", "not_run"] and ev.headline() == "TIME LIMIT EXCEEDED"


def test_evaluate_python_syntax_error_is_a_compile_error_with_mapped_line():
    ev = _evaluate("", stderr='  File "script.py", line 2\n    def f(self)\n SyntaxError: invalid syntax', status_id=11)
    assert ev.compile and ev.compile.line == 2 and 'File "solution.py", line 2' in ev.compile.message


def test_evaluate_compiler_diagnostics_are_remapped_past_the_prelude():
    sig = {"function": "f", "params": [{"name": "n", "type": "int"}], "returns": "int"}
    code = "class Solution {\npublic:\n    int f(int n) {\n        return n\n    }\n};\n"
    built = build_source("cpp", sig, code)
    raw = f"main.cpp:{4 + built.line_offset}:17: error: expected ';' before '}}' token\n  {4 + built.line_offset} |  return n"
    ev = evaluate(
        language="cpp", returns="int", expected=["1"], run=_run(status_id=COMPILE_ERROR, compile_output=raw, status="Compilation Error"),
        built=built, user_code=code, filename="solution.cpp",
    )
    assert ev.compile.line == 4
    assert "solution.cpp:4:17" in ev.compile.message and "main.cpp" not in ev.compile.message and "  4 |" in ev.compile.message


def test_internal_judge_errors_surface_as_503():
    from app.errors import ApiError

    with pytest.raises(ApiError) as exc:
        _evaluate("", status_id=INTERNAL_ERROR)
    assert exc.value.status == 503


def test_seed_expectations_come_from_reference_solutions():
    for p in PROBLEMS:
        row, tests = build_problem(p)
        assert sum(t["is_sample"] for t in tests) == len(p.samples) >= 3
        assert len(row["examples"]) == p.examples_count
        assert all(t["expected"] for t in tests)


# --------------------------------------------------------------------------- whole-program (io) problems


def test_io_output_comparison_ignores_trailing_whitespace_only():
    from app.judge.protocol import io_outputs_equal, normalize_output

    assert normalize_output("1 2 3 \r\n\r\n") == "1 2 3"
    assert io_outputs_equal("Odd Sum: 9\nEven Sum: 14", "Odd Sum: 9  \nEven Sum: 14\n\n")
    assert not io_outputs_equal("Even", "EVEN")  # case matters
    assert not io_outputs_equal("1 2", "1  2")  # inner spacing matters


def test_io_case_verdicts():
    from app.judge.evaluate import evaluate_io_case

    def verdict(**run_kw):
        return evaluate_io_case(index=0, expected="42", run=_run(**run_kw), language="python", user_code="x\n", filename="solution.py")

    assert verdict(stdout="42\n")[0].status == "pass"
    out, _ = verdict(stdout="41\n")
    assert out.status == "fail" and out.actual == "41"
    assert verdict(status_id=TIME_LIMIT, status="Time Limit Exceeded")[0].status == "tle"
    out, _ = verdict(status_id=11, stderr="Traceback...\nZeroDivisionError: division by zero", status="Runtime Error (NZEC)")
    assert out.status == "error" and "ZeroDivisionError" in out.message
    _, compile_info = verdict(status_id=11, stderr="  File \"script.py\", line 1\nSyntaxError: invalid syntax")
    assert compile_info and compile_info.file == "solution.py"
    _, compile_info = evaluate_io_case(
        index=0, expected="1", language="c", user_code="a\nb\nc\n", filename="solution.c",
        run=_run(status_id=COMPILE_ERROR, compile_output="main.c:3:1: error: expected ';'"),
    )
    assert compile_info.line == 3 and compile_info.message.startswith("solution.c:3:1")  # mapped to the editor


def test_io_starter_templates_cover_every_language():
    from app.judge.harness import starter_code_io

    for lang in SUPPORTED_LANGUAGES:
        assert starter_code_io(lang).strip()
    assert "public class Main" in starter_code_io("java")
