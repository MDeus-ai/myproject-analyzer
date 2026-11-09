import React, { useMemo } from "react";

/**
 * Presentational highlighter for the combined CodeFile Analyzer output.
 *
 * The copied/downloaded text stays untouched plain text — this component only
 * re-renders the preview with color coding so the structure is scannable:
 *   - separators ........... dimmed
 *   - document header ...... cyan labels
 *   - metadata labels ...... purple (theme accent), values bright, paths cyan
 *   - table of contents .... cyan type tags, bright paths, muted sizes
 *   - END OF FILE markers .. emerald
 *   - code bodies .......... default, with a dimmed line-number gutter
 *
 * Supports all three format presets (Standard / Markdown / XML).
 */

const SEPARATOR_RE = /^={10,}$/;
const META_RE = /^(FILE LOCATION|FILE NAME|FILE TYPE|FILE SIZE):\s?(.*)$/;
const DOC_HEADER_RE =
  /^(CODEFILE ANALYZER|ROOT FOLDER|TOTAL FILES INCLUDED|EXPORT TIMESTAMP):\s?(.*)$/;
const TOC_ENTRY_RE = /^(\s*\d+\.\s+)\[([^\]]+)\]\s+(.*?)(\s+\([^()]+\))?$/;
const END_MARKER_RE = /^END OF FILE:\s?(.*)$/;
const MD_HEADING_RE = /^### File:\s?(.*)$/;
const MD_META_RE = /^> \*\*(Location|Type|Size)\*\*:\s?(.*)$/;
const MD_END_RE = /^<!--\s*END OF FILE:.*-->$/;
const FENCE_RE = /^```/;
const XML_OPEN_RE = /^<file\s/;
const XML_CLOSE_RE = /^<\/file>$/;
const LINE_NO_RE = /^(\s*\d+ \| )(.*)$/;

/** Above this many lines the highlighter falls back to plain rendering. */
const MAX_HIGHLIGHT_LINES = 12000;

function span(cls: string, text: string): React.ReactNode {
  return <span className={cls}>{text}</span>;
}

export const AnalyzerTextPreview: React.FC<{ text: string }> = ({ text }) => {
  const rendered = useMemo<React.ReactNode[] | null>(() => {
    const lines = text.split("\n");
    if (lines.length > MAX_HIGHLIGHT_LINES) return null;

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
            {span("text-emerald-400 font-semibold", "END OF FILE: ")}
            {span("text-emerald-300", endMatch[1])}
          </>,
          i,
        );
        continue;
      }

      // Metadata block (standard style)
      const metaMatch = line.match(META_RE);
      if (metaMatch && !inCode && !inFence && !inXml) {
        inMeta = true;
        const [, label, value] = metaMatch;
        const valueCls =
          label === "FILE LOCATION"
            ? "text-cyan-300"
            : label === "FILE TYPE"
              ? "text-violet-300"
              : "text-slate-200";
        push(
          <>
            {span("text-purple-400 font-semibold", `${label}: `)}
            {span(valueCls, value)}
          </>,
          i,
        );
        continue;
      }

      // Document header lines
      const docMatch = line.match(DOC_HEADER_RE);
      if (docMatch && !inCode && !inFence && !inXml) {
        const [, label, value] = docMatch;
        push(
          <>
            {span("text-cyan-400 font-semibold", `${label}: `)}
            {span("text-slate-200", value)}
          </>,
          i,
        );
        continue;
      }

      // Table of contents
      if (line === "TABLE OF CONTENTS:" && !inCode && !inFence && !inXml) {
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
              {span("text-cyan-400 font-semibold", `[${tag}]`)}{" "}
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
            {span("text-cyan-400 font-bold", "### File: ")}
            {span("text-cyan-200", mdHeading[1])}
          </>,
          i,
        );
        continue;
      }
      const mdMeta = line.match(MD_META_RE);
      if (mdMeta && !inFence) {
        push(
          <>
            {span("text-purple-400 font-semibold", `> **${mdMeta[1]}**: `)}
            {span("text-slate-200", mdMeta[2])}
          </>,
          i,
        );
        continue;
      }
      if (MD_END_RE.test(line)) {
        push(span("text-emerald-400", line), i);
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
        push(span("text-purple-400", line), i);
        continue;
      }
      if (XML_CLOSE_RE.test(line)) {
        inXml = false;
        push(span("text-emerald-400", line), i);
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
  }, [text]);

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
