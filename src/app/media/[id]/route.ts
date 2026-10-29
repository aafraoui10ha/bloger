import { db } from "@/lib/db";
import { publicMediaUrl } from "@/lib/media/storage";

/** Serves media library files. Database-stored files stream from the database; S3 files redirect. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-z0-9]{20,32}$/.test(id)) return new Response("Not found", { status: 404 });
  const asset = await db.mediaAsset.findUnique({ where: { id }, select: { storage: true, storageKey: true, mimeType: true, data: true } });
  if (!asset) return new Response("Not found", { status: 404 });

  if (asset.storage === "S3") {
    const url = publicMediaUrl(asset.storageKey);
    if (!url) return new Response("Not found", { status: 404 });
    return Response.redirect(url, 302);
  }
  if (!asset.data) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(asset.data), {
    headers: {
      "Content-Type": asset.mimeType,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
    },
  });
}
