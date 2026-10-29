import "server-only";
import { randomBytes } from "node:crypto";
import { AwsClient } from "aws4fetch";
import { detectFormat, readDimensions, FORMAT_MIME, type DetectedFormat } from "@/tools/logic/image";

export const MEDIA_MAX_BYTES = 5 * 1024 * 1024;
/** SVG is deliberately excluded: it can carry scripts. */
export const MEDIA_ALLOWED: DetectedFormat[] = ["png", "jpeg", "webp", "gif", "avif"];

export type MediaValidation =
  | { ok: true; mimeType: string; ext: string; width: number | null; height: number | null }
  | { ok: false; error: "empty" | "tooLarge" | "unsupportedType" | "mismatch" };

/** Validates uploads by size and real content (magic bytes), never by the client's claims alone. */
export function validateMediaUpload(bytes: Uint8Array, declaredType: string): MediaValidation {
  if (bytes.length === 0) return { ok: false, error: "empty" };
  if (bytes.length > MEDIA_MAX_BYTES) return { ok: false, error: "tooLarge" };
  const format = detectFormat(bytes);
  if (!MEDIA_ALLOWED.includes(format)) return { ok: false, error: "unsupportedType" };
  const mimeType = FORMAT_MIME[format as Exclude<DetectedFormat, "unknown">];
  const declared = declaredType.toLowerCase().replace("image/jpg", "image/jpeg");
  if (declared && declared !== mimeType) return { ok: false, error: "mismatch" };
  const dims = readDimensions(bytes, format);
  return { ok: true, mimeType, ext: format === "jpeg" ? "jpg" : format, width: dims?.width ?? null, height: dims?.height ?? null };
}

export function storageDriver(): "DATABASE" | "S3" {
  return process.env.MEDIA_STORAGE === "s3" ? "S3" : "DATABASE";
}

function s3() {
  const { S3_BUCKET, S3_ENDPOINT, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_REGION } = process.env;
  if (!S3_BUCKET || !S3_ENDPOINT || !S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY) throw new Error("S3 storage is not configured");
  const client = new AwsClient({ accessKeyId: S3_ACCESS_KEY_ID, secretAccessKey: S3_SECRET_ACCESS_KEY, region: S3_REGION || "auto", service: "s3" });
  const base = `${S3_ENDPOINT.replace(/\/+$/, "")}/${S3_BUCKET}`;
  return { client, base };
}

export function newStorageKey(ext: string): string {
  const d = new Date();
  return `media/${d.getUTCFullYear()}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${randomBytes(12).toString("hex")}.${ext}`;
}

/** Stores bytes; returns the column values for MediaAsset. */
export async function putMedia(bytes: Uint8Array, mimeType: string, key: string): Promise<{ storage: "DATABASE" | "S3"; data: Uint8Array<ArrayBuffer> | null }> {
  if (storageDriver() === "DATABASE") return { storage: "DATABASE", data: new Uint8Array(bytes) };
  const { client, base } = s3();
  const res = await client.fetch(`${base}/${key}`, {
    method: "PUT",
    body: new Uint8Array(bytes),
    headers: { "Content-Type": mimeType, "Cache-Control": "public, max-age=31536000, immutable" },
  });
  if (!res.ok) throw new Error(`S3 upload failed with status ${res.status}`);
  return { storage: "S3", data: null };
}

export async function deleteMedia(storage: "DATABASE" | "S3", key: string): Promise<void> {
  if (storage === "DATABASE") return;
  const { client, base } = s3();
  const res = await client.fetch(`${base}/${key}`, { method: "DELETE" });
  if (!res.ok && res.status !== 404) throw new Error(`S3 delete failed with status ${res.status}`);
}

export function publicMediaUrl(key: string): string | null {
  const base = process.env.S3_PUBLIC_BASE_URL;
  return base ? `${base.replace(/\/+$/, "")}/${key}` : null;
}
