import React, {
  useMemo,
  useState,
  useRef,
  useEffect,
  useCallback,
} from "react";
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  RefreshCw,
  Boxes,
  Focus,
  Map as MapIcon,
  Pause,
  Play,
  Folder,
} from "lucide-react";
import type { SymbolKind } from "@myproject/core/depLenz";
import { ThemedDropdown, ThemedDropdownOption } from "./ThemedDropdown";

type Analysis = ReturnType<
  typeof import("@myproject/core/depLenz").buildCodebaseDependencyGraph
>;

interface DepLenzGraphCanvasProps {
  analysis: Analysis;
  /** Selected symbol id (shared with the dependency tree view). */
  selectedId: string | null;
  /** Focus a symbol (select + jump to the dependency tree). */
  onFocusSymbol: (symbolId: string) => void;
}

/* ------------------------------------------------------------------ */
/* Layout constants                                                    */
/* ------------------------------------------------------------------ */

const NODE_W = 208;
const NODE_H = 54;
const COL_GAP = 268;
const ROW_H = 76;
const PAD_X = 40;
const PAD_Y = 40;

/** Keep the map readable — above this, the most-connected N are shown. */
const MAX_MAP_NODES = 220;

type NodeKind = SymbolKind | "package";

interface MapNode {
  id: string;
  name: string;
  kind: NodeKind;
  fileName: string;
  filePath: string;
  moduleName: string;
  lineStart: number;
  layer: number;
  x: number;
  y: number;
  degree: number;
}

interface MapEdge {
  id: string;
  source: string;
  target: string;
  /** External package → symbol edge (drawn dotted). */
  pkg: boolean;
}

interface GraphLayout {
  nodes: MapNode[];
  nodeById: Map<string, MapNode>;
  edges: MapEdge[];
  edgesByNode: Map<string, MapEdge[]>;
  totalSymbols: number;
  trimmed: boolean;
  adjacency: Map<string, Set<string>>;
}

interface XY {
  x: number;
  y: number;
}

interface Camera {
  x: number;
  y: number;
  k: number;
}

/** Pre-computed per-node strings so the render loop never allocates text. */
interface NodeLabel {
  name: string;
  sub: string;
  glyph: string;
  links: string;
  title: string;
}

/**
 * Theme colours resolved from the existing `.dlc-*` CSS rules, so the canvas
 * renderer keeps index.css (dark/light/palette themes) as the single source
 * of truth.
 */
interface Palette {
  font: string;
  grid: string;
  gridAlpha: number;
  nodeFill: string;
  nodeStroke: string;
  nodeShadow: string;
  name: string;
  path: string;
  edge: string;
  edgeAlpha: number;
  edgePkgAlpha: number;
  edgeHot: string;
  flowSoft: string;
  flowSoftAlpha: number;
  flowHot: string;
  flowHotAlpha: number;
  port: string;
  portAlpha: number;
  portHot: string;
  clusterFill: string;
  clusterStroke: string;
  clusterLabel: string;
  clusterLabelAlpha: number;
  accentDefault: string;
  accent: Record<string, string>;
}

const SVG_NS = "http://www.w3.org/2000/svg";
const ACCENT_KINDS = [
  "component",
  "function",
  "hook",
  "class",
  "method",
  "struct",
  "trait",
  "package",
];
const DIM_ALPHA = 0.13;
const TWO_PI = Math.PI * 2;

let scratchCtx: CanvasRenderingContext2D | null | undefined;

/** Returns `value` if canvas can parse it as a colour, otherwise `fallback`. */
function canvasColor(value: string, fallback: string): string {
  const v = value.trim();
  if (!v || v === "none") return fallback;
  if (scratchCtx === undefined) {
    scratchCtx = document.createElement("canvas").getContext("2d");
  }
  if (!scratchCtx) return v;
  scratchCtx.fillStyle = "#010203";
  scratchCtx.fillStyle = v;
  return scratchCtx.fillStyle === "#010203" ? fallback : v;
}

function num(value: string, fallback: number): number {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : fallback;
}

function readPalette(host: HTMLElement): Palette {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("aria-hidden", "true");
  svg.style.cssText =
    "position:absolute;width:0;height:0;overflow:hidden;visibility:hidden;pointer-events:none";
  const mk = (tag: string, cls: string) => {
    const el = document.createElementNS(SVG_NS, tag);
    el.setAttribute("class", cls);
    svg.appendChild(el);
    return el;
  };
  const el = {
    grid: mk("circle", "dlc-grid-dot"),
    shadow: mk("rect", "dlc-node-shadow"),
    rect: mk("rect", "dlc-node-rect"),
    name: mk("text", "dlc-node-name"),
    path: mk("text", "dlc-node-path"),
    edge: mk("path", "dlc-edge"),
    pkg: mk("path", "dlc-edge dlc-edge-pkg"),
    hot: mk("path", "dlc-edge dlc-edge-hot"),
    flowSoft: mk("path", "dlc-edge-flow-soft"),
    flow: mk("path", "dlc-edge-flow"),
    port: mk("circle", "dlc-edge-port"),
    portHot: mk("circle", "dlc-edge-port dlc-edge-port-hot"),
    cRect: mk("rect", "dlc-cluster-rect"),
    cLabel: mk("text", "dlc-cluster-label"),
  };
  const kindEls = ACCENT_KINDS.map(
    (k) => [k, mk("g", `dlc-node-${k}`)] as const,
  );
  host.appendChild(svg);
  try {
    const cs = (e: Element) => getComputedStyle(e);
    const rootCs = getComputedStyle(document.documentElement);
    const accentDefault = canvasColor(
      rootCs.getPropertyValue("--color-purple-400"),
      "#c084fc",
    );
    const accent: Record<string, string> = {};
    for (const [k, e] of kindEls) {
      const v = cs(e).getPropertyValue("--dlc-accent");
      accent[k] = canvasColor(v, accentDefault);
    }
    return {
      font:
        cs(el.name).fontFamily ||
        '"IBM Plex Mono", ui-monospace, Consolas, monospace',
      grid: canvasColor(cs(el.grid).fill, "rgba(148,163,184,0.22)"),
      gridAlpha: num(cs(el.grid).opacity, 1),
      nodeFill: canvasColor(cs(el.rect).fill, "#111114"),
      nodeStroke: canvasColor(cs(el.rect).stroke, "#26262c"),
      nodeShadow: canvasColor(cs(el.shadow).fill, "rgba(0,0,0,0.65)"),
      name: canvasColor(cs(el.name).fill, "#e2e8f0"),
      path: canvasColor(cs(el.path).fill, "#94a3b8"),
      edge: canvasColor(cs(el.edge).stroke, "#475569"),
      edgeAlpha: num(cs(el.edge).opacity, 0.65),
      edgePkgAlpha: num(cs(el.pkg).opacity, 0.5),
      edgeHot: canvasColor(cs(el.hot).stroke, accentDefault),
      flowSoft: canvasColor(cs(el.flowSoft).stroke, "#64748b"),
      flowSoftAlpha: num(cs(el.flowSoft).opacity, 0.45),
      flowHot: canvasColor(cs(el.flow).stroke, "#d8b4fe"),
      flowHotAlpha: num(cs(el.flow).opacity, 0.95),
      port: canvasColor(cs(el.port).fill, "#475569"),
      portAlpha: num(cs(el.port).opacity, 0.85),
      portHot: canvasColor(cs(el.portHot).fill, accentDefault),
      clusterFill: canvasColor(cs(el.cRect).fill, "rgba(168,85,247,0.045)"),
      clusterStroke: canvasColor(cs(el.cRect).stroke, "rgba(192,132,252,0.28)"),
      clusterLabel: canvasColor(cs(el.cLabel).fill, "#d8b4fe"),
      clusterLabelAlpha: num(cs(el.cLabel).opacity, 0.85),
      accentDefault,
      accent,
    };
  } finally {
    svg.remove();
  }
}

