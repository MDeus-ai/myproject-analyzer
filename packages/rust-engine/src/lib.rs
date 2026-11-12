//! `myproject-rust-engine` — High-performance Rust backend for MyProject Analyzer.
//!
//! Targets the CPU-bound hot paths ranked in `plans.md`:
//! 1. `build_codebase_dependency_graph` — AST/symbol extraction, O(1) import
//!    resolution, cross-file call linking, and transitive blast-radius BFS.
//! 2. `extract_symbols_from_file` / `validate_file_syntax` — single-pass
//!    lexer and balanced-delimiter scanner.
//! 3. `search_codebase` — ripgrep-style SIMD (`memchr::memmem`) + `regex`
//!    codebase search with enclosing-symbol detection.
//! 4. `estimate_combined_tokens_by_style` & `count_lines` — SIMD byte-scan
//!    line counting and O(N) multi-format token estimation.

pub mod graph;
pub mod parser;
pub mod search;
pub mod tokens;
pub mod types;

use crate::graph::build_codebase_dependency_graph;
use crate::parser::{extract_symbols_from_file, validate_file_syntax};
use crate::search::search_codebase;
use crate::tokens::{count_lines, estimate_combined_tokens_by_style};
use crate::types::{
    CodebaseSearchOptions, DepLenzSymbol, RustFileInput, TokenEstimateByStyle,
};
use std::collections::HashMap;

/// JSON-in / JSON-out entry point for building the full codebase dependency graph.
pub fn build_graph_json(files_json: &str) -> Result<String, String> {
    let files: Vec<RustFileInput> =
        serde_json::from_str(files_json).map_err(|e| format!("Invalid files JSON: {e}"))?;
    let result = build_codebase_dependency_graph(&files);
    serde_json::to_string(&result).map_err(|e| format!("Serialization error: {e}"))
}

/// JSON-in / JSON-out entry point for ripgrep-style SIMD codebase search.
pub fn search_codebase_json(
    files_json: &str,
    options_json: &str,
    symbols_map_json: Option<&str>,
) -> Result<String, String> {
    let files: Vec<RustFileInput> =
        serde_json::from_str(files_json).map_err(|e| format!("Invalid files JSON: {e}"))?;
    let options: CodebaseSearchOptions =
        serde_json::from_str(options_json).map_err(|e| format!("Invalid options JSON: {e}"))?;
    let symbols_map: Option<HashMap<String, Vec<DepLenzSymbol>>> = match symbols_map_json {
        Some(raw) if !raw.is_empty() => serde_json::from_str(raw).ok(),
        _ => None,
    };
    let matches = search_codebase(&files, &options, symbols_map.as_ref());
    serde_json::to_string(&matches).map_err(|e| format!("Serialization error: {e}"))
}

/// JSON-in / JSON-out entry point for single-file symbol extraction.
pub fn extract_symbols_json(
    content: &str,
    file_path: &str,
    file_name: &str,
) -> Result<String, String> {
    let symbols = extract_symbols_from_file(content, file_path, file_name);
    serde_json::to_string(&symbols).map_err(|e| format!("Serialization error: {e}"))
}

/// JSON-in / JSON-out entry point for token estimation across all 6 Analyzer formats.
pub fn estimate_tokens_json(
    files_json: &str,
    include_toc: bool,
    include_line_numbers: bool,
) -> Result<String, String> {
    let files: Vec<RustFileInput> =
        serde_json::from_str(files_json).map_err(|e| format!("Invalid files JSON: {e}"))?;
    let est: TokenEstimateByStyle =
        estimate_combined_tokens_by_style(&files, include_toc, include_line_numbers);
    serde_json::to_string(&est).map_err(|e| format!("Serialization error: {e}"))
}

/// Fast SIMD line count exposed to N-API and WASM.
pub fn count_lines_fast(content: &str) -> usize {
    count_lines(content)
}

// ---------------------------------------------------------------------------
// Optional N-API bindings for Node / Electron (`--features napi-binding`)
// ---------------------------------------------------------------------------
#[cfg(feature = "napi-binding")]
mod napi_exports {
    use super::*;
    use napi_derive::napi;

    #[napi]
    pub fn napi_build_graph(files_json: String) -> napi::Result<String> {
        build_graph_json(&files_json).map_err(napi::Error::from_reason)
    }

