"""Wrap a player's `Solution` class in a driver that runs every test case in one process.

Compiling once per request (rather than once per test case) keeps Judge0 load roughly an order of
magnitude lower at event scale. Each driver:

  * reads `T` and then `T` cases from stdin (see protocol.py),
  * calls `Solution().<function>(...)` per case inside a try/catch so one crash does not hide the rest,
  * prints one `@@CAD@@<i>@@OK|ERR@@...` marker per case and flushes, so partial output survives a
    timeout. The marker is matched anywhere in the output, so stray `print`s from the player's code
    cannot corrupt the protocol.

`build_source` returns the full program plus the number of prelude lines placed above the player's
code, which the evaluator subtracts to map compiler line numbers back to the editor.
"""

from __future__ import annotations

import re
from dataclasses import dataclass

from .protocol import Signature, validate_signature

SUPPORTED_LANGUAGES = ("python", "cpp", "c", "java")


@dataclass(frozen=True)
class BuiltSource:
    source: str
    line_offset: int  # lines inserted before the player's first line


# --------------------------------------------------------------------------- starter code


_CPP_PARAM = {"int": "int", "long": "long long", "string": "string", "int[]": "vector<int>&"}
_CPP_RET = {"int": "int", "long": "long long", "bool": "bool", "string": "string", "int[]": "vector<int>"}
_JAVA_TYPE = {"int": "int", "long": "long", "string": "String", "int[]": "int[]", "bool": "boolean"}
_C_RET = {"int": "int", "long": "long long", "bool": "bool", "string": "char*", "int[]": "int*"}


def starter_code(language: str, sig: Signature) -> str:
    validate_signature(sig)
    fn, params, ret = sig["function"], sig["params"], sig["returns"]

    if language == "python":
        args = "".join(f", {p['name']}" for p in params)
        return f"class Solution:\n    def {fn}(self{args}):\n        pass\n"

    if language == "cpp":
        args = ", ".join(f"{_CPP_PARAM[p['type']]} {p['name']}" for p in params)
        return f"class Solution {{\npublic:\n    {_CPP_RET[ret]} {fn}({args}) {{\n        \n    }}\n}};\n"

    if language == "c":
        parts: list[str] = []
        for p in params:
            if p["type"] == "int[]":
                parts += [f"int* {p['name']}", f"int {p['name']}Size"]
            elif p["type"] == "string":
                parts.append(f"char* {p['name']}")
            else:
                parts.append(f"{'long long' if p['type'] == 'long' else 'int'} {p['name']}")
        if ret == "int[]":
            parts.append("int* returnSize")
        return f"{_C_RET[ret]} {fn}({', '.join(parts)}) {{\n    \n}}\n"

    if language == "java":
        args = ", ".join(f"{_JAVA_TYPE[p['type']]} {p['name']}" for p in params)
        return f"class Solution {{\n    public {_JAVA_TYPE[ret]} {fn}({args}) {{\n        \n    }}\n}}\n"

    raise ValueError(f"unsupported language {language}")


# --------------------------------------------------------------------------- drivers


def _python(user: str, sig: Signature) -> BuiltSource:
    fn, params, ret = sig["function"], sig["params"], sig["returns"]
    read: list[str] = []
    for p in params:
        n = p["name"]
        if p["type"] in ("int", "long"):
            read.append(f"{n} = int(_cad_next())")
        elif p["type"] == "string":
            read.append(f"{n} = _cad_next()")
        else:
            read.append(f"_cad_next(); {n} = [int(x) for x in _cad_next().split()]")
    call_args = ", ".join(p["name"] for p in params)
    fmt = {
        "int": "str(int(_res))",
        "long": "str(int(_res))",
        "bool": '"true" if _res else "false"',
        "string": 'str(_res).replace("\\n", " ")',
        "int[]": '" ".join(str(int(x)) for x in _res)',
    }[ret]
    indent = " " * 8
    body = "\n".join(indent + line for line in read)
    driver = f"""

def _cad_main():
    import sys
    _lines = sys.stdin.read().split("\\n")
    _pos = [0]

    def _cad_next():
        v = _lines[_pos[0]] if _pos[0] < len(_lines) else ""
        _pos[0] += 1
        return v.rstrip("\\r")

    _t = int(_cad_next())
    for _i in range(_t):
{body}
        try:
            _res = Solution().{fn}({call_args})
            if _res is None:
                raise TypeError("function returned None")
            _out = {fmt}
            sys.stdout.write("\\n@@CAD@@%d@@OK@@%s\\n" % (_i, _out))
        except BaseException as _e:
            _msg = (str(_e).splitlines() or [""])[0][:200]
            sys.stdout.write("\\n@@CAD@@%d@@ERR@@%s: %s\\n" % (_i, type(_e).__name__, _msg))
        sys.stdout.flush()


_cad_main()
"""
    return BuiltSource(user.rstrip("\n") + "\n" + driver, 0)


