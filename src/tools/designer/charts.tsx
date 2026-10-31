// SVG renderers for every chart type. Geometry comes from d3-scale / d3-shape so
// values are drawn accurately; the output is plain SVG that exports losslessly.
import type { ReactNode } from "react";
import { scaleBand, scaleLinear, scalePoint } from "d3-scale";
import { arc as d3arc, area as d3area, curveLinear, curveLinearClosed, curveMonotoneX, curveCardinalClosed, line as d3line, pie as d3pie } from "d3-shape";
import { readableOn } from "@/tools/logic/color";
import { fontStack } from "./fonts";
import { fontCss, formatValue, wrapText, type Measure } from "./format";
import { resolveDir, type ChartEl } from "./model";
import { SvgIcon } from "./icons";

type Ctx = {
  el: ChartEl;
  w: number;
  h: number;
  rtl: boolean;
  stack: string;
  measure: Measure;
  fmt: (v: number) => string;
  color: (i: number) => string;
};

const r2 = (v: number) => Math.round(v * 100) / 100;

function T({ c, x, y, size, weight = 400, fill, anchor = "middle", children, baseline = "auto" }: { c: Ctx; x: number; y: number; size: number; weight?: number; fill?: string; anchor?: "start" | "middle" | "end"; children: ReactNode; baseline?: "auto" | "middle" | "hanging" }) {
  return (
    <text x={r2(x)} y={r2(y)} fontFamily={c.stack} fontSize={r2(size)} fontWeight={weight} fill={fill ?? c.el.textColor} textAnchor={anchor} dominantBaseline={baseline} direction={c.rtl ? "rtl" : "ltr"}>
      {children}
    </text>
  );
}

const width = (c: Ctx, s: string, size: number, weight = 400) => c.measure(s, fontCss(weight, size, c.stack));

/** Truncates text with an ellipsis to fit a width. */
function fit(c: Ctx, s: string, maxW: number, size: number, weight = 400): string {
  if (width(c, s, size, weight) <= maxW) return s;
  let out = s;
  while (out.length > 1 && width(c, out + "…", size, weight) > maxW) out = out.slice(0, -1);
  return out + "…";
}

function lines(c: Ctx, s: string, maxW: number, size: number, weight: number, maxLines: number): string[] {
  const all = wrapText(s, Math.max(10, maxW), c.measure, fontCss(weight, size, c.stack));
  if (all.length <= maxLines) return all;
  const kept = all.slice(0, maxLines);
  kept[maxLines - 1] = fit(c, kept[maxLines - 1] + "…", maxW, size, weight);
  return kept;
}

function Lines({ c, x, y, items, size, weight = 400, fill, anchor = "middle", lh = 1.25 }: { c: Ctx; x: number; y: number; items: string[]; size: number; weight?: number; fill?: string; anchor?: "start" | "middle" | "end"; lh?: number }) {
  return (
    <>
      {items.map((s, i) => (
        <T key={i} c={c} x={x} y={y + i * size * lh} size={size} weight={weight} fill={fill} anchor={anchor}>
          {s}
        </T>
      ))}
    </>
  );
}

// ---- Legend ---------------------------------------------------------------------

function legendItems(c: Ctx): { label: string; color: string }[] {
  const { el } = c;
  return el.colorByRow || el.kind === "pie" || el.kind === "doughnut" ? el.rows.map((r, i) => ({ label: r.label, color: c.color(i) })) : el.series.map((s, i) => ({ label: s, color: c.color(i) }));
}

/** Horizontal, wrapping legend at the top. Returns its height and nodes. */
function topLegend(c: Ctx, y0 = 0): { height: number; node: ReactNode } {
  const size = c.el.labelSize;
  const items = legendItems(c);
  const sw = size * 0.8, gap = size * 0.4, itemGap = size * 1.2;
  const rows: { label: string; color: string; w: number }[][] = [[]];
  let rowW = 0;
  for (const it of items) {
    const w = sw + gap + width(c, it.label, size);
    if (rowW + w > c.w && rows[rows.length - 1]!.length) {
      rows.push([]);
      rowW = 0;
    }
    rows[rows.length - 1]!.push({ ...it, w });
    rowW += w + itemGap;
  }
  const lh = size * 1.6;
  const node = rows.map((row, ri) => {
    const total = row.reduce((n, it) => n + it.w, 0) + itemGap * (row.length - 1);
    let cursor = c.rtl ? c.w / 2 + total / 2 : c.w / 2 - total / 2;
    return row.map((it, i) => {
      const y = y0 + ri * lh + lh / 2;
      const sx = c.rtl ? cursor - sw : cursor;
      const tx = c.rtl ? sx - gap : sx + sw + gap;
      cursor += (c.rtl ? -1 : 1) * (it.w + itemGap);
      return (
        <g key={`${ri}-${i}`}>
          <rect x={r2(sx)} y={r2(y - sw / 2)} width={r2(sw)} height={r2(sw)} rx={r2(sw / 4)} fill={it.color} />
          <T c={c} x={tx} y={y} size={size} anchor="start" baseline="middle">
            {it.label}
          </T>
        </g>
      );
    });
  });
  return { height: rows.length * lh + size * 0.6, node };
}

// ---- Cartesian charts -----------------------------------------------------------

function values(c: Ctx, seriesCount: number): number[] {
  return c.el.rows.flatMap((r) => r.values.slice(0, seriesCount).map((v) => (Number.isFinite(v) ? v : 0)));
}

function valueScale(c: Ctx, seriesCount: number, range: [number, number]) {
  const vs = values(c, seriesCount);
  const lo = Math.min(0, ...vs), hi = Math.max(0, ...vs, lo === 0 ? 1 : 0);
  return scaleLinear().domain([lo, hi === lo ? lo + 1 : hi]).nice(5).range(range);
}

