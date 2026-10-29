import "server-only";
import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { getCurrentUser, requirePagePermission, requireUser, type SessionUser } from "@/lib/auth/session";
import { AuthorizationError, type Permission } from "@/lib/auth/permissions";
import { adminT, type AdminKey, type AdminT } from "./i18n";

export type ActionState = {
  ok?: boolean;
  /** Translation key for a success message. */
  message?: AdminKey;
  /** Translation key for a form-level error. */
  error?: AdminKey;
  /** Field name → translation key. */
  fieldErrors?: Record<string, AdminKey>;
  /** Extra non-sensitive values to show (e.g. a one-time link, counts). */
  data?: Record<string, string>;
};

/** Expected, user-facing failure with a translatable message. */
export class ActionError extends Error {
  constructor(
    public code: AdminKey,
    public fieldErrors?: Record<string, AdminKey>,
  ) {
    super(code);
  }
}

/** Wraps a server action: maps auth/validation failures to safe, translatable states. */
export async function runAction(fn: () => Promise<ActionState | void>): Promise<ActionState> {
  try {
    return (await fn()) ?? { ok: true, message: "c.saved" };
  } catch (e) {
    unstable_rethrow(e);
    if (e instanceof AuthorizationError) return { error: "c.forbidden" };
    if (e instanceof ActionError) return { error: e.code, fieldErrors: e.fieldErrors };
    // Log only the message: never request bodies, content or secrets.
    console.error("[admin action]", e instanceof Error ? e.message : "unknown error");
    return { error: "c.unexpectedError" };
  }
}

export async function adminContext(permission?: Permission): Promise<{ user: SessionUser; t: AdminT }> {
  const user = permission ? await requirePagePermission(permission) : await requireUser();
  return { user, t: adminT(user.locale) };
}

export async function optionalAdminT(): Promise<AdminT> {
  const user = await getCurrentUser();
  return adminT(user?.locale ?? "en");
}

/** Purges cached public pages after content changes. */
export function revalidatePublic(): void {
  revalidatePath("/", "layout");
}

export function str(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
}

export function bool(fd: FormData, key: string): boolean {
  const v = fd.get(key);
  return v === "on" || v === "true" || v === "1";
}

export function optional(fd: FormData, key: string): string | null {
  const v = str(fd, key);
  return v ? v : null;
}
