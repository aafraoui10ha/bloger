export type RoleName = "SUPER_ADMIN" | "ADMIN" | "EDITOR" | "AUTHOR";

const ALL: RoleName[] = ["SUPER_ADMIN", "ADMIN", "EDITOR", "AUTHOR"];
const STAFF: RoleName[] = ["SUPER_ADMIN", "ADMIN", "EDITOR"];
const ADMINS: RoleName[] = ["SUPER_ADMIN", "ADMIN"];

export const PERMISSIONS = {
  "dashboard.view": ALL,
  "article.create": ALL,
  "article.editOwn": ALL,
  "article.editAny": STAFF,
  "article.submitReview": ALL,
  "article.publish": STAFF,
  "article.delete": ADMINS,
  "category.manage": STAFF,
  "tag.manage": STAFF,
  "tool.manage": ADMINS,
  "page.manage": ADMINS,
  "media.upload": ALL,
  "media.delete": STAFF,
  "navigation.manage": ADMINS,
  "user.manage": ADMINS,
  "settings.manage": ADMINS,
  "ads.manage": ADMINS,
  "consent.manage": ADMINS,
  "analytics.manage": ADMINS,
  "audit.view": ADMINS,
  "seo.view": STAFF,
  "redirect.manage": STAFF,
} as const satisfies Record<string, RoleName[]>;

export type Permission = keyof typeof PERMISSIONS;

export function can(role: RoleName | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  return (PERMISSIONS[permission] as readonly RoleName[]).includes(role);
}

/** Who may assign which role. Administrators cannot create peers or super administrators. */
export function canAssignRole(actor: RoleName, target: RoleName): boolean {
  if (actor === "SUPER_ADMIN") return true;
  if (actor === "ADMIN") return target === "EDITOR" || target === "AUTHOR";
  return false;
}

/** Whether an actor may modify an existing user account holding `targetRole`. */
export function canManageUser(actor: RoleName, targetRole: RoleName): boolean {
  if (actor === "SUPER_ADMIN") return true;
  if (actor === "ADMIN") return targetRole === "EDITOR" || targetRole === "AUTHOR";
  return false;
}

/** Article edit rule: staff may edit anything; authors only their own non-published drafts. */
export function canEditArticle(
  user: { id: string; role: RoleName },
  article: { authorId: string; status: string },
): boolean {
  if (can(user.role, "article.editAny")) return true;
  return article.authorId === user.id && (article.status === "DRAFT" || article.status === "IN_REVIEW");
}

export class AuthorizationError extends Error {
  constructor(message = "Forbidden") {
    super(message);
    this.name = "AuthorizationError";
  }
}