function roundedBar(x: number, y: number, w: number, h: number, r: number, side: "top" | "bottom" | "right" | "left"): string {
  const rr = Math.max(0, Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2));
  if (w <= 0 || h <= 0) return "";
  const [a, b, cc, d] = side === "top" ? [rr, rr, 0, 0] : side === "bottom" ? [0, 0, rr, rr] : side === "right" ? [0, rr, rr, 0] : [rr, 0, 0, rr];
  // corners: top-left a, top-right b, bottom-right cc, bottom-left d
  return `M${r2(x + a)} ${r2(y)}H${r2(x + w - b)}Q${r2(x + w)} ${r2(y)} ${r2(x + w)} ${r2(y + b)}V${r2(y + h - cc)}Q${r2(x + w)} ${r2(y + h)} ${r2(x + w - cc)} ${r2(y + h)}H${r2(x + d)}Q${r2(x)} ${r2(y + h)} ${r2(x)} ${r2(y + h - d)}V${r2(y + a)}Q${r2(x)} ${r2(y)} ${r2(x + a)} ${r2(y)}Z`;
}

function seriesCount(c: Ctx) {
  return Math.max(1, c.el.series.length);
}

function VerticalChart(c: Ctx): ReactNode {
  const { el } = c;
  const sc = seriesCount(c);
  const legend = el.showLegend && legendItems(c).length > 1 ? topLegend(c) : { height: 0, node: null };
  const top = legend.height + (el.showValues ? el.valueSize * 1.6 : el.labelSize * 0.6);
  const bottom = el.labelSize * 2;
  const probe = valueScale(c, sc, [1, 0]);
  const axisW = el.showAxis ? Math.max(...probe.ticks(5).map((t) => width(c, c.fmt(t), el.labelSize * 0.9))) + el.labelSize * 0.8 : 0;
  const x0 = c.rtl ? 0 : axisW, x1 = c.w - (c.rtl ? axisW : 0);
  const yS = valueScale(c, sc, [c.h - bottom, top]);
  const cats = el.rows.map((_, i) => String(i));
  const isLine = el.kind === "line" || el.kind === "area";
  const nodes: ReactNode[] = [];

  if (el.showGrid || el.showAxis) {
    for (const t of yS.ticks(5)) {
      const y = yS(t);
      if (el.showGrid) nodes.push(<line key={`g${t}`} x1={r2(x0)} x2={r2(x1)} y1={r2(y)} y2={r2(y)} stroke={el.gridColor} strokeWidth={1} />);
      if (el.showAxis)
        nodes.push(
          <T key={`t${t}`} c={c} x={c.rtl ? x1 + el.labelSize * 0.5 : x0 - el.labelSize * 0.5} y={y} size={el.labelSize * 0.9} fill={el.mutedColor} anchor="end" baseline="middle">
            {c.fmt(t)}
          </T>,
        );
    }
  }
  const base = yS(Math.max(yS.domain()[0]!, Math.min(0, yS.domain()[1]!)));
  if (el.showAxis) nodes.push(<line key="axis" x1={r2(x0)} x2={r2(x1)} y1={r2(base)} y2={r2(base)} stroke={el.mutedColor} strokeWidth={1.5} />);

  if (!isLine) {
    const band = scaleBand<string>().domain(cats).range(c.rtl ? [x1, x0] : [x0, x1]).paddingInner(0.28).paddingOuter(0.14);
    const inner = scaleBand<string>().domain(el.series.map((_, i) => String(i))).range([0, band.bandwidth()]).padding(sc > 1 ? 0.08 : 0);
    el.rows.forEach((row, ri) => {
      for (let si = 0; si < sc; si++) {
        const v = row.values[si] ?? 0;
        const bx = band(String(ri))! + (c.rtl ? band.bandwidth() - inner(String(si))! - inner.bandwidth() : inner(String(si))!);
        const y = yS(Math.max(0, v)), y2 = yS(Math.min(0, v));
        const fill = c.color(el.colorByRow && sc === 1 ? ri : si);
        nodes.push(<path key={`b${ri}-${si}`} d={roundedBar(bx, y, inner.bandwidth(), Math.max(0, y2 - y), el.radius, v >= 0 ? "top" : "bottom")} fill={fill} />);
        if (el.showValues)
          nodes.push(
            <T key={`v${ri}-${si}`} c={c} x={bx + inner.bandwidth() / 2} y={v >= 0 ? y - el.valueSize * 0.45 : y2 + el.valueSize * 1.1} size={el.valueSize} weight={700}>
              {c.fmt(v)}
            </T>,
          );
      }
      nodes.push(
        <T key={`l${ri}`} c={c} x={band(String(ri))! + band.bandwidth() / 2} y={c.h - bottom + el.labelSize * 1.35} size={el.labelSize} fill={el.mutedColor}>
          {fit(c, row.label, band.step() * 0.98, el.labelSize)}
        </T>,
      );
    });
  } else {
    const xS = scalePoint<string>().domain(cats).range(c.rtl ? [x1, x0] : [x0, x1]).padding(0.4);
    const curve = el.smooth ? curveMonotoneX : curveLinear;
    for (let si = 0; si < sc; si++) {
      const pts = el.rows.map((r, ri) => [xS(String(ri))!, yS(r.values[si] ?? 0)] as [number, number]);
      const color = c.color(si);
      if (el.kind === "area") {
        const a = d3area<[number, number]>().x((p) => p[0]).y0(base).y1((p) => p[1]).curve(curve);
        nodes.push(<path key={`a${si}`} d={a(c.rtl ? [...pts].reverse() : pts) ?? ""} fill={color} opacity={sc > 1 ? 0.35 : 0.5} />);
      }
      const l = d3line<[number, number]>().x((p) => p[0]).y((p) => p[1]).curve(curve);
      nodes.push(<path key={`l${si}`} d={l(c.rtl ? [...pts].reverse() : pts) ?? ""} fill="none" stroke={color} strokeWidth={el.lineWidth} strokeLinejoin="round" strokeLinecap="round" />);
      pts.forEach(([px, py], ri) => {
        nodes.push(<circle key={`p${si}-${ri}`} cx={r2(px)} cy={r2(py)} r={r2(el.lineWidth * 1.4)} fill={el.surfaceColor} stroke={color} strokeWidth={r2(el.lineWidth * 0.8)} />);
        if (el.showValues)
          nodes.push(
            <T key={`v${si}-${ri}`} c={c} x={px} y={py - el.valueSize * 0.8} size={el.valueSize} weight={700} fill={color}>
              {c.fmt(el.rows[ri]!.values[si] ?? 0)}
            </T>,
          );
      });
    }
    el.rows.forEach((row, ri) =>
      nodes.push(
        <T key={`c${ri}`} c={c} x={xS(String(ri))!} y={c.h - bottom + el.labelSize * 1.35} size={el.labelSize} fill={el.mutedColor}>
          {fit(c, row.label, xS.step() * 0.98, el.labelSize)}
        </T>,
      ),
    );
  }
  return (
    <>
      {legend.node}
      {nodes}
    </>
  );
}

