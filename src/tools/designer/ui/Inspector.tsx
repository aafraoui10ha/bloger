"use client";

import { useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  AlignCenter, AlignCenterHorizontal, AlignCenterVertical, AlignEndHorizontal, AlignEndVertical, AlignLeft, AlignRight, AlignStartHorizontal, AlignStartVertical,
  ArrowDownToLine, ArrowUpToLine, ChevronDown, ChevronUp, Copy, Lock, Trash2, Unlock,
} from "lucide-react";
import { FONT_CATEGORIES, FONTS, getFont } from "../fonts";
import { CHART_KINDS, CANVAS_PRESETS, MAX_SIZE, MIN_SIZE, type ChartEl, type Doc, type El, type IconEl, type ImageEl, type ShapeEl, type ShapeKind, type TextEl } from "../model";
import { PALETTES } from "../palettes";
import { DEFAULT_PATTERN, PATTERN_TYPES, type PatternConfig } from "../patterns";
import { changeKind, VARIANTS } from "../factories";
import { ColorField, NumberField, Row, Section, Segmented, SelectField, SliderField, TextField, Toggle } from "./controls";
import { DataEditor } from "./DataEditor";
import { IconPicker } from "./IconPicker";

type Props = {
  doc: Doc;
  selected: El | null;
  onPatch: (patch: Partial<El>, mergeKey?: string) => void;
  onDoc: (fn: (d: Doc) => Doc, mergeKey?: string) => void;
  onSelect: (id: string | null) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onLayer: (dir: "front" | "forward" | "backward" | "back") => void;
  onResize: (w: number, h: number) => void;
  onReplaceImage: (file: File) => void;
  textRef: React.RefObject<HTMLTextAreaElement | null>;
};

export function Inspector(p: Props) {
  const t = useTranslations("designer.inspector");
  return p.selected ? <ElementInspector {...p} el={p.selected} /> : <DocInspector {...p} t={t} />;
}

