(() => {
  "use strict";

  const cfg = window.BTA_ANALYTICS_CONFIG || {};
  const API = String(cfg.apiBase || "").replace(/\/$/, "") ||
    (cfg.endpoint ? new URL(cfg.endpoint).origin : "");

  const $ = id => document.getElementById(id);
  const TOKEN_KEY = "bta_dashboard_token";

  const getToken = () => { try { return localStorage.getItem(TOKEN_KEY) || ""; } catch (_) { return ""; } };
  const setToken = v => {
    try { v ? localStorage.setItem(TOKEN_KEY, v) : localStorage.removeItem(TOKEN_KEY); } catch (_) {}
  };

  const status = (msg, isError) => {
    const el = $("status");
    if (el) {
      el.textContent = msg || "";
      el.classList.toggle("error", !!isError);
    }
  };

  function showGate(message) {
    const gate = $("gate");
    if (!gate) return;
    gate.hidden = false;
    const err = $("gate-error");
    if (err) err.textContent = message || "";
    const oauth = $("oauth-link");
    if (oauth && API) oauth.href = API + "/auth/github";
    const input = $("token-input");
    if (input) input.focus();
  }

  function hideGate() {
    const gate = $("gate");
    if (gate) gate.hidden = true;
  }

  if (!API) {
    $("identity").textContent = "NOT CONFIGURED";
    status("Set the Worker URL in analytics-config.js to enable the dashboard.", true);
    return;
  }

  async function api(path, options) {
    const token = getToken();
    const res = await fetch(API + path, {
      ...options,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: "Bearer " + token } : {}),
        ...(options && options.headers || {})
      }
    });
    if (res.status === 401) {
      const err = new Error("unauthorized");
      err.status = 401;
      throw err;
    }
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }

  const fmt = n => Number(n || 0).toLocaleString();
  const duration = sec => {
    sec = Math.round(Number(sec || 0));
    return sec < 60 ? `${sec}s` : `${Math.floor(sec / 60)}m ${sec % 60}s`;
  };

  function list(el, rows) {
    el.innerHTML = "";
    const data = rows || [];
    if (!data.length) {
      const empty = document.createElement("div");
      empty.className = "row";
      empty.innerHTML = "<span>No data yet</span><span>0</span>";
      el.appendChild(empty);
      return;
    }
    data.slice(0, 12).forEach(row => {
      const div = document.createElement("div");
      div.className = "row";
      div.innerHTML = `<span>${escapeHtml(row.label || row.name || "Unknown")}</span><span>${fmt(row.value || row.count)}</span>`;
      el.appendChild(div);
    });
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }

  async function load() {
    status("Loading…");
    const range = $("range").value;
    const [me, summary, timeline, pages, referrers, countries, devices, browsers, events] =
      await Promise.all([
        api("/api/me"),
        api(`/api/summary?range=${range}`),
        api(`/api/timeseries?range=${range}`),
        api(`/api/pages?range=${range}`),
        api(`/api/referrers?range=${range}`),
        api(`/api/countries?range=${range}`),
        api(`/api/devices?range=${range}`),
        api(`/api/browsers?range=${range}`),
        api(`/api/events?range=${range}`)
      ]);

    hideGate();
    $("identity").textContent = `SIGNED IN: ${me.login}`;
    $("visitors").textContent = fmt(summary.visitors);
    $("sessions").textContent = fmt(summary.sessions);
    $("pageviews").textContent = fmt(summary.pageviews);
    $("returning").textContent = `${summary.returning_rate || 0}%`;
    $("duration").textContent = duration(summary.avg_duration_seconds);

    list($("pages"), pages);
    list($("referrers"), referrers);
    list($("countries"), countries);
    list($("devices"), devices);
    list($("browsers"), browsers);
    list($("events"), events);

    const values = (timeline || []).map(x => Number(x.value || 0));
    const max = Math.max(1, ...values);
    $("timeline").innerHTML = values.length
      ? values.map(v =>
          `<div class="bar" title="${v}" style="height:${Math.max(2, v / max * 100)}%"></div>`
        ).join("")
      : '<p class="micro">No events in this range yet.</p>';

    status(`Updated ${new Date().toLocaleTimeString()}`);
  }

  function fail(err) {
    if (err && err.status === 401) {
      $("identity").textContent = "LOCKED";
      status("");
      showGate(getToken() ? "That access token was rejected." : "");
      return;
    }
    console.error(err);
    $("identity").textContent = "ERROR";
    status("Could not load analytics. Check your Worker and connection.", true);
  }

  $("refresh").onclick = () => load().catch(fail);
  $("range").onchange = () => load().catch(fail);

  const tokenForm = $("token-form");
  if (tokenForm) {
    tokenForm.addEventListener("submit", event => {
      event.preventDefault();
      const value = ($("token-input").value || "").trim();
      if (!value) return;
      setToken(value);
      load().catch(fail);
    });
  }

  $("logout").onclick = async () => {
    setToken("");
    try {
      await fetch(API + "/auth/logout", { method: "POST", credentials: "include" });
    } catch (_) {}
    location.reload();
  };

  load().catch(fail);
})();
