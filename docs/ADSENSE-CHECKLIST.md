# AdSense readiness checklist

This project prepares the site for an AdSense application. **It cannot request, speed up or guarantee approval**, and it never shows an approval status that you didn't enter from your own AdSense account.

## How the ad gate works

Live ad code loads **only when every one of these is true**:

1. `ADS_ALLOW_LIVE=true` is set in the production environment (an environment-level kill switch).
2. Dashboard → AdSense: the **master switch** is on and the mode is **Live**.
3. A valid **publisher ID** is entered (`ca-pub-` followed by 16 digits).
4. The owner has ticked "**I confirm this site is approved/authorized**".
5. The page type is eligible. Never eligible: dashboard, login, password reset, legal pages, search, error, preview, or thin pages (for example tool pages without an explanation, or articles under 300 words).
6. For manual placements: the placement is enabled, has a valid 10-digit slot ID, and is allowed for that tool.
7. In the visitor's browser: they accepted **advertising** in the built-in banner, or *External CMP* mode is active (the certified CMP handles consent).

In **Test** mode, labelled outlines appear only in development, and no ad code is ever loaded. The dashboard's placement preview never loads ad code either.

## Before applying

- [ ] The site is deployed on its **own domain** over HTTPS, and `NEXT_PUBLIC_SITE_URL` is set to it.
- [ ] **Original, useful content:** replace the 8 demo drafts with researched, reviewed guides, published in the languages you actually maintain. Don't publish auto-generated text.
- [ ] Every tool page has a complete explanation, steps, examples and FAQ in each published language. Dashboard → SEO health should show no "Tool explanation missing" issues.
- [ ] **About, Contact, Privacy, Terms, Cookie settings, Editorial and Corrections** pages are completed with real information. Legal pages have been reviewed by a professional, and the "reviewed" box is ticked.
- [ ] A contact email is set in Dashboard → Site settings.
- [ ] Navigation is clear, there are no broken links (SEO health), and the site works well on mobile.
- [ ] The site is submitted to Google Search Console with its sitemap.

## In your AdSense account

- [ ] Add the site in AdSense → Sites.
- [ ] Copy your **publisher ID** into Dashboard → AdSense. Keep the mode on **Test**.
- [ ] Copy the **exact `ads.txt` line** AdSense gives you into Dashboard → AdSense → ads.txt, and save.
- [ ] Verify that `https://your-domain/ads.txt` returns that line publicly.
- [ ] To have AdSense verify the site, follow AdSense's instructions. This app loads the AdSense script only when the gate allows it, so for verification Google's **ads.txt** or **meta tag** method is recommended.
- [ ] **Consent:** Google requires a Google-certified CMP for ads served to users in the EEA, the UK and Switzerland. Configure AdSense → Privacy & messaging (or another certified CMP), then switch Dashboard → Privacy & consent to **External CMP**.
- [ ] Request review in AdSense and wait for Google's decision.

## After Google's decision

- [ ] In Dashboard → AdSense, set the **approval status** and a **source** (for example "AdSense Sites page, checked 2026-11-02"). The status is never set automatically.
- [ ] If approved:
  1. Create ad units in AdSense and paste their **slot IDs** into the placements you want.
  2. Enable those placements.
  3. Tick the owner confirmation, switch the mode to **Live**, and set `ADS_ALLOW_LIVE=true` in production.
  4. Redeploy.
- [ ] Check that ads appear only on eligible pages, are labelled "Advertisement", and never appear inside tool controls or results.
- [ ] If Google asks for changes, fix them and update the status and source honestly.

## Policies this implementation respects

- No ads in the dashboard, on login/reset pages, legal pages, search results, error pages, previews or thin pages.
- No ads inside tool controls, upload areas or result/download buttons. Download buttons are plain links to the user's own result.
- Ads are always labelled, kept visually separate, and have reserved space to avoid layout shift.
- No forced clicks, fake loading overlays, pop-ups or ads that look like navigation.
- No fabricated revenue, traffic or approval anywhere in the dashboard.
