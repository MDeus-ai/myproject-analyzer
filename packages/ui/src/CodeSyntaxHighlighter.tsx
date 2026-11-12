import React, { useMemo } from "react";

export type TokenKind =
  | "plain"
  | "keyword"
  | "type"
  | "fn"
  | "string"
  | "number"
  | "comment"
  | "macro"
  | "lifetime"
  | "operator"
  | "attr";

export interface SyntaxToken {
  text: string;
  kind: TokenKind;
}

const KEYWORDS = new Set([
  // JS / TS
  "import",
  "export",
  "from",
  "default",
  "function",
  "return",
  "const",
  "let",
  "var",
  "if",
  "else",
  "for",
  "while",
  "do",
  "switch",
  "case",
  "break",
  "continue",
  "try",
  "catch",
  "finally",
  "throw",
  "new",
  "typeof",
  "instanceof",
  "in",
  "of",
  "async",
  "await",
  "yield",
  "class",
  "extends",
  "implements",
  "interface",
  "type",
  "enum",
  "readonly",
  "private",
  "protected",
  "public",
  "static",
  "get",
  "set",
  "as",
  // Rust
  "fn",
  "pub",
  "mod",
  "use",
  "crate",
  "super",
  "self",
  "struct",
  "trait",
  "impl",
  "where",
  "match",
  "mut",
  "ref",
  "move",
  "loop",
  "unsafe",
  "extern",
  "dyn",
  // C / C++
  "namespace",
  "using",
  "template",
  "typename",
  "constexpr",
  "consteval",
  "noexcept",
  "virtual",
  "override",
  "final",
  "explicit",
  "friend",
  "inline",
  "sizeof",
  "alignof",
  "nullptr",
  "delete",
  "operator",
  "typedef",
  "union",
  "volatile",
  "register",
  // Python / Go / general
  "def",
  "elif",
  "except",
  "lambda",
  "pass",
  "raise",
  "with",
  "package",
  "func",
  "defer",
  "go",
  "chan",
  "select",
]);

const BUILTIN_TYPES = new Set([
  // TS / JS
  "string",
  "number",
  "boolean",
  "any",
  "void",
  "unknown",
  "never",
  "null",
  "undefined",
  "true",
  "false",
  "Promise",
  "Record",
  "Array",
  "Map",
  "Set",
  "React",
  // Rust
  "Self",
  "u8",
  "u16",
  "u32",
  "u64",
  "u128",
  "usize",
  "i8",
  "i16",
  "i32",
  "i64",
  "i128",
  "isize",
  "f32",
  "f64",
  "bool",
  "char",
  "str",
  "String",
  "Vec",
  "Option",
  "Result",
  "Some",
  "None",
  "Ok",
  "Err",
  "Box",
  "Arc",
  "Rc",
  "Mutex",
  "RwLock",
  "HashMap",
  "BTreeMap",
  // C / C++
  "int",
  "long",
  "short",
  "float",
  "double",
  "unsigned",
  "signed",
  "auto",
  "size_t",
  "ssize_t",
  "uint8_t",
  "uint16_t",
  "uint32_t",
  "uint64_t",
  "int8_t",
  "int16_t",
  "int32_t",
  "int64_t",
  "uintptr_t",
  "ptrdiff_t",
  "std",
  "vector",
  "unique_ptr",
  "shared_ptr",
  "optional",
  "string_view",
  "span",
]);

export function inferLanguageFromPath(filePath?: string): string {
  if (!filePath) return "code";
  const lower = filePath.toLowerCase();
  if (lower.endsWith(".rs") || lower.endsWith("cargo.toml")) return "rust";
  if (
    lower.endsWith(".cpp") ||
    lower.endsWith(".cc") ||
    lower.endsWith(".cxx") ||
    lower.endsWith(".hpp") ||
    lower.endsWith(".hh") ||
    lower.endsWith(".hxx") ||
    lower.endsWith(".h") ||
    lower.endsWith(".c") ||
    lower.endsWith(".ino")
  ) {
    return "cpp";
  }
  if (lower.endsWith(".tsx") || lower.endsWith(".ts")) return "typescript";
  if (lower.endsWith(".jsx") || lower.endsWith(".js") || lower.endsWith(".mjs"))
    return "javascript";
  if (lower.endsWith(".json")) return "json";
  if (lower.endsWith(".css") || lower.endsWith(".scss")) return "css";
  if (lower.endsWith(".toml") || lower.endsWith(".yaml") || lower.endsWith(".yml"))
    return "toml";
  if (lower.endsWith("cmakelists.txt") || lower.endsWith(".cmake")) return "cmake";
  return "code";
}

