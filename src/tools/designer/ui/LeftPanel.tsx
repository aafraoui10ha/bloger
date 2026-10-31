"use client";

import { useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  AreaChart, BarChart3, BarChartHorizontal, CalendarRange, Copy, Donut, FilePlus2, FolderOpen, Gauge, ImagePlus, LayoutGrid, LineChart, PieChart, Radar,
  ScatterChart, Shuffle, SquareStack, Trash2, Trophy, Upload, type LucideIcon,
} from "lucide-react";
import { FONT_CATEGORIES, FONT_PAIRINGS, FONTS, fontStack, getFont } from "../fonts";
import { harmony, HARMONIES, randomPalette, type Harmony } from "@/tools/logic/color";
import { CANVAS_PRESETS, CHART_KINDS, type ChartKind, type Doc, type ShapeKind, type TextRole } from "../model";
import { PALETTE_CATEGORIES, PALETTES, type PaletteCategory } from "../palettes";
import { buildTemplate, TEMPLATE_IDS, type TemplateId } from "../templates";
import { DocSvg } from "../render";
import type { Measure } from "../format";
import type { Asset, ProjectSummary } from "../storage";
import { IconPicker } from "./IconPicker";

export const TABS = ["templates", "charts", "elements", "text", "colors", "uploads", "projects"] as const;
export type Tab = (typeof TABS)[number];

export const CHART_ICONS: Record<ChartKind, LucideIcon> = {
  bar: BarChart3, hbar: BarChartHorizontal, line: LineChart, area: AreaChart, pie: PieChart, doughnut: Donut, radar: Radar, scatter: ScatterChart,
  comparison: SquareStack, progress: Gauge, kpi: Trophy, timeline: CalendarRange, infographic: LayoutGrid,
};

type Props = {
  tab: Tab;
  doc: Doc;
  measure: Measure;
  locale: string;
  projects: ProjectSummary[];
  assets: Asset[];
  storageOk: boolean;
  onTemplate: (id: TemplateId, width: number, height: number) => void;
  onBlank: (width: number, height: number) => void;
  onAddChart: (kind: ChartKind) => void;
  onAddShape: (shape: ShapeKind) => void;
  onAddIcon: (name: string) => void;
  onAddText: (role: TextRole, font?: string) => void;
  onPairing: (heading: string, body: string) => void;
  onFontForSelection: (font: string) => boolean;
  onApplyPalette: (colors: string[]) => void;
  onUpload: (files: FileList) => void;
  onAddAsset: (a: Asset) => void;
  onDeleteAsset: (id: string) => void;
  onOpenProject: (id: string) => void;
  onDuplicateProject: (id: string) => void;
  onDeleteProject: (id: string) => void;
  uploadError: string | null;
};

export function LeftPanel(p: Props) {
  switch (p.tab) {
    case "templates":
      return <TemplatesTab {...p} />;
    case "charts":
      return <ChartsTab {...p} />;
    case "elements":
      return <ElementsTab {...p} />;
    case "text":
      return <TextTab {...p} />;
    case "colors":
      return <ColorsTab {...p} />;
    case "uploads":
      return <UploadsTab {...p} />;
    case "projects":
      return <ProjectsTab {...p} />;
  }
}

