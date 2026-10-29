import { NextResponse, type NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";
import { SESSION_COOKIE } from "@/lib/auth/cookie";

const intl = createMiddleware(routing);

const PUBLIC_ADMIN_PATHS = ["/admin/login", "/admin/reset-password"];

export default function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    // Cheap pre-check only; every admin page and action re-validates the session server-side.
    const isPublic = PUBLIC_ADMIN_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
    if (!isPublic && !request.cookies.has(SESSION_COOKIE)) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      url.search = `?next=${encodeURIComponent(pathname + search)}`;
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  return intl(request);
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|media|sitemap.xml|robots.txt|ads.txt|favicon.ico|icon.svg|.*\\..*).*)"],
};
