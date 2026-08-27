use anyhow::{Context, Result};
use chrono::Utc;
use std::io::Read;
use std::path::Path;

use crate::db::Database;
use crate::models::{RAGChunk, RAGDocument, RAGSearchResult};
use crate::ocr_engine::OCREngine;

pub struct RAGEngine;

impl RAGEngine {
    /// Extracts plain text from various file formats (PDF, DOCX, XLSX, Images/OCR, Markdown, Text, Code)
    pub fn extract_text(path: &Path, content_bytes: Option<&[u8]>) -> Result<String> {
        let ext = path
            .extension()
            .and_then(|e| e.to_str())
            .unwrap_or("")
            .to_lowercase();

        // 1. Read bytes if not already provided
        let bytes_vec;
        let bytes = match content_bytes {
            Some(b) => b,
            None => {
                bytes_vec = std::fs::read(path)
                    .with_context(|| format!("Failed to read file at {}", path.display()))?;
                &bytes_vec
            }
        };

        // 2. Format specific text extraction
        match ext.as_str() {
            "png" | "jpg" | "jpeg" | "webp" | "bmp" => {
                // Image OCR via Windows native OCR engine
                let ocr_text = OCREngine::extract_from_bytes(bytes, &ext)
                    .with_context(|| format!("Failed to run OCR on image {}", path.display()))?;
                Ok(Self::clean_text(&ocr_text))
            }
            "pdf" => {
                let text = pdf_extract::extract_text_from_mem(bytes)
                    .with_context(|| format!("Failed to extract PDF text from {}", path.display()))?;
                Ok(Self::clean_text(&text))
            }
            "docx" => {
                Self::extract_docx(bytes)
            }
            "xlsx" | "xlsm" | "xltx" => {
                Self::extract_xlsx(bytes)
            }
            "xls" => {
                // Older binary Excel format fallback
                Self::extract_binary_strings(bytes)
            }
            _ => {
                // Plain text, Markdown, JSON, CSV, Source code (js, ts, py, rs, html, sql, log, etc.)
                let raw_str = String::from_utf8_lossy(bytes).to_string();
                Ok(Self::clean_text(&raw_str))
            }
        }
    }

    fn extract_docx(bytes: &[u8]) -> Result<String> {
        let cursor = std::io::Cursor::new(bytes);
        let mut zip = zip::ZipArchive::new(cursor)
            .with_context(|| "Failed to parse DOCX archive")?;
        
        let mut xml_content = String::new();
        // Case-insensitive lookup for word/document.xml
        for i in 0..zip.len() {
            if let Ok(mut file) = zip.by_index(i) {
                let name = file.name().to_lowercase();
                if name == "word/document.xml" || name.ends_with("/document.xml") {
                    let _ = file.read_to_string(&mut xml_content);
                    break;
                }
            }
        }
        drop(zip);

        if xml_content.is_empty() {
            return Ok(String::new());
        }

        // Extract paragraphs
        let mut paragraphs = Vec::new();
        let mut cursor = xml_content.as_str();
        while let Some(p_start) = cursor.find("<w:p") {
            let after_p = &cursor[p_start..];
            if let Some(p_end) = after_p.find("</w:p>") {
                let p_content = &after_p[..p_end];
                let p_text = Self::extract_xml_tags_content(p_content, "w:t");
                if !p_text.is_empty() {
                    paragraphs.push(p_text.join(""));
                }
                cursor = &after_p[p_end + 6..];
            } else {
                break;
            }
        }

        if paragraphs.is_empty() {
            Ok(Self::strip_xml_tags(&xml_content))
        } else {
            Ok(paragraphs.join("\n"))
        }
    }

