export type UnitCategory = "length" | "mass" | "temperature" | "volume" | "area" | "data";

/** Factors to the base unit of each category (metre, kilogram, litre, m², byte). */
export const UNITS: Record<Exclude<UnitCategory, "temperature">, Record<string, number>> = {
  length: { mm: 0.001, cm: 0.01, m: 1, km: 1000, in: 0.0254, ft: 0.3048, yd: 0.9144, mi: 1609.344 },
  mass: { mg: 1e-6, g: 0.001, kg: 1, t: 1000, oz: 0.028349523125, lb: 0.45359237 },
  volume: { ml: 0.001, l: 1, m3: 1000, tsp: 0.00492892159375, tbsp: 0.01478676478125, cup: 0.2365882365, gal: 3.785411784 },
  area: { cm2: 1e-4, m2: 1, ha: 1e4, km2: 1e6, ft2: 0.09290304, ac: 4046.8564224 },
  data: { B: 1, KB: 1e3, MB: 1e6, GB: 1e9, TB: 1e12, KiB: 1024, MiB: 1024 ** 2, GiB: 1024 ** 3 },
};

export const TEMPERATURE_UNITS = ["C", "F", "K"] as const;

export function unitsFor(category: UnitCategory): string[] {
  return category === "temperature" ? [...TEMPERATURE_UNITS] : Object.keys(UNITS[category]);
}

function toCelsius(v: number, from: string): number {
  if (from === "F") return ((v - 32) * 5) / 9;
  if (from === "K") return v - 273.15;
  return v;
}

function fromCelsius(c: number, to: string): number {
  if (to === "F") return (c * 9) / 5 + 32;
  if (to === "K") return c + 273.15;
  return c;
}

export type ConvertResult = { ok: true; value: number } | { ok: false; error: "unknownUnit" | "belowAbsoluteZero" | "invalid" };

export function convertUnit(value: number, from: string, to: string, category: UnitCategory): ConvertResult {
  if (!Number.isFinite(value)) return { ok: false, error: "invalid" };
  if (category === "temperature") {
    if (!TEMPERATURE_UNITS.includes(from as "C") || !TEMPERATURE_UNITS.includes(to as "C")) return { ok: false, error: "unknownUnit" };
    const c = toCelsius(value, from);
    if (c < -273.15 - 1e-9) return { ok: false, error: "belowAbsoluteZero" };
    return { ok: true, value: Number(fromCelsius(c, to).toPrecision(12)) };
  }
  const table = UNITS[category];
  const f = table[from], t = table[to];
  if (f === undefined || t === undefined) return { ok: false, error: "unknownUnit" };
  return { ok: true, value: Number(((value * f) / t).toPrecision(12)) };
}
