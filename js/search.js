/* Site search — «العهد الأخير»
   A 🔍 button in the page header opens a search panel.
   Now: search in the Quran — the Arabic text (spelling-insensitive: no diacritics, any hamza/alef/ya/ta-marbuta form),
   and, on non-Arabic pages, the meaning in the page's language (the QuranEnc translation the book shows; data/search/tr-*.json).
   Each result opens the Mushaf book at that ayah, highlighted (/book/#p=PAGE&a=S:A — handled by js/book.js).
   Results are shown in the Complex's script (KFGQPC Hafs), the matched words highlighted.
   Data: /data/search/quran-ar.json (tools/build_search.py, from QUL), loaded on first use. */
(function () {
  'use strict';
  if (window.__ltSearch) return;
  window.__ltSearch = true;

  var LANG = (document.documentElement.lang || 'ar').slice(0, 2);
  var T = {
    ar: { site: 'في الموقع', inQuran: 'في القرآن الكريم', tabAr: 'في النص', tabTr: '', phTr: '', btn: 'بحث', ph: 'ابحث في القرآن الكريم… مثل: الصراط المستقيم', hint: '• اكتب رقمًا للانتقال إلى صفحة، مثل: ٢٥٥.\n• اكتب اسم سورة أو جزءًا منه، مثل: كهف.\n• اكتب السورة ثم نقطتين ثم رقم الآية للانتقال إليها، مثل: البقرة:٢٥٥.\n• أو اكتب كلمتين أو أكثر من الآية، بتشكيل أو بدونه.', none: 'لا توجد نتائج.', count: 'عدد النتائج:', more: 'عرض المزيد', close: 'إغلاق', loading: 'جارٍ التحميل…', err: 'تعذّر تحميل البحث، أعد المحاولة.', surah: 'سورة', arOnly: '' },
    en: { site: 'On this site', inQuran: 'In the Quran', hintTr: 'Type a word or a phrase from the English meaning.', tabAr: 'Arabic text', tabTr: 'Meaning (English)', phTr: 'Search the meaning… e.g. mercy, Moses, patience', btn: 'Search', ph: 'Search the Quran in Arabic… e.g. الصراط المستقيم', hint: 'Type Arabic words from the verse, with or without diacritics.', none: 'No results.', count: 'Results:', more: 'Show more', close: 'Close', loading: 'Loading…', err: 'Search could not load. Please try again.', surah: '', arOnly: '' },
    ur: { site: 'ویب سائٹ میں', inQuran: 'قرآن مجید میں', hintTr: 'اردو ترجمے کا کوئی لفظ یا جملہ لکھیں۔', tabAr: 'عربی متن', tabTr: 'ترجمہ (اردو)', phTr: 'ترجمے میں تلاش کریں… مثلاً رحمت، موسیٰ، صبر', btn: 'تلاش', ph: 'قرآن کے عربی متن میں تلاش کریں… مثلاً الصراط المستقیم', hint: 'آیت کے عربی الفاظ لکھیں، اعراب کے ساتھ یا بغیر۔', none: 'کوئی نتیجہ نہیں۔', count: 'نتائج:', more: 'مزید دکھائیں', close: 'بند کریں', loading: 'لوڈ ہو رہا ہے…', err: 'تلاش لوڈ نہیں ہو سکی، دوبارہ کوشش کریں۔', surah: 'سورۃ', arOnly: '' },
    fr: { site: 'Sur le site', inQuran: 'Dans le Coran', hintTr: 'Tapez un mot ou une expression du sens en français.', tabAr: 'Texte arabe', tabTr: 'Sens (français)', phTr: 'Rechercher dans le sens… ex. miséricorde, Moïse, patience', btn: 'Rechercher', ph: 'Rechercher dans le Coran en arabe… ex. الصراط المستقيم', hint: 'Tapez des mots arabes du verset, avec ou sans voyelles.', none: 'Aucun résultat.', count: 'Résultats :', more: 'Afficher plus', close: 'Fermer', loading: 'Chargement…', err: 'La recherche n’a pas pu se charger. Réessayez.', surah: '', arOnly: '' },
    es: { site: 'En el sitio', inQuran: 'En el Corán', hintTr: 'Escriba una palabra o frase del significado en español.', tabAr: 'Texto árabe', tabTr: 'Significado (español)', phTr: 'Buscar en el significado… p. ej. misericordia, Moisés, paciencia', btn: 'Buscar', ph: 'Buscar en el Corán en árabe… p. ej. الصراط المستقيم', hint: 'Escriba palabras árabes de la aleya, con o sin vocales.', none: 'Sin resultados.', count: 'Resultados:', more: 'Mostrar más', close: 'Cerrar', loading: 'Cargando…', err: 'No se pudo cargar la búsqueda. Inténtelo de nuevo.', surah: '', arOnly: '' },
    ru: { site: 'На сайте', inQuran: 'В Коране', hintTr: 'Введите слово или фразу из смыслового перевода.', tabAr: 'Арабский текст', tabTr: 'Смысл (русский)', phTr: 'Поиск по смыслу… напр. милость, Муса, терпение', btn: 'Поиск', ph: 'Поиск по арабскому тексту Корана… напр. الصراط المستقيم', hint: 'Введите арабские слова из аята, с огласовками или без.', none: 'Ничего не найдено.', count: 'Найдено:', more: 'Показать ещё', close: 'Закрыть', loading: 'Загрузка…', err: 'Не удалось загрузить поиск. Попробуйте ещё раз.', surah: '', arOnly: '' }
  }[LANG] || null;
  if (!T) return;
  var RTL = LANG === 'ar' || LANG === 'ur';
  // the translation of the page's language — the same one the book shows (QuranEnc)
  var TRKEY = { en: 'english_saheeh', fr: 'french_montada', es: 'spanish_montada_latin', ur: 'urdu_junagarhi', ru: 'russian_aboadel' }[LANG];
  var mode = TRKEY ? 'tr' : 'ar';
  var BOOK = LANG === 'ar' ? '/book/' : '/' + LANG + '/book/';
  var NAMES_LANG = (LANG === 'ar' || LANG === 'ur') ? 'ar' : (LANG === 'ru' ? 'ru' : 'en');
  var arDigits = function (n) { return RTL ? String(n).replace(/\d/g, function (d) { return '٠١٢٣٤٥٦٧٨٩'[d]; }) : String(n); };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };

  // one-to-one letter folding (keeps positions, so matches can be marked in the shown text)
  var FOLD = { 'أ': 'ا', 'إ': 'ا', 'آ': 'ا', 'ٱ': 'ا', 'ى': 'ي', 'ئ': 'ي', 'ؤ': 'و', 'ة': 'ه' };
  var fold = function (s) { return s.replace(/[أإآٱىئؤة]/g, function (c) { return FOLD[c]; }); };
  // lenient key for matching a query word to a shown word (spellings differ: الرحمن / الرحمان)
  var lenient = function (s) { return fold(s).replace(/[\u064B-\u065F\u0670\u0640\sا]/g, ''); };
  var cleanQuery = function (s) {
    return fold(s.replace(/[ً-ٰٟۖ-ۭـ]/g, '')).replace(/[^ء-ي\s]/g, ' ').replace(/\s+/g, ' ').trim();
  };

  // translation folding, one character for one character (so matches can be marked in the shown text):
  // lower case, accents dropped (Allāh → allah), ё → е, Urdu letter variants unified
  var UR = { 'ي': 'ی', 'ى': 'ی', 'ك': 'ک', 'ہ': 'ه', 'ھ': 'ه', 'ۃ': 'ه', 'ة': 'ه', 'ۓ': 'ے', 'أ': 'ا', 'إ': 'ا', 'آ': 'ا' };
  var foldTr = function (t) {
    var out = '';
    for (var i = 0; i < t.length; i++) {
      var c = t[i], n = c.normalize ? c.normalize('NFD').replace(/[\u0300-\u036f]/g, '') : c;
      n = (n || ' ')[0].toLowerCase();
      if (n === 'ё') n = 'е';
      if (UR[n]) n = UR[n];
      if (/[\u064B-\u065F\u0670]/.test(n)) n = ' ';
      out += n;
    }
    return out;
  };
  var trData = null, trFolded = null, trP = null, arP = null;
  function loadTr() {
    // one request even when asked twice at once (panel built + opened); a failure may be retried
    return trP || (trP = fetch('/data/search/tr-' + TRKEY + '.json').then(function (r) { if (!r.ok) throw 0; return r.json(); })
      .then(function (d) { trData = d.t; trFolded = trData.map(foldTr); }, function (e) { trP = null; throw e; }));
  }
  // site content (data/search/site-<lang>.json, tools/build_site_search.py): sections, verse windows, pages
  var siteKey = function (t) {
    return foldTr(fold(String(t || '')).replace(/[\u064B-\u065F\u0670\u0640\u06D6-\u06ED]/g, ''))
      .replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  };
  var site = null, siteP = null;
  function loadSite() {
    return siteP || (siteP = fetch('/data/search/site-' + LANG + '.json').then(function (r) { if (!r.ok) throw 0; return r.json(); })
      .then(function (d) { site = d.i.map(function (it) { it.kt = siteKey(it.t + ' ' + it.s); it.k = it.kt + ' ' + siteKey(it.x); return it; }); })
      .catch(function () { site = []; }));
  }
  // a matching section/page: every word of the query; title matches first
  function siteHits(raw) {
    if (!site) return [];
    var q = siteKey(raw); if (q.replace(/\s/g, '').length < 2) return [];
    var ws = q.split(' ');
    var hit = site.filter(function (it) { return ws.every(function (w) { return it.k.indexOf(w) >= 0; }); });
    // title starts with the query (the window about it) > query in the title > query in the text
    var score = function (it) { return it.kt.indexOf(q) === 0 ? 2 : ws.every(function (w) { return it.kt.indexOf(w) >= 0; }) ? 1 : 0; };
    hit.sort(function (a, b) { return score(b) - score(a); });
    return hit.slice(0, 5);
  }
  function siteBlock(raw) {
    var hits = siteHits(raw);
    if (!hits.length) return null;
    var box = document.createElement('div');
    box.className = 'lt-ssite';
    box.innerHTML = '<div class="lt-sgrp">' + esc(T.site) + '</div>';
    hits.forEach(function (it) {
      var a = document.createElement('a');
      a.className = 'lt-sres lt-spage'; a.href = it.u;
      var x = it.x.length > 150 ? it.x.slice(0, 150).replace(/\s+\S*$/, '') + '…' : it.x;
      a.innerHTML = '<div class="lt-sref">' + esc(it.t) + '</div>' + (it.s ? '<div class="lt-ssub">' + esc(it.s) + '</div>' : '') + '<div class="lt-sx2">' + esc(x) + '</div>';
      a.addEventListener('click', function () {
        close();
        // same page: the hash alone does not reload it, so act on it here
        var u = new URL(it.u, location.href);
        if (u.pathname === location.pathname) { setTimeout(function () { window.dispatchEvent(new HashChangeEvent('hashchange')); }, 0); }
      });
      box.appendChild(a);
    });
    return box;
  }
  /* ---------- going straight to a place: a page number, a surah by name or number, a surah:ayah ---------- */
  var GO = {
    ar: { go: 'انتقال مباشر', page: 'الصفحة', surah: 'سورة', ayah: 'الآية' },
    en: { go: 'Go to', page: 'Page', surah: 'Surah', ayah: 'Ayah' }
  }[LANG === 'ar' ? 'ar' : 'en'];
  var latinDigits = function (s) { return String(s).replace(/[٠-٩]/g, function (d) { return '٠١٢٣٤٥٦٧٨٩'.indexOf(d); }).replace(/[۰-۹]/g, function (d) { return '۰۱۲۳۴۵۶۷۸۹'.indexOf(d); }); };
  // a surah name for matching: no «سورة», no «ال», letters folded, no diacritics or spaces
  var nameKey = function (s) { return lenient(String(s).replace(/^\s*سور[ةه]\s+/, '')).replace(/^ال/, '').replace(/\s+/g, '').toLowerCase(); };
  function surahsByName(t) {
    var k = nameKey(t); if (k.length < 2) return [];
    var out = [];
    for (var s = 1; s <= 114 && out.length < 6; s++) {
      var names = [data.n.ar[s - 1], (data.n[NAMES_LANG] || data.n.en)[s - 1], data.n.en[s - 1]];
      if (names.some(function (n) { var nk = nameKey(n || ''); return nk && (nk === k || nk.indexOf(k) >= 0); })) out.push(s);
    }
    return out;
  }
  function places(raw) {
    var t = latinDigits(raw).trim(), out = [], m;
    if (!data || !t) return out;
    var sName = function (s) { return (data.n[NAMES_LANG] || data.n.en)[s - 1]; };
    var toAyah = function (s, a) { out.push({ label: GO.surah + ' ' + sName(s) + ' · ' + GO.ayah + ' ' + arDigits(a), href: BOOK + '#p=' + pageOf(s, a) + '&a=' + s + ':' + a }); };
    // surah:ayah — by number (2:255) or by name (البقرة:255)
    if ((m = t.match(/^(.+?)\s*[:：\/]\s*(\d{1,3})$/))) {
      var a = +m[2], ss = /^\d{1,3}$/.test(m[1].trim()) ? [+m[1]] : surahsByName(m[1]);
      ss.forEach(function (s) { if (s >= 1 && s <= 114 && a >= 1 && a <= data.v[s - 1]) toAyah(s, a); });
      return out;
    }
    // a number: that page, and the surah of that number
    if ((m = t.match(/^(\d{1,3})$/))) {
      var n = +m[1];
      if (n >= 1 && n <= 604) out.push({ label: GO.page + ' ' + arDigits(n), href: BOOK + '#p=' + n });
      if (n >= 1 && n <= 114) out.push({ label: GO.surah + ' ' + arDigits(n) + ' · ' + sName(n), href: BOOK + '#p=' + pageOf(n, 1) });
      return out;
    }
    // a surah's name, or part of it
    surahsByName(t).forEach(function (s) { out.push({ label: GO.surah + ' ' + sName(s), href: BOOK + '#p=' + pageOf(s, 1) }); });
    return out;
  }
  function placesBlock(raw) {
    var ps = places(raw);
    if (!ps.length) return null;
    var box = document.createElement('div');
    box.className = 'lt-ssite';
    box.innerHTML = '<div class="lt-sgrp">' + esc(GO.go) + '</div>';
    ps.forEach(function (p) {
      var a = document.createElement('a'); a.className = 'lt-sres lt-sgo'; a.href = p.href;
      a.innerHTML = '<div class="lt-sref" style="margin:0">' + esc(p.label) + '</div>';
      a.addEventListener('click', function () {
        close();
        var u = new URL(a.href, location.href);
        if (u.pathname === location.pathname) { setTimeout(function () { window.dispatchEvent(new HashChangeEvent('hashchange')); }, 0); }
      });
      box.appendChild(a);
    });
    return box;
  }
  // results shown: a place to go to first, then the site's, then the Quran's
  function showResults(q, words) {
    body.innerHTML = '';
    var gb = placesBlock(input.value);
    if (gb) body.appendChild(gb);
    var sb = siteBlock(input.value);
    if (sb) body.appendChild(sb);
    if (!lastHits.length) {
      if (!sb && !gb) body.innerHTML = '<div class="lt-snote">' + esc(T.none) + '</div>';
      return;
    }
    var head = document.createElement('div');
    head.className = 'lt-snote';
    head.textContent = (sb ? T.inQuran + ' — ' : '') + T.count + ' ' + arDigits(lastHits.length);
    body.appendChild(head);
    more(q, words);
  }
  var data = null, folded = null, keys = null, pageMap = null;
  function load() {
    return arP || (arP = Promise.all([
      fetch('/data/search/quran-ar.json').then(function (r) { if (!r.ok) throw 0; return r.json(); }),
      fetch('/data/quran-pages.json').then(function (r) { if (!r.ok) throw 0; return r.json(); })
    ]).then(function (r) {
      data = r[0]; pageMap = r[1];
      folded = data.t.map(fold);
      keys = [];
      data.v.forEach(function (n, s) { for (var a = 1; a <= n; a++) keys.push([s + 1, a]); });
    }, function (e) { arP = null; throw e; }));
  }
  function pageOf(s, a) {
    var k = s * 1000 + a, P = pageMap.pages;
    for (var i = 0; i < P.length; i++) if (P[i][2] * 1000 + P[i][3] >= k) return i + 1;
    return 1;
  }

  /* ---------- UI ---------- */
  var css = document.createElement('style');
  css.textContent =
    '.lt-sbtn{display:inline-flex;align-items:center;gap:7px;background:rgba(200,155,60,.14);border:1px solid #C89B3C;color:#F3E8D0;border-radius:18px;padding:6px 14px;font-family:inherit;font-size:.9rem;font-weight:700;line-height:1.2;white-space:nowrap;cursor:pointer;margin-inline:8px}' +
    '.lt-sbtn:hover{background:#C89B3C;color:#101b33}.lt-sbtn svg{width:16px;height:16px;flex:none;color:#C89B3C}.lt-sbtn:hover svg{color:#101b33}' +
    '.lt-sov{position:fixed;inset:0;z-index:9999;background:rgba(8,14,28,.72);display:none;align-items:flex-start;justify-content:center;padding:6vh 14px 14px;backdrop-filter:blur(3px)}' +
    '.lt-sov.on{display:flex}' +
    '.lt-sbox{width:min(760px,100%);max-height:88vh;display:flex;flex-direction:column;background:#FBF6EA;color:#2a2418;border-radius:14px;box-shadow:0 20px 60px rgba(0,0,0,.45);overflow:hidden}' +
    '.lt-shead{display:flex;gap:8px;align-items:center;padding:14px;border-bottom:1px solid rgba(200,155,60,.35)}' +
    '.lt-sin{flex:1;font:inherit;font-size:1.05rem;padding:11px 14px;border:1px solid rgba(200,155,60,.6);border-radius:10px;background:#fff;color:inherit;outline:none}' +
    '.lt-sin:focus{border-color:#C89B3C;box-shadow:0 0 0 3px rgba(200,155,60,.2)}' +
    '.lt-sx{background:none;border:none;font-size:1.6rem;line-height:1;color:#8a6a1f;cursor:pointer;padding:4px 8px}' +
    '.lt-sbody{overflow:auto;padding:6px 14px 14px}' +
    '.lt-snote{color:#7a6a4a;font-size:.9rem;padding:10px 2px}' +
    '.lt-sres{display:block;padding:12px 10px;border-bottom:1px solid rgba(200,155,60,.2);color:inherit;text-decoration:none;border-radius:8px}' +
    '.lt-sres:hover{background:rgba(200,155,60,.1)}' +
    '.lt-sref{font-size:.82rem;color:#8a6a1f;font-weight:700;margin-bottom:4px}' +
    '@font-face{font-family:"KFGQPC Hafs";src:url("/fonts/UthmanicHafs_V22.ttf") format("truetype");font-display:swap}' +
    '.lt-sar{font-family:"KFGQPC Hafs","Amiri",serif;font-size:1.4rem;line-height:2.1;direction:rtl;text-align:right;word-spacing:2px}' +
    '.lt-sar mark{background:rgba(200,155,60,.38);color:inherit;border-radius:4px;padding:0 2px}' +
    '.lt-sar .e{color:#8a6a1f}' +
    '.lt-sgrp{font-size:.8rem;font-weight:700;letter-spacing:.04em;color:#8a6a1f;padding:6px 4px 2px}' +
    '.lt-ssub{font-size:.8rem;color:#8a7a55;margin-top:1px}.lt-sx2{font-size:.92rem;line-height:1.6;color:#3a3222;margin-top:4px}' +
    '.lt-ssite{margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid rgba(200,155,60,.35)}' +
    '.lt-stabs{display:flex;gap:6px;padding:8px 14px 0}.lt-stabs button{font:inherit;font-size:.88rem;padding:6px 14px;border-radius:16px;border:1px solid rgba(200,155,60,.5);background:none;color:#6b5420;cursor:pointer}' +
    '.lt-stabs button.on{background:#C89B3C;border-color:#C89B3C;color:#101b33;font-weight:700}' +
    '.lt-str{font-size:1.02rem;line-height:1.75}.lt-str mark{background:rgba(200,155,60,.38);color:inherit;border-radius:3px;padding:0 1px}' +
    '.lt-smore{display:block;margin:12px auto 4px;background:#C89B3C;color:#101b33;border:none;border-radius:18px;padding:8px 18px;font:inherit;font-weight:700;cursor:pointer}';
  document.head.appendChild(css);

  var ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>';
  function addButton() {
    var host = document.querySelector('nav .nav-links') || document.querySelector('.bk-bar');
    if (!host || host.querySelector('.lt-sbtn')) return;
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'lt-sbtn'; b.setAttribute('aria-label', T.btn); b.title = T.btn;
    b.innerHTML = ICON + '<span>' + esc(T.btn) + '</span>';
    b.onclick = open;
    var ls = host.querySelector('.lang-switch');
    if (ls) host.insertBefore(b, ls); else host.appendChild(b);
  }

  var ov, input, body, timer, lastHits = [], shown = 0;
  function build() {
    ov = document.createElement('div');
    ov.className = 'lt-sov';
    ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-label', T.btn);
    ov.innerHTML = '<div class="lt-sbox" dir="' + (RTL ? 'rtl' : 'ltr') + '"><div class="lt-shead">' +
      '<input class="lt-sin" type="search" dir="rtl" lang="ar" autocomplete="off" placeholder="' + esc(T.ph) + '">' +
      '<button class="lt-sx" type="button" aria-label="' + esc(T.close) + '">×</button></div>' +
      (TRKEY ? '<div class="lt-stabs"><button type="button" data-m="tr">' + esc(T.tabTr) + '</button><button type="button" data-m="ar">' + esc(T.tabAr) + '</button></div>' :
       TOPICS ? '<div class="lt-stabs"><button type="button" data-m="ar">' + esc(T.tabAr) + '</button><button type="button" data-m="tp">' + esc(TP.tab) + '</button></div>' : '') +
      '<div class="lt-sbody"></div></div>';
    document.body.appendChild(ov);
    input = ov.querySelector('.lt-sin'); body = ov.querySelector('.lt-sbody');
    ov.querySelectorAll('.lt-stabs button').forEach(function (b) { b.onclick = function () { setMode(b.dataset.m); input.focus(); }; });
    setMode(mode);
    ov.querySelector('.lt-sx').onclick = close;
    ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && ov.classList.contains('on')) close(); });
    input.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(run, 180); });
    hint();
  }
  function setMode(m) {
    mode = m;
    ov.querySelectorAll('.lt-stabs button').forEach(function (b) { b.classList.toggle('on', b.dataset.m === m); });
    var tr = m === 'tr';
    input.placeholder = m === 'tp' ? TP.ph : tr ? T.phTr : T.ph;
    input.dir = tr && !RTL ? 'ltr' : 'rtl';
    input.lang = tr ? LANG : 'ar';
    ensure().then(function () { if (input.value.trim()) run(); else hint(); }, function () { body.innerHTML = '<div class="lt-snote">' + esc(T.err) + '</div>'; });
  }
  function ensure() {
    var need = !data || (mode === 'tr' && !trData);
    if (need) body.innerHTML = '<div class="lt-snote">' + esc(T.loading) + '</div>';
    if (mode === 'tp' && !tp) body.innerHTML = '<div class="lt-snote">' + esc(T.loading) + '</div>';
    return Promise.all([load(), loadSite()]).then(function () { return mode === 'tr' ? loadTr() : mode === 'tp' ? loadTopics() : null; });
  }
  function hint() {
    if (mode === 'tp') return tpHome(); body.innerHTML = '<div class="lt-snote" style="white-space:pre-line;line-height:1.9">' + esc(mode === 'tr' ? T.hintTr : T.hint) + (T.arOnly ? '<br>' + esc(T.arOnly) : '') + '</div>'; }
  function open() {
    if (!ov) build();
    ov.classList.add('on');
    document.documentElement.style.overflow = 'hidden';
    setTimeout(function () { input.focus(); }, 30);
    ensure().then(function () { if (input.value.trim()) run(); else hint(); },
                  function () { body.innerHTML = '<div class="lt-snote">' + esc(T.err) + '</div>'; });
  }
  function close() { ov.classList.remove('on'); document.documentElement.style.overflow = ''; }

  function run() {
    if (!data) return;
    if (mode === 'tr') return runTr();
    if (mode === 'tp') return runTopics();
    var q = cleanQuery(input.value);
    if (q.replace(/\s/g, '').length < 2) {
      if (places(input.value).length) { lastHits = []; shown = 0; showResults(q, []); return; }   // a page or 2:255
      hint(); return;
    }
    var words = q.split(' ');
    var phrase = [], all = [];
    for (var i = 0; i < folded.length; i++) {
      var t = folded[i];
      if (t.indexOf(q) >= 0) phrase.push(i);
      else if (words.length > 1 && words.every(function (w) { return t.indexOf(w) >= 0; })) all.push(i);
    }
    lastHits = phrase.concat(all);
    shown = 0;
    showResults(q, words);
  }
  // the ayah in the Complex's script, with the words that match the query highlighted
  function runTr() {
    if (!trData) return;
    var q = foldTr(input.value.trim()).replace(/[^\p{L}\p{N}\s'’-]/gu, ' ').replace(/\s+/g, ' ').trim();
    if (q.replace(/\s/g, '').length < 2) { hint(); return; }
    var words = q.split(' ').filter(function (w) { return w.length > 1; });
    var phrase = [], all = [];
    for (var i = 0; i < trFolded.length; i++) {
      var t = trFolded[i];
      if (t.indexOf(q) >= 0) phrase.push(i);
      else if (words.length > 1 && words.every(function (w) { return t.indexOf(w) >= 0; })) all.push(i);
    }
    lastHits = phrase.concat(all);
    shown = 0;
    showResults(q, words);
  }
  // the meaning, the query's words marked (folding keeps one character for one, so positions match)
  function markTr(i, q, words) {
    var t = trData[i], f = trFolded[i], spans = [];
    var p = f.indexOf(q);
    if (p >= 0) spans.push([p, p + q.length]);
    else words.forEach(function (w) { var k = -1; while ((k = f.indexOf(w, k + 1)) >= 0) spans.push([k, k + w.length]); });
    spans.sort(function (a, b) { return a[0] - b[0]; });
    var out = '', at = 0;
    spans.forEach(function (sp) { if (sp[0] < at) return; out += esc(t.slice(at, sp[0])) + '<mark>' + esc(t.slice(sp[0], sp[1])) + '</mark>'; at = sp[1]; });
    return out + esc(t.slice(at));
  }
  function mark(i, q, words) {
    var shown = data.u[i].split('|'), plain = data.k[i].split('|');
    var want = words.map(lenient).filter(Boolean);
    var html = shown.map(function (w, j) {
      var k = lenient(plain[j] || '');
      var hit = want.some(function (q2) { return k === q2 || (q2.length >= 3 && k.indexOf(q2) >= 0); });
      return hit ? '<mark>' + esc(w) + '</mark>' : esc(w);
    }).join(' ');
    // the ayah number: Arabic-Indic digits, which the Complex's font draws as the ayah-end ornament
    return html + ' <span class="e">' + String(keys[i][1]).replace(/\d/g, function (d) { return '٠١٢٣٤٥٦٧٨٩'[d]; }) + '</span>';
  }
  function more(q, words) {
    var old = body.querySelector('.lt-smore'); if (old) old.remove();
    var end = Math.min(lastHits.length, shown + 60), frag = document.createDocumentFragment();
    for (; shown < end; shown++) {
      var i = lastHits[shown], s = keys[i][0], a = keys[i][1];
      var name = (data.n[NAMES_LANG] || data.n.en)[s - 1];
      var el = document.createElement('a');
      el.className = 'lt-sres';
      el.href = BOOK + '#p=' + pageOf(s, a) + '&a=' + s + ':' + a;
      el.innerHTML = '<div class="lt-sref">' + esc((T.surah ? T.surah + ' ' : '') + name) + ' · ' + arDigits(s) + ':' + arDigits(a) + '</div>' +
        (mode === 'tr' ? '<div class="lt-str" dir="' + (RTL ? 'rtl' : 'ltr') + '">' + markTr(i, q, words) + '</div>' : '<div class="lt-sar" translate="no">' + mark(i, q, words) + '</div>');
      el.addEventListener('click', function () { close(); });
      frag.appendChild(el);
    }
    body.appendChild(frag);
    if (shown < lastHits.length) {
      var b = document.createElement('button');
      b.className = 'lt-smore'; b.type = 'button'; b.textContent = T.more;
      b.onclick = function () { more(q, words); };
      body.appendChild(b);
    }
  }

  /* ---------- «المواضيع»: موسوعة التفسير الموضوعي (Arabic only; data/topics/modoee.json, tools/build_topics.py) ----------
     The names are the encyclopedia's, shown as they are (no summary, rewording or translation), with its attribution. */
  var TOPICS = LANG === 'ar';
  var TP = {
    tab: 'المواضيع', ph: 'ابحث في المواضيع… مثل: الصبر',
    src: 'المصدر: موسوعة التفسير الموضوعي – مركز تفسير للدراسات القرآنية.',
    site: 'موقع الموسوعة', app: 'في مصحف سورة', back: 'رجوع إلى المواضيع',
    inTopic: 'في موضوع:', none: 'لا توجد مواضيع بهذا الاسم.'
  };
  var tp = null, tpP = null, tpOff = null, tpKeys = null;
  function loadTopics() {
    return tpP || (tpP = fetch('/data/topics/modoee.json').then(function (r) { if (!r.ok) throw 0; return r.json(); })
      .then(function (d) {
        tp = d;
        // a topic's section, and the folded names to search in
        tp.sec = []; d.s.forEach(function (s, i) { s[2].forEach(function (t) { tp.sec[t] = i; }); });
        tpKeys = d.t.map(function (t) { return { n: lenient(t[0]), e: t[2].map(function (e) { return lenient(e[0]); }) }; });
      }, function (e) { tpP = null; throw e; }));
  }
  var tpCss = document.createElement('style');
  tpCss.textContent =
    '.lt-tsec{border-bottom:1px solid rgba(200,155,60,.25)}' +
    '.lt-tsec>summary,.lt-tel>summary{list-style:none;cursor:pointer;display:flex;align-items:center;gap:8px;padding:11px 6px;font-weight:700;color:#3a3222}' +
    '.lt-tsec>summary::-webkit-details-marker,.lt-tel>summary::-webkit-details-marker{display:none}' +
    '.lt-tsec>summary::before,.lt-tel>summary::before{content:"";width:7px;height:7px;flex:none;border:solid #C89B3C;border-width:0 2px 2px 0;transform:rotate(135deg);transition:transform .15s;margin-inline-end:2px}' +
    '.lt-tsec[open]>summary::before,.lt-tel[open]>summary::before{transform:rotate(45deg)}' +
    '.lt-tn{margin-inline-start:auto;font-size:.75rem;font-weight:700;color:#8a6a1f;background:rgba(200,155,60,.15);border-radius:10px;padding:1px 8px}' +
    '.lt-tlist{display:flex;flex-wrap:wrap;gap:6px;padding:0 6px 12px}' +
    '.lt-tlist button{font:inherit;font-size:.9rem;padding:6px 12px;border-radius:10px;border:1px solid rgba(200,155,60,.45);background:#fff;color:#3a3222;cursor:pointer}' +
    '.lt-tlist button:hover{background:rgba(200,155,60,.14)}' +
    '.lt-tres{display:block;width:100%;text-align:start;font:inherit;background:none;border:none;border-bottom:1px solid rgba(200,155,60,.2);padding:11px 8px;cursor:pointer;color:inherit;border-radius:8px}' +
    '.lt-tres:hover{background:rgba(200,155,60,.1)}.lt-tres b{display:block;font-size:1rem}.lt-tres span{font-size:.82rem;color:#8a7a55}' +
    '.lt-tback{font:inherit;font-size:.88rem;background:none;border:none;color:#8a6a1f;cursor:pointer;padding:8px 2px;font-weight:700}' +
    '.lt-ttitle{font-size:1.3rem;font-weight:700;color:#2a2418;padding:2px 4px 0}.lt-tcat{font-size:.85rem;color:#8a7a55;padding:0 4px 8px}' +
    '.lt-tel{border-bottom:1px solid rgba(200,155,60,.22)}.lt-tel .lt-tel{margin-inline-start:14px;border-bottom:none}' +
    '.lt-tel .lt-tel>summary{font-weight:600;padding:8px 6px}.lt-tel.lt-tempty>summary{cursor:default;color:#8a7a55;font-weight:600}.lt-tel.lt-tempty>summary::before{visibility:hidden}' +
    '.lt-tay{padding:0 6px 8px}.lt-tay .lt-sres{padding:10px 8px}' +
    '.lt-tsrc{font-size:.8rem;color:#7a6a4a;line-height:1.8;padding:14px 4px 4px;margin-top:10px;border-top:1px solid rgba(200,155,60,.35)}' +
    '.lt-tsrc a{color:#8a6a1f;font-weight:700}';
  document.head.appendChild(tpCss);

  var tpCount = function (e) { var n = e[1].length / 3; e[2].forEach(function (s) { n += s[1].length / 3; }); return n; };
  function tpSource() {
    var d = document.createElement('div'); d.className = 'lt-tsrc';
    d.innerHTML = esc(TP.src) + '<br><a href="' + tp.u[0] + '" target="_blank" rel="noopener">' + esc(TP.site) + '</a> · ' +
      '<a href="' + tp.u[1] + '" target="_blank" rel="noopener">' + esc(TP.app) + '</a>';
    return d;
  }
  function tpButton(i, sub, el) {
    var b = document.createElement('button'); b.type = 'button'; b.className = 'lt-tres';
    // a topic: its name, then its section — an element: its title, then the topic it is in
    b.innerHTML = sub ? '<b>' + esc(sub) + '</b><span>' + esc(TP.inTopic + ' ' + tp.t[i][0]) + '</span>'
                      : '<b>' + esc(tp.t[i][0]) + '</b><span>' + esc(tp.s[tp.sec[i]][0]) + '</span>';
    b.onclick = function () { tpTopic(i, el); };
    return b;
  }
  // nothing typed: the 18 sections, each opening to its topics
  function tpHome() {
    if (!tp) return;
    body.innerHTML = '';
    tp.s.forEach(function (s) {
      var d = document.createElement('details'); d.className = 'lt-tsec';
      d.innerHTML = '<summary>' + esc(s[0]) + '<span class="lt-tn">' + arDigits(s[2].length) + '</span></summary>';
      var list = document.createElement('div'); list.className = 'lt-tlist';
      s[2].forEach(function (i) {
        var b = document.createElement('button'); b.type = 'button'; b.textContent = tp.t[i][0];
        b.onclick = function () { tpTopic(i); };
        list.appendChild(b);
      });
      d.appendChild(list); body.appendChild(d);
    });
    body.appendChild(tpSource());
  }
  function runTopics() {
    if (!tp) return;
    var q = lenient(input.value.trim());
    if (q.length < 2) return tpHome();
    body.innerHTML = '';
    var hits = [], els = [];
    tpKeys.forEach(function (k, i) {
      if (k.n.indexOf(q) >= 0) hits.push(i);
      k.e.forEach(function (e, j) { if (e.indexOf(q) >= 0 && k.n.indexOf(q) < 0) els.push([i, j]); });
    });
    // a topic whose name starts with the query first
    hits.sort(function (a, b) { return (tpKeys[a].n.indexOf(q) === 0 ? 0 : 1) - (tpKeys[b].n.indexOf(q) === 0 ? 0 : 1); });
    if (!hits.length && !els.length) body.innerHTML = '<div class="lt-snote">' + esc(TP.none) + '</div>';
    hits.forEach(function (i) { body.appendChild(tpButton(i)); });
    els.slice(0, 40).forEach(function (x) { body.appendChild(tpButton(x[0], tp.t[x[0]][2][x[1]][0], x[1])); });
    body.appendChild(tpSource());
  }
  // the ayat of one list of references, each a link to its place in the mushaf
  function tpAyat(refs) {
    if (!tpOff) { tpOff = [0]; data.v.forEach(function (n) { tpOff.push(tpOff[tpOff.length - 1] + n); }); }
    var box = document.createElement('div'); box.className = 'lt-tay';
    for (var r = 0; r < refs.length; r += 3) {
      var s = refs[r], a = refs[r + 1], b = refs[r + 2], txt = [];
      for (var x = a; x <= b; x++) {
        txt.push(data.u[tpOff[s - 1] + x - 1].split('|').map(esc).join(' ') + ' <span class="e">' + String(x).replace(/\d/g, function (d) { return '٠١٢٣٤٥٦٧٨٩'[d]; }) + '</span>');
      }
      var el = document.createElement('a'); el.className = 'lt-sres';
      el.href = BOOK + '#p=' + pageOf(s, a) + '&a=' + s + ':' + a;
      el.innerHTML = '<div class="lt-sref">' + esc(T.surah + ' ' + data.n.ar[s - 1]) + ' · <span dir="ltr">' + arDigits(s) + ':' + arDigits(a) + (b > a ? '\u200E–\u200E' + arDigits(b) : '') + '</span></div>' +
        '<div class="lt-sar" translate="no">' + txt.join(' ') + '</div>';
      el.addEventListener('click', function () {
        close();
        var u = new URL(this.href, location.href);
        if (u.pathname === location.pathname) { setTimeout(function () { window.dispatchEvent(new HashChangeEvent('hashchange')); }, 0); }
      });
      box.appendChild(el);
    }
    return box;
  }
  // one element (or sub-element): its title, and its ayat built when it is opened
  function tpElement(title, refs, subs) {
    var d = document.createElement('details'); d.className = 'lt-tel';
    var n = refs.length / 3; subs.forEach(function (s) { n += s[1].length / 3; });
    d.innerHTML = '<summary>' + esc(title) + (n ? '<span class="lt-tn">' + arDigits(n) + '</span>' : '') + '</summary>';
    if (!n) { d.classList.add('lt-tempty'); d.querySelector('summary').addEventListener('click', function (e) { e.preventDefault(); }); return d; }
    var built = false;
    d.addEventListener('toggle', function () {
      if (!d.open || built) return; built = true;
      if (refs.length) d.appendChild(tpAyat(refs));
      subs.forEach(function (s) { if (s[1].length) d.appendChild(tpElement(s[0], s[1], [])); });
    });
    return d;
  }
  function tpTopic(i, openEl) {
    var t = tp.t[i], from = input.value;
    body.innerHTML = '';
    var back = document.createElement('button'); back.type = 'button'; back.className = 'lt-tback'; back.textContent = '→ ' + TP.back;
    back.onclick = function () { input.value = from; runTopics(); };
    body.appendChild(back);
    body.insertAdjacentHTML('beforeend', '<div class="lt-ttitle">' + esc(t[0]) + '</div><div class="lt-tcat">' + esc(tp.s[tp.sec[i]][0]) + '</div>');
    var target = null;
    t[2].forEach(function (e, j) {
      var d = tpElement(e[0], e[1], e[2]);
      if (j === openEl) target = d;
      body.appendChild(d);
    });
    body.appendChild(tpSource());
    body.scrollTop = 0;
    if (target && !target.classList.contains('lt-tempty')) { target.open = true; setTimeout(function () { target.scrollIntoView({ block: 'start' }); }, 0); }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addButton); else addButton();
})();
