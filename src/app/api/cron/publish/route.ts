import { timingSafeEqual } from "node:crypto";
import { revalidatePath } from "next/cache";
import { publishDueArticles } from "@/lib/publishing";

export const dynamic = "force-dynamic";

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 16) return false;
  const header = req.headers.get("authorization") ?? "";
  const expected = Buffer.from(`Bearer ${secret}`);
  const got = Buffer.from(header);
  return got.length === expected.length && timingSafeEqual(got, expected);
}

/** Scheduled publishing endpoint (Vercel Cron sends `Authorization: Bearer $CRON_SECRET`). */
export async function GET(req: Request) {
  if (!authorized(req)) return new Response("Unauthorized", { status: 401 });
  const count = await publishDueArticles();
  if (count > 0) revalidatePath("/", "layout");
  return Response.json({ published: count, ranAt: new Date().toISOString() });
}
