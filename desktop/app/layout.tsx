import type { Metadata, Viewport } from "next";
import { Inter, Noto_Sans_Arabic } from "next/font/google";
import { DesktopShell } from "@desktop/shell/DesktopShell";
import { settingsInitScript } from "@desktop/shell/store";
import "./desktop.css";

const latin = Inter({ subsets: ["latin", "latin-ext"], variable: "--font-latin", display: "swap" });
const arabic = Noto_Sans_Arabic({ subsets: ["arabic"], variable: "--font-arabic", display: "swap", weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = { title: "Toolbox", applicationName: "Toolbox" };
export const viewport: Viewport = { themeColor: "#290044" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr" className={`${latin.variable} ${arabic.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: settingsInitScript }} />
      </head>
      <body>
        <DesktopShell>{children}</DesktopShell>
      </body>
    </html>
  );
}
