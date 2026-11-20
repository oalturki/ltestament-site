/* Reading statistics (إحصاءات القراءة): the Mushaf pages read, and their words and letters, by day, week, month, year.

   A page counts each time it stays open long enough to be read (the Mushaf calls ReadStats.mark(page)); a page read
   again later counts again. The session (this visit, until 30 minutes away) is counted on its own and shown on the
   page while reading; it starts from zero each time.
   Kept on this device for everyone (localStorage), and in the family account for the profile in use (table
   reading_log: one row per profile per day, the pages). Words and letters come from data/page-stats.json
   (built by tools/build_page_stats.py from the simple text: written letters, without harakat).

   ReadStats.mark(page)                 count a page read (for the profile in use, or for this device)
   ReadStats.session()                  {pages, words, letters} read in this session
   ReadStats.sum(profileId?)            -> Promise<{day, week, month, year}> each {pages, words, letters}
   ReadStats.sumMany([ids])             -> Promise<{id: {day, week, month, year}}> (one query, for the account page)
   ReadStats.html(sum, lang)            the card: four periods to switch between, three numbers, and the hadith
   ReadStats.wire(el)                   make the period tabs of a card work */
(function () {
  var load = function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } };
  var store = function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} };
  var PS = null;
  function pageStats() {
    if (!PS) PS = fetch('/data/page-stats.json').then(function (r) { return r.json(); }).catch(function () { PS = null; return []; });
    return PS;
  }
  function ymd(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function today() { return ymd(new Date()); }
  function daysAgo(n) { var d = new Date(); d.setDate(d.getDate() - n); return ymd(d); }
  function prof() {
    var F = window.Fam;
    if (F && F.current) return F.current();
    try { return JSON.parse(load('lt_profile') || 'null'); } catch (e) { return null; }   // before family.js has loaded
  }
  function key(id) { return 'lt_read_' + (id || 'me'); }
  function local(id) { try { return JSON.parse(load(key(id)) || '{}') || {}; } catch (e) { return {}; } }
  function saveLocal(id, log) {
    var cut = daysAgo(400);
    Object.keys(log).forEach(function (d) { if (d < cut) delete log[d]; });
    store(key(id), JSON.stringify(log));
  }

  // the family account: the pages read since the last save are added to today's row (another device may add too)
  var pend = {}, timer = null;
  function push() {
    timer = null;
    var F = window.Fam;
    if (!F || !F.ready) { timer = setTimeout(push, 5000); return; }     // family.js not loaded yet: try again shortly
    var jobs = pend; pend = {};
    F.ready().then(function (c) {
      if (!c) return;
      Object.keys(jobs).forEach(function (k) {
        var j = jobs[k];
        c.from('reading_log').select('pages').eq('profile_id', j.id).eq('d', j.d).maybeSingle().then(function (r) {
          var all = ((r.data && r.data.pages) || []).concat(j.pages).slice(-3000);
          return c.from('reading_log').upsert({ profile_id: j.id, d: j.d, pages: all, updated_at: new Date().toISOString() }, { onConflict: 'profile_id,d' });
        }).then(function (r) { if (r && r.error) throw r.error; }).catch(function () {
          var q = pend[k] || (pend[k] = { id: j.id, d: j.d, pages: [] }); q.pages = j.pages.concat(q.pages);   // keep for the next try
        });
      });
    }).catch(function () {});
  }

  // the session: this visit; after 30 minutes away the next page read starts a new one
  var SK = 'lt_read_sess', GAP = 30 * 60 * 1000;
  function sessGet() {
    var o = null; try { o = JSON.parse(sessionStorage.getItem(SK) || 'null'); } catch (e) {}
    if (!o || Date.now() - (o.t || 0) > GAP) o = { pages: 0, words: 0, letters: 0, t: Date.now() };
    return o;
  }
  function session() { var o = sessGet(); return { pages: o.pages, words: o.words, letters: o.letters }; }

  function mark(page) {
    page = +page; if (!(page >= 1 && page <= 604)) return false;
    var p = prof(), id = p && p.id, d = today(), log = local(id);
    (log[d] || (log[d] = [])).push(page); saveLocal(id, log);
    if (id) {
      var q = pend[id + d] || (pend[id + d] = { id: id, d: d, pages: [] }); q.pages.push(page);
      if (!timer) timer = setTimeout(push, 3000);
    }
    return pageStats().then(function (ps) {
      var st = ps[page - 1] || [0, 0], o = sessGet();
      o.pages++; o.words += st[0]; o.letters += st[1]; o.t = Date.now();
      try { sessionStorage.setItem(SK, JSON.stringify(o)); } catch (e) {}
      try { window.dispatchEvent(new CustomEvent('lt-read', { detail: { page: page, words: st[0], letters: st[1], session: session() } })); } catch (e) {}
      return true;
    });
  }

  // days -> {pages: [..]} -> the four periods
  function periods(days, ps) {
    var t = today(), w = daysAgo(6), m = daysAgo(29), y = daysAgo(364);
    var z = function () { return { pages: 0, words: 0, letters: 0 }; };
    var out = { day: z(), week: z(), month: z(), year: z() };
    Object.keys(days).forEach(function (d) {
      if (d < y) return;
      days[d].forEach(function (pg) {
        var s = ps[pg - 1] || [0, 0];
        var add = function (o) { o.pages++; o.words += s[0]; o.letters += s[1]; };
        add(out.year);
        if (d >= m) add(out.month);
        if (d >= w) add(out.week);
        if (d === t) add(out.day);
      });
    });
    return out;
  }
  // a profile: what the account holds, with what this device has not saved yet; if the account can't be reached, this device's log
  function days(id, rem) {
    if (!id || !rem) return local(id);
    var o = {};
    Object.keys(rem).forEach(function (d) { o[d] = rem[d].slice(); });
    Object.keys(pend).forEach(function (k) { var j = pend[k]; if (j.id === id) o[j.d] = (o[j.d] || []).concat(j.pages); });
    return o;
  }
  function remote(ids) {
    var F = window.Fam;
    if (!ids.length || !F || !F.ready) return Promise.resolve({});
    return F.ready().then(function (c) {
      if (!c) return null;
      return c.from('reading_log').select('profile_id,d,pages').in('profile_id', ids).gte('d', daysAgo(364)).then(function (r) {
        if (r.error) return null;
        var by = {};
        ids.forEach(function (i) { by[i] = {}; });
        (r.data || []).forEach(function (x) { (by[x.profile_id] || (by[x.profile_id] = {}))[x.d] = x.pages || []; });
        return by;
      });
    }).catch(function () { return null; });
  }
  function sum(id) {
    if (id === undefined) { var p = prof(); id = p && p.id; }
    return Promise.all([pageStats(), id ? remote([id]) : Promise.resolve(null)]).then(function (r) {
      return periods(days(id, r[1] && r[1][id]), r[0]);
    });
  }
  function sumMany(ids) {
    return Promise.all([pageStats(), remote(ids)]).then(function (r) {
      var o = {};
      ids.forEach(function (id) { o[id] = periods(days(id, r[1] && r[1][id]), r[0]); });
      return o;
    });
  }

  var T = {
    ar: { title: 'قراءتي', tabs: ['اليوم', 'الأسبوع', 'الشهر', 'السنة'], u: ['صفحة', 'كلمة', 'حرفًا'],
      h: '«من قرأ حرفًا من كتاب الله فله به حسنة، والحسنة بعشر أمثالها» — رواه الترمذي.', note: 'تُحتسب الصفحة كلما بقيت مفتوحة مدةً تكفي لقراءتها. والعدد تقريبي.' },
    en: { title: 'My reading', tabs: ['Today', 'Week', 'Month', 'Year'], u: ['pages', 'words', 'letters'],
      h: '“Whoever reads a letter of the Book of Allah has a good deed for it, and a good deed is multiplied tenfold.” — at-Tirmidhi.', note: 'A page counts each time it stays open long enough to be read. The numbers are approximate.' },
    ur: { title: 'میری تلاوت', tabs: ['آج', 'ہفتہ', 'مہینہ', 'سال'], u: ['صفحات', 'الفاظ', 'حروف'],
      h: '«جس نے کتاب اللہ کا ایک حرف پڑھا اس کے لیے ایک نیکی ہے، اور نیکی دس گنا ہے» — ترمذی۔', note: 'صفحہ ہر بار شمار ہوتا ہے جب پڑھنے کے لیے کافی دیر کھلا رہے۔ تعداد تقریبی ہے۔' },
    fr: { title: 'Ma lecture', tabs: ['Aujourd’hui', 'Semaine', 'Mois', 'Année'], u: ['pages', 'mots', 'lettres'],
      h: '« Quiconque lit une lettre du Livre d’Allah obtient une bonne action, et la bonne action est décuplée. » — at-Tirmidhi.', note: 'Une page compte chaque fois qu’elle reste ouverte assez longtemps pour être lue. Chiffres approximatifs.' },
    es: { title: 'Mi lectura', tabs: ['Hoy', 'Semana', 'Mes', 'Año'], u: ['páginas', 'palabras', 'letras'],
      h: '«Quien lee una letra del Libro de Allah obtiene por ella una buena obra, y la buena obra se multiplica por diez.» — at-Tirmidhi.', note: 'Una página cuenta cada vez que queda abierta el tiempo suficiente para leerla. Cifras aproximadas.' },
    ru: { title: 'Моё чтение', tabs: ['Сегодня', 'Неделя', 'Месяц', 'Год'], u: ['стр.', 'слов', 'букв'],
      h: '«Кто прочтёт букву из Книги Аллаха, тому за неё доброе дело, а доброе дело — десятикратно». — ат-Тирмизи.', note: 'Страница засчитывается каждый раз, когда открыта достаточно долго для чтения. Числа приблизительны.' }
  };
  var SESS = { ar: 'هذه الجلسة', en: 'This session', ur: 'یہ نشست', fr: 'Cette séance', es: 'Esta sesión', ru: 'Этот сеанс' };
  var AR = '٠١٢٣٤٥٦٧٨٩';
  function fmt(n, lang) {
    var s = Math.round(n).toLocaleString('en-US');
    if (lang === 'ar') s = s.replace(/[0-9]/g, function (d) { return AR[d]; }).replace(/,/g, '٬');
    return s;
  }
  function html(s, lang) {
    var L = T[lang] || T.en, ks = ['day', 'week', 'month', 'year'];
    return '<div class="rs-card" data-rs="week"><div class="rs-head"><b>' + L.title + '</b><div class="rs-tabs">' +
      ks.map(function (k, i) { return '<button type="button" data-k="' + k + '"' + (k === 'week' ? ' class="on"' : '') + '>' + L.tabs[i] + '</button>'; }).join('') +
      '</div></div>' +
      ks.map(function (k) {
        var o = s[k];
        return '<div class="rs-nums" data-k="' + k + '"' + (k === 'week' ? '' : ' hidden') + '>' +
          [o.pages, o.words, o.letters].map(function (v, i) { return '<span><b>' + fmt(v, lang) + '</b><small>' + L.u[i] + '</small></span>'; }).join('') + '</div>';
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
        el.querySelectorAll('.rs-nums').forEach(function (x) { x.hidden = x.getAttribute('data-k') !== k; });
      };
    });
  }
  // the session, shown on the page: pages and letters
  function sessLine(o, lang) {
    var L = T[lang] || T.en;
    return (SESS[lang] || SESS.en) + ': ' + fmt(o.pages, lang) + ' ' + L.u[0] + ' · ' + fmt(o.letters, lang) + ' ' + L.u[2];
  }
  // a short line for a profile card: this week's pages and letters
  function line(s, lang) {
    var L = T[lang] || T.en, w = s.week;
    return L.tabs[1] + ': ' + fmt(w.pages, lang) + ' ' + L.u[0] + ' · ' + fmt(w.letters, lang) + ' ' + L.u[2];
  }
  window.ReadStats = { mark: mark, session: session, fmt: fmt, sum: sum, sumMany: sumMany, html: html, wire: wire, line: line, sessLine: sessLine, pageStats: pageStats };
})();