function Heading({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">{children}</h3>;
}

function TemplatesTab({ doc, locale, measure, onTemplate, onBlank }: Props) {
  const t = useTranslations("designer");
  const [size, setSize] = useState(() => CANVAS_PRESETS.find((x) => x.width === doc.width && x.height === doc.height)?.id ?? "instagramPost");
  const preset = CANVAS_PRESETS.find((x) => x.id === size) ?? CANVAS_PRESETS[0]!;
  const previews = useMemo(() => TEMPLATE_IDS.map((id) => buildTemplate(id, preset.width, preset.height, locale, t(`templates.names.${id}`))), [preset.width, preset.height, locale, t]);
  return (
    <div className="space-y-3">
      <div>
        <label htmlFor="tpl-size" className="mb-1 block text-xs text-muted">
          {t("templates.size")}
        </label>
        <select id="tpl-size" className="input h-9 py-1 text-sm" value={size} onChange={(e) => setSize(e.target.value)}>
          {CANVAS_PRESETS.map((pr) => (
            <option key={pr.id} value={pr.id}>
              {t(`presets.${pr.id}`)} · {pr.width}×{pr.height}
            </option>
          ))}
        </select>
      </div>
      <button type="button" className="btn-secondary btn-sm w-full justify-center" onClick={() => onBlank(preset.width, preset.height)}>
        <FilePlus2 className="size-4" aria-hidden="true" />
        {t("templates.blank")}
      </button>
      <div className="grid grid-cols-2 gap-2">
        {previews.map((d, i) => {
          const id = TEMPLATE_IDS[i]!;
          const k = 128 / Math.max(d.width, d.height);
          return (
            <button key={id} type="button" className="group rounded-lg border border-border p-1.5 text-start hover:border-accent-2" onClick={() => onTemplate(id, preset.width, preset.height)} aria-label={t("templates.use", { name: t(`templates.names.${id}`) })}>
              <span className="grid h-32 place-items-center overflow-hidden rounded bg-surface-2">
                <span className="pointer-events-none block shadow-sm">
                  <DocSvg doc={d} measure={measure} displayWidth={d.width * k} displayHeight={d.height * k} title={t(`templates.names.${id}`)} />
                </span>
              </span>
              <span className="mt-1 block truncate text-xs font-medium">{t(`templates.names.${id}`)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ChartsTab({ onAddChart }: Props) {
  const t = useTranslations("designer");
  return (
    <div>
      <Heading>{t("charts.heading")}</Heading>
      <p className="mb-3 text-xs text-muted">{t("charts.hint")}</p>
      <div className="grid grid-cols-2 gap-2">
        {CHART_KINDS.map((k) => {
          const Icon = CHART_ICONS[k];
          return (
            <button key={k} type="button" className="flex flex-col items-center gap-1.5 rounded-lg border border-border p-3 text-xs font-medium hover:border-accent-2 hover:bg-accent-soft" onClick={() => onAddChart(k)}>
              <Icon className="size-6 text-accent-2" aria-hidden="true" />
              {t(`chartKinds.${k}`)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const SHAPE_PREVIEW: Record<ShapeKind, React.ReactNode> = {
  rect: <rect x="6" y="10" width="36" height="28" rx="5" />,
  ellipse: <ellipse cx="24" cy="24" rx="18" ry="14" />,
  triangle: <path d="M24 8L42 40H6Z" />,
  line: <rect x="4" y="22" width="40" height="4" rx="2" />,
  star: <path d="M24 6l5 12 13 1-10 8 3 13-11-7-11 7 3-13-10-8 13-1z" />,
  ring: <circle cx="24" cy="24" r="14" fill="none" stroke="currentColor" strokeWidth="6" />,
  arc: <path d="M6 36A18 18 0 0 1 42 36Z" />,
  wave: <path d="M4 24q5-10 10 0t10 0 10 0 10 0" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />,
  dots: (
    <g>
      {[12, 24, 36].flatMap((x) => [14, 26, 38].map((y) => <circle key={`${x}-${y}`} cx={x} cy={y} r="3" />))}
    </g>
  ),
  blob: <path d="M24 6c10 0 18 7 17 17s-8 19-18 18S5 34 6 23 14 6 24 6z" />,
};

function ElementsTab({ onAddShape, onAddIcon }: Props) {
  const t = useTranslations("designer");
  return (
    <div className="space-y-4">
      <div>
        <Heading>{t("elements.shapes")}</Heading>
        <div className="grid grid-cols-4 gap-2">
          {(Object.keys(SHAPE_PREVIEW) as ShapeKind[]).map((s) => (
            <button key={s} type="button" title={t(`shapes.${s}`)} aria-label={t("elements.add", { name: t(`shapes.${s}`) })} className="grid aspect-square place-items-center rounded-lg border border-border text-accent-2 hover:border-accent-2 hover:bg-accent-soft" onClick={() => onAddShape(s)}>
              <svg viewBox="0 0 48 48" className="size-8" fill="currentColor" aria-hidden="true">
                {SHAPE_PREVIEW[s]}
              </svg>
            </button>
          ))}
        </div>
      </div>
      <div>
        <Heading>{t("elements.icons")}</Heading>
        <IconPicker onPick={onAddIcon} />
      </div>
    </div>
  );
}

function TextTab({ onAddText, onPairing, onFontForSelection }: Props) {
  const t = useTranslations("designer");
  const [notice, setNotice] = useState<string | null>(null);
  const presets: { role: TextRole; cls: string }[] = [
    { role: "title", cls: "text-xl font-extrabold" },
    { role: "subtitle", cls: "text-base font-semibold" },
    { role: "body", cls: "text-sm" },
    { role: "caption", cls: "text-xs text-muted" },
  ];
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Heading>{t("text.add")}</Heading>
        {presets.map((pr) => (
          <button key={pr.role} type="button" className={`block w-full rounded-lg border border-border px-3 py-2 text-start hover:border-accent-2 ${pr.cls}`} onClick={() => onAddText(pr.role)}>
            {t(`text.presets.${pr.role}`)}
          </button>
        ))}
      </div>
      <div>
        <Heading>{t("text.pairings")}</Heading>
        <p className="mb-2 text-xs text-muted">{t("text.pairingsHint")}</p>
        <div className="space-y-2">
          {FONT_PAIRINGS.map((pair) => (
            <button key={pair.id} type="button" className="block w-full rounded-lg border border-border px-3 py-2 text-start hover:border-accent-2" onClick={() => onPairing(pair.heading, pair.body)}>
              <span className="block text-lg leading-tight font-bold" style={{ fontFamily: fontStack(pair.heading) }}>
                {getFont(pair.heading).family}
              </span>
              <span className="block text-xs text-muted" style={{ fontFamily: fontStack(pair.body) }}>
                {getFont(pair.body).family} · {t(`text.pairingNames.${pair.id}`)}
              </span>
            </button>
          ))}
        </div>
      </div>
      <div>
        <Heading>{t("text.fonts")}</Heading>
        <p className="mb-2 text-xs text-muted">{t("text.fontsHint")}</p>
        {notice && (
          <p role="status" className="mb-2 text-xs text-success">
            {notice}
          </p>
        )}
        {FONT_CATEGORIES.map((c) => (
          <div key={c} className="mb-3">
            <p className="mb-1 text-xs font-semibold">{t(`fontCategories.${c}`)}</p>
            <div className="space-y-1">
              {FONTS.filter((f) => f.category === c).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className="block w-full truncate rounded-md px-2 py-1.5 text-start text-base hover:bg-surface-2"
                  style={{ fontFamily: fontStack(f.id) }}
                  onClick={() => {
                    if (onFontForSelection(f.id)) setNotice(t("text.fontApplied", { font: f.family }));
                    else onAddText("body", f.id);
                  }}
                >
                  {f.family} {f.subsets.includes("arabic") ? "· أبجد" : "· Aa"}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Swatches({ colors, onClick, label }: { colors: string[]; onClick: () => void; label: string }) {
  return (
    <button type="button" className="flex w-full overflow-hidden rounded-md border border-border hover:ring-2 hover:ring-accent-2" onClick={onClick} aria-label={label} title={colors.join(" ")}>
      {colors.map((c, i) => (
        <span key={i} className="h-8 flex-1" style={{ backgroundColor: c }} />
      ))}
    </button>
  );
}

function ColorsTab({ onApplyPalette }: Props) {
  const t = useTranslations("designer");
  const [cat, setCat] = useState<PaletteCategory | "all">("all");
  const [base, setBase] = useState("#8A2A78");
  const [kind, setKind] = useState<Harmony>("analogous");
  const [random, setRandom] = useState<string[]>(() => randomPalette());
  const list = PALETTES.filter((x) => cat === "all" || x.category === cat);
  return (
    <div className="space-y-4">
      <p className="text-xs text-muted">{t("colors.hint")}</p>
      <div>
        <Heading>{t("colors.random")}</Heading>
        <div className="flex gap-2">
          <Swatches colors={random} onClick={() => onApplyPalette(random)} label={t("colors.applyColors", { colors: random.join(", ") })} />
          <button type="button" className="btn-secondary btn-sm shrink-0" onClick={() => setRandom(randomPalette())} aria-label={t("colors.shuffle")}>
            <Shuffle className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>
      <div>
        <Heading>{t("colors.harmony")}</Heading>
        <div className="flex gap-2">
          <input type="color" aria-label={t("colors.baseColor")} value={base} onChange={(e) => setBase(e.target.value.toUpperCase())} className="h-9 w-10 shrink-0 rounded-md border border-border-strong bg-surface p-0.5" />
          <select className="input h-9 py-1 text-sm" aria-label={t("colors.harmonyType")} value={kind} onChange={(e) => setKind(e.target.value as Harmony)}>
            {HARMONIES.map((h) => (
              <option key={h} value={h}>
                {t(`harmonies.${h}`)}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-2">
          <Swatches colors={harmony(base, kind)} onClick={() => onApplyPalette(harmony(base, kind))} label={t("colors.applyColors", { colors: harmony(base, kind).join(", ") })} />
        </div>
      </div>
      <div>
        <Heading>{t("colors.library")}</Heading>
        <select className="input mb-2 h-9 py-1 text-sm" aria-label={t("colors.category")} value={cat} onChange={(e) => setCat(e.target.value as PaletteCategory | "all")}>
          <option value="all">{t("colors.all")}</option>
          {PALETTE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {t(`paletteCategories.${c}`)}
            </option>
          ))}
        </select>
        <div className="space-y-2">
          {list.map((pal) => (
            <Swatches key={pal.id} colors={pal.colors} onClick={() => onApplyPalette(pal.colors)} label={t("colors.applyPalette", { name: `${t(`paletteCategories.${pal.category}`)} ${pal.id.split("-")[1]}` })} />
          ))}
        </div>
      </div>
    </div>
  );
}

function UploadsTab({ assets, onUpload, onAddAsset, onDeleteAsset, uploadError }: Props) {
  const t = useTranslations("designer.uploads");
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className="space-y-3">
      <input ref={input} type="file" multiple accept="image/png,image/jpeg,image/webp,image/svg+xml" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => e.target.files?.length && onUpload(e.target.files)} />
      <button type="button" className="btn-primary w-full justify-center" onClick={() => input.current?.click()}>
        <Upload className="size-4" aria-hidden="true" />
        {t("upload")}
      </button>
      <p className="text-xs text-muted">{t("hint")}</p>
      {uploadError && (
        <p role="alert" className="text-xs text-danger">
          {uploadError}
        </p>
      )}
      {assets.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted">
          <ImagePlus className="mx-auto mb-1 size-6" aria-hidden="true" />
          {t("empty")}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {assets.map((a) => (
            <div key={a.id} className="group relative rounded-lg border border-border p-1">
              <button type="button" className="block w-full" onClick={() => onAddAsset(a)} aria-label={t("add", { name: a.name })}>
                {/* eslint-disable-next-line @next/next/no-img-element -- local data URL */}
                <img src={a.src} alt="" className="h-20 w-full rounded object-contain" />
                <span className="mt-1 block truncate text-xs">{a.name}</span>
              </button>
              <button type="button" className="absolute end-1 top-1 rounded bg-surface/90 p-1 text-danger" aria-label={t("delete", { name: a.name })} onClick={() => onDeleteAsset(a.id)}>
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ProjectsTab({ doc, locale, projects, storageOk, onOpenProject, onDuplicateProject, onDeleteProject, onBlank }: Props) {
  const t = useTranslations("designer.projects");
  const [confirm, setConfirm] = useState<string | null>(null);
  const dateFmt = useMemo(() => new Intl.DateTimeFormat(locale === "ar" ? "ar-u-nu-latn" : locale, { dateStyle: "medium", timeStyle: "short" }), [locale]);
  return (
    <div className="space-y-3">
      <button type="button" className="btn-primary w-full justify-center" onClick={() => onBlank(doc.width, doc.height)}>
        <FilePlus2 className="size-4" aria-hidden="true" />
        {t("new")}
      </button>
      <p className={`text-xs ${storageOk ? "text-muted" : "text-warning"}`}>{storageOk ? t("savedLocally") : t("notPersistent")}</p>
      <ul className="space-y-2">
        {projects.map((pr) => (
          <li key={pr.id} className={`rounded-lg border p-2 ${pr.id === doc.id ? "border-accent-2 bg-accent-soft" : "border-border"}`}>
            <p className="truncate text-sm font-medium">{pr.name}</p>
            <p className="text-xs text-muted">
              {pr.width}×{pr.height} · {t("elements", { count: pr.elements })} · {dateFmt.format(pr.updatedAt)}
            </p>
            <div className="mt-2 flex flex-wrap gap-1">
              <button type="button" className="btn-secondary btn-sm" disabled={pr.id === doc.id} onClick={() => onOpenProject(pr.id)}>
                <FolderOpen className="size-3.5" aria-hidden="true" />
                {pr.id === doc.id ? t("current") : t("open")}
              </button>
              <button type="button" className="btn-ghost btn-sm" onClick={() => onDuplicateProject(pr.id)}>
                <Copy className="size-3.5" aria-hidden="true" />
                {t("duplicate")}
              </button>
              {confirm === pr.id ? (
                <button type="button" className="btn-danger btn-sm" onClick={() => (onDeleteProject(pr.id), setConfirm(null))}>
                  {t("confirmDelete")}
                </button>
              ) : (
                <button type="button" className="btn-ghost btn-sm text-danger" onClick={() => setConfirm(pr.id)}>
                  <Trash2 className="size-3.5" aria-hidden="true" />
                  {t("delete")}
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
