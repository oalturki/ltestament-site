/* Reading statistics (إحصاءات القراءة): pages, words and letters, by day, week, month and year, from three sources:
     read    — a Mushaf page (plain or tajweed) that stayed open 20 seconds (ReadStats.mark(page)); while the audio plays
               or the microphone listens the page is not timed, those count themselves:
     listen  — each ayah heard to its end, every repetition too (memorization, repeat) (ReadStats.ayah(s, a, 'listen'))
     recite  — each word recited right to the microphone (ReadStats.word(text, page)), and each ayah repeated after
               the reciter in talqeen (ReadStats.ayah(s, a, 'recite'))
   Pages: a page read counts 1; heard or recited text counts the share of its page's letters.
   The session (this visit; after 30 minutes away a new one) is counted on its own and shown on the page.

   Kept on this device for everyone (localStorage), and in the family account for the profile in use
   (table reading_stats: one row per profile, day and source; added to by the function add_reading).
   Words and letters per page: data/page-stats.json; per ayah: data/text-simple/<surah>.json (written letters,
   without harakat — tools/build_page_stats.py counts the same way).

   Time: the minutes the Mushaf was open in front of the reader (ReadStats.time(seconds), the page counting while shown),
   kept with the day's reading (fourth figure; the account's column reading_stats.seconds).

   ReadStats.mark(page) / .ayah(s, a, kind) / .word(text, page, kind) / .time(seconds)    count
   ReadStats.session()                  {pages, words, letters} of this session
   ReadStats.sum(profileId?)            -> Promise<{day, week, month, year}> each {pages, words, letters, by:{read, listen, recite}}
   ReadStats.sumMany([ids])             -> Promise<{id: {...}}> (one query, for the account page)
   ReadStats.html(sum, lang) / .wire(el) / .line(sum, lang) / .sessLine(session, lang) */
