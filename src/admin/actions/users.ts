"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/auth/cookie";
import { z } from "zod";
import { db } from "@/lib/db";
import { authorize, getCurrentUser, revokeAllSessions } from "@/lib/auth/session";
import { canAssignRole, canManageUser } from "@/lib/auth/permissions";
import { checkPasswordStrength, hashPassword, verifyPassword } from "@/lib/auth/password";
import { generateToken, hashToken } from "@/lib/auth/tokens";
import { rateLimit } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";
import { siteUrl } from "@/lib/env";
import { ActionError, optional, runAction, str, type ActionState } from "@/admin/server";
import type { AdminKey } from "@/admin/i18n";

const ROLES = ["SUPER_ADMIN", "ADMIN", "EDITOR", "AUTHOR"] as const;

async function issueResetLink(userId: string): Promise<string> {
  const token = generateToken();
  await db.passwordResetToken.create({ data: { userId, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 24 * 3600_000) } });
  return `${siteUrl()}/admin/reset-password/${token}`;
}

async function activeSuperAdmins(excludeId?: string) {
  return db.user.count({ where: { role: "SUPER_ADMIN", isActive: true, ...(excludeId ? { NOT: { id: excludeId } } : {}) } });
}

export async function createUserAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const actor = await authorize("user.manage");
    const email = str(fd, "email").toLowerCase();
    const name = str(fd, "name").slice(0, 100);
    const role = z.enum(ROLES).parse(str(fd, "role"));
    const fieldErrors: Record<string, AdminKey> = {};
    if (!z.email().safeParse(email).success) fieldErrors.email = "c.validation";
    if (!name) fieldErrors.name = "c.validation";
    if (!canAssignRole(actor.role, role)) fieldErrors.role = "c.forbidden";
    if (await db.user.findUnique({ where: { email } })) fieldErrors.email = "usr.emailTaken";
    if (Object.keys(fieldErrors).length) throw new ActionError("c.validation", fieldErrors);

    // Unusable random password until the person sets their own through the one-time link.
    const user = await db.user.create({ data: { email, name, role, passwordHash: await hashPassword(generateToken(48)) } });
    const link = await issueResetLink(user.id);
    await audit(actor.id, "user.created", "User", user.id, { email, role });
    revalidatePath("/admin/users");
    return { ok: true, message: "c.saved", data: { link } };
  });
}

export async function updateUserAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const actor = await authorize("user.manage");
    const id = str(fd, "id");
    const target = await db.user.findUnique({ where: { id } });
    if (!target) throw new ActionError("c.noResults");
    if (!canManageUser(actor.role, target.role)) throw new ActionError("c.forbidden");
    const role = z.enum(ROLES).parse(str(fd, "role"));
    const isActive = str(fd, "isActive") === "true";
    if (id === actor.id && (role !== target.role || !isActive)) throw new ActionError("usr.self");
    if (role !== target.role && !canAssignRole(actor.role, role)) throw new ActionError("c.forbidden");
    if (target.role === "SUPER_ADMIN" && (role !== "SUPER_ADMIN" || !isActive) && (await activeSuperAdmins(id)) === 0) throw new ActionError("usr.lastSuperAdmin");

    await db.user.update({ where: { id }, data: { role, isActive, name: str(fd, "name").slice(0, 100) || target.name } });
    if (!isActive || role !== target.role) await revokeAllSessions(id);
    await audit(actor.id, "user.updated", "User", id, { fromRole: target.role, toRole: role, isActive });
    revalidatePath("/admin/users");
  });
}

export async function resetLinkAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const actor = await authorize("user.manage");
    const id = str(fd, "id");
    const target = await db.user.findUnique({ where: { id } });
    if (!target) throw new ActionError("c.noResults");
    if (!canManageUser(actor.role, target.role)) throw new ActionError("c.forbidden");
    const link = await issueResetLink(id);
    await audit(actor.id, "user.resetLinkIssued", "User", id);
    return { ok: true, data: { link } };
  });
}

export async function revokeSessionsAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const actor = await authorize("user.manage");
    const id = str(fd, "id");
    const target = await db.user.findUnique({ where: { id } });
    if (!target || !canManageUser(actor.role, target.role)) throw new ActionError("c.forbidden");
    await revokeAllSessions(id);
    await audit(actor.id, "user.sessionsRevoked", "User", id);
  });
}

// ---------------------------------------------------------------------------
// Own account
// ---------------------------------------------------------------------------
export async function updateProfileAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const user = await authorize("dashboard.view");
    const name = str(fd, "name").slice(0, 100);
    if (!name) throw new ActionError("c.validation", { name: "c.validation" });
    await db.user.update({ where: { id: user.id }, data: { name, locale: z.enum(["en", "fr", "ar"]).parse(str(fd, "locale")), bio: optional(fd, "bio")?.slice(0, 500) ?? null } });
    await audit(user.id, "account.profileUpdated", "User", user.id);
    revalidatePath("/admin", "layout");
  });
}

export async function changePasswordAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const session = await getCurrentUser();
    if (!session) throw new ActionError("c.forbidden");
    if (!(await rateLimit(`pwchange:${session.id}`, 5, 900))) return { error: "auth.rateLimited" };
    const user = await db.user.findUniqueOrThrow({ where: { id: session.id } });
    const current = String(fd.get("current") ?? "");
    const next = String(fd.get("password") ?? "");
    if (!(await verifyPassword(current, user.passwordHash))) throw new ActionError("acc.wrongPassword", { current: "acc.wrongPassword" });
    if (next !== String(fd.get("confirm") ?? "")) throw new ActionError("c.validation", { confirm: "auth.mismatch" });
    const weak = checkPasswordStrength(next);
    if (weak) throw new ActionError("c.validation", { password: `auth.pw.${weak}` as AdminKey });
    await db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(next) } });
    // Sign out other sessions, keep this one.
    const currentToken = (await cookies()).get(SESSION_COOKIE)?.value;
    await db.session.deleteMany({ where: { userId: user.id, ...(currentToken ? { NOT: { tokenHash: hashToken(currentToken) } } : {}) } });
    await audit(user.id, "account.passwordChanged", "User", user.id);
    return { ok: true, message: "acc.passwordChanged" };
  });
}

