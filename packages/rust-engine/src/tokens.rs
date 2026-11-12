//! SIMD-accelerated line counting, token estimation across all 6 Analyzer formats,
//! and optional parallel filesystem walking (`ignore` crate).

use crate::types::{RustFileInput, TokenEstimateByStyle};
use memchr::memchr_iter;

/// SIMD byte-scan line counter (`memchr`). Matches `text.split('\n').length`.
#[inline]
pub fn count_lines(text: &str) -> usize {
    if text.is_empty() {
        return 0;
    }
    memchr_iter(b'\n', text.as_bytes()).count() + 1
}

/// Estimates token count from character count using the 3.8 chars/token heuristic.
#[inline]
pub fn estimate_tokens_from_chars(char_count: usize) -> usize {
    if char_count == 0 {
        0
    } else {
        ((char_count as f64) / 3.8).ceil() as usize
    }
}

/// Computes token estimates for all 6 AnalyzerStyle export formats in a single
/// O(N) pass without allocating combined multi-megabyte strings.
pub fn estimate_combined_tokens_by_style(
    files: &[RustFileInput],
    include_toc: bool,
    include_line_numbers: bool,
) -> TokenEstimateByStyle {
    if files.is_empty() {
        return TokenEstimateByStyle {
            standard: 0,
            compact: 0,
            markdown: 0,
            xml: 0,
            jsonl: 0,
            json: 0,
        };
    }

    let mut total_body_chars: usize = 0;
    let mut total_line_num_chars: usize = 0;
    let mut total_path_chars: usize = 0;

    for f in files {
        let content = f.text_content.as_deref().unwrap_or("");
        let lines = count_lines(content);
        total_body_chars += content.len();
        if include_line_numbers && lines > 0 {
            let digits = (lines as f64).log10().floor() as usize + 1;
            let width = digits.max(3) + 3; // "  1 | "
            total_line_num_chars += lines * width;
        }
        total_path_chars += f.relative_path.len() + f.name.len();
    }

    let n = files.len();
    let effective_body = total_body_chars + total_line_num_chars;
    let toc_chars = if include_toc {
        160 + n * 48 + total_path_chars / 2
    } else {
        0
    };

    let standard_chars = 360 + toc_chars + effective_body + n * 340 + total_path_chars * 2;
    let compact_chars = effective_body + n * 28 + total_path_chars;
    let markdown_chars = 180 + toc_chars + effective_body + n * 165 + total_path_chars * 2;
    let xml_chars = 120 + effective_body + n * 145 + total_path_chars * 2;
    let jsonl_chars = (effective_body as f64 * 1.06) as usize + n * 120 + total_path_chars * 2;
    let json_chars = 180 + (effective_body as f64 * 1.06) as usize + n * 155 + total_path_chars * 2;

    TokenEstimateByStyle {
        standard: estimate_tokens_from_chars(standard_chars),
        compact: estimate_tokens_from_chars(compact_chars),
        markdown: estimate_tokens_from_chars(markdown_chars),
        xml: estimate_tokens_from_chars(xml_chars),
        jsonl: estimate_tokens_from_chars(jsonl_chars),
        json: estimate_tokens_from_chars(json_chars),
    }
}