function truncateMiddle(text: string, max: number): string {
  if (text.length <= max) return text;
  const keep = Math.max(4, Math.floor((max - 1) / 2));
  return `${text.slice(0, keep)}…${text.slice(-keep)}`;
}

function inferModuleClusterLabel(filePath: string): string {
  const parts = filePath.replace(/\\/g, "/").split("/").filter(Boolean);
  if (parts.length <= 1) return "root";
  if (parts[0] === "src" || parts[0] === "include") {
    if (parts.length >= 3) return `${parts[0]}/${parts[1]}`;
    return parts[0];
  }
  if (
    (parts[0] === "packages" || parts[0] === "apps" || parts[0] === "crates") &&
    parts.length >= 2
  ) {
    return `${parts[0]}/${parts[1]}`;
  }
  return parts.slice(0, Math.min(2, parts.length - 1)).join("/");
}

/** Adds an edge's cubic bezier to `path`; returns false when culled. */
function addEdgeCurve(
  path: Path2D,
  s: XY,
  t: XY,
  vx0: number,
  vy0: number,
  vx1: number,
  vy1: number,
  portOut: XY,
): boolean {
  const forward = t.x >= s.x;
  const x1 = forward ? s.x + NODE_W : s.x;
  const y1 = s.y + NODE_H / 2;
  const x2 = forward ? t.x : t.x + NODE_W;
  const y2 = t.y + NODE_H / 2;
  const bend = Math.min(150, Math.max(44, Math.abs(x2 - x1) * 0.55));
  // Viewport culling on the curve's bounding box.
  if (
    Math.max(x1, x2) + bend < vx0 ||
    Math.min(x1, x2) - bend > vx1 ||
    Math.max(y1, y2) < vy0 ||
    Math.min(y1, y2) > vy1
  ) {
    return false;
  }
  const dir = forward ? 1 : -1;
  path.moveTo(x1, y1);
  path.bezierCurveTo(x1 + dir * bend, y1, x2 - dir * bend, y2, x2, y2);
  portOut.x = x2;
  portOut.y = y2;
  return true;
}

const KIND_GLYPHS: Partial<Record<NodeKind, string>> = {
  component: "UI",
  function: "fn",
  hook: "use",
  class: "cls",
  method: "m",
  struct: "st",
  trait: "tr",
  package: "pkg",
};

const kindGlyphFor = (kind: NodeKind): string =>
  KIND_GLYPHS[kind] ?? kind.slice(0, 4);

/**
 * Layered ("Sugiyama-lite") auto layout with strict node-ID deduplication.
 */
