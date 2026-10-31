"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Copy, Download, Heart, Shuffle } from "lucide-react";
import { contrastRatio, harmony, HARMONIES, parseHex, randomPalette, readableOn, wcagLevel, type Harmony } from "@/tools/logic/color";
import { COLOR_FAMILIES, PALETTE_CATEGORIES, PALETTES, paletteMatches, type ColorFamily, type Palette, type PaletteCategory } from "@/tools/designer/palettes";
import { DEFAULT_PATTERN, PATTERN_GROUPS, patternCss, patternSvg, seeded, type PatternConfig, type PatternType } from "@/tools/designer/patterns";
import { downloadBlob, rasterize } from "@/tools/designer/export";
import { CopyButton, useToolEvents } from "@/tools/ui";
import { ColorField, NumberField, SliderField, Toggle } from "@/tools/designer/ui/controls";

const FAV_KEY = "palette-favourites";

function readFavs(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(FAV_KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

/** Copies a single value and shows a tick briefly. */
function SwatchCopy({ color, label, big }: { color: string; label: string; big?: boolean }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className={`group relative flex flex-1 items-end justify-center ${big ? "h-28" : "h-16"} min-w-0 transition-[flex-grow] hover:flex-[1.4]`}
      style={{ backgroundColor: color, color: readableOn(color) }}
      aria-label={label}
      title={label}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(color);
          setDone(true);
          setTimeout(() => setDone(false), 1200);
        } catch {
          // Clipboard blocked; the HEX value stays visible.
        }
      }}
    >
      <span className="mb-1.5 font-mono text-[10px] font-semibold opacity-90 sm:text-xs" dir="ltr">
        {done ? <Check className="size-3.5" aria-hidden="true" /> : color}
      </span>
    </button>
  );
}

function exportFormats(colors: string[], name: string) {
  const vars = colors.map((c, i) => `  --color-${i + 1}: ${c};`).join("\n");
  return {
    css: `:root {\n${vars}\n}`,
    scss: colors.map((c, i) => `$color-${i + 1}: ${c};`).join("\n"),
    tailwind: `colors: {\n  ${name}: {\n${colors.map((c, i) => `    ${(i + 1) * 100}: "${c}",`).join("\n")}\n  },\n}`,
    json: JSON.stringify(colors, null, 2),
  };
}

