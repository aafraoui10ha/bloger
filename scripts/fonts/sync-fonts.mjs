// Copies the Chart Designer fonts (SIL Open Font License, from the @fontsource
// npm packages) into public/fonts/designer/. The copied files are committed, so
// this only needs to run after changing src/tools/designer/fonts.json.
//
//   npm run fonts:sync
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "../..");
const OUT = path.join(ROOT, "public/fonts/designer");
const fonts = JSON.parse(fs.readFileSync(path.join(ROOT, "src/tools/designer/fonts.json"), "utf8"));

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
let bytes = 0;
for (const f of fonts) {
  const pkg = path.join(ROOT, "node_modules/@fontsource", f.id);
  for (const subset of f.subsets) {
    for (const w of f.weights) {
      const src = path.join(pkg, "files", `${f.id}-${subset}-${w}-normal.woff2`);
      if (!fs.existsSync(src)) throw new Error(`missing ${src}`);
      const dest = path.join(OUT, `${f.id}-${subset}-${w}.woff2`);
      fs.copyFileSync(src, dest);
      bytes += fs.statSync(dest).size;
    }
  }
  fs.copyFileSync(path.join(pkg, "LICENSE"), path.join(OUT, `${f.id}.LICENSE.txt`));
}
console.log(`[fonts] copied ${fonts.length} families (${(bytes / 1024).toFixed(0)} KB) to public/fonts/designer`);
