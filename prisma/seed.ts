/**
 * Safe, idempotent seed. Creates settings, categories, tool records with real
 * explanatory content, ad placements (disabled), static pages and, when at
 * least one user exists, clearly labelled demonstration drafts.
 *
 * It never creates users or passwords, never overwrites content edited in the
 * dashboard, and never enables advertising.
 *
 *   npm run db:seed
 */
import { scriptDb } from "../scripts/db";
import { toolsEn } from "./seed-data/tools.en";
import { toolsFr } from "./seed-data/tools.fr";
import { toolsAr } from "./seed-data/tools.ar";
import { extraToolsEn } from "./seed-data/tools-extra.en";
import { extraToolsFr } from "./seed-data/tools-extra.fr";
import { extraToolsAr } from "./seed-data/tools-extra.ar";
import { pages } from "./seed-data/pages";
import { demoArticles } from "./seed-data/articles";
import type { AnyToolKey as ToolKey } from "./seed-data/types";
import { isValidSlug } from "../src/lib/slug";
import { TOOL_MODULES } from "../src/tools/registry";
import { readingTimeMinutes } from "../src/lib/reading-time";

const db = scriptDb();
const LOCALES = ["en", "fr", "ar"] as const;

const TOOL_CATEGORIES = {
  image: { icon: "image", en: ["Image tools", "image-tools", "Compress, resize, convert and inspect images in your browser."], fr: ["Outils image", "outils-image", "Compressez, redimensionnez, convertissez et analysez vos images dans le navigateur."], ar: ["أدوات الصور", "أدوات-الصور", "اضغط الصور وغيّر حجمها وحوّلها وافحصها داخل متصفحك."] },
  text: { icon: "text", en: ["Text tools", "text-tools", "Count, clean and transform text in any language."], fr: ["Outils texte", "outils-texte", "Comptez, nettoyez et transformez vos textes dans toutes les langues."], ar: ["أدوات النصوص", "أدوات-النصوص", "عُدّ النصوص ونظّفها وحوّلها بأي لغة."] },
  calculators: { icon: "calculator", en: ["Calculators", "calculators", "Percentages, discounts, averages and unit conversions."], fr: ["Calculatrices", "calculatrices", "Pourcentages, remises, moyennes et conversions d’unités."], ar: ["الحاسبات", "الحاسبات", "النسب المئوية والتخفيضات والمتوسطات وتحويل الوحدات."] },
  developer: { icon: "code", en: ["Developer & web tools", "developer-tools", "QR codes, JSON, colours and encoders for web work."], fr: ["Outils web et développeur", "outils-developpeur", "QR codes, JSON, couleurs et encodeurs pour le web."], ar: ["أدوات المطورين والويب", "أدوات-المطورين", "رموز QR وJSON والألوان وأدوات الترميز لأعمال الويب."] },
} as const;

const ARTICLE_CATEGORIES = {
  images: { en: ["Images", "images"], fr: ["Images", "images"], ar: ["الصور", "الصور"] },
  writing: { en: ["Text & writing", "text-and-writing"], fr: ["Texte et écriture", "texte-et-ecriture"], ar: ["النصوص والكتابة", "النصوص-والكتابة"] },
  calculations: { en: ["Calculations", "calculations"], fr: ["Calculs", "calculs"], ar: ["الحسابات", "الحسابات"] },
} as const;

