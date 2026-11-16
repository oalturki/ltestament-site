/* Site search — «العهد الأخير»
   A 🔍 button in the page header opens a search panel.
   Now: search in the Quran (Arabic text; spelling-insensitive: no diacritics, any hamza/alef/ya/ta-marbuta form).
   Each result opens the Mushaf book at that ayah, highlighted (/book/#p=PAGE&a=S:A — handled by js/book.js).
   Data: /data/search/quran-ar.json (tools/build_search.py, from QUL "Imlaei simple"), loaded on first use. */
(function () {
  'use strict';
  if (window.__ltSearch) return;
  window.__ltSearch = true;

  var LANG = (document.documentElement.lang || 'ar').slice(0, 2);
  var T = {
    ar: { btn: 'بحث', ph: 'ابحث في القرآن الكريم… مثل: الصراط المستقيم', hint: 'اكتب كلمتين أو أكثر من الآية، بتشكيل أو بدونه.', none: 'لا توجد نتائج.', count: 'عدد النتائج:', more: 'عرض المزيد', close: 'إغلاق', loading: 'جارٍ التحميل…', err: 'تعذّر تحميل البحث، أعد المحاولة.', surah: 'سورة', arOnly: '' },
    en: { btn: 'Search', ph: 'Search the Quran in Arabic… e.g. الصراط المستقيم', hint: 'Type Arabic words from the verse, with or without diacritics.', none: 'No results.', count: 'Results:', more: 'Show more', close: 'Close', loading: 'Loading…', err: 'Search could not load. Please try again.', surah: '', arOnly: 'Search in the English meaning is coming soon; for now the search covers the Arabic text.' },
    ur: { btn: 'تلاش', ph: 'قرآن کے عربی متن میں تلاش کریں… مثلاً الصراط المستقیم', hint: 'آیت کے عربی الفاظ لکھیں، اعراب کے ساتھ یا بغیر۔', none: 'کوئی نتیجہ نہیں۔', count: 'نتائج:', more: 'مزید دکھائیں', close: 'بند کریں', loading: 'لوڈ ہو رہا ہے…', err: 'تلاش لوڈ نہیں ہو سکی، دوبارہ کوشش کریں۔', surah: 'سورۃ', arOnly: 'اردو ترجمے میں تلاش جلد آ رہی ہے؛ ابھی تلاش عربی متن میں ہے۔' },
    fr: { btn: 'Rechercher', ph: 'Rechercher dans le Coran en arabe… ex. الصراط المستقيم', hint: 'Tapez des mots arabes du verset, avec ou sans voyelles.', none: 'Aucun résultat.', count: 'Résultats :', more: 'Afficher plus', close: 'Fermer', loading: 'Chargement…', err: 'La recherche n’a pas pu se charger. Réessayez.', surah: '', arOnly: 'La recherche dans le sens en français arrive bientôt ; pour l’instant elle porte sur le texte arabe.' },
    es: { btn: 'Buscar', ph: 'Buscar en el Corán en árabe… p. ej. الصراط المستقيم', hint: 'Escriba palabras árabes de la aleya, con o sin vocales.', none: 'Sin resultados.', count: 'Resultados:', more: 'Mostrar más', close: 'Cerrar', loading: 'Cargando…', err: 'No se pudo cargar la búsqueda. Inténtelo de nuevo.', surah: '', arOnly: 'La búsqueda en el significado en español llegará pronto; por ahora busca en el texto árabe.' },
    ru: { btn: 'Поиск', ph: 'Поиск по арабскому тексту Корана… напр. الصراط المستقيم', hint: 'Введите арабские слова из аята, с огласовками или без.', none: 'Ничего не найдено.', count: 'Найдено:', more: 'Показать ещё', close: 'Закрыть', loading: 'Загрузка…', err: 'Не удалось загрузить поиск. Попробуйте ещё раз.', surah: '', arOnly: 'Поиск по смыслу на русском появится скоро; пока поиск идёт по арабскому тексту.' }
  }[LANG] || null;
  if (!T) return;
  var RTL = LANG === 'ar' || LANG === 'ur';
  var BOOK = LANG === 'ar' ? '/book/' : '/' + LANG + '/book/';
  var NAMES_LANG = (LANG === 'ar' || LANG === 'ur') ? 'ar' : (LANG === 'ru' ? 'ru' : 'en');
  var arDigits = function (n) { return RTL ? String(n).replace(/\d/g, function (d) { return '٠١٢٣٤٥٦٧٨٩'[d]; }) : String(n); };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };

  // one-to-one letter folding (keeps positions, so matches can be marked in the shown text)
  var FOLD = { 'أ': 'ا', 'إ': 'ا', 'آ': 'ا', 'ٱ': 'ا', 'ى': 'ي', 'ئ': 'ي', 'ؤ': 'و', 'ة': 'ه' };
  var fold = function (s) { return s.replace(/[أإآٱىئؤة]/g, function (c) { return FOLD[c]; }); };
  var cleanQuery = function (s) {
    return fold(s.replace(/[ً-ٰٟۖ-ۭـ]/g, '')).replace(/[^ء-ي\s]/g, ' ').replace(/\s+/g, ' ').trim();
  };

  var data = null, folded = null, keys = null, pageMap = null;
  function load() {
    if (data) return Promise.resolve();
    return Promise.all([
      fetch('/data/search/quran-ar.json').then(function (r) { if (!r.ok) throw 0; return r.json(); }),
      fetch('/data/quran-pages.json').then(function (r) { if (!r.ok) throw 0; return r.json(); })
    ]).then(function (r) {
      data = r[0]; pageMap = r[1];
      folded = data.t.map(fold);
      keys = [];
      data.v.forEach(function (n, s) { for (var a = 1; a <= n; a++) keys.push([s + 1, a]); });
    });
  }
  function pageOf(s, a) {
    var k = s * 1000 + a, P = pageMap.pages;
    for (var i = 0; i < P.length; i++) if (P[i][2] * 1000 + P[i][3] >= k) return i + 1;
    return 1;
  }

  /* ---------- UI ---------- */
  var css = document.createElement('style');
  css.textContent =
    '.lt-sbtn{display:inline-flex;align-items:center;gap:6px;background:none;border:1px solid rgba(200,155,60,.45);color:inherit;border-radius:18px;padding:5px 12px;font:inherit;font-size:.85rem;cursor:pointer;opacity:.9}' +
    '.lt-sbtn:hover{opacity:1;border-color:#C89B3C}.lt-sbtn svg{width:15px;height:15px}' +
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
    '.lt-sar{font-family:"Amiri","KFGQPC Hafs",serif;font-size:1.25rem;line-height:1.9;direction:rtl;text-align:right}' +
    '.lt-sar mark{background:rgba(200,155,60,.35);color:inherit;border-radius:3px;padding:0 1px}' +
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
      '<button class="lt-sx" type="button" aria-label="' + esc(T.close) + '">×</button></div><div class="lt-sbody"></div></div>';
    document.body.appendChild(ov);
    input = ov.querySelector('.lt-sin'); body = ov.querySelector('.lt-sbody');
    ov.querySelector('.lt-sx').onclick = close;
    ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && ov.classList.contains('on')) close(); });
    input.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(run, 180); });
    hint();
  }
  function hint() { body.innerHTML = '<div class="lt-snote">' + esc(T.hint) + (T.arOnly ? '<br>' + esc(T.arOnly) : '') + '</div>'; }
  function open() {
    if (!ov) build();
    ov.classList.add('on');
    document.documentElement.style.overflow = 'hidden';
    setTimeout(function () { input.focus(); }, 30);
    if (!data) {
      body.innerHTML = '<div class="lt-snote">' + esc(T.loading) + '</div>';
      load().then(function () { if (input.value.trim()) run(); else hint(); },
                  function () { body.innerHTML = '<div class="lt-snote">' + esc(T.err) + '</div>'; });
    }
  }
  function close() { ov.classList.remove('on'); document.documentElement.style.overflow = ''; }

  function run() {
    if (!data) return;
    var q = cleanQuery(input.value);
    if (q.replace(/\s/g, '').length < 2) { hint(); return; }
    var words = q.split(' ');
    var phrase = [], all = [];
    for (var i = 0; i < folded.length; i++) {
      var t = folded[i];
      if (t.indexOf(q) >= 0) phrase.push(i);
      else if (words.length > 1 && words.every(function (w) { return t.indexOf(w) >= 0; })) all.push(i);
    }
    lastHits = phrase.concat(all);
    shown = 0;
    body.innerHTML = '';
    if (!lastHits.length) { body.innerHTML = '<div class="lt-snote">' + esc(T.none) + '</div>'; return; }
    var head = document.createElement('div');
    head.className = 'lt-snote';
    head.textContent = T.count + ' ' + arDigits(lastHits.length);
    body.appendChild(head);
    more(q, words);
  }
  function mark(i, q, words) {
    var t = data.t[i], f = folded[i], spans = [];
    var p = f.indexOf(q);
    if (p >= 0) spans.push([p, p + q.length]);
    else words.forEach(function (w) { var k = f.indexOf(w); if (k >= 0) spans.push([k, k + w.length]); });
    spans.sort(function (a, b) { return a[0] - b[0]; });
    var out = '', at = 0;
    spans.forEach(function (sp) { if (sp[0] < at) return; out += esc(t.slice(at, sp[0])) + '<mark>' + esc(t.slice(sp[0], sp[1])) + '</mark>'; at = sp[1]; });
    return out + esc(t.slice(at));
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
        '<div class="lt-sar">' + mark(i, q, words) + '</div>';
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

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addButton); else addButton();
})();
