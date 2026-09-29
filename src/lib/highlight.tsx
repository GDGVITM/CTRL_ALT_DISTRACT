import type { ReactNode } from "react";

const KEYWORDS = new Set([
  "def", "class", "return", "if", "elif", "else", "for", "while", "in", "not", "and", "or",
  "import", "from", "pass", "break", "continue", "self", "True", "False", "None", "int", "float",
  "public", "private", "static", "void", "new", "const", "let", "var", "include", "using",
  "namespace", "struct", "template", "typename", "vector", "string",
]);

export function highlightCode(code: string, lang: string, errorLine?: number | null): ReactNode[] {
  const lines = code.split("\n");
  return lines.map((line, i) => (
    <div
      key={i}
      className={errorLine === i + 1 ? "underline decoration-danger decoration-wavy underline-offset-4" : undefined}
    >
      {tokenizeLine(line, lang)}
      {line.length === 0 ? " " : null}
    </div>
  ));
}

function tokenizeLine(line: string, _lang: string): ReactNode[] {
  const tokens: ReactNode[] = [];
  const regex =
    /(#.*$|\/\/.*$)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|(\b\d+\.?\d*\b)|([A-Za-z_][A-Za-z0-9_]*)|(\s+)|([^\sA-Za-z0-9_]+)/g;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = regex.exec(line))) {
    const [full, comment, str, num, word, space, punct] = match;
    if (comment) {
      tokens.push(
        <span key={key++} className="text-syn-comment italic">
          {comment}
        </span>,
      );
    } else if (str) {
      tokens.push(
        <span key={key++} className="text-syn-string">
          {str}
        </span>,
      );
    } else if (num) {
      tokens.push(
        <span key={key++} className="text-syn-number">
          {num}
        </span>,
      );
    } else if (word) {
      if (KEYWORDS.has(word)) {
        tokens.push(
          <span key={key++} className="text-syn-keyword">
            {word}
          </span>,
        );
      } else if (/^[A-Z]/.test(word)) {
        tokens.push(
          <span key={key++} className="text-syn-type">
            {word}
          </span>,
        );
      } else {
        tokens.push(<span key={key++}>{word}</span>);
      }
    } else if (space) {
      tokens.push(<span key={key++}>{space}</span>);
    } else if (punct) {
      tokens.push(
        <span key={key++} className="text-syn-operator">
          {punct}
        </span>,
      );
    } else {
      tokens.push(<span key={key++}>{full}</span>);
    }
  }
  return tokens;
}
