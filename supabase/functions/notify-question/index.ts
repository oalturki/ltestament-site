// Sends an email to the site team when a new question arrives.
// Called by a database trigger with {"id": <question id>}.
// Safe to expose: it only mails once per question (notified_at), and only for fresh questions.
// Deployed as Supabase Edge Function "notify-question" (verify_jwt = false). Needs secret RESEND_API_KEY.
import { createClient } from "npm:@supabase/supabase-js@2";

const TO = "ltestament4u@gmail.com";
const FROM = "العهد الأخير <onboarding@resend.dev>";
const ADMIN = "https://ltestament.com/admin/";
const LANGS: Record<string, string> = { ar: "العربية", en: "English", ur: "اردو", fr: "Français", es: "Español", ru: "Русский" };
const METHODS: Record<string, string> = { email: "البريد", whatsapp: "واتساب", telegram: "تيليجرام" };
const BG: Record<string, string> = { christian: "مسيحي", jewish: "يهودي", none: "بلا دين", other: "أخرى", muslim: "مسلم", undisclosed: "لم يحدد" };

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("method", { status: 405 });
  let id: number;
  try { id = Number((await req.json()).id); } catch { return new Response("bad", { status: 400 }); }
  if (!Number.isInteger(id) || id <= 0) return new Response("bad", { status: 400 });

  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) return new Response("no key", { status: 500 });

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  // Claim the question atomically: only one call can set notified_at.
  const { data: q, error } = await db.from("questions")
    .update({ notified_at: new Date().toISOString() })
    .eq("id", id).is("notified_at", null)
    .gt("created_at", new Date(Date.now() - 30 * 60 * 1000).toISOString())
    .select("id, created_at, lang, question, contact_method, name, background")
    .maybeSingle();
  if (error) return new Response("db", { status: 500 });
  if (!q) return new Response("skip", { status: 200 });

  const dir = q.lang === "ar" || q.lang === "ur" ? "rtl" : "ltr";
  const html = `<div dir="rtl" style="font-family:Tahoma,Arial,sans-serif;font-size:15px;line-height:1.7;color:#222">
<h2 style="margin:0 0 12px">سؤال جديد رقم ${q.id}</h2>
<p style="margin:0 0 6px"><b>اللغة:</b> ${esc(LANGS[q.lang] ?? q.lang)} &nbsp;·&nbsp; <b>التواصل عبر:</b> ${esc(METHODS[q.contact_method] ?? q.contact_method)}</p>
<p style="margin:0 0 6px"><b>الاسم:</b> ${esc(q.name || "—")} &nbsp;·&nbsp; <b>الخلفية:</b> ${esc(BG[q.background] ?? q.background ?? "—")}</p>
<div dir="${dir}" style="background:#f5f1e8;border-radius:8px;padding:14px 16px;margin:14px 0;white-space:pre-wrap">${esc(q.question)}</div>
<p><a href="${ADMIN}" style="background:#1f4d3a;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none">افتح لوحة المشرف</a></p>
<p style="color:#888;font-size:12px">بيانات التواصل تظهر في لوحة المشرف فقط، ولا تُرسل في البريد.</p>
</div>`;

  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to: [TO], subject: `سؤال جديد (${LANGS[q.lang] ?? q.lang}) — رقم ${q.id}`, html }),
  });
  if (!r.ok) {
    // Release the claim so a retry can send it.
    await db.from("questions").update({ notified_at: null }).eq("id", id);
    return new Response("mail " + r.status + " " + (await r.text()).slice(0, 200), { status: 502 });
  }
  return new Response("sent", { status: 200 });
});
