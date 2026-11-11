// Renders a design document as a single SVG. The same component is used for the
// editor canvas, previews and every export, so what you see is what you download.
import type { ReactNode } from "react";
import { ChartGraphic } from "./charts";
import { fontStack, getFont, nearestWeight } from "./fonts";
import { anchorX, fontCss, textAnchor, wrapText, type Measure } from "./format";
import { SvgIcon } from "./icons";
import { resolveDir, type Doc, type El, type ShapeEl, type TextEl } from "./model";
import { patternDef, seeded } from "./patterns";

const r2 = (v: number) => Math.round(v * 100) / 100;

export function textFont(el: TextEl): string {
  return fontCss(nearestWeight(getFont(el.font), el.weight), el.size, fontStack(el.font));
}

/** Wrapped lines, direction and the height the text needs. */
export function layoutText(el: TextEl, measure: Measure): { lines: string[]; dir: "ltr" | "rtl"; height: number } {
  const dir = resolveDir(el.dir, el.text);
  const text = el.uppercase ? el.text.toLocaleUpperCase() : el.text;
  const spacing = dir === "ltr" ? el.letterSpacing : 0;
  const lines = wrapText(text, Math.max(1, el.w), measure, textFont(el), spacing);
  return { lines, dir, height: Math.max(el.size, lines.length * el.size * el.lineHeight) };
}

function TextView({ el, measure }: { el: TextEl; measure: Measure }) {
  const { lines, dir } = layoutText(el, measure);
  const lh = el.size * el.lineHeight;
  const x = anchorX(el.align, 0, el.w);
  return (
    <text
      fontFamily={fontStack(el.font)}
      fontSize={r2(el.size)}
      fontWeight={nearestWeight(getFont(el.font), el.weight)}
      fill={el.color}
      textAnchor={textAnchor(el.align, dir)}
      direction={dir}
      letterSpacing={dir === "ltr" && el.letterSpacing ? r2(el.letterSpacing) : undefined}
      xmlSpace="preserve"
    >
      {lines.map((line, i) => (
        <tspan key={i} x={r2(x)} y={r2(i * lh + lh / 2)} dominantBaseline="central">
          {line || " "}
        </tspan>
      ))}
    </text>
  );
}

