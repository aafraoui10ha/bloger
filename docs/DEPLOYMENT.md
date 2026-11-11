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
3. Build command: `npm run build`, **without migrations**. Database migrations are a separate, approved step (see "Production database migrations" below), so an ordinary deploy can never change the schema. Install command: `npm install`, which runs `prisma generate`. Use `npm run build`, not `next build`: its `prebuild` step syncs the background-remover model files (see below).
4. Deploy. `vercel.json` registers the daily scheduled-publishing cron. Scheduled articles still become public on time without it; the cron only finalizes their status.

**Note:** `sitemap.xml` and `ads.txt` are pre-rendered during the build, so the build needs **read** access to the database.

### Background-remover model files

The background remover serves its AI model and ONNX Runtime files from the site itself, at `/models/background-removal/<version>/`. They are **not in git** (about 173 MB; `public/models/` is ignored).

- **How they get there:** `npm run build` first runs `scripts/models/sync-models.mjs`. It reads `src/tools/image/bg-models.manifest.json`, then takes each file from `node_modules/onnxruntime-web` or downloads it from its pinned Hugging Face revision or jsDelivr URL. It writes a file into `public/` only after its SHA-256 matches the manifest. A mismatch fails the build, so an unverified model is never deployed. Files larger than 16 MB are split into 16 MB parts.
- **Build impact:** the first build downloads about 140 MB from Hugging Face. Builds then need network access to huggingface.co, unless the files are already present.
- **Headers:** `next.config.ts` serves `/models/*` with `Cache-Control: public, max-age=31536000, immutable`, `Cross-Origin-Resource-Policy: cross-origin`, `Access-Control-Allow-Origin: *` (public files, so the desktop app can download them) and `application/octet-stream` for model parts. The version is part of the URL, so immutable caching is safe.
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


## Production database (Hostinger MySQL) and Vercel

> **Status: not deployed.** These steps need your approval and your accounts. Nothing here has been run against the production database.

### 0. Confirm the hosting first
The database is reported to be on **Hostinger**. Before connecting anything, confirm in hPanel:
- **Plan type.** Shared or Cloud hosting offers "Remote MySQL" with an IP allow-list. A VPS gives you full control of MySQL and the firewall.
- **Server details.** Note the MySQL version, the host name or IP, and the port (3306).
- **Connection limit.** Check `max_user_connections` for the database user; shared plans set a low per-user limit. Ask Hostinger support if hPanel doesn't show it.
- **TLS.** Check whether remote connections support SSL/TLS.

### 1. Network access: choose deliberately
Vercel functions run on changing IP addresses, so Hostinger's IP allow-list can't list them by default. The options:

| Option | Security | Notes |
|---|---|---|
| **A. Vercel Static IPs** (paid add-on) + allow only those IPs in Hostinger Remote MySQL | Good: the database stays closed to the internet | Recommended if the budget allows |
| **B. Host the website next to the database** (Hostinger VPS or Node.js hosting) | Good: the database stays local and is never exposed | Replaces Vercel |
| **C. "Any Host (%)"** | **Weak**: the MySQL port is reachable by anyone on the internet and exposed to scanning and password guessing | **Do not use by default.** Only after a written assessment and your explicit approval, with every mitigation below |

The minimum mitigations if option C is ever approved:
- A **dedicated database user** for the website, with privileges on this one database only. No `GRANT`, no access to other databases.
- A **long random password**, 32 or more characters, never reused, stored only in Vercel's encrypted environment variables.
- **TLS required**, if Hostinger supports it (`ssl=true` in the URL).
- A separate, more privileged user for migrations, used only from a trusted machine and only during the migration window.
- Regular review of Hostinger's access logs, and rotating the password if it is ever exposed.

### 2. Connection pooling
`src/lib/db.ts` uses Prisma's MariaDB adapter, which keeps a **pool per server instance**. On Vercel, each running function instance has its own pool, so the total number of connections can reach *instances × connectionLimit*. Keep that below `max_user_connections`:

```
DATABASE_URL="mysql://USER:PASSWORD@HOST:3306/DBNAME?connectionLimit=2&connectTimeout=10000"
```

