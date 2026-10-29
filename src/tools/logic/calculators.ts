import { round } from "./numbers";

export type CalcResult = { ok: true; value: number } | { ok: false; error: "divideByZero" | "invalid" };

/** What is P% of X? */
export function percentOf(percent: number, value: number): CalcResult {
  if (!Number.isFinite(percent) || !Number.isFinite(value)) return { ok: false, error: "invalid" };
  return { ok: true, value: round((percent / 100) * value, 6) };
}

/** X is what percent of Y? */
export function whatPercent(part: number, whole: number): CalcResult {
  if (!Number.isFinite(part) || !Number.isFinite(whole)) return { ok: false, error: "invalid" };
  if (whole === 0) return { ok: false, error: "divideByZero" };
  return { ok: true, value: round((part / whole) * 100, 6) };
}

/** Percentage change from A to B. */
export function percentChange(from: number, to: number): CalcResult {
  if (!Number.isFinite(from) || !Number.isFinite(to)) return { ok: false, error: "invalid" };
  if (from === 0) return { ok: false, error: "divideByZero" };
  return { ok: true, value: round(((to - from) / Math.abs(from)) * 100, 6) };
}

export type DiscountResult =
  | { ok: true; saving: number; priceAfterDiscount: number; tax: number; finalPrice: number }
  | { ok: false; error: "negativePrice" | "discountRange" | "taxRange" | "invalid" };

/**
 * Applies a percentage discount (and optional sales tax / VAT on the discounted
 * price). Amounts are rounded to 2 decimals for display.
 */
export function discount(price: number, discountPercent: number, taxPercent = 0): DiscountResult {
  if (![price, discountPercent, taxPercent].every(Number.isFinite)) return { ok: false, error: "invalid" };
  if (price < 0) return { ok: false, error: "negativePrice" };
  if (discountPercent < 0 || discountPercent > 100) return { ok: false, error: "discountRange" };
  if (taxPercent < 0 || taxPercent > 100) return { ok: false, error: "taxRange" };
  const saving = (price * discountPercent) / 100;
  const after = price - saving;
  const tax = (after * taxPercent) / 100;
  return {
    ok: true,
    saving: round(saving),
    priceAfterDiscount: round(after),
    tax: round(tax),
    finalPrice: round(after + tax),
  };
}

export type Stats = {
  count: number;
  sum: number;
  mean: number;
  median: number;
  min: number;
  max: number;
  range: number;
};

export function stats(values: number[]): Stats | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const sum = values.reduce((a, b) => a + b, 0);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
  const min = sorted[0]!;
  const max = sorted[sorted.length - 1]!;
  return {
    count: values.length,
    sum: round(sum, 6),
    mean: round(sum / values.length, 6),
    median: round(median, 6),
    min,
    max,
    range: round(max - min, 6),
  };
}

/** Weighted average: sum(v*w)/sum(w). */
export function weightedMean(values: number[], weights: number[]): number | null {
  if (values.length === 0 || values.length !== weights.length) return null;
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  if (totalWeight === 0) return null;
  return round(values.reduce((acc, v, i) => acc + v * weights[i]!, 0) / totalWeight, 6);
}
