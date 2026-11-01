import "server-only";

// Current Toolbox Desktop release shown on /desktop. Until release management moves to
// the database (Phase 4), it is configured with server environment variables, so no
// domain or file is hard-coded. A download is only offered when its URL, SHA-256 and
// size are all present and valid; otherwise the page shows "coming soon".

export type DesktopInstaller = { format: "exe" | "msi"; url: string; sha256: string; size: number };
export type DesktopRelease = { version: string; date: string | null; channel: "stable" | "beta"; installers: DesktopInstaller[] };

const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const SHA256 = /^[0-9a-f]{64}$/;

/** https URLs, or same-site paths such as /downloads/desktop/windows/x64/Toolbox-Setup-1.0.0.exe. */
export function safeDownloadUrl(value: string | undefined, format: "exe" | "msi"): string | null {
  const v = value?.trim();
  if (!v) return null;
  let path: string;
  if (v.startsWith("/") && !v.startsWith("//")) path = v;
  else {
    try {
      const u = new URL(v);
      if (u.protocol !== "https:") return null;
      path = u.pathname;
    } catch {
      return null;
    }
  }
  return path.toLowerCase().endsWith(`.${format}`) ? v : null;
}

function installer(env: NodeJS.ProcessEnv, format: "exe" | "msi"): DesktopInstaller | null {
  const prefix = format === "exe" ? "DESKTOP_EXE" : "DESKTOP_MSI";
  const url = safeDownloadUrl(env[`${prefix}_URL`], format);
  const sha256 = env[`${prefix}_SHA256`]?.trim().toLowerCase() ?? "";
  const size = Number(env[`${prefix}_SIZE`]);
  if (!url || !SHA256.test(sha256) || !Number.isSafeInteger(size) || size <= 0) return null;
  return { format, url, sha256, size };
}

export function getDesktopRelease(env: NodeJS.ProcessEnv = process.env): DesktopRelease | null {
  const version = env.DESKTOP_RELEASE_VERSION?.trim() ?? "";
  if (!SEMVER.test(version)) return null;
  const installers = [installer(env, "exe"), installer(env, "msi")].filter((x): x is DesktopInstaller => !!x);
  if (!installers.length) return null;
  const date = env.DESKTOP_RELEASE_DATE?.trim() ?? "";
  return {
    version,
    date: /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(date)) ? date : null,
    channel: env.DESKTOP_RELEASE_CHANNEL === "beta" ? "beta" : "stable",
    installers,
  };
}
