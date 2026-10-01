"""Language-neutral wire format shared by test data, the generated harnesses and the evaluator.

A problem declares a function signature using a small type vocabulary:

    params : int | long | string | int[]
    returns: int | long | bool | string | int[]

One test case is written to stdin as one block of lines per parameter:

    int / long : one line, the number
    string     : one line, the raw text (no newlines)
    int[]      : a line with the length, then a line of space-separated values (blank when empty)

The generated harness reads `T` then `T` cases, and prints one marker line per case:

    @@CAD@@<index>@@OK@@<result>      result in canonical form (see `encode_output`)
    @@CAD@@<index>@@ERR@@<message>    the call raised
"""

from __future__ import annotations

from typing import Any, Sequence

PARAM_TYPES = {"int", "long", "string", "int[]"}
RETURN_TYPES = {"int", "long", "bool", "string", "int[]"}

Signature = dict[str, Any]  # {"function": str, "params": [{"name", "type"}], "returns": str}


def validate_signature(sig: Signature) -> None:
    if not sig.get("function", "").isidentifier():
        raise ValueError("signature.function must be an identifier")
    for p in sig["params"]:
        if p["type"] not in PARAM_TYPES or not p["name"].isidentifier():
            raise ValueError(f"bad parameter {p!r}")
    if sig["returns"] not in RETURN_TYPES:
        raise ValueError(f"bad return type {sig['returns']!r}")


def _check_text(value: str) -> str:
    if "\n" in value or "\r" in value:
        raise ValueError("string arguments cannot contain newlines")
    return value


def encode_value(type_: str, value: Any) -> str:
    if type_ in ("int", "long"):
        return str(int(value))
    if type_ == "string":
        return _check_text(str(value))
    if type_ == "int[]":
        return f"{len(value)}\n{' '.join(str(int(v)) for v in value)}"
    raise ValueError(f"unsupported parameter type {type_}")


def encode_case(sig: Signature, args: Sequence[Any]) -> str:
    """One test case's stdin block (no trailing newline)."""
    return "\n".join(encode_value(p["type"], a) for p, a in zip(sig["params"], args, strict=True))


def encode_input(cases: Sequence[str]) -> str:
    """Full stdin for a batch: the case count followed by the cases."""
    return "\n".join([str(len(cases)), *cases]) + "\n"


def encode_output(type_: str, value: Any) -> str:
    """Canonical single-line form of a return value."""
    if type_ in ("int", "long"):
        return str(int(value))
    if type_ == "bool":
        return "true" if value else "false"
    if type_ == "string":
        return _check_text(str(value))
    if type_ == "int[]":
        return " ".join(str(int(v)) for v in value)
    raise ValueError(f"unsupported return type {type_}")


def outputs_equal(type_: str, expected: str, actual: str) -> bool:
    if type_ == "string":
        return expected.rstrip("\r") == actual.rstrip("\r")
    return expected.split() == actual.split()


# --------------------------------------------------------------------------- display helpers


def _display_list(values: Sequence[Any]) -> str:
    return "[" + ", ".join(str(v) for v in values) + "]"


def display_value(type_: str, value: Any) -> str:
    if type_ in ("int", "long"):
        return str(int(value))
    if type_ == "bool":
        return "true" if value else "false"
    if type_ == "string":
        return '"' + str(value) + '"'
    if type_ == "int[]":
        return _display_list([int(v) for v in value])
    raise ValueError(type_)


def display_input(sig: Signature, args: Sequence[Any]) -> str:
    """`nums = [2, 7, 11, 15], k = 9` — the form shown in the Testcases tab."""
    return ", ".join(f"{p['name']} = {display_value(p['type'], a)}" for p, a in zip(sig["params"], args, strict=True))


def display_output_line(type_: str, line: str) -> str:
    """Render a canonical output line (expected or the player's) for the UI."""
    if type_ == "int[]":
        return _display_list(line.split())
    if type_ == "string":
        return '"' + line + '"'
    return line.strip()


# --------------------------------------------------------------------------- whole-program (io) problems


def normalize_output(text: str) -> str:
    """Line-wise comparison form: trailing spaces and trailing blank lines are insignificant."""
    lines = [ln.rstrip() for ln in text.replace("\r\n", "\n").replace("\r", "\n").split("\n")]
    while lines and not lines[-1]:
        lines.pop()
    return "\n".join(lines)


def io_outputs_equal(expected: str, actual: str) -> bool:
    return normalize_output(expected) == normalize_output(actual)