- **Start small.** Use `connectionLimit=2` or `3`, then watch Hostinger's "too many connections" errors and `/api/health`.
- **Encode the password.** URL-encode special characters (`@` → `%40`, `#` → `%23`).

### 3. Production database migrations (separate from deploys)
Migrations **never** run in the Vercel build. When a release contains a new migration (`prisma/migrations/`):

1. **Back up first** (see section 7):
   ```bash
   mysqldump --single-transaction --routines --default-character-set=utf8mb4 -h HOST -u USER -p DBNAME > toolbox-$(date +%F).sql
   ```
   Check the file isn't empty and keep it off-site. Hostinger's own backups (hPanel → Backups) are an extra safety net, not a replacement.
2. **Review** what will run:
   ```bash
   npx prisma migrate status
   ```
   Read the SQL in `prisma/migrations/<name>/migration.sql`. Destructive statements (`DROP`, `ALTER ... DROP COLUMN`) need a separate plan.
3. **Apply** from a trusted machine, with the production `DATABASE_URL` set **only in that terminal session** (never in `.env`):
   ```bash
   npx prisma migrate deploy      # applies pending migrations only; never resets or deletes data
   ```
4. **Then** deploy the code that needs the new schema.

**First setup on an existing Hostinger database:**
- If it already holds other data, use a **new, empty** database for Toolbox rather than mixing tables.
- On an empty database, run `npx prisma migrate deploy`, then `npm run db:seed` (idempotent; never creates users or enables ads), then `npm run admin:create`.

### 4. Rollback
- **Code:** Vercel → Deployments → *Instant Rollback* to the previous deployment.
- **Database:** Prisma migrations are forward-only. If a migration causes problems:
  1. Restore the backup from step 3 into a new database.
  2. Point `DATABASE_URL` at it.
  3. Roll back the code.
- **Content:** article and page edits can be restored from the dashboard's revisions.

### 5. Vercel project and environment variables
1. Import the GitHub repository. Production branch: `main`, after the pull request is merged.
2. Use these settings:
   - Install command: `npm install`
   - Build command: `npm run build` (no migrations)
3. Add the **Production** environment variables. Use a **separate database for Preview** deployments.

| Variable | Required | Secret? | Notes |
|---|---|---|---|
| `DATABASE_URL` | yes | **secret** | Hostinger URL with `connectionLimit` (see above) |
| `NEXT_PUBLIC_SITE_URL` | yes | public | Canonical `https://` origin. If missing on Vercel, the project's production domain is used |
| `NEXT_PUBLIC_SITE_NAME` | recommended | public | Site name |
| `CRON_SECRET` | yes | **secret** | Random 32+ bytes: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `MEDIA_STORAGE` | yes | no | `database`, or `s3` with the `S3_*` variables (secret keys) |
| `ADS_ALLOW_LIVE` | no | no | `false` until AdSense is approved |
| `EMAIL_USER`, `EMAIL_PASS`, `RECIPIENT_EMAIL` | for the contact form | `EMAIL_PASS` is **secret** | Gmail app password |
| `DESKTOP_RELEASE_*`, `DESKTOP_EXE_*`, `DESKTOP_MSI_*` | no | no | Only after the installers are uploaded to **Cloudflare R2**, with `https://` R2 URLs. Without them, `/desktop` shows "coming soon" |

- Only `NEXT_PUBLIC_*` values reach the browser, and none of them is a secret.
- Vercel functions accept requests of at most about **4.5 MB**, so dashboard uploads must stay under that size.

### 6. Desktop app ↔ production URL
- The app learns the website address at **build time**, from the GitHub repository variable `TOOLBOX_SITE_URL`. It uses it for model downloads and update notifications.
- After the site is live on its final domain, set that variable and rebuild the app.
- Update notifications read `<site>/api/desktop/releases/latest`, which returns 404 until `DESKTOP_*` points at installers on R2.
- `publish-local.mjs` is only for servers with a persistent disk, **not Vercel**.

### 7. Plan
Use Vercel **Pro** for a commercial site (with ads); Hobby is for non-commercial use.
