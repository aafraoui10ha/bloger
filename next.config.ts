import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const isDev = process.env.NODE_ENV !== "production";

// Google domains are listed so AdSense / Analytics work once the owner enables
// them; nothing from these hosts loads until consent and configuration allow it.
const google = [
  "https://pagead2.googlesyndication.com",
  "https://*.googlesyndication.com",
  "https://*.doubleclick.net",
  "https://*.google.com",
  "https://*.gstatic.com",
  "https://www.googletagmanager.com",
  "https://*.google-analytics.com",
  "https://*.adtrafficquality.google",
  "https://fundingchoicesmessages.google.com",
].join(" ");

// Background remover: model files and ONNX runtime are served from this site
// (/models/background-removal/<version>/); jsDelivr and Hugging Face are the
// verified fallback sources. Images never leave the browser.
const aiRuntime = "https://cdn.jsdelivr.net";
const aiModels = "https://huggingface.co https://*.huggingface.co https://*.hf.co";

const csp = [
  "default-src 'self'",
  // Next.js hydration needs inline scripts; see SECURITY.md for the nonce trade-off.
  `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' ${isDev ? "'unsafe-eval'" : ""} ${google} ${aiRuntime}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self' ${google} ${aiRuntime} ${aiModels} ${isDev ? "ws:" : ""}`,
  `frame-src ${google}`,
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...((process.env.NEXT_PUBLIC_SITE_URL ?? "").startsWith("https:") ? ["upgrade-insecure-requests"] : []),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp.replace(/\s{2,}/g, " ") },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  ...(isDev ? [] : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]),
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  output: "standalone",
  
  turbopack: { root: import.meta.dirname },
  reactStrictMode: true,
 experimental: {
  cpus: 1,
  serverActions: { bodySizeLimit: "6mb" },
},
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/admin/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }, { key: "Cache-Control", value: "no-store" }] },
      { source: "/api/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex" }] },
      // Versioned, hash-verified model files never change at a given URL.
      {
        source: "/models/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
          // Public, hash-verified files: the desktop app downloads them from this site.
          { key: "Cross-Origin-Resource-Policy", value: "cross-origin" },
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "X-Robots-Tag", value: "noindex" },
        ],
      },
      { source: "/models/:path(.*\\.(?:onnx|part\\d+))", headers: [{ key: "Content-Type", value: "application/octet-stream" }] },
      // Desktop installers published on this server (scripts/desktop/publish-local.mjs): always download, never render.
      {
        source: "/downloads/:path*",
        headers: [
          { key: "Content-Disposition", value: "attachment" },
          { key: "Cache-Control", value: "public, max-age=3600" },
          { key: "X-Robots-Tag", value: "noindex" },
        ],
      },
      // Chart Designer fonts (OFL, committed): cache for a week, revalidate in the background.
      { source: "/fonts/designer/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=86400" }] },
    ];
  },
};

export default withNextIntl(nextConfig);
