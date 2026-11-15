// Admin-only statistics: pulls Cloudflare Web Analytics and Google Search Console data
// server-side (keys never reach the browser) and returns one JSON object to the admin panel.
// Deployed as Supabase Edge Function "admin-stats" (verify_jwt = true).
// Secrets (optional — each source is skipped with a clear status when its secret is missing):
//   CF_API_TOKEN  Cloudflare API token with "Account > Account Analytics > Read"
//   GSC_SA_JSON   Google service-account key (JSON) added as a user on the Search Console property
import { createClient } from "npm:@supabase/supabase-js@2";

const CF_ACCOUNT = "c4690793cb6076c133d0e7b2ef96683f";
const CF_HOST = "ltestament.com";
const GSC_SITE = "sc-domain:ltestament.com";

const cors = {
  "Access-Control-Allow-Origin": "https://ltestament.com",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
const ymd = (d: Date) => d.toISOString().slice(0, 10);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "method" }, 405);

  // Only admins
  const auth = req.headers.get("Authorization") ?? "";
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY") ?? "sb_publishable_k8fRjG4b4EMj5TH9yXR3qQ_w-fqi76l", {
    global: { headers: { Authorization: auth } },
  });
  const { data: role } = await sb.rpc("my_role");
  if (role !== "admin") return json({ error: "forbidden" }, 403);

  let days = 30;
  try { days = Math.min(180, Math.max(1, Number((await req.json()).days) || 30)); } catch { /* default */ }
  const until = new Date();
  const since = new Date(Date.now() - (days - 1) * 86400000);

  const [cloudflare, google] = await Promise.all([
    cfStats(ymd(since), ymd(until)).catch((e) => ({ status: "error", message: String(e).slice(0, 300) })),
    gscStats(ymd(since), ymd(until)).catch((e) => ({ status: "error", message: String(e).slice(0, 300) })),
  ]);
  return json({ days, since: ymd(since), until: ymd(until), cloudflare, google });
});

/* ---------------- Cloudflare Web Analytics ---------------- */
async function cfStats(since: string, until: string) {
  const token = Deno.env.get("CF_API_TOKEN");
  if (!token) return { status: "not_configured" };
  const h = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const list = await fetch(`https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT}/rum/site_info/list?per_page=50`, { headers: h });
  const lj = await list.json();
  if (!lj.success) return { status: "error", message: JSON.stringify(lj.errors ?? lj).slice(0, 300) };
  const site = (lj.result ?? []).find((s: any) => (s.host ?? "").replace(/^www\./, "") === CF_HOST || s.ruleset?.zone_name === CF_HOST);
  if (!site) return { status: "error", message: "Web Analytics site for ltestament.com not found" };

  const tag = String(site.site_tag).replace(/[^a-f0-9]/gi, "");
  const f = `{ siteTag: "${tag}", date_geq: "${since}", date_leq: "${until}" }`;
  const g = (alias: string, dim: string, limit: number, order: string) =>
    `${alias}: rumPageloadEventsAdaptiveGroups(limit: ${limit}, filter: ${f}, orderBy: [${order}]) { count sum { visits } dimensions { ${dim} } }`;
  const query = `query($a: String!) {
    viewer { accounts(filter: { accountTag: $a }) {
      ${g("daily", "date", 200, "date_ASC")}
      ${g("countries", "countryName", 15, "count_DESC")}
      ${g("paths", "requestPath", 15, "count_DESC")}
      ${g("referers", "refererHost", 15, "count_DESC")}
      ${g("devices", "deviceType", 5, "count_DESC")}
    } } }`;
  const r = await fetch("https://api.cloudflare.com/client/v4/graphql", {
    method: "POST", headers: h,
    body: JSON.stringify({ query, variables: { a: CF_ACCOUNT } }),
  });
  const j = await r.json();
  if (j.errors?.length) return { status: "error", message: JSON.stringify(j.errors).slice(0, 300) };
  const acc = j.data?.viewer?.accounts?.[0] ?? {};
  const map = (rows: any[], key: string) => (rows ?? []).map((x) => ({ key: x.dimensions[key] || "", views: x.count, visits: x.sum?.visits ?? 0 }));
  const daily = map(acc.daily, "date");
  return {
    status: "ok",
    totals: { views: daily.reduce((s, x) => s + x.views, 0), visits: daily.reduce((s, x) => s + x.visits, 0) },
    daily, countries: map(acc.countries, "countryName"), paths: map(acc.paths, "requestPath"),
    referers: map(acc.referers, "refererHost"), devices: map(acc.devices, "deviceType"),
  };
}

/* ---------------- Google Search Console ---------------- */
async function gscStats(since: string, until: string) {
  const raw = Deno.env.get("GSC_SA_JSON");
  if (!raw) return { status: "not_configured" };
  const sa = JSON.parse(raw);
  const token = await googleToken(sa.client_email, sa.private_key);
  const q = async (dimensions: string[], rowLimit: number) => {
    const r = await fetch(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(GSC_SITE)}/searchAnalytics/query`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ startDate: since, endDate: until, dimensions, rowLimit }),
    });
    const j = await r.json();
    if (j.error) throw new Error(`${j.error.code} ${j.error.message}`);
    return (j.rows ?? []).map((x: any) => ({ key: dimensions.length ? x.keys[0] : "", clicks: x.clicks, impressions: x.impressions, ctr: x.ctr, position: x.position }));
  };
  const [totals, daily, queries, pages, countries] = await Promise.all([
    q([], 1), q(["date"], 200), q(["query"], 20), q(["page"], 15), q(["country"], 15),
  ]);
  return { status: "ok", totals: totals[0] ?? { clicks: 0, impressions: 0, ctr: 0, position: 0 }, daily, queries, pages, countries };
}

async function googleToken(email: string, pem: string) {
  const b64u = (b: ArrayBuffer | string) =>
    btoa(typeof b === "string" ? b : String.fromCharCode(...new Uint8Array(b))).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
  const now = Math.floor(Date.now() / 1000);
  const head = b64u(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = b64u(JSON.stringify({
    iss: email, scope: "https://www.googleapis.com/auth/webmasters.readonly",
    aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600,
  }));
  const der = Uint8Array.from(atob(pem.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "")), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("pkcs8", der, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(`${head}.${claim}`));
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${head}.${claim}.${b64u(sig)}` }),
  });
  const j = await r.json();
  if (!j.access_token) throw new Error("Google auth: " + (j.error_description || j.error || "failed"));
  return j.access_token as string;
}
