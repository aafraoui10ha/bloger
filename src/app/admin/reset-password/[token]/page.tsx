import type { Metadata } from "next";
import { optionalAdminT } from "@/admin/server";
import { ResetForm } from "./ResetForm";

export const metadata: Metadata = { title: "Reset password", referrer: "no-referrer" };

export default async function ResetPasswordPage({ params }: { params: Promise<{ token: string }> }) {
  const [{ token }, t] = await Promise.all([params, optionalAdminT()]);
  return (
    <main className="grid min-h-screen place-items-center bg-bg px-4">
      <div className="card w-full max-w-sm p-6">
        <h1 className="text-xl font-bold">{t("auth.resetTitle")}</h1>
        <ResetForm token={token} />
      </div>
    </main>
  );
}
