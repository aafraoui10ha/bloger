/**
 * Creates a dashboard account. There is no default administrator: run this once
 * after deployment to create the first super administrator.
 *
 *   npm run admin:create -- --email you@example.com --name "Your Name" [--role SUPER_ADMIN]
 *
 * The password is prompted without echo, or read from ADMIN_PASSWORD for CI.
 */
import { scriptDb } from "./db";
import { arg, readPassword } from "./cli";
import { checkPasswordStrength, hashPassword } from "../src/lib/auth/password";

const ROLES = ["SUPER_ADMIN", "ADMIN", "EDITOR", "AUTHOR"] as const;

async function main() {
  const email = arg("email")?.trim().toLowerCase();
  const name = arg("name")?.trim();
  const role = (arg("role") ?? "SUPER_ADMIN").toUpperCase() as (typeof ROLES)[number];
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !name) {
    console.error('Usage: npm run admin:create -- --email you@example.com --name "Your Name" [--role SUPER_ADMIN|ADMIN|EDITOR|AUTHOR]');
    process.exit(1);
  }
  if (!ROLES.includes(role)) {
    console.error(`Invalid role. Use one of: ${ROLES.join(", ")}`);
    process.exit(1);
  }
  const db = scriptDb();
  try {
    if (await db.user.findUnique({ where: { email } })) {
      console.error("A user with this email already exists. Use npm run admin:reset-password to change the password.");
      process.exit(1);
    }
    const password = await readPassword("Password (min 12 chars, 3 of: lower, upper, digit, symbol): ");
    const weak = checkPasswordStrength(password);
    if (weak) {
      console.error(`Password rejected (${weak}).`);
      process.exit(1);
    }
    const user = await db.user.create({ data: { email, name, role, passwordHash: await hashPassword(password) } });
    await db.auditLog.create({ data: { action: "user.createdByCli", entityType: "User", entityId: user.id, details: { email, role } } });
    console.log(`Created ${role} account for ${email}. Sign in at /admin/login.`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
