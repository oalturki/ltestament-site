// Phone notifications (Web Push) for the reminders of khatmas (js/khatma.js, js/push.js).
// POST {action:'key'}                                -> {key}  the VAPID public key (made on the first call, kept in push_keys)
// POST {action:'save', sub, tz, lang, reminders}     -> keeps the device's subscription and its reminders (push_subs)
// POST {action:'remove', endpoint}                   -> forgets a device
// POST {action:'send'} with header x-cron            -> every 15 minutes (pg_cron): sends the reminders whose time has come
// A reminder: {id, name, time:'HH:MM', days:<bitmask, bit0 = Sunday>, start:'YYYY-MM-DD', end:'YYYY-MM-DD'}
import webpush from 'npm:web-push@3.6.7';
import { createClient } from 'npm:@supabase/supabase-js@2';

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'content-type, authorization, apikey, x-client-info, x-cron', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const json = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...CORS, 'Content-Type': 'application/json' } });

async function keys() {
  const r = await db.from('push_keys').select('*').eq('id', 1).maybeSingle();
  if (r.data) return r.data;
  const k = webpush.generateVAPIDKeys();
  const secret = crypto.randomUUID() + crypto.randomUUID();
  await db.from('push_keys').insert({ id: 1, public_key: k.publicKey, private_key: k.privateKey, cron_secret: secret });
  const again = await db.from('push_keys').select('*').eq('id', 1).single();   // another call may have made them first
  return again.data;
}

// the local date, time and weekday in a time zone
function local(tz: string) {
  const f = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false, weekday: 'short' });
  const p: Record<string, string> = {};
  for (const x of f.formatToParts(new Date())) p[x.type] = x.value;
  const wd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday);
  return { d: `${p.year}-${p.month}-${p.day}`, m: (+p.hour % 24) * 60 + +p.minute, wd };
}
const TXT: Record<string, [string, string]> = {
  ar: ['حان وقت وردك', 'افتح المصحف لتكمل ختمتك'], en: ['Time for your daily portion', 'Open the Mushaf to continue your khatma'],
  ur: ['آپ کے ورد کا وقت', 'اپنا ختم جاری رکھنے کے لیے مصحف کھولیں'], fr: ['L’heure de votre portion', 'Ouvrez le Mushaf pour poursuivre votre khatma'],
  es: ['Hora de tu porción diaria', 'Abre el Mushaf para continuar tu khatma'], ru: ['Время для ежедневной части', 'Откройте Мусхаф, чтобы продолжить хатм'],
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  let b: any = {};
  try { b = await req.json(); } catch { return json({ error: 'bad request' }, 400); }
  const K = await keys();
  if (b.action === 'key') return json({ key: K.public_key });

  if (b.action === 'save') {
    const sub = b.sub;
    if (!sub || typeof sub.endpoint !== 'string' || !/^https:\/\//.test(sub.endpoint) || !sub.keys) return json({ error: 'bad subscription' }, 400);
    const rem = (Array.isArray(b.reminders) ? b.reminders : []).slice(0, 20).map((r: any) => ({
      id: String(r.id || '').slice(0, 64), name: String(r.name || '').slice(0, 60), time: /^\d\d:\d\d$/.test(r.time) ? r.time : '20:00',
      days: Math.max(1, Math.min(127, +r.days || 127)), start: String(r.start || '').slice(0, 10), end: String(r.end || '').slice(0, 10),
    }));
    const tz = (() => { try { new Intl.DateTimeFormat('en', { timeZone: b.tz }); return String(b.tz); } catch { return 'Asia/Riyadh'; } })();
    const r = await db.from('push_subs').upsert({ endpoint: sub.endpoint, sub, tz, lang: String(b.lang || 'ar').slice(0, 5), reminders: rem, updated_at: new Date().toISOString() });
    return r.error ? json({ error: r.error.message }, 500) : json({ ok: true, n: rem.length });
  }
  if (b.action === 'remove') {
    if (typeof b.endpoint === 'string') await db.from('push_subs').delete().eq('endpoint', b.endpoint);
    return json({ ok: true });
  }
  if (b.action === 'send') {
    if (req.headers.get('x-cron') !== K.cron_secret) return json({ error: 'forbidden' }, 403);
    webpush.setVapidDetails('mailto:noreply@ltestament.com', K.public_key, K.private_key);
    const subs = await db.from('push_subs').select('*').neq('reminders', '[]').limit(5000);
    let sent = 0, gone = 0;
    for (const s of subs.data || []) {
      const t = local(s.tz), sentMap = { ...(s.sent || {}) }; let changed = false;
      for (const r of s.reminders || []) {
        const [hh, mm] = r.time.split(':').map(Number), at = hh * 60 + mm;
        // due: its time passed less than 30 minutes ago, on a reading day within the khatma, not sent yet today
        if (t.m < at || t.m - at >= 30 || !((r.days >> t.wd) & 1) || (r.start && t.d < r.start) || (r.end && t.d > r.end) || sentMap[r.id] === t.d) continue;
        const tx = TXT[s.lang] || TXT.ar;
        try {
          await webpush.sendNotification(s.sub, JSON.stringify({ title: tx[0], body: (r.name ? r.name + ' — ' : '') + tx[1], tag: 'wird-' + r.id, url: '/book/?k=' + encodeURIComponent(r.id), lang: s.lang, dir: s.lang === 'ar' || s.lang === 'ur' ? 'rtl' : 'ltr' }), { TTL: 3600 });
          sent++;
        } catch (e: any) {
          if (e && (e.statusCode === 404 || e.statusCode === 410)) { await db.from('push_subs').delete().eq('endpoint', s.endpoint); gone++; break; }
        }
        sentMap[r.id] = t.d; changed = true;
      }
      if (changed) await db.from('push_subs').update({ sent: sentMap }).eq('endpoint', s.endpoint);
    }
    return json({ ok: true, sent, gone });
  }
  return json({ error: 'unknown action' }, 400);
});
