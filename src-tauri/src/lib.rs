//! Toolbox Desktop: a Tauri 2 shell around the statically exported Toolbox tools.
//! Every tool runs locally in the webview. The Rust side only provides what a
//! browser cannot do safely on its own: native save dialogs, app information,
//! single-instance focus and keeping the window on the local app.

mod commands;

use tauri::Manager;

pub fn run() {
    tauri::Builder::default()
        // Must be registered first: a second launch focuses the running window instead.
        .plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.unminimize();
                let _ = window.show();
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(commands::navigation::guard())
        .invoke_handler(tauri::generate_handler![commands::files::save_file, commands::info::app_info])
        .run(tauri::generate_context!())
        .expect("error while running Toolbox");
}
