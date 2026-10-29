import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { db } from "@/lib/db";

/**
 * Fixed-window rate limiter backed by the database so it works across serverless
 * instances. Returns true when the request is allowed.
 */
export async function rateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const k = key.length > 255 ? `h:${createHash("sha256").update(key).digest("hex")}` : key;
  // MySQL evaluates ON DUPLICATE KEY assignments left to right, so `count` is
  // computed from the old `windowStart`. Both statements share one transaction,
  // so the SELECT reads this request's own increment.
  const [, rows] = await db.$transaction([
    db.$executeRaw`
      INSERT INTO RateLimit (\`key\`, \`count\`, windowStart)
      VALUES (${k}, 1, NOW(3))
      ON DUPLICATE KEY UPDATE
        \`count\` = IF(windowStart < NOW(3) - INTERVAL ${windowSeconds} SECOND, 1, \`count\` + 1),
        windowStart = IF(windowStart < NOW(3) - INTERVAL ${windowSeconds} SECOND, NOW(3), windowStart)`,
    db.$queryRaw<{ count: number }[]>`SELECT \`count\` FROM RateLimit WHERE \`key\` = ${k}`,
  ]);
  return Number(rows[0]?.count ?? 0) <= limit;
}

export async function clearRateLimit(key: string): Promise<void> {
  await db.rateLimit.deleteMany({ where: { key } });
}

/** Best-effort client IP (trusted only as far as the hosting proxy sets it). */
export async function clientIp(): Promise<string> {
  const h = await headers();
  return (h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown").slice(0, 64);
}
