/**
 * Account recovery for when no administrator can sign in. Requires server/database access.
 *
 *   npm run admin:reset-password -- --email you@example.com
 *
 * Signs the user out everywhere and re-activates the account.
 */
import { scriptDb } from "./db";
import { arg, readPassword } from "./cli";
import { checkPasswordStrength, hashPassword } from "../src/lib/auth/password";

async function main() {
  const email = arg("email")?.trim().toLowerCase();
  if (!email) {
    console.error("Usage: npm run admin:reset-password -- --email you@example.com");
    process.exit(1);
  }
  const db = scriptDb();
  try {
    const user = await db.user.findUnique({ where: { email } });
    if (!user) {
      console.error("No user with this email.");
      process.exit(1);
    }
    const password = await readPassword("New password: ");
    const weak = checkPasswordStrength(password);
    if (weak) {
      console.error(`Password rejected (${weak}).`);
      process.exit(1);
    }
    await db.$transaction([
      db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(password), isActive: true } }),
      db.session.deleteMany({ where: { userId: user.id } }),
      db.passwordResetToken.deleteMany({ where: { userId: user.id } }),
      db.auditLog.create({ data: { action: "user.passwordResetByCli", entityType: "User", entityId: user.id } }),
    ]);
    console.log(`Password updated for ${email}. All sessions were signed out.`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
