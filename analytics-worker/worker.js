/*
 * Beneath the Alter analytics Worker
 * Cloudflare Worker + D1 + GitHub OAuth (single allowed account).
 *
 * Never store GitHub access tokens, email addresses, full IP addresses,
 * form contents, or message bodies. Geography is coarse (country/region).
 */

const ALLOWED_EVENTS = new Set([
  "page_view", "session_start", "heartbeat", "outbound_click", "music_click",
  "merch_click", "gallery_open", "contact_start", "contact_submit", "link_click"
]);

const MAX_BODY_BYTES = 20 * 1024;
const SESSION_TTL_SECONDS = 60 * 60 * 12;
// Raw analytics rows older than this are deleted by the scheduled purge.
const RETENTION_DAYS = 365;
// Soft per-IP guard so a flood of fake events cannot exhaust the D1 write quota.
const INGEST_LIMIT_PER_MINUTE = 60;
/*
 * Distinct wrong passwords accepted per IP per minute. DASHBOARD_TOKEN is a
 * short memorable passphrase rather than a 160-bit random token, so unlike a
 * token it is guessable and needs throttling. Failures are deduplicated by the
 * value presented, because the dashboard fires nine parallel API calls on every
 * load — counting those separately would lock the real owner out after one
 * typo. At 8/min a full 10^9 sweep from a single address takes ~238 years.
 */
const AUTH_LIMIT_PER_MINUTE = 8;

const json = (data, status = 200, extra = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...extra
    }
  });

const escapeHtml = s =>
  String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// Origins allowed to *read* dashboard responses. Ingest keeps its own stricter
// gate (SITE_ORIGIN only, see /api/ingest), so widening this list lets the
// dashboard open from another of this site's own origins without letting it
// report page views from there. SITE_ORIGIN is always included.
function readableOrigins(env) {
  const extra = String(env.DASHBOARD_ORIGINS || "")
    .split(",")
    .map(s => s.trim().replace(/\/+$/, ""))
    .filter(Boolean);
  return [...new Set([String(env.SITE_ORIGIN || "").replace(/\/+$/, ""), ...extra].filter(Boolean))];
}

function cors(env, origin) {
  const normalized = String(origin || "").replace(/\/+$/, "");
  const allowed = readableOrigins(env).includes(normalized) ? normalized : "null";
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Vary": "Origin"
  };
}

function htmlError(message, status = 403) {
  return new Response(`<h1>Analytics error</h1><p>${escapeHtml(message)}</p>`, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8" }
  });
}

function dashboardUrl(env) {
  return env.DASHBOARD_URL || (env.SITE_ORIGIN.replace(/\/$/, "") + "/admin/analytics.html");
}

async function exchangeCode(env, code) {
  const r = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { "Accept": "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code
    })
  });
  if (!r.ok) throw new Error("GitHub token exchange failed");
  return r.json();
}

async function githubUser(token) {
  const r = await fetch("https://api.github.com/user", {
    headers: {
      "Authorization": `Bearer ${token}`,
      "Accept": "application/vnd.github+json",
      "User-Agent": "beneath-the-alter-analytics"
    }
  });
  if (!r.ok) throw new Error("GitHub identity lookup failed");
  return r.json();
}

/*
 * Signed session token.
 * Payload contains only GitHub login + expiry.
 * The GitHub OAuth access token is deliberately not stored in the cookie.
 */
