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
import { ThemedDropdown, ThemedDropdownOption } from "../../../packages/ui/src/ThemedDropdown";

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

interface EdgeDomHandles {
  base: SVGPathElement | null;
  flow: SVGPathElement | null;
  port: SVGCircleElement | null;
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
    (parts[0] === "packages" ||
      parts[0] === "apps" ||
      parts[0] === "crates") &&
    parts.length >= 2
  ) {
    return `${parts[0]}/${parts[1]}`;
  }
  return parts.slice(0, Math.min(2, parts.length - 1)).join("/");
}

/** Computes the SVG cubic-bezier path `d` and port coordinates for an edge. */
function computeEdgeGeometry(
  sx: number,
  sy: number,
  tx: number,
  ty: number,
): { d: string; x2: number; y2: number } {
  const forward = tx + NODE_W / 2 >= sx + NODE_W / 2;
  const x1 = forward ? sx + NODE_W : sx;
  const y1 = sy + NODE_H / 2;
  const x2 = forward ? tx : tx + NODE_W;
  const y2 = ty + NODE_H / 2;
  const dir = forward ? 1 : -1;
  const bend = Math.min(150, Math.max(44, Math.abs(x2 - x1) * 0.55));
  const d = `M ${x1} ${y1} C ${x1 + dir * bend} ${y1}, ${
    x2 - dir * bend
  } ${y2}, ${x2} ${y2}`;
  return { d, x2, y2 };
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
      edges.push({ id: key, source: s.id, target: t });
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
        edges.push({ id: key, source: pkgNode.id, target: s.id });
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
/* Memoized edge — registers DOM handles for zero-re-render dragging   */
/* ------------------------------------------------------------------ */

interface GraphEdgeProps {
  id: string;
  sx: number;
  sy: number;
  tx: number;
  ty: number;
  hot: boolean;
  dimmed: boolean;
  dotted: boolean;
  registerEdgeEl: (id: string, handles: EdgeDomHandles | null) => void;
}

const GraphEdge = React.memo<GraphEdgeProps>(
  ({ id, sx, sy, tx, ty, hot, dimmed, dotted, registerEdgeEl }) => {
    const baseRef = useRef<SVGPathElement>(null);
    const flowRef = useRef<SVGPathElement>(null);
    const portRef = useRef<SVGCircleElement>(null);

    useEffect(() => {
      registerEdgeEl(id, {
        base: baseRef.current,
        flow: flowRef.current,
        port: portRef.current,
      });
      return () => registerEdgeEl(id, null);
    }, [id, registerEdgeEl]);

    const { d, x2, y2 } = computeEdgeGeometry(sx, sy, tx, ty);

    const baseCls = `dlc-edge${dotted ? " dlc-edge-pkg" : ""}${
      hot ? " dlc-edge-hot" : ""
    }${dimmed ? " dlc-dimmed" : ""}`;
    const flowCls = `${hot ? "dlc-edge-flow" : "dlc-edge-flow-soft"}${
      dimmed ? " dlc-dimmed" : ""
    }`;
    const portCls = `dlc-edge-port${hot ? " dlc-edge-port-hot" : ""}${
      dimmed ? " dlc-dimmed" : ""
    }`;

    return (
      <>
        <path ref={baseRef} d={d} className={baseCls} fill="none" />
        <path ref={flowRef} d={d} className={flowCls} fill="none" />
        <circle
          ref={portRef}
          cx={x2}
          cy={y2}
          r={hot ? 3.4 : 2.5}
          className={portCls}
        />
      </>
    );
  },
);
GraphEdge.displayName = "GraphEdge";

/* ------------------------------------------------------------------ */
/* Memoized node — registers <g> handle for direct SVG drag transform  */
/* ------------------------------------------------------------------ */

interface GraphNodeProps {
  id: string;
  x: number;
  y: number;
  name: string;
  sub: string;
  degree: number;
  kindLabel: string;
  kindCls: string;
  isPackage: boolean;
  selected: boolean;
  active: boolean;
  dimmed: boolean;
  dragging: boolean;
  registerNodeEl: (id: string, el: SVGGElement | null) => void;
  onDown: (id: string, e: React.PointerEvent) => void;
  onEnter: (id: string) => void;
  onLeave: (id: string) => void;
  onFocus: (id: string) => void;
}

const GraphNode = React.memo<GraphNodeProps>(
  ({
    id,
    x,
    y,
    name,
    sub,
    degree,
    kindLabel,
    kindCls,
    isPackage,
    selected,
    active,
    dimmed,
    dragging,
    registerNodeEl,
    onDown,
    onEnter,
    onLeave,
    onFocus,
  }) => {
    const gRef = useRef<SVGGElement>(null);

    useEffect(() => {
      registerNodeEl(id, gRef.current);
      return () => registerNodeEl(id, null);
    }, [id, registerNodeEl]);

    return (
      <g
        ref={gRef}
        transform={`translate(${x}, ${y})`}
        className={`dlc-node ${kindCls}${dimmed ? " dlc-dimmed" : ""}${
          active ? " dlc-node-active" : ""
        }${selected ? " dlc-node-selected" : ""}${
          dragging ? " dlc-node-dragging" : ""
        }`}
        onPointerDown={(e) => onDown(id, e)}
        onPointerEnter={() => onEnter(id)}
        onPointerLeave={() => onLeave(id)}
        onDoubleClick={(e) => {
          e.stopPropagation();
          if (!isPackage) onFocus(id);
        }}
      >
        <title>
          {isPackage ? `${name} (external dependency)` : `${name} — ${sub}`}
        </title>

        {/* Selection glow */}
        {selected && (
          <rect
            x={-4}
            y={-4}
            width={NODE_W + 8}
            height={NODE_H + 8}
            rx={15}
            className="dlc-node-glow"
          />
        )}

        {/* Fake drop shadow */}
        <rect
          x={0}
          y={3}
          width={NODE_W}
          height={NODE_H}
          rx={12}
          className="dlc-node-shadow"
        />

        {/* Body */}
        <rect width={NODE_W} height={NODE_H} rx={12} className="dlc-node-rect" />

        {/* Kind glyph chip */}
        <g transform="translate(10, 15)">
          <rect width={28} height={24} rx={7} className="dlc-chip" />
          <text x={14} y={16} textAnchor="middle" className="dlc-chip-text">
            {kindLabel}
          </text>
        </g>

        {/* Name + provenance */}
        <text x={48} y={24} className="dlc-node-name">
          {truncateMiddle(name, 22)}
        </text>
        <text x={48} y={41} className="dlc-node-path">
          {sub}
        </text>

        {/* Link count, top-right */}
        {degree > 0 && (
          <text
            x={NODE_W - 10}
            y={15}
            textAnchor="end"
            className="dlc-node-links"
          >
            {degree}⇄
          </text>
        )}
      </g>
    );
  },
);
GraphNode.displayName = "GraphNode";

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

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
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [mapSelectedId, setMapSelectedId] = useState<string | null>(null);
  const [dragNodeId, setDragNodeId] = useState<string | null>(null);

  /** Manual node positions (id -> x/y). Wins over the auto-layout. */
  const [positions, setPositions] = useState<Record<string, XY>>({});

  const [view, setView] = useState({ x: 24, y: 16, k: 0.9 });
  const [panning, setPanning] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const cameraGroupRef = useRef<SVGGElement>(null);

  /* Direct SVG DOM element registries for zero-re-render dragging */
  const nodeElsRef = useRef(new Map<string, SVGGElement>());
  const edgeElsRef = useRef(new Map<string, EdgeDomHandles>());
  const livePosRef = useRef(new Map<string, XY>());
  const hoverRafRef = useRef<number>(0);

  const registerNodeEl = useCallback((id: string, el: SVGGElement | null) => {
    if (el) nodeElsRef.current.set(id, el);
    else nodeElsRef.current.delete(id);
  }, []);

  const registerEdgeEl = useCallback(
    (id: string, handles: EdgeDomHandles | null) => {
      if (handles) edgeElsRef.current.set(id, handles);
      else edgeElsRef.current.delete(id);
    },
    [],
  );

  const panRef = useRef<{
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    nextX: number;
    nextY: number;
    moved: boolean;
    raf: number;
  } | null>(null);

  const nodeDragRef = useRef<{
    id: string;
    pointerId: number;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    nextX: number;
    nextY: number;
    moved: boolean;
    raf: number;
  } | null>(null);

  /* ----- touch pinch-to-zoom ------------------------------------------ */
  const activePointersRef = useRef(new Map<number, { x: number; y: number }>());
  const pinchRef = useRef<{ startDist: number; startK: number } | null>(null);
  const lastPinchEndRef = useRef(0);

  const layout = useMemo(
    () => buildGraphLayout(analysis, folder, kind, includePackages),
    [analysis, folder, kind, includePackages],
  );

  const viewRef = useRef(view);
  viewRef.current = view;
  const layoutRef = useRef(layout);
  layoutRef.current = layout;

  // Effective node list = layout positions overridden by committed manual drags.
  const effNodes = useMemo(
    () =>
      layout.nodes.map((n) => {
        const p = positions[n.id];
        return p ? { ...n, x: p.x, y: p.y } : n;
      }),
    [layout, positions],
  );
  const effNodesById = useMemo(
    () => new Map(effNodes.map((n) => [n.id, n])),
    [effNodes],
  );
  const effNodesRef = useRef(effNodes);
  effNodesRef.current = effNodes;
  const effNodesByIdRef = useRef(effNodesById);
  effNodesByIdRef.current = effNodesById;

  // Keep livePosRef synchronized with committed positions
  useEffect(() => {
    const map = new Map<string, XY>();
    for (const n of effNodes) {
      map.set(n.id, { x: n.x, y: n.y });
    }
    livePosRef.current = map;
  }, [effNodes]);

  // Compute module cluster bounding boxes from committed effNodes
  const clusterBoxes = useMemo(() => {
    if (!showClusters) return [];
    const groups = new Map<string, MapNode[]>();
    for (const n of effNodes) {
      if (n.kind === "package") continue;
      const key = n.moduleName || "root";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(n);
    }
    const boxes: Array<{
      id: string;
      label: string;
      count: number;
      x: number;
      y: number;
      w: number;
      h: number;
    }> = [];
    for (const [label, list] of groups.entries()) {
      if (list.length === 0) continue;
      let minX = Infinity,
        minY = Infinity,
        maxX = -Infinity,
        maxY = -Infinity;
      for (const n of list) {
        minX = Math.min(minX, n.x);
        minY = Math.min(minY, n.y);
        maxX = Math.max(maxX, n.x + NODE_W);
        maxY = Math.max(maxY, n.y + NODE_H);
      }
      boxes.push({
        id: label,
        label,
        count: list.length,
        x: minX - 16,
        y: minY - 24,
        w: maxX - minX + 32,
        h: maxY - minY + 36,
      });
    }
    return boxes;
  }, [effNodes, showClusters]);

  const structureKey = useMemo(() => {
    const ids = layout.nodes.map((n) => n.id).sort();
    return `${folder}|${kind}|${includePackages}|${ids.join(",")}`;
  }, [layout, folder, kind, includePackages]);

  const fittedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    setHoverId(null);
    setMapSelectedId(null);
    setDragNodeId(null);
    nodeDragRef.current = null;
    activePointersRef.current.clear();
    pinchRef.current = null;
  }, [structureKey]);

  /* ----- camera helpers ---------------------------------------------- */

  const clampK = (k: number) => Math.min(2.5, Math.max(0.12, k));

  const fitView = useCallback(() => {
    const el = svgRef.current;
    const nodes = effNodesRef.current;
    if (!el || nodes.length === 0) return;
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (const n of nodes) {
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x + NODE_W);
      maxY = Math.max(maxY, n.y + NODE_H);
    }
    const bw = Math.max(1, maxX - minX);
    const bh = Math.max(1, maxY - minY);
    const w = el.clientWidth || 960;
    const h = el.clientHeight || 560;
    const k = clampK(Math.min((w - 72) / bw, (h - 72) / bh));
    setView({
      k,
      x: (w - bw * k) / 2 - minX * k,
      y: (h - bh * k) / 2 - minY * k,
    });
  }, []);

  useEffect(() => {
    setPositions((prev) => {
      const ids = Object.keys(prev);
      const next: Record<string, XY> = {};
      let changed = false;
      for (const id of ids) {
        if (layoutRef.current.nodeById.has(id)) next[id] = prev[id];
        else changed = true;
      }
      return changed ? next : prev;
    });

    if (fittedKeyRef.current === structureKey) return;
    fittedKeyRef.current = structureKey;
    const raf = requestAnimationFrame(fitView);
    return () => cancelAnimationFrame(raf);
  }, [structureKey, fitView]);

  const zoomAtPoint = useCallback(
    (clientX: number, clientY: number, delta: number) => {
      const el = svgRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const px = clientX - rect.left;
      const py = clientY - rect.top;
      setView((v) => {
        const k2 = clampK(v.k * delta);
        const scale = k2 / v.k;
        return {
          k: k2,
          x: px - (px - v.x) * scale,
          y: py - (py - v.y) * scale,
        };
      });
    },
    [],
  );

  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      zoomAtPoint(e.clientX, e.clientY, e.deltaY < 0 ? 1.12 : 1 / 1.12);
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, [zoomAtPoint]);

  const zoomCenter = (delta: number) => {
    const el = svgRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    zoomAtPoint(rect.left + rect.width / 2, rect.top + rect.height / 2, delta);
  };

  const resetView = () => setView({ x: 24, y: 16, k: 0.9 });

  const resetLayout = () => {
    setPositions({});
    requestAnimationFrame(fitView);
  };

  /* ----- canvas panning & pinch-to-zoom (direct DOM matrix during pan) - */

  const handleCanvasPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (nodeDragRef.current) return;
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (activePointersRef.current.size === 2) {
      const [a, b] = [...activePointersRef.current.values()];
      pinchRef.current = {
        startDist: Math.hypot(a.x - b.x, a.y - b.y),
        startK: viewRef.current.k,
      };
      panRef.current = null;
      setPanning(false);
      return;
    }

    panRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: viewRef.current.x,
      origY: viewRef.current.y,
      nextX: viewRef.current.x,
      nextY: viewRef.current.y,
      moved: false,
      raf: 0,
    };
    setPanning(true);
  };

  const handleCanvasPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (nodeDragRef.current) return;
    if (activePointersRef.current.has(e.pointerId)) {
      activePointersRef.current.set(e.pointerId, {
        x: e.clientX,
        y: e.clientY,
      });
    }

    const pinch = pinchRef.current;
    if (pinch && activePointersRef.current.size >= 2) {
      const [a, b] = [...activePointersRef.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const el = svgRef.current;
      if (dist > 0 && pinch.startDist > 0 && el) {
        const rect = el.getBoundingClientRect();
        const px = (a.x + b.x) / 2 - rect.left;
        const py = (a.y + b.y) / 2 - rect.top;
        const k2 = clampK(pinch.startK * (dist / pinch.startDist));
        setView((v) => {
          const scale = k2 / v.k;
          return {
            k: k2,
            x: px - (px - v.x) * scale,
            y: py - (py - v.y) * scale,
          };
        });
      }
      return;
    }

    const d = panRef.current;
    if (!d) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (Math.abs(dx) + Math.abs(dy) > 4) d.moved = true;
    d.nextX = d.origX + dx;
    d.nextY = d.origY + dy;

    if (!d.raf) {
      d.raf = requestAnimationFrame(() => {
        d.raf = 0;
        const cam = cameraGroupRef.current;
        const k = viewRef.current.k;
        if (cam) {
          cam.setAttribute(
            "transform",
            `matrix(${k} 0 0 ${k} ${d.nextX} ${d.nextY})`,
          );
        }
      });
    }
  };

  const endPan = () => {
    const d = panRef.current;
    if (d) {
      if (d.raf) cancelAnimationFrame(d.raf);
      const finalX = d.nextX;
      const finalY = d.nextY;
      panRef.current = null;
      setView((v) => ({ ...v, x: finalX, y: finalY }));
    }
    setPanning(false);
  };

  const releasePointer = (e: React.PointerEvent<SVGSVGElement>) => {
    const wasPinching = pinchRef.current !== null;
    activePointersRef.current.delete(e.pointerId);
    if (activePointersRef.current.size < 2) {
      pinchRef.current = null;
      if (wasPinching) lastPinchEndRef.current = Date.now();
    }
    if (activePointersRef.current.size === 0) endPan();
  };

  const handleCanvasClick = () => {
    if (Date.now() - lastPinchEndRef.current < 350) return;
    if (!panRef.current?.moved) setMapSelectedId(null);
  };

  /* ----- High-Speed Direct-DOM Node Dragging (window listeners) ------- */

  const applyDirectNodeTransform = useCallback(
    (nodeId: string, nx: number, ny: number) => {
      livePosRef.current.set(nodeId, { x: nx, y: ny });

      const gEl = nodeElsRef.current.get(nodeId);
      if (gEl) {
        gEl.setAttribute("transform", `translate(${nx}, ${ny})`);
      }

      const connectedEdges = layoutRef.current.edgesByNode.get(nodeId);
      if (!connectedEdges) return;

      for (const edge of connectedEdges) {
        const handles = edgeElsRef.current.get(edge.id);
        if (!handles) continue;
        const sPos =
          edge.source === nodeId
            ? { x: nx, y: ny }
            : (livePosRef.current.get(edge.source) ??
              effNodesByIdRef.current.get(edge.source));
        const tPos =
          edge.target === nodeId
            ? { x: nx, y: ny }
            : (livePosRef.current.get(edge.target) ??
              effNodesByIdRef.current.get(edge.target));
        if (!sPos || !tPos) continue;

        const { d, x2, y2 } = computeEdgeGeometry(
          sPos.x,
          sPos.y,
          tPos.x,
          tPos.y,
        );
        handles.base?.setAttribute("d", d);
        handles.flow?.setAttribute("d", d);
        handles.port?.setAttribute("cx", String(x2));
        handles.port?.setAttribute("cy", String(y2));
      }
    },
    [],
  );

  useEffect(() => {
    if (!dragNodeId) return;

    const handleWindowPointerMove = (e: PointerEvent) => {
      const d = nodeDragRef.current;
      if (!d || e.pointerId !== d.pointerId) return;
      const k = viewRef.current.k || 1;
      d.nextX = d.origX + (e.clientX - d.startX) / k;
      d.nextY = d.origY + (e.clientY - d.startY) / k;
      if (
        Math.abs(e.clientX - d.startX) + Math.abs(e.clientY - d.startY) > 3
      ) {
        d.moved = true;
      }
      if (!d.raf) {
        d.raf = requestAnimationFrame(() => {
          const cur = nodeDragRef.current;
          if (!cur) return;
          cur.raf = 0;
          applyDirectNodeTransform(cur.id, cur.nextX, cur.nextY);
        });
      }
    };

    const handleWindowPointerUp = (e: PointerEvent) => {
      const d = nodeDragRef.current;
      if (!d || e.pointerId !== d.pointerId) return;
      if (d.raf) {
        cancelAnimationFrame(d.raf);
        d.raf = 0;
      }
      const { id, nextX, nextY, moved } = d;
      nodeDragRef.current = null;
      applyDirectNodeTransform(id, nextX, nextY);
      setPositions((prev) => ({
        ...prev,
        [id]: { x: nextX, y: nextY },
      }));
      setDragNodeId(null);

      if (!moved && e.type === "pointerup") {
        const isPkg = id.startsWith("pkg:");
        if (!isPkg) {
          setMapSelectedId((prev) => (prev === id ? null : id));
        }
      }
    };

    window.addEventListener("pointermove", handleWindowPointerMove, {
      passive: true,
    });
    window.addEventListener("pointerup", handleWindowPointerUp);
    window.addEventListener("pointercancel", handleWindowPointerUp);
    return () => {
      window.removeEventListener("pointermove", handleWindowPointerMove);
      window.removeEventListener("pointerup", handleWindowPointerUp);
      window.removeEventListener("pointercancel", handleWindowPointerUp);
    };
  }, [dragNodeId, applyDirectNodeTransform]);

  const onNodeDown = useCallback((id: string, e: React.PointerEvent) => {
    e.stopPropagation();
    const pos =
      livePosRef.current.get(id) ?? effNodesByIdRef.current.get(id);
    if (!pos) return;
    nodeDragRef.current = {
      id,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      origX: pos.x,
      origY: pos.y,
      nextX: pos.x,
      nextY: pos.y,
      moved: false,
      raf: 0,
    };
    setDragNodeId(id);
    setHoverId(id);
  }, []);

  const onNodeEnter = useCallback((id: string) => {
    if (nodeDragRef.current || panRef.current) return;
    if (hoverRafRef.current) cancelAnimationFrame(hoverRafRef.current);
    hoverRafRef.current = requestAnimationFrame(() => {
      hoverRafRef.current = 0;
      if (!nodeDragRef.current && !panRef.current) {
        setHoverId(id);
      }
    });
  }, []);

  const onNodeLeave = useCallback(() => {
    if (nodeDragRef.current || panRef.current) return;
    if (hoverRafRef.current) cancelAnimationFrame(hoverRafRef.current);
    hoverRafRef.current = requestAnimationFrame(() => {
      hoverRafRef.current = 0;
      if (!nodeDragRef.current && !panRef.current) {
        setHoverId(null);
      }
    });
  }, []);

  const onNodeFocus = useCallback(
    (id: string) => onFocusSymbol(id),
    [onFocusSymbol],
  );

  /* ----- highlighting ---------------------------------------------------- */

  const activeId = dragNodeId ?? hoverId ?? mapSelectedId;
  const activeNeighbors = activeId
    ? (layout.adjacency.get(activeId) ?? new Set<string>())
    : null;
  const isDimmedNode = (id: string) =>
    !!activeId && id !== activeId && !activeNeighbors?.has(id);

  /* ----- render ---------------------------------------------------------- */

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

  const manualCount = Object.keys(positions).length;
  const isInteracting = panning || dragNodeId !== null;
  // Auto-pause background flow dots when graph has many edges to keep 60fps
  const autoFlowPaused = flowPaused || layout.edges.length > 90;

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Map toolbar */}
      <div className="flex flex-wrap items-center gap-2 pb-3">
        <div className="flex items-center gap-1.5 text-xs text-slate-300 font-semibold">
          <MapIcon className="w-4 h-4 text-slate-400" />
          <span>Codebase Map</span>
          <span className="text-[10px] font-mono text-slate-500">
            {layout.nodes.length} nodes · {layout.edges.length} edges
            {clusterBoxes.length > 0 ? ` · ${clusterBoxes.length} modules` : ""}
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
        {layout.nodes.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 text-xs gap-2 p-6 text-center">
            <MapIcon className="w-8 h-8 opacity-30" />
            <p>
              No symbols match the current filters. Try a different folder or
              kind.
            </p>
          </div>
        ) : (
          <svg
            ref={svgRef}
            className={`w-full h-full touch-none select-none ${
              panning ? "cursor-grabbing" : "cursor-grab"
            }${autoFlowPaused ? " dlc-flow-paused" : ""}${
              isInteracting ? " dlc-interacting" : ""
            }`}
            onPointerDown={handleCanvasPointerDown}
            onPointerMove={handleCanvasPointerMove}
            onPointerUp={releasePointer}
            onPointerCancel={releasePointer}
            onPointerLeave={releasePointer}
            onClick={handleCanvasClick}
            role="img"
            aria-label="Codebase dependency map"
          >
            <defs>
              <pattern
                id="dlc-grid"
                width="30"
                height="30"
                patternUnits="userSpaceOnUse"
              >
                <circle cx="1.2" cy="1.2" r="1.2" className="dlc-grid-dot" />
              </pattern>
            </defs>

            <g
              ref={cameraGroupRef}
              transform={`matrix(${view.k} 0 0 ${view.k} ${view.x} ${view.y})`}
            >
              {/* Spatial grid */}
              <rect
                x={-4000}
                y={-4000}
                width={12000}
                height={9000}
                fill="url(#dlc-grid)"
                className="dlc-grid-rect"
              />

              {/* Subsystem / Module Cluster Bounding Boxes */}
              {clusterBoxes.map((box) => (
                <g key={`cluster:${box.id}`} pointerEvents="none">
                  <rect
                    x={box.x}
                    y={box.y}
                    width={box.w}
                    height={box.h}
                    rx={16}
                    className="dlc-cluster-rect"
                  />
                  <text
                    x={box.x + 12}
                    y={box.y + 15}
                    className="dlc-cluster-label"
                  >
                    {box.label} ({box.count})
                  </text>
                </g>
              ))}

              {/* Edges */}
              {layout.edges.map((e) => {
                const s = effNodesById.get(e.source);
                const t = effNodesById.get(e.target);
                if (!s || !t) return null;
                const hot =
                  !!activeId &&
                  (e.source === activeId || e.target === activeId);
                return (
                  <GraphEdge
                    key={e.id}
                    id={e.id}
                    sx={s.x}
                    sy={s.y}
                    tx={t.x}
                    ty={t.y}
                    hot={hot}
                    dimmed={!!activeId && !hot}
                    dotted={e.source.startsWith("pkg:")}
                    registerEdgeEl={registerEdgeEl}
                  />
                );
              })}

              {/* Nodes — stable DOM order so React never detaches/duplicates a node during pointer drag */}
              {effNodes.map((n) => {
                const isPkg = n.kind === "package";
                return (
                  <GraphNode
                    key={n.id}
                    id={n.id}
                    x={n.x}
                    y={n.y}
                    name={n.name}
                    sub={
                      isPkg
                        ? "external dependency"
                        : `${truncateMiddle(n.fileName, 16)} · ln ${n.lineStart}`
                    }
                    degree={n.degree}
                    kindLabel={kindGlyphFor(n.kind)}
                    kindCls={`dlc-node-${n.kind}`}
                    isPackage={isPkg}
                    selected={n.id === mapSelectedId || n.id === selectedId}
                    active={n.id === activeId}
                    dimmed={isDimmedNode(n.id)}
                    dragging={n.id === dragNodeId}
                    registerNodeEl={registerNodeEl}
                    onDown={onNodeDown}
                    onEnter={onNodeEnter}
                    onLeave={onNodeLeave}
                    onFocus={onNodeFocus}
                  />
                );
              })}
            </g>
          </svg>
        )}

        {/* Legend */}
        {layout.nodes.length > 0 && (
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
        {mapSelectedId &&
          effNodesById.get(mapSelectedId)?.kind !== "package" && (
            <div className="absolute right-3 top-3">
              <button
                type="button"
                onClick={() => onFocusSymbol(mapSelectedId)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium shadow-lg transition-colors cursor-pointer"
                title="Open this symbol in the Dependency Tree view"
              >
                <Focus className="w-3.5 h-3.5" />
                <span>
                  Focus{" "}
                  {truncateMiddle(
                    effNodesById.get(mapSelectedId)?.name ?? "",
                    18,
                  )}
                </span>
              </button>
            </div>
          )}
      </div>
    </div>
  );
};
