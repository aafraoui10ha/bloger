"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession, destroySession, getCurrentUser, revokeAllSessions } from "@/lib/auth/session";
import { checkPasswordStrength, hashPassword, verifyPassword } from "@/lib/auth/password";
import { hashToken } from "@/lib/auth/tokens";
import { clearRateLimit, clientIp, rateLimit } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";
import { safeInternalPath } from "@/lib/urls";
import { runAction, str, type ActionState } from "@/admin/server";
import type { AdminKey } from "@/admin/i18n";

const loginSchema = z.object({ email: z.email().max(254), password: z.string().min(1).max(200) });

export async function loginAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse({ email: str(fd, "email").toLowerCase(), password: fd.get("password") });
  if (!parsed.success) return { error: "auth.invalid" };
  const { email, password } = parsed.data;
  const ip = await clientIp();

  // Throttle per email+IP and per IP to slow down credential stuffing.
  const okPair = await rateLimit(`login:${email}:${ip}`, 5, 900);
  const okIp = await rateLimit(`login-ip:${ip}`, 30, 900);
  if (!okPair || !okIp) return { error: "auth.rateLimited" };

  const user = await db.user.findUnique({ where: { email } });
  const valid = await verifyPassword(password, user?.passwordHash);
  if (!user || !valid || !user.isActive) {
    await audit(user?.id ?? null, "auth.loginFailed", "User", user?.id ?? null, { email });
    return { error: "auth.invalid" };
  }

  await clearRateLimit(`login:${email}:${ip}`);
  await createSession(user.id);
  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await audit(user.id, "auth.login", "User", user.id);
  redirect(safeInternalPath(str(fd, "next"), "/admin"));
}

export async function logoutAction(): Promise<void> {
  const user = await getCurrentUser();
  await destroySession();
  if (user) await audit(user.id, "auth.logout", "User", user.id);
  redirect("/admin/login");
}

export async function resetPasswordAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async (): Promise<ActionState> => {
    const token = str(fd, "token");
    const password = String(fd.get("password") ?? "");
    const confirm = String(fd.get("confirm") ?? "");
    const ip = await clientIp();
    if (!(await rateLimit(`reset:${ip}`, 10, 900))) return { error: "auth.rateLimited" };

    const record = token ? await db.passwordResetToken.findUnique({ where: { tokenHash: hashToken(token) } }) : null;
    if (!record || record.usedAt || record.expiresAt < new Date()) return { error: "auth.resetInvalid" };
    if (password !== confirm) return { fieldErrors: { confirm: "auth.mismatch" }, error: "c.validation" };
    const weak = checkPasswordStrength(password);
    if (weak) return { fieldErrors: { password: `auth.pw.${weak}` as AdminKey }, error: "c.validation" };

    await db.$transaction([
      db.user.update({ where: { id: record.userId }, data: { passwordHash: await hashPassword(password) } }),
      db.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
      db.passwordResetToken.deleteMany({ where: { userId: record.userId, usedAt: null, id: { not: record.id } } }),
    ]);
    await revokeAllSessions(record.userId);
    await audit(record.userId, "auth.passwordReset", "User", record.userId);
    return { ok: true, message: "auth.resetDone" };
  });
}