def _cpp(user: str, sig: Signature) -> BuiltSource:
    fn, params, ret = sig["function"], sig["params"], sig["returns"]
    read: list[str] = []
    for p in params:
        n = p["name"]
        if p["type"] == "int":
            read.append(f"_cad_next(_l); int {n} = (int)stoll(_l);")
        elif p["type"] == "long":
            read.append(f"_cad_next(_l); long long {n} = stoll(_l);")
        elif p["type"] == "string":
            read.append(f"string {n}; _cad_next({n});")
        else:
            read.append(
                f"_cad_next(_l); vector<int> {n}; _cad_next(_l); "
                f"{{ istringstream _is(_l); int _x; while (_is >> _x) {n}.push_back(_x); }}"
            )
    call_args = ", ".join(p["name"] for p in params)
    fmt = {
        "int": "_o << _r;",
        "long": "_o << _r;",
        "bool": '_o << (_r ? "true" : "false");',
        "string": "_o << _r;",
        "int[]": "for (size_t _j = 0; _j < _r.size(); ++_j) { if (_j) _o << ' '; _o << _r[_j]; }",
    }[ret]
    body = "\n".join("        " + line for line in read)
    prelude = "#include <bits/stdc++.h>\nusing namespace std;\n"
    driver = f"""
static bool _cad_next(string& out) {{
    if (!getline(cin, out)) {{ out.clear(); return false; }}
    if (!out.empty() && out.back() == '\\r') out.pop_back();
    return true;
}}

int main() {{
    ios::sync_with_stdio(false);
    string _l;
    _cad_next(_l);
    int _t = atoi(_l.c_str());
    for (int _i = 0; _i < _t; ++_i) {{
{body}
        try {{
            Solution _s;
            auto _r = _s.{fn}({call_args});
            ostringstream _o;
            {fmt}
            cout << "\\n@@CAD@@" << _i << "@@OK@@" << _o.str() << "\\n" << flush;
        }} catch (const exception& _e) {{
            cout << "\\n@@CAD@@" << _i << "@@ERR@@" << _e.what() << "\\n" << flush;
        }} catch (...) {{
            cout << "\\n@@CAD@@" << _i << "@@ERR@@unknown exception\\n" << flush;
        }}
    }}
    return 0;
}}
"""
    return BuiltSource(prelude + user.rstrip("\n") + "\n" + driver, prelude.count("\n"))


def _c(user: str, sig: Signature) -> BuiltSource:
    fn, params, ret = sig["function"], sig["params"], sig["returns"]
    read: list[str] = []
    call: list[str] = []
    for p in params:
        n = p["name"]
        if p["type"] == "int":
            read.append(f"_l = _cad_line(); int {n} = (int)strtoll(_l, NULL, 10); free(_l);")
            call.append(n)
        elif p["type"] == "long":
            read.append(f"_l = _cad_line(); long long {n} = strtoll(_l, NULL, 10); free(_l);")
            call.append(n)
        elif p["type"] == "string":
            read.append(f"char* {n} = _cad_line();")
            call.append(n)
        else:
            read.append(
                f"_l = _cad_line(); int {n}_n = (int)strtoll(_l, NULL, 10); free(_l); "
                f"int* {n} = (int*)malloc(sizeof(int) * (size_t)({n}_n > 0 ? {n}_n : 1)); "
                f"_l = _cad_line(); {{ char* _p = _l; for (int _j = 0; _j < {n}_n; ++_j) {n}[_j] = (int)strtol(_p, &_p, 10); }} free(_l);"
            )
            call += [n, f"{n}_n"]
    if ret == "int[]":
        call.append("&_rs")
    call_args = ", ".join(call)
    marker = 'printf("\\n@@CAD@@%d@@OK@@", _i);'
    emit = {
        "int": f"int _r = {fn}({call_args}); {marker} printf(\"%d\\n\", _r);",
        "long": f"long long _r = {fn}({call_args}); {marker} printf(\"%lld\\n\", _r);",
        "bool": f"bool _r = {fn}({call_args}); {marker} printf(\"%s\\n\", _r ? \"true\" : \"false\");",
        "string": f"char* _r = {fn}({call_args}); {marker} printf(\"%s\\n\", _r ? _r : \"\");",
        "int[]": (
            f"int _rs = 0; int* _r = {fn}({call_args}); {marker} "
            'for (int _j = 0; _j < _rs; ++_j) printf(_j ? " %d" : "%d", _r[_j]); printf("\\n");'
        ),
    }[ret]
    body = "\n".join("        " + line for line in read)
    prelude = "#define _GNU_SOURCE\n#include <stdio.h>\n#include <stdlib.h>\n#include <string.h>\n#include <stdbool.h>\n"
    driver = f"""
static char* _cad_line(void) {{
    size_t cap = 4096, len = 0;
    char* buf = (char*)malloc(cap);
    int c;
    while ((c = getchar()) != EOF && c != '\\n') {{
        if (len + 1 >= cap) {{ cap <<= 1; buf = (char*)realloc(buf, cap); }}
        buf[len++] = (char)c;
    }}
    if (len > 0 && buf[len - 1] == '\\r') len--;
    buf[len] = 0;
    return buf;
}}

int main(void) {{
    char* _l = _cad_line();
    int _t = (int)strtol(_l, NULL, 10);
    free(_l);
    for (int _i = 0; _i < _t; ++_i) {{
{body}
        {emit}
        fflush(stdout);
    }}
    return 0;
}}
"""
    return BuiltSource(prelude + user.rstrip("\n") + "\n" + driver, prelude.count("\n"))


