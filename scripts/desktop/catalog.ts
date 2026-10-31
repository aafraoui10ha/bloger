// Generates desktop/src/generated/catalog.json: every tool in the registry with its
// localised title and short description, taken from the same seed content as the
// website. Only these short fields are included, so the app bundle stays small.
//
//   npx tsx scripts/desktop/catalog.ts           write the file
//   npx tsx scripts/desktop/catalog.ts --check   exit 1 if it is out of date
import fs from "node:fs";
import path from "node:path";
import { TOOL_MODULES, type ToolModuleKey } from "../../src/tools/registry";
import { toolsEn } from "../../prisma/seed-data/tools.en";
import { toolsFr } from "../../prisma/seed-data/tools.fr";
import { toolsAr } from "../../prisma/seed-data/tools.ar";
import { extraToolsEn } from "../../prisma/seed-data/tools-extra.en";
import { extraToolsFr } from "../../prisma/seed-data/tools-extra.fr";
import { extraToolsAr } from "../../prisma/seed-data/tools-extra.ar";
import { designToolsEn } from "../../prisma/seed-data/tools-design.en";
import { designToolsFr } from "../../prisma/seed-data/tools-design.fr";
import { designToolsAr } from "../../prisma/seed-data/tools-design.ar";

const content = {
  en: { ...toolsEn, ...extraToolsEn, ...designToolsEn },
  fr: { ...toolsFr, ...extraToolsFr, ...designToolsFr },
  ar: { ...toolsAr, ...extraToolsAr, ...designToolsAr },
} as Record<"en" | "fr" | "ar", Record<string, { title: string; short: string }>>;

const tools = (Object.keys(TOOL_MODULES) as ToolModuleKey[]).map((key) => {
  const m = TOOL_MODULES[key] as { category: string; icon: string; wide?: boolean };
  const text = (l: "en" | "fr" | "ar") => {
    const c = content[l][key];
    if (!c) throw new Error(`Missing ${l} content for ${key}`);
    return c;
  };
  return {
    key,
    category: m.category,
    icon: m.icon,
    wide: m.wide === true,
    title: { en: text("en").title, fr: text("fr").title, ar: text("ar").title },
    short: { en: text("en").short, fr: text("fr").short, ar: text("ar").short },
  };
});

const out = path.resolve(import.meta.dirname, "../../desktop/src/generated/catalog.json");
const json = JSON.stringify({ tools }, null, 2) + "\n";
if (process.argv.includes("--check")) {
  if (!fs.existsSync(out) || fs.readFileSync(out, "utf8") !== json) {
    console.error("desktop/src/generated/catalog.json is out of date: run `npx tsx scripts/desktop/catalog.ts`");
    process.exit(1);
  }
  console.log("✓ desktop catalog is up to date");
} else {
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, json);
  console.log(`[desktop] catalog: ${tools.length} tools`);
}