function HorizontalChart(c: Ctx): ReactNode {
  const { el } = c;
  const sc = seriesCount(c);
  const legend = el.showLegend && legendItems(c).length > 1 ? topLegend(c) : { height: 0, node: null };
  const labelW = Math.min(c.w * 0.35, Math.max(...el.rows.map((r) => width(c, r.label, el.labelSize)), 10) + el.labelSize);
  const valueW = el.showValues ? Math.max(...values(c, sc).map((v) => width(c, c.fmt(v), el.valueSize, 700)), 10) + el.valueSize * 0.6 : el.labelSize;
  const top = legend.height + el.labelSize * 0.4;
  const bottom = el.showAxis ? el.labelSize * 1.8 : el.labelSize * 0.4;
  const start = labelW, end = c.w - valueW;
  const xS = valueScale(c, sc, c.rtl ? [c.w - start, c.w - end] : [start, end]);
  const band = scaleBand<string>().domain(el.rows.map((_, i) => String(i))).range([top, c.h - bottom]).paddingInner(0.3).paddingOuter(0.1);
  const inner = scaleBand<string>().domain(el.series.map((_, i) => String(i))).range([0, band.bandwidth()]).padding(sc > 1 ? 0.08 : 0);
  const nodes: ReactNode[] = [];
  if (el.showGrid || el.showAxis)
    for (const t of xS.ticks(5)) {
      const x = xS(t);
      if (el.showGrid) nodes.push(<line key={`g${t}`} x1={r2(x)} x2={r2(x)} y1={r2(top)} y2={r2(c.h - bottom)} stroke={el.gridColor} strokeWidth={1} />);
      if (el.showAxis)
        nodes.push(
          <T key={`t${t}`} c={c} x={x} y={c.h - bottom + el.labelSize * 1.2} size={el.labelSize * 0.9} fill={el.mutedColor}>
            {c.fmt(t)}
          </T>,
        );
    }
  const zero = xS(Math.max(xS.domain()[0]!, Math.min(0, xS.domain()[1]!)));
  el.rows.forEach((row, ri) => {
    const by = band(String(ri))!;
    nodes.push(
      <T key={`l${ri}`} c={c} x={c.rtl ? c.w : 0} y={by + band.bandwidth() / 2} size={el.labelSize} fill={el.textColor} anchor="start" baseline="middle">
        {fit(c, row.label, labelW - el.labelSize * 0.6, el.labelSize)}
      </T>,
    );
    for (let si = 0; si < sc; si++) {
      const v = row.values[si] ?? 0;
      const xa = Math.min(zero, xS(v)), xb = Math.max(zero, xS(v));
      const y = by + inner(String(si))!;
      const grows = (v >= 0) !== c.rtl ? "right" : "left";
      nodes.push(<path key={`b${ri}-${si}`} d={roundedBar(xa, y, xb - xa, inner.bandwidth(), el.radius, grows)} fill={c.color(el.colorByRow && sc === 1 ? ri : si)} />);
      if (el.showValues) {
        const tip = grows === "right" ? xb + el.valueSize * 0.4 : xa - el.valueSize * 0.4;
        nodes.push(
          <T key={`v${ri}-${si}`} c={c} x={tip} y={y + inner.bandwidth() / 2} size={el.valueSize} weight={700} anchor={grows === "right" ? (c.rtl ? "end" : "start") : c.rtl ? "start" : "end"} baseline="middle">
            {c.fmt(v)}
          </T>,
        );
      }
    }
  });
  return (
    <>
      {legend.node}
      {nodes}
    </>
  );
}

