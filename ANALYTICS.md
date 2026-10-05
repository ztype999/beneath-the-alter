# Beneath the Alter — private analytics setup

This repository ships a privacy-first analytics system:

- `analytics.js` — public-site tracker (loaded on every generated page)
- `analytics-config.js` — public configuration (Worker URL)
- `admin/analytics.html` + `admin/analytics.css` + `admin/analytics.js` — private dashboard
- `analytics-worker/` — Cloudflare Worker API, D1 schema, and Wrangler config
- `build/site/*.ts` — templates that inject the tracker into every page

The dashboard is private to the GitHub account **`ztype999`**. OAuth secrets and
tokens never reach the browser.

## What is tracked

Page views, sessions/visitors, new vs returning visitors, approximate
country/region from Cloudflare request metadata, device class, browser, OS,
language/timezone, screen size, referrer, UTM parameters, time on page
(heartbeat), outbound links, music clicks, merch interactions, gallery opens,
and contact-form interaction.

**Not** stored: passwords, OAuth tokens, email addresses, full IP addresses,
form contents, or message bodies. Demographics/age are **not** determined. Any
geography shown is approximate.

## 1. Deploy the Worker

### Option A — automated (recommended)

Add these repository secrets (Settings → Secrets and variables → Actions), then
run the **Deploy analytics Worker** workflow (Actions → Run workflow):

| Secret | What it is |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | Cloudflare token with **Workers Scripts: Edit** and **D1: Edit** |
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account id |
| `GITHUB_CLIENT_ID` | From the OAuth App you create in step 2 |
| `GITHUB_CLIENT_SECRET` | From the OAuth App you create in step 2 |
| `SESSION_SECRET` | Any long random string, e.g. `openssl rand -hex 32` |

The workflow creates the D1 database if needed, applies the schema, deploys the
Worker, and pushes the OAuth/session secrets. Re-runs are safe.

> If `CLOUDFLARE_API_TOKEN` is missing the workflow skips cleanly with a notice,
> so it is safe to commit before Cloudflare is set up.

Once deployed, `wrangler` prints your Worker URL
(`https://bta-analytics.<subdomain>.workers.dev`). Use it for steps 2 and 3.

### Option B — manual

```sh
cd analytics-worker
npx wrangler login
npx wrangler d1 create bta-analytics
# copy the printed database_id into wrangler.toml
npx wrangler d1 execute bta-analytics --remote --file=schema.sql
npx wrangler secret put GITHUB_CLIENT_ID
npx wrangler secret put GITHUB_CLIENT_SECRET
npx wrangler secret put SESSION_SECRET
npx wrangler deploy
```

The resulting Worker URL looks like `https://bta-analytics.<subdomain>.workers.dev`.

## 2. Create the GitHub OAuth App

GitHub → Settings → Developer settings → OAuth Apps → New OAuth App:

- Authorization callback URL: `https://bta-analytics.<subdomain>.workers.dev/auth/callback`
  (the Worker derives this from its own URL automatically, so it never needs to
  be hard-coded)
- Scope requested by the Worker: `read:user`

Only `ztype999` is allowed in; every other account receives HTTP 403.

## 3. Enable the tracker and dashboard

Edit `analytics-config.js` in the repository root:

```js
window.BTA_ANALYTICS_CONFIG = {
  endpoint: "https://bta-analytics.<subdomain>.workers.dev/api/ingest",
  apiBase: "https://bta-analytics.<subdomain>.workers.dev",
  siteId: "beneath-the-alter",
  enabled: true
};
```

While `endpoint` is empty, tracking is disabled and the site behaves normally.

### Signing in to the dashboard

The dashboard supports two ways in:

1. **Access token (no extra setup).** A random token is stored as the Worker
   secret `DASHBOARD_TOKEN`. Open the dashboard, paste the token, and it is
   remembered in that browser only. Rotate it any time with
   `npx wrangler secret put DASHBOARD_TOKEN`.
2. **GitHub OAuth (optional).** Create the GitHub OAuth App (step 2), add
   `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` as Worker secrets, and the
   dashboard shows "Sign in with GitHub". Only the account in
   `GITHUB_ALLOWED_LOGIN` (`ztype999`) is accepted.

Both methods grant the same read access and can be enabled at the same time.
The access token is stored in the browser's `localStorage` under
`bta_dashboard_token`; clearing site data removes it.

## 4. Deploy the site

Merging to `main` triggers the build workflow, which regenerates every HTML page
with the tracker and publishes `admin/` (including the dashboard).

Open `https://ztype999.github.io/beneath-the-alter/admin/analytics.html` and sign
in with GitHub as `ztype999`.

## 5. Secrets

Never commit `GITHUB_CLIENT_SECRET`, `SESSION_SECRET`, OAuth tokens, or D1
credentials. Only `.dev.vars.example` is committed; `.dev.vars` is ignored.

## 6. Operational notes

- Retention: the Worker runs a daily cron (`schedule: 17 3 * * *`, from
  `[triggers]` in `wrangler.toml`) that deletes events older than
  `RETENTION_DAYS` (365) — see `purgeExpired()` in `worker.js`. Change that
  constant to shorten or extend the window, then redeploy.
- Session cookies: the dashboard is on GitHub Pages while the API is on
  `*.workers.dev`, so the session cookie is `SameSite=None; Secure; HttpOnly`.
  CORS is locked to `SITE_ORIGIN` and OAuth state is validated on callback.
- Rate limiting: `/api/ingest` returns `429` after `INGEST_LIMIT_PER_MINUTE`
  (60) events from one IP in a minute, on top of the origin check and the
  `MAX_BODY_BYTES` payload cap. The counter is per-isolate memory, so it is a
  soft guard against casual floods, not a billing-grade limiter.
- Schema: `idx_events_site_created` covers the dashboard's main
  `site_id + created_at` filter. Re-apply `schema.sql` if you recreate D1.
- Local dev: `npx wrangler dev` inside `analytics-worker` serves the API at
  `http://localhost:8787`, but `Secure` cookies mean the full OAuth flow is
  intended for production.