def _java(user: str, sig: Signature) -> BuiltSource:
    fn, params, ret = sig["function"], sig["params"], sig["returns"]
    read: list[str] = []
    for p in params:
        n = p["name"]
        if p["type"] == "int":
            read.append(f"int {n} = Integer.parseInt(_br.readLine().trim());")
        elif p["type"] == "long":
            read.append(f"long {n} = Long.parseLong(_br.readLine().trim());")
        elif p["type"] == "string":
            read.append(f'String {n} = _br.readLine(); if ({n} == null) {n} = ""; {n} = {n}.replace("\\r", "");')
        else:
            read.append(
                f"int {n}_n = Integer.parseInt(_br.readLine().trim()); int[] {n} = new int[{n}_n]; "
                f"{{ StringTokenizer _st = new StringTokenizer(_br.readLine()); for (int _j = 0; _j < {n}_n; ++_j) {n}[_j] = Integer.parseInt(_st.nextToken()); }}"
            )
    call_args = ", ".join(p["name"] for p in params)
    fmt = {
        "int": "String.valueOf(_r)",
        "long": "String.valueOf(_r)",
        "bool": '(_r ? "true" : "false")',
        "string": '(_r == null ? "" : _r)',
        "int[]": "_join(_r)",
    }[ret]
    body = "\n".join("            " + line for line in read)
    prelude = "import java.util.*;\nimport java.io.*;\n"
    driver = f"""
public class Main {{
    static String _join(int[] a) {{
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < a.length; i++) {{ if (i > 0) sb.append(' '); sb.append(a[i]); }}
        return sb.toString();
    }}

    public static void main(String[] _args) throws Exception {{
        BufferedReader _br = new BufferedReader(new InputStreamReader(System.in), 1 << 16);
        int _t = Integer.parseInt(_br.readLine().trim());
        for (int _i = 0; _i < _t; _i++) {{
{body}
            try {{
                {_JAVA_TYPE[ret]} _r = new Solution().{fn}({call_args});
                System.out.print("\\n@@CAD@@" + _i + "@@OK@@" + {fmt} + "\\n");
            }} catch (Throwable _e) {{
                String _m = String.valueOf(_e.getMessage()).replace("\\n", " ");
                if (_m.length() > 200) _m = _m.substring(0, 200);
                System.out.print("\\n@@CAD@@" + _i + "@@ERR@@" + _e.getClass().getSimpleName() + ": " + _m + "\\n");
            }}
            System.out.flush();
        }}
    }}
}}
"""
    # A `public class Solution` would have to live in Solution.java; make it package-private instead.
    user = re.sub(r"\bpublic(\s+(?:final\s+)?class\s+Solution\b)", r"\1", user)
    return BuiltSource(prelude + user.rstrip("\n") + "\n" + driver, prelude.count("\n"))


_BUILDERS = {"python": _python, "cpp": _cpp, "c": _c, "java": _java}


def build_source(language: str, sig: Signature, user_code: str) -> BuiltSource:
    validate_signature(sig)
    try:
        builder = _BUILDERS[language]
    except KeyError:
        raise ValueError(f"unsupported language {language}") from None
    return builder(user_code.replace("\r\n", "\n"), sig)


_IO_STARTERS = {
    "python": "import sys\n\n# Read the input from stdin and print the answer.\n",
    "cpp": "#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    \n    return 0;\n}\n",
    "c": "#include <stdio.h>\n\nint main() {\n    \n    return 0;\n}\n",
    "java": (
        "import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n"
        "        Scanner sc = new Scanner(System.in);\n        \n    }\n}\n"
    ),
}


def starter_code_io(language: str) -> str:
    """Skeleton for a whole-program problem (reads stdin, writes stdout)."""
    try:
        return _IO_STARTERS[language]
    except KeyError:
        raise ValueError(f"unsupported language {language}") from None
