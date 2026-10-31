// Seamless SVG pattern generator, shared by the Pattern Generator tool and the
// Chart Designer backgrounds. Output is plain SVG markup (no external resources).

export const PATTERN_TYPES = [
  "dots", "circles", "grid", "plus", "stripes", "checks", "triangles", "diamonds", "hexagons", "zigzag", "waves", "confetti", "blobs", "memphis",
] as const;
export type PatternType = (typeof PATTERN_TYPES)[number];

export const PATTERN_GROUPS: Record<"geometric" | "dots" | "stripes" | "grids" | "waves" | "abstract" | "modern", PatternType[]> = {
  geometric: ["triangles", "diamonds", "hexagons", "checks"],
  dots: ["dots", "circles"],
  stripes: ["stripes", "zigzag"],
  grids: ["grid", "plus"],
  waves: ["waves"],
  abstract: ["confetti", "blobs"],
  modern: ["memphis"],
};

export type PatternConfig = {
  type: PatternType;
  background: string;
  /** Transparent background (PNG/SVG only). */
  transparent: boolean;
  primary: string;
  secondary: string;
  /** Tile size in px (spacing between repeats). */
  size: number;
  /** Size of the shapes relative to the tile, 5–100 (%). */
  scale: number;
  /** Line thickness in px for outlined patterns. */
  stroke: number;
  rotation: number;
  /** Opacity of the shapes, 0–1. */
  opacity: number;
  /** Seed for the abstract patterns, so a design can be reproduced. */
  seed: number;
};

export const DEFAULT_PATTERN: PatternConfig = {
  type: "dots",
  background: "#290044",
  transparent: false,
  primary: "#EEE3B0",
  secondary: "#8A2A78",
  size: 40,
  scale: 40,
  stroke: 2,
  rotation: 0,
  opacity: 1,
  seed: 7,
};

