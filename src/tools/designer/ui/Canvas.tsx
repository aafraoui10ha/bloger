"use client";

import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useTranslations } from "next-intl";
import type { Measure } from "../format";
import type { Doc, El } from "../model";
import { DocSvg } from "../render";

type Guide = { axis: "x" | "y"; pos: number };
type Handle = { hx: -1 | 0 | 1; hy: -1 | 0 | 1; key: string };
const HANDLES: Handle[] = [
  { hx: -1, hy: -1, key: "nw" }, { hx: 0, hy: -1, key: "n" }, { hx: 1, hy: -1, key: "ne" }, { hx: 1, hy: 0, key: "e" },
  { hx: 1, hy: 1, key: "se" }, { hx: 0, hy: 1, key: "s" }, { hx: -1, hy: 1, key: "sw" }, { hx: -1, hy: 0, key: "w" },
];
const CURSORS: Record<string, string> = { nw: "nwse-resize", se: "nwse-resize", ne: "nesw-resize", sw: "nesw-resize", n: "ns-resize", s: "ns-resize", e: "ew-resize", w: "ew-resize" };

export type CanvasProps = {
  doc: Doc;
  measure: Measure;
  zoom: number;
  selectedId: string | null;
  showGrid: boolean;
  snap: boolean;
  gridSize: number;
  onSelect: (id: string | null) => void;
  onChange: (fn: (doc: Doc) => Doc, mergeKey: string) => void;
  onEditText: (id: string) => void;
  onZoom: (delta: number) => void;
  /** Re-render trigger when fonts finish loading. */
  fontsVersion: number;
};

const SNAP_PX = 6;

/** Snapping targets: canvas edges/centre and other elements' edges/centres. */
function targets(doc: Doc, exclude: string) {
  const xs = [0, doc.width / 2, doc.width], ys = [0, doc.height / 2, doc.height];
  for (const el of doc.elements) {
    if (el.id === exclude || el.rotation) continue;
    xs.push(el.x, el.x + el.w / 2, el.x + el.w);
    ys.push(el.y, el.y + el.h / 2, el.y + el.h);
  }
  return { xs, ys };
}

function snapAxis(edges: number[], candidates: number[], threshold: number): { delta: number; at: number } | null {
  let best: { delta: number; at: number } | null = null;
  for (const e of edges)
    for (const c of candidates) {
      const d = c - e;
      if (Math.abs(d) <= threshold && (!best || Math.abs(d) < Math.abs(best.delta))) best = { delta: d, at: c };
    }
  return best;
}

