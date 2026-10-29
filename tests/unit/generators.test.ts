import { describe, expect, it } from "vitest";
import { age, bmi, dateToTimestamp, generatePassword, hashText, loanPayment, loremIpsum, parseTimestamp, passwordStrength } from "@/tools/logic/generators";

const all = { length: 16, lower: true, upper: true, digits: true, symbols: true, excludeAmbiguous: false };

describe("password generator", () => {
  it("includes every selected class and respects length", () => {
    for (let i = 0; i < 50; i++) {
      const r = generatePassword(all);
      if (!r.ok) throw new Error("failed");
      expect(r.password).toHaveLength(16);
      expect(r.password).toMatch(/[a-z]/);
      expect(r.password).toMatch(/[A-Z]/);
      expect(r.password).toMatch(/\d/);
      expect(r.password).toMatch(/[^a-zA-Z0-9]/);
    }
  });
  it("excludes ambiguous characters and validates options", () => {
    const r = generatePassword({ ...all, length: 128, symbols: false, excludeAmbiguous: true });
    expect(r.ok && /[Il1O0o]/.test(r.password)).toBe(false);
    expect(generatePassword({ ...all, lower: false, upper: false, digits: false, symbols: false })).toEqual({ ok: false, error: "noClasses" });
    expect(generatePassword({ ...all, length: 3 })).toEqual({ ok: false, error: "length" });
    expect(passwordStrength(40)).toBe("weak");
    expect(passwordStrength(105)).toBe("veryStrong");
  });
});

describe("hash, timestamps", () => {
  it("hashes UTF-8 text", async () => {
    expect(await hashText("abc", "SHA-256")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    expect(await hashText("", "SHA-1")).toBe("da39a3ee5e6b4b0d3255bfef95601890afd80709");
  });
  it("parses seconds and milliseconds", () => {
    const s = parseTimestamp("1700000000");
    expect(s.ok && s.date.toISOString()).toBe("2023-11-14T22:13:20.000Z");
    const ms = parseTimestamp("1700000000123");
    expect(ms.ok && ms.unit).toBe("ms");
    expect(parseTimestamp("abc").ok).toBe(false);
    const d = dateToTimestamp("2024-01-01T00:00", true);
    expect(d.ok && d.seconds).toBe(1704067200);
  });
});

describe("calculators", () => {
  it("computes BMI with WHO categories", () => {
    expect(bmi(70, 175)).toEqual({ ok: true, bmi: 22.9, category: "normal" });
    expect(bmi(95, 170)).toMatchObject({ category: "obese" });
    expect(bmi(70, 10)).toEqual({ ok: false, error: "range" });
  });
  it("computes exact age", () => {
    expect(age(new Date("2000-02-29"), new Date("2024-03-01"))).toMatchObject({ ok: true, years: 24, months: 0, days: 1 });
    expect(age(new Date("1990-05-31"), new Date("2024-03-15"))).toMatchObject({ years: 33, months: 9, days: 15 });
    expect(age(new Date("2024-01-31"), new Date("2024-03-01"))).toMatchObject({ years: 0, months: 1, days: 1 });
    expect(age(new Date("2000-03-10"), new Date("2024-03-01"))).toMatchObject({ daysToBirthday: 9 });
    expect(age(new Date("2030-01-01"), new Date("2024-01-01"))).toEqual({ ok: false, error: "future" });
  });
  it("computes loan payments", () => {
    expect(loanPayment(200000, 5, 360)).toEqual({ ok: true, monthly: 1073.64, totalPaid: 386511.57, totalInterest: 186511.57 });
    expect(loanPayment(1200, 0, 12)).toMatchObject({ monthly: 100, totalInterest: 0 });
    expect(loanPayment(1000, 5, 0)).toEqual({ ok: false, error: "range" });
  });
  it("generates placeholder text", () => {
    const p = loremIpsum(3, 40);
    expect(p).toHaveLength(3);
    expect(p[0]!.startsWith("Lorem ipsum dolor sit amet")).toBe(true);
    expect(p[1]!.split(" ")).toHaveLength(40);
  });
});