    fn extract_xlsx(bytes: &[u8]) -> Result<String> {
        let cursor = std::io::Cursor::new(bytes);
        let mut zip = match zip::ZipArchive::new(cursor) {
            Ok(z) => z,
            Err(_) => return Self::extract_binary_strings(bytes),
        };

        // 1. Read shared strings if present
        let mut shared_strings: Vec<String> = Vec::new();
        for i in 0..zip.len() {
            if let Ok(mut file) = zip.by_index(i) {
                let name = file.name().to_lowercase();
                if name == "xl/sharedstrings.xml" || name.ends_with("/sharedstrings.xml") {
                    let mut content = String::new();
                    if file.read_to_string(&mut content).is_ok() {
                        // Extract each <si> item
                        let mut cursor = content.as_str();
                        while let Some(si_start) = cursor.find("<si") {
                            let after_si = &cursor[si_start..];
                            if let Some(si_end) = after_si.find("</si>") {
                                let si_content = &after_si[..si_end];
                                let t_texts = Self::extract_xml_tags_content(si_content, "t");
                                shared_strings.push(t_texts.join(""));
                                cursor = &after_si[si_end + 5..];
                            } else {
                                break;
                            }
                        }
                    }
                    break;
                }
            }
        }

        // 2. Read all worksheets
        let mut sheet_rows: Vec<String> = Vec::new();
        let mut worksheet_names = Vec::new();
        for i in 0..zip.len() {
            if let Ok(file) = zip.by_index(i) {
                let name = file.name().to_lowercase();
                if name.starts_with("xl/worksheets/") && name.ends_with(".xml") {
                    worksheet_names.push(file.name().to_string());
                }
            }
        }
        worksheet_names.sort();

        for sheet_name in worksheet_names {
            if let Ok(mut file) = zip.by_name(&sheet_name) {
                let mut content = String::new();
                if file.read_to_string(&mut content).is_ok() {
                    let rows = Self::parse_sheet_rows(&content, &shared_strings);
                    if !rows.is_empty() {
                        sheet_rows.extend(rows);
                    }
                }
            }
        }
        drop(zip);

        if !sheet_rows.is_empty() {
            Ok(sheet_rows.join("\n"))
        } else if !shared_strings.is_empty() {
            Ok(shared_strings.join(" | "))
        } else {
            Self::extract_binary_strings(bytes)
        }
    }

    fn parse_sheet_rows(xml: &str, shared_strings: &[String]) -> Vec<String> {
        let mut rows = Vec::new();
        let mut cursor = xml;

        while let Some(row_start) = cursor.find("<row") {
            let after_row = &cursor[row_start..];
            if let Some(row_end) = after_row.find("</row>") {
                let row_xml = &after_row[..row_end];
                let mut cell_values = Vec::new();

                // Scan cells inside row
                let mut cell_cursor = row_xml;
                while let Some(c_start) = cell_cursor.find("<c") {
                    let after_c = &cell_cursor[c_start..];
                    let c_header_end = after_c.find('>').unwrap_or(after_c.len());
                    let c_tag_header = &after_c[..c_header_end];
                    let is_shared_string = c_tag_header.contains("t=\"s\"");
                    let is_inline_str = c_tag_header.contains("t=\"inlineStr\"");

                    let cell_content = if let Some(c_end) = after_c.find("</c>") {
                        &after_c[..c_end]
                    } else if after_c.starts_with("<c") && c_header_end > 0 && after_c[c_header_end - 1..].starts_with("/>") {
                        ""
                    } else {
                        &after_c[..c_header_end]
                    };

                    if is_shared_string {
                        if let Some(v) = Self::extract_single_tag(cell_content, "v") {
                            if let Ok(idx) = v.trim().parse::<usize>() {
                                if let Some(s) = shared_strings.get(idx) {
                                    if !s.trim().is_empty() {
                                        cell_values.push(s.trim().to_string());
                                    }
                                }
                            }
                        }
                    } else if is_inline_str {
                        let t_texts = Self::extract_xml_tags_content(cell_content, "t");
                        let joined = t_texts.join("").trim().to_string();
                        if !joined.is_empty() {
                            cell_values.push(joined);
                        }
                    } else if let Some(v) = Self::extract_single_tag(cell_content, "v") {
                        let val = v.trim().to_string();
                        if !val.is_empty() {
                            cell_values.push(val);
                        }
                    }

                    let advance = if let Some(c_end) = after_c.find("</c>") {
                        c_end + 4
                    } else {
                        c_header_end.max(1)
                    };
                    cell_cursor = &after_c[advance..];
                }

                if !cell_values.is_empty() {
                    rows.push(cell_values.join(" | "));
                }

                cursor = &after_row[row_end + 6..];
            } else {
                break;
            }
        }

        rows
    }

