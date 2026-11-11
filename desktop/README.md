# desktop/

This folder holds the static frontend for **Toolbox Desktop** (Tauri 2). It reuses the website's tools from `../src/tools` and its messages from `../messages`.

- Build: `npm run desktop:frontend` writes `desktop/out`, which Tauri bundles from `../src-tauri`.
- Docs:
  - [../docs/DESKTOP.md](../docs/DESKTOP.md): architecture, commands, CI.
  - [../docs/DESKTOP_INSTALLATION.md](../docs/DESKTOP_INSTALLATION.md): installing a build.
  - [../docs/DESKTOP_SECURITY.md](../docs/DESKTOP_SECURITY.md): permissions, CSP, data.
