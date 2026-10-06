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

## Important

- Contact forms prepare an email draft; they do not send or store messages.
- Merch uses direct inquiries. Confirm stock, sizing, shipping, and payment with the band.
- Original Wix event records remain archived. No invented dates or ticket sales.
- Existing social handles are preserved, including YouTube’s `@BeneaththeAltar`.
- Band photos, art, and recordings remain their owners’ property. Font licenses are in `licenses/`.

## Analytics

A private, privacy-first analytics dashboard lives at `admin/analytics.html` and is restricted to the GitHub account `ztype999`. The public tracker is `analytics.js` (configured in `analytics-config.js`), and the API is the Cloudflare Worker in `analytics-worker/`.

See [`ANALYTICS.md`](./ANALYTICS.md) for deployment steps. Tracking stays disabled until a Worker URL is set in `analytics-config.js`. See [`privacy.html`](./privacy.html) for what is and isn’t collected.