const FEATURED: ToolKey[] = ["background-remover", "image-compressor", "image-resizer", "word-counter", "password-generator", "loan-calculator", "image-to-webp"];
const RELATED: Partial<Record<ToolKey, ToolKey[]>> = {
  "image-compressor": ["image-resizer", "image-to-webp", "image-inspector"],
  "image-resizer": ["image-compressor", "image-inspector", "png-to-jpg"],
  "png-to-jpg": ["jpg-to-png", "image-compressor", "image-to-webp"],
  "jpg-to-png": ["png-to-jpg", "image-inspector", "image-resizer"],
  "image-to-webp": ["image-compressor", "png-to-jpg", "image-resizer"],
  "image-inspector": ["image-to-webp", "png-to-jpg", "jpg-to-png"],
  "word-counter": ["text-cleaner", "case-converter"],
  "text-cleaner": ["word-counter", "case-converter"],
  "case-converter": ["text-cleaner", "word-counter"],
  "percentage-calculator": ["discount-calculator", "average-calculator"],
  "discount-calculator": ["percentage-calculator", "average-calculator"],
  "average-calculator": ["percentage-calculator", "unit-converter"],
  "qr-code-generator": ["url-encoder", "color-converter"],
  "json-formatter": ["base64-converter", "url-encoder"],
  "color-converter": ["qr-code-generator", "json-formatter"],
  "unit-converter": ["percentage-calculator", "average-calculator"],
  "base64-converter": ["url-encoder", "json-formatter"],
  "url-encoder": ["base64-converter", "qr-code-generator"],
  "password-generator": ["hash-generator", "uuid-generator"],
  "uuid-generator": ["password-generator", "hash-generator"],
  "hash-generator": ["base64-converter", "password-generator"],
  "timestamp-converter": ["json-formatter", "age-calculator"],
  "bmi-calculator": ["unit-converter", "age-calculator"],
  "age-calculator": ["timestamp-converter", "bmi-calculator"],
  "loan-calculator": ["percentage-calculator", "discount-calculator"],
  "lorem-ipsum-generator": ["word-counter", "text-cleaner"],
  "background-remover": ["image-resizer", "image-compressor", "png-to-jpg"],
};

const PLACEMENTS = [
  { key: "home-mid", label: "Homepage — between sections", minHeight: 250, desktopOnly: false },
  { key: "tool-below-result", label: "Tool — below the tool card", minHeight: 250, desktopOnly: false },
  { key: "tool-bottom", label: "Tool — after FAQ", minHeight: 250, desktopOnly: false },
  { key: "sidebar", label: "Sidebar (desktop)", minHeight: 600, desktopOnly: true },
  { key: "article-top", label: "Article — after introduction", minHeight: 250, desktopOnly: false },
  { key: "article-in-content", label: "Article — between sections", minHeight: 280, desktopOnly: false },
  { key: "article-bottom", label: "Article — footer placement", minHeight: 250, desktopOnly: false },
];

