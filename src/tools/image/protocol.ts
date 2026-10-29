import { fitDimensions, MAX_IMAGE_PIXELS, type FitOptions } from "@/tools/logic/image";

export type ImageJob = {
  id: number;
  file: Blob;
  mime: "image/jpeg" | "image/png" | "image/webp";
  quality: number;
  fit: FitOptions;
  /** Fill color for transparent pixels (needed for JPEG output). */
  background: string | null;
};

export type ImageJobResult =
  | { id: number; ok: true; blob: Blob; width: number; height: number; srcWidth: number; srcHeight: number }
  | { id: number; ok: false; error: "decodeFailed" | "encodeUnsupported" | "tooManyPixels" | "dimensions" | "generic" };

type Canvas2D = OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D;

/** Shared processing core for the worker and the main-thread fallback. */
export async function runImageJob(
  job: ImageJob,
  makeCanvas: (w: number, h: number) => { ctx: Canvas2D | null; toBlob: (type: string, quality: number) => Promise<Blob | null> },
): Promise<ImageJobResult> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(job.file);
  } catch {
    return { id: job.id, ok: false, error: "decodeFailed" };
  }
  try {
    const srcWidth = bitmap.width;
    const srcHeight = bitmap.height;
    if (srcWidth * srcHeight > MAX_IMAGE_PIXELS) return { id: job.id, ok: false, error: "tooManyPixels" };
    const size = fitDimensions(srcWidth, srcHeight, job.fit);
    if (!size) return { id: job.id, ok: false, error: "dimensions" };
    if (size.width * size.height > MAX_IMAGE_PIXELS) return { id: job.id, ok: false, error: "tooManyPixels" };
    const { ctx, toBlob } = makeCanvas(size.width, size.height);
    if (!ctx) return { id: job.id, ok: false, error: "generic" };
    if (job.background) {
      ctx.fillStyle = job.background;
      ctx.fillRect(0, 0, size.width, size.height);
    }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, 0, 0, size.width, size.height);
    const blob = await toBlob(job.mime, job.quality);
    // Browsers silently fall back to PNG for unsupported types; never mislabel output.
    if (!blob || blob.type !== job.mime) return { id: job.id, ok: false, error: "encodeUnsupported" };
    return { id: job.id, ok: true, blob, width: size.width, height: size.height, srcWidth, srcHeight };
  } catch {
    return { id: job.id, ok: false, error: "generic" };
  } finally {
    bitmap.close();
  }
}
