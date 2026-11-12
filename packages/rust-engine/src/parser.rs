//! High-speed single-pass lexer and AST/symbol extractor in Rust.
//!
//! Extracts functions, React components, custom hooks, classes, methods,
//! imports, barrel re-exports, type/interface/enum declarations, call sites,
//! and syntax diagnostics without quadratic regex backtracking.

use crate::types::{
    DepLenzSymbol, FileImport, ImportedName, SymbolKind, SyntaxDiagnostic, TypeDeclaration,
};
use regex::Regex;
use std::collections::HashSet;
use std::sync::OnceLock;

static RESERVED_KEYWORDS: OnceLock<HashSet<&'static str>> = OnceLock::new();

fn reserved_keywords() -> &'static HashSet<&'static str> {
    RESERVED_KEYWORDS.get_or_init(|| {
        [
            "if", "else", "for", "while", "do", "switch", "case", "break", "continue", "return",
            "try", "catch", "finally", "throw", "new", "typeof", "instanceof", "void", "delete",
            "in", "of", "await", "yield", "import", "export", "from", "default", "function",
            "class", "extends", "super", "this", "const", "let", "var", "interface", "type",
            "enum", "implements", "public", "private", "protected", "readonly", "static", "async",
            "get", "set", "console", "Math", "JSON", "Object", "Array", "String", "Number",
            "Boolean", "Promise", "Map", "Set", "WeakMap", "WeakSet", "Error", "Date", "RegExp",
            "parseInt", "parseFloat", "isNaN", "isFinite", "setTimeout", "clearTimeout",
            "setInterval", "clearInterval", "requestAnimationFrame", "cancelAnimationFrame",
            "encodeURIComponent", "decodeURIComponent", "fetch", "URL", "Blob", "File",
        ]
        .into_iter()
        .collect()
    })
}

/// Validates delimiter balance and JSON syntax in O(file) byte scan.
pub fn validate_file_syntax(
    content: &str,
    file_path: &str,
    file_name: &str,
) -> Vec<SyntaxDiagnostic> {
    let mut diagnostics = Vec::new();

    if file_name.to_lowercase().ends_with(".json") {
        if let Err(err) = serde_json::from_str::<serde_json::Value>(content) {
            diagnostics.push(SyntaxDiagnostic {
                id: format!("diag:{file_path}:{}:{}", err.line(), err.column()),
                file_path: file_path.to_string(),
                file_name: file_name.to_string(),
                line: err.line().max(1),
                column: err.column().max(1),
                message: format!("Malformed JSON: {err}"),
                severity: "error".to_string(),
                code_snippet: content.lines().nth(err.line().saturating_sub(1)).map(|s| s.trim().to_string()),
                category: "json-syntax".to_string(),
            });
        }
        return diagnostics;
    }

    let bytes = content.as_bytes();
    let len = bytes.len();
    let mut i = 0;
    let mut line = 1usize;
    let mut col = 1usize;
    let mut stack: Vec<(u8, usize, usize)> = Vec::new();

    while i < len {
        let b = bytes[i];
        if b == b'\n' {
            line += 1;
            col = 1;
            i += 1;
            continue;
        }
        // Line comment
        if b == b'/' && i + 1 < len && bytes[i + 1] == b'/' {
            while i < len && bytes[i] != b'\n' {
                i += 1;
            }
            continue;
        }
        // Block comment
        if b == b'/' && i + 1 < len && bytes[i + 1] == b'*' {
            i += 2;
            col += 2;
            while i + 1 < len && !(bytes[i] == b'*' && bytes[i + 1] == b'/') {
                if bytes[i] == b'\n' {
                    line += 1;
                    col = 1;
                } else {
                    col += 1;
                }
                i += 1;
            }
            i = (i + 2).min(len);
            continue;
        }
        // String / template literals
        if b == b'\'' || b == b'"' || b == b'`' {
            let quote = b;
            i += 1;
            col += 1;
            while i < len {
                let c = bytes[i];
                if c == b'\\' {
                    i += 2;
                    col += 2;
                    continue;
                }
                if c == b'\n' {
                    line += 1;
                    col = 1;
                    if quote != b'`' {
                        break;
                    }
                } else {
                    col += 1;
                }
                if c == quote {
                    i += 1;
                    break;
                }
                i += 1;
            }
            continue;
        }

        match b {
            b'(' | b'{' | b'[' => {
                stack.push((b, line, col));
            }
            b')' | b'}' | b']' => {
                let expected = match b {
                    b')' => b'(',
                    b'}' => b'{',
                    _ => b'[',
                };
                if let Some((open, open_line, _)) = stack.pop() {
                    if open != expected {
                        diagnostics.push(SyntaxDiagnostic {
                            id: format!("diag:{file_path}:{line}:{col}"),
                            file_path: file_path.to_string(),
                            file_name: file_name.to_string(),
                            line,
                            column: col,
                            message: format!(
                                "Mismatched delimiter '{}' (opened '{}' at line {})",
                                b as char, open as char, open_line
                            ),
                            severity: "error".to_string(),
                            code_snippet: None,
                            category: "mismatched-delimiter".to_string(),
                        });
                        break;
                    }
                }
            }
            _ => {}
        }

        i += 1;
        col += 1;
    }

    if let Some((open, open_line, open_col)) = stack.pop() {
        diagnostics.push(SyntaxDiagnostic {
            id: format!("diag:{file_path}:{open_line}:{open_col}"),
            file_path: file_path.to_string(),
            file_name: file_name.to_string(),
            line: open_line,
            column: open_col,
            message: format!("Unclosed delimiter '{}'", open as char),
            severity: "error".to_string(),
            code_snippet: None,
            category: "unclosed-delimiter".to_string(),
        });
    }

    diagnostics
}