export function ColorPaletteLibrary() {
  const t = useTranslations("palettes");
  const events = useToolEvents("color-palettes");
  const [category, setCategory] = useState<PaletteCategory | "all" | "favourites">("all");
  const [family, setFamily] = useState<ColorFamily | "all">("all");
  const [query, setQuery] = useState("");
  // This tool only renders in the browser (ssr: false), so storage can be read on first render.
  const [favs, setFavs] = useState<string[]>(readFavs);
  const [random, setRandom] = useState<string[] | null>(() => randomPalette());
  const [active, setActive] = useState<{ id: string; colors: string[] }>({ id: PALETTES[0]!.id, colors: PALETTES[0]!.colors });
  const [base, setBase] = useState(PALETTES[0]!.colors[0]!);
  const [fg, setFg] = useState(0);
  const [bg, setBg] = useState(4);
  const [format, setFormat] = useState<"css" | "scss" | "tailwind" | "json">("css");

  const toggleFav = (id: string) => {
    const next = favs.includes(id) ? favs.filter((x) => x !== id) : [...favs, id];
    setFavs(next);
    try {
      localStorage.setItem(FAV_KEY, JSON.stringify(next));
    } catch {
      // Storage blocked: favourites last for this visit only.
    }
  };
  const label = (p: Palette) => `${t(`categories.${p.category}`)} ${p.id.split("-")[1]}`;
  const q = query.trim().toLowerCase();
  const list = PALETTES.filter((p) => {
    if (category === "favourites" ? !favs.includes(p.id) : !paletteMatches(p, { category, family })) return false;
    if (category === "favourites" && family !== "all" && !paletteMatches(p, { family })) return false;
    return !q || paletteMatches(p, { query: q }) || label(p).toLowerCase().includes(q);
  });
  const use = (id: string, colors: string[]) => {
    setActive({ id, colors });
    setBase(colors[0]!);
    setFg(0);
    setBg(colors.length - 1);
    events.complete({ action: "apply" });
  };
  const formats = exportFormats(active.colors, "palette");
  const a = parseHex(active.colors[fg] ?? "#000000")!, b = parseHex(active.colors[bg] ?? "#FFFFFF")!;
  const ratio = contrastRatio(a, b);
  const level = wcagLevel(ratio);

  return (
    <div className="space-y-6">
      {/* Random generator */}
      <section aria-labelledby="random-h" className="rounded-xl border border-border p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 id="random-h" className="font-semibold">
            {t("random")}
          </h2>
          <div className="flex gap-2">
            <button type="button" className="btn-secondary btn-sm" onClick={() => setRandom(randomPalette())}>
              <Shuffle className="size-4" aria-hidden="true" />
              {t("generate")}
            </button>
            {random && (
              <button type="button" className="btn-primary btn-sm" onClick={() => use("random", random)}>
                {t("use")}
              </button>
            )}
          </div>
        </div>
        <div className="flex overflow-hidden rounded-lg">{random?.map((c, i) => <SwatchCopy key={i} color={c} label={t("copyColor", { color: c })} />)}</div>
      </section>

      {/* Active palette: details, harmonies, contrast, code */}
      <section aria-labelledby="active-h" className="rounded-xl border border-accent-2 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 id="active-h" className="font-semibold">
            {t("selected")}
          </h2>
          <CopyButton value={active.colors.join(", ")} />
        </div>
        <div className="flex overflow-hidden rounded-lg">{active.colors.map((c, i) => <SwatchCopy key={i} color={c} big label={t("copyColor", { color: c })} />)}</div>

        <div className="mt-5 grid gap-6 lg:grid-cols-2">
          <div>
            <h3 className="mb-2 text-sm font-semibold">{t("harmonies")}</h3>
            <div className="mb-3 flex items-center gap-2">
              <label htmlFor="base-color" className="text-sm text-muted">
                {t("baseColor")}
              </label>
              <input id="base-color" type="color" value={base} onChange={(e) => setBase(e.target.value.toUpperCase())} className="h-9 w-12 rounded-md border border-border-strong bg-surface p-0.5" />
              <div className="flex gap-1">
                {active.colors.map((c) => (
                  <button key={c} type="button" className="size-7 rounded-full border border-border" style={{ backgroundColor: c }} onClick={() => setBase(c)} aria-label={t("useAsBase", { color: c })} />
                ))}
              </div>
            </div>
            <ul className="space-y-2">
              {HARMONIES.map((h: Harmony) => {
                const cols = harmony(base, h);
                return (
                  <li key={h} className="flex items-center gap-2">
                    <span className="w-36 shrink-0 text-xs text-muted">{t(`harmony.${h}`)}</span>
                    <div className="flex flex-1 overflow-hidden rounded-md">{cols.map((c, i) => <SwatchCopy key={i} color={c} label={t("copyColor", { color: c })} />)}</div>
                    <button type="button" className="btn-ghost btn-sm" onClick={() => use(`harmony-${h}`, cols)}>
                      {t("use")}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold">{t("contrast")}</h3>
            <div className="mb-3 grid grid-cols-2 gap-2">
              <label className="text-xs text-muted">
                {t("textColor")}
                <select className="input mt-1 h-9 py-1 font-mono text-xs" value={fg} onChange={(e) => setFg(Number(e.target.value))}>
                  {active.colors.map((c, i) => (
                    <option key={i} value={i}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs text-muted">
                {t("backgroundColor")}
                <select className="input mt-1 h-9 py-1 font-mono text-xs" value={bg} onChange={(e) => setBg(Number(e.target.value))}>
                  {active.colors.map((c, i) => (
                    <option key={i} value={i}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="rounded-lg p-4" style={{ backgroundColor: active.colors[bg], color: active.colors[fg] }}>
              <p className="text-lg font-bold">{t("sampleHeading")}</p>
              <p className="text-sm">{t("sampleText")}</p>
            </div>
            <p className="mt-2 text-sm" aria-live="polite">
              {t("ratio", { ratio: ratio.toFixed(2) })} · <strong className={level === "fail" ? "text-danger" : "text-success"}>{t(`wcag.${level}`)}</strong>
            </p>
            <table className="mt-3 w-full text-xs">
              <caption className="mb-1 text-start text-muted">{t("onWhiteBlack")}</caption>
              <thead>
                <tr className="text-muted">
                  <th className="text-start font-medium">{t("color")}</th>
                  <th className="font-medium">{t("onWhite")}</th>
                  <th className="font-medium">{t("onBlack")}</th>
                </tr>
              </thead>
              <tbody>
                {active.colors.map((c) => {
                  const rgb = parseHex(c)!;
                  const w = contrastRatio(rgb, { r: 255, g: 255, b: 255 }), k = contrastRatio(rgb, { r: 0, g: 0, b: 0 });
                  return (
                    <tr key={c} className="border-t border-border">
                      <td className="py-1">
                        <span className="me-1 inline-block size-3 rounded-sm align-middle" style={{ backgroundColor: c }} />
                        <span className="font-mono" dir="ltr">
                          {c}
                        </span>
                      </td>
                      <td className="text-center">
                        {w.toFixed(1)} <Badge level={wcagLevel(w)} t={t} />
                      </td>
                      <td className="text-center">
                        {k.toFixed(1)} <Badge level={wcagLevel(k)} t={t} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-5">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold">{t("code")}</h3>
            {(["css", "scss", "tailwind", "json"] as const).map((f) => (
              <button key={f} type="button" aria-pressed={format === f} className={`btn-sm rounded-md px-2 py-1 text-xs font-medium ${format === f ? "bg-accent text-accent-fg" : "btn-ghost"}`} onClick={() => setFormat(f)}>
                {f.toUpperCase()}
              </button>
            ))}
            <CopyButton value={formats[format]} />
          </div>
          <pre className="overflow-auto rounded-lg bg-surface-2 p-3 text-xs" dir="ltr">
            <code>{formats[format]}</code>
          </pre>
        </div>
      </section>

      {/* Library */}
      <section aria-labelledby="library-h">
        <h2 id="library-h" className="mb-3 font-semibold">
          {t("library", { count: PALETTES.length })}
        </h2>
        <div className="mb-3 flex flex-wrap gap-1.5" role="group" aria-label={t("category")}>
          {(["all", "favourites", ...PALETTE_CATEGORIES] as const).map((c) => (
            <button key={c} type="button" aria-pressed={category === c} className={`rounded-full border px-3 py-1 text-xs font-medium ${category === c ? "border-accent bg-accent text-accent-fg" : "border-border hover:border-accent-2"}`} onClick={() => setCategory(c)}>
              {c === "all" ? t("all") : c === "favourites" ? t("favourites", { count: favs.length }) : t(`categories.${c}`)}
            </button>
          ))}
        </div>
        <div className="mb-4 grid gap-2 sm:grid-cols-2">
          <input type="search" className="input" placeholder={t("search")} aria-label={t("search")} value={query} onChange={(e) => setQuery(e.target.value)} />
          <select className="input" aria-label={t("colorFilter")} value={family} onChange={(e) => setFamily(e.target.value as ColorFamily | "all")}>
            <option value="all">{t("anyColor")}</option>
            {COLOR_FAMILIES.map((f) => (
              <option key={f} value={f}>
                {t(`families.${f}`)}
              </option>
            ))}
          </select>
        </div>
        {list.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted">{category === "favourites" ? t("noFavourites") : t("noResults")}</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((p) => (
              <li key={p.id} className={`overflow-hidden rounded-xl border ${active.id === p.id ? "border-accent-2 ring-2 ring-accent-2" : "border-border"}`}>
                <div className="flex">{p.colors.map((c, i) => <SwatchCopy key={i} color={c} label={t("copyColor", { color: c })} />)}</div>
                <div className="flex items-center justify-between gap-1 p-2">
                  <span className="truncate text-xs font-medium">{label(p)}</span>
                  <div className="flex shrink-0 gap-1">
                    <button type="button" className="btn-ghost btn-sm px-1.5" aria-pressed={favs.includes(p.id)} aria-label={favs.includes(p.id) ? t("unfavourite") : t("favourite")} onClick={() => toggleFav(p.id)}>
                      <Heart className={`size-4 ${favs.includes(p.id) ? "fill-current text-accent-2" : ""}`} aria-hidden="true" />
                    </button>
                    <CopyButton value={p.colors.join(", ")} className="btn-ghost btn-sm px-1.5" />
                    <button type="button" className="btn-secondary btn-sm" onClick={() => use(p.id, p.colors)}>
                      {t("use")}
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Badge({ level, t }: { level: ReturnType<typeof wcagLevel>; t: ReturnType<typeof useTranslations> }) {
  const cls = level === "fail" ? "bg-danger-soft text-danger" : level === "AA-large" ? "bg-warning-soft text-warning" : "bg-success-soft text-success";
  return <span className={`ms-1 rounded px-1 py-0.5 text-[10px] font-semibold ${cls}`}>{t(`wcagShort.${level}`)}</span>;
}

// ---- Pattern generator ------------------------------------------------------------

export function PatternGenerator() {
  const t = useTranslations("patterns");
  const events = useToolEvents("pattern-generator");
  const [c, setC] = useState<PatternConfig>(DEFAULT_PATTERN);
  const [width, setWidth] = useState(1200);
  const [height, setHeight] = useState(800);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (patch: Partial<PatternConfig>) => setC((x) => ({ ...x, ...patch }));
  const preview = useMemo(() => patternSvg(c, 900, 520, "pattern-main"), [c]);
  const css = useMemo(() => patternCss(c), [c]);
  const fullSvg = () => patternSvg(c, width, height);

  const applyPalette = (colors: string[]) => {
    const rnd = seeded(Date.now() & 0xffff);
    const pick = () => colors[Math.floor(rnd() * colors.length)]!;
    const background = colors[0]!;
    let primary = pick();
    while (primary === background && colors.length > 1) primary = pick();
    let secondary = pick();
    while ((secondary === background || secondary === primary) && colors.length > 2) secondary = pick();
    set({ background, primary, secondary });
  };

  async function downloadPng() {
    setBusy(true);
    setError(null);
    try {
      const img = await rasterize(fullSvg(), width, height, 1, "image/png", 1, null);
      downloadBlob(img.blob, `pattern-${c.type}-${width}x${height}.png`);
      events.downloaded("png");
      events.complete({ format: "png" });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
      <div className="space-y-4">
        <div>
          <span className="label">{t("type")}</span>
          <div className="space-y-2">
            {(Object.entries(PATTERN_GROUPS) as [keyof typeof PATTERN_GROUPS, PatternType[]][]).map(([group, types]) => (
              <div key={group}>
                <p className="mb-1 text-xs text-muted">{t(`groups.${group}`)}</p>
                <div className="flex flex-wrap gap-1.5">
                  {types.map((type) => (
                    <button key={type} type="button" aria-pressed={c.type === type} className={`overflow-hidden rounded-lg border-2 ${c.type === type ? "border-accent-2" : "border-transparent"}`} onClick={() => set({ type })} title={t(`types.${type}`)} aria-label={t(`types.${type}`)}>
                      <span className="block size-12" dangerouslySetInnerHTML={{ __html: patternSvg({ ...c, type, size: Math.min(c.size, 24), rotation: 0 }, 48, 48, `pattern-thumb-${type}`) }} />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3">
          <ColorField label={t("background")} value={c.background} onChange={(v) => set({ background: v })} />
          <Toggle label={t("transparent")} checked={c.transparent} onChange={(v) => set({ transparent: v })} />
          <ColorField label={t("primary")} value={c.primary} onChange={(v) => set({ primary: v })} />
          <ColorField label={t("secondary")} value={c.secondary} onChange={(v) => set({ secondary: v })} />
        </div>
        <div>
          <label htmlFor="pat-palette" className="label">
            {t("fromPalette")}
          </label>
          <select id="pat-palette" className="input" defaultValue="" onChange={(e) => e.target.value && applyPalette(PALETTES.find((p) => p.id === e.target.value)!.colors)}>
            <option value="">{t("choosePalette")}</option>
            {PALETTES.map((p) => (
              <option key={p.id} value={p.id}>
                {t(`paletteCategories.${p.category}`)} {p.id.split("-")[1]} — {p.colors.slice(0, 3).join(" ")}
              </option>
            ))}
          </select>
        </div>
        <SliderField label={t("spacing")} value={c.size} min={8} max={240} onChange={(v) => set({ size: v })} format={(v) => `${v}px`} />
        <SliderField label={t("scale")} value={c.scale} min={5} max={100} onChange={(v) => set({ scale: v })} format={(v) => `${v}%`} />
        <SliderField label={t("stroke")} value={c.stroke} min={0.5} max={16} step={0.5} onChange={(v) => set({ stroke: v })} format={(v) => `${v}px`} />
        <SliderField label={t("rotation")} value={c.rotation} min={0} max={180} onChange={(v) => set({ rotation: v })} format={(v) => `${v}°`} />
        <SliderField label={t("opacity")} value={c.opacity} min={0.05} max={1} step={0.05} onChange={(v) => set({ opacity: v })} format={(v) => `${Math.round(v * 100)}%`} />
        {(c.type === "confetti" || c.type === "blobs" || c.type === "memphis") && (
          <button type="button" className="btn-secondary btn-sm" onClick={() => set({ seed: Math.floor(Math.random() * 100000) })}>
            <Shuffle className="size-4" aria-hidden="true" />
            {t("shuffle")}
          </button>
        )}
      </div>

      <div className="min-w-0 space-y-4">
        <div className="overflow-hidden rounded-xl border border-border" style={{ backgroundImage: c.transparent ? "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16'%3E%3Crect width='8' height='8' fill='%23e8e8e8'/%3E%3Crect x='8' y='8' width='8' height='8' fill='%23e8e8e8'/%3E%3C/svg%3E\")" : undefined }}>
          <div className="aspect-[900/520] w-full [&>svg]:h-full [&>svg]:w-full" role="img" aria-label={t("previewLabel", { type: t(`types.${c.type}`) })} dangerouslySetInnerHTML={{ __html: preview }} data-testid="pattern-preview" />
        </div>
        <div className="rounded-xl border border-border p-4">
          <h2 className="mb-3 font-semibold">{t("export")}</h2>
          <div className="mb-3 grid max-w-sm grid-cols-2 gap-2">
            <NumberField label={t("width")} value={width} min={16} max={8000} onChange={(v) => setWidth(Math.round(v))} suffix="px" />
            <NumberField label={t("height")} value={height} min={16} max={8000} onChange={(v) => setHeight(Math.round(v))} suffix="px" />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                downloadBlob(new Blob([fullSvg()], { type: "image/svg+xml" }), `pattern-${c.type}-${width}x${height}.svg`);
                events.downloaded("svg");
                events.complete({ format: "svg" });
              }}
            >
              <Download className="size-4" aria-hidden="true" />
              SVG
            </button>
            <button type="button" className="btn-primary" onClick={downloadPng} disabled={busy}>
              <Download className="size-4" aria-hidden="true" />
              PNG
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                downloadBlob(new Blob([`.pattern-background {\n${css}\n}\n`], { type: "text/css" }), `pattern-${c.type}.css`);
                events.downloaded("css");
                events.complete({ format: "css" });
              }}
            >
              <Download className="size-4" aria-hidden="true" />
              CSS
            </button>
          </div>
          {error && (
            <p role="alert" className="alert-error mt-3">
              {error}
            </p>
          )}
          <div className="mt-4">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-sm font-semibold">{t("cssCode")}</span>
              <CopyButton value={css} />
            </div>
            <pre className="max-h-40 overflow-auto rounded-lg bg-surface-2 p-3 text-xs break-all whitespace-pre-wrap" dir="ltr">
              <code>{css}</code>
            </pre>
          </div>
          <p className="mt-2 flex items-center gap-1 text-xs text-muted">
            <Copy className="size-3" aria-hidden="true" />
            {t("seamless")}
          </p>
        </div>
      </div>
    </div>
  );
}