function ScatterChart(c: Ctx): ReactNode {
  const { el } = c;
  const xs = el.rows.map((r) => r.values[0] ?? 0), ys = el.rows.map((r) => r.values[1] ?? 0);
  const pad = el.labelSize;
  const axisW = el.showAxis ? el.labelSize * 4 : pad;
  const bottom = el.showAxis ? el.labelSize * 3.2 : pad;
  const domain = (v: number[]) => {
    const lo = Math.min(...v), hi = Math.max(...v);
    return lo === hi ? [lo - 1, hi + 1] : [lo, hi];
  };
  const xS = scaleLinear().domain(domain(xs)).nice(5).range(c.rtl ? [c.w - axisW, pad] : [axisW, c.w - pad]);
  const yS = scaleLinear().domain(domain(ys)).nice(5).range([c.h - bottom, pad]);
  const nodes: ReactNode[] = [];
  const left = c.rtl ? c.w - axisW : axisW;
  for (const t of yS.ticks(5)) {
    if (el.showGrid) nodes.push(<line key={`gy${t}`} x1={r2(xS.range()[0]!)} x2={r2(xS.range()[1]!)} y1={r2(yS(t))} y2={r2(yS(t))} stroke={el.gridColor} />);
    if (el.showAxis)
      nodes.push(
        <T key={`ty${t}`} c={c} x={c.rtl ? left + el.labelSize * 0.5 : left - el.labelSize * 0.5} y={yS(t)} size={el.labelSize * 0.9} fill={el.mutedColor} anchor={c.rtl ? "start" : "end"} baseline="middle">
          {c.fmt(t)}
        </T>,
      );
  }
  for (const t of xS.ticks(5)) {
    if (el.showGrid) nodes.push(<line key={`gx${t}`} x1={r2(xS(t))} x2={r2(xS(t))} y1={r2(pad)} y2={r2(c.h - bottom)} stroke={el.gridColor} />);
    if (el.showAxis)
      nodes.push(
        <T key={`tx${t}`} c={c} x={xS(t)} y={c.h - bottom + el.labelSize * 1.3} size={el.labelSize * 0.9} fill={el.mutedColor}>
          {c.fmt(t)}
        </T>,
      );
  }
  if (el.showAxis) {
    nodes.push(
      <T key="xt" c={c} x={(xS.range()[0]! + xS.range()[1]!) / 2} y={c.h - el.labelSize * 0.3} size={el.labelSize} weight={700} fill={el.mutedColor}>
        {el.series[0] ?? "X"}
      </T>,
    );
    nodes.push(
      <T key="yt" c={c} x={c.rtl ? c.w - el.labelSize * 0.2 : el.labelSize * 0.2} y={pad * 0.9} size={el.labelSize} weight={700} fill={el.mutedColor} anchor="start">
        {el.series[1] ?? "Y"}
      </T>,
    );
  }
  el.rows.forEach((r, i) => {
    const cx = xS(r.values[0] ?? 0), cy = yS(r.values[1] ?? 0);
    const color = c.color(el.colorByRow ? i : 0);
    nodes.push(<circle key={`p${i}`} cx={r2(cx)} cy={r2(cy)} r={r2(Math.max(3, el.lineWidth * 2.2))} fill={color} opacity={0.9} />);
    if (el.showValues)
      nodes.push(
        <T key={`pl${i}`} c={c} x={cx + (c.rtl ? -1 : 1) * el.lineWidth * 3} y={cy - el.lineWidth * 2.5} size={el.labelSize * 0.85} anchor="start">
          {r.label}
        </T>,
      );
  });
  return <>{nodes}</>;
}

function ComparisonChart(c: Ctx): ReactNode {
  const { el } = c;
  const header = el.labelSize * 2.2;
  const labelW = Math.min(c.w * 0.3, Math.max(...el.rows.map((r) => width(c, r.label, el.labelSize, 700)), 10) + el.labelSize * 1.5);
  const half = (c.w - labelW) / 2;
  const valueW = el.showValues ? el.valueSize * 4 : 0;
  const max = Math.max(1, ...el.rows.flatMap((r) => [Math.abs(r.values[0] ?? 0), Math.abs(r.values[1] ?? 0)]));
  const len = scaleLinear().domain([0, max]).range([0, Math.max(10, half - valueW)]);
  const band = scaleBand<string>().domain(el.rows.map((_, i) => String(i))).range([header, c.h]).paddingInner(0.3);
  const startSide = c.rtl ? "right" : "left";
  const nodes: ReactNode[] = [];
  const sideX = (side: "left" | "right") => (side === "left" ? half / 2 : c.w - half / 2);
  nodes.push(
    <T key="sa" c={c} x={sideX(startSide)} y={el.labelSize * 1.2} size={el.labelSize} weight={700} fill={c.color(0)}>
      {el.series[0] ?? "A"}
    </T>,
    <T key="sb" c={c} x={sideX(startSide === "left" ? "right" : "left")} y={el.labelSize * 1.2} size={el.labelSize} weight={700} fill={c.color(1)}>
      {el.series[1] ?? "B"}
    </T>,
  );
  el.rows.forEach((r, i) => {
    const y = band(String(i))!, bh = band.bandwidth();
    const a = Math.abs(r.values[0] ?? 0), b = Math.abs(r.values[1] ?? 0);
    const la = len(a), lb = len(b);
    const leftV = startSide === "left" ? a : b, rightV = startSide === "left" ? b : a;
    const leftL = startSide === "left" ? la : lb, rightL = startSide === "left" ? lb : la;
    const leftC = c.color(startSide === "left" ? 0 : 1), rightC = c.color(startSide === "left" ? 1 : 0);
    nodes.push(<path key={`l${i}`} d={roundedBar(half - leftL, y, leftL, bh, el.radius, "left")} fill={leftC} />);
    nodes.push(<path key={`r${i}`} d={roundedBar(half + labelW, y, rightL, bh, el.radius, "right")} fill={rightC} />);
    nodes.push(
      <T key={`c${i}`} c={c} x={c.w / 2} y={y + bh / 2} size={el.labelSize} weight={700} baseline="middle">
        {fit(c, r.label, labelW - el.labelSize, el.labelSize, 700)}
      </T>,
    );
    if (el.showValues) {
      nodes.push(
        <T key={`vl${i}`} c={c} x={half - leftL - el.valueSize * 0.4} y={y + bh / 2} size={el.valueSize} weight={700} anchor={c.rtl ? "start" : "end"} baseline="middle">
          {c.fmt(leftV)}
        </T>,
        <T key={`vr${i}`} c={c} x={half + labelW + rightL + el.valueSize * 0.4} y={y + bh / 2} size={el.valueSize} weight={700} anchor={c.rtl ? "end" : "start"} baseline="middle">
          {c.fmt(rightV)}
        </T>,
      );
    }
  });
  return <>{nodes}</>;
}

// ---- Circular charts ------------------------------------------------------------

