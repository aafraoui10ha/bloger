//! Native "Save as" for files produced by the tools.
//!
//! The webview sends the file bytes (raw IPC body, not JSON) and a suggested
//! name. Rust shows the system save dialog and writes only to the path the user
//! picked, so the webview never chooses or learns arbitrary filesystem paths.

use percent_encoding::percent_decode_str;
use tauri::ipc::{InvokeBody, Request};
use tauri_plugin_dialog::DialogExt;

/// Largest file the app will write in one go (tool outputs are far smaller).
const MAX_BYTES: usize = 1024 * 1024 * 1024;
const MAX_NAME_CHARS: usize = 120;
const RESERVED: [&str; 22] = [
    "CON", "PRN", "AUX", "NUL", "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7", "COM8", "COM9", "LPT1", "LPT2", "LPT3", "LPT4", "LPT5",
    "LPT6", "LPT7", "LPT8", "LPT9",
];

/// A safe file name: no directories, no characters Windows forbids, no reserved device names.
pub fn sanitize_file_name(input: &str) -> String {
    let last = input.rsplit(['/', '\\']).next().unwrap_or("");
    let cleaned: String = last
        .chars()
        .filter(|c| !c.is_control() && !matches!(c, '<' | '>' | ':' | '"' | '|' | '?' | '*'))
        .collect();
    let trimmed = cleaned.trim().trim_matches('.').trim();
    let mut name: String = trimmed.chars().take(MAX_NAME_CHARS).collect();
    if name.is_empty() {
        name = "download".to_string();
    }
    let stem = name.split('.').next().unwrap_or("").to_ascii_uppercase();
    if RESERVED.contains(&stem.as_str()) {
        name = format!("_{name}");
    }
    name
}

/// Lower-case extension of a file name, if it has a short alphanumeric one.
pub fn extension(name: &str) -> Option<String> {
    let (_, ext) = name.rsplit_once('.')?;
    if ext.is_empty() || ext.len() > 8 || !ext.chars().all(|c| c.is_ascii_alphanumeric()) {
        return None;
    }
    Some(ext.to_ascii_lowercase())
}

#[tauri::command]
pub async fn save_file(app: tauri::AppHandle, request: Request<'_>) -> Result<Option<String>, String> {
    let InvokeBody::Raw(data) = request.body() else {
        return Err("Expected file data".into());
    };
    if data.is_empty() {
        return Err("There is nothing to save".into());
    }
    if data.len() > MAX_BYTES {
        return Err("The file is too large to save".into());
    }
    let suggested = request
        .headers()
        .get("x-file-name")
        .and_then(|v| v.to_str().ok())
        .map(|v| percent_decode_str(v).decode_utf8_lossy().into_owned())
        .unwrap_or_default();
    let name = sanitize_file_name(&suggested);

    let mut dialog = app.dialog().file().set_file_name(&name);
    if let Some(ext) = extension(&name) {
        dialog = dialog.add_filter(ext.to_ascii_uppercase(), &[ext.as_str()]);
    }
    let Some(chosen) = dialog.blocking_save_file() else {
        return Ok(None); // cancelled
    };
    let path = chosen.into_path().map_err(|e| e.to_string())?;
    std::fs::write(&path, data).map_err(|e| format!("Could not save the file: {e}"))?;
    Ok(Some(path.display().to_string()))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn strips_directories_and_forbidden_characters() {
        assert_eq!(sanitize_file_name("..\\..\\Windows\\evil.exe"), "evil.exe");
        assert_eq!(sanitize_file_name("../etc/passwd"), "passwd");
        assert_eq!(sanitize_file_name("a<b>c:d\"e|f?g*h.png"), "abcdefgh.png");
        assert_eq!(sanitize_file_name("   .hidden.  "), "hidden");
        assert_eq!(sanitize_file_name(""), "download");
        assert_eq!(sanitize_file_name("tab\u{0009}name.svg"), "tabname.svg");
    }

    #[test]
    fn keeps_unicode_names_and_guards_reserved_names() {
        assert_eq!(sanitize_file_name("لوحة-الأداء.pdf"), "لوحة-الأداء.pdf");
        assert_eq!(sanitize_file_name("Été 2025.jpg"), "Été 2025.jpg");
        assert_eq!(sanitize_file_name("CON.txt"), "_CON.txt");
        assert_eq!(sanitize_file_name("com1"), "_com1");
        assert_eq!(sanitize_file_name(&"x".repeat(300)).chars().count(), MAX_NAME_CHARS);
    }

    #[test]
    fn reads_simple_extensions_only() {
        assert_eq!(extension("chart.PNG").as_deref(), Some("png"));
        assert_eq!(extension("pattern-dots.css").as_deref(), Some("css"));
        assert_eq!(extension("noext"), None);
        assert_eq!(extension("weird.ex e"), None);
    }
}
