"use client";

import { ImageTool } from "@/tools/image/ImageTool";

export function ImageCompressor() {
  return <ImageTool variant={{ toolKey: "image-compressor", accepted: ["png", "jpeg", "webp"], output: ["image/jpeg", "image/webp"], quality: true, resize: false, background: true, action: "compress" }} />;
}

export function ImageResizer() {
  return <ImageTool variant={{ toolKey: "image-resizer", accepted: ["png", "jpeg", "webp", "gif", "bmp"], output: "same", quality: false, resize: true, background: true, action: "resize" }} />;
}

export function PngToJpg() {
  return <ImageTool variant={{ toolKey: "png-to-jpg", accepted: ["png"], output: "image/jpeg", quality: true, resize: false, background: true, action: "convert" }} />;
}

export function JpgToPng() {
  return <ImageTool variant={{ toolKey: "jpg-to-png", accepted: ["jpeg"], output: "image/png", quality: false, resize: false, background: false, action: "convert" }} />;
}

export function ImageToWebp() {
  return <ImageTool variant={{ toolKey: "image-to-webp", accepted: ["png", "jpeg", "gif", "bmp"], output: "image/webp", quality: true, resize: false, background: false, action: "convert" }} />;
}
