export type TextCounts = {
  characters: number;
  charactersNoSpaces: number;
  words: number;
  sentences: number;
  paragraphs: number;
  lines: number;
  readingTimeSeconds: number;
};

/** Counts user-perceived characters (grapheme clusters) so emoji and accents count once. */
function graphemeCount(text: string): number {
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    let n = 0;
    const it = new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(text)[Symbol.iterator]();
    while (!it.next().done) n++;
    return n;
  }
  return Array.from(text).length;
}

function wordCount(text: string): number {
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    let n = 0;
    for (const s of new Intl.Segmenter(undefined, { granularity: "word" }).segment(text)) if (s.isWordLike) n++;
    return n;
  }
  return text.split(/\s+/).filter(Boolean).length;
}

export function countText(text: string): TextCounts {
  const trimmed = text.trim();
  const words = trimmed ? wordCount(trimmed) : 0;
  return {
    characters: graphemeCount(text),
    charactersNoSpaces: graphemeCount(text.replace(/\s/g, "")),
    words,
    sentences: trimmed ? (trimmed.match(/[^.!?؟…]+(?:[.!?؟…]+|$)/g) ?? []).filter((s) => /\p{L}|\p{N}/u.test(s)).length : 0,
    paragraphs: trimmed ? trimmed.split(/\n\s*\n/).filter((p) => p.trim()).length : 0,
    lines: text ? text.split(/\r\n|\r|\n/).length : 0,
    readingTimeSeconds: Math.ceil((words / 220) * 60),
  };
}

export type CleanOptions = {
  collapseSpaces: boolean;
  trimLines: boolean;
  removeEmptyLines: boolean;
  joinLines: boolean;
  removeTabs: boolean;
};

export const defaultCleanOptions: CleanOptions = {
  collapseSpaces: true,
  trimLines: true,
  removeEmptyLines: false,
  joinLines: false,
  removeTabs: true,
};

export function cleanText(text: string, options: CleanOptions = defaultCleanOptions): string {
  let out = text.replace(/\r\n?/g, "\n").replace(/[   ]/g, " ");
  if (options.removeTabs) out = out.replace(/\t/g, " ");
  if (options.collapseSpaces) out = out.replace(/ {2,}/g, " ");
  let lines = out.split("\n");
  if (options.trimLines) lines = lines.map((l) => l.trim());
  if (options.removeEmptyLines) lines = lines.filter((l) => l.trim() !== "");
  else lines = lines.reduce<string[]>((acc, l) => {
    // Collapse 3+ consecutive blank lines into one blank line.
    if (l.trim() === "" && acc.length >= 1 && acc[acc.length - 1]!.trim() === "") return acc;
    acc.push(l);
    return acc;
  }, []);
  out = options.joinLines ? lines.filter((l) => l.trim()).join(" ") : lines.join("\n");
  if (options.collapseSpaces) out = out.replace(/ {2,}/g, " ");
  return out.trim();
}

export type CaseMode = "upper" | "lower" | "title" | "sentence" | "alternating";

/**
 * Case conversion. Arabic script has no letter case, so Arabic text passes
 * through unchanged; Latin text inside it is still converted.
 */
export function convertCase(text: string, mode: CaseMode, locale?: string): string {
  switch (mode) {
    case "upper":
      return text.toLocaleUpperCase(locale);
    case "lower":
      return text.toLocaleLowerCase(locale);
    case "title":
      return text
        .toLocaleLowerCase(locale)
        .replace(/(^|[\s\-–—("'«])(\p{L})/gu, (_m, sep: string, ch: string) => sep + ch.toLocaleUpperCase(locale));
    case "sentence":
      return text
        .toLocaleLowerCase(locale)
        .replace(/(^\s*|[.!?؟]\s+|\n\s*)(\p{L})/gu, (_m, sep: string, ch: string) => sep + ch.toLocaleUpperCase(locale));
    case "alternating": {
      let i = 0;
      return Array.from(text)
        .map((ch) => {
          if (!/\p{L}/u.test(ch)) return ch;
          return i++ % 2 ? ch.toLocaleUpperCase(locale) : ch.toLocaleLowerCase(locale);
        })
        .join("");
    }
  }
}
