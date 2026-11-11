fn main() {
    // Declare the app's own commands so capabilities can grant them explicitly
    // (least privilege: nothing is callable from the webview unless listed).
    tauri_build::try_build(
        tauri_build::Attributes::new()
            .app_manifest(tauri_build::AppManifest::new().commands(&["save_file", "app_info"])),
    )
    .expect("failed to run tauri-build");
}