/**
 * Single-line tokenizer designed for zero-lag virtualized and full-file rendering.
 */
export function tokenizeCodeLine(line: string): SyntaxToken[] {
  if (!line) return [{ text: "", kind: "plain" }];

  const trimmed = line.trimStart();
  // Whole-line comments
  if (
    trimmed.startsWith("//") ||
    trimmed.startsWith("/*") ||
    trimmed.startsWith("* ") ||
    trimmed.startsWith("*/")
  ) {
    return [{ text: line, kind: "comment" }];
  }

  // C/C++ preprocessor directives (#include, #define, #pragma, #ifdef, #endif)
  if (/^\s*#\s*(include|define|pragma|ifdef|ifndef|endif|if|elif|else|undef)\b/.test(line)) {
    const angleMatch = line.match(/^(\s*#\s*\w+\s*)(<[^>]+>|"[^"]+")(.*)$/);
    if (angleMatch) {
      const tokens: SyntaxToken[] = [
        { text: angleMatch[1], kind: "macro" },
        { text: angleMatch[2], kind: "string" },
      ];
      if (angleMatch[3]) {
        tokens.push({ text: angleMatch[3], kind: "comment" });
      }
      return tokens;
    }
    return [{ text: line, kind: "macro" }];
  }

  // Rust attributes #[derive(...)] or #![...]
  if (/^\s*#!?\[/.test(line)) {
    return [{ text: line, kind: "attr" }];
  }

  const tokens: SyntaxToken[] = [];
  let i = 0;
  const len = line.length;

  const pushPlain = (str: string) => {
    if (!str) return;
    const prev = tokens[tokens.length - 1];
    if (prev && prev.kind === "plain") {
      prev.text += str;
    } else {
      tokens.push({ text: str, kind: "plain" });
    }
  };

  while (i < len) {
    const ch = line[i];
    const next = line[i + 1];

    // Line comment starting mid-line
    if (ch === "/" && next === "/") {
      tokens.push({ text: line.slice(i), kind: "comment" });
      break;
    }

    // Inline block comment
    if (ch === "/" && next === "*") {
      const end = line.indexOf("*/", i + 2);
      if (end === -1) {
        tokens.push({ text: line.slice(i), kind: "comment" });
        break;
      } else {
        tokens.push({ text: line.slice(i, end + 2), kind: "comment" });
        i = end + 2;
        continue;
      }
    }

    // Strings ("...", '...', `...`) and Rust lifetimes ('a, 'static)
    if (ch === '"' || ch === "`" || ch === "'") {
      if (ch === "'") {
        // Check if Rust lifetime like 'a or 'static (not closed by another ' immediately)
        const lifeMatch = line.slice(i).match(/^'[a-zA-Z_][a-zA-Z0-9_]*(?!')/);
        if (lifeMatch) {
          tokens.push({ text: lifeMatch[0], kind: "lifetime" });
          i += lifeMatch[0].length;
          continue;
        }
      }
      let j = i + 1;
      while (j < len) {
        if (line[j] === "\\") {
          j += 2;
          continue;
        }
        if (line[j] === ch) {
          j++;
          break;
        }
        j++;
      }
      tokens.push({ text: line.slice(i, j), kind: "string" });
      i = j;
      continue;
    }

    // Numbers (hex, float, int, with optional Rust/C++ suffixes like u64, f32, uz)
    if (/[0-9]/.test(ch)) {
      const numMatch = line
        .slice(i)
        .match(/^(?:0x[0-9a-fA-F_]+|0b[01_]+|[0-9][0-9_]*(?:\.[0-9_]+)?(?:[eE][+-]?[0-9_]+)?(?:u8|u16|u32|u64|usize|i32|i64|f32|f64|ULL|UL|LL|f)?)/);
      if (numMatch) {
        tokens.push({ text: numMatch[0], kind: "number" });
        i += numMatch[0].length;
        continue;
      }
    }

    // Identifiers, keywords, types, functions, macros
    if (/[a-zA-Z_$]/.test(ch)) {
      let j = i + 1;
      while (j < len && /[a-zA-Z0-9_$]/.test(line[j])) {
        j++;
      }
      const word = line.slice(i, j);

      // Rust macro invocation like println!(...) or vec![...]
      if (line[j] === "!" && line[j + 1] !== "=") {
        tokens.push({ text: `${word}!`, kind: "macro" });
        i = j + 1;
        continue;
      }

      // Check what follows (ignoring spaces)
      let lookahead = j;
      while (lookahead < len && line[lookahead] === " ") lookahead++;
      const nextChar = line[lookahead];

      if (KEYWORDS.has(word)) {
        tokens.push({ text: word, kind: "keyword" });
      } else if (BUILTIN_TYPES.has(word)) {
        tokens.push({ text: word, kind: "type" });
      } else if (nextChar === "(" || (line[j] === ":" && line[j + 1] === ":")) {
        // Function call / definition or C++/Rust namespace qualifier
        if (/^[A-Z]/.test(word)) {
          tokens.push({ text: word, kind: "type" });
        } else {
          tokens.push({ text: word, kind: "fn" });
        }
      } else if (/^[A-Z][a-zA-Z0-9_]*$/.test(word)) {
        tokens.push({ text: word, kind: "type" });
      } else {
        pushPlain(word);
      }
      i = j;
      continue;
    }

    // Multi-char operators (::, ->, =>, ==, !=, <=, >=)
    if (
      (ch === ":" && next === ":") ||
      (ch === "-" && next === ">") ||
      (ch === "=" && next === ">")
    ) {
      tokens.push({ text: ch + next, kind: "operator" });
      i += 2;
      continue;
    }

    pushPlain(ch);
    i++;
  }

  return tokens;
}

const TOKEN_CLASS_MAP: Record<TokenKind, string> = {
  plain: "",
  keyword: "syn-keyword",
  type: "syn-type",
  fn: "syn-fn",
  string: "syn-string",
  number: "syn-number",
  comment: "syn-comment",
  macro: "syn-macro",
  lifetime: "syn-lifetime",
  operator: "syn-operator",
  attr: "syn-attr",
};

export const HighlightedLine: React.FC<{ line: string }> = React.memo(
  ({ line }) => {
    const tokens = useMemo(() => tokenizeCodeLine(line), [line]);
    return (
      <>
        {tokens.map((tok, idx) => {
          const cls = TOKEN_CLASS_MAP[tok.kind];
          return cls ? (
            <span key={idx} className={cls}>
              {tok.text}
            </span>
          ) : (
            <React.Fragment key={idx}>{tok.text}</React.Fragment>
          );
        })}
      </>
    );
  },
);

HighlightedLine.displayName = "HighlightedLine";

interface CodeSyntaxHighlighterProps {
  code: string;
  filePath?: string;
  language?: string;
  showLineNumbers?: boolean;
  startLine?: number;
  className?: string;
  maxHeightClass?: string;
}

export const CodeSyntaxHighlighter: React.FC<CodeSyntaxHighlighterProps> =
  React.memo(
    ({
      code,
      filePath,
      language,
      showLineNumbers = true,
      startLine = 1,
      className = "",
      maxHeightClass = "",
    }) => {
      const lines = useMemo(() => code.split(/\r?\n/), [code]);
      const resolvedLang = useMemo(
        () => language || inferLanguageFromPath(filePath),
        [language, filePath],
      );

      return (
        <div
          className={`font-mono code-scaled leading-relaxed overflow-x-auto select-text ${maxHeightClass} ${className}`}
          data-language={resolvedLang}
        >
          <table className="w-full border-collapse">
            <tbody>
              {lines.map((line, idx) => {
                const lineNum = startLine + idx;
                return (
                  <tr
                    key={idx}
                    className="hover:bg-[var(--surface-hover)] transition-colors"
                  >
                    {showLineNumbers && (
                      <td className="select-none pr-3 pl-2 text-right text-[10px] text-slate-500 font-mono w-10 align-top border-r border-subtle/60 tabular-nums">
                        {lineNum}
                      </td>
                    )}
                    <td className="pl-3 pr-4 whitespace-pre text-slate-200 font-mono">
                      {line.length > 0 ? <HighlightedLine line={line} /> : " "}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
    },
  );

CodeSyntaxHighlighter.displayName = "CodeSyntaxHighlighter";
