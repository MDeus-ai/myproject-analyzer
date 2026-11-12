//! Data transfer structures matching `@myproject/core/depLenz` and `@myproject/core/codeAnalyzer`.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct RustFileInput {
    pub name: String,
    pub relative_path: String,
    pub extension: String,
    pub size: usize,
    #[serde(default)]
    pub text_content: Option<String>,
    #[serde(default)]
    pub absolute_path: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum SymbolKind {
    Function,
    Component,
    Hook,
    Method,
    Class,
    Struct,
    Trait,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct DepLenzSymbol {
    pub id: String,
    pub name: String,
    pub kind: SymbolKind,
    pub file_path: String,
    pub file_name: String,
    pub line_start: usize,
    pub line_end: usize,
    pub signature: String,
    pub body: String,
    pub is_exported: bool,
    pub is_default_export: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub doc_comment: Option<String>,
    pub calls: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ImportedName {
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub alias: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct FileImport {
    pub imported_names: Vec<ImportedName>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub default_import: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub namespace_import: Option<String>,
    pub source_path: String,
    pub is_relative: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub resolved_file_path: Option<String>,
    #[serde(default)]
    pub is_type_only: bool,
    #[serde(default)]
    pub is_re_export: bool,
    #[serde(default)]
    pub star_re_export: bool,
    #[serde(default)]
    pub is_dynamic: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct TypeDeclaration {
    pub name: String,
    pub kind: String, // "interface" | "type" | "enum"
    pub file_path: String,
    pub line_start: usize,
    pub line_end: usize,
    pub body: String,
    pub is_exported: bool,
    pub references: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct SymbolEdgeRef {
    pub symbol: DepLenzSymbol,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub via_import: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct DepLenzGraphNode {
    pub symbol: DepLenzSymbol,
    pub dependencies: Vec<SymbolEdgeRef>,
    pub dependents: Vec<SymbolEdgeRef>,
    pub external_dependencies: Vec<String>,
    pub impact_radius: usize,
    pub impact_level: String, // "low" | "medium" | "high"
    pub direct_callers: usize,
    pub direct_callees: usize,
    pub blast_radius: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct SyntaxDiagnostic {
    pub id: String,
    pub file_path: String,
    pub file_name: String,
    pub line: usize,
    pub column: usize,
    pub message: String,
    pub severity: String, // "error" | "warning"
    #[serde(skip_serializing_if = "Option::is_none")]
    pub code_snippet: Option<String>,
    pub category: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SerializedDepLenzAnalysisResult {
    pub symbols: Vec<DepLenzSymbol>,
    pub nodes_map: HashMap<String, DepLenzGraphNode>,
    pub file_symbols_map: HashMap<String, Vec<DepLenzSymbol>>,
    pub file_types_map: HashMap<String, Vec<TypeDeclaration>>,
    pub type_index: HashMap<String, Vec<TypeDeclaration>>,
    pub total_functions: usize,
    pub total_components: usize,
    pub total_hooks: usize,
    pub total_dependencies_mapped: usize,
    pub analyzed_files_count: usize,
    pub diagnostics: Vec<SyntaxDiagnostic>,
    pub total_syntax_warnings: usize,
    pub files_with_syntax_errors: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct CodebaseSearchOptions {
    pub query: String,
    #[serde(default)]
    pub case_sensitive: bool,
    #[serde(default)]
    pub whole_word: bool,
    #[serde(default)]
    pub is_regex: bool,
    #[serde(default)]
    pub file_filter: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct CodebaseSearchMatch {
    pub id: String,
    pub file_path: String,
    pub file_name: String,
    pub line_number: usize,
    pub column_number: usize,
    pub line_text: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub enclosing_symbol: Option<DepLenzSymbol>,
    pub match_length: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct TokenEstimateByStyle {
    pub standard: usize,
    pub compact: usize,
    pub markdown: usize,
    pub xml: usize,
    pub jsonl: usize,
    pub json: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct WalkedFileDto {
    pub abs_path: String,
    pub rel_path: String,
    pub name: String,
    pub size: u64,
    pub mtime_ms: u64,
}