    fn extract_xml_tags_content(xml: &str, tag_name: &str) -> Vec<String> {
        let open_tag_prefix = format!("<{}", tag_name);
        let close_tag = format!("</{}>", tag_name);
        let mut results = Vec::new();
        let mut cursor = xml;

        while let Some(start_idx) = cursor.find(&open_tag_prefix) {
            let after_open = &cursor[start_idx..];
            if let Some(tag_close_bracket) = after_open.find('>') {
                let tag_header = &after_open[..tag_close_bracket];
                // Check if self-closing
                if tag_header.ends_with('/') {
                    cursor = &after_open[tag_close_bracket + 1..];
                    continue;
                }

                let text_start = &after_open[tag_close_bracket + 1..];
                if let Some(end_idx) = text_start.find(&close_tag) {
                    let text = &text_start[..end_idx];
                    if !text.is_empty() {
                        results.push(text.to_string());
                    }
                    cursor = &text_start[end_idx + close_tag.len()..];
                } else {
                    break;
                }
            } else {
                break;
            }
        }
        results
    }

    fn extract_single_tag(xml: &str, tag_name: &str) -> Option<String> {
        let open_tag_prefix = format!("<{}", tag_name);
        let close_tag = format!("</{}>", tag_name);
        let start_idx = xml.find(&open_tag_prefix)?;
        let after_open = &xml[start_idx..];
        let tag_close_bracket = after_open.find('>')?;
        let text_start = &after_open[tag_close_bracket + 1..];
        let end_idx = text_start.find(&close_tag)?;
        Some(text_start[..end_idx].to_string())
    }

    fn extract_binary_strings(bytes: &[u8]) -> Result<String> {
        let mut text = String::new();
        let mut current = Vec::new();
        for &b in bytes {
            if b.is_ascii_graphic() || b == b' ' {
                current.push(b);
            } else {
                if current.len() >= 4 {
                    if let Ok(s) = std::str::from_utf8(&current) {
                        text.push_str(s);
                        text.push(' ');
                    }
                }
                current.clear();
            }
        }
        if current.len() >= 4 {
            if let Ok(s) = std::str::from_utf8(&current) {
                text.push_str(s);
            }
        }
        Ok(Self::clean_text(&text))
    }

    fn clean_text(input: &str) -> String {
        input
            .replace('\r', "")
            .lines()
            .map(|l| l.trim())
            .filter(|l| !l.is_empty())
            .collect::<Vec<_>>()
            .join("\n")
    }

    fn strip_xml_tags(xml: &str) -> String {
        let mut result = String::with_capacity(xml.len() / 2);
        let mut in_tag = false;
        let mut last_was_space = false;

        for c in xml.chars() {
            if c == '<' {
                in_tag = true;
            } else if c == '>' {
                in_tag = false;
                if !last_was_space {
                    result.push(' ');
                    last_was_space = true;
                }
            } else if !in_tag {
                if c.is_whitespace() {
                    if !last_was_space {
                        result.push(' ');
                        last_was_space = true;
                    }
                } else {
                    result.push(c);
                    last_was_space = false;
                }
            }
        }
        Self::clean_text(&result)
    }

