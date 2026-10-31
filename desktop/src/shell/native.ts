"use client";

// Bridges to the Tauri shell. Everything degrades gracefully when the frontend runs
// in a normal browser (e.g. `npm run desktop:frontend:dev`).

export type AppInfo = {
  name: string;
  version: string;
  buildId: string;
  channel: string;
  releaseDate: string;
  profile: string;
  platform: string;
  arch: string;
  tauriVersion: string;
};

export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

/** Shows the native "Save as" dialog and writes the file. Returns the saved path, or null if cancelled. */
export async function saveFile(blob: Blob, fileName: string): Promise<string | null> {
  const { invoke } = await import("@tauri-apps/api/core");
  const bytes = new Uint8Array(await blob.arrayBuffer());
  return invoke<string | null>("save_file", bytes, { headers: { "x-file-name": encodeURIComponent(fileName) } });
}

export async function openExternal(url: string): Promise<void> {
  if (!/^(https?:|mailto:)/i.test(url)) return;
  if (!isTauri()) {
    window.open(url, "_blank", "noopener,noreferrer");
    return;
  }
  const { openUrl } = await import("@tauri-apps/plugin-opener");
  await openUrl(url);
}

export async function appInfo(): Promise<AppInfo | null> {
  if (!isTauri()) return null;
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<AppInfo>("app_info");
}

export type SaveResult = { ok: true; path: string } | { ok: false; error: string } | { ok: "cancelled" };

/**
 * The tools offer results through <a download href="blob:…"> links (also created
 * programmatically). In the app, those clicks open the native save dialog instead,
 * and links to websites open in the default browser. Returns a cleanup function.
 */
export function installNativeLinks(onSave: (r: SaveResult) => void): () => void {
  const onClick = (e: MouseEvent) => {
    const a = (e.target as Element | null)?.closest?.("a") as HTMLAnchorElement | null;
    if (!a?.href) return;
    if (a.hasAttribute("download") && /^(blob:|data:)/.test(a.href)) {
      e.preventDefault();
      const name = a.getAttribute("download") || "download";
      const href = a.href;
      void (async () => {
        try {
          const blob = await (await fetch(href)).blob();
          const path = await saveFile(blob, name);
          onSave(path ? { ok: true, path } : { ok: "cancelled" });
        } catch (err) {
          onSave({ ok: false, error: err instanceof Error ? err.message : String(err) });
        }
      })();
      return;
    }
    const url = new URL(a.href, window.location.href);
    if (/^(https?:|mailto:)$/.test(url.protocol) && url.origin !== window.location.origin) {
      e.preventDefault();
      void openExternal(url.href);
    }
  };
  document.addEventListener("click", onClick, true);
  return () => document.removeEventListener("click", onClick, true);
}
