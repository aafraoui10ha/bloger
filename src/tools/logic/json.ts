export type JsonResult =
  | { ok: true; output: string }
  | { ok: false; error: string; line?: number; column?: number };

function locate(input: string, message: string): { line?: number; column?: number } {
  const lc = /line (\d+) column (\d+)/i.exec(message);
  if (lc) return { line: Number(lc[1]), column: Number(lc[2]) };
  const pos = /position (\d+)/i.exec(message);
  if (!pos) return {};
  const offset = Number(pos[1]);
  const before = input.slice(0, offset).split("\n");
  return { line: before.length, column: (before[before.length - 1]?.length ?? 0) + 1 };
}

export function formatJson(input: string, indent: number | "tab" = 2): JsonResult {
  if (!input.trim()) return { ok: false, error: "empty" };
  try {
    const value: unknown = JSON.parse(input);
    return { ok: true, output: JSON.stringify(value, null, indent === "tab" ? "\t" : indent) };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: message, ...locate(input, message) };
  }
}

export function minifyJson(input: string): JsonResult {
  return formatJson(input, 0);
}
