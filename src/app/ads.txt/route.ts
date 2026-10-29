import { db } from "@/lib/db";

export const revalidate = 300;

/**
 * Serves the owner-supplied ads.txt. Returns 404 until the owner pastes the
 * exact record from their AdSense account — nothing is ever generated here.
 */
export async function GET() {
  const s = await db.adSettings.findUnique({ where: { id: "default" }, select: { adsTxt: true } });
  const body = s?.adsTxt?.trim();
  if (!body) return new Response("Not found", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  return new Response(`${body}\n`, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=300" } });
}
