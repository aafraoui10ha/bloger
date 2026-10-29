import { describe, expect, it } from "vitest";
import { parseNumber, parseNumberList, normalizeDigits } from "@/tools/logic/numbers";
import { discount, percentChange, percentOf, stats, whatPercent } from "@/tools/logic/calculators";
import { cleanText, convertCase, countText } from "@/tools/logic/text";
import { formatJson, minifyJson } from "@/tools/logic/json";
import { contrastRatio, parseHex, parseRgb, rgbToHex, rgbToHsl } from "@/tools/logic/color";
import { convertUnit } from "@/tools/logic/units";
import { base64Decode, base64Encode, urlDecode, urlEncode } from "@/tools/logic/encoding";
import {
  compressionStats,
  detectFormat,
  fitDimensions,
  outputFilename,
  readDimensions,
  validateImageInput,
} from "@/tools/logic/image";

describe("number parsing", () => {
  it("accepts decimal commas and Arabic-Indic digits", () => {
    expect(parseNumber("12,5")).toBe(12.5);
    expect(parseNumber("١٢٫٥")).toBe(12.5);
    expect(normalizeDigits("٣٤")).toBe("34");
    expect(parseNumber("abc")).toBeNull();
    expect(parseNumber("")).toBeNull();
  });
  it("parses lists and reports invalid tokens", () => {
    expect(parseNumberList("1, 2, 3")).toEqual({ ok: true, values: [1, 2, 3] });
    expect(parseNumberList("1,5 2,5\n3")).toEqual({ ok: true, values: [1.5, 2.5, 3] });
    expect(parseNumberList("4; x; 6")).toEqual({ ok: false, invalid: ["x"] });
  });
});

describe("calculators", () => {
  it("percentages", () => {
    expect(percentOf(15, 200)).toEqual({ ok: true, value: 30 });
    expect(whatPercent(25, 200)).toEqual({ ok: true, value: 12.5 });
    expect(whatPercent(1, 0)).toEqual({ ok: false, error: "divideByZero" });
    expect(percentChange(80, 100)).toEqual({ ok: true, value: 25 });
    expect(percentChange(100, 80)).toEqual({ ok: true, value: -20 });
  });
  it("discount with tax", () => {
    expect(discount(200, 25, 20)).toEqual({ ok: true, saving: 50, priceAfterDiscount: 150, tax: 30, finalPrice: 180 });
    expect(discount(-1, 10)).toEqual({ ok: false, error: "negativePrice" });
    expect(discount(10, 120)).toEqual({ ok: false, error: "discountRange" });
  });
  it("stats", () => {
    expect(stats([4, 1, 3, 2])).toMatchObject({ count: 4, sum: 10, mean: 2.5, median: 2.5, min: 1, max: 4, range: 3 });
    expect(stats([5])).toMatchObject({ median: 5 });
    expect(stats([])).toBeNull();
  });
});

describe("text tools", () => {
  it("counts words, characters and sentences in several scripts", () => {
    const c = countText("Hello world. How are you?\n\nSecond paragraph!");
    expect(c.words).toBe(7);
    expect(c.sentences).toBe(3);
    expect(c.paragraphs).toBe(2);
    expect(countText("مرحبا بالعالم").words).toBe(2);
    expect(countText("👍🏽").characters).toBe(1);
    expect(countText("").words).toBe(0);
  });
  it("cleans whitespace", () => {
    expect(cleanText("  a   b \t c  \n\n\n\n d ")).toBe("a b c\n\nd");
    expect(cleanText("a\n\nb", { collapseSpaces: true, trimLines: true, removeEmptyLines: true, joinLines: false, removeTabs: true })).toBe("a\nb");
    expect(cleanText("a\nb", { collapseSpaces: true, trimLines: true, removeEmptyLines: false, joinLines: true, removeTabs: true })).toBe("a b");
  });
  it("converts case and leaves Arabic unchanged", () => {
    expect(convertCase("hello WORLD", "upper")).toBe("HELLO WORLD");
    expect(convertCase("hello world", "title")).toBe("Hello World");
    expect(convertCase("HELLO. WORLD", "sentence")).toBe("Hello. World");
    expect(convertCase("élan", "upper", "fr")).toBe("ÉLAN");
    expect(convertCase("مرحبا", "upper")).toBe("مرحبا");
  });
});

describe("json", () => {
  it("formats, minifies and reports errors", () => {
    expect(formatJson('{"a":1}')).toEqual({ ok: true, output: '{\n  "a": 1\n}' });
    expect(minifyJson('{ "a": [1, 2] }')).toEqual({ ok: true, output: '{"a":[1,2]}' });
    const bad = formatJson('{"a":}');
    expect(bad.ok).toBe(false);
    expect(formatJson("  ")).toEqual({ ok: false, error: "empty" });
  });
});

