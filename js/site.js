/* Site-wide settings controlled from the admin panel (table public.site_settings):
   - dev_banner: { show: bool }                     -> the "under development" banner
   - social:     { x: {url, show}, youtube: {...} } -> icons in the footer
   The last known settings are cached in localStorage and applied immediately, to avoid a flash. */
(function () {
  var URL = 'https://nikwwjswwlwcqekbnpzq.supabase.co/rest/v1/site_settings?select=key,value';
  var KEY = 'sb_publishable_k8fRjG4b4EMj5TH9yXR3qQ_w-fqi76l';
  var CACHE = 'lt_site_settings_v1';
  var lang = (document.documentElement.lang || 'ar').slice(0, 2);

  var NAMES = { x: 'X', youtube: 'YouTube', telegram: 'Telegram', instagram: 'Instagram',
                tiktok: 'TikTok', facebook: 'Facebook', whatsapp: 'WhatsApp' };
  var FOLLOW = { ar: 'تابعنا على', en: 'Follow us on', ur: 'ہمیں فالو کریں:', fr: 'Suivez-nous sur',
                 es: 'Síguenos en', ru: 'Мы в' };
  var P = 'viewBox="0 0 24 24" width="17" height="17" aria-hidden="true" fill="currentColor"';
  var ICONS = {
    x: '<svg ' + P + '><path d="M18.9 2H22l-6.8 7.8L23 22h-6.1l-4.8-6.3L6.6 22H3.5l7.3-8.3L1 2h6.3l4.3 5.7L18.9 2zm-1.1 18h1.7L6.3 3.9H4.5L17.8 20z"/></svg>',
    youtube: '<svg ' + P + '><path d="M23 7.2a3 3 0 0 0-2.1-2.1C19 4.6 12 4.6 12 4.6s-7 0-8.9.5A3 3 0 0 0 1 7.2 31 31 0 0 0 .5 12 31 31 0 0 0 1 16.8a3 3 0 0 0 2.1 2.1c1.9.5 8.9.5 8.9.5s7 0 8.9-.5a3 3 0 0 0 2.1-2.1 31 31 0 0 0 .5-4.8 31 31 0 0 0-.5-4.8zM9.8 15.1V8.9L15.6 12l-5.8 3.1z"/></svg>',
    telegram: '<svg ' + P + '><path d="M21.9 4.3 18.6 20c-.2 1.1-.9 1.4-1.8.9l-5-3.7-2.4 2.3c-.3.3-.5.5-1 .5l.4-5.1 9.2-8.3c.4-.4-.1-.6-.6-.2L6 13.6 1.1 12c-1.1-.3-1.1-1.1.2-1.6L20.5 3c.9-.3 1.7.2 1.4 1.3z"/></svg>',
    instagram: '<svg ' + P + '><path d="M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0 8.2a3.2 3.2 0 1 1 0-6.4 3.2 3.2 0 0 1 0 6.4zM17.3 5.5a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4zM12 1.5c-2.9 0-3.2 0-4.3.1C3.2 1.8 1.8 3.2 1.6 7.7 1.5 8.8 1.5 9.1 1.5 12s0 3.2.1 4.3c.2 4.5 1.6 5.9 6.1 6.1 1.1.1 1.4.1 4.3.1s3.2 0 4.3-.1c4.5-.2 5.9-1.6 6.1-6.1.1-1.1.1-1.4.1-4.3s0-3.2-.1-4.3c-.2-4.5-1.6-5.9-6.1-6.1-1.1-.1-1.4-.1-4.3-.1zm0 1.9c2.8 0 3.2 0 4.3.1 3.3.2 4.1 1.1 4.2 4.2.1 1.1.1 1.5.1 4.3s0 3.2-.1 4.3c-.1 3.1-.9 4-4.2 4.2-1.1.1-1.5.1-4.3.1s-3.2 0-4.3-.1c-3.3-.2-4.1-1.1-4.2-4.2-.1-1.1-.1-1.5-.1-4.3s0-3.2.1-4.3c.1-3.1.9-4 4.2-4.2 1.1-.1 1.5-.1 4.3-.1z"/></svg>',
    tiktok: '<svg ' + P + '><path d="M16.6 1.5h-3.7v14.2a3.1 3.1 0 1 1-2.2-3V8.9a6.8 6.8 0 1 0 5.9 6.8V8.5a8.4 8.4 0 0 0 4.9 1.6V6.4a4.9 4.9 0 0 1-4.9-4.9z"/></svg>',
    facebook: '<svg ' + P + '><path d="M22.5 12A10.5 10.5 0 1 0 10.4 22.4v-7.3H7.7V12h2.7V9.7c0-2.6 1.6-4.1 4-4.1 1.1 0 2.3.2 2.3.2v2.6h-1.3c-1.3 0-1.7.8-1.7 1.6V12h2.9l-.5 3.1h-2.4v7.3A10.5 10.5 0 0 0 22.5 12z"/></svg>',
    whatsapp: '<svg ' + P + '><path d="M12 1.5A10.4 10.4 0 0 0 3 17.2L1.5 22.5l5.4-1.4A10.4 10.4 0 1 0 12 1.5zm0 19a8.6 8.6 0 0 1-4.4-1.2l-.3-.2-3.2.8.9-3.1-.2-.3A8.6 8.6 0 1 1 12 20.5zm4.7-6.4c-.3-.1-1.5-.8-1.8-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.6.1a7 7 0 0 1-3.5-3c-.3-.5.3-.4.8-1.3.1-.2 0-.3 0-.5l-.8-1.9c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 11.9 11.9 0 0 0 4.6 4c1.7.7 2.4.8 3.2.7.5-.1 1.5-.6 1.8-1.2.2-.6.2-1.1.1-1.2l-.6-.3z"/></svg>'
  };

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function safeUrl(u) { return /^https:\/\/[^\s"<>]+$/.test(u || '') ? u : null; }

  function apply(s) {
    if (!s) return;
    // Development banner
    var showBanner = !(s.dev_banner && s.dev_banner.show === false);
    document.documentElement.classList.toggle('no-dev-banner', !showBanner);
    // Social links in the footer
    var box = document.querySelector('[data-social]');
    if (box) {
      var html = '';
      var social = s.social || {};
      Object.keys(ICONS).forEach(function (id) {
        var it = social[id], url = it && it.show && safeUrl(it.url);
        if (!url) return;
        var label = (FOLLOW[lang] || FOLLOW.en) + ' ' + NAMES[id];
        html += '<a href="' + esc(url) + '" target="_blank" rel="noopener me" aria-label="' + esc(label) + '" title="' + esc(label) + '">' + ICONS[id] + '</a>';
      });
      box.innerHTML = html;
      box.hidden = !html;
    }
  }

  var cached = null;
  try { cached = JSON.parse(localStorage.getItem(CACHE) || 'null'); } catch (e) {}
  apply(cached);

  fetch(URL, { headers: { apikey: KEY, Authorization: 'Bearer ' + KEY } })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (rows) {
      if (!rows) return;
      var s = {};
      rows.forEach(function (r) { s[r.key] = r.value; });
      apply(s);
      try { localStorage.setItem(CACHE, JSON.stringify(s)); } catch (e) {}
    })
    .catch(function () {});
})();
