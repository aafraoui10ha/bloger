import { round } from "./numbers";

// ---------------------------------------------------------------------------
// Password generator
// ---------------------------------------------------------------------------

export type PasswordOptions = { length: number; lower: boolean; upper: boolean; digits: boolean; symbols: boolean; excludeAmbiguous: boolean };
export type PasswordResult = { ok: true; password: string; entropyBits: number } | { ok: false; error: "noClasses" | "length" };

const SETS = {
  lower: "abcdefghijklmnopqrstuvwxyz",
  upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  digits: "0123456789",
  symbols: "!@#$%^&*()-_=+[]{};:,.?/",
};
const AMBIGUOUS = /[Il1O0o]/g;

/** Unbiased random integer in [0, max) using rejection sampling. */
function randomInt(max: number, random: (buf: Uint32Array) => Uint32Array): number {
  const limit = Math.floor(0x100000000 / max) * max;
  const buf = new Uint32Array(1);
  for (;;) {
    const v = random(buf)[0]!;
    if (v < limit) return v % max;
  }
}

/**
 * Generates a password from a cryptographically secure source, with at least
 * one character from every selected class.
 */
export function generatePassword(opts: PasswordOptions, random: (buf: Uint32Array) => Uint32Array = (b) => crypto.getRandomValues(b)): PasswordResult {
  if (!Number.isInteger(opts.length) || opts.length < 4 || opts.length > 128) return { ok: false, error: "length" };
  const classes = (["lower", "upper", "digits", "symbols"] as const)
    .filter((k) => opts[k])
    .map((k) => (opts.excludeAmbiguous ? SETS[k].replace(AMBIGUOUS, "") : SETS[k]));
  if (!classes.length) return { ok: false, error: "noClasses" };
  const pool = classes.join("");
  const chars = classes.map((set) => set[randomInt(set.length, random)]!);
  while (chars.length < opts.length) chars.push(pool[randomInt(pool.length, random)]!);
  // Fisher–Yates shuffle so the guaranteed characters are not always first.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1, random);
    [chars[i], chars[j]] = [chars[j]!, chars[i]!];
  }
  return { ok: true, password: chars.join(""), entropyBits: Math.round(opts.length * Math.log2(pool.length)) };
}

export function passwordStrength(bits: number): "weak" | "fair" | "strong" | "veryStrong" {
  return bits < 50 ? "weak" : bits < 70 ? "fair" : bits < 100 ? "strong" : "veryStrong";
}

// ---------------------------------------------------------------------------
// Hashes (Web Crypto)
// ---------------------------------------------------------------------------

export const HASH_ALGORITHMS = ["SHA-1", "SHA-256", "SHA-384", "SHA-512"] as const;
export type HashAlgorithm = (typeof HASH_ALGORITHMS)[number];

export async function hashText(text: string, algorithm: HashAlgorithm): Promise<string> {
  const digest = await crypto.subtle.digest(algorithm, new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ---------------------------------------------------------------------------
// Unix timestamps
// ---------------------------------------------------------------------------

export type TimestampResult = { ok: true; date: Date; seconds: number; milliseconds: number; unit: "s" | "ms" } | { ok: false };

/** Parses a Unix timestamp; values above 10^11 are treated as milliseconds. */
export function parseTimestamp(input: string): TimestampResult {
  const s = input.trim();
  if (!/^-?\d{1,16}(\.\d+)?$/.test(s)) return { ok: false };
  const n = Number(s);
  const unit = Math.abs(n) >= 1e11 ? "ms" : "s";
  const ms = unit === "ms" ? n : n * 1000;
  const date = new Date(ms);
  if (Number.isNaN(date.getTime())) return { ok: false };
  return { ok: true, date, seconds: Math.floor(ms / 1000), milliseconds: Math.round(ms), unit };
}

/** Converts a date-time string (ISO or `YYYY-MM-DDTHH:mm` from a date input, read as UTC when `utc`) to a timestamp. */
export function dateToTimestamp(input: string, utc: boolean): TimestampResult {
  const s = input.trim();
  if (!s) return { ok: false };
  const local = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?)?$/.test(s);
  const date = new Date(local && utc ? `${s.length === 10 ? `${s}T00:00` : s}Z` : s);
  const ms = date.getTime();
  if (Number.isNaN(ms)) return { ok: false };
  return { ok: true, date, seconds: Math.floor(ms / 1000), milliseconds: ms, unit: "s" };
}

// ---------------------------------------------------------------------------
// BMI
// ---------------------------------------------------------------------------

export type BmiResult = { ok: true; bmi: number; category: "underweight" | "normal" | "overweight" | "obese" } | { ok: false; error: "invalid" | "range" };

/** Adult BMI with WHO categories. */
export function bmi(weightKg: number, heightCm: number): BmiResult {
  if (!Number.isFinite(weightKg) || !Number.isFinite(heightCm)) return { ok: false, error: "invalid" };
  if (weightKg < 2 || weightKg > 500 || heightCm < 50 || heightCm > 280) return { ok: false, error: "range" };
  const value = weightKg / (heightCm / 100) ** 2;
  const category = value < 18.5 ? "underweight" : value < 25 ? "normal" : value < 30 ? "overweight" : "obese";
  return { ok: true, bmi: round(value, 1), category };
}

// ---------------------------------------------------------------------------
// Age
// ---------------------------------------------------------------------------

export type AgeResult = { ok: true; years: number; months: number; days: number; totalDays: number; daysToBirthday: number } | { ok: false; error: "invalid" | "future" };

const utcDay = (d: Date) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m + 1, 0)).getUTCDate();

