# Toolbox Desktop security

## What the webview may do

There is one capability, `src-tauri/capabilities/default.json`, and it applies only to the local `main` window. It grants:

- `core:default`: basic window and event APIs.
- `opener:default`: open `http(s)`, `mailto` and `tel` links in the default browser or mail client.
- `allow-save-file` and `allow-app-info`: the app's only two commands. They are declared in `build.rs` through `AppManifest`, so nothing else is callable.

**Not granted:** filesystem plugin, shell, HTTP plugin, process spawning, or any remote-URL capability. Remote pages can never call commands.

## Commands

- **`save_file`**
  - Receives the bytes as a raw IPC body plus a suggested name.
  - Shows the **native** save dialog and writes only to the path the user picks. The webview never supplies a path.
  - The name is cleaned: directories are removed, as are Windows-forbidden characters, control characters and reserved device names (`CON`, `COM1`…). It is limited to 120 characters.
  - Files are limited to 1 GB.
  - Rust unit tests cover these rules.
- **`app_info`** returns version and build metadata only.

## Navigation

A navigation guard (`commands/navigation.rs`) keeps the window on the app's own pages, `https://tauri.localhost`. Any other `http(s)` or `mailto` URL opens in the default browser, and everything else (`file:`, `data:`, `blob:`, custom schemes) is blocked. The frontend also routes external links through the opener.

## Content-Security-Policy

```
default-src 'self'; script-src 'self' 'wasm-unsafe-eval' https://cdn.jsdelivr.net [site];
connect-src 'self' ipc: http://ipc.localhost https://ipc.localhost blob: data: [model hosts] [site];
style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; object-src 'none'; frame-src 'none'; form-action 'none'
```

- **IPC channel:** `ipc:` and `https://ipc.localhost` are Tauri's channel between the page and the Rust side. The app uses the https form because the window runs on `https://tauri.localhost` (`useHttpsScheme`). `http://ipc.localhost` stays as Tauri's fallback channel. Only these exact hosts are listed, with no wildcard, and they are reachable only from the app's own pages.
- **Inline scripts:** Tauri adds hashes for the inline scripts it serves, so `'unsafe-inline'` is **not** allowed for scripts.
- **Styles:** they keep `'unsafe-inline'` (`dangerousDisableAssetCspModification: ["style-src"]`), because the tools use inline style attributes. Scripts are unaffected.
- **`'wasm-unsafe-eval'`** is required for the ONNX Runtime (WebAssembly).
- **Testing:** the desktop frontend tests run the exported app behind this policy, with the same inline-script hashes, and fail on any violation.

## Data and network

- No account, credentials, tokens or analytics.
- User files are processed in the webview and saved only where the user chooses.
- The only network traffic is the one-time, SHA-256-verified model download, plus links the user opens.

## Secrets

The app contains no secrets. Updater signing keys (Phase 5) and a code-signing certificate will live only in protected GitHub Actions secrets, never in the repository or the app.