function PieChart(c: Ctx): ReactNode {
  const { el } = c;
  const vals = el.rows.map((r) => Math.max(0, r.values[0] ?? 0));
  const total = vals.reduce((a, b) => a + b, 0) || 1;
  const side = el.showLegend && c.w >= c.h * 1.25;
  const legendH = el.showLegend && !side ? Math.ceil(el.rows.length / 2) * el.labelSize * 1.7 + el.labelSize : 0;
  const pieW = side ? c.w * 0.55 : c.w;
  const radius = Math.max(10, Math.min(pieW, c.h - legendH) / 2 - el.labelSize * 0.5);
  const cx = side ? (c.rtl ? c.w - pieW / 2 : pieW / 2) : c.w / 2;
  const cy = (c.h - legendH) / 2;
  const inner = el.kind === "doughnut" ? radius * (1 - Math.max(5, Math.min(90, el.thickness)) / 100) : 0;
  const arcs = d3pie<number>().sort(null).padAngle(el.radius > 0 ? 0.012 : 0)(vals);
  const gen = d3arc<{ startAngle: number; endAngle: number; padAngle: number }>().innerRadius(inner).outerRadius(radius).cornerRadius(Math.min(el.radius, (radius - inner) / 2));
  const labelArc = d3arc<{ startAngle: number; endAngle: number }>().innerRadius(inner ? (inner + radius) / 2 : radius * 0.62).outerRadius(inner ? (inner + radius) / 2 : radius * 0.62);
  const nodes: ReactNode[] = [];
  arcs.forEach((a, i) => {
    // In RTL the slices run counter-clockwise, mirroring the reading direction.
    const angles = c.rtl ? { startAngle: -a.endAngle, endAngle: -a.startAngle, padAngle: a.padAngle } : a;
    nodes.push(<path key={`s${i}`} d={gen(angles) ?? ""} transform={`translate(${r2(cx)} ${r2(cy)})`} fill={c.color(i)} />);
    if (el.showValues && a.endAngle - a.startAngle > 0.28) {
      const [lx, ly] = labelArc.centroid(angles);
      const share = (vals[i]! / total) * 100;
      const text = el.format.style === "percent" ? c.fmt(vals[i]!) : `${Math.round(share)}%`;
      nodes.push(
        <T key={`v${i}`} c={c} x={cx + lx} y={cy + ly} size={el.valueSize} weight={700} fill={readableOn(c.color(i))} baseline="middle">
          {text}
        </T>,
      );
    }
  });
  if (el.kind === "doughnut" && inner > el.valueSize * 2) {
    // Percentages: show the largest share; other formats: show the total.
    const top = vals.indexOf(Math.max(...vals));
    const centerValue = el.format.style === "percent" ? c.fmt(vals[top] ?? 0) : c.fmt(vals.reduce((a, b) => a + b, 0));
    const centerLabel = el.format.style === "percent" ? (el.rows[top]?.label ?? "") : (el.series[0] ?? "");
    const big = Math.min(inner * 0.45, el.valueSize * 1.8);
    nodes.push(
      <T key="tot" c={c} x={cx} y={cy} size={big} weight={700} baseline="middle">
        {centerValue}
      </T>,
    );
    if (centerLabel)
      nodes.push(
        <T key="totl" c={c} x={cx} y={cy + big * 0.95} size={el.labelSize * 0.9} fill={el.mutedColor} baseline="middle">
          {fit(c, centerLabel, inner * 1.5, el.labelSize * 0.9)}
        </T>,
      );
  }
  if (el.showLegend) {
    const size = el.labelSize;
    const sw = size * 0.8;
    if (side) {
      const lx = c.rtl ? c.w - pieW - size : pieW + size;
      const listW = c.w - pieW - size * 2;
      const lh = Math.min(size * 2.2, (c.h - size) / Math.max(1, el.rows.length));
      const y0 = cy - (lh * el.rows.length) / 2 + lh / 2;
      el.rows.forEach((r, i) => {
        const y = y0 + i * lh;
        const sx = c.rtl ? lx - sw : lx;
        nodes.push(
          <g key={`lg${i}`}>
            <rect x={r2(sx)} y={r2(y - sw / 2)} width={r2(sw)} height={r2(sw)} rx={r2(sw / 4)} fill={c.color(i)} />
            <T c={c} x={c.rtl ? sx - size * 0.5 : sx + sw + size * 0.5} y={y} size={size} anchor="start" baseline="middle">
              {fit(c, r.label, listW * 0.62, size)}
            </T>
            <T c={c} x={c.rtl ? lx - listW : lx + listW} y={y} size={size} weight={700} anchor="end" baseline="middle">
              {c.fmt(vals[i]!)}
            </T>
          </g>,
        );
      });
    } else {
      const colW = c.w / 2;
      el.rows.forEach((r, i) => {
        const col = i % 2, row = Math.floor(i / 2);
        const y = c.h - legendH + size + row * size * 1.7;
        const baseX = c.rtl ? c.w - col * colW - size : col * colW + size;
        nodes.push(
          <g key={`lg${i}`}>
            <rect x={r2(c.rtl ? baseX - sw : baseX)} y={r2(y - sw / 2)} width={r2(sw)} height={r2(sw)} rx={r2(sw / 4)} fill={c.color(i)} />
            <T c={c} x={c.rtl ? baseX - sw - size * 0.5 : baseX + sw + size * 0.5} y={y} size={size} anchor="start" baseline="middle">
              {fit(c, `${r.label} · ${c.fmt(vals[i]!)}`, colW - sw - size * 2, size)}
            </T>
          </g>,
        );
      });
    }
  }
  return <>{nodes}</>;
}

