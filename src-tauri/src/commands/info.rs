//! Version and build information for Settings → About Toolbox.

use serde::Serialize;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppInfo {
    name: String,
    version: String,
    /// Set by CI (TOOLBOX_BUILD_ID at compile time); "local" otherwise.
    build_id: String,
    channel: String,
    release_date: String,
    profile: String,
    platform: String,
    arch: String,
    tauri_version: String,
}

#[tauri::command]
pub fn app_info(app: tauri::AppHandle) -> AppInfo {
    let pkg = app.package_info();
    AppInfo {
        name: pkg.name.clone(),
        version: pkg.version.to_string(),
        build_id: option_env!("TOOLBOX_BUILD_ID").unwrap_or("local").to_string(),
        channel: option_env!("TOOLBOX_CHANNEL").unwrap_or("stable").to_string(),
        release_date: option_env!("TOOLBOX_RELEASE_DATE").unwrap_or("").to_string(),
        profile: if cfg!(debug_assertions) { "development" } else { "production" }.to_string(),
        platform: std::env::consts::OS.to_string(),
        arch: std::env::consts::ARCH.to_string(),
        tauri_version: tauri::VERSION.to_string(),
    }
}
