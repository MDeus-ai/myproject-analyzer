
import React, { useMemo } from "react";
import type { AnalyzerStyle } from "@myproject/core/codeAnalyzer";

/**
 * Presentational highlighter for the combined CodeFile Analyzer output.
 *
 * The copied/downloaded text stays untouched plain text — this component only
 * re-renders the preview with color coding so the structure is scannable.
 * Supports all six format presets: Standard, Compact, Markdown, XML, JSONL
 * and JSON. When `format` is omitted it falls back to heuristic detection of
 * the Standard/Markdown/XML layouts.
 *
 * Accent spans use the adaptive helper classes (text-info / text-ok /
 * text-accent / text-warn / text-danger) so the preview stays readable in
 * light mode and follows the active color palette.
 */

const SEPARATOR_RE = /^={10,}$/;
const META_RE = /^(FILE LOCATION|FILE NAME|FILE TYPE|FILE SIZE):\s?(.*)$/;
const DOC_HEADER_RE =
  /^(CODEFILE ANALYZER|ROOT FOLDER|TOTAL FILES INCLUDED|EXPORT TIMESTAMP):\s?(.*)$/;
const TOC_ENTRY_RE = /^(\s*\d+\.\s+)\[([^\]]+)\]\s+(.*?)(\s+\([^()]+\))?$/;
const END_MARKER_RE = /^END OF FILE:\s?(.*)$/;
const MD_HEADING_RE = /^### File:\s?(.*)$/;
const MD_META_RE = /^> \*\*(Location|Type|Size)\*\*:\s?(.*)$/;
const MD_HEADER_META_RE = /^- \*\*(.+?)\*\*:\s?(.*)$/;
const MD_END_RE = /^<!--\s*END OF FILE:.*-->$/;
const FENCE_RE = /^```/;
const XML_OPEN_RE = /^<file\s/;
const XML_CLOSE_RE = /^<\/file>$/;
const CODEBASE_OPEN_RE = /^<codebase[\s>]/;
const CODEBASE_CLOSE_RE = /^<\/codebase>$/;
const LINE_NO_RE = /^(\s*\d+ \| )(.*)$/;
const COMPACT_HEADER_RE = /^# ---- (.+) ----$/;
const CDATA_OPEN = "<![CDATA[";
const CDATA_CLOSE = "]]>";

// JSONL keys, split with a leading-boundary capture so escaped quotes inside
// content strings (\"key\":) are never mistaken for real keys.
const JSONL_KEY_SPLIT_RE =
  /(^|,)("(?:recordType|rootFolder|fileCount|exportedAt|files|path|name|fileType|language|category|size|lines|content)":)/g;
const JSONL_KEY_TEST_RE =
  /^"(?:recordType|rootFolder|fileCount|exportedAt|files|path|name|fileType|language|category|size|lines|content)":$/;

// JSON document keys: top-level document keys vs per-file record keys.
const JSON_LINE_RE = /^(\s*)"([A-Za-z]+)":\s?(.*)$/;
const JSON_TOP_KEYS = new Set([
  "rootFolder",
  "fileCount",
  "exportedAt",
  "files",
]);
const JSON_STRUCTURAL = new Set(["{", "}", "[", "]", "},", "],"]);

/** Above this many lines the highlighter falls back to plain rendering. */
const MAX_HIGHLIGHT_LINES = 12000;

function span(cls: string, text: string): React.ReactNode {
  return <span className={cls}>{text}</span>;
}

/** Colors a JSON scalar value by type (string / number / boolean). */
function renderJsonValue(raw: string): React.ReactNode {
  const comma = raw.endsWith(",") ? "," : "";
  const value = comma ? raw.slice(0, -1) : raw;
  let cls = "text-slate-300";
  if (value.startsWith('"')) cls = "text-slate-200";
  else if (/^-?\d/.test(value)) cls = "text-warn";
  else if (/^(true|false|null)$/.test(value)) cls = "text-danger";
  else if (value === "[" || value === "{") cls = "text-slate-500";
  return (
    <>
      <span className={cls}>{value}</span>
      {comma}
    </>
  );
}

/** JSON: cyan document keys, purple record keys, typed value colors. */
function renderJson(lines: string[]): React.ReactNode[] {
  return lines.map((line, i) => {
    const m = line.match(JSON_LINE_RE);
    let node: React.ReactNode;
    if (m) {
      node = (
        <>
          {m[1]}
          <span
            className={JSON_TOP_KEYS.has(m[2]) ? "text-info" : "text-accent"}
          >
            "{m[2]}"
          </span>
          <span className="text-slate-500">: </span>
          {renderJsonValue(m[3])}
        </>
      );
    } else if (JSON_STRUCTURAL.has(line.trim())) {
      node = span("text-slate-500", line);
    } else {
      node = span("text-slate-400", line);
    }
    return (
      <React.Fragment key={i}>
        {node}
        {"\n"}
      </React.Fragment>
    );
  });
}

/** JSONL: metadata record keys in cyan, file record keys in purple. */
function renderJsonl(lines: string[]): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) {
      nodes.push(<React.Fragment key={i}>{"\n"}</React.Fragment>);
      continue;
    }
    const keyCls = line.includes('"recordType":"metadata"')
      ? "text-info"
      : "text-accent";
    const parts = line.split(JSONL_KEY_SPLIT_RE);
    nodes.push(
      <React.Fragment key={i}>
        {parts.map((part, j) => {
          if (!part) return null;
          if (JSONL_KEY_TEST_RE.test(part)) {
            return (
              <span key={j} className={keyCls}>
                {part}
              </span>
            );
          }
          return (
            <span key={j} className="text-slate-300">
              {part}
            </span>
          );
        })}
        {"\n"}
      </React.Fragment>,
    );
  }
  return nodes;
}

/** Compact: cyan path headers, plain code bodies. */
function renderCompact(lines: string[]): React.ReactNode[] {
  return lines.map((line, i) => {
    const match = line.match(COMPACT_HEADER_RE);
    return (
      <React.Fragment key={i}>
        {match ? (
          <>
            {span("text-slate-600", "# ---- ")}
            {span("text-info", match[1])}
            {span("text-slate-600", " ----")}
          </>
        ) : (
          span("text-slate-300", line)
        )}
        {"\n"}
      </React.Fragment>
    );
  });
}

/** Standard / Markdown / XML heuristic highlighter. */
function renderStructured(lines: string[]): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let inMeta = false;
  let inCode = false;
  let inFence = false;
  let inXml = false;
  let inToc = false;

  const push = (node: React.ReactNode, i: number) => {
    nodes.push(
      <React.Fragment key={i}>
        {node}
        {"\n"}
      </React.Fragment>,
    );
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const next = lines[i + 1] ?? "";

    // Separator rows =====================================================
    if (SEPARATOR_RE.test(line)) {
      if (inCode) {
        // Code may legitimately contain ===== banner lines; only end the
        // code block when the following line confirms a boundary.
        if (END_MARKER_RE.test(next) || /^FILE LOCATION:/.test(next)) {
          inCode = false;
          push(span("text-slate-600", line), i);
        } else {
          push(span("text-slate-500", line), i); // banner inside code
        }
      } else {
        if (inMeta) {
          inMeta = false;
          inCode = true; // separator right after FILE SIZE -> code begins
        }
        inToc = false;
        push(span("text-slate-600", line), i);
      }
      continue;
    }

    // END OF FILE marker (standard style)
    const endMatch = line.match(END_MARKER_RE);
    if (endMatch && !inCode && !inFence && !inXml) {
      push(
        <>
          {span("text-ok font-semibold", "END OF FILE: ")}
          {span("text-ok", endMatch[1])}
        </>,
        i,
      );
      continue;
    }

    // CDATA markers inside XML file bodies
    if (inXml && (line === CDATA_OPEN || line === CDATA_CLOSE)) {
      push(span("text-slate-600", line), i);
      continue;
    }

    // Root <codebase> wrapper tags
    if (CODEBASE_OPEN_RE.test(line)) {
      push(span("text-accent", line), i);
      continue;
    }
    if (CODEBASE_CLOSE_RE.test(line)) {
      push(span("text-ok", line), i);
      continue;
    }

    // Metadata block (standard style)
    const metaMatch = line.match(META_RE);
    if (metaMatch && !inCode && !inFence && !inXml) {
      inMeta = true;
      const [, label, value] = metaMatch;
      const valueCls =
        label === "FILE LOCATION"
          ? "text-info"
          : label === "FILE TYPE"
            ? "text-accent"
            : "text-slate-200";
      push(
        <>
          {span("text-accent font-semibold", `${label}: `)}
          {span(valueCls, value)}
        </>,
        i,
      );
      continue;
    }

    // Document header lines (standard style)
    const docMatch = line.match(DOC_HEADER_RE);
    if (docMatch && !inCode && !inFence && !inXml) {
      const [, label, value] = docMatch;
      push(
        <>
          {span("text-info font-semibold", `${label}: `)}
          {span("text-slate-200", value)}
        </>,
        i,
      );
      continue;
    }

    // Table of contents (standard + markdown)
    if (
      (line === "TABLE OF CONTENTS:" || line === "## Table of Contents") &&
      !inCode &&
      !inFence &&
      !inXml
    ) {
      inToc = true;
      push(span("text-slate-100 font-bold", line), i);
      continue;
    }
    if (inToc) {
      const tocMatch = line.match(TOC_ENTRY_RE);
      if (tocMatch) {
        const [, num, tag, path, size] = tocMatch;
        push(
          <>
            {span("text-slate-500", num)}
            {span("text-info font-semibold", `[${tag}]`)}{" "}
            {span("text-slate-200", path)}
            {size ? span("text-slate-500", size) : null}
          </>,
          i,
        );
      } else {
        push(span("text-slate-400", line), i);
      }
      continue;
    }

    // Markdown style
    const mdHeading = line.match(MD_HEADING_RE);
    if (mdHeading && !inFence) {
      push(
        <>
          {span("text-info font-bold", "### File: ")}
          {span("text-info", mdHeading[1])}
        </>,
        i,
      );
      continue;
    }
    const mdMeta = line.match(MD_META_RE);
    if (mdMeta && !inFence) {
      push(
        <>
          {span("text-accent font-semibold", `> **${mdMeta[1]}**: `)}
          {span("text-slate-200", mdMeta[2])}
        </>,
        i,
      );
      continue;
    }
    const mdHeaderMeta = line.match(MD_HEADER_META_RE);
    if (mdHeaderMeta && !inFence && !inXml) {
      push(
        <>
          {span("text-accent font-semibold", `- **${mdHeaderMeta[1]}**: `)}
          {span("text-slate-200", mdHeaderMeta[2])}
        </>,
        i,
      );
      continue;
    }
    if (line.startsWith("# ") && !inFence && !inXml) {
      push(span("text-info font-bold", line), i);
      continue;
    }
    if (MD_END_RE.test(line)) {
      push(span("text-ok", line), i);
      continue;
    }
    if (FENCE_RE.test(line)) {
      inFence = !inFence;
      push(span("text-slate-600", line), i);
      continue;
    }

    // XML style
    if (XML_OPEN_RE.test(line)) {
      inXml = true;
      push(span("text-accent", line), i);
      continue;
    }
    if (XML_CLOSE_RE.test(line)) {
      inXml = false;
      push(span("text-ok", line), i);
      continue;
    }

    // Code body (with optional dimmed line-number gutter)
    if (inCode || inFence || inXml) {
      const ln = inCode ? line.match(LINE_NO_RE) : null;
      if (ln) {
        push(
          <>
            {span("text-slate-600", ln[1])}
            {span("text-slate-300", ln[2])}
          </>,
          i,
        );
      } else {
        push(span("text-slate-300", line), i);
      }
      continue;
    }

    // Anything else
    push(span("text-slate-400", line), i);
  }

  return nodes;
}

export const AnalyzerTextPreview: React.FC<{
  text: string;
  format?: AnalyzerStyle;
}> = ({ text, format }) => {
  const rendered = useMemo<React.ReactNode[] | null>(() => {
    const lines = text.split("\n");
    if (lines.length > MAX_HIGHLIGHT_LINES) return null;

    if (format === "json") return renderJson(lines);
    if (format === "jsonl") return renderJsonl(lines);
    if (format === "compact") return renderCompact(lines);
    return renderStructured(lines);
  }, [text, format]);

  if (rendered === null) {
    return (
      <pre className="font-mono text-xs text-slate-200 leading-relaxed whitespace-pre-wrap break-all">
        {text}
      </pre>
    );
  }

  return (
    <pre className="font-mono text-xs leading-relaxed whitespace-pre-wrap break-all">
      {rendered}
    </pre>
  );
};
