/* «خططي»: plans of memorizing (حفظ) or reviewing (مراجعة) a part of the Quran that the reader sets for himself.
   A plan: a range (by surahs, juz, hizb or pages), walked from its start or from its end (as juz ʿAmma is learned
   from an-Nas up), split into wirds of a quarter page, half a page, a page (وجه) or a hizb — a verse is never cut,
   so a long verse (آية الدين) stays whole — one wird a reading day, or one a week.
   Progress: a wird is done when it is recited in the Mushaf (the recitation check, js/book.js → LtPlans.check), or
   when the reader marks it («حفظت ورد اليوم»). He goes on from where he stopped, and sees whether he is behind.
   One model for every plan — his own, or one set for him by his parent or teacher (setBy: then he follows it and
   does not change it). Optional: days off (p.off: {date: 'off'}), an end date instead of an amount (p.fit 'end'),
   a school's own schedule read from its document (p.list: [{d, a_from, a_to}], with p.file the document itself),
   a range of verses (by 'ayah': p.from, p.to). A parent makes and follows his children's plans from his profile.
   Kept per profile with his other Mushaf data (lt_plans, synced to the account by js/sync.js as 'plans').
   The verse engine (ranges, lines a verse takes, labels) is js/plan.js, shared with the study plan (المنهج المقرر).

   LtPlans.ui(el, {lang, open(page, mode), close()})   the settings page
   LtPlans.check(all)                                  after a recitation: {done:{loc:1}, errs:{loc:kind}}
   LtPlans.stripText(lang) -> {h, v, page} | null      today's wird of the first plan that has one */