function hashSeed(id: string) {
  let h = 2166136261;
  for (const ch of id) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

function ShapeView({ el }: { el: ShapeEl }) {
  const { w, h } = el;
  const stroke = el.strokeWidth > 0 ? { stroke: el.stroke, strokeWidth: el.strokeWidth } : {};
  switch (el.shape) {
    case "rect":
      return <rect width={r2(w)} height={r2(h)} rx={r2(Math.min(el.radius, w / 2, h / 2))} fill={el.fill} {...stroke} />;
    case "ellipse":
      return <ellipse cx={r2(w / 2)} cy={r2(h / 2)} rx={r2(w / 2)} ry={r2(h / 2)} fill={el.fill} {...stroke} />;
    case "triangle":
      return <path d={`M${r2(w / 2)} 0L${r2(w)} ${r2(h)}H0Z`} fill={el.fill} strokeLinejoin="round" {...stroke} />;
    case "line":
      return <line x1={0} y1={r2(h / 2)} x2={r2(w)} y2={r2(h / 2)} stroke={el.fill} strokeWidth={Math.max(1, el.strokeWidth || h)} strokeLinecap={el.radius > 0 ? "round" : "butt"} />;
    case "star": {
      const pts = Array.from({ length: 10 }, (_, i) => {
        const a = (Math.PI / 5) * i - Math.PI / 2;
        const r = i % 2 ? 0.42 : 1;
        return `${r2(w / 2 + (w / 2) * r * Math.cos(a))} ${r2(h / 2 + (h / 2) * r * Math.sin(a) + h * 0.05)}`;
      });
      return <path d={`M${pts.join("L")}Z`} fill={el.fill} strokeLinejoin="round" {...stroke} />;
    }
    case "ring": {
      const t = Math.max(1, el.strokeWidth || Math.min(w, h) * 0.12);
      return <ellipse cx={r2(w / 2)} cy={r2(h / 2)} rx={r2(Math.max(0, w / 2 - t / 2))} ry={r2(Math.max(0, h / 2 - t / 2))} fill="none" stroke={el.fill} strokeWidth={r2(t)} />;
    }
    case "arc":
      return <path d={`M0 ${r2(h)}A${r2(w / 2)} ${r2(h)} 0 0 1 ${r2(w)} ${r2(h)}Z`} fill={el.fill} {...stroke} />;
    case "wave": {
      const amp = h / 2 - Math.max(1, el.strokeWidth) / 2;
      const waves = Math.max(1, Math.round(w / Math.max(20, h * 2)));
      const seg = w / waves;
      let d = `M0 ${r2(h / 2)}`;
      for (let i = 0; i < waves; i++) d += `Q${r2(seg * i + seg / 4)} ${r2(h / 2 - amp)} ${r2(seg * i + seg / 2)} ${r2(h / 2)}T${r2(seg * (i + 1))} ${r2(h / 2)}`;
      return <path d={d} fill="none" stroke={el.fill} strokeWidth={Math.max(1, el.strokeWidth)} strokeLinecap="round" />;
    }
    case "dots": {
      const gap = Math.max(6, el.radius || 24);
      const dotR = Math.max(1, gap * 0.18);
      const nodes: ReactNode[] = [];
      for (let y = gap / 2; y <= h; y += gap) for (let x = gap / 2; x <= w; x += gap) nodes.push(<circle key={`${x}-${y}`} cx={r2(x)} cy={r2(y)} r={r2(dotR)} fill={el.fill} />);
      return <>{nodes}</>;
    }
    case "blob": {
      const rnd = seeded(hashSeed(el.id));
      const pts = Array.from({ length: 8 }, (_, i) => {
        const a = (Math.PI * 2 * i) / 8;
        const k = 0.78 + rnd() * 0.22;
        return [w / 2 + (w / 2) * k * Math.cos(a), h / 2 + (h / 2) * k * Math.sin(a)] as const;
      });
      let d = `M${r2(pts[0]![0])} ${r2(pts[0]![1])}`;
      for (let i = 0; i < pts.length; i++) {
        const p0 = pts[(i - 1 + 8) % 8]!, p1 = pts[i]!, p2 = pts[(i + 1) % 8]!, p3 = pts[(i + 2) % 8]!;
        d += `C${r2(p1[0] + (p2[0] - p0[0]) / 6)} ${r2(p1[1] + (p2[1] - p0[1]) / 6)} ${r2(p2[0] - (p3[0] - p1[0]) / 6)} ${r2(p2[1] - (p3[1] - p1[1]) / 6)} ${r2(p2[0])} ${r2(p2[1])}`;
      }
      return <path d={d + "Z"} fill={el.fill} {...stroke} />;
    }
  }
}

export function ElementView({ el, measure, locale }: { el: El; measure: Measure; locale: string }) {
  switch (el.type) {
    case "text":
      return <TextView el={el} measure={measure} />;
    case "shape":
      return <ShapeView el={el} />;
    case "icon": {
      const s = Math.min(el.w, el.h);
      return <SvgIcon name={el.icon} x={(el.w - s) / 2} y={(el.h - s) / 2} size={s} color={el.color} strokeWidth={el.strokeWidth} />;
    }
    case "image": {
      const clip = el.radius > 0 ? `clip-${el.id}` : undefined;
      return (
        <>
          {clip && (
            <defs>
              <clipPath id={clip}>
                <rect width={r2(el.w)} height={r2(el.h)} rx={r2(Math.min(el.radius, el.w / 2, el.h / 2))} />
              </clipPath>
            </defs>
          )}
          <image href={el.src} width={r2(el.w)} height={r2(el.h)} preserveAspectRatio={el.fit === "cover" ? "xMidYMid slice" : "xMidYMid meet"} clipPath={clip ? `url(#${clip})` : undefined} />
        </>
      );
    }
    case "chart":
      return <ChartGraphic el={el} measure={measure} locale={locale} />;
  }
}

export function elementTransform(el: El): string {
  const t = `translate(${r2(el.x)} ${r2(el.y)})`;
  return el.rotation ? `${t} rotate(${r2(el.rotation)} ${r2(el.w / 2)} ${r2(el.h / 2)})` : t;
}

type DocSvgProps = {
  doc: Doc;
  measure: Measure;
  /** Rendered width/height in CSS pixels (the viewBox stays at design size). */
  displayWidth?: number;
  displayHeight?: number;
  /** Leave out the background colour (transparent PNG/SVG/PDF). */
  transparent?: boolean;
  /** Extra <style> for exported files (embedded fonts). */
  styleCss?: string;
  hidden?: string[];
  svgRef?: React.Ref<SVGSVGElement>;
  title?: string;
  /** Editor only: invisible boxes so clicks between letters still select an element. */
  hitAreas?: boolean;
};

export function DocSvg({ doc, measure, displayWidth, displayHeight, transparent, styleCss, hidden, svgRef, title, hitAreas }: DocSvgProps) {
  const patternId = `bgp-${doc.id}`;
  const bgTransparent = transparent ?? doc.background.transparent;
  return (
    <svg
      ref={svgRef}
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
      width={displayWidth ?? doc.width}
      height={displayHeight ?? doc.height}
      viewBox={`0 0 ${doc.width} ${doc.height}`}
      role="img"
      aria-label={title ?? doc.name}
    >
      <defs>
        {styleCss && <style>{styleCss}</style>}
        {doc.background.pattern && <g dangerouslySetInnerHTML={{ __html: patternDef(doc.background.pattern, patternId) }} />}
      </defs>
      {!bgTransparent && <rect data-bg="1" width={doc.width} height={doc.height} fill={doc.background.color} />}
      {doc.background.pattern && <rect data-bg="pattern" width={doc.width} height={doc.height} fill={`url(#${patternId})`} />}
      {doc.elements.map((el) =>
        hidden?.includes(el.id) ? null : (
          <g key={el.id} data-el={el.id} transform={elementTransform(el)} opacity={el.opacity < 1 ? el.opacity : undefined}>
            {hitAreas && <rect width={Math.max(4, el.w)} height={Math.max(4, el.h)} fill="transparent" />}
            <ElementView el={el} measure={measure} locale={doc.locale} />
          </g>
        ),
      )}
    </svg>
  );
}