/** Exact age in years, months and days between two calendar dates (compared in UTC). */
export function age(birth: Date, on: Date): AgeResult {
  if (Number.isNaN(birth.getTime()) || Number.isNaN(on.getTime())) return { ok: false, error: "invalid" };
  if (utcDay(birth) > utcDay(on)) return { ok: false, error: "future" };
  // Whole months elapsed: step back one if the monthly anniversary (clamped to the
  // month's length) has not been reached yet. Remaining days count from that anniversary.
  const anniversary = (t: number) => {
    const y = birth.getUTCFullYear() + Math.floor((birth.getUTCMonth() + t) / 12);
    const m = (birth.getUTCMonth() + t) % 12;
    return Date.UTC(y, m, Math.min(birth.getUTCDate(), daysInMonth(y, m)));
  };
  let total = (on.getUTCFullYear() - birth.getUTCFullYear()) * 12 + on.getUTCMonth() - birth.getUTCMonth();
  if (anniversary(total) > utcDay(on)) total -= 1;
  const years = Math.floor(total / 12);
  const months = total % 12;
  const days = Math.round((utcDay(on) - anniversary(total)) / 86_400_000);
  const totalDays = Math.round((utcDay(on) - utcDay(birth)) / 86_400_000);
  // Next birthday; 29 February birthdays fall on 28 February in common years.
  const nextIn = (y: number) => Date.UTC(y, birth.getUTCMonth(), Math.min(birth.getUTCDate(), daysInMonth(y, birth.getUTCMonth())));
  let next = nextIn(on.getUTCFullYear());
  if (next < utcDay(on)) next = nextIn(on.getUTCFullYear() + 1);
  return { ok: true, years, months, days, totalDays, daysToBirthday: Math.round((next - utcDay(on)) / 86_400_000) };
}

// ---------------------------------------------------------------------------
// Loan / mortgage payments
// ---------------------------------------------------------------------------

export type LoanResult = { ok: true; monthly: number; totalPaid: number; totalInterest: number } | { ok: false; error: "invalid" | "range" };

/** Fixed-rate amortizing loan with monthly payments. */
export function loanPayment(principal: number, annualRatePercent: number, months: number): LoanResult {
  if (![principal, annualRatePercent, months].every(Number.isFinite)) return { ok: false, error: "invalid" };
  if (principal <= 0 || annualRatePercent < 0 || annualRatePercent > 100 || !Number.isInteger(months) || months < 1 || months > 600) return { ok: false, error: "range" };
  const r = annualRatePercent / 100 / 12;
  const monthly = r === 0 ? principal / months : (principal * r) / (1 - (1 + r) ** -months);
  const totalPaid = monthly * months;
  return { ok: true, monthly: round(monthly, 2), totalPaid: round(totalPaid, 2), totalInterest: round(totalPaid - principal, 2) };
}

// ---------------------------------------------------------------------------
// Placeholder text
// ---------------------------------------------------------------------------

const LOREM_WORDS =
  "lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua enim ad minim veniam quis nostrud exercitation ullamco laboris nisi aliquip ex ea commodo consequat duis aute irure in reprehenderit voluptate velit esse cillum fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt culpa qui officia deserunt mollit anim id est laborum".split(" ");

/** Generates `paragraphs` paragraphs of roughly `wordsPerParagraph` words of Latin placeholder text. */
export function loremIpsum(paragraphs: number, wordsPerParagraph: number, startWithLorem = true, random: () => number = Math.random): string[] {
  const p = Math.min(Math.max(Math.trunc(paragraphs) || 1, 1), 50);
  const w = Math.min(Math.max(Math.trunc(wordsPerParagraph) || 10, 5), 500);
  const out: string[] = [];
  for (let i = 0; i < p; i++) {
    const words = Array.from({ length: w }, () => LOREM_WORDS[Math.floor(random() * LOREM_WORDS.length)]!);
    if (i === 0 && startWithLorem) words.splice(0, Math.min(5, w), ...LOREM_WORDS.slice(0, Math.min(5, w)));
    // Sentences of 6–12 words.
    let text = "";
    let n = 0;
    let target = 6 + Math.floor(random() * 7);
    words.forEach((word, idx) => {
      const first = n === 0;
      text += (idx ? " " : "") + (first ? word[0]!.toUpperCase() + word.slice(1) : word);
      n++;
      if (n >= target || idx === words.length - 1) {
        text += ".";
        n = 0;
        target = 6 + Math.floor(random() * 7);
      }
    });
    out.push(text);
  }
  return out;
}
