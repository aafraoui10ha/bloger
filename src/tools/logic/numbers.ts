const ARABIC_INDIC = /[٠-٩۰-۹]/g;

/** Converts Arabic-Indic / Persian digits and the Arabic decimal separator to ASCII. */
export function normalizeDigits(input: string): string {
  return input
    .replace(ARABIC_INDIC, (d) => {
      const code = d.charCodeAt(0);
      return String(code >= 0x06f0 ? code - 0x06f0 : code - 0x0660);
    })
    .replace(/٫/g, ".") // Arabic decimal separator
    .replace(/٬/g, ""); // Arabic thousands separator
}

/**
 * Parses one user-entered number. Accepts "12.5", "12,5" (decimal comma),
 * Arabic-Indic digits and surrounding whitespace. Returns null when invalid.
 */
export function parseNumber(input: string): number | null {
  const s = normalizeDigits(input).trim().replace(/\s+/g, "");
  if (!s) return null;
  const normalized = /^[-+]?\d+,\d+$/.test(s) ? s.replace(",", ".") : s;
  if (!/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(normalized)) return null;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

export type NumberListResult = { ok: true; values: number[] } | { ok: false; invalid: string[] };

/**
 * Parses a list of numbers separated by whitespace, new lines, semicolons, or
 * ", " (comma followed by a space). A comma directly between digits is a decimal comma.
 */
export function parseNumberList(input: string): NumberListResult {
  const tokens = normalizeDigits(input)
    .split(/[\s;]+|,(?=\s|$)/)
    .map((t) => t.trim())
    .filter(Boolean);
  const values: number[] = [];
  const invalid: string[] = [];
  for (const token of tokens) {
    const n = parseNumber(token);
    if (n === null) invalid.push(token);
    else values.push(n);
  }
  return invalid.length ? { ok: false, invalid } : { ok: true, values };
}

/** Rounds to a fixed number of decimals without floating noise (e.g. 0.1 + 0.2). */
export function round(n: number, decimals = 2): number {
  const f = 10 ** decimals;
  return Math.round((n + Number.EPSILON) * f) / f;
}