function FontSelect({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const t = useTranslations("designer");
  return (
    <div>
      <label className="mb-1 block text-xs text-muted" htmlFor="font-select">
        {t("inspector.font")}
      </label>
      <select id="font-select" className="input h-9 py-1 text-sm" value={value} onChange={(e) => onChange(e.target.value)}>
        {FONT_CATEGORIES.map((c) => (
          <optgroup key={c} label={t(`fontCategories.${c}`)}>
            {FONTS.filter((f) => f.category === c).map((f) => (
              <option key={f.id} value={f.id}>
                {f.family}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </div>
  );
}

function DocInspector({ doc, onDoc, onSelect, onResize, t }: Props & { t: ReturnType<typeof useTranslations> }) {
  const tp = useTranslations("designer.presets");
  const tl = useTranslations("designer.layers");
  const tpt = useTranslations("designer.patternTypes");
  const preset = CANVAS_PRESETS.find((x) => x.width === doc.width && x.height === doc.height)?.id ?? "custom";
  const pattern = doc.background.pattern;
  const setPattern = (patch: Partial<PatternConfig> | null, key?: string) =>
    onDoc((d) => ({ ...d, background: { ...d.background, pattern: patch === null ? null : { ...(d.background.pattern ?? { ...DEFAULT_PATTERN, transparent: true, primary: "#000000", secondary: "#000000", opacity: 0.12 }), ...patch } } }), key);
  return (
    <div>
      <p className="mb-2 rounded-lg bg-surface-2 p-2 text-xs text-muted">{t("nothingSelected")}</p>
      <Section title={t("document")}>
        <TextField label={t("name")} value={doc.name} onChange={(v) => onDoc((d) => ({ ...d, name: v }), "doc-name")} />
        <SelectField
          label={t("canvasSize")}
          value={preset}
          onChange={(v) => {
            const pr = CANVAS_PRESETS.find((x) => x.id === v);
            if (pr) onResize(pr.width, pr.height);
          }}
          options={[...CANVAS_PRESETS.map((pr) => ({ value: pr.id, label: `${tp(pr.id)} · ${pr.width}×${pr.height}` })), { value: "custom", label: tp("custom") }]}
        />
        <Row>
          <NumberField label={t("width")} value={doc.width} min={MIN_SIZE} max={MAX_SIZE} onChange={(v) => onResize(v, doc.height)} suffix="px" />
          <NumberField label={t("height")} value={doc.height} min={MIN_SIZE} max={MAX_SIZE} onChange={(v) => onResize(doc.width, v)} suffix="px" />
        </Row>
      </Section>
      <Section title={t("background")}>
        <ColorField label={t("backgroundColor")} value={doc.background.color} onChange={(v) => onDoc((d) => ({ ...d, background: { ...d.background, color: v } }), "bg-color")} />
        <Toggle label={t("transparentBackground")} checked={doc.background.transparent} onChange={(v) => onDoc((d) => ({ ...d, background: { ...d.background, transparent: v } }))} />
        <SelectField
          label={t("pattern")}
          value={pattern?.type ?? "none"}
          onChange={(v) => setPattern(v === "none" ? null : { type: v as PatternConfig["type"] })}
          options={[{ value: "none", label: t("noPattern") }, ...PATTERN_TYPES.map((x) => ({ value: x, label: tpt(x) }))]}
        />
        {pattern && (
          <>
            <Row>
              <ColorField label={t("patternColor")} value={pattern.primary} onChange={(v) => setPattern({ primary: v }, "pat-p")} />
              <ColorField label={t("patternColor2")} value={pattern.secondary} onChange={(v) => setPattern({ secondary: v }, "pat-s")} />
            </Row>
            <SliderField label={t("patternSize")} value={pattern.size} min={8} max={240} onChange={(v) => setPattern({ size: v }, "pat-size")} />
            <SliderField label={t("patternScale")} value={pattern.scale} min={5} max={100} onChange={(v) => setPattern({ scale: v }, "pat-scale")} />
            <SliderField label={t("patternStroke")} value={pattern.stroke} min={0.5} max={12} step={0.5} onChange={(v) => setPattern({ stroke: v }, "pat-stroke")} />
            <SliderField label={t("rotation")} value={pattern.rotation} min={0} max={180} onChange={(v) => setPattern({ rotation: v }, "pat-rot")} format={(v) => `${v}°`} />
            <SliderField label={t("opacity")} value={pattern.opacity} min={0.05} max={1} step={0.05} onChange={(v) => setPattern({ opacity: v }, "pat-op")} format={(v) => `${Math.round(v * 100)}%`} />
          </>
        )}
      </Section>
      <Section title={tl("title")}>
        {doc.elements.length === 0 ? (
          <p className="text-xs text-muted">{tl("empty")}</p>
        ) : (
          <ul className="space-y-1">
            {[...doc.elements].reverse().map((el) => (
              <li key={el.id}>
                <button type="button" className="w-full truncate rounded-md px-2 py-1.5 text-start text-sm hover:bg-surface-2" onClick={() => onSelect(el.id)}>
                  {layerName(el, tl)}
                </button>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

export function layerName(el: El, tl: ReturnType<typeof useTranslations>): string {
  if (el.type === "text") return `${tl("text")}: ${el.text.slice(0, 32) || "…"}`;
  if (el.type === "chart") return `${tl("chart")}: ${el.rows[0]?.label ?? ""}…`;
  return tl(el.type);
}

function ElementInspector({ el, doc, onPatch, onDuplicate, onDelete, onLayer, onReplaceImage, textRef }: Props & { el: El }) {
  const t = useTranslations("designer.inspector");
  const align = (pos: "left" | "hcenter" | "right" | "top" | "vcenter" | "bottom") => {
    const patch: Partial<El> = {};
    if (pos === "left") patch.x = 0;
    if (pos === "hcenter") patch.x = (doc.width - el.w) / 2;
    if (pos === "right") patch.x = doc.width - el.w;
    if (pos === "top") patch.y = 0;
    if (pos === "vcenter") patch.y = (doc.height - el.h) / 2;
    if (pos === "bottom") patch.y = doc.height - el.h;
    onPatch(patch);
  };
  return (
    <div>
      <div className="flex flex-wrap gap-1 pb-3">
        <button type="button" className="btn-secondary btn-sm" onClick={onDuplicate}>
          <Copy className="size-3.5" aria-hidden="true" />
          {t("duplicate")}
        </button>
        <button type="button" className="btn-secondary btn-sm" onClick={() => onPatch({ locked: !el.locked })} aria-pressed={!!el.locked}>
          {el.locked ? <Unlock className="size-3.5" aria-hidden="true" /> : <Lock className="size-3.5" aria-hidden="true" />}
          {el.locked ? t("unlock") : t("lock")}
        </button>
        <button type="button" className="btn-danger btn-sm" onClick={onDelete}>
          <Trash2 className="size-3.5" aria-hidden="true" />
          {t("delete")}
        </button>
      </div>

      {el.type === "text" && <TextProps el={el} onPatch={onPatch} textRef={textRef} />}
      {el.type === "chart" && <ChartProps el={el} onPatch={onPatch} locale={doc.locale} />}
      {el.type === "shape" && <ShapeProps el={el} onPatch={onPatch} />}
      {el.type === "icon" && <IconProps el={el} onPatch={onPatch} />}
      {el.type === "image" && <ImageProps el={el} onPatch={onPatch} onReplace={onReplaceImage} />}

      <Section title={t("arrange")}>
        <Row>
          <NumberField label="X" value={el.x} onChange={(v) => onPatch({ x: v }, `x-${el.id}`)} />
          <NumberField label="Y" value={el.y} onChange={(v) => onPatch({ y: v }, `y-${el.id}`)} />
          <NumberField label={t("width")} value={el.w} min={4} onChange={(v) => onPatch({ w: v }, `w-${el.id}`)} />
          {el.type !== "text" && <NumberField label={t("height")} value={el.h} min={4} onChange={(v) => onPatch({ h: v }, `h-${el.id}`)} />}
        </Row>
        <SliderField label={t("rotation")} value={el.rotation} min={-180} max={180} onChange={(v) => onPatch({ rotation: v }, `rot-${el.id}`)} format={(v) => `${v}°`} />
        <SliderField label={t("opacity")} value={el.opacity} min={0} max={1} step={0.05} onChange={(v) => onPatch({ opacity: v }, `op-${el.id}`)} format={(v) => `${Math.round(v * 100)}%`} />
        <div>
          <span className="mb-1 block text-xs text-muted">{t("alignToPage")}</span>
          <div className="grid grid-cols-6 gap-1">
            {(
              [
                ["left", AlignStartVertical],
                ["hcenter", AlignCenterVertical],
                ["right", AlignEndVertical],
                ["top", AlignStartHorizontal],
                ["vcenter", AlignCenterHorizontal],
                ["bottom", AlignEndHorizontal],
              ] as const
            ).map(([pos, Icon]) => (
              <button key={pos} type="button" className="btn-ghost btn-sm justify-center px-0" title={t(`align.${pos}`)} aria-label={t(`align.${pos}`)} onClick={() => align(pos)}>
                <Icon className="size-4" aria-hidden="true" />
              </button>
            ))}
          </div>
        </div>
        <div>
          <span className="mb-1 block text-xs text-muted">{t("layer")}</span>
          <div className="grid grid-cols-4 gap-1">
            {(
              [
                ["front", ArrowUpToLine],
                ["forward", ChevronUp],
                ["backward", ChevronDown],
                ["back", ArrowDownToLine],
              ] as const
            ).map(([dir, Icon]) => (
              <button key={dir} type="button" className="btn-ghost btn-sm justify-center px-0" title={t(`order.${dir}`)} aria-label={t(`order.${dir}`)} onClick={() => onLayer(dir)}>
                <Icon className="size-4" aria-hidden="true" />
              </button>
            ))}
          </div>
        </div>
      </Section>
    </div>
  );
}

function TextProps({ el, onPatch, textRef }: { el: TextEl; onPatch: Props["onPatch"]; textRef: Props["textRef"] }) {
  const t = useTranslations("designer.inspector");
  const font = getFont(el.font);
  return (
    <Section title={t("text")}>
      <div>
        <label htmlFor="text-content" className="mb-1 block text-xs text-muted">
          {t("content")}
        </label>
        <textarea id="text-content" ref={textRef} className="input min-h-20 text-sm" dir="auto" value={el.text} onChange={(e) => onPatch({ text: e.target.value } as Partial<TextEl>, `text-${el.id}`)} />
      </div>
      <FontSelect value={el.font} onChange={(id) => onPatch({ font: id } as Partial<TextEl>)} />
      <Row>
        <SelectField label={t("weight")} value={String(el.weight)} onChange={(v) => onPatch({ weight: Number(v) } as Partial<TextEl>)} options={[...new Set([...font.weights, el.weight])].sort((a, b) => a - b).map((w) => ({ value: String(w), label: `${w} · ${t(`weights.w${Math.round(w / 100) * 100}`)}` }))} />
        <NumberField label={t("size")} value={el.size} min={4} max={1000} onChange={(v) => onPatch({ size: v } as Partial<TextEl>, `size-${el.id}`)} suffix="px" />
      </Row>
      <ColorField label={t("color")} value={el.color} onChange={(v) => onPatch({ color: v } as Partial<TextEl>, `color-${el.id}`)} />
      <Segmented
        label={t("alignment")}
        value={el.align}
        onChange={(v) => onPatch({ align: v } as Partial<TextEl>)}
        options={[
          { value: "left", label: t("alignLeft"), icon: <AlignLeft className="size-4" /> },
          { value: "center", label: t("alignCenter"), icon: <AlignCenter className="size-4" /> },
          { value: "right", label: t("alignRight"), icon: <AlignRight className="size-4" /> },
        ]}
      />
      <SliderField label={t("lineHeight")} value={el.lineHeight} min={0.8} max={2.5} step={0.05} onChange={(v) => onPatch({ lineHeight: v } as Partial<TextEl>, `lh-${el.id}`)} />
      <SliderField label={t("letterSpacing")} value={el.letterSpacing} min={-5} max={30} step={0.5} onChange={(v) => onPatch({ letterSpacing: v } as Partial<TextEl>, `ls-${el.id}`)} />
      <Segmented
        label={t("direction")}
        value={el.dir}
        onChange={(v) => onPatch({ dir: v } as Partial<TextEl>)}
        options={[
          { value: "auto", label: t("dirAuto") },
          { value: "ltr", label: t("dirLtr") },
          { value: "rtl", label: t("dirRtl") },
        ]}
      />
      <Row>
        <SelectField label={t("role")} value={el.role} onChange={(v) => onPatch({ role: v } as Partial<TextEl>)} options={(["title", "subtitle", "body", "caption"] as const).map((r) => ({ value: r, label: t(`roles.${r}`) }))} />
        <div className="flex items-end pb-2">
          <Toggle label={t("uppercase")} checked={!!el.uppercase} onChange={(v) => onPatch({ uppercase: v } as Partial<TextEl>)} />
        </div>
      </Row>
    </Section>
  );
}

const SHAPES: ShapeKind[] = ["rect", "ellipse", "triangle", "line", "star", "ring", "arc", "wave", "dots", "blob"];

function ShapeProps({ el, onPatch }: { el: ShapeEl; onPatch: Props["onPatch"] }) {
  const t = useTranslations("designer");
  const outline = el.shape === "line" || el.shape === "ring" || el.shape === "wave";
  return (
    <Section title={t("inspector.shape")}>
      <SelectField label={t("inspector.shapeType")} value={el.shape} onChange={(v) => onPatch({ shape: v } as Partial<ShapeEl>)} options={SHAPES.map((s) => ({ value: s, label: t(`shapes.${s}`) }))} />
      <ColorField label={outline ? t("inspector.color") : t("inspector.fill")} value={el.fill} allowNone={!outline} noneLabel={t("inspector.noFill")} onChange={(v) => onPatch({ fill: v } as Partial<ShapeEl>, `fill-${el.id}`)} />
      {!outline && el.shape !== "dots" && (
        <Row>
          <ColorField label={t("inspector.stroke")} value={el.stroke} onChange={(v) => onPatch({ stroke: v } as Partial<ShapeEl>, `stroke-${el.id}`)} />
          <NumberField label={t("inspector.strokeWidth")} value={el.strokeWidth} min={0} max={200} onChange={(v) => onPatch({ strokeWidth: v } as Partial<ShapeEl>, `sw-${el.id}`)} />
        </Row>
      )}
      {outline && <NumberField label={t("inspector.thickness")} value={el.strokeWidth} min={0} max={400} onChange={(v) => onPatch({ strokeWidth: v } as Partial<ShapeEl>, `sw-${el.id}`)} />}
      {(el.shape === "rect" || el.shape === "dots" || el.shape === "line") && (
        <SliderField label={el.shape === "dots" ? t("inspector.dotSpacing") : el.shape === "line" ? t("inspector.roundEnds") : t("inspector.cornerRadius")} value={el.radius} min={0} max={el.shape === "line" ? 1 : 300} onChange={(v) => onPatch({ radius: v } as Partial<ShapeEl>, `rad-${el.id}`)} />
      )}
    </Section>
  );
}

function IconProps({ el, onPatch }: { el: IconEl; onPatch: Props["onPatch"] }) {
  const t = useTranslations("designer.inspector");
  return (
    <Section title={t("icon")}>
      <ColorField label={t("color")} value={el.color} onChange={(v) => onPatch({ color: v } as Partial<IconEl>, `color-${el.id}`)} />
      <SliderField label={t("strokeWidth")} value={el.strokeWidth} min={0.5} max={4} step={0.25} onChange={(v) => onPatch({ strokeWidth: v } as Partial<IconEl>, `isw-${el.id}`)} />
      <IconPicker value={el.icon} onPick={(name) => onPatch({ icon: name } as Partial<IconEl>)} compact />
    </Section>
  );
}

function ImageProps({ el, onPatch, onReplace }: { el: ImageEl; onPatch: Props["onPatch"]; onReplace: (f: File) => void }) {
  const t = useTranslations("designer.inspector");
  const input = useRef<HTMLInputElement>(null);
  return (
    <Section title={t("image")}>
      <Segmented label={t("fit")} value={el.fit} onChange={(v) => onPatch({ fit: v } as Partial<ImageEl>)} options={[{ value: "contain", label: t("fitContain") }, { value: "cover", label: t("fitCover") }]} />
      <SliderField label={t("cornerRadius")} value={el.radius} min={0} max={Math.round(Math.min(el.w, el.h) / 2)} onChange={(v) => onPatch({ radius: v } as Partial<ImageEl>, `irad-${el.id}`)} />
      <input ref={input} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => e.target.files?.[0] && onReplace(e.target.files[0])} />
      <button type="button" className="btn-secondary btn-sm" onClick={() => input.current?.click()}>
        {t("replaceImage")}
      </button>
    </Section>
  );
}

function ChartProps({ el, onPatch, locale }: { el: ChartEl; onPatch: Props["onPatch"]; locale: string }) {
  const t = useTranslations("designer");
  const ti = useTranslations("designer.inspector");
  const [paletteId, setPaletteId] = useState("");
  const patch = (x: Partial<ChartEl>, key?: string) => onPatch(x as Partial<El>, key);
  const colorCount = el.colorByRow || el.kind === "pie" || el.kind === "doughnut" ? el.rows.length : Math.max(1, el.series.length);
  const colorLabels = useMemo(() => (el.colorByRow || el.kind === "pie" || el.kind === "doughnut" ? el.rows.map((r) => r.label) : el.series), [el]);
  const cartesian = ["bar", "hbar", "line", "area", "scatter", "radar"].includes(el.kind);
  const variants = VARIANTS[el.kind];
  return (
    <>
      <Section title={ti("chart")}>
        <SelectField label={ti("chartType")} value={el.kind} onChange={(k) => patch(changeKind(el, k, locale))} options={CHART_KINDS.map((k) => ({ value: k, label: t(`chartKinds.${k}`) }))} />
        {variants && <Segmented label={ti("layout")} value={el.variant || variants[0]!} onChange={(v) => patch({ variant: v })} options={variants.map((v) => ({ value: v, label: t(`variants.${v}`) }))} />}
      </Section>
      <Section title={ti("data")}>
        <DataEditor el={el} onChange={(x, key) => patch(x, key)} />
      </Section>
      <Section title={ti("colors")}>
        <SelectField
          label={ti("applyPalette")}
          value={paletteId}
          onChange={(id) => {
            setPaletteId(id);
            const pal = PALETTES.find((x) => x.id === id);
            if (pal) patch({ colors: pal.colors });
          }}
          options={[{ value: "", label: ti("choosePalette") }, ...PALETTES.map((x) => ({ value: x.id, label: `${t(`paletteCategories.${x.category}`)} ${x.id.split("-")[1]}` }))]}
        />
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: Math.min(colorCount, 12) }, (_, i) => (
            <ColorField
              key={i}
              label={colorLabels[i] || `${i + 1}`}
              value={el.colors[i % el.colors.length] ?? "#500071"}
              onChange={(v) => {
                const colors = [...el.colors];
                while (colors.length < colorCount) colors.push(colors[colors.length % Math.max(1, el.colors.length)] ?? "#500071");
                colors[i] = v;
                patch({ colors }, `ccol-${el.id}-${i}`);
              }}
            />
          ))}
        </div>
        {!["pie", "doughnut"].includes(el.kind) && el.series.length <= 1 && <Toggle label={ti("colorByRow")} checked={el.colorByRow} onChange={(v) => patch({ colorByRow: v })} />}
      </Section>
      <Section title={ti("display")}>
        <Toggle label={ti("showValues")} checked={el.showValues} onChange={(v) => patch({ showValues: v })} />
        {!["kpi", "timeline", "infographic", "progress"].includes(el.kind) && <Toggle label={ti("showLegend")} checked={el.showLegend} onChange={(v) => patch({ showLegend: v })} />}
        {cartesian && <Toggle label={ti("showGrid")} checked={el.showGrid} onChange={(v) => patch({ showGrid: v })} />}
        {cartesian && <Toggle label={ti("showAxis")} checked={el.showAxis} onChange={(v) => patch({ showAxis: v })} />}
        {["line", "area", "radar"].includes(el.kind) && <Toggle label={ti("smooth")} checked={el.smooth} onChange={(v) => patch({ smooth: v })} />}
        <SliderField label={ti("labelSize")} value={el.labelSize} min={6} max={120} onChange={(v) => patch({ labelSize: v }, `ls-${el.id}`)} />
        <SliderField label={ti("valueSize")} value={el.valueSize} min={6} max={160} onChange={(v) => patch({ valueSize: v }, `vs-${el.id}`)} />
        <SliderField label={ti("cornerRadius")} value={el.radius} min={0} max={60} onChange={(v) => patch({ radius: v }, `cr-${el.id}`)} />
        {["line", "area", "radar", "scatter", "timeline"].includes(el.kind) && <SliderField label={ti("lineWidth")} value={el.lineWidth} min={1} max={20} step={0.5} onChange={(v) => patch({ lineWidth: v }, `lw-${el.id}`)} />}
        {["doughnut", "progress"].includes(el.kind) && <SliderField label={ti("thickness")} value={el.thickness} min={5} max={90} onChange={(v) => patch({ thickness: v }, `th-${el.id}`)} format={(v) => `${v}%`} />}
        {el.kind === "progress" && <NumberField label={ti("maxValue")} value={el.max} min={0.0001} onChange={(v) => patch({ max: v }, `max-${el.id}`)} />}
      </Section>
      {el.kind !== "timeline" && (
        <Section title={ti("numberFormat")} defaultOpen={false}>
          <SelectField
            label={ti("formatStyle")}
            value={el.format.style}
            onChange={(v) => patch({ format: { ...el.format, style: v } })}
            options={[
              { value: "number", label: ti("formatNumber") },
              { value: "percent", label: ti("formatPercent") },
              { value: "currency", label: ti("formatCurrency") },
            ]}
          />
          {el.format.style === "currency" && (
            <SelectField label={ti("currency")} value={el.format.currency} onChange={(v) => patch({ format: { ...el.format, currency: v } })} options={["USD", "EUR", "MAD", "GBP", "AED", "SAR", "EGP", "TND", "DZD", "CAD", "CHF", "JPY"].map((c) => ({ value: c, label: c }))} />
          )}
          <Row>
            <NumberField label={ti("decimals")} value={el.format.decimals} min={0} max={6} onChange={(v) => patch({ format: { ...el.format, decimals: Math.round(v) } }, `dec-${el.id}`)} />
            <div className="flex items-end pb-2">
              <Toggle label={ti("compact")} checked={el.format.compact} onChange={(v) => patch({ format: { ...el.format, compact: v } })} />
            </div>
            <TextField label={ti("prefix")} value={el.format.prefix} onChange={(v) => patch({ format: { ...el.format, prefix: v } }, `pre-${el.id}`)} />
            <TextField label={ti("suffix")} value={el.format.suffix} onChange={(v) => patch({ format: { ...el.format, suffix: v } }, `suf-${el.id}`)} />
          </Row>
        </Section>
      )}
      <Section title={ti("typography")} defaultOpen={false}>
        <FontSelect value={el.font} onChange={(id) => patch({ font: id })} />
        <Row>
          <ColorField label={ti("textColor")} value={el.textColor} onChange={(v) => patch({ textColor: v }, `tc-${el.id}`)} />
          <ColorField label={ti("mutedColor")} value={el.mutedColor} onChange={(v) => patch({ mutedColor: v }, `mc-${el.id}`)} />
          <ColorField label={ti("gridColor")} value={el.gridColor} onChange={(v) => patch({ gridColor: v }, `gc-${el.id}`)} />
          <ColorField label={ti("surfaceColor")} value={el.surfaceColor} onChange={(v) => patch({ surfaceColor: v }, `sc-${el.id}`)} />
        </Row>
        <Segmented
          label={ti("direction")}
          value={el.dir}
          onChange={(v) => patch({ dir: v })}
          options={[
            { value: "auto", label: ti("dirAuto") },
            { value: "ltr", label: ti("dirLtr") },
            { value: "rtl", label: ti("dirRtl") },
          ]}
        />
      </Section>
    </>
  );
}