function RadarChart(c: Ctx): ReactNode {
  const { el } = c;
  const sc = seriesCount(c);
  const legend = el.showLegend && sc > 1 ? topLegend(c) : { height: 0, node: null };
  const n = Math.max(3, el.rows.length);
  const cx = c.w / 2, cy = legend.height + (c.h - legend.height) / 2;
  const radius = Math.max(10, Math.min(c.w, c.h - legend.height) / 2 - el.labelSize * 2.8);
  const max = Math.max(1, ...values(c, sc));
  const rS = scaleLinear().domain([0, max]).nice(4).range([0, radius]);
  const angle = (i: number) => (c.rtl ? -1 : 1) * ((Math.PI * 2 * i) / n) - Math.PI / 2;
  const pt = (i: number, r: number) => [cx + r * Math.cos(angle(i)), cy + r * Math.sin(angle(i))] as [number, number];
  const nodes: ReactNode[] = [];
  const ring = d3line<[number, number]>().curve(curveLinearClosed);
  if (el.showGrid)
    for (const t of rS.ticks(4)) {
      if (t === 0) continue;
      nodes.push(<path key={`r${t}`} d={ring(Array.from({ length: n }, (_, i) => pt(i, rS(t)))) ?? ""} fill="none" stroke={el.gridColor} />);
      if (el.showAxis)
        nodes.push(
          <T key={`rt${t}`} c={c} x={cx + 4} y={cy - rS(t)} size={el.labelSize * 0.75} fill={el.mutedColor} anchor="start" baseline="middle">
            {c.fmt(t)}
          </T>,
        );
    }
  for (let i = 0; i < n; i++) {
    const [x, y] = pt(i, radius);
    if (el.showGrid) nodes.push(<line key={`a${i}`} x1={r2(cx)} y1={r2(cy)} x2={r2(x)} y2={r2(y)} stroke={el.gridColor} />);
    const [lx, ly] = pt(i, radius + el.labelSize * 1.3);
    const cos = Math.cos(angle(i));
    nodes.push(
      <T key={`l${i}`} c={c} x={lx} y={ly} size={el.labelSize} anchor={Math.abs(cos) < 0.2 ? "middle" : cos > 0 ? (c.rtl ? "end" : "start") : c.rtl ? "start" : "end"} baseline="middle">
        {fit(c, el.rows[i]?.label ?? "", c.w * 0.3, el.labelSize)}
      </T>,
    );
  }
  const shape = d3line<[number, number]>().curve(el.smooth ? curveCardinalClosed : curveLinearClosed);
  for (let si = 0; si < sc; si++) {
    const pts = Array.from({ length: n }, (_, i) => pt(i, rS(Math.max(0, el.rows[i]?.values[si] ?? 0))));
    nodes.push(<path key={`s${si}`} d={shape(pts) ?? ""} fill={c.color(si)} fillOpacity={0.22} stroke={c.color(si)} strokeWidth={el.lineWidth} strokeLinejoin="round" />);
    pts.forEach(([x, y], i) => nodes.push(<circle key={`p${si}-${i}`} cx={r2(x)} cy={r2(y)} r={r2(el.lineWidth * 1.2)} fill={c.color(si)} />));
  }
  return (
    <>
      {legend.node}
      {nodes}
    </>
  );
}

// ---- Infographic-style charts -------------------------------------------------------

function ProgressChart(c: Ctx): ReactNode {
  const { el } = c;
  const max = el.max > 0 ? el.max : 100;
  const nodes: ReactNode[] = [];
  if (el.variant === "rings") {
    const n = Math.max(1, el.rows.length);
    const cols = Math.min(n, c.w >= c.h ? Math.min(4, n) : 2);
    const rows = Math.ceil(n / cols);
    const cellW = c.w / cols, cellH = c.h / rows;
    const labelH = el.labelSize * 2.6;
    const radius = Math.max(8, Math.min(cellW * 0.42, (cellH - labelH) * 0.45));
    const sw = Math.max(2, radius * (el.thickness / 100));
    el.rows.forEach((r, i) => {
      const col = i % cols, row = Math.floor(i / cols);
      const visualCol = c.rtl ? cols - 1 - col : col;
      const cx = cellW * visualCol + cellW / 2, cy = cellH * row + (cellH - labelH) / 2 + sw / 2;
      const v = Math.max(0, Math.min(max, r.values[0] ?? 0));
      const rr = radius - sw / 2;
      const circ = 2 * Math.PI * rr;
      nodes.push(
        <g key={i}>
          <circle cx={r2(cx)} cy={r2(cy)} r={r2(rr)} fill="none" stroke={el.surfaceColor} strokeWidth={r2(sw)} />
          <circle cx={r2(cx)} cy={r2(cy)} r={r2(rr)} fill="none" stroke={c.color(i)} strokeWidth={r2(sw)} strokeLinecap={el.radius > 0 ? "round" : "butt"} strokeDasharray={`${r2((v / max) * circ)} ${r2(circ)}`} transform={c.rtl ? `translate(${r2(2 * cx)} 0) scale(-1 1) rotate(-90 ${r2(cx)} ${r2(cy)})` : `rotate(-90 ${r2(cx)} ${r2(cy)})`} />
          <T c={c} x={cx} y={cy} size={Math.min(el.valueSize * 1.4, rr * 0.55)} weight={700} baseline="middle">
            {c.fmt(r.values[0] ?? 0)}
          </T>
          <Lines c={c} x={cx} y={cy + radius + el.labelSize * 1.3} items={lines(c, r.label, cellW * 0.9, el.labelSize, 400, 2)} size={el.labelSize} fill={el.mutedColor} />
        </g>,
      );
    });
    return <>{nodes}</>;
  }
  const n = Math.max(1, el.rows.length);
  const rowH = c.h / n;
  const trackH = Math.max(4, Math.min(rowH * 0.45, el.labelSize * (el.thickness / 50)));
  el.rows.forEach((r, i) => {
    const y = i * rowH + rowH / 2 - (el.labelSize + trackH) / 2 + el.labelSize * 0.6;
    const v = Math.max(0, Math.min(max, r.values[0] ?? 0));
    const fw = (v / max) * c.w;
    const ty = y + el.labelSize * 0.6;
    nodes.push(
      <g key={i}>
        <T c={c} x={c.rtl ? c.w : 0} y={y} size={el.labelSize} anchor="start">
          {fit(c, r.label, c.w * 0.7, el.labelSize)}
        </T>
        <T c={c} x={c.rtl ? 0 : c.w} y={y} size={el.valueSize} weight={700} anchor="end" fill={c.color(i)}>
          {c.fmt(r.values[0] ?? 0)}
        </T>
        <rect x={0} y={r2(ty)} width={r2(c.w)} height={r2(trackH)} rx={el.radius > 0 ? r2(trackH / 2) : 0} fill={el.surfaceColor} />
        <rect x={r2(c.rtl ? c.w - fw : 0)} y={r2(ty)} width={r2(fw)} height={r2(trackH)} rx={el.radius > 0 ? r2(trackH / 2) : 0} fill={c.color(i)} />
      </g>,
    );
  });
  return <>{nodes}</>;
}