function buildGraphLayout(
  analysis: Analysis,
  folder: string,
  kind: "all" | SymbolKind,
  includePackages: boolean,
): GraphLayout {
  // ---- 1. visible symbol set (strictly deduplicated by id) --------------
  const seenIds = new Set<string>();
  let symbols = analysis.symbols.filter((s) => {
    if (!s || !s.id || seenIds.has(s.id)) return false;
    seenIds.add(s.id);
    return true;
  });

  if (folder !== "all") {
    const prefix = folder.endsWith("/") ? folder : `${folder}/`;
    symbols = symbols.filter(
      (s) => s.filePath === folder || s.filePath.startsWith(prefix),
    );
  }
  if (kind !== "all") {
    symbols = symbols.filter((s) => s.kind === kind);
  }

  const totalSymbols = symbols.length;
  let trimmed = false;

  const fullDegree = new Map<string, number>();
  for (const s of symbols) {
    const node = analysis.nodesMap.get(s.id);
    fullDegree.set(
      s.id,
      node ? node.dependencies.length + node.dependents.length : 0,
    );
  }

  if (symbols.length > MAX_MAP_NODES) {
    trimmed = true;
    symbols = [...symbols]
      .sort((a, b) => (fullDegree.get(b.id) ?? 0) - (fullDegree.get(a.id) ?? 0))
      .slice(0, MAX_MAP_NODES);
  }

  const visible = new Map(symbols.map((s) => [s.id, s]));

  // ---- 2. internal edges (deduped, both ends visible, no self-loops) ----
  const edges: MapEdge[] = [];
  const seenEdge = new Set<string>();
  const outEdges = new Map<string, string[]>();
  const inEdges = new Map<string, string[]>();
  const push = (map: Map<string, string[]>, k: string, v: string) => {
    const arr = map.get(k);
    if (arr) arr.push(v);
    else map.set(k, [v]);
  };

  for (const s of symbols) {
    const node = analysis.nodesMap.get(s.id);
    if (!node) continue;
    for (const dep of node.dependencies) {
      const t = dep.symbol.id;
      if (!visible.has(t) || t === s.id) continue;
      const key = `${s.id}->${t}`;
      if (seenEdge.has(key)) continue;
      seenEdge.add(key);
      edges.push({ id: key, source: s.id, target: t, pkg: false });
      push(outEdges, s.id, t);
      push(inEdges, t, s.id);
    }
  }

  // ---- 3. layer = longest path from a root (cycle-safe) -----------------
  const layerMemo = new Map<string, number>();
  const computeLayer = (id: string, stack: Set<string>): number => {
    const memo = layerMemo.get(id);
    if (memo !== undefined) return memo;
    if (stack.has(id)) return 0;
    stack.add(id);
    let max = -1;
    for (const pred of inEdges.get(id) ?? []) {
      max = Math.max(max, computeLayer(pred, stack));
    }
    stack.delete(id);
    const layer = max + 1;
    layerMemo.set(id, layer);
    return layer;
  };
  for (const s of symbols) computeLayer(s.id, new Set());

  // ---- 4. group into columns --------------------------------------------
  const columns = new Map<number, string[]>();
  for (const s of symbols) {
    const l = layerMemo.get(s.id) ?? 0;
    if (!columns.has(l)) columns.set(l, []);
    columns.get(l)!.push(s.id);
  }

  const rowOf = new Map<string, number>();
  const orderColumn = (ids: string[], getBary: (id: string) => number) => {
    ids.sort((a, b) => {
      const modA = inferModuleClusterLabel(visible.get(a)!.filePath);
      const modB = inferModuleClusterLabel(visible.get(b)!.filePath);
      const d = getBary(a) - getBary(b);
      if (Math.abs(d) > 0.75) return d;
      const modCmp = modA.localeCompare(modB);
      if (modCmp !== 0) return modCmp;
      if (d !== 0) return d;
      return (visible.get(a)!.name || "").localeCompare(
        visible.get(b)!.name || "",
      );
    });
    ids.forEach((id, i) => rowOf.set(id, i));
  };

  const sortedLayers = [...columns.keys()].sort((a, b) => a - b);
  for (const l of sortedLayers) {
    orderColumn(columns.get(l)!, (id) =>
      (visible.get(id)!.name || "a").charCodeAt(0),
    );
  }
  for (let pass = 0; pass < 2; pass++) {
    for (const l of sortedLayers) {
      orderColumn(columns.get(l)!, (id) => {
        const preds = inEdges.get(id) ?? [];
        if (!preds.length) return rowOf.get(id) ?? 0;
        return (
          preds.reduce((sum, p) => sum + (rowOf.get(p) ?? 0), 0) / preds.length
        );
      });
    }
    for (let i = sortedLayers.length - 1; i >= 0; i--) {
      const l = sortedLayers[i];
      orderColumn(columns.get(l)!, (id) => {
        const succs = outEdges.get(id) ?? [];
        if (!succs.length) return rowOf.get(id) ?? 0;
        return (
          succs.reduce((sum, p) => sum + (rowOf.get(p) ?? 0), 0) / succs.length
        );
      });
    }
  }

  // ---- 5. external packages / crates / headers pinned to column -1 ------
  const pkgNames: string[] = [];
  if (includePackages) {
    const pkgSet = new Set<string>();
    for (const s of symbols) {
      const node = analysis.nodesMap.get(s.id);
      node?.externalDependencies.forEach((p) => pkgSet.add(p));
    }
    pkgNames.push(...[...pkgSet].sort((a, b) => a.localeCompare(b)));
  }

  // ---- 6. assign coordinates ---------------------------------------------
  const nodes: MapNode[] = [];
  const nodeById = new Map<string, MapNode>();
  const xOffset = includePackages ? 1 : 0;

  for (const l of sortedLayers) {
    for (const id of columns.get(l)!) {
      if (nodeById.has(id)) continue;
      const s = visible.get(id)!;
      const row = rowOf.get(id) ?? 0;
      const node: MapNode = {
        id,
        name: s.name,
        kind: s.kind,
        fileName: s.fileName,
        filePath: s.filePath,
        moduleName: inferModuleClusterLabel(s.filePath),
        lineStart: s.lineStart,
        layer: l,
        x: PAD_X + (l + xOffset) * COL_GAP,
        y: PAD_Y + row * ROW_H + (ROW_H - NODE_H) / 2,
        degree:
          (inEdges.get(id)?.length ?? 0) + (outEdges.get(id)?.length ?? 0),
      };
      nodes.push(node);
      nodeById.set(id, node);
    }
  }

  const pkgById = new Map<string, MapNode>();
  pkgNames.forEach((pkg, i) => {
    const id = `pkg:${pkg}`;
    if (nodeById.has(id)) return;
    const node: MapNode = {
      id,
      name: pkg,
      kind: "package",
      fileName: "external dependency",
      filePath: pkg,
      moduleName: "external",
      lineStart: 0,
      layer: -1,
      x: PAD_X,
      y: PAD_Y + i * ROW_H + (ROW_H - NODE_H) / 2,
      degree: 0,
    };
    nodes.push(node);
    nodeById.set(id, node);
    pkgById.set(pkg, node);
  });

  if (includePackages) {
    for (const s of symbols) {
      const node = analysis.nodesMap.get(s.id);
      if (!node) continue;
      for (const pkg of node.externalDependencies) {
        const pkgNode = pkgById.get(pkg);
        if (!pkgNode) continue;
        const key = `${pkgNode.id}->${s.id}`;
        if (seenEdge.has(key)) continue;
        seenEdge.add(key);
        edges.push({ id: key, source: pkgNode.id, target: s.id, pkg: true });
      }
    }
  }

  // ---- 7. adjacency & per-node edge index -------------------------------
  const adjacency = new Map<string, Set<string>>();
  const edgesByNode = new Map<string, MapEdge[]>();
  const touch = (a: string, b: string) => {
    if (!adjacency.has(a)) adjacency.set(a, new Set());
    adjacency.get(a)!.add(b);
  };
  const registerNodeEdge = (nodeId: string, edge: MapEdge) => {
    const list = edgesByNode.get(nodeId);
    if (list) list.push(edge);
    else edgesByNode.set(nodeId, [edge]);
  };
  for (const e of edges) {
    touch(e.source, e.target);
    touch(e.target, e.source);
    registerNodeEdge(e.source, e);
    registerNodeEdge(e.target, e);
  }

  return {
    nodes,
    nodeById,
    edges,
    edgesByNode,
    totalSymbols,
    trimmed,
    adjacency,
  };
}

/* ------------------------------------------------------------------ */
/* Component — Canvas 2D renderer                                      */
/*                                                                     */
/* The map used to be ~4–5k live SVG elements (3 per edge, ~8 per      */
/* node) with a CSS stroke-dashoffset animation on every edge. Every   */
/* animation frame, pan step and hover forced Chromium to re-raster    */
/* the whole SVG, which is why big graphs lagged and why the flow      */
/* animation was force-disabled above 90 edges.                        */
/*                                                                     */
/* Now everything is drawn on three stacked canvases:                  */
/*   1. edges  — grid, clusters, edge strokes, ports  (on change)      */
/*   2. flow   — animated direction dots              (every frame)    */
/*   3. nodes  — node cards and labels                (on change)      */
/* The flow layer is two batched Path2D strokes per frame, so the      */
/* animation stays on for any graph size. Pan / zoom / hover / drag    */
/* never touch React state — they mutate refs and schedule one rAF.    */
/* ------------------------------------------------------------------ */

interface DragState {
  id: string;
  pointerId: number;
  startX: number;
  startY: number;
  origX: number;
  origY: number;
  moved: boolean;
}

interface PanState {
  pointerId: number;
  startX: number;
  startY: number;
  origX: number;
  origY: number;
  moved: boolean;
}

interface FlowPaths {
  soft: Path2D | null;
  hot: Path2D | null;
  dimmed: boolean;
}

const clampK = (k: number) => Math.min(2.5, Math.max(0.12, k));
const DEFAULT_VIEW: Camera = { x: 24, y: 16, k: 0.9 };

