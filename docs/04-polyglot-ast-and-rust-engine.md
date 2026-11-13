# 04 — Polyglot Static Analysis (Web, Rust, C/C++20) & Native Rust Engine

**MyProject Analyzer** features a dual-mode polyglot static analysis pipeline that extracts symbols, imports, call graphs, and syntax diagnostics across **Web stacks**, **Rust**, and **C/C++20**.

---

## 1. Supported Languages & Stack Detection (`detectCodebaseStack`)

`packages/core/src/depLenz.ts` inspects manifest files (`package.json`, `Cargo.toml`, `CMakeLists.txt`, `Makefile`, `tsconfig.json`) and file extensions to classify any project as `web`, `rust`, `cpp`, or `polyglot`:

| Ecosystem | Extensions | Extracted Symbol Kinds | Dependency & Import Resolution |
|---|---|---|---|
| **Web / TypeScript / React / Vue / Svelte** | `.ts`, `.tsx`, `.js`, `.jsx`, `.mjs`, `.cjs`, `.vue`, `.svelte` | `component`, `hook`, `function`, `class`, `interface`, `type`, `variable` | ES `import`/`export`, `require()`, alias paths (`@/`, `~/`), and npm packages |
| **Rust (Cargo)** | `.rs` | `function` (`fn`), `struct`, `enum`, `trait`, `interface` (`impl`), `namespace` (`mod`), `type`, `variable` (`const`/`static`) | `use crate::...`, `super::...`, `mod foo;`, external Cargo crates, and `::` / `.method()` calls |
| **C / C++20 (CMake)** | `.c`, `.cc`, `.cpp`, `.cxx`, `.h`, `.hh`, `.hpp`, `.hxx`, `.inl` | `function`, `class`, `struct`, `enum` (`enum class`), `namespace`, `type` (`typedef`/`using`) | `#include "local.hpp"` (paired with `.cpp` implementation units), `<system>` headers, and `Namespace::Class::method` calls |

---

## 2. Symbol Deduplication & Call Merging

In C++, Rust, and TypeScript, a single file can legitimately declare the same symbol name multiple times:
- Multiple `impl MyStruct` or `impl Trait for MyStruct` blocks in a single `.rs` file.
- Overloaded functions or forward declarations + definitions in `.hpp`/`.cpp` files.
- TypeScript function overload signatures.

To guarantee **unique graph node IDs** (`${filePath}:${symbolName}`) and prevent duplicate node rendering:
- `extractSymbolsFromFile()` deduplicates symbols per file by `id` while merging their `.calls` arrays and keeping the full implementation body span.
- `DepLenzGraphCanvas.tsx` enforces a secondary `seenNodeIds` guard during layout construction and precomputes an `edgesByNode` adjacency map for O(degree) edge updates.

---

## 3. Native Rust N-API Engine (`packages/rust-engine`)

While the pure TypeScript analyzer runs anywhere (including in-browser), CPU-intensive tasks on large repositories are accelerated on Desktop/Node via the native Rust addon in `packages/rust-engine`:

### Rust Crate Architecture (`packages/rust-engine/src/lib.rs`)
- **`tree-sitter` Grammars**: Uses official `tree-sitter-typescript`, `tree-sitter-javascript`, `tree-sitter-rust`, `tree-sitter-cpp`, and `tree-sitter-c` parsers to construct concrete syntax trees in native C/Rust memory.
- **Parallel Multi-Core Traversal (`rayon`)**: `extractFilesBatchNative` and `buildDependencyGraphNative` parse all files across all CPU cores simultaneously via `par_iter()`.
- **SIMD Keyword & Regex Search (`regex`)**: `searchCodebaseNative` scans every file in parallel and resolves the enclosing AST symbol for every match.
- **Transparent Fallback (`packages/core/src/engineBridge.ts`)**: Automatically loads the compiled `.node` binary when present and falls back seamlessly to the TypeScript analyzer in browser environments.
