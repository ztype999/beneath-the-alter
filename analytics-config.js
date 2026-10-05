/* Beneath the Alter analytics configuration.
 *
 * After deploying analytics-worker/ to Cloudflare, paste your Worker URL below.
 * Tracking stays completely disabled while `endpoint` is empty, so the site is
 * safe to deploy before the Worker exists.
 *
 *   endpoint : full ingestion URL, e.g.
 *              "https://bta-analytics.YOUR-SUBDOMAIN.workers.dev/api/ingest"
 *   apiBase  : Worker origin used by the private dashboard, e.g.
 *              "https://bta-analytics.YOUR-SUBDOMAIN.workers.dev"
 *
 * Never put secrets (GitHub client secret, session secret, tokens) in this file.
 */
window.BTA_ANALYTICS_CONFIG = {
  endpoint: "",
  apiBase: "",
  siteId: "beneath-the-alter",
  enabled: true
};