function deltaColor(note: string | undefined, fallback: string) {
  if (!note) return fallback;
  if (/^\s*\+/.test(note)) return "#1A7F37";
  if (/^\s*[-−]/.test(note)) return "#C62828";
  return fallback;
}

function KpiChart(c: Ctx): ReactNode {
  const { el } = c;
  const n = Math.max(1, el.rows.length);
  const cols = n <= 4 && c.w >= c.h * 1.6 ? n : n === 1 ? 1 : c.w >= c.h ? Math.min(3, n) : 2;
  const rowsN = Math.ceil(n / cols);
  const gap = Math.min(c.w, c.h) * 0.04;
  const cw = (c.w - gap * (cols - 1)) / cols, ch = (c.h - gap * (rowsN - 1)) / rowsN;
  const plain = el.variant === "plain";
  const nodes: ReactNode[] = [];
  el.rows.forEach((r, i) => {
    const col = i % cols, row = Math.floor(i / cols);
    const x = (c.rtl ? cols - 1 - col : col) * (cw + gap), y = row * (ch + gap);
    const pad = Math.min(cw, ch) * 0.12;
    const tx = c.rtl ? x + cw - pad : x + pad;
    const big = Math.min(el.valueSize * 2.2, ch * 0.36, (cw - pad * 2) / Math.max(3, c.fmt(r.values[0] ?? 0).length * 0.6));
    nodes.push(
      <g key={i}>
        {!plain && <rect x={r2(x)} y={r2(y)} width={r2(cw)} height={r2(ch)} rx={r2(el.radius)} fill={el.surfaceColor} />}
        {!plain && <rect x={r2(c.rtl ? x + cw - pad - cw * 0.18 : x + pad)} y={r2(y + pad * 0.7)} width={r2(cw * 0.18)} height={r2(Math.max(3, pad * 0.18))} rx={r2(pad * 0.09)} fill={c.color(i)} />}
        <T c={c} x={tx} y={y + pad * 0.9 + el.labelSize * 1.4} size={el.labelSize} fill={el.mutedColor} anchor="start">
          {fit(c, r.label, cw - pad * 2, el.labelSize)}
        </T>
        <T c={c} x={tx} y={y + ch * 0.62} size={big} weight={700} fill={plain ? c.color(i) : el.textColor} anchor="start" baseline="middle">
          {c.fmt(r.values[0] ?? 0)}
        </T>
        {r.note && (() => {
          const size = el.labelSize * 0.95;
          const noteLines = lines(c, r.note, cw - pad * 2, size, 700, 2);
          return <Lines c={c} x={tx} y={y + ch - pad - (noteLines.length - 1) * size * 1.2} items={noteLines} size={size} weight={700} fill={deltaColor(r.note, el.mutedColor)} anchor="start" lh={1.2} />;
        })()}
      </g>,
    );
  });
  return <>{nodes}</>;
}

function TimelineChart(c: Ctx): ReactNode {
  const { el } = c;
  const n = Math.max(1, el.rows.length);
  const nodes: ReactNode[] = [];
  const dot = Math.max(5, el.labelSize * 0.55);
  if (el.variant === "vertical") {
    const lineX = c.rtl ? c.w - dot * 1.5 : dot * 1.5;
    const step = c.h / n;
    nodes.push(<line key="axis" x1={r2(lineX)} x2={r2(lineX)} y1={r2(step / 2)} y2={r2(c.h - step / 2)} stroke={el.gridColor} strokeWidth={Math.max(2, el.lineWidth)} />);
    el.rows.forEach((r, i) => {
      const y = step * i + step / 2;
      const tx = c.rtl ? lineX - dot * 2.5 : lineX + dot * 2.5;
      const textW = c.w - dot * 5;
      nodes.push(
        <g key={i}>
          <circle cx={r2(lineX)} cy={r2(y)} r={r2(dot)} fill={c.color(i)} stroke={el.surfaceColor} strokeWidth={r2(dot * 0.5)} />
          <T c={c} x={tx} y={y - el.labelSize * 0.2} size={el.valueSize} weight={700} fill={c.color(i)} anchor="start">
            {fit(c, r.label, textW, el.valueSize, 700)}
          </T>
          <Lines c={c} x={tx} y={y + el.labelSize * 1.2} items={lines(c, r.note ?? "", textW, el.labelSize, 400, Math.max(1, Math.floor((step - el.valueSize * 1.6) / (el.labelSize * 1.25))))} size={el.labelSize} fill={el.mutedColor} anchor="start" />
        </g>,
      );
    });
    return <>{nodes}</>;
  }
  const step = c.w / n;
  const midY = c.h / 2;
  nodes.push(<line key="axis" x1={r2(step / 2)} x2={r2(c.w - step / 2)} y1={r2(midY)} y2={r2(midY)} stroke={el.gridColor} strokeWidth={Math.max(2, el.lineWidth)} />);
  el.rows.forEach((r, i) => {
    const x = (c.rtl ? n - 1 - i : i) * step + step / 2;
    const up = i % 2 === 0;
    const noteLines = lines(c, r.note ?? "", step * 0.92, el.labelSize, 400, 3);
    const blockH = el.valueSize * 1.3 + noteLines.length * el.labelSize * 1.25;
    const y0 = up ? midY - dot * 2.5 - blockH + el.valueSize : midY + dot * 2.5 + el.valueSize;
    nodes.push(
      <g key={i}>
        <circle cx={r2(x)} cy={r2(midY)} r={r2(dot)} fill={c.color(i)} stroke={el.surfaceColor} strokeWidth={r2(dot * 0.5)} />
        <T c={c} x={x} y={y0} size={el.valueSize} weight={700} fill={c.color(i)}>
          {fit(c, r.label, step * 0.95, el.valueSize, 700)}
        </T>
        <Lines c={c} x={x} y={y0 + el.valueSize * 0.4 + el.labelSize * 1.1} items={noteLines} size={el.labelSize} fill={el.mutedColor} />
      </g>,
    );
  });
  return <>{nodes}</>;
}