/** Small deterministic PRNG (mulberry32). */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const n = (v: number) => Math.round(v * 100) / 100;
const esc = (s: string) => s.replace(/[^#0-9a-zA-Z(),. -]/g, "");

/** Tile width, height and inner markup for one repeat of the pattern. */
export function patternTile(c: PatternConfig): { w: number; h: number; body: string } {
  const s = Math.max(4, c.size);
  const k = Math.max(0.05, Math.min(1, c.scale / 100));
  const sw = Math.max(0.5, c.stroke);
  const p = esc(c.primary), q = esc(c.secondary), sec = q;
  const line = (color: string) => `fill="none" stroke="${color}" stroke-width="${n(sw)}" stroke-linecap="round" stroke-linejoin="round"`;
  switch (c.type) {
    case "dots": {
      const r = (s / 2) * k;
      return { w: s, h: s, body: `<circle cx="${n(s / 2)}" cy="${n(s / 2)}" r="${n(r)}" fill="${p}"/><circle cx="0" cy="0" r="${n(r / 2)}" fill="${q}"/><circle cx="${s}" cy="0" r="${n(r / 2)}" fill="${q}"/><circle cx="0" cy="${s}" r="${n(r / 2)}" fill="${q}"/><circle cx="${s}" cy="${s}" r="${n(r / 2)}" fill="${q}"/>` };
    }
    case "circles":
      return { w: s, h: s, body: `<circle cx="${n(s / 2)}" cy="${n(s / 2)}" r="${n((s / 2) * k)}" ${line(p)}/><circle cx="${n(s / 2)}" cy="${n(s / 2)}" r="${n((s / 4) * k)}" ${line(q)}/>` };
    case "grid":
      return { w: s, h: s, body: `<path d="M${s} 0H0V${s}" ${line(p)}/><circle cx="0" cy="0" r="${n(sw * 1.5 * k * 2)}" fill="${q}"/>` };
    case "plus": {
      const a = (s / 4) * k * 2;
      return { w: s, h: s, body: `<path d="M${n(s / 2 - a)} ${n(s / 2)}H${n(s / 2 + a)}M${n(s / 2)} ${n(s / 2 - a)}V${n(s / 2 + a)}" ${line(p)}/><circle cx="0" cy="0" r="${n(sw)}" fill="${q}"/>` };
    }
    case "stripes": {
      const h1 = (s / 2) * k;
      return { w: s, h: s, body: `<rect x="0" y="0" width="${s}" height="${n(h1)}" fill="${p}"/><rect x="0" y="${n(s / 2)}" width="${s}" height="${n(h1 / 2)}" fill="${q}"/>` };
    }
    case "checks": {
      const a = (s / 2) * k;
      const o = (s / 2 - a) / 2;
      return { w: s, h: s, body: `<rect x="${n(o)}" y="${n(o)}" width="${n(a)}" height="${n(a)}" fill="${p}"/><rect x="${n(s / 2 + o)}" y="${n(s / 2 + o)}" width="${n(a)}" height="${n(a)}" fill="${p}"/><rect x="${n(s / 2 + o)}" y="${n(o)}" width="${n(a)}" height="${n(a)}" fill="${q}" opacity="0.5"/>` };
    }
    case "triangles": {
      // One triangle per quadrant: pointing up (main colour) and down (second colour).
      const q = s / 2;
      const t = Math.min(q * 0.95, q * k * 1.8);
      const tri = (ox: number, oy: number, up: boolean, color: string) => {
        const cx = ox + q / 2, cy = oy + q / 2;
        return up
          ? `<path d="M${n(cx - t / 2)} ${n(cy + t / 2)}L${n(cx)} ${n(cy - t / 2)}L${n(cx + t / 2)} ${n(cy + t / 2)}Z" fill="${color}"/>`
          : `<path d="M${n(cx - t / 2)} ${n(cy - t / 2)}L${n(cx)} ${n(cy + t / 2)}L${n(cx + t / 2)} ${n(cy - t / 2)}Z" fill="${color}"/>`;
      };
      return { w: s, h: s, body: tri(0, 0, true, p) + tri(q, 0, false, sec) + tri(0, q, false, sec) + tri(q, q, true, p) };
    }
    case "diamonds": {
      const a = (s / 2) * k;
      return { w: s, h: s, body: `<path d="M${n(s / 2)} ${n(s / 2 - a)}L${n(s / 2 + a)} ${n(s / 2)}L${n(s / 2)} ${n(s / 2 + a)}L${n(s / 2 - a)} ${n(s / 2)}Z" fill="${p}"/><circle cx="0" cy="0" r="${n(a / 4)}" fill="${q}"/><circle cx="${s}" cy="0" r="${n(a / 4)}" fill="${q}"/><circle cx="0" cy="${s}" r="${n(a / 4)}" fill="${q}"/><circle cx="${s}" cy="${s}" r="${n(a / 4)}" fill="${q}"/>` };
    }
    case "hexagons": {
      const r = s / 2;
      const w = r * Math.sqrt(3);
      const h = r * 3;
      const hex = (cx: number, cy: number, rr: number) =>
        Array.from({ length: 6 }, (_, i) => {
          const a = (Math.PI / 3) * i + Math.PI / 6;
          return `${i ? "L" : "M"}${n(cx + rr * Math.cos(a))} ${n(cy + rr * Math.sin(a))}`;
        }).join("") + "Z";
      const rr = r * (0.4 + 0.6 * k);
      return { w: n(w), h: n(h), body: `<path d="${hex(w / 2, r, rr)}" ${line(p)}/><path d="${hex(0, r * 2.5, rr)}${hex(w, r * 2.5, rr)}" ${line(q)}/>` };
    }
    case "zigzag": {
      const a = (s / 4) * k;
      const zig = (y: number) => `M0 ${n(y + a / 2)}L${n(s / 4)} ${n(y - a / 2)}L${n(s / 2)} ${n(y + a / 2)}L${n((3 * s) / 4)} ${n(y - a / 2)}L${s} ${n(y + a / 2)}`;
      return { w: s, h: s, body: `<path d="${zig(s / 4)}" ${line(p)}/><path d="${zig((3 * s) / 4)}" ${line(q)}/>` };
    }
    case "waves": {
      const a = (s / 3) * k;
      return { w: s, h: s, body: `<path d="M0 ${n(s / 4)}Q${n(s / 4)} ${n(s / 4 - a)} ${n(s / 2)} ${n(s / 4)}T${s} ${n(s / 4)}" ${line(p)}/><path d="M0 ${n((3 * s) / 4)}Q${n(s / 4)} ${n((3 * s) / 4 - a)} ${n(s / 2)} ${n((3 * s) / 4)}T${s} ${n((3 * s) / 4)}" ${line(q)}/>` };
    }
    case "confetti": {
      const rnd = seeded(c.seed);
      const parts: string[] = [];
      const count = 7;
      for (let i = 0; i < count; i++) {
        const x = s * (0.12 + 0.76 * rnd()), y = s * (0.12 + 0.76 * rnd());
        const len = s * 0.12 * k * 2, rot = Math.round(rnd() * 180);
        const color = i % 2 ? q : p;
        parts.push(i % 3 === 0 ? `<circle cx="${n(x)}" cy="${n(y)}" r="${n(len / 3)}" fill="${color}"/>` : `<rect x="${n(x - len / 2)}" y="${n(y - len / 6)}" width="${n(len)}" height="${n(len / 3)}" rx="${n(len / 6)}" fill="${color}" transform="rotate(${rot} ${n(x)} ${n(y)})"/>`);
      }
      return { w: s, h: s, body: parts.join("") };
    }
    case "blobs": {
      const rnd = seeded(c.seed);
      const blob = (cx: number, cy: number, r: number) => {
        const pts = Array.from({ length: 7 }, (_, i) => {
          const a = (Math.PI * 2 * i) / 7;
          const rr = r * (0.75 + rnd() * 0.5);
          return [cx + rr * Math.cos(a), cy + rr * Math.sin(a)] as const;
        });
        // Smooth closed curve through the points (Catmull-Rom → cubic Bézier).
        let d = `M${n(pts[0]![0])} ${n(pts[0]![1])}`;
        for (let i = 0; i < pts.length; i++) {
          const p0 = pts[(i - 1 + pts.length) % pts.length]!, p1 = pts[i]!, p2 = pts[(i + 1) % pts.length]!, p3 = pts[(i + 2) % pts.length]!;
          d += `C${n(p1[0] + (p2[0] - p0[0]) / 6)} ${n(p1[1] + (p2[1] - p0[1]) / 6)} ${n(p2[0] - (p3[0] - p1[0]) / 6)} ${n(p2[1] - (p3[1] - p1[1]) / 6)} ${n(p2[0])} ${n(p2[1])}`;
        }
        return d + "Z";
      };
      const r = (s / 5) * (0.4 + k);
      return { w: s, h: s, body: `<path d="${blob(s * 0.3, s * 0.32, r)}" fill="${p}"/><path d="${blob(s * 0.72, s * 0.7, r * 0.8)}" fill="${q}"/>` };
    }
    case "memphis": {
      const rnd = seeded(c.seed);
      const u = (s / 8) * (0.5 + k);
      const at = () => [s * (0.15 + 0.7 * rnd()), s * (0.15 + 0.7 * rnd())] as const;
      const [x1, y1] = at(), [x2, y2] = at(), [x3, y3] = at(), [x4, y4] = at();
      return {
        w: s,
        h: s,
        body:
          `<path d="M${n(x1 - u)} ${n(y1)}q${n(u / 2)} ${n(-u)} ${n(u)} 0t${n(u)} 0t${n(u)} 0" ${line(p)}/>` +
          `<path d="M${n(x2)} ${n(y2 - u)}L${n(x2 + u)} ${n(y2 + u)}L${n(x2 - u)} ${n(y2 + u)}Z" ${line(q)}/>` +
          `<circle cx="${n(x3)}" cy="${n(y3)}" r="${n(u * 0.6)}" fill="${p}"/>` +
          `<path d="M${n(x4 - u * 0.6)} ${n(y4)}H${n(x4 + u * 0.6)}M${n(x4)} ${n(y4 - u * 0.6)}V${n(y4 + u * 0.6)}" ${line(q)}/>`,
      };
    }
  }
}

/** A <pattern> element (for <defs>) that fills with this pattern. */
export function patternDef(c: PatternConfig, id: string): string {
  const t = patternTile(c);
  return `<pattern id="${id}" width="${t.w}" height="${t.h}" patternUnits="userSpaceOnUse" patternTransform="rotate(${n(c.rotation)})"><g opacity="${n(c.opacity)}">${t.body}</g></pattern>`;
}

/** Full SVG image of the pattern at the given size. */
export function patternSvg(c: PatternConfig, width: number, height: number, id = "p"): string {
  const safeId = id.replace(/[^\w-]/g, "") || "p";
  const bg = c.transparent ? "" : `<rect width="100%" height="100%" fill="${esc(c.background)}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs>${patternDef(c, safeId)}</defs>${bg}<rect width="100%" height="100%" fill="url(#${safeId})"/></svg>`;
}

/** CSS background for websites: one tile as an SVG data URI (rotation is applied inside the tile's pattern). */
export function patternCss(c: PatternConfig): string {
  const t = patternTile(c);
  // A rotated pattern does not tile seamlessly as one square, so the tile itself is
  // an SVG filled with the rotated pattern, sized to a repeat that stays seamless.
  const rotated = c.rotation % 360 !== 0;
  const size = rotated ? Math.round(Math.max(t.w, t.h) * 8) : 0;
  const tile = rotated
    ? `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><defs>${patternDef(c, "p")}</defs><rect width="100%" height="100%" fill="url(#p)"/></svg>`
    : `<svg xmlns="http://www.w3.org/2000/svg" width="${t.w}" height="${t.h}"><g opacity="${n(c.opacity)}">${t.body}</g></svg>`;
  const uri = `url("data:image/svg+xml,${encodeURIComponent(tile)}")`;
  const lines = [
    ...(c.transparent ? [] : [`background-color: ${c.background};`]),
    `background-image: ${uri};`,
    `background-size: ${rotated ? `${size}px ${size}px` : `${t.w}px ${t.h}px`};`,
    "background-repeat: repeat;",
    ...(rotated && c.rotation % 90 !== 0 ? ["/* Rotations that are not multiples of 90° can show a faint seam in CSS; the SVG export has none. */"] : []),
  ];
  return lines.join("\n");
}
