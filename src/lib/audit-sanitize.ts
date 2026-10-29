const SENSITIVE = /password|token|secret|hash|session|cookie|apikey|api_key/i;

/** Strips anything that looks sensitive and truncates long strings before audit storage. */
export function sanitizeAuditDetails(details: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(details)) {
    if (SENSITIVE.test(k)) continue;
    if (typeof v === "string") out[k] = v.length > 200 ? `${v.slice(0, 200)}…` : v;
    else if (typeof v === "number" || typeof v === "boolean" || v === null) out[k] = v;
    else if (Array.isArray(v)) out[k] = v.slice(0, 20).map((x) => (typeof x === "object" ? "[object]" : x));
  }
  return out;
}