    #[napi]
    pub fn napi_search_codebase(
        files_json: String,
        options_json: String,
        symbols_map_json: Option<String>,
    ) -> napi::Result<String> {
        search_codebase_json(&files_json, &options_json, symbols_map_json.as_deref())
            .map_err(napi::Error::from_reason)
    }

    #[napi]
    pub fn napi_extract_symbols(
        content: String,
        file_path: String,
        file_name: String,
    ) -> napi::Result<String> {
        extract_symbols_json(&content, &file_path, &file_name).map_err(napi::Error::from_reason)
    }

    #[napi]
    pub fn napi_estimate_tokens(
        files_json: String,
        include_toc: bool,
        include_line_numbers: bool,
    ) -> napi::Result<String> {
        estimate_tokens_json(&files_json, include_toc, include_line_numbers)
            .map_err(napi::Error::from_reason)
    }

    #[napi]
    pub fn napi_count_lines(content: String) -> u32 {
        count_lines_fast(&content) as u32
    }
}

// ---------------------------------------------------------------------------
// Optional WebAssembly bindings for Browser / Web Worker (`--features wasm-binding`)
// ---------------------------------------------------------------------------
#[cfg(feature = "wasm-binding")]
mod wasm_exports {
    use super::*;
    use wasm_bindgen::prelude::*;

    #[wasm_bindgen]
    pub fn wasm_build_graph(files_json: &str) -> Result<String, JsValue> {
        build_graph_json(files_json).map_err(|e| JsValue::from_str(&e))
    }

    #[wasm_bindgen]
    pub fn wasm_search_codebase(
        files_json: &str,
        options_json: &str,
        symbols_map_json: Option<String>,
    ) -> Result<String, JsValue> {
        search_codebase_json(files_json, options_json, symbols_map_json.as_deref())
            .map_err(|e| JsValue::from_str(&e))
    }

    #[wasm_bindgen]
    pub fn wasm_estimate_tokens(
        files_json: &str,
        include_toc: bool,
        include_line_numbers: bool,
    ) -> Result<String, JsValue> {
        estimate_tokens_json(files_json, include_toc, include_line_numbers)
            .map_err(|e| JsValue::from_str(&e))
    }

    #[wasm_bindgen]
    pub fn wasm_count_lines(content: &str) -> usize {
        count_lines_fast(content)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::SymbolKind;

    #[test]
    fn test_extract_symbols_and_build_graph() {
        let files = vec![
            RustFileInput {
                name: "math.ts".into(),
                relative_path: "repo/src/math.ts".into(),
                extension: "ts".into(),
                size: 64,
                text_content: Some("export function add(a: number, b: number) { return a + b; }".into()),
                absolute_path: None,
            },
            RustFileInput {
                name: "App.tsx".into(),
                relative_path: "repo/src/App.tsx".into(),
                extension: "tsx".into(),
                size: 128,
                text_content: Some(
                    "import { add } from './math';\nexport function App() {\n  const total = add(1, 2);\n  return <div>{total}</div>;\n}".into(),
                ),
                absolute_path: None,
            },
        ];

        let graph = build_codebase_dependency_graph(&files);
        assert_eq!(graph.analyzed_files_count, 2);
        assert_eq!(graph.total_functions, 1);
        assert_eq!(graph.total_components, 1);
        assert_eq!(graph.total_dependencies_mapped, 1);

        let add_node = graph.nodes_map.get("repo/src/math.ts:add").unwrap();
        assert_eq!(add_node.direct_callers, 1);
        assert_eq!(add_node.blast_radius, 1);
        assert_eq!(add_node.symbol.kind, SymbolKind::Function);
    }

    #[test]
    fn test_simd_search_and_tokens() {
        let files = vec![RustFileInput {
            name: "math.ts".into(),
            relative_path: "repo/src/math.ts".into(),
            extension: "ts".into(),
            size: 64,
            text_content: Some("export function computeTotal(x: number) {\n  return x * 42;\n}".into()),
            absolute_path: None,
        }];

        let matches = search_codebase(
            &files,
            &CodebaseSearchOptions {
                query: "computeTotal".into(),
                case_sensitive: true,
                whole_word: false,
                is_regex: false,
                file_filter: None,
            },
            None,
        );
        assert_eq!(matches.len(), 1);
        assert_eq!(matches[0].line_number, 1);

        let tokens = estimate_combined_tokens_by_style(&files, true, false);
        assert!(tokens.standard > tokens.compact);
        assert_eq!(count_lines("a\nb\nc"), 3);
    }
}
