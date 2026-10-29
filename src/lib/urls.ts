/** Validates links entered by administrators. Only http(s), mailto and internal paths. */
export function isSafeHref(href: string): boolean {
  const value = href.trim();
  if (!value) return false;
  if (value.startsWith("/")) return !value.startsWith("//") && !/[\s\\]/.test(value);
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" || url.protocol === "mailto:";
  } catch {
    return false;
  }
}

/** Only allows same-site relative redirect targets (prevents open redirects). */
export function safeInternalPath(path: string | null | undefined, fallback = "/admin"): string {
  if (!path || !path.startsWith("/") || path.startsWith("//") || path.includes("\\")) return fallback;
  return path;
}

/** Validates an absolute canonical override; must be https and without a fragment. */
export function isValidCanonical(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && !u.hash;
  } catch {
    return false;
  }
}

/** Decodes a route param that may or may not still be percent-encoded. */
export function decodeParam(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/** Normalizes a redirect source path: leading slash, no trailing slash, no query. */
export function normalizePath(path: string): string {
  let p = path.trim().split(/[?#]/)[0] ?? "";
  if (!p.startsWith("/")) p = `/${p}`;
  if (p.length > 1) p = p.replace(/\/+$/, "");
  try {
    p = decodeURI(p);
  } catch {
    // keep as-is
  }
  return p;
}
