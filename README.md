# BENEATH THE ALTER

Responsive band website rebuilt from the original Wix site and the linked official Spotify profile.

## Website and management

- Website (canonical): https://beneaththealter.eu.org/
- Working today: https://www.beneaththealter.workers.dev/ and https://ztype999.github.io/beneath-the-alter/ — see [Hosting](#hosting).
- Control room: append `/admin/` to whichever address you are using.
- Content editor: https://app.pagescms.org/ — sign in with GitHub, authorize this repository, and select `ztype999/beneath-the-alter`, branch `main`.

The editor has seven sections: homepage/settings, music, biography/members, shows, merch, gallery, and videos. Images are stored under `assets`; new uploads go in `assets/uploads`.

Saving content starts a GitHub Actions build. Check the repository’s **Actions** tab for deployment status. A daily build also moves dated shows into the archive. Invalid content stops publishing and preserves the last successful deployment.

## Local development

Install Bun, then run:

```sh
SITE_URL=https://beneaththealter.eu.org bun build/build-site.ts .
python3 -m http.server 8000
```

Edit `data/*.json` for content, `build/site/*.ts` for templates, and `site.css`/`site.js` for presentation and interactions. The generated HTML is standalone.

## Hosting

| Address | Role | Updated by |
| --- | --- | --- |
| `https://beneaththealter.eu.org` | Canonical domain — already in canonical URLs, `og:url` and the sitemap | Activates by itself once EU.org resolves DNS; no repo change needed |
| `https://ztype999.github.io/beneath-the-alter` | GitHub Pages, the primary publish target | GitHub Actions on every push |
| `https://www.beneaththealter.workers.dev` | Cloudflare edge mirror (Worker `www`, config in `edge/`) | The `edge` job, once `CLOUDFLARE_API_TOKEN` is set |

Canonical, `og:url` and the sitemap point at `beneaththealter.eu.org`. Because that host does not resolve yet, the Open Graph image is served from GitHub Pages instead — controlled by `SOCIAL_IMAGE_BASE` in the workflow. It falls back to `SITE_URL` when unset, so deleting that one line switches social images to the canonical domain at cutover.

### Enabling the edge deploy

1. In Cloudflare, create an API token with **Account → Workers Scripts → Edit**.
2. Save it as a repository secret named `CLOUDFLARE_API_TOKEN` (Settings → Secrets and variables → Actions).

Until then the `edge` job still builds and packages the site, then reports a notice and skips the upload — CI stays green.

Manual equivalent, from the repository root:

```sh
SITE_URL=https://beneaththealter.eu.org \
SOCIAL_IMAGE_BASE=https://ztype999.github.io/beneath-the-alter \
bun build/build-site.ts .

mkdir -p edge/dist
cp -- *.html *.css *.js robots.txt sitemap.xml edge/dist/
cp -r assets admin edge/dist/
npx wrangler deploy --config edge/wrangler.jsonc
```

Page-view **tracking** is restricted to the GitHub Pages origin: `/api/ingest`
in `worker.js` accepts `SITE_ORIGIN` (`https://ztype999.github.io`) only, so
page views on the edge mirror are still not counted. The **dashboard** can be
opened from any origin listed in `DASHBOARD_ORIGINS` (`https://ztype999.github.io`,
the edge mirror, and `https://beneaththealter.eu.org`) — see `readableOrigins()`
in `worker.js`. Every other origin receives `Access-Control-Allow-Origin: null`
and the browser discards the response.

## BTA-OS 3000 layer

`bta-os.css` and `bta-os.js` are an additive cybernetic interface layer over the
existing pages. Both are linked from the shared `<head>` in
`build/site/layout.ts`, so every generated page — home, music, band, members,
shows, merch, gallery, videos, socials, contact, privacy, the eight
`listen-*.html` link-tree pages and `404.html` — picks them up automatically.
CI already packages `*.css` and `*.js`, so no workflow change was needed.

The layer only touches `document.body`; it never rewrites the existing markup.
`site.css`, `site.js`, `terminal-bg.js`, analytics, the merch dialog, the
contact form, the Spotify player and all content JSON keep working unchanged.

### What it adds

- A BIOS boot sequence (≈3s) with an animated progress bar and a
  **SKIP INITIALIZATION** button, replayed in full on **every** page load —
  refresh, in-site nav click, back button — so each screen boots the machine
  again. `prefers-reduced-motion` gets the same boot as three summary lines
  ending in `SYSTEM READY`, then an instant reveal.
- A top-bar readout (`BTA-OS // ONLINE`, node, signal, live clock) inserted into
  the existing `.system-strip`, plus HUD corner brackets and a scanline sweep.
- A simulated terminal. Type `ALTER` or `BTA3000` anywhere outside a form field,
  or click the system strip five times. `Escape` or **CLOSE** dismisses it.
- Nav hover tags (`MODULE_01 // ONLINE`) and a cursor reticle on fine-pointer
  devices.
- A scroll-reveal pass over `main` sections.

### Behaviour and safeguards

| Concern | Behaviour |
| --- | --- |
| Boot never blocks the site | A 15s failsafe removes the overlay no matter what; if the script fails to load, no overlay is ever created |
| `localStorage` unavailable | The boot reads and writes no storage at all, so private mode cannot trap the overlay |
| Reduced motion / FX toggle | `prefers-reduced-motion` **and** the site-wide `html[data-motion=off]` switch both silence the scan, cursor, reveal and animations |
| Terminal input | Echoed with `textContent`, never parsed as markup; no `eval`, no `document.write`, no `insertAdjacentHTML` |
| Form fields | Typing in an input, textarea or select never triggers the easter eggs |
| Scroll reveal | Uses a `0` threshold with a bottom inset, so tall sections are never stranded at `opacity:0` |
| Accessibility | Readout and nav tags are `aria-hidden`; Lighthouse scores match the pre-layer baseline exactly (A11y 0.96, Best Practices 1.0, SEO 1.0) |

### Boot storage

None. The boot reads and writes no storage whatsoever: it replays in full on
every load, so there is no "seen it before" flag to go stale and nothing to
read or clear in private mode. The `bta_boot_completed` key that the earlier
first-visit-only version wrote is now neither read nor written — browsers that
picked it up still carry it until they clear storage themselves, but it has no
effect on anything.

## Important

- Contact forms prepare an email draft; they do not send or store messages.
- Merch uses direct inquiries. Confirm stock, sizing, shipping, and payment with the band.
- Original Wix event records remain archived. No invented dates or ticket sales.
- Existing social handles are preserved, including YouTube’s `@BeneaththeAltar`.
- Band photos, art, and recordings remain their owners’ property. Font licenses are in `licenses/`.

## Analytics

A private, privacy-first analytics dashboard lives at `admin/analytics.html` and is restricted to the GitHub account `ztype999`. The public tracker is `analytics.js` (configured in `analytics-config.js`), and the API is the Cloudflare Worker in `analytics-worker/`.

See [`ANALYTICS.md`](./ANALYTICS.md) for deployment steps. Tracking stays disabled until a Worker URL is set in `analytics-config.js`. See [`privacy.html`](./privacy.html) for what is and isn’t collected.