export function Canvas({ doc, measure, zoom, selectedId, showGrid, snap, gridSize, onSelect, onChange, onEditText, onZoom, fontsVersion }: CanvasProps) {
  const t = useTranslations("designer.canvas");
  const [guides, setGuides] = useState<Guide[]>([]);
  const drag = useRef<null | { kind: "move" | "resize"; id: string; start: { x: number; y: number }; el: El; handle?: Handle; key: string; pointerId: number; moved: boolean }>(null);
  const stage = useRef<HTMLDivElement>(null);
  const seq = useRef(0);
  const selected = doc.elements.find((e) => e.id === selectedId) ?? null;
  const W = doc.width * zoom, H = doc.height * zoom;

  const toDoc = (e: { clientX: number; clientY: number }) => {
    const r = stage.current!.getBoundingClientRect();
    return { x: (e.clientX - r.left) / zoom, y: (e.clientY - r.top) / zoom };
  };

  function begin(e: ReactPointerEvent, kind: "move" | "resize", el: El, handle?: Handle) {
    e.stopPropagation();
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    drag.current = { kind, id: el.id, start: toDoc(e), el, handle, key: `${kind}-${el.id}-${++seq.current}`, pointerId: e.pointerId, moved: false };
  }

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return;
    const target = (e.target as Element).closest("[data-el]");
    const id = target?.getAttribute("data-el") ?? null;
    onSelect(id);
    const el = id ? doc.elements.find((x) => x.id === id) : null;
    if (el && !el.locked) begin(e, "move", el);
  }

  function onPointerMove(e: ReactPointerEvent) {
    const d = drag.current;
    if (!d || e.pointerId !== d.pointerId) return;
    const p = toDoc(e);
    const dx = p.x - d.start.x, dy = p.y - d.start.y;
    if (!d.moved && Math.hypot(dx * zoom, dy * zoom) < 2) return;
    d.moved = true;
    const el0 = d.el;
    const threshold = SNAP_PX / zoom;

    if (d.kind === "move") {
      let x = el0.x + dx, y = el0.y + dy;
      const found: Guide[] = [];
      if (snap) {
        if (gridSize > 0) {
          x = Math.round(x / gridSize) * gridSize;
          y = Math.round(y / gridSize) * gridSize;
        }
        if (!el0.rotation) {
          const tg = targets(doc, el0.id);
          const sx = snapAxis([x, x + el0.w / 2, x + el0.w], tg.xs, threshold);
          const sy = snapAxis([y, y + el0.h / 2, y + el0.h], tg.ys, threshold);
          if (sx) {
            x += sx.delta;
            found.push({ axis: "x", pos: sx.at });
          }
          if (sy) {
            y += sy.delta;
            found.push({ axis: "y", pos: sy.at });
          }
        }
      }
      if (e.shiftKey) {
        // Constrain to the dominant axis.
        if (Math.abs(dx) > Math.abs(dy)) y = el0.y;
        else x = el0.x;
      }
      setGuides(found);
      onChange((doc2) => ({ ...doc2, elements: doc2.elements.map((it) => (it.id === el0.id ? ({ ...it, x, y } as El) : it)) }), d.key);
      return;
    }

    // Resize in the element's own (rotated) frame, keeping the opposite side fixed.
    const h = d.handle!;
    const th = (el0.rotation * Math.PI) / 180;
    const cos = Math.cos(th), sin = Math.sin(th);
    const lx = dx * cos + dy * sin, ly = -dx * sin + dy * cos;
    let w = el0.w + h.hx * lx, hh = el0.h + h.hy * ly;
    const keepRatio = e.shiftKey || ((el0.type === "image" || el0.type === "icon" || (el0.type === "text" && h.hx && h.hy)) && h.hx !== 0 && h.hy !== 0);
    if (keepRatio && h.hx && h.hy) {
      const k = Math.max(w / el0.w, hh / el0.h);
      w = el0.w * k;
      hh = el0.h * k;
    }
    if (el0.type === "text" && !h.hy) hh = el0.h;
    w = Math.max(8, w);
    hh = Math.max(8, hh);
    if (snap && !el0.rotation && gridSize > 0) {
      if (h.hx) {
        const edge = h.hx > 0 ? el0.x + w : el0.x + el0.w - w;
        const snapped = Math.round(edge / gridSize) * gridSize;
        w += h.hx > 0 ? snapped - edge : edge - snapped;
      }
      if (h.hy && el0.type !== "text") {
        const edge = h.hy > 0 ? el0.y + hh : el0.y + el0.h - hh;
        const snapped = Math.round(edge / gridSize) * gridSize;
        hh += h.hy > 0 ? snapped - edge : edge - snapped;
      }
    }
    const cxl = (h.hx * (w - el0.w)) / 2, cyl = (h.hy * (hh - el0.h)) / 2;
    const cx = el0.x + el0.w / 2 + cxl * cos - cyl * sin;
    const cy = el0.y + el0.h / 2 + cxl * sin + cyl * cos;
    const scale = w / el0.w;
    onChange(
      (doc2) => ({
        ...doc2,
        elements: doc2.elements.map((it) => {
          if (it.id !== el0.id) return it;
          const box = { x: cx - w / 2, y: cy - hh / 2, w, h: hh };
          // Text corners scale the type; text sides only change the wrapping width.
          if (it.type === "text" && el0.type === "text" && h.hx && h.hy) return { ...it, ...box, size: Math.max(4, el0.size * scale) };
          return { ...it, ...box } as El;
        }),
      }),
      d.key,
    );
  }

  function end(e: ReactPointerEvent) {
    const d = drag.current;
    if (d && e.pointerId === d.pointerId) {
      drag.current = null;
      setGuides([]);
    }
  }

  const gridPx = gridSize * zoom;

  return (
    <div
      ref={stage}
      className="relative shadow-[0_2px_24px_rgb(41_0_68/0.18)]"
      style={{ width: W, height: H, touchAction: "none" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={end}
      onPointerCancel={end}
      onDoubleClick={(e) => {
        const id = (e.target as Element).closest("[data-el]")?.getAttribute("data-el");
        const el = doc.elements.find((x) => x.id === id);
        if (el?.type === "text") onEditText(el.id);
      }}
      onWheel={(e) => {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          onZoom(e.deltaY < 0 ? 0.1 : -0.1);
        }
      }}
      data-fonts={fontsVersion}
    >
      {/* Checkerboard shows transparency. */}
      <div className="absolute inset-0" style={{ backgroundColor: "#fff", backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16'%3E%3Crect width='8' height='8' fill='%23e8e8e8'/%3E%3Crect x='8' y='8' width='8' height='8' fill='%23e8e8e8'/%3E%3C/svg%3E\")" }} aria-hidden="true" />
      <div className="absolute inset-0" data-testid="design-canvas">
        <DocSvg doc={doc} measure={measure} displayWidth={W} displayHeight={H} hitAreas title={t("label", { name: doc.name })} />
      </div>
      {showGrid && gridPx >= 4 && (
        <svg className="pointer-events-none absolute inset-0" width={W} height={H} aria-hidden="true">
          <defs>
            <pattern id="editor-grid" width={gridPx} height={gridPx} patternUnits="userSpaceOnUse">
              <path d={`M${gridPx} 0H0V${gridPx}`} fill="none" stroke="rgb(138 42 120 / 0.25)" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#editor-grid)" />
        </svg>
      )}
      {guides.length > 0 && (
        <svg className="pointer-events-none absolute inset-0" width={W} height={H} aria-hidden="true">
          {guides.map((g, i) => (g.axis === "x" ? <line key={i} x1={g.pos * zoom} x2={g.pos * zoom} y1={0} y2={H} stroke="#E5007E" strokeWidth={1} /> : <line key={i} y1={g.pos * zoom} y2={g.pos * zoom} x1={0} x2={W} stroke="#E5007E" strokeWidth={1} />))}
        </svg>
      )}
      {selected && (
        <div
          className="pointer-events-none absolute border-2 border-[#E5007E]"
          style={{ left: selected.x * zoom, top: selected.y * zoom, width: selected.w * zoom, height: selected.h * zoom, transform: selected.rotation ? `rotate(${selected.rotation}deg)` : undefined }}
          data-testid="selection"
        >
          {!selected.locked &&
            HANDLES.filter((hd) => !(selected.type === "text" && hd.hy !== 0 && hd.hx === 0)).map((hd) => (
              <button
                key={hd.key}
                type="button"
                aria-label={t(`handle.${hd.key}`)}
                className="pointer-events-auto absolute size-3.5 rounded-full border-2 border-[#E5007E] bg-white p-0 sm:size-3"
                style={{ left: `calc(${(hd.hx + 1) * 50}% - 7px)`, top: `calc(${(hd.hy + 1) * 50}% - 7px)`, cursor: CURSORS[hd.key], touchAction: "none" }}
                onPointerDown={(e) => begin(e, "resize", selected, hd)}
                onPointerMove={onPointerMove}
                onPointerUp={end}
                onPointerCancel={end}
              />
            ))}
        </div>
      )}
    </div>
  );
}
