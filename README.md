# Toolbox Atlas

A multilingual (English / French / Arabic) platform of free, privacy-friendly online tools, with an editorial CMS, a role-based admin dashboard, technical SEO, consent management and an AdSense *readiness* framework.

"Toolbox Atlas" is a placeholder brand. Change it in **Dashboard → Site settings** (or `NEXT_PUBLIC_SITE_NAME`).

> Nothing in this project requests, automates, guarantees or displays Google AdSense approval. Ads stay off until the owner configures and confirms everything (see [docs/ADSENSE-CHECKLIST.md](docs/ADSENSE-CHECKLIST.md)).

## Contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Local setup](#local-setup)
- [Scripts](#scripts)
- [Project structure](#project-structure)
- [Testing](#testing)
- [Known limitations and outstanding manual work](#known-limitations-and-outstanding-manual-work)
- Further docs: [Deployment](docs/DEPLOYMENT.md) · [Security](docs/SECURITY.md) · [AdSense readiness](docs/ADSENSE-CHECKLIST.md)

## Features

**Public site** (`/en`, `/fr`, `/ar` — Arabic is right-to-left)
- Homepage with search, featured tools, tools by category, recent tools, guides, how-it-works and trust sections.
- 27 working tools, all processed **in the browser** (no uploads):
  - Images: AI background remover, compressor, resizer, PNG→JPG, JPG→PNG, →WebP, format & size inspector (magic-byte detection). The background remover runs BiRefNet-lite (MIT) on WebGPU, or MODNet (Apache-2.0) on the CPU when WebGPU is missing, via Transformers.js in a Web Worker; model weights download from Hugging Face and the ONNX runtime from jsDelivr on first use. Image work runs in a Web Worker with `OffscreenCanvas`, falling back to the main thread.
  - Text: word & character counter (Unicode-aware), whitespace cleaner, case converter.
  - Calculators: percentage, discount + VAT, average/median, unit converter, BMI (WHO adult categories), exact age, loan/mortgage payment.
  - Developer: QR code (PNG/SVG), JSON formatter/validator, HEX/RGB/HSL converter with WCAG contrast, Base64 (UTF-8 safe), URL encoder, password generator (Web Crypto), UUID v4, SHA hashes, Unix timestamp converter.
  - Text also includes a Lorem Ipsum generator.
- Tool pages: localized instructions, steps, examples, FAQ, privacy notice, related tools/guides, `WebApplication` + `FAQPage` + `BreadcrumbList` JSON-LD.
- Blog with categories, tags, table of contents, FAQ, related content, `BlogPosting`/`Article` JSON-LD.
- **Services** page (Nexoraat agency services, with links to nexoraat.com and the contact form) and a “Built by Nexoraat” section on About.
- Static pages (About, Contact, Privacy, Terms, Cookie settings, Editorial, Corrections), editable in the dashboard.
- Contact form (Gmail SMTP): validated server-side, rate-limited, honeypot-protected. Messages are emailed to `RECIPIENT_EMAIL` and never stored. It appears only when the `EMAIL_*` variables are set.
- Search (noindex), custom 404 and error pages, `sitemap.xml` with hreflang, `robots.txt`, owner-supplied `ads.txt`.
- Canonical URLs, hreflang + `x-default`, localized slugs, permanent redirects on slug changes.
- Consent banner and settings panel with Google Consent Mode v2 (all signals default to *denied*); optional tags load only after consent.

**Dashboard** (`/admin`), localized in the same three languages
- Overview with real counts only (no fabricated traffic or revenue), SEO issues, broken links, integration status, audit trail.
- Articles: list with search, filters, sorting, pagination and bulk actions; TipTap editor; autosave for drafts; revisions with restore; per-language translations with a "complete" gate; preview (private, noindex); submit for review, publish, schedule, unpublish, archive, delete with an optional redirect.
- Categories (articles and tools), with merge-on-delete and automatic redirects; tags with merge.
- Tools registry: metadata only. Functionality comes from version-controlled modules ([src/tools/registry.ts](src/tools/registry.ts)); the dashboard can never run admin-provided code.
- Pages with version history, legal-review flags, media library (server-side content validation, usage tracking, safe deletion), navigation, users & roles, SEO health, redirects, AdSense settings, consent, analytics, site settings, audit log.

## Tech stack

| Area | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Server Actions, `proxy.ts`), React 19, TypeScript 5.9 strict |
| Styling | Tailwind CSS 4 with semantic design tokens, light/dark themes. Flat brand palette (#290044, #500071, #8A2A78, #EEE3B0), no gradients |
| Motion | GSAP 3 + ScrollTrigger: hero entrance, scroll reveals, floating shapes, count-up stats. Fully disabled for `prefers-reduced-motion` |
| Data | MySQL 5.7+/8 or MariaDB (utf8mb4) + Prisma 7 (`@prisma/adapter-mariadb`) |
| i18n | next-intl 4 (public site); typed dictionaries for the dashboard |
| Auth | Custom, minimal and auditable: bcrypt (cost 12), DB-backed sessions with SHA-256-hashed tokens, `__Host-` httpOnly cookies, RBAC on every action |
| Validation | Zod 4 |
| Editor | TipTap 3; HTML sanitized with `sanitize-html` on save **and** on render |
| Tests | Vitest 5 (unit + integration against a real MySQL test database), Playwright (e2e) |
| Hosting | Vercel-compatible (any Node 20.9+ host works) |

**Pinned versions:** TypeScript is pinned to 5.9 (TypeScript 7 was released very recently and isn't yet verified with the Next.js toolchain). Prisma stays on 7.x because 8 is still a release candidate.

**Authentication:** custom rather than Auth.js. Auth.js credentials login requires JWT sessions, and this project needs server-side revocable sessions, role checks on every server action, and no third-party identity provider. The implementation lives in [src/lib/auth/](src/lib/auth/).

## Local setup

Requirements: Node.js ≥ 20.9, a local MySQL 5.7+/8 or MariaDB (Laragon, XAMPP or similar), and about 3 GB of free disk space.

```bash
# Create the databases once (utf8mb4 is required for Arabic):
#   CREATE DATABASE bloger      CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
#   CREATE DATABASE bloger_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

npm install                 # also runs `prisma generate`
cp .env.example .env        # defaults: mysql://root@localhost:3306/bloger
npm run db:deploy           # apply migrations
npm run admin:create -- --email you@example.com --name "Your Name"   # prompts for a password
npm run db:seed             # tools, pages, categories, placements (+ demo drafts once a user exists)
npm run dev                 # http://localhost:3000  →  /en, /fr, /ar, /admin
```

There is **no default administrator**. `admin:create` is the only way to create the first account, and the password is never stored in code or logs.

In **PowerShell**, `npm run` drops flags after `--`. Run the script directly instead: `npx tsx scripts/create-admin.ts --email you@example.com --name "Your Name"`.

Integration tests use `bloger_test` (override with `TEST_DATABASE_URL`). They empty its tables, so never point it at real data.

## Scripts

| Script | Purpose |
|---|---|
| `dev` / `build` / `start` | Next.js development, production build, production server |
| `lint` / `typecheck` | ESLint (flat config, core-web-vitals) and `tsc --noEmit` |
| `test` | All Vitest projects (unit + integration; integration needs the `bloger_test` database) |
| `test:unit` / `test:integration` | Individual Vitest projects |
| `test:e2e` | Playwright journeys against `npm start` (build first) |
| `db:migrate` / `db:deploy` | Create a migration (dev) / apply migrations (prod) |
| `db:seed` | Idempotent seed; never creates users, never overwrites edits, never enables ads |
| `admin:create` | Create a dashboard account (`--role SUPER_ADMIN|ADMIN|EDITOR|AUTHOR`) |
| `admin:reset-password` | Account recovery from the server shell |

## Project structure

```
prisma/                 schema, migrations, seed + seed-data (tool content, pages, demo drafts)
messages/{en,fr,ar}.json   public UI strings (a test enforces identical keys)
scripts/                admin CLI
src/proxy.ts            locale routing + cheap admin cookie pre-check
src/app/[locale]/       public site
src/app/admin/          dashboard (login, reset, (panel)/…)
src/app/{sitemap,robots}.ts, ads.txt/, media/[id]/, api/{cron/publish,health}/
src/admin/              dashboard i18n, server actions, SEO health, shared UI
src/lib/                auth, db, content queries, SEO, ads gate, consent, sanitizer, storage
src/tools/              registry, pure logic (unit-tested), UI modules, image worker
tests/{unit,integration,e2e}/
```

### Key design decisions

- **Localized content is separate from shared identity:** `Article`/`ArticleTranslation`, `Tool`/`ToolTranslation`, and so on. A translation is public only when an editor marks it *complete*. Missing translations return 404 for that locale, are omitted from hreflang and sitemaps, and are shown as unavailable in the language switcher.
- **Scheduled publishing:** public queries treat `SCHEDULED` articles with `publishAt ≤ now` as published, so articles go live on time even if the cron runs only daily. `/api/cron/publish` (Vercel Cron, `CRON_SECRET`) then finalizes their status; the dashboard shows the last run and any overdue items.
- **Ads are gated by multiple independent conditions** ([src/lib/ads.ts](src/lib/ads.ts), fully unit-tested), then by visitor consent on the client.
- **Media storage:** `MEDIA_STORAGE=database` (default) stores files in the database, which is durable on serverless hosts. `MEDIA_STORAGE=s3` uses any S3-compatible bucket. Local disk is never used.

## Testing

What was executed for this delivery, all passing:

| Check | Result |
|---|---|
| `tsc --noEmit` | 0 errors |
| `eslint .` | 0 errors, 0 warnings |
| Vitest unit (52 tests) | new tool logic (password, hashes, timestamps, BMI, age, loan, lorem),  contact form validation and header-injection safety, tool logic, i18n key parity, permissions, sanitizer, slugs, URL safety, ads gate, ads.txt, consent, SEO/hreflang, sitemap builder, audit redaction |
| Vitest integration (13 tests, real MySQL 5.7) | publication visibility, scheduling + scheduler, sitemap eligibility, redirects, SEO health, publish rules, rate limiting, password hashing, hashed sessions, audit redaction, media validation |
| Playwright (20 tests, run with reduced motion) | services/about pages and Nexoraat links, new tools, contact form validation, image tool + download, file validation, text/calculator tools, language switch + RTL, ad/analytics code absent, cookie preferences persist/change, sitemap eligibility, 404, unauthorized access, wrong password, create draft, draft not public/indexed, editor update + publish gate + publish, canonical URL + JSON-LD, delete with redirect, every dashboard section renders, invalid AdSense IDs rejected |
| `next build` | succeeds |
| `npm audit --omit=dev` | 0 vulnerabilities |

E2E setup creates three local test accounts (`e2e-*@localhost.test`) and refuses to run against a non-local database.

## Known limitations and outstanding manual work

The owner must do the following. These steps can't be faked or completed by code.

1. **Content:** the 8 seeded articles are clearly labelled *demo drafts* (English only). Write original, researched, reviewed guides before applying for AdSense.
2. **Translations:** have native speakers review the French and Arabic UI and tool texts.
3. **Legal:** complete the privacy policy and terms with your identity and contact details, and have them reviewed by a qualified lawyer. Then tick "reviewed" in the dashboard.
4. **Contact email and organization details** go in Dashboard → Site settings. Organization JSON-LD is emitted only when these are filled in.
5. **AdSense:** publisher ID, `ads.txt` line, approval status and source, and a certified CMP for EEA/UK/CH visitors. See the [AdSense checklist](docs/ADSENSE-CHECKLIST.md).
6. **Contact form:** set `EMAIL_USER`, `EMAIL_PASS` (a Google app password) and `RECIPIENT_EMAIL`, then send yourself a test message.
7. **Analytics / Search Console:** add the GA4 measurement ID and verification code in the dashboard. No reports are imported; view data in Google's tools.

Technical limitations:

- **CSP** allows `'unsafe-inline'` scripts, which Next.js needs for hydration without nonces. A nonce-based CSP would force every page to render dynamically. See [docs/SECURITY.md](docs/SECURITY.md).
- **Email is used only for the contact form.** Password resets still use one-time links generated by an administrator, or the CLI. Gmail limits how much a personal account can send, which is plenty for a contact form.
- **Public pages render on demand** (marked dynamic in the build), not as static ISR. That's correct and simple, but per-page caching can be tuned later.
- The **built-in consent banner is not a Google-certified CMP**. Use *External CMP* mode with Google's "Privacy & messaging" (or another certified CMP) before serving ads in the EEA/UK/CH.
- The **S3 storage driver** is implemented but wasn't exercised against a live bucket here. Database storage is fully tested.
- **Background remover:** the any-subject model needs WebGPU (recent desktop Chrome, Edge, Safari). Other browsers get the lighter people-focused model. The WebGPU path could not be exercised in this headless environment; the CPU path is verified. Test it once in your own Chrome.
- **Not measured:** Lighthouse/Core Web Vitals scores and real devices. No score is claimed.
- **E2E depth:** articles, access control and AdSense validation have full workflow tests; other dashboard sections have render tests, not end-to-end save tests.
- The project is **not yet a Git repository**. Run `git init` and keep `.env` out of commits (it is already in `.gitignore`).
