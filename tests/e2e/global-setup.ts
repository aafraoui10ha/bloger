import { scriptDb } from "../../scripts/db";
import { hashPassword } from "../../src/lib/auth/password";
import { E2E_USERS } from "./fixtures";

/**
 * Creates/updates the test accounts used by the end-to-end suite. Refuses to
 * run against anything other than a local database.
 */
export default async function globalSetup() {
  const url = process.env.DATABASE_URL ?? "";
  if (!/@(localhost|127\.0\.0\.1)[:/]/.test(url)) throw new Error("E2E setup only runs against a local database.");
  const db = scriptDb(url);
  try {
    for (const u of Object.values(E2E_USERS)) {
      const passwordHash = await hashPassword(u.password);
      await db.user.upsert({ where: { email: u.email }, update: { passwordHash, role: u.role, isActive: true }, create: { email: u.email, name: u.name, role: u.role, passwordHash } });
    }
    await db.rateLimit.deleteMany({});
  } finally {
    await db.$disconnect();
  }
}
