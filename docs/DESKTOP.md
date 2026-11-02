# Toolbox Desktop

Toolbox Desktop is a Tauri 2 app for Windows 10/11 x64. It runs the website's tools locally. There is no account, and the tools need no server.

> **Status: Phase 2 (development builds). The installed program is `%LOCALAPPDATA%ToolboxToolbox.exe` (NSIS) and the app identifier is `com.toolbox.desktop`.**
> - Installers are built by GitHub Actions and are **unsigned**.
> - Automatic updates, the download center and release management come in later phases.
> - Do not distribute these builds as production releases.

## Architecture

```
src/tools/, messages/, src/app/globals.css   shared with the website (not duplicated)
desktop/          Next.js app built as a static export (output: "export") → desktop/out
  app/            routes: /, /tools/, /tools/<category>/, /tool/<key>/, /favorites/, /projects/, /settings/, /about/
  src/shell/      sidebar, settings/favourites/recents stores, native bridge (save dialog, links, app info)
  src/generated/  catalog.json: tool titles and descriptions generated from prisma/seed-data
src-tauri/        Rust shell: window, navigation guard, native save command, app info, single instance
scripts/desktop/  prepare.mjs (config from environment), catalog.ts, version.mjs, serve-out.mjs
```

- **Why a separate static frontend?** The website renders its pages on the server from MySQL, so it cannot be exported as static files. The tools are client-side React components, so the desktop app imports them from `src/tools` and renders them in its own static shell.
- **Website-only features** stay on the website: articles, admin, contact form and SEO pages.
- **No account.** The app has no login, registration or user data in version 1.0.0.
- **Local data.** Designs, uploads, favourites and settings are kept in the app's WebView2 profile (IndexedDB and localStorage). This profile is at `%LOCALAPPDATA%\com.toolbox.desktop\EBWebView`. It survives restarts and upgrades.

### Background remover

The app uses the same SHA-256-verified loader as the website. The model files (about 173 MB) are **not** in the installer. On first use, the app downloads them from the official website (`TOOLBOX_SITE_URL` + `/models/background-removal/<version>/`) and checks each file. It then stores them in the versioned Cache API store, so later launches don't download them again.

The runtime's two small glue scripts (`ort-wasm-simd-threaded*.mjs`, about 77 KB) are imported by URL, so the app ships them in `desktop/public/ort/`. `prepare.mjs` copies them and stops the build if their SHA-256 doesn't match the manifest. Because of this the remover also works offline after the first download; previously, a cached runtime tried to import the script from a folder the app doesn't contain.

If the website is not configured or not reachable, the app uses the verified Hugging Face / jsDelivr sources. The website sends `Access-Control-Allow-Origin: *` on `/models/*` so the app can fetch these public files.

Without WebGPU, the remover uses the lighter portrait model on the CPU, as on the website.

## Configuration (no hard-coded domain)

Set these in the environment, or as GitHub repository **variables** (Settings → Secrets and variables → Actions → Variables):

| Variable | Used for | Required |
|---|---|---|
| `TOOLBOX_SITE_URL` | Model downloads; "Visit website" link; added to the app's CSP | No (fallback sources are used) |
| `TOOLBOX_DOWNLOAD_BASE_URL` | Installer downloads (Phase 4) | No |
| `TOOLBOX_UPDATE_ENDPOINT` | Tauri updater (Phase 5) | No |

`scripts/desktop/prepare.mjs` checks the values (https only, except `localhost`). It then writes `src-tauri/tauri.generated.conf.json`, which is gitignored and merged with `tauri build --config`.

## Commands

| Command | What it does | Needs Rust? |
|---|---|---|
| `npm run desktop:frontend` | Builds the static frontend into `desktop/out` | No |
| `npm run desktop:frontend:dev` | Frontend dev server on http://localhost:3010 (no native features) | No |
| `npx playwright test -c playwright.desktop.config.ts` | Browser tests of `desktop/out` under the app's CSP | No |
| `npm run desktop:version -- check` | Checks that `package.json`, `Cargo.toml` and `Cargo.lock` agree | No |
| `npm run desktop:version -- bump patch` | Bumps the version: `major`, `minor` or `patch` | No |
| `npm run desktop:dev` | Runs the app with hot reload | Yes |
| `npm run desktop:build` | Builds the MSI and NSIS installers | Yes |

On Windows PowerShell 5.1, `npm run x -- arg` drops the arguments. Use `node scripts/desktop/version.mjs bump patch` instead.

## Building installers (GitHub Actions)

Builds run on GitHub's Windows runners. Nothing has to be installed on a developer PC.

1. Push to a branch named `desktop/...` (for example `desktop/phase-2`), or run **Actions → Desktop (Windows) → Run workflow**.
2. The workflow then does the following, in order:
   - checks the version and the tool catalog
   - runs type checks, lint and unit tests
   - builds the static frontend
   - runs the Rust tests and the desktop frontend browser tests
   - builds the installers with `tauri build`
3. Download the artifact `toolbox-desktop-<version>-windows-x64-build-<n>` from the run page. It contains:
   - `Toolbox_<version>_x64-setup.exe` (NSIS)
   - `Toolbox_<version>_x64_en-US.msi` (MSI)
   - `SHA256SUMS.txt`
4. The run also uploads `Cargo.lock`. Commit it to `src-tauri/` so later builds use the same Rust dependencies.

See [DESKTOP_INSTALLATION.md](DESKTOP_INSTALLATION.md) to install and test the build.

### Building locally (optional)

Local builds need these, which together take about 12–15 GB:
- Rust (stable, MSVC)
- Visual Studio 2022 Build Tools with the "Desktop development with C++" workload
- the Windows 10/11 SDK

Then run `npm ci` and `npm run desktop:build`. The installers are written to `src-tauri/target/release/bundle/`.

## Versioning

`package.json` `version` is the single source of truth (semantic versioning, `MAJOR.MINOR.PATCH`):
- `tauri.conf.json` reads it directly (`"version": "../package.json"`).
- `npm run desktop:version` keeps `Cargo.toml` and `Cargo.lock` in step.
- CI fails if they disagree.

The About screen shows the version, the build id (`date.run.commit`), the channel, the release date, the platform and the Tauri version.

## Offering a build on the website (/desktop)

The page `/[locale]/desktop` shows download buttons only for an installer whose address, SHA-256 and size are all set (`DESKTOP_*` variables). Otherwise it says "coming soon".

**On a server you run yourself (local or VPS):**

```bash
# folder = the extracted CI artifact (installers + SHA256SUMS.txt)
node scripts/desktop/publish-local.mjs "C:\path\to\toolbox-desktop-1.0.1-windows-x64-build-N"
# then restart the Next.js server (or rebuild for production)
```

The script does three things:
- It verifies each installer against `SHA256SUMS.txt`.
- It copies the installers to `public/downloads/desktop/windows/x64/`, which is gitignored, so installers are never committed.
- It writes the matching `DESKTOP_*` settings to `.env.local`, which is also gitignored. `.env` is not touched.

Files under `/downloads/` are served with `Content-Disposition: attachment` and support byte-range requests.

**On Vercel:** the filesystem there is not persistent, so upload the installers to Cloudflare R2 and set the same variables in the Vercel project, using the `https://` R2 URLs. Phase 4 moves this to admin-managed release records.
