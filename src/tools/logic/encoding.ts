export type EncodeResult = { ok: true; output: string } | { ok: false; error: "invalidBase64" | "invalidUtf8" | "malformedUri" };

/** UTF-8 safe Base64 encoding (handles Arabic, accents and emoji). */
export function base64Encode(text: string, urlSafe = false): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  const b64 = btoa(binary);
  return urlSafe ? b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "") : b64;
}

export function base64Decode(input: string): EncodeResult {
  let s = input.trim().replace(/\s+/g, "").replace(/-/g, "+").replace(/_/g, "/");
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(s)) return { ok: false, error: "invalidBase64" };
  if (s.length % 4 === 1) return { ok: false, error: "invalidBase64" };
  while (s.length % 4) s += "=";
  try {
    const binary = atob(s);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    return { ok: true, output: new TextDecoder("utf-8", { fatal: true }).decode(bytes) };
  } catch (e) {
    return { ok: false, error: e instanceof TypeError ? "invalidUtf8" : "invalidBase64" };
  }
}

export function urlEncode(text: string, mode: "component" | "full" = "component"): string {
  return mode === "component" ? encodeURIComponent(text) : encodeURI(text);
}

export function urlDecode(text: string, plusAsSpace = true): EncodeResult {
  try {
    return { ok: true, output: decodeURIComponent(plusAsSpace ? text.replace(/\+/g, " ") : text) };
  } catch {
    return { ok: false, error: "malformedUri" };
  }
}
