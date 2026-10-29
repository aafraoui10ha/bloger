import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getSiteSettings } from "@/lib/content";
import { optionalAdminT } from "@/admin/server";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (await getCurrentUser()) redirect("/admin");
  const [{ next }, t, { siteName }] = await Promise.all([searchParams, optionalAdminT(), getSiteSettings()]);
  return (
    <main className="grid min-h-screen place-items-center bg-bg px-4">
      <div className="card w-full max-w-sm p-6">
        <p className="text-sm font-semibold text-accent">{siteName}</p>
        <h1 className="mt-1 text-xl font-bold">{t("auth.title")}</h1>
        <LoginForm next={next ?? ""} />
        <p className="mt-6 text-xs text-muted">{t("auth.forgot")}</p>
      </div>
    </main>
  );
}
