CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id TEXT NOT NULL,
  visitor_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  event TEXT NOT NULL,
  path TEXT,
  title TEXT,
  referrer TEXT,
  language TEXT,
  timezone TEXT,
  screen_width INTEGER,
  screen_height INTEGER,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  country TEXT,
  region TEXT,
  device TEXT,
  browser TEXT,
  os TEXT,
  properties_json TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at);
CREATE INDEX IF NOT EXISTS idx_events_site_created ON events(site_id, created_at);
CREATE INDEX IF NOT EXISTS idx_events_visitor ON events(visitor_id);
CREATE INDEX IF NOT EXISTS idx_events_session ON events(session_id);
CREATE INDEX IF NOT EXISTS idx_events_event ON events(event);
CREATE INDEX IF NOT EXISTS idx_events_path ON events(path);
CREATE INDEX IF NOT EXISTS idx_events_country ON events(country);

-- Per-address rate-limit counters, shared by both limiters in worker.js.
--
-- These live in D1 rather than isolate memory because a burst of requests from
-- one address is spread across several Worker isolates, each with its own Map,
-- so an in-memory counter never fires — proven against both the auth and the
-- ingest limiters. D1 is a single shared store, so the count survives.
--
-- client_key is an HMAC of the address (rateLimitKey in worker.js), never the
-- address itself: worker.js promises not to keep full IP addresses, and this
-- state is durable rather than transient. The window is 60s (RATE_WINDOW_MS).
CREATE TABLE IF NOT EXISTS auth_attempts (
  client_key TEXT PRIMARY KEY,
  window_start INTEGER NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  last_value TEXT
);

-- Same counters for /api/ingest. The Origin header is trivially spoofed, so
-- this is what stops a flood from exhausting the D1 write quota.
CREATE TABLE IF NOT EXISTS ingest_attempts (
  client_key TEXT PRIMARY KEY,
  window_start INTEGER NOT NULL,
  count INTEGER NOT NULL DEFAULT 0
);
