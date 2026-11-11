import React, { useMemo } from "react";
import { FileDiff } from "lucide-react";
import {
  diffLines,
  collapseContext,
  diffStats,
  DiffViewItem,
} from "@myproject/core/codeDiff";

interface SmartPasteDiffPreviewProps {
  path: string;
  action: "modify" | "create" | "delete";
  content: string;
  /** Original content from the loaded project (undefined = brand-new file). */
  originalContent?: string;
}

const MAX_RENDERED_ITEMS = 400;

/**
 * Color-coded inline diff of a parsed Smart Paste block against the loaded
 * project file: emerald = lines the paste ADDS, rose = lines it REMOVES,
 * dim = untouched context (long runs collapsed).
 */
export const SmartPasteDiffPreview: React.FC<SmartPasteDiffPreviewProps> = ({
  path,
  action,
  content,
  originalContent,
}) => {
  const { items, stats, identical, wasClipped } = useMemo(() => {
    const before = originalContent ?? "";
    const after = action === "delete" ? "" : content;
    const lines = diffLines(before, after);
    const s = diffStats(lines);
    const isIdentical = s.added === 0 && s.removed === 0;
    const collapsed = collapseContext(lines, 3);
    const clipped = collapsed.length > MAX_RENDERED_ITEMS;
    return {
      items: clipped ? collapsed.slice(0, MAX_RENDERED_ITEMS) : collapsed,
      stats: s,
      identical: isIdentical,
      wasClipped: clipped,
    };
  }, [originalContent, content, action]);

  const rowClass = (type: string) =>
    type === "added"
      ? "bg-emerald-500/10 text-emerald-300"
      : type === "removed"
        ? "bg-rose-500/10 text-rose-300"
        : "text-slate-400";

  return (
    <div className="rounded-xl border border-subtle bg-black/40 overflow-hidden">
      {/* Header with add/remove stats */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-b border-subtle surface-raised">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-200 min-w-0">
          <FileDiff className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="font-mono truncate">{path}</span>
        </span>
        <span className="flex items-center gap-2 text-[10px] font-mono shrink-0">
          {action === "create" ? (
            <span className="text-emerald-300">new file — all lines added</span>
          ) : action === "delete" ? (
            <span className="text-rose-300">file deleted — all lines removed</span>
          ) : identical ? (
            <span className="text-slate-400">
              no changes — identical to loaded file
            </span>
          ) : (
            <>
              <span className="text-emerald-300">+{stats.added} added</span>
              <span className="text-rose-300">−{stats.removed} removed</span>
              <span className="text-slate-500">
                {stats.unchanged} unchanged
              </span>
            </>
          )}
        </span>
      </div>

      {/* Diff body */}
      <div className="max-h-80 overflow-y-auto overflow-x-auto py-1 font-mono text-[11px] leading-5">
        {items.map((item: DiffViewItem, idx: number) =>
          item.type === "gap" ? (
            <div
              key={`gap-${idx}`}
              className="px-4 py-0.5 text-slate-600 italic select-none"
            >
              ··· {item.count} unchanged line{item.count !== 1 ? "s" : ""} ···
            </div>
          ) : (
            <div key={idx} className={`px-2 whitespace-pre ${rowClass(item.type)}`}>
              <span className="inline-block w-9 text-right pr-2 text-slate-600 select-none">
                {item.oldLineNumber ?? ""}
              </span>
              <span className="inline-block w-9 text-right pr-2 text-slate-600 select-none">
                {item.newLineNumber ?? ""}
              </span>
              <span className="inline-block w-4 select-none">
                {item.type === "added" ? "+" : item.type === "removed" ? "-" : " "}
              </span>
              <span>{item.text || " "}</span>
            </div>
          ),
        )}
        {wasClipped && (
          <div className="px-4 py-1 text-slate-500 italic">
            ··· preview clipped at {MAX_RENDERED_ITEMS} rows ···
          </div>
        )}
      </div>
    </div>
  );
};