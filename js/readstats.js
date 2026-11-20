/* Reading statistics (إحصاءات القراءة): the Mushaf pages read, and their words and letters, by day, week, month, year.

   A page counts once a day, after it stayed open long enough to be read (the Mushaf calls ReadStats.mark(page)).
   Kept on this device for everyone (localStorage), and in the family account for the profile in use (table
   reading_log: one row per profile per day, the pages). Words and letters come from data/page-stats.json
   (built by tools/build_page_stats.py from the simple text: written letters, without harakat).

   ReadStats.mark(page)                 count a page read today (for the profile in use, or for this device)
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

  // the family account: today's pages for the profile, merged with what another device recorded today
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
          var have = (r.data && r.data.pages) || [];
          var all = have.concat(j.pages.filter(function (p) { return have.indexOf(p) < 0; }));
          return c.from('reading_log').upsert({ profile_id: j.id, d: j.d, pages: all, updated_at: new Date().toISOString() }, { onConflict: 'profile_id,d' });
        }).then(function () {}, function () {});
      });
    }).catch(function () {});
  }

  function mark(page) {
    page = +page; if (!(page >= 1 && page <= 604)) return false;
    var p = prof(), id = p && p.id, d = today(), log = local(id), list = log[d] || (log[d] = []);
    if (list.indexOf(page) >= 0) return false;
    list.push(page); saveLocal(id, log);
    if (id) {
      pend[id + d] = { id: id, d: d, pages: list.slice() };
      if (!timer) timer = setTimeout(push, 3000);
    }
    try { window.dispatchEvent(new CustomEvent('lt-read', { detail: { page: page } })); } catch (e) {}
    return true;
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
  function merge(a, b) {
    var o = {};
    [a, b].forEach(function (x) {
      Object.keys(x || {}).forEach(function (d) {
        var l = o[d] || (o[d] = []);
        x[d].forEach(function (p) { if (l.indexOf(p) < 0) l.push(p); });
      });
    });
    return o;
  }
  function remote(ids) {
    var F = window.Fam;
    if (!ids.length || !F || !F.ready) return Promise.resolve({});
    return F.ready().then(function (c) {
      if (!c) return {};
      return c.from('reading_log').select('profile_id,d,pages').in('profile_id', ids).gte('d', daysAgo(364)).then(function (r) {
        var by = {};
        (r.data || []).forEach(function (x) { (by[x.profile_id] || (by[x.profile_id] = {}))[x.d] = x.pages || []; });
        return by;
      });
    }).catch(function () { return {}; });
  }
  function sum(id) {
    if (id === undefined) { var p = prof(); id = p && p.id; }
    return Promise.all([pageStats(), id ? remote([id]) : Promise.resolve({})]).then(function (r) {
      return periods(merge(local(id), (r[1] || {})[id]), r[0]);
    });
  }
  function sumMany(ids) {
    return Promise.all([pageStats(), remote(ids)]).then(function (r) {
      var o = {};
      ids.forEach(function (id) { o[id] = periods(merge(local(id), r[1][id]), r[0]); });
      return o;
    });
  }

  var T = {
    ar: { title: 'قراءتي', tabs: ['اليوم', 'الأسبوع', 'الشهر', 'السنة'], u: ['صفحة', 'كلمة', 'حرفًا'],
      h: '«من قرأ حرفًا من كتاب الله فله به حسنة، والحسنة بعشر أمثالها» — رواه الترمذي.', note: 'تُحتسب الصفحة إذا بقيت مفتوحة مدةً تكفي لقراءتها، مرةً في اليوم. والعدد تقريبي.' },
    en: { title: 'My reading', tabs: ['Today', 'Week', 'Month', 'Year'], u: ['pages', 'words', 'letters'],
      h: '“Whoever reads a letter of the Book of Allah has a good deed for it, and a good deed is multiplied tenfold.” — at-Tirmidhi.', note: 'A page counts when it stays open long enough to be read, once a day. The numbers are approximate.' },
    ur: { title: 'میری تلاوت', tabs: ['آج', 'ہفتہ', 'مہینہ', 'سال'], u: ['صفحات', 'الفاظ', 'حروف'],
      h: '«جس نے کتاب اللہ کا ایک حرف پڑھا اس کے لیے ایک نیکی ہے، اور نیکی دس گنا ہے» — ترمذی۔', note: 'صفحہ اس وقت شمار ہوتا ہے جب پڑھنے کے لیے کافی دیر کھلا رہے، دن میں ایک بار۔ تعداد تقریبی ہے۔' },
    fr: { title: 'Ma lecture', tabs: ['Aujourd’hui', 'Semaine', 'Mois', 'Année'], u: ['pages', 'mots', 'lettres'],
      h: '« Quiconque lit une lettre du Livre d’Allah obtient une bonne action, et la bonne action est décuplée. » — at-Tirmidhi.', note: 'Une page compte quand elle reste ouverte assez longtemps pour être lue, une fois par jour. Chiffres approximatifs.' },
    es: { title: 'Mi lectura', tabs: ['Hoy', 'Semana', 'Mes', 'Año'], u: ['páginas', 'palabras', 'letras'],
      h: '«Quien lee una letra del Libro de Allah obtiene por ella una buena obra, y la buena obra se multiplica por diez.» — at-Tirmidhi.', note: 'Una página cuenta cuando queda abierta el tiempo suficiente para leerla, una vez al día. Cifras aproximadas.' },
    ru: { title: 'Моё чтение', tabs: ['Сегодня', 'Неделя', 'Месяц', 'Год'], u: ['стр.', 'слов', 'букв'],
      h: '«Кто прочтёт букву из Книги Аллаха, тому за неё доброе дело, а доброе дело — десятикратно». — ат-Тирмизи.', note: 'Страница засчитывается, если открыта достаточно долго для чтения, раз в день. Числа приблизительны.' }
  };
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
  // a short line for a profile card: this week's pages and letters
  function line(s, lang) {
    var L = T[lang] || T.en, w = s.week;
    return L.tabs[1] + ': ' + fmt(w.pages, lang) + ' ' + L.u[0] + ' · ' + fmt(w.letters, lang) + ' ' + L.u[2];
  }
  window.ReadStats = { mark: mark, sum: sum, sumMany: sumMany, html: html, wire: wire, line: line, pageStats: pageStats };
})();
