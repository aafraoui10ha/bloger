// Curated palette library shared by the Colour Palettes tool and the Chart Designer.
// Each palette is five colours, ordered from the most to the least prominent use.

export const PALETTE_CATEGORIES = ["modern", "minimal", "luxury", "corporate", "nature", "pastel", "vintage", "dark", "vibrant", "gradient", "monochrome"] as const;
export type PaletteCategory = (typeof PALETTE_CATEGORIES)[number];
export type Palette = { id: string; category: PaletteCategory; colors: string[] };

const RAW: Record<PaletteCategory, string[]> = {
  modern: [
    "#264653 #2A9D8F #E9C46A #F4A261 #E76F51",
    "#0B132B #1C2541 #3A506B #5BC0BE #F2F2F2",
    "#22223B #4A4E69 #9A8C98 #C9ADA7 #F2E9E4",
    "#003049 #D62828 #F77F00 #FCBF49 #EAE2B7",
    "#1D3557 #457B9D #A8DADC #F1FAEE #E63946",
    "#2B2D42 #8D99AE #EDF2F4 #EF233C #D90429",
    "#16213E #0F3460 #533483 #E94560 #F5F5F5",
    "#05668D #028090 #00A896 #02C39A #F0F3BD",
    "#3D405B #E07A5F #F4F1DE #81B29A #F2CC8F",
    "#14213D #FCA311 #E5E5E5 #FFFFFF #000000",
  ],
  minimal: [
    "#111111 #444444 #888888 #DDDDDD #FFFFFF",
    "#1F1F1F #F5F5F0 #D9D4C7 #A39E93 #6B665E",
    "#2E2E2E #F7F7F7 #E0E0E0 #3D5A80 #98C1D9",
    "#222831 #393E46 #00ADB5 #EEEEEE #FFFFFF",
    "#0F0F0F #FAFAFA #E8E8E8 #FF5A36 #BDBDBD",
    "#2D3142 #BFC0C0 #FFFFFF #EF8354 #4F5D75",
    "#1A1A1A #F2EFEA #CFC8BC #8C857B #D4573B",
    "#333333 #F4F4F4 #CCCCCC #5C7AEA #A3B1F5",
    "#101820 #F2AA4C #FFFFFF #E6E6E6 #7A7A7A",
    "#252422 #FFFCF2 #CCC5B9 #403D39 #EB5E28",
  ],
  luxury: [
    "#290044 #500071 #8A2A78 #EEE3B0 #FAF7EA",
    "#0D0D0D #1C1C1C #C9A227 #E8D9A8 #FFFFFF",
    "#1B1B2F #162447 #1F4068 #E43F5A #D4AF37",
    "#2C061F #374045 #D89216 #E1D89F #F5F1E3",
    "#0F1A20 #233D4D #B08D57 #E6D3A3 #F7F3EA",
    "#3C1518 #69140E #A44200 #D58936 #F2F3AE",
    "#000000 #14110F #34312D #7E7F83 #D9C5B2",
    "#0B3D2E #145A41 #C5A253 #EFE3C2 #FAF6EC",
    "#1A1423 #372549 #774C60 #B75D69 #EACDC2",
    "#212121 #5D4037 #A1887F #D7CCC8 #C6A15B",
  ],
  corporate: [
    "#003F72 #0073B1 #5BA4D6 #E5EEF5 #FF8C00",
    "#0A2342 #2CA58D #84BC9C #FFFDF7 #F46197",
    "#1F3A5F #4D648D #ACC2EF #F0F4FA #3DDC97",
    "#002B5B #2B4865 #256D85 #8FE3CF #F3F3F3",
    "#13315C #134074 #8DA9C4 #EEF4ED #E09F3E",
    "#0E1A40 #222F5B #5D5D5D #946B2D #F2F2F2",
    "#073B4C #118AB2 #06D6A0 #FFD166 #EF476F",
    "#1B263B #415A77 #778DA9 #E0E1DD #0D1B2A",
    "#003049 #669BBC #FDF0D5 #C1121F #780000",
    "#023E8A #0077B6 #0096C7 #48CAE4 #CAF0F8",
  ],
  nature: [
    "#283618 #606C38 #FEFAE0 #DDA15E #BC6C25",
    "#2D6A4F #40916C #52B788 #95D5B2 #D8F3DC",
    "#344E41 #3A5A40 #588157 #A3B18A #DAD7CD",
    "#5F0F40 #9A031E #FB8B24 #E36414 #0F4C5C",
    "#0B3954 #087E8B #BFD7EA #FF5A5F #C81D25",
    "#4F772D #90A955 #ECF39E #31572C #132A13",
    "#7F5539 #9C6644 #B08968 #DDB892 #EDE0D4",
    "#006D77 #83C5BE #EDF6F9 #FFDDD2 #E29578",
    "#386641 #6A994E #A7C957 #F2E8CF #BC4749",
    "#22577A #38A3A5 #57CC99 #80ED99 #C7F9CC",
  ],
  pastel: [
    "#CDB4DB #FFC8DD #FFAFCC #BDE0FE #A2D2FF",
    "#FFADAD #FFD6A5 #FDFFB6 #CAFFBF #9BF6FF",
    "#F8EDEB #FCD5CE #FEC5BB #E8E8E4 #D8E2DC",
    "#E2ECE9 #BEE1E6 #F0EFEB #DFE7FD #CDDAFD",
    "#FBF8CC #FDE4CF #FFCFD2 #F1C0E8 #CFBAF0",
    "#EDE7B1 #F6C6EA #CDF0EA #F9F9F9 #B1B2FF",
    "#D8E2DC #FFE5D9 #FFCAD4 #F4ACB7 #9D8189",
    "#EAE4E9 #FFF1E6 #FDE2E4 #DFE7FD #BCD4E6",
    "#C9E4DE #C6DEF1 #DBCDF0 #F2C6DE #F7D9C4",
    "#FAEDCB #C9E4DE #C6DEF1 #DBCDF0 #F2C6DE",
  ],
  vintage: [
    "#6B4226 #D9A441 #F2E3BC #8C2F39 #2E4057",
    "#5C3D2E #B85C38 #E0C097 #2D2424 #F5E9CF",
    "#3E4E50 #FACFAD #F8BD7F #F5AC72 #F2A65A",
    "#8E7DBE #A6D8D4 #F2F2C4 #F2B5A7 #D99594",
    "#704214 #C19A6B #E6D2AA #8B5A2B #3B2F2F",
    "#355070 #6D597A #B56576 #E56B6F #EAAC8B",
    "#A26769 #D5B9B2 #ECE2D0 #CEBEBE #6D2E46",
    "#264027 #3C5233 #6F732F #B38A58 #932F6D",
    "#540B0E #9E2A2B #E09F3E #FFF3B0 #335C67",
    "#BC6C25 #DDA15E #FEFAE0 #606C38 #283618",
  ],
  dark: [
    "#0D1117 #161B22 #30363D #58A6FF #F0F6FC",
    "#121212 #1E1E1E #2C2C2C #BB86FC #03DAC6",
    "#0F0E17 #2E2F3E #A7A9BE #FF8906 #F25F4C",
    "#10002B #240046 #3C096C #5A189A #E0AAFF",
    "#0B0C10 #1F2833 #C5C6C7 #66FCF1 #45A29E",
    "#1A1A2E #16213E #0F3460 #E94560 #F1F1F1",
    "#000000 #14213D #FCA311 #E5E5E5 #FFFFFF",
    "#161A1D #660708 #A4161A #E5383B #F5F3F4",
    "#111827 #1F2937 #374151 #10B981 #F9FAFB",
    "#0A0908 #22333B #EAE0D5 #C6AC8F #5E503F",
  ],
  vibrant: [
    "#FF006E #FB5607 #FFBE0B #3A86FF #8338EC",
    "#F72585 #7209B7 #3A0CA3 #4361EE #4CC9F0",
    "#FF595E #FFCA3A #8AC926 #1982C4 #6A4C93",
    "#EF476F #FFD166 #06D6A0 #118AB2 #073B4C",
    "#F94144 #F3722C #F8961E #90BE6D #577590",
    "#FF0054 #FF5400 #FFBD00 #390099 #9E0059",
    "#00F5D4 #00BBF9 #FEE440 #F15BB5 #9B5DE5",
    "#E63946 #F4A261 #2A9D8F #264653 #E9C46A",
    "#FF4D6D #FF8FA3 #FFCCD5 #590D22 #C9184A",
    "#2EC4B6 #CBF3F0 #FFBF69 #FF9F1C #011627",
  ],
  // Stepped scales: smooth transitions between two hues, used as discrete colours.
  gradient: [
    "#03045E #023E8A #0077B6 #00B4D8 #90E0EF",
    "#590D22 #800F2F #A4133C #C9184A #FF4D6D",
    "#FF7B00 #FF8800 #FF9500 #FFA200 #FFB700",
    "#10002B #3C096C #7B2CBF #C77DFF #E0AAFF",
    "#004B23 #007200 #38B000 #70E000 #CCFF33",
    "#F72585 #B5179E #7209B7 #480CA8 #3F37C9",
    "#2D00F7 #6A00F4 #A100F2 #DB00B6 #F20089",
    "#0081A7 #00AFB9 #FDFCDC #FED9B7 #F07167",
    "#FFBA08 #FAA307 #F48C06 #DC2F02 #9D0208",
    "#290044 #500071 #8A2A78 #C46B8F #EEE3B0",
  ],
  monochrome: [
    "#03071E #370617 #6A040F #9D0208 #D00000",
    "#012A4A #013A63 #01497C #2A6F97 #61A5C2",
    "#1B4332 #2D6A4F #40916C #74C69D #B7E4C7",
    "#240046 #3C096C #5A189A #7B2CBF #9D4EDD",
    "#212529 #495057 #ADB5BD #DEE2E6 #F8F9FA",
    "#7F4F24 #936639 #A68A64 #B6AD90 #C2C5AA",
    "#590D22 #800F2F #A4133C #FF758F #FFCCD5",
    "#0D1B2A #1B263B #415A77 #778DA9 #E0E1DD",
    "#603808 #8B5E34 #BC8A5F #E7BC91 #FFEDD8",
    "#004E64 #00A5CF #9FFFCB #25A18E #7AE582",
  ],
};