    /// Splits text into coherent chunks with overlap
    pub fn chunk_text(text: &str, target_chunk_len: usize, overlap_len: usize) -> Vec<String> {
        let paragraphs: Vec<&str> = text.split("\n\n").collect();
        let mut chunks = Vec::new();
        let mut current_chunk = String::new();

        for para in paragraphs {
            let para_clean = para.trim();
            if para_clean.is_empty() {
                continue;
            }

            if current_chunk.len() + para_clean.len() > target_chunk_len && !current_chunk.is_empty() {
                chunks.push(current_chunk.clone());

                // Keep overlap from end of current chunk
                let overlap_start = if current_chunk.len() > overlap_len {
                    current_chunk.len() - overlap_len
                } else {
                    0
                };
                current_chunk = current_chunk[overlap_start..].to_string();
                if !current_chunk.ends_with('\n') {
                    current_chunk.push('\n');
                }
            }

            if !current_chunk.is_empty() && !current_chunk.ends_with('\n') {
                current_chunk.push('\n');
            }
            current_chunk.push_str(para_clean);
        }

        if !current_chunk.trim().is_empty() {
            chunks.push(current_chunk);
        }

        // If no double newline chunks were created (e.g. single giant text), chunk by sentences
        if chunks.is_empty() && !text.trim().is_empty() {
            let lines: Vec<&str> = text.lines().collect();
            let mut chunk = String::new();
            for line in lines {
                if chunk.len() + line.len() > target_chunk_len && !chunk.is_empty() {
                    chunks.push(chunk.clone());
                    chunk.clear();
                }
                chunk.push_str(line);
                chunk.push('\n');
            }
            if !chunk.trim().is_empty() {
                chunks.push(chunk);
            }
        }

        if chunks.is_empty() && !text.trim().is_empty() {
            chunks.push(text.trim().to_string());
        }

        chunks
    }

    /// Indexes a document and stores chunks in SQLite & FTS5
    pub fn index_document(
        db: &Database,
        file_path_str: &str,
        file_bytes: Option<Vec<u8>>,
    ) -> Result<RAGDocument> {
        let path = Path::new(file_path_str);
        let filename = path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("document")
            .to_string();
        let ext = path
            .extension()
            .and_then(|e| e.to_str())
            .unwrap_or("txt")
            .to_lowercase();

        let raw_text = Self::extract_text(path, file_bytes.as_deref())?;
        if raw_text.trim().is_empty() {
            anyhow::bail!("Document is empty or no text could be extracted");
        }

        let chunk_strings = Self::chunk_text(&raw_text, 1200, 150);
        let doc_id = uuid::Uuid::new_v4().to_string();
        let size_bytes = file_bytes
            .as_ref()
            .map(|b| b.len() as i64)
            .unwrap_or_else(|| std::fs::metadata(path).map(|m| m.len() as i64).unwrap_or(0));

        let doc = RAGDocument {
            id: doc_id.clone(),
            filename: filename.clone(),
            filepath: file_path_str.to_string(),
            file_type: ext,
            size_bytes,
            chunk_count: chunk_strings.len(),
            created_at: Utc::now(),
        };

        let mut chunks = Vec::with_capacity(chunk_strings.len());
        for (i, content) in chunk_strings.into_iter().enumerate() {
            chunks.push(RAGChunk {
                id: uuid::Uuid::new_v4().to_string(),
                document_id: doc_id.clone(),
                chunk_index: i + 1,
                content,
                metadata: format!("Source: {} (Extrait #{})", filename, i + 1),
            });
        }

        db.save_rag_document_with_chunks(&doc, &chunks)?;
        Ok(doc)
    }

    /// Formats top search results into an LLM context snippet
    pub fn format_context_snippet(results: &[RAGSearchResult]) -> String {
        if results.is_empty() {
            return String::new();
        }

        let mut snippet = String::from("\n\n<retrieved_documents>\n");

        for (i, res) in results.iter().enumerate() {
            snippet.push_str(&format!(
                "  <document id=\"{}\" file=\"{}\" chunk=\"{}\">\n{}\n  </document>\n",
                i + 1,
                res.document_name,
                res.chunk_index,
                res.content.trim()
            ));
        }

        snippet.push_str(
            "</retrieved_documents>\n\
            <document_grounding_instructions>\n\
            • Answer the user's inquiry directly and concisely based on <retrieved_documents>.\n\
            • Attribute document sources using brackets (e.g., [document_name]) after specific claims.\n\
            • If the answer cannot be found in the documents, state it clearly.\n\
            </document_grounding_instructions>\n\n"
        );
        snippet
    }
}
