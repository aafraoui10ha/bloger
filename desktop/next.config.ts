// Next.js config for the desktop frontend: a fully static export (no server) that
// Tauri bundles into the app. It reuses the website's tools, messages and styles
// from ../src and ../messages; nothing is duplicated.
import type { NextConfig } from "next";
import path from "node:path";

/** Official website origin (models download from here). Empty = use the verified fallback sources. */
function siteOrigin(): string {
  const raw = process.env.TOOLBOX_SITE_URL?.trim();
  if (!raw) return "";
  return new URL(raw).origin;
}

const config: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
  poweredByHeader: false,
  turbopack: { root: path.resolve(import.meta.dirname, "..") },
  env: {
    NEXT_PUBLIC_DESKTOP: "1",
    NEXT_PUBLIC_MODEL_ORIGIN: siteOrigin(),
    NEXT_PUBLIC_TOOLBOX_SITE_URL: siteOrigin(),
  },
};

export default config;