export const PALETTES: Palette[] = PALETTE_CATEGORIES.flatMap((category) =>
  RAW[category].map((line, i) => ({ id: `${category}-${i + 1}`, category, colors: line.split(" ") })),
);

export const getPalette = (id: string): Palette | undefined => PALETTES.find((p) => p.id === id);

/** Hue family of a colour, used for "filter by colour". */
export const COLOR_FAMILIES = ["red", "orange", "yellow", "green", "teal", "blue", "purple", "pink", "brown", "neutral"] as const;
export type ColorFamily = (typeof COLOR_FAMILIES)[number];

export function colorFamily(hex: string): ColorFamily {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  if (s < 0.18 || l < 0.08 || l > 0.95) return "neutral";
  let h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h = (h * 60 + 360) % 360;
  if ((h < 15 || h >= 345)) return "red";
  if (h < 40) return l < 0.45 && s < 0.7 ? "brown" : "orange";
  if (h < 65) return "yellow";
  if (h < 160) return "green";
  if (h < 195) return "teal";
  if (h < 255) return "blue";
  if (h < 300) return "purple";
  return "pink";
}

export function paletteMatches(p: Palette, opts: { category?: PaletteCategory | "all"; family?: ColorFamily | "all"; query?: string }): boolean {
  if (opts.category && opts.category !== "all" && p.category !== opts.category) return false;
  if (opts.family && opts.family !== "all" && !p.colors.some((c) => colorFamily(c) === opts.family)) return false;
  const q = opts.query?.trim().toUpperCase().replace(/^#/, "");
  if (q && !p.colors.some((c) => c.slice(1).startsWith(q)) && !p.id.toUpperCase().includes(q)) return false;
  return true;
}
