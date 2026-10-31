# Production deployment guide

This guide uses **Vercel + a managed MySQL 8 or MariaDB** database (your hosting provider’s MySQL, AWS RDS, Aiven, Railway, …). MySQL 5.7 also works. Any Node.js 20.9+ host that can run `next start` works the same way; plain PHP shared hosting cannot run this app.

## 1. Choose services and costs

| Need | Free/low-cost option | When you need a paid plan |
|---|---|---|
| Hosting | Vercel Hobby (non-commercial use only per Vercel's terms) | Vercel Pro is required for commercial sites, including sites earning ad revenue |
| MySQL / MariaDB | A small managed instance or your host’s MySQL. It must accept connections from your app host. | More storage/compute, point-in-time restore |
| Media (optional) | Database storage (default) | Many or large images → Cloudflare R2 / S3 |
| Error monitoring (optional) | Vercel logs, Sentry free tier | Higher volume |

Check each provider's current terms and pricing before relying on it; plans change.

## 2. Environment variables

Set these in the host's secret manager, **never** in Git:

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | yes | `mysql://user:password@host:3306/dbname`. Use a least-privilege user (see SECURITY.md). Create the database with `CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`, or Arabic text will fail. |
| `NEXT_PUBLIC_SITE_URL` | yes | `https://www.example.com`, no trailing slash. Used for canonicals, hreflang and the sitemap. |
| `NEXT_PUBLIC_SITE_NAME` | no | Fallback brand name. |
| `CRON_SECRET` | yes | ≥ 32 random characters: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `MEDIA_STORAGE` | no | `database` (default) or `s3` |
| `S3_*` | if s3 | `S3_BUCKET`, `S3_REGION`, `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_PUBLIC_BASE_URL` |
| `ADS_ALLOW_LIVE` | no | Keep `false` until AdSense approval is confirmed in your account. |
| `EMAIL_USER`, `EMAIL_PASS`, `RECIPIENT_EMAIL` | no | Contact form via Gmail SMTP. `EMAIL_PASS` must be a Google app password. Without all three, the form is hidden. |

## 3. Database setup

```bash
# from your machine or CI, with DATABASE_URL pointing at production
# first create the database:  CREATE DATABASE bloger CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
npx prisma migrate deploy
npm run admin:create -- --email you@example.com --name "Your Name"
npm run db:seed
```

`db:seed` is idempotent: it never overwrites dashboard edits, never creates users and never enables ads.

## 4. Build and deploy (Vercel)

1. Push the repository to GitHub/GitLab and import it in Vercel.
2. Set the environment variables (Production and Preview; use a **separate database for Preview**).
3. Build command: `prisma migrate deploy && npm run build`. Install command: `npm install` (it runs `prisma generate`). Use `npm run build`, not `next build`: its `prebuild` step syncs the background-remover model files (see below).
4. Deploy. `vercel.json` registers the daily scheduled-publishing cron. Scheduled articles still become public on time without it; the cron only finalizes their status.

**Note:** `sitemap.xml` and `ads.txt` are pre-rendered during the build, so the build needs database access.

### Background-remover model files

The background remover serves its AI model and ONNX Runtime files from the site itself, at `/models/background-removal/<version>/`. They are **not in git** (about 173 MB; `public/models/` is ignored).

- **How they get there:** `npm run build` first runs `scripts/models/sync-models.mjs`. It reads `src/tools/image/bg-models.manifest.json`, then takes each file from `node_modules/onnxruntime-web` or downloads it from its pinned Hugging Face revision or jsDelivr URL. It writes a file into `public/` only after its SHA-256 matches the manifest. A mismatch fails the build, so an unverified model is never deployed. Files larger than 16 MB are split into 16 MB parts.
- **Build impact:** the first build downloads about 140 MB from Hugging Face. Builds then need network access to huggingface.co, unless the files are already present.
- **Headers:** `next.config.ts` serves `/models/*` with `Cache-Control: public, max-age=31536000, immutable`, `Cross-Origin-Resource-Policy: same-origin` and `application/octet-stream` for model parts. The version is part of the URL, so immutable caching is safe.
- **In the browser:** the tool tries the site's copy first and falls back to the pinned Hugging Face or jsDelivr URLs. Every file is checked with SHA-256 before use and stored in the Cache API under `bg-models-<version>`. Caches from older versions are deleted automatically.
- **Skipping:** set `SKIP_MODEL_SYNC=1` to build without self-hosting. The tool then downloads every file from the external sources, still verifying each one.
- **Changing models or upgrading `@huggingface/transformers`:** run `npm run models:update`. It re-downloads the files, checks them against the upstream LFS SHA-256, git blob ids and npm package, and writes a new manifest version. Commit the new manifest.
- **Hobby plan:** Vercel limits CLI uploads, but Git-based deployments build these files on Vercel, so they don't count toward that limit.

## 5. Domain, DNS and HTTPS

1. Add the domain in Vercel → Domains, then create the DNS records it shows (an `A` record for the apex, a `CNAME` for `www`).
2. Choose one canonical host (for example `www`) and redirect the other to it in Vercel.
3. Set `NEXT_PUBLIC_SITE_URL` to the canonical `https://` origin and redeploy.
4. Verify HTTPS:
   - `curl -I https://www.example.com/en` returns `200`
   - the response includes `strict-transport-security`
   - `http://` redirects to `https://`

## 6. Health checks and monitoring

- **Uptime monitor:** `GET /api/health` returns `{"status":"ok"}`, or `503` if the database is unreachable.
- **Logs:** Vercel → Logs. Server actions log only error messages, never request bodies, content or secrets.
- **Error monitoring (optional):** add Sentry with `npx @sentry/wizard -i nextjs` and keep its default PII scrubbing on.

## 7. Backups and restore

- **Automatic backups:** enable them, ideally with point-in-time restore, in your database provider.
- **Manual logical backup:**
  ```bash
  mysqldump --single-transaction --routines --default-character-set=utf8mb4 -h HOST -u USER -p DBNAME > atlas-$(date +%F).sql
  ```
  Store it encrypted, off-site, for at least 30 days.
- **Restore** into a new database, then switch `DATABASE_URL`:
  ```bash
  mysql -h HOST -u USER -p -e "CREATE DATABASE atlas_restore CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
  mysql -h HOST -u USER -p --default-character-set=utf8mb4 atlas_restore < atlas-YYYY-MM-DD.sql
  npx prisma migrate deploy   # with DATABASE_URL pointing at atlas_restore; no-op if already current
  ```
- **Test a restore at least quarterly.**
- **Media:** stored in the database by default, so it's included in database backups. S3 buckets need their own versioning or backup.

## 8. Search Console and sitemap

1. Add a Domain property in Google Search Console and verify it via DNS (recommended), or paste the HTML-tag verification code into Dashboard → Analytics.
2. Submit `https://www.example.com/sitemap.xml`.
3. Use URL Inspection on one page per language to check canonical and hreflang.
4. Check Indexing reports after a few weeks. Indexing and rankings are never guaranteed.

## 9. Analytics (optional)

Paste the GA4 measurement ID in Dashboard → Analytics and enable it. GA loads only for visitors who accept analytics.

## 10. AdSense

Follow [ADSENSE-CHECKLIST.md](ADSENSE-CHECKLIST.md). After adding `ads.txt` in the dashboard, confirm `https://www.example.com/ads.txt` returns your exact line.

## 11. Rollback

- **Code:** in Vercel → Deployments, promote the previous deployment ("Instant Rollback").
- **Database:** migrations are forward-only. For a bad migration, restore the latest backup into a new database and point `DATABASE_URL` at it, then roll back the code. Always take a backup before deploying a migration.
- **Content:** article and page edits can be restored from Revisions / Previous versions in the dashboard.

## 12. Post-deploy checklist

- [ ] `/en`, `/fr`, `/ar` load over HTTPS; Arabic shows right-to-left.
- [ ] `/admin` redirects to the login page; you can sign in.
- [ ] `/api/health` returns ok.
- [ ] `/sitemap.xml` lists public URLs only; `/robots.txt` points to it.
- [ ] Canonical and hreflang tags use your production domain.
- [ ] Image tools work and no upload requests appear in DevTools → Network.
- [ ] The consent banner appears; "Reject optional" persists across reloads.
- [ ] No `googlesyndication` requests before ads are configured, confirmed and consented.
- [ ] Site settings: contact email filled in; legal pages completed and reviewed.
- [ ] Send one test message through the Contact page and confirm it arrives at `RECIPIENT_EMAIL`.
