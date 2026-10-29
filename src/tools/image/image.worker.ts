/// <reference lib="webworker" />
import { runImageJob, type ImageJob } from "./protocol";

const ctx = self as unknown as DedicatedWorkerGlobalScope;

ctx.onmessage = async (event: MessageEvent<ImageJob>) => {
  const result = await runImageJob(event.data, (w, h) => {
    const canvas = new OffscreenCanvas(w, h);
    return {
      ctx: canvas.getContext("2d"),
      toBlob: (type, quality) => canvas.convertToBlob({ type, quality }).catch(() => null),
    };
  });
  ctx.postMessage(result);
};
