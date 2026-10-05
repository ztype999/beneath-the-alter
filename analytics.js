/* Beneath the Alter analytics tracker
 * Privacy-first: no form contents, passwords, OAuth tokens, or full IP addresses.
 * Configuration lives in ./analytics-config.js (window.BTA_ANALYTICS_CONFIG).
 */
(() => {
  "use strict";

  const config = Object.assign({
    endpoint: "",
    siteId: "beneath-the-alter",
    enabled: true
  }, window.BTA_ANALYTICS_CONFIG || {});

  if (!config.enabled || !config.endpoint) return;

  const visitorKey = "bta_visitor_id";
  const sessionKey = "bta_session_id";

  const uuid = () => {
    try {
      if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    } catch (_) {}
    return "bta-" + Date.now() + "-" + Math.random().toString(36).slice(2);
  };

  const safe = (fn, fallback) => {
    try { return fn(); } catch (_) { return fallback; }
  };

  let visitorId = safe(() => localStorage.getItem(visitorKey), null);
  if (!visitorId) {
    visitorId = uuid();
    safe(() => localStorage.setItem(visitorKey, visitorId), null);
  }

  let sessionId = safe(() => sessionStorage.getItem(sessionKey), null);
  const newSession = !sessionId;
  if (!sessionId) {
    sessionId = uuid();
    safe(() => sessionStorage.setItem(sessionKey, sessionId), null);
  }

  const params = new URLSearchParams(location.search);

  const base = {
    site_id: config.siteId,
    visitor_id: visitorId,
    session_id: sessionId,
    path: location.pathname.slice(0, 500),
    title: document.title.slice(0, 300),
    referrer: safe(() => (document.referrer ? new URL(document.referrer).origin : ""), ""),
    language: navigator.language || "",
    timezone: safe(() => Intl.DateTimeFormat().resolvedOptions().timeZone || "", ""),
    screen_width: Math.min(screen.width || 0, 10000),
    screen_height: Math.min(screen.height || 0, 10000),
    utm_source: (params.get("utm_source") || "").slice(0, 100),
    utm_medium: (params.get("utm_medium") || "").slice(0, 100),
    utm_campaign: (params.get("utm_campaign") || "").slice(0, 150)
  };

  let lastSent = 0;

  function send(event, properties = {}) {
    const now = Date.now();
    if (event === "heartbeat" && now - lastSent < 15000) return;
    lastSent = now;

    const payload = JSON.stringify({
      ...base,
      event: String(event).slice(0, 60),
      properties: sanitize(properties),
      timestamp: new Date().toISOString()
    });

    try {
      if (navigator.sendBeacon) {
        const ok = navigator.sendBeacon(
          config.endpoint,
          new Blob([payload], { type: "application/json" })
        );
        if (ok) return;
      }
    } catch (_) {}

    fetch(config.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
      credentials: "omit"
    }).catch(() => {});
  }

  function sanitize(obj) {
    const out = {};
    if (!obj || typeof obj !== "object") return out;
    Object.keys(obj).slice(0, 12).forEach(key => {
      const value = obj[key];
      if (
        ["string", "number", "boolean"].includes(typeof value) &&
        String(value).length <= 300
      ) out[String(key).slice(0, 60)] = value;
    });
    return out;
  }

  function classifyLink(a) {
    const href = (a.href || "").toLowerCase();
    if (!href) return "link";
    if (href.includes("spotify")) return "music_click";
    if (href.includes("youtube")) return "music_click";
    if (href.includes("soundcloud")) return "music_click";
    if (href.includes("/merch") || href.includes("#merch")) return "merch_click";
    if (href.startsWith("mailto:")) return "contact_start";
    if (a.target === "_blank" || safe(() => new URL(a.href, location.href).origin !== location.origin, false))
      return "outbound_click";
    return "link_click";
  }

  document.addEventListener("click", event => {
    const a = event.target.closest && event.target.closest("a");
    if (!a) return;
    send(classifyLink(a), {
      text: (a.textContent || "").trim().slice(0, 120),
      href: a.href
    });
  }, { passive: true });

  document.addEventListener("submit", event => {
    if (event.target && event.target.matches("form")) {
      send("contact_submit", { form: event.target.id || "form" });
    }
  }, { passive: true });

  send(newSession ? "session_start" : "page_view");

  let active = true;
  const heartbeat = () => {
    if (active) send("heartbeat", { visible: document.visibilityState === "visible" });
  };

  document.addEventListener("visibilitychange", () => {
    active = document.visibilityState === "visible";
    if (active) heartbeat();
  });

  setInterval(heartbeat, 30000);

  window.BTAAnalytics = {
    track(event, properties) {
      send(event, properties);
    }
  };
})();