export const DepLenzGraphCanvas: React.FC<DepLenzGraphCanvasProps> = ({
  analysis,
  selectedId,
  onFocusSymbol,
}) => {
  const [folder, setFolder] = useState<string>("all");
  const [kind, setKind] = useState<"all" | SymbolKind>("all");
  const [includePackages, setIncludePackages] = useState(true);
  const [showClusters, setShowClusters] = useState(true);
  const [flowPaused, setFlowPaused] = useState(false);
  const [mapSelectedId, setMapSelectedId] = useState<string | null>(null);
  const [manualCount, setManualCount] = useState(0);

  const layout = useMemo(
    () => buildGraphLayout(analysis, folder, kind, includePackages),
    [analysis, folder, kind, includePackages],
  );
  const hasNodes = layout.nodes.length > 0;

  const labels = useMemo(() => {
    const map = new Map<string, NodeLabel>();
    for (const n of layout.nodes) {
      const isPkg = n.kind === "package";
      const sub = isPkg
        ? "external dependency"
        : `${truncateMiddle(n.fileName, 16)} · ln ${n.lineStart}`;
      map.set(n.id, {
        name: truncateMiddle(n.name, 22),
        sub,
        glyph: kindGlyphFor(n.kind),
        links: n.degree > 0 ? `${n.degree}⇄` : "",
        title: isPkg ? `${n.name} (external dependency)` : `${n.name} — ${sub}`,
      });
    }
    return map;
  }, [layout]);

  const moduleCount = useMemo(() => {
    if (!showClusters) return 0;
    const set = new Set<string>();
    for (const n of layout.nodes) {
      if (n.kind !== "package") set.add(n.moduleName || "root");
    }
    return set.size;
  }, [layout, showClusters]);

  /* ----- refs: everything the render loop reads ----------------------- */
  const hostRef = useRef<HTMLDivElement>(null);
  const edgeCanvasRef = useRef<HTMLCanvasElement>(null);
  const flowCanvasRef = useRef<HTMLCanvasElement>(null);
  const nodeCanvasRef = useRef<HTMLCanvasElement>(null);

  const camRef = useRef<Camera>({ ...DEFAULT_VIEW });
  const layoutRef = useRef(layout);
  layoutRef.current = layout;
  const labelsRef = useRef(labels);
  labelsRef.current = labels;
  /** Live node positions (auto layout overridden by manual drags). */
  const posRef = useRef(new Map<string, XY>());
  /** Manually dragged positions; survive re-analysis while ids persist. */
  const manualRef = useRef(new Map<string, XY>());
  const paletteRef = useRef<Palette | null>(null);
  const gridPatternRef = useRef<{
    color: string;
    pattern: CanvasPattern;
  } | null>(null);
  const flowPathsRef = useRef<FlowPaths>({
    soft: null,
    hot: null,
    dimmed: false,
  });

  const hoverRef = useRef<string | null>(null);
  const selectedRef = useRef<string | null>(null);
  const propSelectedRef = useRef<string | null>(selectedId);
  const showClustersRef = useRef(showClusters);
  const flowPausedRef = useRef(flowPaused);
  const reducedMotionRef = useRef(false);
  const onFocusRef = useRef(onFocusSymbol);
  onFocusRef.current = onFocusSymbol;

  const dragRef = useRef<DragState | null>(null);
  const panRef = useRef<PanState | null>(null);
  const pointersRef = useRef(new Map<number, XY>());
  const pinchRef = useRef<{ startDist: number; startK: number } | null>(null);
  const lastPinchEndRef = useRef(0);

  const rafRef = useRef(0);
  const staticDirtyRef = useRef(true);
  const flowDirtyRef = useRef(true);
  const needsFitRef = useRef(true);
  const fittedKeyRef = useRef<string | null>(null);

  /* ----- drawing -------------------------------------------------------- */

  const syncCanvasSize = useCallback((): {
    w: number;
    h: number;
    dpr: number;
  } | null => {
    const host = hostRef.current;
    if (!host) return null;
    const w = host.clientWidth;
    const h = host.clientHeight;
    if (!w || !h) return null;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = Math.max(1, Math.round(w * dpr));
    const H = Math.max(1, Math.round(h * dpr));
    for (const c of [
      edgeCanvasRef.current,
      flowCanvasRef.current,
      nodeCanvasRef.current,
    ]) {
      if (c && (c.width !== W || c.height !== H)) {
        c.width = W;
        c.height = H;
        flowDirtyRef.current = true;
      }
    }
    return { w, h, dpr };
  }, []);

  const drawStatic = useCallback(() => {
    const ec = edgeCanvasRef.current;
    const nc = nodeCanvasRef.current;
    const pal = paletteRef.current;
    const size = syncCanvasSize();
    if (!ec || !nc || !pal || !size) return;
    const ectx = ec.getContext("2d");
    const nctx = nc.getContext("2d");
    if (!ectx || !nctx) return;

    const { w, h, dpr } = size;
    const { x, y, k } = camRef.current;
    const vx0 = -x / k;
    const vy0 = -y / k;
    const vx1 = (w - x) / k;
    const vy1 = (h - y) / k;
    const L = layoutRef.current;
    const pos = posRef.current;
    const activeId =
      dragRef.current?.id ?? hoverRef.current ?? selectedRef.current;
    const neighbors = activeId ? L.adjacency.get(activeId) : undefined;
    const dimA = activeId ? DIM_ALPHA : 1;

    /* ===== layer 1: grid, clusters, edges ===== */
    ectx.setTransform(1, 0, 0, 1, 0, 0);
    ectx.clearRect(0, 0, ec.width, ec.height);
    ectx.setTransform(dpr * k, 0, 0, dpr * k, dpr * x, dpr * y);

    // Dot grid (skipped when zoomed so far out it's just noise).
    if (k * 30 >= 6) {
      let gp = gridPatternRef.current;
      if (!gp || gp.color !== pal.grid) {
        const tile = document.createElement("canvas");
        tile.width = 90;
        tile.height = 90;
        const tctx = tile.getContext("2d");
        if (tctx) {
          tctx.fillStyle = pal.grid;
          tctx.beginPath();
          tctx.arc(3.6, 3.6, 3.6, 0, TWO_PI);
          tctx.fill();
          const pattern = ectx.createPattern(tile, "repeat");
          if (pattern) {
            pattern.setTransform(new DOMMatrix().scale(1 / 3));
            gp = { color: pal.grid, pattern };
            gridPatternRef.current = gp;
          }
        }
      }
      if (gp) {
        ectx.globalAlpha = pal.gridAlpha;
        ectx.fillStyle = gp.pattern;
        ectx.fillRect(vx0, vy0, vx1 - vx0, vy1 - vy0);
      }
    }

    // Module cluster boxes — computed live, so they follow dragged nodes.
    if (showClustersRef.current) {
      const boxes = new Map<string, number[]>();
      for (const n of L.nodes) {
        if (n.kind === "package") continue;
        const p = pos.get(n.id);
        if (!p) continue;
        const key = n.moduleName || "root";
        const b = boxes.get(key);
        if (b) {
          if (p.x < b[0]) b[0] = p.x;
          if (p.y < b[1]) b[1] = p.y;
          if (p.x + NODE_W > b[2]) b[2] = p.x + NODE_W;
          if (p.y + NODE_H > b[3]) b[3] = p.y + NODE_H;
          b[4]++;
        } else {
          boxes.set(key, [p.x, p.y, p.x + NODE_W, p.y + NODE_H, 1]);
        }
      }
      const showLabels = k >= 0.3;
      ectx.globalAlpha = 1;
      ectx.lineWidth = 1.2;
      ectx.setLineDash([5, 4]);
      ectx.fillStyle = pal.clusterFill;
      ectx.strokeStyle = pal.clusterStroke;
      const labelQueue: Array<[string, number, number]> = [];
      for (const [label, b] of boxes) {
        const bx = b[0] - 16;
        const by = b[1] - 24;
        const bw = b[2] - b[0] + 32;
        const bh = b[3] - b[1] + 36;
        if (bx > vx1 || by > vy1 || bx + bw < vx0 || by + bh < vy0) continue;
        ectx.beginPath();
        ectx.roundRect(bx, by, bw, bh, 16);
        ectx.fill();
        ectx.stroke();
        if (showLabels) {
          labelQueue.push([
            `${label} (${b[4]})`.toUpperCase(),
            bx + 12,
            by + 15,
          ]);
        }
      }
      ectx.setLineDash([]);
      if (labelQueue.length) {
        ectx.font = `700 9.5px ${pal.font}`;
        ectx.letterSpacing = "0.57px";
        ectx.textAlign = "left";
        ectx.fillStyle = pal.clusterLabel;
        ectx.globalAlpha = pal.clusterLabelAlpha;
        for (const [t, lx, ly] of labelQueue) ectx.fillText(t, lx, ly);
        ectx.letterSpacing = "0px";
      }
    }

    // Edges — batched into a handful of Path2D strokes.
    const base = new Path2D();
    const pkgBase = new Path2D();
    const hot = new Path2D();
    const ports = new Path2D();
    const hotPorts = new Path2D();
    let softCount = 0;
    let hotCount = 0;
    const showPorts = k * 2.5 >= 0.75;
    const port: XY = { x: 0, y: 0 };
    for (const e of L.edges) {
      const s = pos.get(e.source);
      const t = pos.get(e.target);
      if (!s || !t) continue;
      const isHot =
        activeId !== null && (e.source === activeId || e.target === activeId);
      const target = isHot ? hot : e.pkg ? pkgBase : base;
      if (!addEdgeCurve(target, s, t, vx0, vy0, vx1, vy1, port)) continue;
      if (isHot) hotCount++;
      else softCount++;
      if (showPorts) {
        const r = isHot ? 3.4 : 2.5;
        const pp = isHot ? hotPorts : ports;
        pp.moveTo(port.x + r, port.y);
        pp.arc(port.x, port.y, r, 0, TWO_PI);
      }
    }

    ectx.lineCap = "butt";
    if (softCount) {
      ectx.strokeStyle = pal.edge;
      ectx.lineWidth = 1.2;
      ectx.globalAlpha = pal.edgeAlpha * dimA;
      ectx.stroke(base);
      ectx.globalAlpha = pal.edgePkgAlpha * dimA;
      ectx.setLineDash([2, 5]);
      ectx.stroke(pkgBase);
      ectx.setLineDash([]);
      if (showPorts) {
        ectx.globalAlpha = pal.portAlpha * dimA;
        ectx.fillStyle = pal.port;
        ectx.fill(ports);
      }
    }
    if (hotCount) {
      ectx.globalAlpha = 1;
      ectx.strokeStyle = pal.edgeHot;
      ectx.lineWidth = 1.9;
      ectx.stroke(hot);
      if (showPorts) {
        ectx.fillStyle = pal.portHot;
        ectx.fill(hotPorts);
      }
    }
    ectx.globalAlpha = 1;

    let softFlow: Path2D | null = null;
    if (softCount) {
      softFlow = new Path2D();
      softFlow.addPath(base);
      softFlow.addPath(pkgBase);
    }
    flowPathsRef.current = {
      soft: softFlow,
      hot: hotCount ? hot : null,
      dimmed: activeId !== null,
    };
    flowDirtyRef.current = true;

    /* ===== layer 3: nodes ===== */
    nctx.setTransform(1, 0, 0, 1, 0, 0);
    nctx.clearRect(0, 0, nc.width, nc.height);
    nctx.setTransform(dpr * k, 0, 0, dpr * k, dpr * x, dpr * y);

    const selA = selectedRef.current;
    const selB = propSelectedRef.current;
    const dimmedList: MapNode[] = [];
    const normalList: MapNode[] = [];
    const topList: MapNode[] = [];
    for (const n of L.nodes) {
      const p = pos.get(n.id);
      if (!p) continue;
      if (
        p.x - 6 > vx1 ||
        p.y - 6 > vy1 ||
        p.x + NODE_W + 6 < vx0 ||
        p.y + NODE_H + 6 < vy0
      ) {
        continue;
      }
      const dimmed =
        activeId !== null && n.id !== activeId && !neighbors?.has(n.id);
      if (dimmed) dimmedList.push(n);
      else if (n.id === activeId || n.id === selA || n.id === selB)
        topList.push(n);
      else normalList.push(n);
    }

    // Level of detail: full cards when readable, simplified when zoomed out.
    const detail = k >= 0.5 ? 2 : k >= 0.3 ? 1 : 0;
    const labelsMap = labelsRef.current;

    const drawGroup = (list: MapNode[], alpha: number) => {
      if (!list.length) return;
      for (const n of list) {
        const p = pos.get(n.id)!;
        const accent = pal.accent[n.kind] ?? pal.accentDefault;
        const isSel = n.id === selA || n.id === selB;
        const isActive = n.id === activeId;
        if (isSel) {
          nctx.globalAlpha = alpha * 0.35;
          nctx.strokeStyle = accent;
          nctx.lineWidth = 2.5;
          nctx.beginPath();
          nctx.roundRect(p.x - 4, p.y - 4, NODE_W + 8, NODE_H + 8, 15);
          nctx.stroke();
        }
        nctx.globalAlpha = alpha;
        if (detail > 0) {
          nctx.fillStyle = pal.nodeShadow;
          nctx.beginPath();
          nctx.roundRect(p.x, p.y + 3, NODE_W, NODE_H, 12);
          nctx.fill();
        }
        nctx.beginPath();
        nctx.roundRect(p.x, p.y, NODE_W, NODE_H, 12);
        nctx.fillStyle = pal.nodeFill;
        nctx.fill();
        if (isSel || isActive) {
          nctx.strokeStyle = accent;
          nctx.lineWidth = isSel ? 2 : 1.8;
        } else {
          nctx.strokeStyle = pal.nodeStroke;
          nctx.lineWidth = 1.2;
        }
        nctx.stroke();
        // Kind chip
        nctx.beginPath();
        nctx.roundRect(p.x + 10, p.y + 15, 28, 24, 7);
        nctx.fillStyle = accent;
        if (detail > 0) {
          nctx.globalAlpha = alpha * 0.16;
          nctx.fill();
          nctx.globalAlpha = alpha * 0.45;
          nctx.strokeStyle = accent;
          nctx.lineWidth = 1;
          nctx.stroke();
        } else {
          nctx.globalAlpha = alpha * 0.85;
          nctx.fill();
        }
      }
      if (detail === 0) return;

      nctx.globalAlpha = alpha;
      nctx.textAlign = "left";
      nctx.font = `600 11.5px ${pal.font}`;
      nctx.fillStyle = pal.name;
      for (const n of list) {
        const p = pos.get(n.id)!;
        const lb = labelsMap.get(n.id);
        if (lb) nctx.fillText(lb.name, p.x + 48, p.y + 24);
      }
      if (detail < 2) return;

      nctx.font = `9px ${pal.font}`;
      nctx.fillStyle = pal.path;
      for (const n of list) {
        const p = pos.get(n.id)!;
        const lb = labelsMap.get(n.id);
        if (lb) nctx.fillText(lb.sub, p.x + 48, p.y + 41);
      }
      nctx.font = `700 9.5px ${pal.font}`;
      nctx.textAlign = "center";
      for (const n of list) {
        const p = pos.get(n.id)!;
        const lb = labelsMap.get(n.id);
        if (!lb) continue;
        nctx.fillStyle = pal.accent[n.kind] ?? pal.accentDefault;
        nctx.fillText(lb.glyph, p.x + 24, p.y + 31);
      }
      nctx.font = `8.5px ${pal.font}`;
      nctx.textAlign = "right";
      nctx.globalAlpha = alpha * 0.9;
      for (const n of list) {
        const p = pos.get(n.id)!;
        const lb = labelsMap.get(n.id);
        if (!lb || !lb.links) continue;
        nctx.fillStyle = pal.accent[n.kind] ?? pal.accentDefault;
        nctx.fillText(lb.links, p.x + NODE_W - 10, p.y + 15);
      }
    };

    drawGroup(dimmedList, DIM_ALPHA);
    drawGroup(normalList, 1);
    drawGroup(topList, 1);
    nctx.globalAlpha = 1;
  }, [syncCanvasSize]);

  const isAnimating = () =>
    !flowPausedRef.current &&
    !reducedMotionRef.current &&
    (flowPathsRef.current.soft !== null || flowPathsRef.current.hot !== null);

  const drawFlow = useCallback(
    (time: number) => {
      const fc = flowCanvasRef.current;
      const pal = paletteRef.current;
      const size = syncCanvasSize();
      if (!fc || !pal || !size) return;
      const ctx = fc.getContext("2d");
      if (!ctx) return;
      const { dpr } = size;
      const { x, y, k } = camRef.current;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, fc.width, fc.height);
      ctx.setTransform(dpr * k, 0, 0, dpr * k, dpr * x, dpr * y);

      const f = flowPathsRef.current;
      const t = isAnimating() ? time : 0;
      // Keep dot spacing/size roughly constant on screen when zoomed out, so
      // the number of dashes stays bounded by the viewport, not graph size.
      const lod = Math.max(1, 0.5 / k);
      ctx.lineCap = "round";
      if (f.soft) {
        const gap = 14 * lod;
        ctx.globalAlpha = pal.flowSoftAlpha * (f.dimmed ? DIM_ALPHA : 1);
        ctx.strokeStyle = pal.flowSoft;
        ctx.lineWidth = 1.5 * lod;
        ctx.setLineDash([0.1, gap]);
        ctx.lineDashOffset = -((t / 1900) % 1) * (gap + 0.1);
        ctx.stroke(f.soft);
      }
      if (f.hot) {
        const gap = 11 * lod;
        ctx.globalAlpha = pal.flowHotAlpha;
        ctx.strokeStyle = pal.flowHot;
        ctx.lineWidth = 2.5 * lod;
        ctx.setLineDash([0.1, gap]);
        ctx.lineDashOffset = -((t / 800) % 1) * (gap + 0.1);
        ctx.stroke(f.hot);
      }
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    },
    [syncCanvasSize],
  );

  const frame = useCallback(
    (time: number) => {
      rafRef.current = 0;
      if (staticDirtyRef.current) {
        staticDirtyRef.current = false;
        drawStatic();
      }
      const animate = isAnimating();
      if (animate || flowDirtyRef.current) {
        flowDirtyRef.current = false;
        drawFlow(time);
      }
      if (animate) rafRef.current = requestAnimationFrame(frame);
    },
    [drawStatic, drawFlow],
  );

  const schedule = useCallback(() => {
    if (!rafRef.current) rafRef.current = requestAnimationFrame(frame);
  }, [frame]);

  const invalidate = useCallback(() => {
    staticDirtyRef.current = true;
    schedule();
  }, [schedule]);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  /* ----- camera helpers ------------------------------------------------- */

  const fitView = useCallback(() => {
    const host = hostRef.current;
    const nodes = layoutRef.current.nodes;
    if (!host || nodes.length === 0) return;
    const w = host.clientWidth;
    const h = host.clientHeight;
    if (!w || !h) {
      needsFitRef.current = true;
      return;
    }
    needsFitRef.current = false;
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (const n of nodes) {
      const p = posRef.current.get(n.id) ?? n;
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x + NODE_W);
      maxY = Math.max(maxY, p.y + NODE_H);
    }
    const bw = Math.max(1, maxX - minX);
    const bh = Math.max(1, maxY - minY);
    const k = clampK(Math.min((w - 72) / bw, (h - 72) / bh));
    camRef.current = {
      k,
      x: (w - bw * k) / 2 - minX * k,
      y: (h - bh * k) / 2 - minY * k,
    };
    invalidate();
  }, [invalidate]);

  const zoomAt = useCallback(
    (px: number, py: number, factor: number) => {
      const c = camRef.current;
      const k2 = clampK(c.k * factor);
      const s = k2 / c.k;
      camRef.current = {
        k: k2,
        x: px - (px - c.x) * s,
        y: py - (py - c.y) * s,
      };
      invalidate();
    },
    [invalidate],
  );

  const zoomCenter = (factor: number) => {
    const host = hostRef.current;
    if (!host) return;
    zoomAt(host.clientWidth / 2, host.clientHeight / 2, factor);
  };

  const resetView = () => {
    camRef.current = { ...DEFAULT_VIEW };
    invalidate();
  };

  const rebuildPositions = useCallback(() => {
    const map = new Map<string, XY>();
    for (const n of layoutRef.current.nodes) {
      const m = manualRef.current.get(n.id);
      map.set(n.id, m ? { x: m.x, y: m.y } : { x: n.x, y: n.y });
    }
    posRef.current = map;
  }, []);

  const resetLayout = () => {
    manualRef.current.clear();
    setManualCount(0);
    rebuildPositions();
    fitView();
  };

  const selectOnMap = useCallback(
    (id: string | null) => {
      selectedRef.current = id;
      setMapSelectedId(id);
      invalidate();
    },
    [invalidate],
  );

  /* ----- sync React state → refs --------------------------------------- */

  const structureKey = useMemo(() => {
    const ids = layout.nodes.map((n) => n.id).sort();
    return `${folder}|${kind}|${includePackages}|${ids.join(",")}`;
  }, [layout, folder, kind, includePackages]);

  useEffect(() => {
    let pruned = false;
    for (const id of [...manualRef.current.keys()]) {
      if (!layout.nodeById.has(id)) {
        manualRef.current.delete(id);
        pruned = true;
      }
    }
    if (pruned) setManualCount(manualRef.current.size);
    rebuildPositions();
    dragRef.current = null;
    panRef.current = null;
    pinchRef.current = null;
    pointersRef.current.clear();

    if (fittedKeyRef.current !== structureKey) {
      fittedKeyRef.current = structureKey;
      hoverRef.current = null;
      selectOnMap(null);
      fitView();
    }
    invalidate();
  }, [
    layout,
    structureKey,
    rebuildPositions,
    selectOnMap,
    fitView,
    invalidate,
  ]);

  useEffect(() => {
    propSelectedRef.current = selectedId;
    invalidate();
  }, [selectedId, invalidate]);

  useEffect(() => {
    showClustersRef.current = showClusters;
    invalidate();
  }, [showClusters, invalidate]);

  useEffect(() => {
    flowPausedRef.current = flowPaused;
    flowDirtyRef.current = true;
    schedule();
  }, [flowPaused, schedule]);

  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mq) return;
    const update = () => {
      reducedMotionRef.current = mq.matches;
      flowDirtyRef.current = true;
      schedule();
    };
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [schedule]);

  /* ----- host lifecycle: theme palette, resize, fonts, wheel ------------ */

  useEffect(() => {
    const host = hostRef.current;
    if (!hasNodes || !host) return;

    const refreshPalette = () => {
      paletteRef.current = readPalette(host);
      invalidate();
    };
    refreshPalette();

    // Theme / appearance / palette / font changes all mutate <html>.
    const mo = new MutationObserver(refreshPalette);
    mo.observe(document.documentElement, {
      attributes: true,
      attributeFilter: [
        "style",
        "class",
        "data-appearance",
        "data-theme",
        "data-font-style",
      ],
    });

    const ro = new ResizeObserver(() => {
      if (needsFitRef.current) fitView();
      invalidate();
    });
    ro.observe(host);

    const fonts = document.fonts;
    const onFonts = () => invalidate();
    fonts?.ready.then(onFonts).catch(() => {});
    fonts?.addEventListener?.("loadingdone", onFonts);

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = host.getBoundingClientRect();
      let dy = e.deltaY;
      if (e.deltaMode === 1) dy *= 16;
      else if (e.deltaMode === 2) dy *= r.height;
      // Proportional zoom: smooth on trackpads, ~1.16× per mouse-wheel notch.
      const factor = Math.min(1.25, Math.max(0.8, Math.exp(-dy * 0.0015)));
      zoomAt(e.clientX - r.left, e.clientY - r.top, factor);
    };
    host.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      mo.disconnect();
      ro.disconnect();
      fonts?.removeEventListener?.("loadingdone", onFonts);
      host.removeEventListener("wheel", onWheel);
    };
  }, [hasNodes, invalidate, fitView, zoomAt]);

  /* ----- pointer interaction (refs only, no React re-renders) ---------- */

  const localPoint = (clientX: number, clientY: number): XY => {
    const r = hostRef.current!.getBoundingClientRect();
    return { x: clientX - r.left, y: clientY - r.top };
  };

  const hitTest = (clientX: number, clientY: number): string | null => {
    const p = localPoint(clientX, clientY);
    const c = camRef.current;
    const wx = (p.x - c.x) / c.k;
    const wy = (p.y - c.y) / c.k;
    const nodes = layoutRef.current.nodes;
    const pos = posRef.current;
    // Prefer the active/selected node since it's drawn on top.
    for (const id of [hoverRef.current, selectedRef.current]) {
      if (!id) continue;
      const q = pos.get(id);
      if (
        q &&
        wx >= q.x &&
        wx <= q.x + NODE_W &&
        wy >= q.y &&
        wy <= q.y + NODE_H
      )
        return id;
    }
    for (let i = nodes.length - 1; i >= 0; i--) {
      const q = pos.get(nodes[i].id);
      if (
        q &&
        wx >= q.x &&
        wx <= q.x + NODE_W &&
        wy >= q.y &&
        wy <= q.y + NODE_H
      )
        return nodes[i].id;
    }
    return null;
  };

  const setHover = (id: string | null) => {
    if (hoverRef.current === id) return;
    hoverRef.current = id;
    const host = hostRef.current;
    if (host) host.title = id ? (labelsRef.current.get(id)?.title ?? "") : "";
    invalidate();
  };

  const setCursor = (c: string) => {
    if (hostRef.current) hostRef.current.style.cursor = c;
  };

  const commitDrag = (d: DragState) => {
    const p = posRef.current.get(d.id);
    if (d.moved && p) {
      manualRef.current.set(d.id, { x: p.x, y: p.y });
      setManualCount(manualRef.current.size);
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const pointers = pointersRef.current;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinchRef.current = {
        startDist: Math.hypot(a.x - b.x, a.y - b.y),
        startK: camRef.current.k,
      };
      if (dragRef.current) {
        commitDrag(dragRef.current);
        dragRef.current = null;
      }
      panRef.current = null;
      invalidate();
      return;
    }
    if (pointers.size > 2) return;

    const hit = hitTest(e.clientX, e.clientY);
    if (hit) {
      const p = posRef.current.get(hit)!;
      dragRef.current = {
        id: hit,
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        origX: p.x,
        origY: p.y,
        moved: false,
      };
      setHover(hit);
      invalidate();
    } else {
      const c = camRef.current;
      panRef.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        origX: c.x,
        origY: c.y,
        moved: false,
      };
    }
    setCursor("grabbing");
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const pointers = pointersRef.current;
    if (pointers.has(e.pointerId)) {
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }

    const pinch = pinchRef.current;
    if (pinch && pointers.size >= 2) {
      const [a, b] = [...pointers.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (dist > 0 && pinch.startDist > 0) {
        const mid = localPoint((a.x + b.x) / 2, (a.y + b.y) / 2);
        const target = clampK(pinch.startK * (dist / pinch.startDist));
        zoomAt(mid.x, mid.y, target / camRef.current.k);
      }
      return;
    }

    const d = dragRef.current;
    if (d && e.pointerId === d.pointerId) {
      const dx = e.clientX - d.startX;
      const dy = e.clientY - d.startY;
      if (!d.moved && Math.abs(dx) + Math.abs(dy) > 3) d.moved = true;
      if (d.moved) {
        const k = camRef.current.k || 1;
        posRef.current.set(d.id, { x: d.origX + dx / k, y: d.origY + dy / k });
        invalidate();
      }
      return;
    }

    const pan = panRef.current;
    if (pan && e.pointerId === pan.pointerId) {
      const dx = e.clientX - pan.startX;
      const dy = e.clientY - pan.startY;
      if (!pan.moved && Math.abs(dx) + Math.abs(dy) > 4) pan.moved = true;
      camRef.current = {
        ...camRef.current,
        x: pan.origX + dx,
        y: pan.origY + dy,
      };
      invalidate();
      return;
    }

    if (pointers.size === 0 && e.pointerType !== "touch") {
      setHover(hitTest(e.clientX, e.clientY));
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const pointers = pointersRef.current;
    const wasPinching = pinchRef.current !== null;
    pointers.delete(e.pointerId);
    if (pointers.size < 2 && pinchRef.current) {
      pinchRef.current = null;
      lastPinchEndRef.current = Date.now();
    }
    const isClick = e.type === "pointerup" && !wasPinching;

    const d = dragRef.current;
    if (d && d.pointerId === e.pointerId) {
      dragRef.current = null;
      commitDrag(d);
      if (!d.moved && isClick && !d.id.startsWith("pkg:")) {
        selectOnMap(selectedRef.current === d.id ? null : d.id);
      }
      if (e.pointerType === "touch") setHover(null);
      invalidate();
    }

    const pan = panRef.current;
    if (pan && pan.pointerId === e.pointerId) {
      panRef.current = null;
      if (!pan.moved && isClick && Date.now() - lastPinchEndRef.current > 350) {
        selectOnMap(null);
      }
    }

    if (pointers.size === 0) setCursor("grab");
  };

  const handlePointerLeave = () => {
    if (!dragRef.current && !panRef.current) setHover(null);
  };

  const handleDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const hit = hitTest(e.clientX, e.clientY);
    if (hit && !hit.startsWith("pkg:")) onFocusRef.current(hit);
  };

  /* ----- toolbar data ---------------------------------------------------- */

  const availableFolders = useMemo(() => {
    const set = new Set<string>();
    for (const s of analysis.symbols) {
      const segs = s.filePath.split("/");
      if (segs.length > 1) {
        segs.pop();
        set.add(segs.join("/"));
      }
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [analysis.symbols]);

  const folderOptions = useMemo<ThemedDropdownOption<string>[]>(
    () => [
      {
        value: "all",
        label: "All folders",
        badge: String(analysis.symbols.length),
      },
      ...availableFolders.map((f) => ({
        value: f,
        label: f,
      })),
    ],
    [availableFolders, analysis.symbols.length],
  );

  const availableKinds = useMemo(() => {
    const set = new Set<SymbolKind>();
    for (const s of analysis.symbols) set.add(s.kind);
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [analysis.symbols]);

  const legend: { cls: string; label: string }[] = [
    ...availableKinds.map((k) => ({
      cls: `dlc-node-${k}`,
      label: k.charAt(0).toUpperCase() + k.slice(1),
    })),
    ...(includePackages
      ? [{ cls: "dlc-node-package", label: "External dep" }]
      : []),
  ];

  const selectedNode = mapSelectedId
    ? layout.nodeById.get(mapSelectedId)
    : undefined;

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Map toolbar */}
      <div className="flex flex-wrap items-center gap-2 pb-3">
        <div className="flex items-center gap-1.5 text-xs text-slate-300 font-semibold">
          <MapIcon className="w-4 h-4 text-slate-400" />
          <span>Codebase Map</span>
          <span className="text-[10px] font-mono text-slate-500">
            {layout.nodes.length} nodes · {layout.edges.length} edges
            {moduleCount > 0 ? ` · ${moduleCount} modules` : ""}
            {layout.trimmed
              ? ` · top ${MAX_MAP_NODES} of ${layout.totalSymbols} by connectivity`
              : ""}
            {manualCount > 0 ? ` · ${manualCount} moved` : ""}
          </span>
        </div>

        <ThemedDropdown
          value={folder}
          options={folderOptions}
          onChange={setFolder}
          ariaLabel="Scope map to folder"
          menuTitle="Filter Map by Folder"
          triggerIcon={<Folder className="w-3.5 h-3.5" />}
          triggerClassName="max-w-[210px]"
          menuWidthClass="w-72"
        />

        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
          {(["all", ...availableKinds] as ("all" | SymbolKind)[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              className={`text-[11px] px-2.5 py-1 rounded-lg capitalize font-medium transition-colors cursor-pointer shrink-0 border ${
                kind === k
                  ? "bg-purple-600 border-purple-600 text-white"
                  : "surface-raised text-slate-400 hover:text-slate-100 border-subtle"
              }`}
            >
              {k === "all" ? "All kinds" : k === "class" ? "Classes" : `${k}s`}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-1.5 text-[11px] text-slate-300 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showClusters}
            onChange={(e) => setShowClusters(e.target.checked)}
            className="rounded border-slate-700 bg-transparent text-purple-500 focus:ring-0 cursor-pointer"
          />
          <span>Clusters</span>
        </label>

        <label className="flex items-center gap-1.5 text-[11px] text-slate-300 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={includePackages}
            onChange={(e) => setIncludePackages(e.target.checked)}
            className="rounded border-slate-700 bg-transparent text-purple-500 focus:ring-0 cursor-pointer"
          />
          <Boxes className="w-3.5 h-3.5 text-slate-400" />
          <span>External</span>
        </label>

        <div className="flex items-center gap-1 ml-auto">
          <button
            type="button"
            onClick={() => setFlowPaused((p) => !p)}
            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
              flowPaused
                ? "chip-accent"
                : "surface-raised border-chrome text-slate-300 hover:text-slate-100"
            }`}
            title={
              flowPaused
                ? "Resume edge flow animation"
                : "Pause edge flow animation"
            }
          >
            {flowPaused ? (
              <Play className="w-3.5 h-3.5" />
            ) : (
              <Pause className="w-3.5 h-3.5" />
            )}
          </button>
          <button
            type="button"
            onClick={() => zoomCenter(1.2)}
            className="p-1.5 rounded-lg surface-raised border border-chrome text-slate-300 hover:text-slate-100 transition-colors cursor-pointer"
            title="Zoom in"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => zoomCenter(1 / 1.2)}
            className="p-1.5 rounded-lg surface-raised border border-chrome text-slate-300 hover:text-slate-100 transition-colors cursor-pointer"
            title="Zoom out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={fitView}
            className="p-1.5 rounded-lg surface-raised border border-chrome text-slate-300 hover:text-slate-100 transition-colors cursor-pointer"
            title="Fit map to view"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={resetLayout}
            disabled={manualCount === 0}
            className="p-1.5 rounded-lg surface-raised border border-chrome text-slate-300 hover:text-slate-100 transition-colors disabled:opacity-40 cursor-pointer"
            title="Re-run auto layout (clears manually moved nodes)"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={resetView}
            className="p-1.5 rounded-lg surface-raised border border-chrome text-slate-300 hover:text-slate-100 transition-colors cursor-pointer"
            title="Reset pan & zoom"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="relative flex-1 min-h-0 rounded-2xl border border-chrome surface-inset overflow-hidden">
        {!hasNodes ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 text-xs gap-2 p-6 text-center">
            <MapIcon className="w-8 h-8 opacity-30" />
            <p>
              No symbols match the current filters. Try a different folder or
              kind.
            </p>
          </div>
        ) : (
          <div
            ref={hostRef}
            className="absolute inset-0 touch-none select-none"
            style={{ cursor: "grab" }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onPointerLeave={handlePointerLeave}
            onDoubleClick={handleDoubleClick}
            role="img"
            aria-label="Codebase dependency map"
          >
            <canvas
              ref={edgeCanvasRef}
              className="absolute inset-0 w-full h-full pointer-events-none"
            />
            <canvas
              ref={flowCanvasRef}
              className="absolute inset-0 w-full h-full pointer-events-none"
            />
            <canvas
              ref={nodeCanvasRef}
              className="absolute inset-0 w-full h-full pointer-events-none"
            />
          </div>
        )}

        {/* Legend */}
        {hasNodes && (
          <div className="absolute left-3 bottom-3 flex flex-wrap items-center gap-2 px-3 py-1.5 rounded-xl surface-card/90 border border-chrome text-[10px] text-slate-400 backdrop-blur-sm pointer-events-none max-w-[calc(100%-1.5rem)]">
            {legend.map((l) => (
              <span key={l.label} className="flex items-center gap-1.5">
                <span className={`dlc-legend-dot ${l.cls}`} />
                {l.label}
              </span>
            ))}
            <span className="text-slate-600">|</span>
            <span className="flex items-center gap-1.5">
              <span className="dlc-legend-port" />
              dots flow caller → callee
            </span>
            <span className="text-slate-600 hidden md:inline">|</span>
            <span className="hidden md:inline">
              drag nodes to rearrange · pinch / scroll to zoom · click to trace
              · double-click to focus
            </span>
          </div>
        )}

        {/* Focus button for the map-selected symbol */}
        {mapSelectedId && selectedNode && selectedNode.kind !== "package" && (
          <div className="absolute right-3 top-3">
            <button
              type="button"
              onClick={() => onFocusSymbol(mapSelectedId)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium shadow-lg transition-colors cursor-pointer"
              title="Open this symbol in the Dependency Tree view"
            >
              <Focus className="w-3.5 h-3.5" />
              <span>Focus {truncateMiddle(selectedNode.name, 18)}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
