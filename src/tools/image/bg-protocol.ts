/** Messages between the background-removal tool and its worker. */
export type BgRequest = { blob: Blob; width: number; height: number };
/** "full": any subject (needs WebGPU). "portrait": lighter CPU model, best on people. */
export type BgMode = "full" | "portrait";
/** Model-loading stages shown to the user (image processing is reported by "ready"). */
export type BgStage = "checking" | "verifying" | "loading";
export type BgResponse =
  | { type: "stage"; stage: BgStage }
  /** Model download progress across all files of the model; total is null when unknown. */
  | { type: "progress"; source: "local" | "external"; loaded: number; total: number | null }
  /** This website's copy failed; the external source is being used. */
  | { type: "fallback" }
  /** The browser would not store the model, so it will be downloaded again next time. */
  | { type: "cacheSkipped" }
  | { type: "ready"; mode: BgMode }
  | { type: "done"; mask: Uint8Array; width: number; height: number; mode: BgMode }
  | { type: "error"; message: string; kind: "network" | "integrity" | "other" };

/** Largest first-run download (the any-subject model and runtime), shown before the first run. */
export const BG_MODEL_MB = 135;

/** Writes a single-channel mask into the alpha channel of RGBA pixels, in place. */
export function applyMask(rgba: Uint8ClampedArray, mask: Uint8Array): void {
  for (let i = 0, j = 3; i < mask.length; i++, j += 4) rgba[j] = Math.round((rgba[j]! * mask[i]!) / 255);
}