async function hmac(secret, text) {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(text));
  return btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function b64url(str) {
  return btoa(str).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

async function makeSession(env, login) {
  const payload = b64url(JSON.stringify({
    login, exp: Date.now() + 1000 * SESSION_TTL_SECONDS
  }));
  return payload + "." + await hmac(env.SESSION_SECRET, payload);
}

async function readSession(env, request) {
  const cookie = request.headers.get("Cookie") || "";
  const match = cookie.match(/(?:^|;\s*)bta_session=([^;]+)/);
  if (!match) return null;

  const [payload, sig] = match[1].split(".");
  if (!payload || !sig) return null;

  if (!(await hmac(env.SESSION_SECRET, payload) === sig)) return null;

  try {
    const data = JSON.parse(atob(payload.replaceAll("-", "+").replaceAll("_", "/")));
    if (data.exp < Date.now() || data.login !== env.GITHUB_ALLOWED_LOGIN) return null;
    return data;
  } catch (_) {
    return null;
  }
}

/*
 * The dashboard is served from GitHub Pages and calls this Worker
 * cross-origin, so the session cookie must be SameSite=None to be attached to
 * those credentialed requests. It stays HttpOnly + Secure, CORS only allows
 * the configured site origin, and OAuth state is validated on callback.
 * (The Lax OAuth state cookie below is fine: it only travels on the
 * top-level redirect between /auth/github and /auth/callback.)
 */
function cookie(value, maxAge = SESSION_TTL_SECONDS) {
  return `bta_session=${value}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=None`;
}

function requestInfo(request) {
  const ua = request.headers.get("User-Agent") || "";
  const cf = request.cf || {};

  let device = "desktop";
  if (/mobile|android|iphone|ipod/i.test(ua)) device = "mobile";
  else if (/ipad|tablet/i.test(ua)) device = "tablet";

  let browser = "other";
  if (/edg\//i.test(ua)) browser = "Edge";
  else if (/opr\//i.test(ua)) browser = "Opera";
  else if (/chrome\//i.test(ua)) browser = "Chrome";
  else if (/firefox\//i.test(ua)) browser = "Firefox";
  else if (/safari\//i.test(ua)) browser = "Safari";

  let os = "other";
  if (/windows/i.test(ua)) os = "Windows";
  else if (/mac os x/i.test(ua)) os = "macOS";
  else if (/android/i.test(ua)) os = "Android";
  else if (/iphone|ipad|ios/i.test(ua)) os = "iOS";
  else if (/linux/i.test(ua)) os = "Linux";

  return {
    country: String(cf.country || "").slice(0, 8),
    region: String(cf.region || "").slice(0, 100),
    device, browser, os
  };
}

function daysBack(range) {
  return ({ "24h": 1, "7d": 7, "30d": 30, "90d": 90 }[range] || 7);
}

function since(range) {
  return new Date(Date.now() - daysBack(range) * 86400000).toISOString();
}

function timingSafeEqual(a, b) {
  const x = new TextEncoder().encode(String(a));
  const y = new TextEncoder().encode(String(b));
  if (x.length !== y.length) return false;
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

/*
 * Authenticated access via either:
 *   1. the signed GitHub OAuth session cookie, or
 *   2. a private dashboard access token (Worker secret DASHBOARD_TOKEN) sent as
 *      `Authorization: Bearer <token>`. This lets the owner use the dashboard
 *      without configuring a GitHub OAuth App.
 */
async function authenticated(request, env) {
  const session = await readSession(env, request);
  if (session) return session;

  if (env.DASHBOARD_TOKEN) {
    const header = request.headers.get("Authorization") || "";
    const match = header.match(/^Bearer\s+(.+)$/i);
    if (match && timingSafeEqual(match[1].trim(), env.DASHBOARD_TOKEN)) {
      return { login: env.GITHUB_ALLOWED_LOGIN };
    }
  }
  return null;
}

async function aggregate(env, sql, range) {
  const result = await env.DB.prepare(sql.replaceAll(":since", "?"))
    .bind(since(range)).all();
  return result.results || [];
}

/*
 * Deletes analytics rows past the retention window. Runs once a day from the
 * cron trigger in wrangler.toml, so the privacy notice's retention promise is
 * enforced rather than merely intended.
 */
async function purgeExpired(env) {
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 86400000).toISOString();
  const result = await env.DB.prepare("DELETE FROM events WHERE created_at < ?")
    .bind(cutoff)
    .run();

  // Rate-limit counters hold one row per address ever seen, so ingest in
  // particular would accumulate without bound. Rows past RATE_PURGE_AFTER_MS
  // cannot affect any decision the Worker makes.
  const stale = Date.now() - RATE_PURGE_AFTER_MS;
  const auth = await env.DB.prepare("DELETE FROM auth_attempts WHERE window_start < ?").bind(stale).run();
  const ingest = await env.DB.prepare("DELETE FROM ingest_attempts WHERE window_start < ?").bind(stale).run();

  return {
    cutoff,
    removed: Number(result.meta?.changes || 0),
    stale_counters: Number(auth.meta?.changes || 0) + Number(ingest.meta?.changes || 0),
  };
}

/*
 * Durable per-address counters for both limiters in this file.
 *
 * The originals kept a Map in isolate memory, which never fires: a burst from
 * one address is spread across several isolates, each with its own Map, so no
 * single one ever accumulates enough strikes. Demonstrated against both — 70
 * rapid ingest posts produced zero 429s. D1 is one shared store, so the count
 * survives that scatter.
 *
 * Keys are hashed rather than stored. The header of this file promises never to
 * keep a full IP address, and this state is durable now rather than transient:
 * HMAC over SESSION_SECRET, falling back to SHA-256 if that is ever unset.
 */
const RATE_WINDOW_MS = 60000;
// Any counter row older than this is already inert — rateExceeded() treats an
// expired window as unused — so sweeping it changes no behaviour. Without that
// sweep both tables would grow one row per address forever.
const RATE_PURGE_AFTER_MS = 60 * RATE_WINDOW_MS;
const RATE_TABLES = new Set(["auth_attempts", "ingest_attempts"]);

async function rateLimitKey(env, ip) {
  if (!ip) return null;
  if (env.SESSION_SECRET) {
    return (await hmac(env.SESSION_SECRET, "rate:" + ip)).slice(0, 32);
  }
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("rate:" + ip));
  return [...new Uint8Array(digest)].slice(0, 16).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function rateState(env, table, key) {
  if (!key || !RATE_TABLES.has(table)) return null;
  return env.DB.prepare(
    `SELECT count, window_start FROM ${table} WHERE client_key = ?`
  ).bind(key).first();
}

function rateExceeded(state, limit) {
  return !!state && Date.now() - state.window_start <= RATE_WINDOW_MS && state.count >= limit;
}

/*
 * Counted on the way in, before parsing, so a flood of malformed payloads is
 * throttled as well. The check reads first and only accepted requests write: a
 * blocked request costs one indexed read and nothing else, so it cannot exhaust
 * the D1 write quota this exists to protect — which is exactly what the
 * in-memory version allowed.
 */
async function recordUse(env, table, key) {
  if (!key || !RATE_TABLES.has(table)) return;
  const now = Date.now();
  await env.DB.prepare(`
    INSERT INTO ${table} (client_key, window_start, count) VALUES (?1, ?2, 1)
    ON CONFLICT(client_key) DO UPDATE SET
      window_start = CASE WHEN (?2 - ${table}.window_start) > ${RATE_WINDOW_MS} THEN ?2 ELSE ${table}.window_start END,
      count = CASE WHEN (?2 - ${table}.window_start) > ${RATE_WINDOW_MS} THEN 1 ELSE ${table}.count + 1 END
  `).bind(key, now).run();
}

/*
 * DASHBOARD_TOKEN is a short memorable password rather than a 160-bit random
 * token, so unlike ingest it is genuinely guessable and must be throttled.
 * It shares rateLimitKey/rateState/recordUse with the ingest limiter above.
 *
 * Strikes are deduplicated against the previously presented value because the
 * dashboard fires nine parallel API calls per load; counting those separately
 * would lock the real owner out after a single typo. At 8 distinct values a
 * minute, a full 10^9 sweep from one address takes about 238 years.
 */
async function recordAuthFailure(env, key, presented) {
  if (!key) return;
  const now = Date.now();
  const value = String(presented || "").slice(0, 64);
  // One atomic UPSERT: the window may have rolled over, the value may repeat,
  // and concurrent guesses must not clobber each other. Every CASE reads the
  // pre-update row, so an expired window resets to a single strike rather than
  // carrying the old total forward.
  await env.DB.prepare(`
    INSERT INTO auth_attempts (client_key, window_start, count, last_value)
    VALUES (?1, ?2, 1, ?3)
    ON CONFLICT(client_key) DO UPDATE SET
      window_start = CASE WHEN (?2 - auth_attempts.window_start) > ${RATE_WINDOW_MS} THEN ?2 ELSE auth_attempts.window_start END,
      count = CASE
        WHEN (?2 - auth_attempts.window_start) > ${RATE_WINDOW_MS} THEN 1
        WHEN auth_attempts.last_value = ?3 THEN auth_attempts.count
        ELSE auth_attempts.count + 1
      END,
      last_value = ?3
  `).bind(key, now, value).run();
}

async function clearAuthFailures(env, key) {
  if (!key) return;
  await env.DB.prepare("DELETE FROM auth_attempts WHERE client_key = ?").bind(key).run();
}

export default {
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(purgeExpired(env));
  },
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: cors(env, origin) });
    }

    try {
      if (url.pathname === "/auth/github") {
        if (!env.GITHUB_CLIENT_ID) return htmlError("Analytics OAuth is not configured yet.", 503);

        const state = crypto.randomUUID();
        const auth = new URL("https://github.com/login/oauth/authorize");
        auth.searchParams.set("client_id", env.GITHUB_CLIENT_ID);
        // Derive the callback from the Worker's own URL unless explicitly set,
        // so deployment does not require knowing the workers.dev domain in advance.
        auth.searchParams.set("redirect_uri", env.GITHUB_CALLBACK_URL || (url.origin + "/auth/callback"));
        auth.searchParams.set("scope", "read:user");
        auth.searchParams.set("state", state);

        return new Response(null, {
          status: 302,
          headers: {
            "Location": auth.toString(),
            "Set-Cookie": `bta_oauth_state=${state}; Path=/; Max-Age=600; HttpOnly; Secure; SameSite=Lax`
          }
        });
      }

      if (url.pathname === "/auth/callback") {
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        const cookies = request.headers.get("Cookie") || "";
        const stored = cookies.match(/(?:^|;\s*)bta_oauth_state=([^;]+)/)?.[1];

        if (!code || !state || !stored || state !== stored) return htmlError("Invalid OAuth state.", 400);

        const token = await exchangeCode(env, code);
        const user = await githubUser(token.access_token);

        if (user.login !== env.GITHUB_ALLOWED_LOGIN) {
          return htmlError("This analytics dashboard is private.", 403);
        }

        const session = await makeSession(env, user.login);

        return new Response(null, {
          status: 302,
          headers: {
            "Location": dashboardUrl(env),
            "Set-Cookie": cookie(session)
          }
        });
      }

      if (url.pathname === "/auth/logout") {
        return json({ ok: true }, 200, { "Set-Cookie": cookie("", 0) });
      }

      if (url.pathname === "/api/ingest" && request.method === "POST") {
        if (origin && origin !== env.SITE_ORIGIN) return json({ error: "origin" }, 403, cors(env, origin));

        // Durable counter — the in-memory one never fired across isolates.
        const rateKey = await rateLimitKey(env, request.headers.get("CF-Connecting-IP") || "");
        if (rateExceeded(await rateState(env, "ingest_attempts", rateKey), INGEST_LIMIT_PER_MINUTE)) {
          return json({ error: "rate limited" }, 429, cors(env, origin));
        }
        await recordUse(env, "ingest_attempts", rateKey);

        const declared = Number(request.headers.get("Content-Length") || 0);
        if (declared > MAX_BODY_BYTES) return json({ error: "payload too large" }, 413, cors(env, origin));

        const body = await request.json();
        const event = String(body.event || "");

        if (!ALLOWED_EVENTS.has(event)) return json({ error: "invalid event" }, 400, cors(env, origin));
        if (!body.visitor_id || !body.session_id || !body.site_id) return json({ error: "missing identity" }, 400, cors(env, origin));

        const properties = body.properties && typeof body.properties === "object"
          ? JSON.stringify(body.properties).slice(0, 2000)
          : "{}";

        const info = requestInfo(request);

        await env.DB.prepare(`
          INSERT INTO events (
            site_id,visitor_id,session_id,event,path,title,referrer,language,timezone,
            screen_width,screen_height,utm_source,utm_medium,utm_campaign,
            country,region,device,browser,os,properties_json,created_at
          ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        `).bind(
          String(body.site_id).slice(0, 80),
          String(body.visitor_id).slice(0, 100),
          String(body.session_id).slice(0, 100),
          event,
          String(body.path || "").slice(0, 500),
          String(body.title || "").slice(0, 300),
          String(body.referrer || "").slice(0, 300),
          String(body.language || "").slice(0, 80),
          String(body.timezone || "").slice(0, 100),
          Number(body.screen_width || 0),
          Number(body.screen_height || 0),
          String(body.utm_source || "").slice(0, 100),
          String(body.utm_medium || "").slice(0, 100),
          String(body.utm_campaign || "").slice(0, 150),
          info.country, info.region, info.device, info.browser, info.os,
          properties,
          new Date().toISOString()
        ).run();

        return json({ ok: true }, 202, cors(env, origin));
      }

      const rateKey = await rateLimitKey(env, request.headers.get("CF-Connecting-IP") || "");
      const bearer = (request.headers.get("Authorization") || "").match(/^Bearer\s+(.+)$/i);

      // Read the durable counter before comparing anything: a lockout that only
      // changed the response code would still let a sweep test every guess.
      let priorFailures = null;
      if (bearer) {
        priorFailures = await rateState(env, "auth_attempts", rateKey);
        if (rateExceeded(priorFailures, AUTH_LIMIT_PER_MINUTE)) {
          return json({ error: "too many attempts" }, 429, cors(env, origin));
        }
      }

      const session = await authenticated(request, env);
      if (!session) {
        if (bearer) await recordAuthFailure(env, rateKey, bearer[1].trim());
        return json({ error: "unauthorized" }, 401, cors(env, origin));
      }
      // Cleared only when this address had recorded failures, so an ordinary
      // dashboard load costs one read and no writes.
      if (priorFailures) await clearAuthFailures(env, rateKey);

      if (url.pathname === "/api/me") {
        return json({ login: session.login }, 200, cors(env, origin));
      }

      const range = url.searchParams.get("range") || "7d";
      const base = `WHERE site_id = 'beneath-the-alter' AND created_at >= ?`;

      if (url.pathname === "/api/summary") {
        const [v, s, p, r, d] = await Promise.all([
          env.DB.prepare(`SELECT COUNT(DISTINCT visitor_id) n FROM events ${base}`).bind(since(range)).first(),
          env.DB.prepare(`SELECT COUNT(DISTINCT session_id) n FROM events ${base}`).bind(since(range)).first(),
          env.DB.prepare(`SELECT COUNT(*) n FROM events ${base} AND event='page_view'`).bind(since(range)).first(),
          env.DB.prepare(`SELECT COUNT(DISTINCT visitor_id) n FROM events ${base} AND visitor_id IN (
             SELECT visitor_id FROM events GROUP BY visitor_id HAVING MIN(created_at) < ?
          )`).bind(since(range), since(range)).first(),
          env.DB.prepare(`SELECT AVG(duration) avg FROM (
             SELECT session_id, (julianday(MAX(created_at))-julianday(MIN(created_at)))*86400 duration
             FROM events ${base} GROUP BY session_id
          )`).bind(since(range)).first()
        ]);
        const visitors = Number(v?.n || 0);
        return json({
          visitors,
          sessions: Number(s?.n || 0),
          pageviews: Number(p?.n || 0),
          returning_rate: visitors ? Math.round(Number(r?.n || 0) / visitors * 100) : 0,
          avg_duration_seconds: Math.max(0, Math.round(Number(d?.avg || 0)))
        }, 200, cors(env, origin));
      }

      const group = async (field) => {
        const allowed = new Set(["path", "referrer", "country", "device", "browser", "event"]);
        if (!allowed.has(field)) throw new Error("bad field");
        return aggregate(env,
          `SELECT ${field} label, COUNT(*) value FROM events ${base} GROUP BY ${field} ORDER BY value DESC LIMIT 20`,
          range);
      };

      if (url.pathname === "/api/pages") return json(await group("path"), 200, cors(env, origin));
      if (url.pathname === "/api/referrers") return json(await group("referrer"), 200, cors(env, origin));
      if (url.pathname === "/api/countries") return json(await group("country"), 200, cors(env, origin));
      if (url.pathname === "/api/devices") return json(await group("device"), 200, cors(env, origin));
      if (url.pathname === "/api/browsers") return json(await group("browser"), 200, cors(env, origin));
      if (url.pathname === "/api/events") return json(await group("event"), 200, cors(env, origin));

      if (url.pathname === "/api/timeseries") {
        const rows = await aggregate(env,
          `SELECT substr(created_at,1,10) label, COUNT(*) value
           FROM events ${base} GROUP BY substr(created_at,1,10) ORDER BY label`,
          range);
        return json(rows, 200, cors(env, origin));
      }

      return json({ error: "not found" }, 404, cors(env, origin));
    } catch (err) {
      console.error(err);
      return json({ error: "internal server error" }, 500, cors(env, origin));
    }
  }
};