(function () {
  var load = function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } };
  var store = function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} };
  var KINDS = ['read', 'listen', 'recite'];
  var LET = /[ء-غف-يٱ]/g;
  function letters(t) { return ((t || '').match(LET) || []).length; }

  var PS = null, MP = null, TX = {};
  function pageStats() {
    if (!PS) PS = fetch('/data/page-stats.json').then(function (r) { return r.json(); }).catch(function () { PS = null; return []; });
    return PS;
  }
  function pageMap() {
    if (!MP) MP = fetch('/data/quran-pages.json').then(function (r) { return r.json(); }).catch(function () { MP = null; return null; });
    return MP;
  }
  function text(s) {
    if (!TX[s]) TX[s] = fetch('/data/text-simple/' + s + '.json').then(function (r) { return r.json(); }).catch(function () { delete TX[s]; return []; });
    return TX[s];
  }
  function pageOf(m, s, a) {
    var P = m.pages;
    for (var i = 0; i < P.length; i++) {
      var r = P[i];
      if ((s > r[0] || (s === r[0] && a >= r[1])) && (s < r[2] || (s === r[2] && a <= r[3]))) return i + 1;
    }
    return 0;
  }

  function ymd(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function today() { return ymd(new Date()); }
  function daysAgo(n) { var d = new Date(); d.setDate(d.getDate() - n); return ymd(d); }
  function prof() {
    var F = window.Fam;
    if (F && F.current) return F.current();
    try { return JSON.parse(load('lt_profile') || 'null'); } catch (e) { return null; }   // before family.js has loaded
  }
  // this device: {day: {kind: [pages, words, letters]}}
  function key(id) { return 'lt_rs_' + (id || 'me'); }
  function local(id) { try { return JSON.parse(load(key(id)) || '{}') || {}; } catch (e) { return {}; } }

  // the family account: additions waiting to be saved, added to the day's row by add_reading
  var pend = {}, timer = null;
  function addTo(map, k, id, d, kind, v) {
    var q = map[k] || (map[k] = { id: id, d: d, kind: kind, v: [0, 0, 0, 0] });
    q.v[0] += v[0]; q.v[1] += v[1]; q.v[2] += v[2]; q.v[3] = (q.v[3] || 0) + (v[3] || 0);
  }
  function push() {
    timer = null;
    var F = window.Fam;
    if (!F || !F.ready) { timer = setTimeout(push, 5000); return; }     // family.js not loaded yet: try again shortly
    var jobs = pend; pend = {};
    F.ready().then(function (c) {
      if (!c) return;
      Object.keys(jobs).forEach(function (k) {
        var j = jobs[k];
        c.rpc('add_reading', { p_profile: j.id, p_d: j.d, p_kind: j.kind, p_pages: Math.round(j.v[0] * 100) / 100, p_words: Math.round(j.v[1]), p_letters: Math.round(j.v[2]), p_seconds: Math.round(j.v[3] || 0) })
          .then(function (r) { if (r.error) throw r.error; })
          .catch(function () { addTo(pend, k, j.id, j.d, j.kind, j.v); if (!timer) timer = setTimeout(push, 30000); });   // keep it for the next try
      });
    }).catch(function () {});
  }

  // the session: this visit; after 30 minutes away the next count starts a new one
  var SK = 'lt_read_sess', GAP = 30 * 60 * 1000;
  function sessGet() {
    var o = null; try { o = JSON.parse(sessionStorage.getItem(SK) || 'null'); } catch (e) {}
    if (!o || Date.now() - (o.t || 0) > GAP) o = { pages: 0, words: 0, letters: 0, secs: 0, t: Date.now() };
    return o;
  }
  function session() { var o = sessGet(); return { pages: o.pages, words: o.words, letters: o.letters, secs: o.secs || 0 }; }

  // add [pages, words, letters] of one source: to this device's day, the account, and the session
  var flashT = null;
  function add(kind, v) {
    if (!(v[2] > 0 || v[0] > 0 || v[3] > 0)) return;
    var p = prof(), id = p && p.id, d = today(), log = local(id);
    var day = log[d] || (log[d] = {}), x = day[kind] || (day[kind] = [0, 0, 0, 0]);
    x[0] = Math.round((x[0] + v[0]) * 100) / 100; x[1] += v[1]; x[2] += v[2]; x[3] = (x[3] || 0) + (v[3] || 0);
    var cut = daysAgo(400);
    Object.keys(log).forEach(function (k) { if (k < cut) delete log[k]; });
    store(key(id), JSON.stringify(log));
    if (id) { addTo(pend, id + d + kind, id, d, kind, v); if (!timer) timer = setTimeout(push, 5000); }
    var o = sessGet();
    o.pages = Math.round((o.pages + v[0]) * 100) / 100; o.words += v[1]; o.letters += v[2]; o.secs = (o.secs || 0) + (v[3] || 0); o.t = Date.now();
    try { sessionStorage.setItem(SK, JSON.stringify(o)); } catch (e) {}
    if (!(v[2] > 0 || v[0] > 0)) return;                 // time alone: no event (the page shows its own clock)
    // one event for a burst of words (recitation), so the counter on the page updates once
    clearTimeout(flashT);
    flashT = setTimeout(function () {
      try { window.dispatchEvent(new CustomEvent('lt-read', { detail: { kind: kind, session: session() } })); } catch (e) {}
    }, kind === 'read' ? 0 : 400);
  }

  // a page is done (for khatmas: window event 'lt-page') when read, or when nine tenths of its letters were heard or recited
  var acc = {};
  function pageDone(page) { try { window.dispatchEvent(new CustomEvent('lt-page', { detail: { page: page } })); } catch (e) {} }
  function accrue(page, l, pl) {
    if (!page || acc[page] === -1) return;
    acc[page] = (acc[page] || 0) + l;
    if (acc[page] >= 0.9 * pl) { acc[page] = -1; pageDone(page); setTimeout(function () { delete acc[page]; }, 60000); }
  }
  function mark(page) {
    page = +page; if (!(page >= 1 && page <= 604)) return Promise.resolve(false);
    return pageStats().then(function (ps) { var s = ps[page - 1] || [0, 0]; add('read', [1, s[0], s[1]]); pageDone(page); return true; });
  }
  // time with the Mushaf open (seconds), added to the day's reading
  function time(sec) { sec = Math.round(sec); if (sec > 0 && sec <= 3600) add('read', [0, 0, 0, sec]); }
  // an ayah heard or repeated: its words and letters, and its share of its page
  function ayah(s, a, kind) {
    return Promise.all([text(s), pageMap(), pageStats()]).then(function (r) {
      var t = r[0][a - 1]; if (!t) return;
      var l = letters(t), pg = r[1] ? pageOf(r[1], s, a) : 0, pl = pg && r[2][pg - 1] ? r[2][pg - 1][1] : 548;
      add(kind || 'listen', [l / pl, t.split(/\s+/).length, l]);
      if (kind !== 'recite') accrue(pg, l, pl);
    }).catch(function () {});
  }
  // a word recited right
  function word(t, page, kind) {
    return pageStats().then(function (ps) {
      var l = letters(t), pl = page && ps[page - 1] ? ps[page - 1][1] : 548;
      add(kind || 'recite', [l / pl, 1, l]);
      accrue(page, l, pl);
    }).catch(function () {});
  }

  // days -> the four periods, each with its sources
  function periods(days) {
    var t = today(), w = daysAgo(6), m = daysAgo(29), y = daysAgo(364);
    var z = function () { return { pages: 0, words: 0, letters: 0, secs: 0, by: { read: 0, listen: 0, recite: 0 } }; };
    var out = { day: z(), week: z(), month: z(), year: z() };
    Object.keys(days).forEach(function (d) {
      if (d < y || !days[d] || Array.isArray(days[d])) return;
      KINDS.forEach(function (k) {
        var v = days[d][k]; if (!v) return;
        var addv = function (o) { o.pages += v[0]; o.words += v[1]; o.letters += v[2]; o.secs += v[3] || 0; o.by[k] += v[2]; };
        addv(out.year);
        if (d >= m) addv(out.month);
        if (d >= w) addv(out.week);
        if (d === t) addv(out.day);
      });
    });
    return out;
  }
  // a profile: what the account holds, with what this device has not saved yet; if the account can't be reached, this device's log
  function days(id, rem) {
    if (!id || !rem) return local(id);
    var o = JSON.parse(JSON.stringify(rem));
    Object.keys(pend).forEach(function (k) {
      var j = pend[k]; if (j.id !== id) return;
      var day = o[j.d] || (o[j.d] = {}), x = day[j.kind] || (day[j.kind] = [0, 0, 0, 0]);
      x[0] += j.v[0]; x[1] += j.v[1]; x[2] += j.v[2]; x[3] = (x[3] || 0) + (j.v[3] || 0);
    });
    return o;
  }
  function remote(ids) {
    var F = window.Fam;
    if (!ids.length || !F || !F.ready) return Promise.resolve(null);
    return F.ready().then(function (c) {
      if (!c) return null;
      return c.from('reading_stats').select('profile_id,d,kind,pages,words,letters,seconds').in('profile_id', ids).gte('d', daysAgo(364)).then(function (r) {
        if (r.error) return null;
        var by = {};
        ids.forEach(function (i) { by[i] = {}; });
        (r.data || []).forEach(function (x) {
          var p = by[x.profile_id] || (by[x.profile_id] = {}), day = p[x.d] || (p[x.d] = {});
          day[x.kind] = [+x.pages || 0, x.words || 0, x.letters || 0, x.seconds || 0];
        });
        return by;
      });
    }).catch(function () { return null; });
  }
  function sum(id) {
    if (id === undefined) { var p = prof(); id = p && p.id; }
    return (id ? remote([id]) : Promise.resolve(null)).then(function (r) { return periods(days(id, r && r[id])); });
  }
  function sumMany(ids) {
    return remote(ids).then(function (r) {
      var o = {};
      ids.forEach(function (id) { o[id] = periods(days(id, r && r[id])); });
      return o;
    });
  }

  var T = {
    ar: { title: 'قراءتي', tabs: ['اليوم', 'الأسبوع', 'الشهر', 'السنة'], u: ['صفحات', 'كلمات', 'أحرف'], by: ['قراءة', 'استماع', 'تسميع'],
      h: '«من قرأ حرفًا من كتاب الله فله به حسنة، والحسنة بعشر أمثالها» — رواه الترمذي.', note: 'تُحتسب الصفحة إذا بقيت مفتوحة ٢٠ ثانية، والاستماع بكل آية تُسمع، والتسميع بكل كلمة صحيحة. والعدد تقريبي.' },
    en: { title: 'My reading', tabs: ['Today', 'Week', 'Month', 'Year'], u: ['pages', 'words', 'letters'], by: ['reading', 'listening', 'reciting'],
      h: '“Whoever reads a letter of the Book of Allah has a good deed for it, and a good deed is multiplied tenfold.” — at-Tirmidhi.', note: 'A page counts after 20 seconds open; listening, each ayah heard; reciting, each word said right. Approximate.' },
    ur: { title: 'میری تلاوت', tabs: ['آج', 'ہفتہ', 'مہینہ', 'سال'], u: ['صفحات', 'الفاظ', 'حروف'], by: ['پڑھنا', 'سننا', 'سنانا'],
      h: '«جس نے کتاب اللہ کا ایک حرف پڑھا اس کے لیے ایک نیکی ہے، اور نیکی دس گنا ہے» — ترمذی۔', note: 'صفحہ ۲۰ سیکنڈ کھلا رہے تو شمار ہوتا ہے؛ سننے میں ہر سنی ہوئی آیت، سنانے میں ہر صحیح لفظ۔ تعداد تقریبی ہے۔' },
    fr: { title: 'Ma lecture', tabs: ['Aujourd’hui', 'Semaine', 'Mois', 'Année'], u: ['pages', 'mots', 'lettres'], by: ['lecture', 'écoute', 'récitation'],
      h: '« Quiconque lit une lettre du Livre d’Allah obtient une bonne action, et la bonne action est décuplée. » — at-Tirmidhi.', note: 'Une page compte après 20 secondes ouverte ; l’écoute, chaque verset entendu ; la récitation, chaque mot juste. Approximatif.' },
    es: { title: 'Mi lectura', tabs: ['Hoy', 'Semana', 'Mes', 'Año'], u: ['páginas', 'palabras', 'letras'], by: ['lectura', 'escucha', 'recitación'],
      h: '«Quien lee una letra del Libro de Allah obtiene por ella una buena obra, y la buena obra se multiplica por diez.» — at-Tirmidhi.', note: 'Una página cuenta tras 20 segundos abierta; la escucha, cada aleya oída; la recitación, cada palabra correcta. Aproximado.' },
    ru: { title: 'Моё чтение', tabs: ['Сегодня', 'Неделя', 'Месяц', 'Год'], u: ['стр.', 'слов', 'букв'], by: ['чтение', 'слушание', 'чтение вслух'],
      h: '«Кто прочтёт букву из Книги Аллаха, тому за неё доброе дело, а доброе дело — десятикратно». — ат-Тирмизи.', note: 'Страница засчитывается через 20 секунд; слушание — каждый услышанный аят; чтение вслух — каждое верное слово. Приблизительно.' }
  };
  var SESS = { ar: 'هذه الجلسة', en: 'This session', ur: 'یہ نشست', fr: 'Cette séance', es: 'Esta sesión', ru: 'Этот сеанс' };
  var AR = '٠١٢٣٤٥٦٧٨٩';
  function fmt(n, lang, dec) {
    var v = dec ? Math.round(n * 10) / 10 : Math.round(n);
    var s = v.toLocaleString('en-US', { maximumFractionDigits: dec ? 1 : 0 });
    if (lang === 'ar') s = s.replace(/[0-9]/g, function (d) { return AR[d]; }).replace(/,/g, '٬').replace(/\./g, '٫');
    return s;
  }
  // a length of time: «٤٥ د» under an hour, «٢:١٥ س» from an hour (hours:minutes)
  var TM = { ar: 'الوقت', en: 'time', ur: 'وقت', fr: 'temps', es: 'tiempo', ru: 'время' };
  function dur(sec, lang) {
    var m = Math.round(sec / 60), h = Math.floor(m / 60);
    var t = h ? h + ':' + ('0' + (m % 60)).slice(-2) : String(m);
    if (lang === 'ar') t = t.replace(/[0-9]/g, function (d) { return AR[d]; });
    return t + ' ' + ({ ar: h ? 'س' : 'د', en: h ? 'h' : 'min', ur: h ? 'گھنٹے' : 'منٹ', fr: h ? 'h' : 'min', es: h ? 'h' : 'min', ru: h ? 'ч' : 'мин' }[lang] || (h ? 'h' : 'min'));
  }
  function pgFmt(n, lang) { return fmt(n, lang, Math.abs(n - Math.round(n)) > 0.05); }
  function html(s, lang) {
    var L = T[lang] || T.en, ks = ['day', 'week', 'month', 'year'];
    return '<div class="rs-card"><div class="rs-head"><b>' + L.title + '</b><div class="rs-tabs">' +
      ks.map(function (k, i) { return '<button type="button" data-k="' + k + '"' + (k === 'week' ? ' class="on"' : '') + '>' + L.tabs[i] + '</button>'; }).join('') +
      '</div></div>' +
      ks.map(function (k) {
        var o = s[k];
        return '<div class="rs-per" data-k="' + k + '"' + (k === 'week' ? '' : ' hidden') + '><div class="rs-nums">' +
          [pgFmt(o.pages, lang), fmt(o.words, lang), fmt(o.letters, lang)].map(function (v, i) { return '<span><b>' + v + '</b><small>' + L.u[i] + '</small></span>'; }).join('') +
          (o.secs ? '<span><b>' + dur(o.secs, lang) + '</b><small>' + (TM[lang] || TM.en) + '</small></span>' : '') +
          '</div>' + (o.letters ? '<div class="rs-by">' + KINDS.map(function (kk, i) {
            return o.by[kk] ? '<span>' + L.by[i] + ': ' + fmt(o.by[kk], lang) + ' ' + L.u[2] + '</span>' : '';
          }).join('') + '</div>' : '') + '</div>';
      }).join('') +
      '<p class="rs-h">' + L.h + '</p><p class="rs-note">' + L.note + '</p></div>';
  }
  function wire(el) {
    if (!el) return;
    el.querySelectorAll('.rs-tabs button').forEach(function (b) {
      b.onclick = function (e) {
        e.stopPropagation();
        var k = b.getAttribute('data-k');
        el.querySelectorAll('.rs-tabs button').forEach(function (x) { x.classList.toggle('on', x === b); });
        el.querySelectorAll('.rs-per').forEach(function (x) { x.hidden = x.getAttribute('data-k') !== k; });
      };
    });
  }
  // the session, shown on the page: pages and letters
  function sessLine(o, lang) {
    var L = T[lang] || T.en, pg = pgFmt(o.pages, lang);
    // Arabic: the word before the number (no agreement of number and noun to get wrong)
    if (lang === 'ar') return 'هذه الجلسة — الصفحات: ' + pg + ' · الأحرف: ' + fmt(o.letters, lang);
    return (SESS[lang] || SESS.en) + ': ' + pg + ' ' + L.u[0] + ' · ' + fmt(o.letters, lang) + ' ' + L.u[2];
  }
  // a short line for a profile card: this week's pages and letters
  function line(s, lang) {
    var L = T[lang] || T.en, w = s.week, pg = pgFmt(w.pages, lang);
    if (lang === 'ar') return 'الأسبوع — الصفحات: ' + pg + ' · الأحرف: ' + fmt(w.letters, lang);
    return L.tabs[1] + ': ' + pg + ' ' + L.u[0] + ' · ' + fmt(w.letters, lang) + ' ' + L.u[2];
  }
  window.ReadStats = { mark: mark, ayah: ayah, word: word, time: time, session: session, sum: sum, sumMany: sumMany,
    html: html, wire: wire, line: line, sessLine: sessLine, fmt: fmt, dur: dur, pageStats: pageStats };
})();