(function () {
  if (window.LtPlans) return;
  var KEY = 'lt_plans';
  // a deleted plan stays as a mark ({id, deleted, t}) so the deletion reaches his other devices
  var loadAll = function () { try { return JSON.parse(localStorage.getItem(KEY) || '[]') || []; } catch (e) { return []; } };
  var load = function () { return loadAll().filter(function (x) { return !x.deleted; }); };
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
    if (p.by === 'ayah') return [p.from, p.to];
    if (p.by === 'surah') return [a + ':1', P.lastRef(b)];
    if (p.by === 'page') { var A = PG.pages[a - 1], B = PG.pages[b - 1]; return [A[0] + ':' + A[1], B[2] + ':' + B[3]]; }
    var f = p.by === 'juz' ? 2 : 1, h1 = (a - 1) * f + 1, h2 = b * f + 1;
    return [hizbStart(h1), h2 > 60 ? '114:6' : before(hizbStart(h2))];
  }
  // ---- the wirds: [{a_from, a_to}] in plan order ----
  var LINES = { q: 3.75, h: 7.5, p: 15 };
  function wirds(p) {
    if (p.list && p.list.length) return p.list.map(function (x) { return { a_from: x.a_from, a_to: x.a_to }; });
    if (p.fit === 'end' && p.end) { var fr = fitL(p); p.unit = fr[0]; p.n = fr[1]; }
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
  // ---- the dates of the wirds: a reading day each (not the days off), or a week each ----
  function slots(p, n) {
    if (p.list && p.list.length) return p.list.map(function (x) { return x.d; });
    var out = [], d = parse(p.start), off = p.off || {};
    if (p.freq === 'week') {
      for (var w = 0; out.length < n && w < 600; w++) { if (!off[ymd(d)]) out.push(ymd(d)); d.setDate(d.getDate() + 7); }
      return out;
    }
    for (var g = 0; out.length < n && g < 5000; g++) { var k = ymd(d); if (((p.rdays >> d.getDay()) & 1) && !off[k]) out.push(k); d.setDate(d.getDate() + 1); }
    return out;
  }
  // the least amount that ends the plan by its end date
  // the amounts of a wird, from least to most: a quarter page, half a page, a page, 2…9 pages, then 1…10 hizbs
  var LADDER = [['q', 1], ['h', 1]];
  for (var lp = 1; lp <= 9; lp++) LADDER.push(['p', lp]);
  for (var lh = 1; lh <= 10; lh++) LADDER.push(['hizb', lh]);
  function rung(p) {
    var lines = (p.unit === 'hizb' ? 150 : LINES[p.unit] || 7.5) * Math.max(1, p.n || 1), best = 0;
    LADDER.forEach(function (r, i) { if ((r[0] === 'hizb' ? 150 : LINES[r[0]]) * r[1] <= lines + 0.01) best = i; });
    return best;
  }
  // the least amount that ends the plan by its end date
  function fitL(p) {
    var q = Object.assign({}, p, { fit: null });
    for (var i = 0; i < LADDER.length; i++) { q.unit = LADDER[i][0]; q.n = LADDER[i][1]; var c = wirds(q).length, sl = slots(q, c); if (!sl.length || sl[sl.length - 1] <= p.end) return LADDER[i]; }
    return LADDER[LADDER.length - 1];
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
    var ls = loadAll(), i = -1; ls.forEach(function (x, j) { if (x.id === p.id) i = j; });
    p.t = Date.now(); if (!p.c) p.c = p.t;
    if (i >= 0) ls[i] = p; else ls.push(p);
    keep(ls); return p;
  }
  function remove(id) { keep(loadAll().map(function (x) { return x.id === id ? { id: id, deleted: true, t: Date.now() } : x; })); }
  // a child's plans, in the account (his parent makes and follows them from his own profile)
  function remoteGet(pid) {
    return window.Fam.ready().then(function (c) {
      return c.from('profile_data').select('data').eq('profile_id', pid).eq('key', 'plans').maybeSingle().then(function (r) { return (r.data && r.data.data) || []; });
    });
  }
  function remotePut(pid, fn) {
    return remoteGet(pid).then(function (ls) {
      ls = fn(ls);
      return window.Fam.ready().then(function (c) { return c.from('profile_data').upsert({ profile_id: pid, key: 'plans', data: ls, updated_at: new Date().toISOString() }); })
        .then(function (r) { if (r.error) throw r.error; return ls; });
    });
  }
  function putIn(ls, p) { p.t = Date.now(); if (!p.c) p.c = p.t; var i = -1; ls.forEach(function (x, j) { if (x.id === p.id) i = j; }); if (i >= 0) ls[i] = p; else ls.push(p); return ls; }

  var T = {
    ar: { title: 'خططي', add: 'خطة جديدة', none: 'لا خطط بعد. ضع لنفسك خطة لحفظ سورة أو جزء أو لمراجعته، تُقسَّم أورادًا على الأيام أو الأسابيع، ويُتابَع تقدمك فيها.',
      type: ['حفظ', 'مراجعة'], name: 'اسم الخطة', range: 'النطاق', by: ['بالسور', 'بالأجزاء', 'بالأحزاب', 'بالصفحات'], from: 'من', to: 'إلى',
      surah: 'سورة', juz: 'الجزء', hizb: 'الحزب', page: 'صفحة', ord: 'يبدأ من', ordO: ['أول النطاق', 'آخره (من الناس صعودًا)'],
      wird: 'الورد', units: ['ربع وجه', 'نصف وجه', 'وجه', 'حزب'], every: 'كل', freq: ['يوم', 'أسبوع'], rdays: 'أيام الورد', start: 'تبدأ',
      wd: ['أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'], count: 'عدد الأوراد', ends: 'تنتهي', create: 'إنشاء', saveB: 'حفظ', cancel: 'إلغاء', del: 'حذف', edit: 'تعديل',
      delAsk: 'حذف هذه الخطة؟', amount: 'المقدار', nextW: 'الورد التالي', today: 'ورد اليوم', week: 'ورد الأسبوع', openB: 'افتح', doneB: 'تم ✓', undo: 'تراجع', behind: 'متأخر', onTime: 'على الموعد', ahead: 'أتممت وردك',
      fit: ['بالمقدار', 'بتاريخ الانتهاء'], endBy: 'تنتهي قبل', offL: 'أيام الإجازة', offAdd: 'إضافة إجازة', offFrom: 'من', offTo: 'إلى', none0: 'لا إجازات',
      forL: 'لمن الخطة؟', setBy: 'وضعها', kids: 'خطط أولادي', kidsNone: 'لا خطط لأولادك بعد.', imp: 'خطة المدرسة أو الحلقة', impHow: 'انسخ الطلب وأرسله مع ملف الخطة إلى أحد برامج الذكاء الاصطناعي، ثم الصق الجدول الذي يعيده هنا.',
      impCopy: 'انسخ الطلب', impCopied: 'نُسخ الطلب.', impRead: 'اقرأ الجدول', impOk: 'قُرئ {n} بتواريخها.', impBad: 'أسطر لم تُقرأ:', impNone: 'لم يُقرأ شيء؛ تأكد من الجدول.',
      impList: 'جدول الخطة: {n} بتواريخها', impDrop: 'إلغاء الجدول', file: 'مستند الخطة', fileAdd: 'إرفاق مستند الخطة (اختياري)', saving: 'يُحفظ…', err: 'تعذّر الحفظ، أعد المحاولة.',
      fin: 'تمّت الخطة، بارك الله فيك.', p1: 'ص', note: 'يُحتسب الورد إذا سمّعته في المصحف، أو إذا ضغطت «تم».', auto: 'أحسنت! احتُسب ورد خطتك', wirdsN: function (n, l) { return l === 'ar' ? arCount(n, 'ورد واحد', 'وردان', 'أوراد', 'وردًا') : n + ' wirds'; } },
    en: { title: 'My plans', add: 'New plan', none: 'No plans yet. Set yourself a plan to memorize or review a surah or a juz, divided into daily or weekly wirds, and follow your progress.',
      type: ['Memorize', 'Review'], name: 'Plan name', range: 'Range', by: ['Surahs', 'Juz', 'Hizb', 'Pages'], from: 'From', to: 'To',
      surah: 'Surah', juz: 'Juz', hizb: 'Hizb', page: 'Page', ord: 'Starts from', ordO: ['The start', 'The end (from an-Nas up)'],
      wird: 'Wird', units: ['¼ page', '½ page', 'Page', 'Hizb'], every: 'Every', freq: ['day', 'week'], rdays: 'Wird days', start: 'Starts',
      wd: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], count: 'Wirds', ends: 'Ends', create: 'Create', saveB: 'Save', cancel: 'Cancel', del: 'Delete', edit: 'Edit',
      delAsk: 'Delete this plan?', amount: 'Amount', nextW: 'Next wird', today: 'Today', week: 'This week', openB: 'Open', doneB: 'Done ✓', undo: 'Undo', behind: 'Behind', onTime: 'On time', ahead: 'Wird done',
      fit: ['By amount', 'By end date'], endBy: 'Ends by', offL: 'Days off', offAdd: 'Add days off', offFrom: 'From', offTo: 'To', none0: 'No days off',
      forL: 'Plan for', setBy: 'Set by', kids: 'My children’s plans', kidsNone: 'No plans for your children yet.', imp: 'School or circle plan', impHow: 'Copy the request and send it with the plan’s file to an AI assistant, then paste the table it returns here.',
      impCopy: 'Copy the request', impCopied: 'Request copied.', impRead: 'Read the table', impOk: 'Read: {n} with their dates.', impBad: 'Lines not read:', impNone: 'Nothing was read; check the table.',
      impList: 'The plan’s schedule: {n} with dates', impDrop: 'Remove the schedule', file: 'Plan document', fileAdd: 'Attach the plan’s document (optional)', saving: 'Saving…', err: 'Could not save; try again.',
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
  function who() { var F = window.Fam; return F && F.signedIn && F.signedIn() ? F.current() : null; }
  function ui(el, o) {
    var lang = o.lang, l = L(lang), me = null;
    el.innerHTML = '<p class="kh-note">…</p>';
    // signed in: the account (js/family.js) first, to know whose plans these are and his children's
    var famUp = !localStorage.getItem('sb-nikwwjswwlwcqekbnpzq-auth-token') || window.Fam ? Promise.resolve() : new Promise(function (ok) {
      var sc = document.createElement('script'); sc.src = '/js/family.js?v=3'; sc.onload = ok; sc.onerror = ok; document.head.appendChild(sc);
    });
    Promise.all([boot(), famUp]).then(function () { me = who(); draw(); }, function () { el.innerHTML = ''; });
    function unitText(p, lg) {
      if (p.list && p.list.length) return l.impList.replace('{n}', l.wirdsN(p.list.length, lg));
      var n = Math.max(1, p.n || 1), u = ['q', 'h', 'p', 'hizb'].indexOf(p.unit);
      var w = lg === 'ar' ? [arCount(n, 'ربع وجه', 'ربعا وجه', 'أرباع وجه', 'ربع وجه'), arCount(n, 'نصف وجه', 'نصفا وجه', 'أنصاف وجه', 'نصف وجه'), arCount(n, 'وجه واحد', 'وجهان', 'أوجه', 'وجهًا'), arCount(n, 'حزب واحد', 'حزبان', 'أحزاب', 'حزبًا')][u]
        : n + ' × ' + l.units[u];
      return w + ' / ' + l.freq[p.freq === 'week' ? 1 : 0];
    }
    // a plan's card; kid: the child's profile, when the parent looks at his child's plans
    function card(p, kid) {
      var st = stat(p), t = ymd(new Date()), lastI = st.next < 0 ? st.total - 1 : st.next - 1;
      var byP0 = null; try { byP0 = JSON.parse(sessionStorage.getItem('lt_by_parent') || 'null'); } catch (e) {}
      var locked = !kid && p.setBy && (!me || p.setBy.id !== me.id) && !(byP0 && byP0.id === p.setBy.id);
      var state = st.fin ? '<span class="kh-ok">' + esc(l.fin) + '</span>' : st.behind > 0 ? '<span class="kh-late">' + esc(l.behind) + ' ' + esc(l.wirdsN(st.behind, lang)) + '</span>'
        : !st.dueNow ? '<span class="kh-ok">' + esc(l.ahead) + '</span>' : '<span>' + esc(l.onTime) + '</span>';
      return '<div class="kh-card pl-card' + (st.fin ? ' fin' : '') + '" style="--kc:' + esc(p.color || COLORS[0]) + '"><div class="kh-top"><i class="pl-type">' + esc(l.type[p.type === 'review' ? 1 : 0]) + '</i><b>' + esc(p.name) + '</b>' +
        (locked ? '' : '<button type="button" class="kh-edit" data-e="' + p.id + '"' + (kid ? ' data-k="' + kid.id + '"' : '') + '>' + esc(l.edit) + '</button>') + '</div>' +
        (p.setBy && !kid ? '<div class="pl-by">' + esc(l.setBy) + ': ' + esc(p.setBy.name) + '</div>' : '') +
        '<div class="kh-bar"><i style="width:' + st.pct + '%"></i></div>' +
        '<div class="kh-meta"><span>' + num(st.done, lang) + ' / ' + esc(l.wirdsN(st.total, lang)) + '</span>' + state + '</div>' +
        (st.fin ? '' : '<div class="pl-today"><b>' + esc(!st.dueNow ? l.nextW : p.freq === 'week' ? l.week : l.today) + ':</b> ' + esc(wirdLabel(st, lang)) + ' <small>· ' + esc(l.p1) + ' ' + num(st.page, lang) + '</small></div>' +
          (kid ? '' : '<div class="pl-btns"><button type="button" class="kh-read" data-o="' + p.id + '">' + esc(l.openB) + '</button><button type="button" class="pl-done" data-d="' + p.id + '">' + esc(l.doneB) + '</button>' +
          (lastI >= 0 && (p.done || {})[lastI] === t ? '<button type="button" class="pl-undo" data-u="' + p.id + '">' + esc(l.undo) + '</button>' : '') + '</div>')) +
        '<div class="kh-end">' + esc(unitText(p, lang)) + ' · ' + esc(l.ends) + ' ' + esc(hijri(st.end, lang)) +
        (p.file ? ' · <button type="button" class="pl-file" data-f="' + esc(p.file) + '">' + esc(l.file) + '</button>' : '') + '</div></div>';
    }
    var kidsP = null;
    function kids() {
      if (!me || !me.parent) return Promise.resolve([]);
      if (!kidsP) kidsP = window.Fam.profiles().then(function (ls) { return ls.filter(function (x) { return !x.is_parent; }); }).catch(function () { return []; });
      return kidsP;
    }
    function draw() {
      // one child's plans, from his parent's «حسابي» (o.kid)
      if (o.kid) {
        el.innerHTML = '<p class="kh-note">…</p>';
        remoteGet(o.kid.id).catch(function () { return []; }).then(function (all) {
          var live = all.filter(function (x) { return !x.deleted; });
          el.innerHTML = live.map(function (p) { return card(p, o.kid); }).join('') + (live.length ? '' : '<p class="kh-none">' + esc(l.kidsNone) + '</p>') +
            '<button type="button" class="kh-add">+ ' + esc(l.add) + '</button>';
          el.querySelector('.kh-add').onclick = function () { form(null, o.kid); };
          el.querySelectorAll('[data-e]').forEach(function (b) { b.onclick = function () { form(all.filter(function (x) { return x.id === b.dataset.e; })[0], o.kid); }; });
          el.querySelectorAll('[data-f]').forEach(fileBtn);
        });
        return;
      }
      var ls = load(), h = ls.length ? '' : '<p class="kh-none">' + esc(l.none) + '</p>';
      ls.forEach(function (p) { h += card(p); });
      h += '<button type="button" class="kh-add">+ ' + esc(l.add) + '</button><div class="pl-kids"></div><p class="kh-note">' + esc(l.note) + '</p>';
      el.innerHTML = h;
      wire(el, null);
      el.querySelector('.kh-add').onclick = function () { form(null, null); };
      // (the parent sees and makes his children's plans in their accounts, opened from «الحسابات الفرعية»)
      if (false) kids().then(function (ks) {
        var box = el.querySelector('.pl-kids'); if (!box || !ks.length) return;
        Promise.all(ks.map(function (k) { return remoteGet(k.id).catch(function () { return []; }); })).then(function (all) {
          var hh = '<div class="kh-l">' + esc(l.kids) + '</div>', any = false;
          ks.forEach(function (k, i) {
            var live = all[i].filter(function (x) { return !x.deleted; });
            hh += '<div class="pl-kid"><b>' + window.Fam.avatar(k.avatar) + ' ' + esc(k.name) + '</b>' + live.map(function (p) { any = true; return card(p, k); }).join('') +
              '<button type="button" class="pl-kadd" data-kid="' + k.id + '">+ ' + esc(l.add) + '</button></div>';
          });
          box.innerHTML = hh;
          box.querySelectorAll('[data-kid]').forEach(function (b) { b.onclick = function () { form(null, ks.filter(function (k) { return k.id === b.dataset.kid; })[0]); }; });
          box.querySelectorAll('[data-e]').forEach(function (b) {
            b.onclick = function () { var k = ks.filter(function (x) { return x.id === b.dataset.k; })[0], i = ks.indexOf(k); form(all[i].filter(function (x) { return x.id === b.dataset.e; })[0], k); };
          });
          box.querySelectorAll('[data-f]').forEach(fileBtn);
        });
      });
    }
    function fileBtn(b) { b.onclick = function () { P.fileUrl(b.dataset.f).then(function (u) { window.open(u, '_blank'); }).catch(function () {}); }; }
    function wire(box) {
      box.querySelectorAll('.kh-edit:not([data-k])').forEach(function (b) { b.onclick = function () { form(load().filter(function (x) { return x.id === b.dataset.e; })[0], null); }; });
      box.querySelectorAll('[data-o]').forEach(function (b) {
        b.onclick = function () { var p = load().filter(function (x) { return x.id === b.dataset.o; })[0], st = stat(p); o.open(st.page, p.type === 'review' ? 'tasmee' : 'hifz'); };
      });
      box.querySelectorAll('[data-d]').forEach(function (b) {
        b.onclick = function () { var p = load().filter(function (x) { return x.id === b.dataset.d; })[0], st = stat(p); if (st.next < 0) return; p.done = p.done || {}; p.done[st.next] = ymd(new Date()); save(p); draw(); };
      });
      box.querySelectorAll('[data-u]').forEach(function (b) {
        b.onclick = function () { var p = load().filter(function (x) { return x.id === b.dataset.u; })[0], st = stat(p), i = st.next < 0 ? st.total - 1 : st.next - 1; if (i >= 0) { delete p.done[i]; save(p); draw(); } };
      });
      box.querySelectorAll('.kh-card [data-f]').forEach(fileBtn);
    }
    // the form; kid: the child the plan is for (the parent's own when null)
    function form(p0, kid) {
      var no = load().length + 1;
      var p = p0 ? JSON.parse(JSON.stringify(p0)) : { id: uid(), type: 'hifz', name: '', color: COLORS[(no - 1) % COLORS.length], by: 'surah', a: 2, b: 2, ord: 'mushaf',
        unit: 'h', n: 1, fit: 'amount', freq: 'day', rdays: 127, start: ymd(new Date()), off: {}, done: {} };
      p.off = p.off || {};
      var named = !!(p0 && p0.name), file = null;
      var BY = ['surah', 'juz', 'hizb', 'page'], UN = ['q', 'h', 'p', 'hizb'], max = { surah: 114, juz: 30, hizb: 60, page: 604 };
      var names = P.names(lang === 'ur' ? 'ar' : lang);
      var opt = function () {
        var o2 = '';
        for (var i = 1; i <= max[p.by]; i++) o2 += '<option value="' + i + '">' + (p.by === 'surah' ? num(i, lang) + ' ' + esc(names[i - 1]) : esc(l[p.by]) + ' ' + num(i, lang)) + '</option>';
        return o2;
      };
      var seg = function (cls, labels, vals, cur) { return '<div class="kh-seg ' + cls + '">' + labels.map(function (t, i) { return '<button type="button" data-v="' + vals[i] + '"' + (vals[i] === cur ? ' class="on"' : '') + '>' + esc(t) + '</button>'; }).join('') + '</div>'; };
      el.innerHTML = '<div class="kh-form">' +
        (kid ? '<div class="pl-for">' + esc(l.forL) + ' <b>' + window.Fam.avatar(kid.avatar) + ' ' + esc(kid.name) + '</b></div>' : '') +
        seg('pl-typ', l.type, ['hifz', 'review'], p.type) +
        '<input class="kh-name" maxlength="40" placeholder="' + esc(l.name) + '" value="' + esc(p.name) + '" aria-label="' + esc(l.name) + '">' +
        '<div class="pl-calc">' +
          '<div class="kh-l">' + esc(l.range) + '</div>' + seg('pl-by', l.by, BY, p.by) +
          '<div class="kh-ft"><label>' + esc(l.from) + '<select class="pl-a"></select></label><label>' + esc(l.to) + '<select class="pl-b"></select></label></div>' +
          '<div class="kh-l">' + esc(l.ord) + '</div>' + seg('pl-ord', l.ordO, ['mushaf', 'reverse'], p.ord) +
          '<div class="kh-l">' + esc(l.wird) + '</div>' + seg('pl-fit', l.fit, ['amount', 'end'], p.fit === 'end' ? 'end' : 'amount') +
          '<div class="kh-row pl-amt"><span>' + esc(l.amount) + '</span><span class="kh-step"><button type="button" data-n="1">+</button><b class="pl-n"></b><button type="button" data-n="-1">−</button></span></div>' +
          '<div class="kh-row pl-endr"><span>' + esc(l.endBy) + '</span><input class="kh-start pl-end" type="date"></div>' +
          '<div class="kh-row"><span>' + esc(l.every) + '</span>' + seg('pl-freq', l.freq, ['day', 'week'], p.freq) + '</div>' +
          '<div class="kh-row kh-rdays pl-rd"><span>' + esc(l.rdays) + '</span><span class="kh-wd">' + l.wd.map(function (w, i) { return '<button type="button" data-w="' + i + '">' + esc(w) + '</button>'; }).join('') + '</span></div>' +
          '<div class="kh-row"><span>' + esc(l.start) + '</span><input class="kh-start pl-start" type="date"></div>' +
          '<div class="kh-l">' + esc(l.offL) + '</div><div class="pl-offs"></div>' +
          '<div class="pl-offadd"><label>' + esc(l.offFrom) + '<input type="date" class="kh-start pl-o1"></label><label>' + esc(l.offTo) + '<input type="date" class="kh-start pl-o2"></label><button type="button" class="pl-done pl-oadd">' + esc(l.offAdd) + '</button></div>' +
        '</div>' +
        '<div class="pl-listbox" hidden><b class="pl-listn"></b><button type="button" class="pl-undo pl-ldrop">' + esc(l.impDrop) + '</button></div>' +
        '<details class="pl-imp"><summary>' + esc(l.imp) + '</summary><p class="kh-note">' + esc(l.impHow) + '</p>' +
          '<button type="button" class="pl-done pl-icopy">' + esc(l.impCopy) + '</button><textarea class="pl-itxt" rows="5" dir="auto"></textarea>' +
          '<button type="button" class="pl-done pl-iread">' + esc(l.impRead) + '</button><p class="ma-msg pl-imsg"></p>' +
          (me ? '<label class="pl-filel">' + esc(l.fileAdd) + '<input type="file" class="pl-file-in" accept=".pdf,image/*,.doc,.docx"></label>' : '') + '</details>' +
        '<p class="pl-sum"></p><p class="ma-msg pl-msg"></p>' +
        '<div class="kh-btns"><button type="button" class="kh-save">' + esc(p0 ? l.saveB : l.create) + '</button><button type="button" class="kh-cancel">' + esc(l.cancel) + '</button>' +
        (p0 ? '<button type="button" class="kh-del">' + esc(l.del) + '</button>' : '') + '</div></div>';
      var $ = function (q) { return el.querySelector(q); }, sa = $('.pl-a'), sb = $('.pl-b');
      var autoName = function () {
        var r;
        if (p.list && p.list.length || p.by === 'ayah') { var rr = p.list && p.list.length ? [p.list[0].a_from, p.list[p.list.length - 1].a_to] : [p.from, p.to]; r = P.label(P.walk(rr[0], rr[1], p.ord), lang === 'ur' ? 'ar' : lang, function (x) { return num(x, lang); }); }
        else { var a = Math.min(p.a, p.b), b = Math.max(p.a, p.b); r = p.by === 'surah' ? (a === b ? names[a - 1] : names[a - 1] + ' – ' + names[b - 1]) : l[p.by] + ' ' + num(a, lang) + (a === b ? '' : '–' + num(b, lang)); }
        return l.type[p.type === 'review' ? 1 : 0] + ' ' + r;
      };
      var offRanges = function () {
        var ds = Object.keys(p.off).sort(), out = [];
        ds.forEach(function (d) { var last = out[out.length - 1], prev = parse(d); prev.setDate(prev.getDate() - 1); if (last && last[1] === ymd(prev)) last[1] = d; else out.push([d, d]); });
        return out;
      };
      var show = function () {
        var hasList = !!(p.list && p.list.length);
        $('.pl-calc').hidden = hasList; $('.pl-listbox').hidden = !hasList;
        if (hasList) $('.pl-listn').textContent = unitText(p, lang);
        var endMode = p.fit === 'end';
        $('.pl-endr').hidden = !endMode;
        el.querySelectorAll('.pl-amt [data-n]').forEach(function (b) { b.hidden = endMode; });
        $('.pl-rd').hidden = p.freq === 'week';
        el.querySelectorAll('.kh-wd button').forEach(function (b) { b.classList.toggle('on', !!((p.rdays >> +b.dataset.w) & 1)); });
        var ws = wirds(p), sl = slots(p, ws.length);
        $('.pl-n').textContent = unitText(p, lang).split(' / ')[0];
        if (!named) $('.kh-name').value = autoName();
        $('.pl-offs').innerHTML = offRanges().map(function (r) {
          return '<span class="pl-off">' + esc(hijri(r[0], lang)) + (r[1] !== r[0] ? ' – ' + esc(hijri(r[1], lang)) : '') + '<button type="button" data-of="' + r[0] + '|' + r[1] + '">×</button></span>';
        }).join('') || '<small class="kh-note">' + esc(l.none0) + '</small>';
        el.querySelectorAll('[data-of]').forEach(function (b) {
          b.onclick = function () { var x = b.dataset.of.split('|'); Object.keys(p.off).forEach(function (d) { if (d >= x[0] && d <= x[1]) delete p.off[d]; }); show(); };
        });
        $('.pl-sum').textContent = l.count + ': ' + l.wirdsN(ws.length, lang) + (sl.length ? ' · ' + l.ends + ' ' + hijri(sl[sl.length - 1], lang) : '');
      };
      var fill = function () { if (p.by === 'ayah') return; sa.innerHTML = opt(); sb.innerHTML = opt(); sa.value = String(p.a); sb.value = String(p.b); };
      var segOn = function (cls, key, after) {
        el.querySelectorAll('.' + cls + ' button').forEach(function (b) {
          b.onclick = function () { p[key] = b.dataset.v; el.querySelectorAll('.' + cls + ' button').forEach(function (x) { x.classList.toggle('on', x === b); }); if (after) after(); show(); };
        });
      };
      segOn('pl-typ', 'type'); segOn('pl-ord', 'ord'); segOn('pl-freq', 'freq'); segOn('pl-fit', 'fit');
      segOn('pl-by', 'by', function () { p.a = 1; p.b = 1; fill(); });
      if (p.by === 'ayah') { el.querySelectorAll('.pl-by button').forEach(function (x) { x.classList.remove('on'); }); $('.kh-ft').innerHTML = '<b>' + esc(P.label(P.walk(p.from, p.to, p.ord), lang === 'ur' ? 'ar' : lang, function (x) { return num(x, lang); })) + '</b>'; }
      fill(); $('.pl-start').value = p.start;
      if (!p.end) { var e0 = parse(p.start); e0.setDate(e0.getDate() + 90); p.end = ymd(e0); }
      $('.pl-end').value = p.end;
      show();
      sa.onchange = function () { p.a = +sa.value; if (p.b < p.a) { p.b = p.a; sb.value = sa.value; } show(); };
      sb.onchange = function () { p.b = +sb.value; show(); };
      $('.kh-name').oninput = function () { named = !!$('.kh-name').value.trim(); };
      // one step up or down the amounts: ¼ page, ½ page, a page, 2 pages … then hizbs
      el.querySelectorAll('[data-n]').forEach(function (b) { b.onclick = function () { var r = LADDER[Math.max(0, Math.min(LADDER.length - 1, rung(p) + +b.dataset.n))]; p.unit = r[0]; p.n = r[1]; show(); }; });
      el.querySelectorAll('[data-w]').forEach(function (b) { b.onclick = function () { var nb = p.rdays ^ (1 << +b.dataset.w); if (nb) { p.rdays = nb; show(); } }; });
      $('.pl-start').onchange = function () { p.start = $('.pl-start').value || ymd(new Date()); show(); };
      $('.pl-end').onchange = function () { p.end = $('.pl-end').value || p.end; show(); };
      $('.pl-oadd').onclick = function () {
        var a = $('.pl-o1').value, b = $('.pl-o2').value || a; if (!a) return; if (b < a) { var t2 = a; a = b; b = t2; }
        for (var d = parse(a), g = 0; ymd(d) <= b && g < 400; g++, d.setDate(d.getDate() + 1)) p.off[ymd(d)] = 'off';
        $('.pl-o1').value = $('.pl-o2').value = ''; show();
      };
      $('.pl-ldrop').onclick = function () { delete p.list; show(); };
      // a school's plan: an AI writes its schedule on our form, read here
      $('.pl-icopy').onclick = function () {
        var t = P.importPrompt(lang), m = $('.pl-imsg');
        var ok = function () { m.textContent = l.impCopied; m.classList.remove('bad'); };
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(ok, function () { $('.pl-itxt').value = t; });
        else $('.pl-itxt').value = t;
      };
      $('.pl-iread').onclick = function () {
        var r = P.importText($('.pl-itxt').value), m = $('.pl-imsg');
        if (!r.lessons) { m.textContent = l.impNone; m.classList.add('bad'); return; }
        var days = r.days || {};
        p.list = r.lessons.map(function (x, i) { return { d: null, a_from: x.a_from, a_to: x.a_to }; });
        // the dates: the plan's study days from its start, skipping its holidays (as written in the school's plan)
        var sch = P.schedule(r.plan, r.lessons, days).filter(function (x) { return x.kind === 'lesson'; });
        p.list.forEach(function (x, i) { x.d = sch[i] ? sch[i].d : null; });
        p.list = p.list.filter(function (x) { return x.d; });
        p.by = 'ayah'; p.from = r.plan.new_from; p.to = r.plan.new_to; p.ord = r.plan.ord; p.rdays = r.plan.days || 127; p.start = r.plan.start_date;
        Object.keys(days).forEach(function (d) { if (days[d] === 'off') p.off[d] = 'off'; });
        m.textContent = l.impOk.replace('{n}', l.wirdsN(p.list.length, lang)) + (r.errors && r.errors.length ? ' ' + l.impBad + ' ' + r.errors.map(function (x) { return num(x, lang); }).join('، ') : '');
        m.classList.toggle('bad', !!(r.errors && r.errors.length));
        $('.pl-start').value = p.start; show();
      };
      if ($('.pl-file-in')) $('.pl-file-in').onchange = function () { file = this.files[0] || null; };
      $('.kh-cancel').onclick = draw;
      if ($('.kh-del')) $('.kh-del').onclick = function () {
        if (!confirm(l.delAsk)) return;
        if (kid) remotePut(kid.id, function (ls) { return ls.map(function (x) { return x.id === p.id ? { id: p.id, deleted: true, t: Date.now() } : x; }); }).then(draw, draw);
        else { remove(p.id); draw(); }
      };
      $('.kh-save').onclick = function () {
        var msg = $('.pl-msg'), btn = $('.kh-save');
        p.name = $('.kh-name').value.trim() || autoName();
        if (p.fit === 'end') { var fr2 = fitL(p); p.unit = fr2[0]; p.n = fr2[1]; }
        // a changed range or division: the wirds are made again
        if (p0 && ['by', 'a', 'b', 'ord', 'unit', 'n', 'from', 'to'].some(function (k) { return p0[k] !== p[k]; }) || (p0 && JSON.stringify(p0.list || null) !== JSON.stringify(p.list || null))) p.done = {};
        if (kid && me) p.setBy = { id: me.id, name: me.name };
        // made by the parent in his child's account: set by him, the child follows it
        var byP = null; try { byP = JSON.parse(sessionStorage.getItem('lt_by_parent') || 'null'); } catch (e) {}
        if (!kid && byP && me && !me.parent && !p0) p.setBy = byP;
        btn.disabled = true; msg.textContent = l.saving; msg.classList.remove('bad');
        (file ? P.upload(file).then(function (path) { p.file = path; }) : Promise.resolve()).then(function () {
          if (kid) return remotePut(kid.id, function (ls) { return putIn(ls, p); });
          save(p);
        }).then(draw, function () { btn.disabled = false; msg.textContent = l.err; msg.classList.add('bad'); });
      };
    }
  }

  window.LtPlans = { ui: ui, check: check, stripText: stripText, boot: boot, list: load, stat: function (p) { return stat(p); } };
})();
