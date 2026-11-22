/* «خططي»: plans of memorizing (حفظ) or reviewing (مراجعة) a part of the Quran that the reader sets for himself.
   A plan: a range (by surahs, juz, hizb or pages), walked from its start or from its end (as juz ʿAmma is learned
   from an-Nas up), split into wirds of a quarter page, half a page, a page (وجه) or a hizb — a verse is never cut,
   so a long verse (آية الدين) stays whole — one wird a reading day, or one a week.
   Progress: a wird is done when it is recited in the Mushaf (the recitation check, js/book.js → LtPlans.check), or
   when the reader marks it («حفظت ورد اليوم»). He goes on from where he stopped, and sees whether he is behind.
   Kept per profile with his other Mushaf data (lt_plans, synced to the account by js/sync.js as 'plans').
   The verse engine (ranges, lines a verse takes, labels) is js/plan.js, shared with the study plan (المنهج المقرر).

   LtPlans.ui(el, {lang, open(page, mode), close()})   the settings page
   LtPlans.check(all)                                  after a recitation: {done:{loc:1}, errs:{loc:kind}}
   LtPlans.stripText(lang) -> {h, v, page} | null      today's wird of the first plan that has one */
(function () {
  if (window.LtPlans) return;
  var KEY = 'lt_plans';
  var load = function () { try { return JSON.parse(localStorage.getItem(KEY) || '[]') || []; } catch (e) { return []; } };
  var keep = function (ls) { try { localStorage.setItem(KEY, JSON.stringify(ls)); } catch (e) {} if (window.LtSync) window.LtSync.touch('plans'); };
  var P = null, IDX = null, PG = null, ready = null;
  function boot() {
    if (!ready) ready = new Promise(function (ok, bad) {
      var go = function () {
        Promise.all([window.Plan.load(), fetch('/data/quran-index.json').then(function (r) { return r.json(); }), fetch('/data/quran-pages.json').then(function (r) { return r.json(); })])
          .then(function (x) { P = window.Plan; IDX = x[1]; PG = x[2]; ok(); }, bad);
      };
      if (window.Plan) return go();
      var s = document.createElement('script'); s.src = '/js/plan.js?v=1'; s.onload = go; s.onerror = bad; document.head.appendChild(s);
    });
    return ready;
  }
  var AR = '٠١٢٣٤٥٦٧٨٩';
  function num(n, lang) { var s = String(n); return lang === 'ar' ? s.replace(/[0-9]/g, function (d) { return AR[d]; }) : s; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function ymd(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function parse(s) { var p = String(s).split('-'); return new Date(+p[0], +p[1] - 1, +p[2], 12); }
  function uid() { return crypto.randomUUID ? crypto.randomUUID() : 'p' + Date.now() + Math.random().toString(16).slice(2); }
  function arCount(n, one, two, few, many) { return n === 1 ? one : n === 2 ? two : (n % 100 >= 3 && n % 100 <= 10) ? num(n, 'ar') + ' ' + few : num(n, 'ar') + ' ' + many; }

  // ---- the range, as verses ----
  function hizbStart(k) { var r = IDX.rub[(k - 1) * 4]; return r[0] + ':' + r[1]; }       // k = 1..60
  function before(ref) { return P.refOf(P.gOf(ref) - 1); }
  function rangeRefs(p) {
    var a = +p.a, b = +p.b; if (b < a) { var t = a; a = b; b = t; }
    if (p.by === 'surah') return [a + ':1', P.lastRef(b)];
    if (p.by === 'page') { var A = PG.pages[a - 1], B = PG.pages[b - 1]; return [A[0] + ':' + A[1], B[2] + ':' + B[3]]; }
    var f = p.by === 'juz' ? 2 : 1, h1 = (a - 1) * f + 1, h2 = b * f + 1;
    return [hizbStart(h1), h2 > 60 ? '114:6' : before(hizbStart(h2))];
  }
  // ---- the wirds: [{a_from, a_to}] in plan order ----
  var LINES = { q: 3.75, h: 7.5, p: 15 };
  function wirds(p) {
    var r = rangeRefs(p), vs = P.walk(r[0], r[1], p.ord);
    if (p.unit !== 'hizb') return P.chunk(vs, 'line', LINES[p.unit] * Math.max(1, p.n || 1));
    // by hizb: the verses of n hizbs together (a hizb is cut where it starts)
    var hs = []; for (var k = 1; k <= 60; k++) hs.push(P.gOf(hizbStart(k)));
    var hz = function (g) { var lo = 0; for (var i = 0; i < 60; i++) if (hs[i] <= g) lo = i; return lo; };
    var out = [], cur = [], seen = [], n = Math.max(1, p.n || 1);
    vs.forEach(function (g) {
      var h = hz(g);
      if (seen.indexOf(h) < 0) { if (seen.length === n) { out.push(cur); cur = []; seen = []; } seen.push(h); }
      cur.push(g);
    });
    if (cur.length) out.push(cur);
    return out.map(function (c) { return { a_from: P.refOf(c[0]), a_to: P.refOf(c[c.length - 1]) }; });
  }
  // ---- the dates of the wirds: a reading day each, or a week each ----
  function slots(p, n) {
    var out = [], d = parse(p.start);
    if (p.freq === 'week') { for (var w = 0; w < n; w++) { out.push(ymd(d)); d.setDate(d.getDate() + 7); } return out; }
    for (var g = 0; out.length < n && g < 5000; g++) { if ((p.rdays >> d.getDay()) & 1) out.push(ymd(d)); d.setDate(d.getDate() + 1); }
    return out;
  }
  function stat(p) {
    var ws = wirds(p), sl = slots(p, ws.length), t = ymd(new Date()), done = p.done || {};
    var next = -1; for (var i = 0; i < ws.length; i++) if (!done[i]) { next = i; break; }
    var dn = Object.keys(done).filter(function (k) { return +k < ws.length; }).length;
    // wirds whose time has come (a week's wird: from its first day)
    var due = sl.filter(function (d) { return d <= t; }).length;
    var behind = Math.max(0, (due - (sl.indexOf(t) >= 0 || p.freq === 'week' ? 1 : 0)) - dn);
    var vs = next >= 0 ? P.walk(ws[next].a_from, ws[next].a_to, p.ord) : [];
    return { ws: ws, sl: sl, next: next, done: dn, total: ws.length, behind: behind, fin: ws.length > 0 && next < 0,
             vs: vs, page: vs.length ? P.pageOf(Math.min.apply(null, vs)) : 0, end: sl[sl.length - 1], dueNow: due > dn,
             pct: ws.length ? Math.round(dn * 100 / ws.length) : 0 };
  }
  function save(p) {
    var ls = load(), i = -1; ls.forEach(function (x, j) { if (x.id === p.id) i = j; });
    p.t = Date.now(); if (!p.c) p.c = p.t;
    if (i >= 0) ls[i] = p; else ls.push(p);
    keep(ls); return p;
  }
  function remove(id) { keep(load().filter(function (x) { return x.id !== id; })); }

  var T = {
    ar: { title: 'خططي', add: 'خطة جديدة', none: 'لا خطط بعد. ضع لنفسك خطة لحفظ سورة أو جزء أو لمراجعته، تُقسَّم أورادًا على الأيام أو الأسابيع، ويُتابَع تقدمك فيها.',
      type: ['حفظ', 'مراجعة'], name: 'اسم الخطة', range: 'النطاق', by: ['بالسور', 'بالأجزاء', 'بالأحزاب', 'بالصفحات'], from: 'من', to: 'إلى',
      surah: 'سورة', juz: 'الجزء', hizb: 'الحزب', page: 'صفحة', ord: 'يبدأ من', ordO: ['أول النطاق', 'آخره (من الناس صعودًا)'],
      wird: 'الورد', units: ['ربع وجه', 'نصف وجه', 'وجه', 'حزب'], every: 'كل', freq: ['يوم', 'أسبوع'], rdays: 'أيام الورد', start: 'تبدأ',
      wd: ['أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'], count: 'عدد الأوراد', ends: 'تنتهي', create: 'إنشاء', saveB: 'حفظ', cancel: 'إلغاء', del: 'حذف', edit: 'تعديل',
      delAsk: 'حذف هذه الخطة؟', nextW: 'الورد التالي', today: 'ورد اليوم', week: 'ورد الأسبوع', openB: 'افتح', doneB: 'تم ✓', undo: 'تراجع', behind: 'متأخر', onTime: 'على الموعد', ahead: 'أتممت وردك',
      fin: 'تمّت الخطة، بارك الله فيك.', p1: 'ص', note: 'يُحتسب الورد إذا سمّعته في المصحف، أو إذا ضغطت «تم».', auto: 'أحسنت! احتُسب ورد خطتك', wirdsN: function (n, l) { return l === 'ar' ? arCount(n, 'ورد واحد', 'وردان', 'أوراد', 'وردًا') : n + ' wirds'; } },
    en: { title: 'My plans', add: 'New plan', none: 'No plans yet. Set yourself a plan to memorize or review a surah or a juz, divided into daily or weekly wirds, and follow your progress.',
      type: ['Memorize', 'Review'], name: 'Plan name', range: 'Range', by: ['Surahs', 'Juz', 'Hizb', 'Pages'], from: 'From', to: 'To',
      surah: 'Surah', juz: 'Juz', hizb: 'Hizb', page: 'Page', ord: 'Starts from', ordO: ['The start', 'The end (from an-Nas up)'],
      wird: 'Wird', units: ['¼ page', '½ page', 'Page', 'Hizb'], every: 'Every', freq: ['day', 'week'], rdays: 'Wird days', start: 'Starts',
      wd: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], count: 'Wirds', ends: 'Ends', create: 'Create', saveB: 'Save', cancel: 'Cancel', del: 'Delete', edit: 'Edit',
      delAsk: 'Delete this plan?', nextW: 'Next wird', today: 'Today', week: 'This week', openB: 'Open', doneB: 'Done ✓', undo: 'Undo', behind: 'Behind', onTime: 'On time', ahead: 'Wird done',
      fin: 'Plan completed — well done.', p1: 'p.', note: 'A wird counts when you recite it in the Mushaf, or when you tap «Done».', auto: 'Well done! Your plan’s wird is counted', wirdsN: function (n) { return n + (n === 1 ? ' wird' : ' wirds'); } }
  };
  function L(lang) { return T[lang] || T.en; }
  var COLORS = ['#2f6b45', '#c0392b', '#7a5c3e', '#e08a00', '#2a7fd4'];
  function hijri(s, lang) { try { return parse(s).toLocaleDateString(lang === 'ar' ? 'ar-SA-u-ca-islamic-umalqura' : 'en-u-ca-islamic-umalqura', { day: 'numeric', month: 'long' }); } catch (e) { return s; } }
  function wirdLabel(st, lang) { return st.vs.length ? P.label(st.vs, lang === 'ur' ? 'ar' : lang, function (x) { return num(x, lang); }) : ''; }

  function stripText(lang) {
    if (!P) return null;
    var l = L(lang), ls = load();
    for (var i = 0; i < ls.length; i++) {
      var st = stat(ls[i]);
      if (!st.fin && st.dueNow) return { h: ls[i].freq === 'week' ? l.week : l.today, v: wirdLabel(st, lang) + ' · ' + ls[i].name, page: st.page, mode: ls[i].type === 'review' ? 'tasmee' : 'hifz' };
    }
    return null;
  }

  // ---- after a recitation: the next wird of each plan, if it was recited (95% of its words, few mistakes) ----
  function check(all) {
    var ls = load(); if (!ls.length || !all) return;
    boot().then(function () {
      ls.forEach(function (p) {
        var st = stat(p); if (st.fin) return;
        var want = {}, pgs = [];
        st.vs.forEach(function (g) { var sa = P.saOf(g); want[sa[0] + ':' + sa[1]] = 1; var pg = P.pageOf(g); if (pgs.indexOf(pg) < 0) pgs.push(pg); });
        Promise.all(pgs.map(function (pg) { return fetch('/data/mushaf/p' + pg + '.json').then(function (r) { return r.json(); }); })).then(function (ds) {
          var total = 0, done = 0, errs = 0;
          ds.forEach(function (d) {
            (d.l || []).forEach(function (L2) {
              if (L2[0] !== 'a') return;
              L2[2].forEach(function (y) {
                var x = y[1].split(':'); if (!want[x[0] + ':' + x[1]] || /^[٠-٩\d]+$/.test(y[2] || '')) return;
                total++; if (all.done[y[1]]) done++; if (all.errs[y[1]]) errs++;
              });
            });
          });
          if (!total || done < total * 0.95 || errs > 3) return;
          var cur = load().filter(function (x) { return x.id === p.id; })[0]; if (!cur) return;
          cur.done = cur.done || {}; cur.done[st.next] = ymd(new Date()); save(cur);
          var tt = document.createElement('div'); tt.className = 'bk-toast'; tt.textContent = L(document.documentElement.lang === 'ar' ? 'ar' : 'en').auto + ': ' + cur.name;
          document.body.appendChild(tt); setTimeout(function () { tt.remove(); }, 3500);
          try { window.dispatchEvent(new CustomEvent('lt-sync')); } catch (e) {}
        }).catch(function () {});
      });
    }).catch(function () {});
  }

  // ---- the settings page ----
  function ui(el, o) {
    var lang = o.lang, l = L(lang);
    el.innerHTML = '<p class="kh-note">…</p>';
    boot().then(draw, function () { el.innerHTML = ''; });
    function draw() {
      var ls = load(), h = ls.length ? '' : '<p class="kh-none">' + esc(l.none) + '</p>';
      ls.forEach(function (p) {
        var st = stat(p), t = ymd(new Date()), lastI = st.next < 0 ? st.total - 1 : st.next - 1;
        var state = st.fin ? '<span class="kh-ok">' + esc(l.fin) + '</span>' : st.behind > 0 ? '<span class="kh-late">' + esc(l.behind) + ' ' + esc(l.wirdsN(st.behind, lang)) + '</span>'
          : !st.dueNow ? '<span class="kh-ok">' + esc(l.ahead) + '</span>' : '<span>' + esc(l.onTime) + '</span>';
        h += '<div class="kh-card pl-card' + (st.fin ? ' fin' : '') + '" style="--kc:' + esc(p.color || COLORS[0]) + '"><div class="kh-top"><i class="pl-type">' + esc(l.type[p.type === 'review' ? 1 : 0]) + '</i><b>' + esc(p.name) + '</b>' +
          '<button type="button" class="kh-edit" data-e="' + p.id + '">' + esc(l.edit) + '</button></div>' +
          '<div class="kh-bar"><i style="width:' + st.pct + '%"></i></div>' +
          '<div class="kh-meta"><span>' + num(st.done, lang) + ' / ' + esc(l.wirdsN(st.total, lang)) + '</span>' + state + '</div>' +
          (st.fin ? '' : '<div class="pl-today"><b>' + esc(!st.dueNow ? l.nextW : p.freq === 'week' ? l.week : l.today) + ':</b> ' + esc(wirdLabel(st, lang)) + ' <small>· ' + esc(l.p1) + ' ' + num(st.page, lang) + '</small></div>' +
            '<div class="pl-btns"><button type="button" class="kh-read" data-o="' + p.id + '">' + esc(l.openB) + '</button><button type="button" class="pl-done" data-d="' + p.id + '">' + esc(l.doneB) + '</button>' +
            (lastI >= 0 && (p.done || {})[lastI] === t ? '<button type="button" class="pl-undo" data-u="' + p.id + '">' + esc(l.undo) + '</button>' : '') + '</div>') +
          '<div class="kh-end">' + esc(l.wird) + ': ' + esc(unitText(p, lang)) + ' · ' + esc(l.ends) + ' ' + esc(hijri(st.end, lang)) + '</div></div>';
      });
      h += '<button type="button" class="kh-add">+ ' + esc(l.add) + '</button><p class="kh-note">' + esc(l.note) + '</p>';
      el.innerHTML = h;
      el.querySelector('.kh-add').onclick = function () { form(null); };
      el.querySelectorAll('[data-e]').forEach(function (b) { b.onclick = function () { form(load().filter(function (x) { return x.id === b.dataset.e; })[0]); }; });
      el.querySelectorAll('[data-o]').forEach(function (b) {
        b.onclick = function () { var p = load().filter(function (x) { return x.id === b.dataset.o; })[0], st = stat(p); o.open(st.page, p.type === 'review' ? 'tasmee' : 'hifz'); };
      });
      el.querySelectorAll('[data-d]').forEach(function (b) {
        b.onclick = function () { var p = load().filter(function (x) { return x.id === b.dataset.d; })[0], st = stat(p); if (st.next < 0) return; p.done = p.done || {}; p.done[st.next] = ymd(new Date()); save(p); draw(); };
      });
      el.querySelectorAll('[data-u]').forEach(function (b) {
        b.onclick = function () { var p = load().filter(function (x) { return x.id === b.dataset.u; })[0], st = stat(p), i = st.next < 0 ? st.total - 1 : st.next - 1; if (i >= 0) { delete p.done[i]; save(p); draw(); } };
      });
    }
    function unitText(p, lg) {
      var n = Math.max(1, p.n || 1), u = ['q', 'h', 'p', 'hizb'].indexOf(p.unit);
      var w = lg === 'ar' ? [arCount(n, 'ربع وجه', 'ربعا وجه', 'أرباع وجه', 'ربع وجه'), arCount(n, 'نصف وجه', 'نصفا وجه', 'أنصاف وجه', 'نصف وجه'), arCount(n, 'وجه واحد', 'وجهان', 'أوجه', 'وجهًا'), arCount(n, 'حزب واحد', 'حزبان', 'أحزاب', 'حزبًا')][u]
        : n + ' × ' + l.units[u];
      return w + ' / ' + l.freq[p.freq === 'week' ? 1 : 0];
    }
    function form(p0) {
      var no = load().length + 1;
      var p = p0 ? JSON.parse(JSON.stringify(p0)) : { id: uid(), type: 'hifz', name: '', color: COLORS[(no - 1) % COLORS.length], by: 'surah', a: 2, b: 2, ord: 'mushaf',
        unit: 'h', n: 1, freq: 'day', rdays: 127, start: ymd(new Date()), done: {} };
      var named = !!(p0 && p0.name);
      var BY = ['surah', 'juz', 'hizb', 'page'], UN = ['q', 'h', 'p', 'hizb'], max = { surah: 114, juz: 30, hizb: 60, page: 604 };
      var names = P.names(lang === 'ur' ? 'ar' : lang);
      var opt = function () {
        var o2 = '';
        for (var i = 1; i <= max[p.by]; i++) o2 += '<option value="' + i + '">' + (p.by === 'surah' ? num(i, lang) + ' ' + esc(names[i - 1]) : esc(l[p.by]) + ' ' + num(i, lang)) + '</option>';
        return o2;
      };
      var seg = function (cls, labels, vals, cur) { return '<div class="kh-seg ' + cls + '">' + labels.map(function (t, i) { return '<button type="button" data-v="' + vals[i] + '"' + (vals[i] === cur ? ' class="on"' : '') + '>' + esc(t) + '</button>'; }).join('') + '</div>'; };
      el.innerHTML = '<div class="kh-form">' +
        seg('pl-type', l.type, ['hifz', 'review'], p.type) +
        '<input class="kh-name" maxlength="40" placeholder="' + esc(l.name) + '" value="' + esc(p.name) + '" aria-label="' + esc(l.name) + '">' +
        '<div class="kh-l">' + esc(l.range) + '</div>' + seg('pl-by', l.by, BY, p.by) +
        '<div class="kh-ft"><label>' + esc(l.from) + '<select class="pl-a"></select></label><label>' + esc(l.to) + '<select class="pl-b"></select></label></div>' +
        '<div class="kh-l">' + esc(l.ord) + '</div>' + seg('pl-ord', l.ordO, ['mushaf', 'reverse'], p.ord) +
        '<div class="kh-l">' + esc(l.wird) + '</div>' + seg('pl-unit', l.units, UN, p.unit) +
        '<div class="kh-row"><span>' + esc(l.wird) + '</span><span class="kh-step"><button type="button" data-n="1">+</button><b class="pl-n"></b><button type="button" data-n="-1">−</button></span></div>' +
        '<div class="kh-row"><span>' + esc(l.every) + '</span>' + seg('pl-freq', l.freq, ['day', 'week'], p.freq) + '</div>' +
        '<div class="kh-row kh-rdays pl-rd"><span>' + esc(l.rdays) + '</span><span class="kh-wd">' + l.wd.map(function (w, i) { return '<button type="button" data-w="' + i + '">' + esc(w) + '</button>'; }).join('') + '</span></div>' +
        '<div class="kh-row"><span>' + esc(l.start) + '</span><input class="kh-start" type="date"></div>' +
        '<p class="pl-sum"></p>' +
        '<div class="kh-btns"><button type="button" class="kh-save">' + esc(p0 ? l.saveB : l.create) + '</button><button type="button" class="kh-cancel">' + esc(l.cancel) + '</button>' +
        (p0 ? '<button type="button" class="kh-del">' + esc(l.del) + '</button>' : '') + '</div></div>';
      var $ = function (s) { return el.querySelector(s); }, sa = $('.pl-a'), sb = $('.pl-b');
      var autoName = function () {
        var a = Math.min(p.a, p.b), b = Math.max(p.a, p.b), r = p.by === 'surah' ? (a === b ? names[a - 1] : names[a - 1] + ' – ' + names[b - 1])
          : l[p.by] + ' ' + num(a, lang) + (a === b ? '' : '–' + num(b, lang));
        return l.type[p.type === 'review' ? 1 : 0] + ' ' + r;
      };
      var show = function () {
        $('.pl-n').textContent = unitText(p, lang).split(' / ')[0];
        $('.pl-rd').hidden = p.freq === 'week';
        el.querySelectorAll('.kh-wd button').forEach(function (b) { b.classList.toggle('on', !!((p.rdays >> +b.dataset.w) & 1)); });
        if (!named) $('.kh-name').value = autoName();
        var ws = wirds(p), sl = slots(p, ws.length);
        $('.pl-sum').textContent = l.count + ': ' + l.wirdsN(ws.length, lang) + (sl.length ? ' · ' + l.ends + ' ' + hijri(sl[sl.length - 1], lang) : '');
      };
      var fill = function () { sa.innerHTML = opt(); sb.innerHTML = opt(); sa.value = String(p.a); sb.value = String(p.b); };
      var segOn = function (cls, key, after) {
        el.querySelectorAll('.' + cls + ' button').forEach(function (b) {
          b.onclick = function () { p[key] = b.dataset.v; el.querySelectorAll('.' + cls + ' button').forEach(function (x) { x.classList.toggle('on', x === b); }); if (after) after(); show(); };
        });
      };
      segOn('pl-type', 'type'); segOn('pl-ord', 'ord'); segOn('pl-freq', 'freq'); segOn('pl-unit', 'unit', function () { p.n = 1; });
      segOn('pl-by', 'by', function () { p.a = 1; p.b = 1; fill(); });
      fill(); $('.kh-start').value = p.start; show();
      sa.onchange = function () { p.a = +sa.value; if (p.b < p.a) { p.b = p.a; sb.value = sa.value; } show(); };
      sb.onchange = function () { p.b = +sb.value; show(); };
      $('.kh-name').oninput = function () { named = !!$('.kh-name').value.trim(); };
      el.querySelectorAll('[data-n]').forEach(function (b) { b.onclick = function () { p.n = Math.max(1, Math.min(40, (p.n || 1) + +b.dataset.n)); show(); }; });
      el.querySelectorAll('[data-w]').forEach(function (b) { b.onclick = function () { var nb = p.rdays ^ (1 << +b.dataset.w); if (nb) { p.rdays = nb; show(); } }; });
      $('.kh-start').onchange = function () { p.start = $('.kh-start').value || ymd(new Date()); show(); };
      $('.kh-cancel').onclick = draw;
      if ($('.kh-del')) $('.kh-del').onclick = function () { if (confirm(l.delAsk)) { remove(p.id); draw(); } };
      $('.kh-save').onclick = function () {
        p.name = $('.kh-name').value.trim() || autoName();
        // a changed range or division: the wirds are made again, and what was done is kept as far as it still fits
        if (p0 && ['by', 'a', 'b', 'ord', 'unit', 'n'].some(function (k) { return p0[k] !== p[k]; })) p.done = {};
        save(p); draw();
      };
    }
  }

  window.LtPlans = { ui: ui, check: check, stripText: stripText, boot: boot, list: load, stat: function (p) { return stat(p); } };
})();
