import { getDesktopRelease } from "@/lib/desktop-release";

// Latest published Toolbox Desktop release, read by the desktop app to tell users a new
// version is available (and later by the Tauri updater). Public data only; no tracking.
//   GET /api/desktop/releases/latest?platform=windows-x86_64&channel=stable

const PLATFORMS = new Set(["windows-x86_64"]);
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, OPTIONS" };

function json(body: unknown, status: number, cache = "public, max-age=300") {
  return Response.json(body, { status, headers: { ...CORS, "Cache-Control": cache } });
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

export function GET(request: Request) {
  const url = new URL(request.url);
  const platform = url.searchParams.get("platform") ?? "windows-x86_64";
  const channel = url.searchParams.get("channel") ?? "stable";
  if (!PLATFORMS.has(platform)) return json({ error: "unsupported_platform", platform }, 400, "no-store");
  if (channel !== "stable" && channel !== "beta") return json({ error: "unsupported_channel", channel }, 400, "no-store");

  const release = getDesktopRelease();
  // A stable client is never offered a beta; a beta client also accepts stable releases.
  if (!release || (channel === "stable" && release.channel !== "stable")) return json({ error: "no_release" }, 404);

  const absolute = (href: string) => new URL(href, url.origin).href;
  return json(
    {
      version: release.version,
      channel: release.channel,
      date: release.date,
      platform,
      page: absolute("/desktop"),
      installers: release.installers.map((i) => ({ format: i.format, url: absolute(i.url), sha256: i.sha256, size: i.size })),
    },
    200,
  );
}
