/* Khatmas (ختماتي): reading the whole Quran through in a set time — as in Mushaf apps.
   A khatma is the whole Mushaf (pages 1–604), divided by juz, hizb, quarter or pages (k.unit), a daily wird of so many
   of them (k.n, for juz, hizb and quarters), a duration in days, the reading days of the week, and a start date. With juz or
   hizb, each day's wird starts and ends where a juz or hizb does. (Khatmas made before this may hold part of the
   Mushaf, from k.from to k.to, divided by pages: they go on as they were.) Progress is automatic: a page
   of the range read in the Mushaf (open 20 s, heard to its end, or recited) is done (window event 'lt-page').
   Today's wird starts at the first page not read yet; the reader sees whether he is on time or behind.

   Kept on this device (localStorage lt_kh_<profile|me>) and, for a family profile, in the account (table khatmas,
   one row per khatma, the khatma as JSON). Reminders: the reminder time is stored with the khatma; js/push.js
   sends it to the server for a phone notification.

   Khatma.list() / .save(k) / .remove(id) / .done(page) / .stat(k) / .active()
   Khatma.ui(el, {lang, show(page), close()})   the khatmas page in the settings drawer
   Khatma.stripText(lang)                       today's wird, for the line on the Mushaf page */
(function () {
  var load = function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } };
  var store = function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} };
  var AR = '٠١٢٣٤٥٦٧٨٩';
  var M = null, MP = null;
  function map() {
    if (!MP) MP = fetch('/data/quran-pages.json').then(function (r) { return r.json(); }).then(function (m) {
      var jStart = [], sFirst = [], sLast = [];
      m.juz.forEach(function (j, i) { if (!jStart[j - 1]) jStart[j - 1] = i + 1; });
      m.pages.forEach(function (r, i) {
        for (var s = r[0]; s <= r[2]; s++) { if (!sFirst[s - 1] && (s !== r[0] || r[1] === 1)) sFirst[s - 1] = i + 1; sLast[s - 1] = i + 1; }
      });
      M = { m: m, jStart: jStart, sFirst: sFirst, sLast: sLast };
      return M;
    });
    return MP;
  }
  function ymd(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function parse(s) { var p = String(s).split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function prof() {
    var F = window.Fam;
    if (F && F.current) return F.current();
    try { return JSON.parse(load('lt_profile') || 'null'); } catch (e) { return null; }
  }
  function key() { var p = prof(); return 'lt_kh_' + (p && p.id ? p.id : 'me'); }
  function list() { try { return JSON.parse(load(key()) || '[]') || []; } catch (e) { return []; } }
  function keep(ls) { store(key(), JSON.stringify(ls)); }
  function uid() { return (crypto.randomUUID ? crypto.randomUUID() : 'k' + Date.now() + Math.random().toString(16).slice(2)); }

  // the account: a khatma saved whole (one row), a little after it changes
  var dirty = {}, dt = null;
  function push() {
    dt = null;
    var F = window.Fam, p = prof();
    if (!p || !p.id) { dirty = {}; return; }
    if (!F || !F.ready) { dt = setTimeout(push, 5000); return; }
    var ids = Object.keys(dirty); dirty = {};
    F.ready().then(function (c) {
      if (!c) return;
      var all = list();
      ids.forEach(function (id) {
        var k = all.filter(function (x) { return x.id === id; })[0];
        if (k) c.from('khatmas').upsert({ id: id, profile_id: p.id, data: k, updated_at: new Date().toISOString() }).then(function () {});
        else c.from('khatmas').delete().eq('id', id).then(function () {});
      });
    }).catch(function () {});
  }
  function changed(id) { dirty[id] = 1; if (!dt) dt = setTimeout(push, 3000); try { window.dispatchEvent(new CustomEvent('lt-khatma')); } catch (e) {} }
  // the account's khatmas for this profile, merged with this device's (the newer of each wins)
  function pull() {
    var F = window.Fam, p = prof();
    if (!p || !p.id || !F || !F.ready) return Promise.resolve(list());
    return F.ready().then(function (c) {
      if (!c) return list();
      return c.from('khatmas').select('id,data,updated_at').eq('profile_id', p.id).then(function (r) {
        if (r.error) return list();
        var mine = list(), by = {};
        mine.forEach(function (k) { by[k.id] = k; });
        (r.data || []).forEach(function (row) {
          var k = row.data || {}, l = by[row.id];
          if (!l || (k.t || 0) > (l.t || 0)) by[row.id] = k;
          else if (l && (l.t || 0) > (k.t || 0)) dirty[row.id] = 1;
          if (l && k.done) l.done = union(l.done || [], k.done);
        });
        mine.forEach(function (k) { if (!(r.data || []).some(function (x) { return x.id === k.id; })) dirty[k.id] = 1; });
        var out = Object.keys(by).map(function (id) { return by[id]; }).sort(function (a, b) { return (a.c || 0) - (b.c || 0); });
        keep(out); if (Object.keys(dirty).length && !dt) dt = setTimeout(push, 2000);
        return out;
      });
    }).catch(function () { return list(); });
  }
  function union(a, b) { var o = a.slice(); b.forEach(function (x) { if (o.indexOf(x) < 0) o.push(x); }); return o; }

  function save(k) {
    var ls = list(), i = -1;
    ls.forEach(function (x, j) { if (x.id === k.id) i = j; });
    k.t = Date.now(); if (!k.c) k.c = k.t;
    if (i >= 0) ls[i] = k; else ls.push(k);
    keep(ls); changed(k.id);
    return k;
  }
  function remove(id) { keep(list().filter(function (x) { return x.id !== id; })); changed(id); }
  // a page read: done in each khatma it belongs to
  function done(page) {
    var ls = list(), ch = [];
    ls.forEach(function (k) {
      if (k.ended || page < k.from || page > k.to) return;
      k.done = k.done || [];
      if (k.done.indexOf(page) < 0) { k.done.push(page); k.t = Date.now(); ch.push(k.id); if (k.done.length >= k.to - k.from + 1) k.fin = ymd(new Date()); }
    });
    if (ch.length) { keep(ls); ch.forEach(changed); }
  }

  // where each juz and hizb starts (Mushaf page; a juz or hizb starting inside a page counts from the next one)
  var JZ = [1,22,42,63,82,102,122,142,162,182,202,222,242,262,282,302,322,342,362,382,402,422,442,462,482,503,522,542,562,582];
  var HZ = [1,11,22,32,42,51,63,72,82,92,102,112,122,132,142,151,162,173,182,192,202,212,222,231,242,252,262,272,282,292,302,312,322,332,342,352,362,371,382,392,402,413,422,431,442,451,462,472,482,491,503,513,522,531,542,553,562,572,582,591];
  var RB = [1,5,7,9,11,14,17,19,22,24,27,29,32,34,37,39,42,44,46,49,51,54,56,59,63,64,67,69,72,74,77,79,82,84,87,89,92,94,97,100,102,104,106,109,112,114,117,119,122,124,126,129,132,134,137,140,142,144,146,148,151,154,156,158,162,164,167,170,173,175,177,179,182,184,187,189,192,194,196,199,202,204,206,209,212,214,217,219,222,224,226,228,231,233,236,238,242,244,247,249,252,254,256,259,262,264,267,270,272,275,277,280,282,284,287,289,292,295,297,299,302,304,306,309,312,315,317,319,322,324,326,329,332,334,336,339,342,344,347,350,352,354,356,359,362,364,367,369,371,374,377,379,382,384,386,389,392,394,396,399,402,404,407,410,413,415,418,420,422,425,426,429,431,433,436,439,442,444,446,449,451,454,456,459,462,464,467,469,472,474,477,479,482,484,486,488,491,493,496,499,503,505,507,510,513,515,517,519,522,524,526,529,531,534,536,539,542,544,547,550,553,554,558,560,562,564,566,569,572,575,577,579,582,585,587,589,591,594,596,600];                                       // the quarters (أرباع الأحزاب)
  function bounds(u) { return u === 'juz' ? JZ : u === 'hizb' ? HZ : u === 'rub' ? RB : null; }
  function units(k) { return k.from === 1 && k.to === 604 ? bounds(k.unit) : null; }
  // the reading days from the start, for the duration: [dates]
  function slots(k) {
    var out = [], d = parse(k.start);
    for (var i = 0; i < k.days; i++) {
      if ((k.rdays >> d.getDay()) & 1) out.push(ymd(d));
      d.setDate(d.getDate() + 1);
    }
    return out.length ? out : [k.start];
  }
  // where a khatma stands today
  function stat(k) {
    var total = k.to - k.from + 1, sl = slots(k), t = ymd(new Date());
    var U = units(k), per = U ? Math.max(1, k.n || Math.ceil(U.length / sl.length)) : Math.ceil(total / sl.length);
    var past = sl.filter(function (d) { return d <= t; }).length;       // reading days up to today
    var isDay = sl.indexOf(t) >= 0;
    // pages that should be read after d reading days (by whole juz or hizb when divided so)
    var upto = function (d) { if (!U) return Math.min(total, per * d); var u = Math.min(U.length, per * d); return u >= U.length ? total : U[u] - 1; };
    var want = upto(past);
    var dn = (k.done || []).filter(function (p) { return p >= k.from && p <= k.to; }).length;
    var first = 0;
    for (var p = k.from; p <= k.to; p++) if ((k.done || []).indexOf(p) < 0) { first = p; break; }
    var todayLeft = Math.max(0, want - dn);                             // today's share, with any days missed before it
    var before = upto(past - (isDay ? 1 : 0));
    return { total: total, done: dn, per: per, want: want, behind: Math.max(0, before - dn), left: todayLeft,
      from: todayLeft ? first : 0, to: todayLeft ? Math.min(k.to, first + todayLeft - 1) : 0, end: sl[sl.length - 1], fin: dn >= total,
      isDay: isDay, pct: Math.round(dn * 100 / total), first: first, unit: U ? k.unit : 'page' };
  }
  function active() { return list().filter(function (k) { return !k.ended && stat(k).done < stat(k).total; }); }

  var T = {
    ar: { title: 'ختماتي', add: 'ختمة جديدة', none: 'لا ختمات بعد. أنشئ ختمة للقرآن كاملًا مقسَّمًا على أيام بالأجزاء أو الأحزاب أو الصفحات، ويُتابَع تقدمك فيها تلقائيًا من قراءتك.',
      name: 'الاسم', mine: 'ختمتي', range: 'تقسيم الختمة', by: ['بالأجزاء', 'بالأحزاب', 'بالأرباع', 'بالصفحات'], hz: 'الحزب',
      newK: 'ختمة جديدة', sugg: 'مقترحة', all: 'الكل', custom: 'ختمة مخصّصة', customS: 'تختار مدتها وأيام قراءتها وتقسيم وردها', kDays: 'ختمة', daily: 'الورد اليومي', approx: 'تقريبًا', from: 'من', to: 'إلى', juz: 'الجزء', page: 'صفحة', surah: 'سورة',
      days: 'المدة (الأيام)', rdays: 'أيام القراءة', every: 'كل يوم', wird: 'الورد', perDay: 'في كل يوم قراءة', start: 'تبدأ', remind: 'وقت التذكير',
      create: 'إنشاء', saveB: 'حفظ', cancel: 'إلغاء', del: 'حذف', edit: 'تعديل', delAsk: 'حذف هذه الختمة؟', read: 'اقرأ', today: 'ورد اليوم', pages: 'صفحات', p1: 'ص',
      onTime: 'على الموعد', behind: 'متأخر', ahead: 'أتممت ورد اليوم', ends: 'تنتهي', done: 'تمّت الختمة، تقبّل الله.', rest: 'لا ورد اليوم',
      wd: ['أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'], cont: 'أكمل', of: 'من', jz: 'جزء', note: 'يُحتسب التقدم من الصفحات التي تقرؤها في المصحف.', finished: 'المكتملة', started: 'كل ختماتي' },
    en: { title: 'My khatmas', add: 'New khatma', none: 'No khatmas yet. Create one to read the whole Quran over a set number of days, divided by juz, hizb or pages; your progress is followed from your reading.',
      name: 'Name', mine: 'My khatma', range: 'Divide by', by: ['Juz', 'Hizb', 'Quarters', 'Pages'], hz: 'Hizb',
      newK: 'New khatma', sugg: 'Suggested', all: 'All', custom: 'Custom khatma', customS: 'Choose its duration, reading days and how the wird is divided', kDays: 'Khatma in', daily: 'Daily wird', approx: 'about', from: 'From', to: 'To', juz: 'Juz', page: 'Page', surah: 'Surah',
      days: 'Duration (days)', rdays: 'Reading days', every: 'Every day', wird: 'Daily portion', perDay: 'each reading day', start: 'Starts', remind: 'Reminder time',
      create: 'Create', saveB: 'Save', cancel: 'Cancel', del: 'Delete', edit: 'Edit', delAsk: 'Delete this khatma?', read: 'Read', today: 'Today', pages: 'pages', p1: 'p.',
      onTime: 'On time', behind: 'Behind', ahead: 'Today’s portion done', ends: 'Ends', done: 'Khatma completed.', rest: 'No reading today',
      wd: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], cont: 'Continue', of: 'of', jz: 'juz', note: 'Progress comes from the pages you read in the Mushaf.', finished: 'completed', started: 'started' }
  };
  function L(lang) { return T[lang] || T.en; }
  function num(n, lang) { var s = String(n); return lang === 'ar' ? s.replace(/[0-9]/g, function (d) { return AR[d]; }) : s; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  var COLORS = ['#2f6b45', '#c0392b', '#7a5c3e', '#e08a00', '#2a7fd4'];
  function hijri(s, lang) {
    try { return parse(s).toLocaleDateString(lang === 'ar' ? 'ar-SA-u-ca-islamic-umalqura' : 'en-u-ca-islamic-umalqura', { day: 'numeric', month: 'long' }); } catch (e) { return s; }
  }
  // Arabic counted nouns: 1 صفحة, 2 صفحتان, 3–10 صفحات, 11+ صفحة (and the same for the juz)
  function arCount(n, one, two, few, many) { return n === 1 ? one : n === 2 ? two : (n % 100 >= 3 && n % 100 <= 10) ? num(n, 'ar') + ' ' + few : num(n, 'ar') + ' ' + many; }
  function pagesText(n, lang) { return lang === 'ar' ? arCount(n, 'صفحة واحدة', 'صفحتان', 'صفحات', 'صفحة') : num(n, lang) + ' ' + L(lang).pages; }
  // the daily portion: in juz when it is about a whole number of juz (a juz is 20 pages), else in pages
  function amountText(p, lang) {
    var j = Math.round(p / 20);
    if (j >= 1 && Math.abs(p - j * 20) <= (j >= 2 ? 4 : 1)) return lang === 'ar' ? arCount(j, 'جزء واحد', 'جزآن', 'أجزاء', 'جزءًا') : num(j, lang) + ' ' + L(lang).jz;
    return pagesText(p, lang);
  }
  // the wird in the khatma's own unit: «جزء واحد», «حزبان», «٥ صفحات»
  function unitText(n, unit, lang) {
    if (unit === 'juz') return lang === 'ar' ? arCount(n, 'جزء واحد', 'جزآن', 'أجزاء', 'جزءًا') : num(n, lang) + ' juz';
    if (unit === 'hizb') return lang === 'ar' ? arCount(n, 'حزب واحد', 'حزبان', 'أحزاب', 'حزبًا') : num(n, lang) + ' hizb';
    if (unit === 'rub') return lang === 'ar' ? arCount(n, 'ربع', 'ربعان', 'أرباع', 'ربعًا') : num(n, lang) + (n === 1 ? ' quarter' : ' quarters');
    return pagesText(n, lang);
  }
  // today's wird named by its juz or hizb: «الجزء ٥» / «الحزب ٩–١٠»
  function unitName(s, lang) {
    if (!s.to || s.unit === 'page') return '';
    var U = s.unit === 'juz' ? JZ : HZ, a = 0, b = 0;      // quarters: named by their hizb
    for (var i = 0; i < U.length; i++) { if (U[i] <= s.from) a = i + 1; if (U[i] <= s.to) b = i + 1; }
    return (s.unit === 'juz' ? L(lang).juz : L(lang).hz) + ' ' + num(a, lang) + (b > a ? '–' + num(b, lang) : '');
  }
  // the khatma's number, in words where Arabic has them: «الختمة الثالثة»
  var ORD = ['الأولى', 'الثانية', 'الثالثة', 'الرابعة', 'الخامسة', 'السادسة', 'السابعة', 'الثامنة', 'التاسعة', 'العاشرة'];
  function nth(n, lang) {
    if (lang === 'ar') return 'الختمة ' + (n <= 10 ? ORD[n - 1] : 'رقم ' + num(n, lang));
    return 'Khatma #' + n;
  }
  function nextNo() { return list().reduce(function (m, k) { return Math.max(m, k.no || 0); }, 0) + 1; }
  // the line on the Mushaf page: today's wird of the first khatma that has one
  function stripText(lang) {
    var l = L(lang), a = active();
    for (var i = 0; i < a.length; i++) {
      var s = stat(a[i]);
      if (s.to) return { k: a[i], h: l.today, v: l.p1 + ' ' + num(s.from, lang) + (s.to > s.from ? '–' + num(s.to, lang) : '') + ' · ' + esc(a[i].name), page: s.from };
    }
    return null;
  }

  // the settings page: the khatmas, and the form to make or change one
  function ui(el, o) {
    var lang = o.lang, l = L(lang);
    var draw = function () {
      var ls = list();
      // number the khatmas made before numbering existed
      var mx = ls.reduce(function (m, x) { return Math.max(m, x.no || 0); }, 0);
      ls.forEach(function (k) { if (!k.no) { k.no = ++mx; save(k); } });
      var fins = ls.filter(function (k) { return stat(k).fin; }).length;
      var h = ls.length ? '<div class="kh-sum"><b>' + num(fins, lang) + '</b><span>' + esc(l.finished) + '</span><b>' + num(ls.length, lang) + '</b><span>' + esc(l.started) + '</span></div>' : '<p class="kh-none">' + esc(l.none) + '</p>';
      ls.forEach(function (k) {
        var s = stat(k);
        var state = s.fin ? '<span class="kh-ok">' + esc(lang === 'ar' ? 'تمّت ' + nth(k.no || 1, lang) + '، تقبّل الله.' : l.done) + '</span>'
          : s.behind > 0 ? '<span class="kh-late">' + esc(l.behind) + ' ' + esc(pagesText(s.behind, lang)) + '</span>'
          : !s.isDay ? '<span>' + esc(l.rest) + '</span>'
          : s.left === 0 ? '<span class="kh-ok">' + esc(l.ahead) + '</span>' : '<span>' + esc(l.onTime) + '</span>';
        h += '<div class="kh-card' + (s.fin ? ' fin' : '') + '" style="--kc:' + esc(k.color || COLORS[0]) + '"><div class="kh-top"><i class="kh-no">' + num(k.no || 1, lang) + '</i><b>' + esc(k.name) + '</b>' +
          '<button type="button" class="kh-edit" data-e="' + k.id + '">' + esc(l.edit) + '</button></div>' +
          '<div class="kh-bar"><i style="width:' + s.pct + '%"></i></div>' +
          '<div class="kh-meta"><span>' + num(s.done, lang) + ' / ' + num(s.total, lang) + ' · ' + num(s.pct, lang) + '٪</span>' + state + '</div>' +
          (s.fin ? '' : '<div class="kh-today"><span><b>' + esc(l.today) + ':</b> ' + (s.to ? (unitName(s, lang) ? esc(unitName(s, lang)) + ' · ' : '') + esc(l.p1) + ' ' + num(s.from, lang) + (s.to > s.from ? '–' + num(s.to, lang) : '') : '—') + '</span>' +
            '<button type="button" class="kh-read" data-p="' + (s.first || k.from) + '">' + esc(s.done ? l.cont : l.read) + '</button></div>') +
          '<div class="kh-end">' + esc(l.wird) + ': ' + esc(s.unit === 'page' ? amountText(s.per, lang) : unitText(s.per, s.unit, lang)) + ' · ' + esc(l.ends) + ' ' + esc(hijri(s.end, lang)) + '</div></div>';
      });
      h += '<button type="button" class="kh-add">+ ' + esc(l.add) + '</button><p class="kh-note">' + esc(l.note) + '</p>';
      el.innerHTML = h;
      el.querySelector('.kh-add').onclick = pick;
      el.querySelectorAll('[data-e]').forEach(function (b) { b.onclick = function () { form(list().filter(function (x) { return x.id === b.dataset.e; })[0]); }; });
      el.querySelectorAll('.kh-read').forEach(function (b) { b.onclick = function () { o.close(); o.show(+b.dataset.p); }; });
    };
    // a new khatma: the usual ones by duration (the wird in quarters, hizbs or juz), or one of his own
    var PRE = [240, 120, 80, 60, 40, 30, 20, 15, 10, 7, 3];
    var preset = function (d) {
      var r = Math.ceil(240 / d), u = r % 8 === 0 ? 'juz' : r % 4 === 0 ? 'hizb' : 'rub';
      return { days: d, unit: u, n: u === 'juz' ? r / 8 : u === 'hizb' ? r / 4 : r, exact: 240 % d === 0 };
    };
    var pick = function () {
      var rowH = function (d) {
        var p = preset(d);
        return '<button type="button" class="kh-pre" data-pd="' + d + '"><span><b>' + esc(l.kDays) + ' ' + (lang === 'ar' ? arCount(d, 'يوم واحد', 'يومين', 'أيام', 'يومًا') : num(d, lang) + ' days') + '</b>' +
          '<small>' + esc(l.daily) + ': ' + esc(unitText(p.n, p.unit, lang)) + (p.exact ? '' : ' ' + esc(l.approx)) + '</small></span><i>‹</i></button>';
      };
      el.innerHTML = '<div class="kh-pick"><div class="kh-pt">' + esc(l.sugg) + '</div><div class="kh-pcard">' + [30, 60].map(rowH).join('') + '</div>' +
        '<div class="kh-pt">' + esc(l.all) + '</div><div class="kh-pcard">' + PRE.map(rowH).join('') +
        '<button type="button" class="kh-pre kh-own"><span><b>' + esc(l.custom) + '</b><small>' + esc(l.customS) + '</small></span><i>‹</i></button></div>' +
        '<button type="button" class="kh-cancel">' + esc(l.cancel) + '</button></div>';
      el.querySelectorAll('[data-pd]').forEach(function (b) {
        b.onclick = function () { var p = preset(+b.dataset.pd); form(null, { unit: p.unit, n: p.n, days: p.days }); };
      });
      el.querySelector('.kh-own').onclick = function () { form(null); };
      el.querySelector('.kh-cancel').onclick = draw;
      el.scrollTop = 0; if (el.parentNode) el.parentNode.scrollTop = 0;
    };
    var form = function (k0, pre) {
      map().then(function (mm) {
        var no0 = k0 && k0.no || nextNo();
        var k = k0 ? JSON.parse(JSON.stringify(k0)) : { id: uid(), no: no0, name: nth(no0, lang), color: COLORS[(no0 - 1) % COLORS.length], unit: 'juz', n: 1, from: 1, to: 604,
          days: 30, rdays: 127, start: ymd(new Date()), remind: { on: false, time: '20:00' }, done: [] };
        if (pre) Object.assign(k, pre);
        // an older khatma of part of the Mushaf keeps its range, divided by pages
        var whole = k.from === 1 && k.to === 604;
        if (!whole || ['juz', 'hizb', 'rub', 'page'].indexOf(k.unit) < 0) k.unit = 'page';
        el.innerHTML = '<div class="kh-form">' +
          '<div class="kh-colors">' + COLORS.map(function (c) { return '<button type="button" data-c="' + c + '" style="--kc:' + c + '"' + (c === k.color ? ' class="on"' : '') + '></button>'; }).join('') + '</div>' +
          '<input class="kh-name" maxlength="40" value="' + esc(k.name) + '" aria-label="' + esc(l.name) + '">' +
          '<div class="kh-l">' + esc(l.range) + '</div>' +
          '<div class="kh-seg">' + (whole ? ['juz', 'hizb', 'rub', 'page'] : ['page']).map(function (u, i) { return '<button type="button" data-u="' + u + '"' + (u === k.unit ? ' class="on"' : '') + '>' + esc(l.by[['juz', 'hizb', 'rub', 'page'].indexOf(u)]) + '</button>'; }).join('') + '</div>' +
          '<div class="kh-row"><span>' + esc(l.days) + '</span><span class="kh-step"><button type="button" data-d="1">+</button><input class="kh-days" type="number" inputmode="numeric" min="1" max="3650"><button type="button" data-d="-1">−</button></span></div>' +
          '<div class="kh-row kh-rdays"><span>' + esc(l.rdays) + '</span><span class="kh-wd">' + l.wd.map(function (w, i) { return '<button type="button" data-w="' + i + '">' + esc(w) + '</button>'; }).join('') + '</span></div>' +
          '<div class="kh-row"><span>' + esc(l.wird) + '</span><span class="kh-step"><button type="button" data-a="1">+</button><b class="kh-amt"></b><button type="button" data-a="-1">−</button></span></div>' +
          '<div class="kh-row"><span>' + esc(l.start) + '</span><input class="kh-start" type="date"></div>' +
          '<div class="kh-row"><span>' + esc(l.remind) + '</span><span class="kh-rem"><input class="kh-time" type="time"><input class="kh-on" type="checkbox"></span></div>' +
          '<p class="kh-push"></p>' +
          '<div class="kh-btns"><button type="button" class="kh-save">' + esc(k0 ? l.saveB : l.create) + '</button><button type="button" class="kh-cancel">' + esc(l.cancel) + '</button>' +
          (k0 ? '<button type="button" class="kh-del">' + esc(l.del) + '</button>' : '') + '</div></div>';
        var $ = function (s) { return el.querySelector(s); };
        var dI = $('.kh-days');
        var U = function () { return bounds(k.unit); };
        var total = function () { return U() ? U().length : k.to - k.from + 1; };       // in the khatma's unit
        var nSlots = function () { return slots(k).length; };
        var show = function () {
          dI.value = String(k.days);
          el.querySelectorAll('.kh-wd button').forEach(function (b) { b.classList.toggle('on', !!((k.rdays >> +b.dataset.w) & 1)); });
          var per = Math.ceil(total() / nSlots());
          if (U()) k.n = per;
          $('.kh-amt').textContent = (U() ? unitText(per, k.unit, lang) : amountText(per, lang)) + ' ' + l.perDay;
        };
        // the duration that gives a wird of np units a day
        var daysFor = function (np) {
          var want = Math.max(1, Math.ceil(total() / np)), perWeek = 0;     // reading days needed
          for (var i = 0; i < 7; i++) if ((k.rdays >> i) & 1) perWeek++;
          k.days = Math.max(1, Math.ceil(want * 7 / perWeek));
          while (k.days > 1 && slots(Object.assign({}, k, { days: k.days - 1 })).length >= want) k.days--;
        };
        show();
        $('.kh-start').value = k.start; $('.kh-time').value = k.remind.time; $('.kh-on').checked = !!k.remind.on;
        el.querySelectorAll('[data-c]').forEach(function (b) { b.onclick = function () { k.color = b.dataset.c; el.querySelectorAll('[data-c]').forEach(function (x) { x.classList.toggle('on', x === b); }); }; });
        el.querySelectorAll('[data-u]').forEach(function (b) {
          b.onclick = function () {
            k.unit = b.dataset.u; el.querySelectorAll('[data-u]').forEach(function (x) { x.classList.toggle('on', x === b); });
            if (U()) daysFor(Math.max(1, Math.round(total() / nSlots())));       // a whole number of juz or hizb a day
            show();
          };
        });
        el.querySelectorAll('[data-d]').forEach(function (b) { b.onclick = function () { k.days = Math.max(1, Math.min(3650, k.days + +b.dataset.d)); show(); }; });
        dI.onchange = function () { k.days = Math.max(1, Math.min(3650, +dI.value || 1)); show(); };
        el.querySelectorAll('[data-w]').forEach(function (b) {
          b.onclick = function () { var nb = k.rdays ^ (1 << +b.dataset.w); if (nb) { k.rdays = nb; show(); } };
        });
        // the daily portion up or down: the duration follows (one page; a juz when the portion is a juz or more)
        el.querySelectorAll('[data-a]').forEach(function (b) {
          b.onclick = function () {
            var per = Math.ceil(total() / nSlots()), up = +b.dataset.a > 0, np;
            if (U()) np = Math.max(1, Math.min(total(), per + (up ? 1 : -1)));
            else if (per >= 19) { var j = Math.round(per / 20) + (up ? 1 : -1); np = j >= 1 ? j * 20 : 15; }
            else np = Math.max(1, per + (up ? 1 : -1));
            daysFor(np); show();
          };
        });
        var pushNote = function () {
          var P = window.LtPush, el2 = $('.kh-push');
          if (!P || !$('.kh-on').checked) { el2.textContent = ''; return; }
          el2.textContent = P.hint(lang);
        };
        $('.kh-on').onchange = pushNote; pushNote();
        $('.kh-cancel').onclick = draw;
        if ($('.kh-del')) $('.kh-del').onclick = function () { if (confirm(l.delAsk)) { remove(k.id); if (window.LtPush) window.LtPush.sync(); draw(); } };
        $('.kh-save').onclick = function () {
          k.name = $('.kh-name').value.trim() || l.mine;
          k.start = $('.kh-start').value || ymd(new Date());
          k.remind = { on: $('.kh-on').checked, time: $('.kh-time').value || '20:00' };
          if (k0 && (k0.from !== k.from || k0.to !== k.to)) k.done = (k.done || []).filter(function (p) { return p >= k.from && p <= k.to; });
          save(k);
          var after = function () { draw(); if (window.LtPush) window.LtPush.sync(); };
          if (k.remind.on && window.LtPush) window.LtPush.enable(lang).then(after, after); else after();
        };
      });
    };
    draw();
    pull().then(draw);
  }

  window.Khatma = { list: list, save: save, remove: remove, done: done, stat: stat, active: active, ui: ui, stripText: stripText, pull: pull, slots: slots };
  window.addEventListener('lt-page', function (e) { if (e.detail && e.detail.page) done(+e.detail.page); });
})();