/// Extracts ES module imports, type imports, re-exports, and dynamic imports.
pub fn extract_imports(content: &str) -> Vec<FileImport> {
    static IMPORT_RE: OnceLock<Regex> = OnceLock::new();
    static REEXPORT_RE: OnceLock<Regex> = OnceLock::new();

    let import_re = IMPORT_RE.get_or_init(|| {
        Regex::new(r#"(?m)^\s*import\s+(type\s+)?(?:([A-Za-z_$][\w$]*)\s*,?\s*)?(?:\*\s+as\s+([A-Za-z_$][\w$]*)|\{([^}]*)\})?\s*from\s*['"]([^'"]+)['"]"#).unwrap()
    });
    let reexport_re = REEXPORT_RE.get_or_init(|| {
        Regex::new(r#"(?m)^\s*export\s+(?:\*|\{([^}]*)\})\s*from\s*['"]([^'"]+)['"]"#).unwrap()
    });

    let mut imports = Vec::new();

    for cap in import_re.captures_iter(content) {
        let is_type_only = cap.get(1).is_some();
        let default_import = cap.get(2).map(|m| m.as_str().trim().to_string());
        let namespace_import = cap.get(3).map(|m| m.as_str().trim().to_string());
        let named_raw = cap.get(4).map(|m| m.as_str()).unwrap_or("");
        let source_path = cap.get(5).map(|m| m.as_str().trim().to_string()).unwrap_or_default();

        let mut imported_names = Vec::new();
        for part in named_raw.split(',') {
            let trimmed = part.trim().trim_start_matches("type ").trim();
            if trimmed.is_empty() {
                continue;
            }
            if let Some((orig, alias)) = trimmed.split_once(" as ") {
                imported_names.push(ImportedName {
                    name: orig.trim().to_string(),
                    alias: Some(alias.trim().to_string()),
                });
            } else {
                imported_names.push(ImportedName {
                    name: trimmed.to_string(),
                    alias: None,
                });
            }
        }

        let is_relative = source_path.starts_with('.');
        imports.push(FileImport {
            imported_names,
            default_import,
            namespace_import,
            source_path,
            is_relative,
            resolved_file_path: None,
            is_type_only,
            is_re_export: false,
            star_re_export: false,
            is_dynamic: false,
        });
    }

    for cap in reexport_re.captures_iter(content) {
        let named_raw = cap.get(1).map(|m| m.as_str());
        let source_path = cap.get(2).map(|m| m.as_str().trim().to_string()).unwrap_or_default();
        let star_re_export = named_raw.is_none();
        let mut imported_names = Vec::new();

        if let Some(raw) = named_raw {
            for part in raw.split(',') {
                let trimmed = part.trim().trim_start_matches("type ").trim();
                if trimmed.is_empty() {
                    continue;
                }
                if let Some((orig, alias)) = trimmed.split_once(" as ") {
                    imported_names.push(ImportedName {
                        name: orig.trim().to_string(),
                        alias: Some(alias.trim().to_string()),
                    });
                } else {
                    imported_names.push(ImportedName {
                        name: trimmed.to_string(),
                        alias: None,
                    });
                }
            }
        }

        let is_relative = source_path.starts_with('.');
        imports.push(FileImport {
            imported_names,
            default_import: None,
            namespace_import: None,
            source_path,
            is_relative,
            resolved_file_path: None,
            is_type_only: false,
            is_re_export: true,
            star_re_export,
            is_dynamic: false,
        });
    }

    imports
}

/// Extracts `interface`, `type`, and `enum` declarations.
pub fn extract_type_declarations(content: &str, file_path: &str) -> Vec<TypeDeclaration> {
    static TYPE_RE: OnceLock<Regex> = OnceLock::new();
    static REF_RE: OnceLock<Regex> = OnceLock::new();

    let type_re = TYPE_RE.get_or_init(|| {
        Regex::new(r"(?m)^(\s*)(export\s+)?(interface|type|enum)\s+([A-Za-z_$][\w$]*)").unwrap()
    });
    let ref_re = REF_RE.get_or_init(|| Regex::new(r"\b([A-Z][A-Za-z0-9_]*)\b").unwrap());

    let lines: Vec<&str> = content.lines().collect();
    let mut decls = Vec::new();

    for cap in type_re.captures_iter(content) {
        let match_start = cap.get(0).unwrap().start();
        let is_exported = cap.get(2).is_some();
        let kind = cap.get(3).unwrap().as_str().to_string();
        let name = cap.get(4).unwrap().as_str().to_string();

        let line_start = content[..match_start].bytes().filter(|&b| b == b'\n').count() + 1;
        let mut line_end = line_start;
        let mut brace_depth = 0i32;
        let mut started_brace = false;

        for (idx, line_str) in lines.iter().enumerate().skip(line_start - 1) {
            line_end = idx + 1;
            for b in line_str.bytes() {
                if b == b'{' {
                    brace_depth += 1;
                    started_brace = true;
                } else if b == b'}' {
                    brace_depth -= 1;
                }
            }
            if started_brace && brace_depth <= 0 {
                break;
            }
            if !started_brace && line_str.trim_end().ends_with(';') {
                break;
            }
            if line_end - line_start > 80 {
                break;
            }
        }

        let body = lines[(line_start - 1)..line_end.min(lines.len())].join("\n");
        let mut references = Vec::new();
        let mut seen = HashSet::new();
        for ref_cap in ref_re.captures_iter(&body) {
            let r = ref_cap.get(1).unwrap().as_str();
            if r != name && seen.insert(r.to_string()) {
                references.push(r.to_string());
            }
        }

        decls.push(TypeDeclaration {
            name,
            kind,
            file_path: file_path.to_string(),
            line_start,
            line_end,
            body,
            is_exported,
            references,
        });
    }

    decls
}

/// Extracts top-level and exported functions, components, hooks, and classes.
pub fn extract_symbols_from_file(
    content: &str,
    file_path: &str,
    file_name: &str,
) -> Vec<DepLenzSymbol> {
    static FN_DECL_RE: OnceLock<Regex> = OnceLock::new();
    static ARROW_DECL_RE: OnceLock<Regex> = OnceLock::new();
    static CLASS_DECL_RE: OnceLock<Regex> = OnceLock::new();
    static CALL_RE: OnceLock<Regex> = OnceLock::new();

    let fn_re = FN_DECL_RE.get_or_init(|| {
        Regex::new(r"(?m)^[ \t]*(export\s+)?(default\s+)?(async\s+)?function\s+([A-Za-z_$][\w$]*)\s*(?:<[^>]*>)?\s*\(([^)]*)\)").unwrap()
    });
    let arrow_re = ARROW_DECL_RE.get_or_init(|| {
        Regex::new(r"(?m)^[ \t]*(export\s+)?(const|let)\s+([A-Za-z_$][\w$]*)\s*(?::[^=]+)?=\s*(?:React\.(?:memo|forwardRef)\s*\(\s*)?(async\s+)?\(([^)]*)\)\s*(?::[^=]+)?=>").unwrap()
    });
    let class_re = CLASS_DECL_RE.get_or_init(|| {
        Regex::new(r"(?m)^[ \t]*(export\s+)?(default\s+)?class\s+([A-Za-z_$][\w$]*)").unwrap()
    });
    let call_re = CALL_RE.get_or_init(|| {
        Regex::new(r"(?:<([A-Z][A-Za-z0-9_]*)\b|\b([A-Za-z_$][\w$]*)\s*\()").unwrap()
    });

    let lines: Vec<&str> = content.lines().collect();
    let mut symbols = Vec::new();
    let mut seen_names = HashSet::new();

    let extract_span = |start_line: usize| -> (usize, String) {
        let mut end_line = start_line;
        let mut depth = 0i32;
        let mut opened = false;
        for (idx, line_str) in lines.iter().enumerate().skip(start_line - 1) {
            end_line = idx + 1;
            for b in line_str.bytes() {
                if b == b'{' {
                    depth += 1;
                    opened = true;
                } else if b == b'}' {
                    depth -= 1;
                }
            }
            if opened && depth <= 0 {
                break;
            }
            if !opened && end_line - start_line >= 3 && line_str.trim_end().ends_with(';') {
                break;
            }
            if end_line - start_line > 250 {
                break;
            }
        }
        let body = lines[(start_line - 1)..end_line.min(lines.len())].join("\n");
        (end_line, body)
    };

    let classify_kind = |name: &str, body: &str| -> SymbolKind {
        if name.starts_with("use")
            && name
                .chars()
                .nth(3)
                .map(|c| c.is_ascii_uppercase())
                .unwrap_or(false)
        {
            SymbolKind::Hook
        } else if name
            .chars()
            .next()
            .map(|c| c.is_ascii_uppercase())
            .unwrap_or(false)
            && (body.contains('<') || body.contains("jsx") || body.contains("React"))
        {
            SymbolKind::Component
        } else {
            SymbolKind::Function
        }
    };

    let extract_calls = |self_name: &str, body: &str| -> Vec<String> {
        let keywords = reserved_keywords();
        let mut calls = Vec::new();
        let mut seen = HashSet::new();
        for cap in call_re.captures_iter(body) {
            let callee = cap
                .get(1)
                .or_else(|| cap.get(2))
                .map(|m| m.as_str())
                .unwrap_or("");
            if callee.is_empty() || callee == self_name || keywords.contains(callee) {
                continue;
            }
            if seen.insert(callee.to_string()) {
                calls.push(callee.to_string());
            }
        }
        calls
    };

    for cap in fn_re.captures_iter(content) {
        let start_byte = cap.get(0).unwrap().start();
        let is_exported = cap.get(1).is_some();
        let is_default = cap.get(2).is_some();
        let name = cap.get(4).unwrap().as_str().to_string();
        let params = cap.get(5).map(|m| m.as_str().trim()).unwrap_or("");
        if !seen_names.insert(name.clone()) {
            continue;
        }
        let line_start = content[..start_byte].bytes().filter(|&b| b == b'\n').count() + 1;
        let (line_end, body) = extract_span(line_start);
        let kind = classify_kind(&name, &body);
        let calls = extract_calls(&name, &body);

        symbols.push(DepLenzSymbol {
            id: format!("{file_path}:{name}"),
            signature: format!("{name}({params})"),
            name,
            kind,
            file_path: file_path.to_string(),
            file_name: file_name.to_string(),
            line_start,
            line_end,
            body,
            is_exported: is_exported || is_default,
            is_default_export: is_default,
            doc_comment: None,
            calls,
        });
    }

    for cap in arrow_re.captures_iter(content) {
        let start_byte = cap.get(0).unwrap().start();
        let is_exported = cap.get(1).is_some();
        let name = cap.get(3).unwrap().as_str().to_string();
        let params = cap.get(5).map(|m| m.as_str().trim()).unwrap_or("");
        if !seen_names.insert(name.clone()) {
            continue;
        }
        let line_start = content[..start_byte].bytes().filter(|&b| b == b'\n').count() + 1;
        let (line_end, body) = extract_span(line_start);
        let kind = classify_kind(&name, &body);
        let calls = extract_calls(&name, &body);

        symbols.push(DepLenzSymbol {
            id: format!("{file_path}:{name}"),
            signature: format!("{name}({params})"),
            name,
            kind,
            file_path: file_path.to_string(),
            file_name: file_name.to_string(),
            line_start,
            line_end,
            body,
            is_exported,
            is_default_export: false,
            doc_comment: None,
            calls,
        });
    }

    for cap in class_re.captures_iter(content) {
        let start_byte = cap.get(0).unwrap().start();
        let is_exported = cap.get(1).is_some();
        let is_default = cap.get(2).is_some();
        let name = cap.get(3).unwrap().as_str().to_string();
        if !seen_names.insert(name.clone()) {
            continue;
        }
        let line_start = content[..start_byte].bytes().filter(|&b| b == b'\n').count() + 1;
        let (line_end, body) = extract_span(line_start);
        let calls = extract_calls(&name, &body);

        symbols.push(DepLenzSymbol {
            id: format!("{file_path}:{name}"),
            signature: format!("class {name}"),
            name,
            kind: SymbolKind::Class,
            file_path: file_path.to_string(),
            file_name: file_name.to_string(),
            line_start,
            line_end,
            body,
            is_exported: is_exported || is_default,
            is_default_export: is_default,
            doc_comment: None,
            calls,
        });
    }

    static RUST_FN_RE: OnceLock<Regex> = OnceLock::new();
    static RUST_STRUCT_TRAIT_RE: OnceLock<Regex> = OnceLock::new();
    static CPP_FN_RE: OnceLock<Regex> = OnceLock::new();

    let rust_fn_re = RUST_FN_RE.get_or_init(|| {
        Regex::new(r"(?m)^[ \t]*(pub(?:\([^)]*\))?\s+)?(?:async\s+)?(?:const\s+)?(?:unsafe\s+)?fn\s+([A-Za-z_]\w*)\s*(?:<[^>]*>)?\s*\(([^)]*)\)(?:\s*->\s*([^\{;]+))?").unwrap()
    });
    let rust_struct_re = RUST_STRUCT_TRAIT_RE.get_or_init(|| {
        Regex::new(r"(?m)^[ \t]*(pub(?:\([^)]*\))?\s+)?(struct|trait)\s+([A-Za-z_]\w*)").unwrap()
    });
    let cpp_fn_re = CPP_FN_RE.get_or_init(|| {
        Regex::new(r"(?m)^[ \t]*(?:template\s*<[^>]*>\s*)?(?:(?:inline|static|virtual|explicit|constexpr)\s+)*([A-Za-z_][\w:<>,\s*&~]*?)\s+([A-Za-z_~]\w*(?:::[A-Za-z_~]\w*)?)\s*\(([^)]*)\)\s*(?:const\s*)?(?:noexcept\s*)?\{").unwrap()
    });

    if file_path.ends_with(".rs") {
        for cap in rust_fn_re.captures_iter(content) {
            let start_byte = cap.get(0).unwrap().start();
            let is_exported = cap.get(1).is_some();
            let name = cap.get(2).unwrap().as_str().to_string();
            let params = cap.get(3).map(|m| m.as_str().trim()).unwrap_or("");
            let ret = cap.get(4).map(|m| m.as_str().trim()).unwrap_or("");
            if !seen_names.insert(name.clone()) {
                continue;
            }
            let line_start = content[..start_byte].bytes().filter(|&b| b == b'\n').count() + 1;
            let (line_end, body) = extract_span(line_start);
            let calls = extract_calls(&name, &body);
            let sig = if ret.is_empty() {
                format!("fn {name}({params})")
            } else {
                format!("fn {name}({params}) -> {ret}")
            };
            symbols.push(DepLenzSymbol {
                id: format!("{file_path}:{name}"),
                signature: sig,
                name,
                kind: SymbolKind::Function,
                file_path: file_path.to_string(),
                file_name: file_name.to_string(),
                line_start,
                line_end,
                body,
                is_exported,
                is_default_export: false,
                doc_comment: None,
                calls,
            });
        }
        for cap in rust_struct_re.captures_iter(content) {
            let start_byte = cap.get(0).unwrap().start();
            let is_exported = cap.get(1).is_some();
            let kind_str = cap.get(2).unwrap().as_str();
            let name = cap.get(3).unwrap().as_str().to_string();
            if !seen_names.insert(name.clone()) {
                continue;
            }
            let line_start = content[..start_byte].bytes().filter(|&b| b == b'\n').count() + 1;
            let (line_end, body) = extract_span(line_start);
            let calls = extract_calls(&name, &body);
            symbols.push(DepLenzSymbol {
                id: format!("{file_path}:{name}"),
                signature: format!("{kind_str} {name}"),
                name,
                kind: if kind_str == "trait" { SymbolKind::Trait } else { SymbolKind::Struct },
                file_path: file_path.to_string(),
                file_name: file_name.to_string(),
                line_start,
                line_end,
                body,
                is_exported,
                is_default_export: false,
                doc_comment: None,
                calls,
            });
        }
    } else if file_path.ends_with(".cpp")
        || file_path.ends_with(".cc")
        || file_path.ends_with(".cxx")
        || file_path.ends_with(".c")
        || file_path.ends_with(".h")
        || file_path.ends_with(".hpp")
    {
        for cap in cpp_fn_re.captures_iter(content) {
            let start_byte = cap.get(0).unwrap().start();
            let ret_type = cap.get(1).unwrap().as_str().trim();
            let qual_name = cap.get(2).unwrap().as_str().trim();
            let short_name = qual_name.rsplit("::").next().unwrap_or(qual_name).to_string();
            if ["if", "for", "while", "switch", "catch", "return"].contains(&short_name.as_str()) {
                continue;
            }
            if !seen_names.insert(short_name.clone()) {
                continue;
            }
            let params = cap.get(3).map(|m| m.as_str().trim()).unwrap_or("");
            let line_start = content[..start_byte].bytes().filter(|&b| b == b'\n').count() + 1;
            let (line_end, body) = extract_span(line_start);
            let calls = extract_calls(&short_name, &body);
            symbols.push(DepLenzSymbol {
                id: format!("{file_path}:{short_name}"),
                signature: format!("{ret_type} {qual_name}({params})"),
                name: short_name,
                kind: if qual_name.contains("::") { SymbolKind::Method } else { SymbolKind::Function },
                file_path: file_path.to_string(),
                file_name: file_name.to_string(),
                line_start,
                line_end,
                body,
                is_exported: true,
                is_default_export: false,
                doc_comment: None,
                calls,
            });
        }
    }

    symbols.sort_by_key(|s| s.line_start);
    symbols
}
