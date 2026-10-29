import bcrypt from "bcryptjs";

const COST = 12;
// Pre-computed hash of a random string, used to keep timing similar for unknown emails.
const DUMMY_HASH = "$2b$12$HmyGXf/XafFAnRqivhbZLOBkb4yZ7wJQI6d9hoPbhDNSwzhR/92Wq";

export const PASSWORD_MIN_LENGTH = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, COST);
}

export async function verifyPassword(password: string, hash: string | null | undefined): Promise<boolean> {
  if (!hash) {
    await bcrypt.compare(password, DUMMY_HASH);
    return false;
  }
  return bcrypt.compare(password, hash);
}

/** Returns an error code, or null when the password is acceptable. */
export function checkPasswordStrength(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) return "tooShort";
  if (password.length > 128) return "tooLong";
  const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((r) => r.test(password)).length;
  if (classes < 3) return "tooSimple";
  return null;
}
