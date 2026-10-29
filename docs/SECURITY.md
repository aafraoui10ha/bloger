# Security checklist

## Implemented

**Authentication**
- [x] Passwords hashed with bcrypt (cost 12). Minimum 12 characters, mixing three character classes.
- [x] Login timing is equalized for unknown emails, using a dummy bcrypt comparison.
- [x] Sessions are stored in the database and only the **SHA-256 hash** of each token is saved.
- [x] Session cookies use the `__Host-` prefix and are `httpOnly`, `Secure` (in production) and `SameSite=Lax`.
- [x] Sessions expire after 7 days (sliding) and are revoked on password change, role change and deactivation.
- [x] Login is rate-limited (5 attempts per 15 minutes per email+IP, 30 per IP), as are password resets and password changes. Limits are stored in the database, so they work across serverless instances.
- [x] Password resets use one-time, 24-hour, hashed tokens, issued by an administrator or via the CLI. There is no default admin account and no hardcoded password.

**Authorization**
- [x] Role-based access control is defined centrally in [src/lib/auth/permissions.ts](../src/lib/auth/permissions.ts).
- [x] **Every** server action calls `authorize(permission)`, and every dashboard page calls `requirePagePermission`. Hiding controls is UI only.
- [x] Privilege escalation is blocked: administrators cannot create or modify administrators or super administrators, nobody can demote or deactivate themselves, and the last active super administrator is protected.
- [x] Authors can edit only their own drafts or in-review articles; publishing requires the Editor role or higher.
- [x] `proxy.ts` only pre-checks the cookie for redirects. It is not relied on for authorization.

**Input and output**
- [x] All mutation inputs are validated server-side (Zod, plus explicit checks).
- [x] Rich text is sanitized with an allow-list on save **and** at render time. This removes scripts, event handlers, iframes, styles and `javascript:` URLs, and adds `rel="noopener noreferrer nofollow"` to external links.
- [x] JSON-LD is serialized with `<`, `>` and `&` escaped.
- [x] Links entered by admins are restricted to internal paths or `http(s)`/`mailto` URLs. The login `next` parameter only accepts same-site relative paths, preventing open redirects.
- [x] Database access goes through Prisma (parameterized). The one raw query (rate limiting) uses tagged-template parameters.

**Uploads**
- [x] Uploads are limited to 5 MB. The type is detected from **magic bytes**, the declared MIME type must match, and only PNG, JPEG, WebP, GIF and AVIF are allowed. **SVG is rejected.**
- [x] File names are sanitized and storage keys are random.
- [x] Media is served with `nosniff`, a restrictive per-file CSP, and `sandbox`.
- [x] Deletion is blocked while a file is referenced.

**Transport and headers**
- [x] Headers: CSP, HSTS (production), `X-Frame-Options: DENY` plus `frame-ancestors 'none'`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, COOP.
- [x] The dashboard sends `X-Robots-Tag: noindex, nofollow` and `Cache-Control: no-store`.
- [x] Server Actions have Next.js's built-in Origin/Host CSRF protection.
- [x] The cron endpoint uses a bearer secret compared in constant time.

**Logging and audit**
- [x] Sensitive actions are recorded in the audit log: logins and failed logins, content changes, publishing, users, settings, ads, media.
- [x] Audit details strip keys such as password, token, secret, hash and session, and truncate long values.
- [x] Errors shown to users never include stack traces. Server logs record only error messages.
- [x] Contact form: server-side validation, line breaks stripped from anything placed in mail headers, the visitor goes in Reply-To (the sender is always the site account), a honeypot field, and 5 messages per hour per IP. Messages are neither stored nor logged.
- [x] Analytics events never include user text, files, file names or results; parameters are allow-listed.

**Dependencies**
- [x] `npm audit --omit=dev` reported 0 vulnerabilities at delivery. Re-run it regularly and enable Dependabot or Renovate.

## Known trade-offs

- **CSP allows `'unsafe-inline'` scripts.** Without nonces, Next.js needs inline scripts for hydration. A nonce-based CSP via `proxy.ts` is possible, but it forces dynamic rendering of every page. Other directives stay strict: `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, and `frame-ancestors 'none'`.
- **Background remover CSP additions:** `script-src` allows `https://cdn.jsdelivr.net` and `'wasm-unsafe-eval'` (ONNX runtime), and `connect-src` allows jsDelivr and Hugging Face (model weights). Images never leave the browser. `blob:` scripts stay blocked.
- **Client IP for rate limiting** comes from `x-forwarded-for`, which is trustworthy on Vercel. Behind other proxies, make sure the proxy overwrites this header.

## Operator checklist

- [ ] Give the application a **least-privilege database role**, separate from the migration role:
  ```sql
  CREATE USER 'atlas_app'@'%' IDENTIFIED BY '…';
  GRANT SELECT, INSERT, UPDATE, DELETE ON bloger.* TO 'atlas_app'@'%';
  ```
  Run `prisma migrate deploy` with the owner role only.
- [ ] Never use `root` with an empty password outside your own machine.
- [ ] Use a Google **app password** for `EMAIL_PASS`, and revoke it in your Google account if it is ever exposed.
- [ ] Generate a strong `CRON_SECRET`. Rotate secrets if anyone with access leaves.
- [ ] Keep the number of super administrators small (two people is a good number).
- [ ] Enable automated database backups and test a restore (see DEPLOYMENT.md).
- [ ] Turn on 2FA for the hosting, database, domain registrar, Google and GitHub accounts.
- [ ] Review the audit log periodically for `auth.loginFailed` spikes.
- [ ] Re-run `npm audit` and update dependencies monthly.
