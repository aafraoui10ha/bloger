export const MAX_IMAGE_BYTES = 25 * 1024 * 1024;
export const MAX_IMAGE_PIXELS = 50_000_000; // ~ 8660 x 5770; protects low-memory devices
export const MAX_OUTPUT_DIMENSION = 10_000;

export type DetectedFormat = "png" | "jpeg" | "gif" | "webp" | "bmp" | "avif" | "heic" | "tiff" | "ico" | "svg" | "unknown";

export const FORMAT_MIME: Record<Exclude<DetectedFormat, "unknown">, string> = {
  png: "image/png",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  bmp: "image/bmp",
  avif: "image/avif",
  heic: "image/heic",
  tiff: "image/tiff",
  ico: "image/x-icon",
  svg: "image/svg+xml",
};

export const EXTENSION_FOR_MIME: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

/** Detects the real image format from the file's first bytes (magic numbers). */
export function detectFormat(bytes: Uint8Array): DetectedFormat {
  const b = bytes;
  const at = (i: number) => b[i] ?? -1;
  const ascii = (start: number, len: number) => String.fromCharCode(...b.subarray(start, start + len));
  if (at(0) === 0x89 && ascii(1, 3) === "PNG") return "png";
  if (at(0) === 0xff && at(1) === 0xd8 && at(2) === 0xff) return "jpeg";
  if (ascii(0, 4) === "GIF8") return "gif";
  if (ascii(0, 4) === "RIFF" && ascii(8, 4) === "WEBP") return "webp";
  if (ascii(0, 2) === "BM") return "bmp";
  if ((at(0) === 0x49 && at(1) === 0x49 && at(2) === 0x2a) || (at(0) === 0x4d && at(1) === 0x4d && at(3) === 0x2a)) return "tiff";
  if (at(0) === 0 && at(1) === 0 && at(2) === 1 && at(3) === 0) return "ico";
  if (ascii(4, 4) === "ftyp") {
    const brand = ascii(8, 4);
    if (brand === "avif" || brand === "avis") return "avif";
    if (["heic", "heix", "hevc", "mif1", "msf1"].includes(brand)) return "heic";
  }
  const head = new TextDecoder().decode(b.subarray(0, 512)).trimStart().toLowerCase();
  if (head.startsWith("<svg") || (head.startsWith("<?xml") && head.includes("<svg"))) return "svg";
  return "unknown";
}

/** Reads pixel dimensions from PNG, GIF, JPEG and WebP headers without decoding. */
export function readDimensions(bytes: Uint8Array, format: DetectedFormat): { width: number; height: number } | null {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  try {
    if (format === "png" && bytes.length >= 24) return { width: v.getUint32(16), height: v.getUint32(20) };
    if (format === "gif" && bytes.length >= 10) return { width: v.getUint16(6, true), height: v.getUint16(8, true) };
    if (format === "webp" && bytes.length >= 30) {
      const chunk = String.fromCharCode(...bytes.subarray(12, 16));
      if (chunk === "VP8X") return { width: 1 + (v.getUint32(24, true) & 0xffffff), height: 1 + (v.getUint32(27, true) & 0xffffff) };
      if (chunk === "VP8 ") return { width: v.getUint16(26, true) & 0x3fff, height: v.getUint16(28, true) & 0x3fff };
      if (chunk === "VP8L") {
        const bits = v.getUint32(21, true);
        return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
      }
    }
    if (format === "jpeg") {
      let i = 2;
      while (i + 9 < bytes.length) {
        if (bytes[i] !== 0xff) return null;
        const marker = bytes[i + 1]!;
        const len = v.getUint16(i + 2);
        // SOF0–SOF15 except DHT (C4), JPG (C8), DAC (CC)
        if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
          return { width: v.getUint16(i + 7), height: v.getUint16(i + 5) };
        }
        i += 2 + len;
      }
    }
  } catch {
    return null;
  }
  return null;
}

export type ImageValidationError = "noFile" | "tooLarge" | "unsupportedType" | "mismatch" | "empty";

/**
 * Validates an uploaded file before decoding: size, declared MIME type,
 * extension and real (sniffed) format must all be acceptable.
 */
export function validateImageInput(
  file: { name: string; type: string; size: number },
  sniffed: DetectedFormat,
  accepted: DetectedFormat[],
  maxBytes = MAX_IMAGE_BYTES,
): ImageValidationError | null {
  if (file.size === 0) return "empty";
  if (file.size > maxBytes) return "tooLarge";
  if (!accepted.includes(sniffed)) return "unsupportedType";
  const declared = file.type.toLowerCase();
  if (declared && declared.startsWith("image/") && sniffed !== "unknown") {
    const expected = FORMAT_MIME[sniffed as Exclude<DetectedFormat, "unknown">];
    const aliases: Record<string, string[]> = { "image/jpeg": ["image/jpg", "image/pjpeg"], "image/x-icon": ["image/vnd.microsoft.icon"] };
    if (declared !== expected && !(aliases[expected] ?? []).includes(declared)) return "mismatch";
  }
  return null;
}

export type FitOptions = { width?: number | null; height?: number | null; keepAspect: boolean };

/** Computes output dimensions, preserving aspect ratio when requested. */
export function fitDimensions(srcW: number, srcH: number, opts: FitOptions): { width: number; height: number } | null {
  const w = opts.width && opts.width > 0 ? Math.round(opts.width) : null;
  const h = opts.height && opts.height > 0 ? Math.round(opts.height) : null;
  let out: { width: number; height: number };
  if (!w && !h) out = { width: srcW, height: srcH };
  else if (opts.keepAspect) {
    const ratio = srcW / srcH;
    if (w && h) {
      // Fit inside the box.
      const scale = Math.min(w / srcW, h / srcH);
      out = { width: Math.round(srcW * scale), height: Math.round(srcH * scale) };
    } else if (w) out = { width: w, height: Math.round(w / ratio) };
    else out = { width: Math.round(h! * ratio), height: h! };
  } else out = { width: w ?? srcW, height: h ?? srcH };
  out = { width: Math.max(1, out.width), height: Math.max(1, out.height) };
  if (out.width > MAX_OUTPUT_DIMENSION || out.height > MAX_OUTPUT_DIMENSION) return null;
  return out;
}

export function compressionStats(originalBytes: number, outputBytes: number): { savedBytes: number; percent: number } {
  if (originalBytes <= 0) return { savedBytes: 0, percent: 0 };
  const saved = originalBytes - outputBytes;
  return { savedBytes: saved, percent: Math.round((saved / originalBytes) * 1000) / 10 };
}

/** Builds a download name whose extension always matches the real output MIME type. */
export function outputFilename(originalName: string, mime: string, suffix = ""): string {
  const ext = EXTENSION_FOR_MIME[mime] ?? "bin";
  const base = (originalName.replace(/\.[^./\\]+$/, "") || "image").replace(/[^\p{L}\p{N}._ -]+/gu, "_").slice(0, 80);
  return `${base}${suffix}.${ext}`;
}

export function formatBytes(bytes: number, locale = "en"): string {
  const units = ["B", "KB", "MB", "GB"];
  let v = Math.abs(bytes);
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  const sign = bytes < 0 ? "-" : "";
  return `${sign}${new Intl.NumberFormat(locale, { maximumFractionDigits: i === 0 ? 0 : 1 }).format(v)} ${units[i]}`;
}
