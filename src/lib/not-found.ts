import "server-only";
import { notFound, permanentRedirect, redirect } from "next/navigation";
import { findRedirect } from "@/lib/content";
import { normalizePath } from "@/lib/urls";

/** Follows a stored redirect for this path if one exists, otherwise renders the 404 page. */
export async function redirectOrNotFound(path: string): Promise<never> {
  const r = await findRedirect(normalizePath(path));
  if (r) {
    const target = r.toPath.startsWith("/") || /^https?:\/\//.test(r.toPath) ? r.toPath : `/${r.toPath}`;
    if (r.permanent) permanentRedirect(encodeURI(target));
    redirect(encodeURI(target));
  }
  notFound();
}
