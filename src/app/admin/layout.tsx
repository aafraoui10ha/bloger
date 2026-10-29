import type { Metadata } from "next";
import { Inter, Noto_Sans_Arabic } from "next/font/google";
import { getCurrentUser } from "@/lib/auth/session";
import { en } from "@/admin/i18n/en";
import { fr } from "@/admin/i18n/fr";
import { ar } from "@/admin/i18n/ar";
import { AdminI18nProvider } from "@/admin/components/client";
import { themeInitScript } from "@/components/site/ThemeToggle";
import "../globals.css";

const latin = Inter({ subsets: ["latin", "latin-ext"], variable: "--font-latin", display: "swap" });
const arabic = Noto_Sans_Arabic({ subsets: ["arabic"], variable: "--font-arabic", display: "swap", weight: ["400", "600", "700"] });

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "Dashboard", template: "%s · Dashboard" },
  robots: { index: false, follow: false, nocache: true },
};

export default async function AdminRootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const locale = user?.locale ?? "en";
  const dict = { en, fr, ar }[locale];
  return (
    <html lang={locale} dir={locale === "ar" ? "rtl" : "ltr"} className={`${latin.variable} ${arabic.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-screen antialiased">
        <AdminI18nProvider dict={dict}>{children}</AdminI18nProvider>
      </body>
    </html>
  );
}
