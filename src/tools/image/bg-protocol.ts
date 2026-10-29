/** Messages between the background-removal tool and its worker. */
export type BgRequest = { blob: Blob; width: number; height: number };
/** "full": any subject (needs WebGPU). "portrait": lighter CPU model, best on people. */
export type BgMode = "full" | "portrait";
export type BgResponse =
  | { type: "progress"; loaded: number; total: number }
  | { type: "ready"; mode: BgMode }
  | { type: "done"; mask: Uint8Array; width: number; height: number; mode: BgMode }
  | { type: "error"; message: string };

/** Largest first-run download (the any-subject model), shown before the first run. */
export const BG_MODEL_MB = 109;

/** Writes a single-channel mask into the alpha channel of RGBA pixels, in place. */
export function applyMask(rgba: Uint8ClampedArray, mask: Uint8Array): void {
  for (let i = 0, j = 3; i < mask.length; i++, j += 4) rgba[j] = Math.round((rgba[j]! * mask[i]!) / 255);
}