async function main() {
  // Singletons — created once, never overwritten.
  await db.siteSettings.upsert({ where: { id: "default" }, update: {}, create: { id: "default", siteName: process.env.NEXT_PUBLIC_SITE_NAME || "Toolbox Atlas" } });
  await db.adSettings.upsert({ where: { id: "default" }, update: {}, create: { id: "default" } });
  await db.analyticsSettings.upsert({ where: { id: "default" }, update: {}, create: { id: "default" } });
  await db.consentConfiguration.upsert({ where: { id: "default" }, update: {}, create: { id: "default" } });

  // Ad placements — all disabled, no slot IDs.
  for (const p of PLACEMENTS) await db.adPlacement.upsert({ where: { key: p.key }, update: { label: p.label }, create: { ...p, enabled: false } });
  const toolPlacements = await db.adPlacement.findMany({ where: { key: { in: ["tool-below-result", "tool-bottom", "sidebar"] } } });

  // Categories.
  const toolCatIds: Record<string, string> = {};
  let order = 0;
  for (const [key, c] of Object.entries(TOOL_CATEGORIES)) {
    const existing = await db.categoryTranslation.findUnique({ where: { kind_locale_slug: { kind: "TOOL", locale: "en", slug: c.en[1] } } });
    if (existing) {
      toolCatIds[key] = existing.categoryId;
      continue;
    }
    const cat = await db.category.create({
      data: {
        kind: "TOOL",
        icon: c.icon,
        order: order++,
        translations: { create: LOCALES.map((l) => ({ kind: "TOOL" as const, locale: l, name: c[l][0], slug: c[l][1], description: c[l][2] })) },
      },
    });
    toolCatIds[key] = cat.id;
  }
  const articleCatIds: Record<string, string> = {};
  order = 0;
  for (const [key, c] of Object.entries(ARTICLE_CATEGORIES)) {
    const existing = await db.categoryTranslation.findUnique({ where: { kind_locale_slug: { kind: "ARTICLE", locale: "en", slug: c.en[1] } } });
    if (existing) {
      articleCatIds[key] = existing.categoryId;
      continue;
    }
    const cat = await db.category.create({
      data: { kind: "ARTICLE", order: order++, translations: { create: LOCALES.map((l) => ({ kind: "ARTICLE" as const, locale: l, name: c[l][0], slug: c[l][1] })) } },
    });
    articleCatIds[key] = cat.id;
  }

  // Tools with full translated content.
  const content = { en: { ...toolsEn, ...extraToolsEn }, fr: { ...toolsFr, ...extraToolsFr }, ar: { ...toolsAr, ...extraToolsAr } };
  const toolIds: Record<string, string> = {};
  let toolOrder = 0;
  for (const key of Object.keys(TOOL_MODULES) as ToolKey[]) {
    for (const l of LOCALES) if (!isValidSlug(content[l][key].slug)) throw new Error(`Invalid slug for ${key}/${l}: ${content[l][key].slug}`);
    const existing = await db.tool.findUnique({ where: { moduleKey: key } });
    if (existing) {
      toolIds[key] = existing.id;
      toolOrder++;
      continue;
    }
    const tool = await db.tool.create({
      data: {
        moduleKey: key,
        icon: TOOL_MODULES[key].icon,
        order: toolOrder++,
        featured: FEATURED.includes(key),
        enabled: true,
        categoryId: toolCatIds[TOOL_MODULES[key].category],
        translations: {
          create: LOCALES.map((l) => {
            const c = content[l][key];
            return {
              locale: l, slug: c.slug, title: c.title, shortDescription: c.short, aboutHtml: c.about, steps: c.steps, examples: c.examples, faq: c.faq,
              seoTitle: c.seoTitle, seoDescription: c.seoDescription, isComplete: true,
            };
          }),
        },
        adPlacements: { create: toolPlacements.map((p) => ({ placementId: p.id })) },
      },
    });
    toolIds[key] = tool.id;
  }
  for (const [from, tos] of Object.entries(RELATED)) {
    if ((await db.toolRelation.count({ where: { fromId: toolIds[from] } })) > 0) continue;
    for (const to of tos ?? []) await db.toolRelation.create({ data: { fromId: toolIds[from]!, toId: toolIds[to]! } });
  }

  // Static pages.
  for (const [key, p] of Object.entries(pages)) {
    if (await db.page.findUnique({ where: { key } })) continue;
    await db.page.create({
      data: {
        key,
        isLegal: p.isLegal,
        translations: { create: LOCALES.map((l) => ({ locale: l, slug: p[l].slug, title: p[l].title, contentHtml: p[l].html, seoDescription: p[l].seoDescription, isPublished: true, legalReviewed: false })) },
      },
    });
  }

  // Header navigation defaults.
  if ((await db.navigationItem.count()) === 0) {
    await db.navigationItem.createMany({
      data: [
        { location: "HEADER", order: 0, href: "/tools", labelEn: "Tools", labelFr: "Outils", labelAr: "الأدوات" },
        { location: "HEADER", order: 1, href: "/blog", labelEn: "Guides", labelFr: "Guides", labelAr: "الأدلة" },
      ],
    });
  }

  // Demonstration drafts — only with an existing author, never published.
  const author = await db.user.findFirst({ where: { isActive: true }, orderBy: { createdAt: "asc" } });
  if (!author) {
    console.log("No users yet: skipped demo drafts. Run `npm run admin:create`, then `npm run db:seed` again.");
  } else {
    for (const a of demoArticles) {
      if (await db.articleTranslation.findUnique({ where: { locale_slug: { locale: "en", slug: a.slug } } })) continue;
      await db.article.create({
        data: {
          status: "DRAFT",
          isDemo: true,
          authorId: author.id,
          categoryId: articleCatIds[a.category],
          translations: { create: { locale: "en", title: a.title, slug: a.slug, excerpt: a.excerpt, contentHtml: a.html, readingTimeMinutes: readingTimeMinutes(a.html), faq: [], isComplete: false } },
          toolLinks: { create: a.tools.filter((t) => toolIds[t]).map((t) => ({ toolId: toolIds[t]! })) },
        },
      });
    }
  }

  console.log(`Seed complete: ${Object.keys(toolIds).length} tools, ${Object.keys(pages).length} pages, ${PLACEMENTS.length} ad placements (all disabled).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
