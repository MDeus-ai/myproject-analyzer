// TEMPORARY benchmark harness — deleted after verification.
import { createRoot } from "react-dom/client";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "@fontsource/ibm-plex-mono/600.css";
import "./index.css";
import { DepLenzGraphCanvas } from "../../../packages/ui/src/DepLenzGraphCanvas";
import { DepLenzGraphCanvas as OldGraph } from "./__OldGraph";

function makeAnalysis(n: number) {
  const kinds = ["function", "component", "hook", "class", "struct"];
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const symbols: any[] = [];
  const nodesMap = new Map<string, any>();
  for (let i = 0; i < n; i++) {
    const mod = `packages/mod${i % 7}`;
    const file = `file${i % 45}.ts`;
    symbols.push({
      id: `s${i}`,
      name: `symbolName_${i}_${"abcdefgh".slice(0, i % 8)}`,
      kind: kinds[i % kinds.length],
      fileName: file,
      filePath: `${mod}/src/${file}`,
      lineStart: (i * 13) % 900,
    });
    nodesMap.set(`s${i}`, {
      dependencies: [],
      dependents: [],
      externalDependencies: [`@ext/pkg${i % 18}`],
    });
  }
  for (let i = 0; i < n; i++) {
    const deps = 3 + Math.floor(rnd() * 4);
    for (let d = 0; d < deps; d++) {
      const t = Math.floor(Math.pow(rnd(), 1.6) * n);
      if (t === i) continue;
      nodesMap.get(`s${i}`).dependencies.push({ symbol: symbols[t] });
      nodesMap.get(`s${t}`).dependents.push({ symbol: symbols[i] });
    }
  }
  return { symbols, nodesMap } as any;
}

const analysis = makeAnalysis(600);
const which = new URLSearchParams(location.search).get("v");
const C = which === "old" ? OldGraph : DepLenzGraphCanvas;
document.documentElement.setAttribute("data-appearance", "dark");

createRoot(document.getElementById("root")!).render(
  <div style={{ width: 1400, height: 860, padding: 16 }} className="flex flex-col">
    <C analysis={analysis} selectedId={null} onFocusSymbol={() => {}} />
  </div>,
);
