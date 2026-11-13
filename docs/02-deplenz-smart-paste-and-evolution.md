# 02 — DepLenz, Surgical Prompts, Evolution Logs & Smart Paste

**DepLenz** (`Workspace Tab 6`) is the architectural intelligence engine inside **MyProject Analyzer**. It understands Web (`TypeScript`, `React`, `Vue`, `Svelte`), **Rust (`Cargo`)**, and **C/C++20 (`CMake`)** codebases, visualizes how symbols communicate, and streamlines AI-assisted coding workflows.

---

## 1. Interactive Codebase Map & Module Clusters

When you open DepLenz, it parses every source file into symbols (`component`, `hook`, `function`, `class`, `struct`, `trait`, `enum`, `namespace`, `interface`, `package`) and builds a complete call and import graph:

- **Smooth 60fps Drag & Pan**: Drag any symbol box to rearrange your architecture diagram, pan across the canvas, or zoom toward your cursor.
- **Architectural Cluster Halos**: Automatically groups related files by directory and domain (`UI Layer`, `Core Engine`, `Native / Systems`, `State & Hooks`, `API & Services`, `Tests`), drawing labeled bounding halos behind each subsystem.
- **Caller / Callee Flow Tracing**: Clicking any node highlights its upstream callers and downstream callees with animated directional Bezier ports while dimming unrelated nodes.

---

## 2. Bi-Directional Dependency Tree & Blast Radius

Selecting any symbol opens the **Dependency Tree Inspector**:
- **Upstream Callers ("Who calls this?")**: Every function, component, or method that invokes the selected symbol. If you change the selected symbol's signature, these callers are your **Blast Radius**.
- **Downstream Callees ("What does this call?")**: Internal functions and external packages (`npm`, `Cargo` crates, or C/C++ `#include` headers) that the symbol depends on.
- **Syntax Guard**: Automatically flags unclosed braces, mismatched parentheses, or malformed JSON with exact line and column numbers.

---

## 3. Surgical LLM Prompt Extractor & User Action Directive

Instead of pasting an entire repository into an LLM, **Surgical LLM Prompt** extracts only:
1. The target symbol's exact source code and line range.
2. Direct upstream caller contracts (signatures and call sites).
3. Direct downstream dependency signatures.

### Automatic User Action Prompt Interleaving
Inside the **Surgical LLM Prompt** panel, you can type your specific coding task into the **User Action Prompt** box (or click quick templates like *Fix bug*, *Optimize performance*, *Add error handling*, *Port to Rust/C++*). Your instruction is **automatically interleaved** into the generated prompt output under a dedicated `## USER ACTION DIRECTIVE` section alongside target symbol constraints, caller blast-radius rules, and the Smart Paste output contract.

---

## 4. Project & Code Evolution Logs (Token-Efficient Handover Digest)

When handing a project from one LLM session to another, the new AI typically lacks context on what was recently modified. Under **DepLenz → Evolution Log**, MyProject Analyzer tracks codebase changes across:
- **Smart Paste applications**
- **Live Disk Watcher updates** (Desktop)
- **Manual architectural checkpoints**

### Ultra-Compact Handover Digest
You can select a strict token budget (**150**, **350**, **600**, or **1200 tokens**) using the theme-styled dropdown. The engine compiles a compressed delta log (`formatEvolutionHandoverDigest`) using action sigils (`+` create, `~` modify, `-` delete) and line delta counts (`+18/-4 [fnA,fnB]`), giving the next LLM complete continuity in as few as ~120 tokens. When enabled, this digest is also embedded directly into every Surgical LLM Prompt.

---

## 5. Smart Paste Inbox & Apply to Disk

Every Surgical LLM Prompt ends with a **Smart Paste Output Contract** instructing the AI to return modified files inside `=== SMART-PASTE-FILE: <path> ===` blocks.
1. Copy the AI's response and paste it into the **Smart Paste Inbox**.
2. Inspect the side-by-side **Line Diff Preview** (`+added` / `-removed` lines and syntax validation).
3. Download a clean ZIP of the updated files on Web, or click **Apply to Disk** on Desktop to write the changes atomically to your local project folder.