function InfographicChart(c: Ctx): ReactNode {
  const { el } = c;
  const n = Math.max(1, el.rows.length);
  const nodes: ReactNode[] = [];
  if (el.variant === "grid") {
    const cols = n <= 3 ? n : c.w >= c.h ? Math.min(4, Math.ceil(n / 2)) : 2;
    const rowsN = Math.ceil(n / cols);
    const cw = c.w / cols, ch = c.h / rowsN;
    el.rows.forEach((r, i) => {
      const col = i % cols, row = Math.floor(i / cols);
      const cx = (c.rtl ? cols - 1 - col : col) * cw + cw / 2;
      const y = row * ch;
      const circle = Math.min(cw * 0.3, ch * 0.28);
      const color = c.color(i);
      const big = Math.min(el.valueSize * 1.8, ch * 0.16);
      nodes.push(
        <g key={i}>
          <circle cx={r2(cx)} cy={r2(y + ch * 0.06 + circle / 2)} r={r2(circle / 2)} fill={color} />
          <SvgIcon name={r.icon ?? "star"} x={cx - circle * 0.28} y={y + ch * 0.06 + circle * 0.22} size={circle * 0.56} color={readableOn(color)} strokeWidth={2} />
          <T c={c} x={cx} y={y + ch * 0.06 + circle + big * 1.15} size={big} weight={700} fill={color}>
            {c.fmt(r.values[0] ?? 0)}
          </T>
          <T c={c} x={cx} y={y + ch * 0.06 + circle + big * 1.15 + el.labelSize * 1.5} size={el.labelSize} weight={700}>
            {fit(c, r.label, cw * 0.9, el.labelSize, 700)}
          </T>
          <Lines c={c} x={cx} y={y + ch * 0.06 + circle + big * 1.15 + el.labelSize * 2.9} items={lines(c, r.note ?? "", cw * 0.86, el.labelSize * 0.9, 400, 2)} size={el.labelSize * 0.9} fill={el.mutedColor} />
        </g>,
      );
    });
    return <>{nodes}</>;
  }
  const rowH = c.h / n;
  el.rows.forEach((r, i) => {
    const y = i * rowH;
    const circle = Math.min(rowH * 0.78, c.w * 0.18);
    const color = c.color(i);
    const ccx = c.rtl ? c.w - circle / 2 : circle / 2;
    const cy = y + rowH / 2;
    const tx = c.rtl ? c.w - circle - circle * 0.3 : circle + circle * 0.3;
    const textW = c.w - circle * 1.3;
    const big = Math.min(el.valueSize * 1.6, rowH * 0.42);
    const valueText = c.fmt(r.values[0] ?? 0);
    const valueW = width(c, valueText, big, 700);
    nodes.push(
      <g key={i}>
        <circle cx={r2(ccx)} cy={r2(cy)} r={r2(circle / 2)} fill={color} />
        <SvgIcon name={r.icon ?? "star"} x={ccx - circle * 0.27} y={cy - circle * 0.27} size={circle * 0.54} color={readableOn(color)} strokeWidth={2} />
        <T c={c} x={tx} y={cy - rowH * 0.02} size={big} weight={700} fill={color} anchor="start">
          {valueText}
        </T>
        <T c={c} x={c.rtl ? tx - valueW - big * 0.3 : tx + valueW + big * 0.3} y={cy - rowH * 0.02} size={el.labelSize * 1.05} weight={700} anchor="start">
          {fit(c, r.label, Math.max(20, textW - valueW - big * 0.3), el.labelSize * 1.05, 700)}
        </T>
        <Lines c={c} x={tx} y={cy + el.labelSize * 1.3} items={lines(c, r.note ?? "", textW, el.labelSize * 0.92, 400, 2)} size={el.labelSize * 0.92} fill={el.mutedColor} anchor="start" />
      </g>,
    );
  });
  return <>{nodes}</>;
}

/** Renders a chart element in its own coordinate system (0..w, 0..h). */
export function ChartGraphic({ el, measure, locale }: { el: ChartEl; measure: Measure; locale: string }) {
  const sample = [...el.rows.map((r) => r.label), ...el.series].join(" ");
  const c: Ctx = {
    el,
    w: Math.max(20, el.w),
    h: Math.max(20, el.h),
    rtl: resolveDir(el.dir, sample || (locale === "ar" ? "ا" : "a")) === "rtl",
    stack: fontStack(el.font),
    measure,
    fmt: (v) => formatValue(v, el.format, locale),
    color: (i) => el.colors[i % Math.max(1, el.colors.length)] ?? "#500071",
  };
  if (!el.rows.length) return null;
  switch (el.kind) {
    case "bar":
    case "line":
    case "area":
      return <>{VerticalChart(c)}</>;
    case "hbar":
      return <>{HorizontalChart(c)}</>;
    case "scatter":
      return <>{ScatterChart(c)}</>;
    case "comparison":
      return <>{ComparisonChart(c)}</>;
    case "pie":
    case "doughnut":
      return <>{PieChart(c)}</>;
    case "radar":
      return <>{RadarChart(c)}</>;
    case "progress":
      return <>{ProgressChart(c)}</>;
    case "kpi":
      return <>{KpiChart(c)}</>;
    case "timeline":
      return <>{TimelineChart(c)}</>;
    case "infographic":
      return <>{InfographicChart(c)}</>;
  }
}
