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
    ar: { tabAr: 'في النص', tabTr: '', phTr: '', btn: 'بحث', ph: 'ابحث في القرآن الكريم… مثل: الصراط المستقيم', hint: 'اكتب كلمتين أو أكثر من الآية، بتشكيل أو بدونه.', none: 'لا توجد نتائج.', count: 'عدد النتائج:', more: 'عرض المزيد', close: 'إغلاق', loading: 'جارٍ التحميل…', err: 'تعذّر تحميل البحث، أعد المحاولة.', surah: 'سورة', arOnly: '' },
    en: { hintTr: 'Type a word or a phrase from the English meaning.', tabAr: 'Arabic text', tabTr: 'Meaning (English)', phTr: 'Search the meaning… e.g. mercy, Moses, patience', btn: 'Search', ph: 'Search the Quran in Arabic… e.g. الصراط المستقيم', hint: 'Type Arabic words from the verse, with or without diacritics.', none: 'No results.', count: 'Results:', more: 'Show more', close: 'Close', loading: 'Loading…', err: 'Search could not load. Please try again.', surah: '', arOnly: '' },
    ur: { hintTr: 'اردو ترجمے کا کوئی لفظ یا جملہ لکھیں۔', tabAr: 'عربی متن', tabTr: 'ترجمہ (اردو)', phTr: 'ترجمے میں تلاش کریں… مثلاً رحمت، موسیٰ، صبر', btn: 'تلاش', ph: 'قرآن کے عربی متن میں تلاش کریں… مثلاً الصراط المستقیم', hint: 'آیت کے عربی الفاظ لکھیں، اعراب کے ساتھ یا بغیر۔', none: 'کوئی نتیجہ نہیں۔', count: 'نتائج:', more: 'مزید دکھائیں', close: 'بند کریں', loading: 'لوڈ ہو رہا ہے…', err: 'تلاش لوڈ نہیں ہو سکی، دوبارہ کوشش کریں۔', surah: 'سورۃ', arOnly: '' },
    fr: { hintTr: 'Tapez un mot ou une expression du sens en français.', tabAr: 'Texte arabe', tabTr: 'Sens (français)', phTr: 'Rechercher dans le sens… ex. miséricorde, Moïse, patience', btn: 'Rechercher', ph: 'Rechercher dans le Coran en arabe… ex. الصراط المستقيم', hint: 'Tapez des mots arabes du verset, avec ou sans voyelles.', none: 'Aucun résultat.', count: 'Résultats :', more: 'Afficher plus', close: 'Fermer', loading: 'Chargement…', err: 'La recherche n’a pas pu se charger. Réessayez.', surah: '', arOnly: '' },
    es: { hintTr: 'Escriba una palabra o frase del significado en español.', tabAr: 'Texto árabe', tabTr: 'Significado (español)', phTr: 'Buscar en el significado… p. ej. misericordia, Moisés, paciencia', btn: 'Buscar', ph: 'Buscar en el Corán en árabe… p. ej. الصراط المستقيم', hint: 'Escriba palabras árabes de la aleya, con o sin vocales.', none: 'Sin resultados.', count: 'Resultados:', more: 'Mostrar más', close: 'Cerrar', loading: 'Cargando…', err: 'No se pudo cargar la búsqueda. Inténtelo de nuevo.', surah: '', arOnly: '' },
    ru: { hintTr: 'Введите слово или фразу из смыслового перевода.', tabAr: 'Арабский текст', tabTr: 'Смысл (русский)', phTr: 'Поиск по смыслу… напр. милость, Муса, терпение', btn: 'Поиск', ph: 'Поиск по арабскому тексту Корана… напр. الصراط المستقيم', hint: 'Введите арабские слова из аята, с огласовками или без.', none: 'Ничего не найдено.', count: 'Найдено:', more: 'Показать ещё', close: 'Закрыть', loading: 'Загрузка…', err: 'Не удалось загрузить поиск. Попробуйте ещё раз.', surah: '', arOnly: '' }
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
      (TRKEY ? '<div class="lt-stabs"><button type="button" data-m="tr">' + esc(T.tabTr) + '</button><button type="button" data-m="ar">' + esc(T.tabAr) + '</button></div>' : '') +
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
    input.placeholder = tr ? T.phTr : T.ph;
    input.dir = tr && !RTL ? 'ltr' : 'rtl';
    input.lang = tr ? LANG : 'ar';
    ensure().then(function () { if (input.value.trim()) run(); else hint(); }, function () { body.innerHTML = '<div class="lt-snote">' + esc(T.err) + '</div>'; });
  }
  function ensure() {
    var need = !data || (mode === 'tr' && !trData);
    if (need) body.innerHTML = '<div class="lt-snote">' + esc(T.loading) + '</div>';
    return load().then(function () { return mode === 'tr' ? loadTr() : null; });
  }
  function hint() { body.innerHTML = '<div class="lt-snote">' + esc(mode === 'tr' ? T.hintTr : T.hint) + (T.arOnly ? '<br>' + esc(T.arOnly) : '') + '</div>'; }
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
    body.innerHTML = '';
    if (!lastHits.length) { body.innerHTML = '<div class="lt-snote">' + esc(T.none) + '</div>'; return; }
    var head = document.createElement('div');
    head.className = 'lt-snote';
    head.textContent = T.count + ' ' + arDigits(lastHits.length);
    body.appendChild(head);
    more(q, words);
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

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addButton); else addButton();
})();