describe("color", () => {
  it("converts between HEX, RGB and HSL", () => {
    expect(parseHex("#19F")).toEqual({ r: 17, g: 153, b: 255 });
    expect(parseHex("zzz")).toBeNull();
    expect(parseRgb("rgb(30, 144, 255)")).toEqual({ r: 30, g: 144, b: 255 });
    expect(parseRgb("300,0,0")).toBeNull();
    expect(rgbToHex({ r: 30, g: 144, b: 255 })).toBe("#1E90FF");
    expect(rgbToHsl({ r: 255, g: 0, b: 0 })).toEqual({ h: 0, s: 100, l: 50 });
    expect(contrastRatio({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 })).toBe(21);
  });
});

describe("units", () => {
  it("converts length, temperature and data", () => {
    expect(convertUnit(1, "km", "m", "length")).toEqual({ ok: true, value: 1000 });
    expect(convertUnit(100, "C", "F", "temperature")).toEqual({ ok: true, value: 212 });
    expect(convertUnit(-300, "C", "K", "temperature")).toEqual({ ok: false, error: "belowAbsoluteZero" });
    expect(convertUnit(1, "GiB", "MiB", "data")).toEqual({ ok: true, value: 1024 });
    expect(convertUnit(1, "zz", "m", "length")).toEqual({ ok: false, error: "unknownUnit" });
  });
});

describe("encoding", () => {
  it("round-trips UTF-8 Base64 including Arabic", () => {
    const s = "مرحبا é 👋";
    expect(base64Decode(base64Encode(s))).toEqual({ ok: true, output: s });
    expect(base64Decode(base64Encode(s, true))).toEqual({ ok: true, output: s });
    expect(base64Decode("@@@").ok).toBe(false);
  });
  it("URL encodes and decodes", () => {
    expect(urlEncode("a b&c")).toBe("a%20b%26c");
    expect(urlEncode("https://x.com/a b?q=1", "full")).toBe("https://x.com/a%20b?q=1");
    expect(urlDecode("a+b%20c")).toEqual({ ok: true, output: "a b c" });
    expect(urlDecode("%E0%A4%A")).toEqual({ ok: false, error: "malformedUri" });
  });
});

describe("image helpers", () => {
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52, 0, 0, 1, 0, 0, 0, 0, 200]);
  it("detects formats by magic bytes", () => {
    expect(detectFormat(png)).toBe("png");
    expect(detectFormat(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe("jpeg");
    expect(detectFormat(new TextEncoder().encode("RIFF\0\0\0\0WEBPVP8 "))).toBe("webp");
    expect(detectFormat(new TextEncoder().encode("<svg xmlns"))).toBe("svg");
    expect(detectFormat(new Uint8Array([1, 2, 3, 4]))).toBe("unknown");
  });
  it("reads PNG dimensions", () => {
    expect(readDimensions(png, "png")).toEqual({ width: 256, height: 200 });
  });
  it("validates inputs including mismatched types", () => {
    expect(validateImageInput({ name: "a.png", type: "image/png", size: 10 }, "png", ["png"])).toBeNull();
    expect(validateImageInput({ name: "a.png", type: "image/png", size: 0 }, "png", ["png"])).toBe("empty");
    expect(validateImageInput({ name: "a.jpg", type: "image/jpeg", size: 10 }, "png", ["png", "jpeg"])).toBe("mismatch");
    expect(validateImageInput({ name: "a.gif", type: "image/gif", size: 10 }, "gif", ["png"])).toBe("unsupportedType");
    expect(validateImageInput({ name: "a.png", type: "image/png", size: 99e9 }, "png", ["png"])).toBe("tooLarge");
  });
  it("fits dimensions and preserves aspect ratio", () => {
    expect(fitDimensions(4000, 3000, { width: 800, keepAspect: true })).toEqual({ width: 800, height: 600 });
    expect(fitDimensions(4000, 3000, { width: 800, height: 800, keepAspect: true })).toEqual({ width: 800, height: 600 });
    expect(fitDimensions(4000, 3000, { width: 800, height: 800, keepAspect: false })).toEqual({ width: 800, height: 800 });
    expect(fitDimensions(100, 100, { width: 20000, keepAspect: true })).toBeNull();
  });
  it("computes compression stats and safe filenames", () => {
    expect(compressionStats(1000, 250)).toEqual({ savedBytes: 750, percent: 75 });
    expect(compressionStats(1000, 1100).percent).toBe(-10);
    expect(outputFilename("photo.final.PNG", "image/jpeg")).toBe("photo.final.jpg");
    expect(outputFilename("x", "image/webp", "-small")).toBe("x-small.webp");
  });
});
