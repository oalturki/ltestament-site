/* «اختبار» — the Mushaf's fifth service (Arabic): a test the reader sets for himself (the teacher's later).
   The owner's design (Nov 28, 2026), from how Quran competitions and halaqas test:
   1) the range: a surah, from an ayah to an ayah, a juz or a hizb;
   2) the parts he wants: memorization (by voice), applied tajweed, theoretical tajweed (closed until the tajweed
      explanations come back from the specialist's review), word meanings;
   3) the weights: memorization 70, applied tajweed 15, theoretical 5, words 10 — shared out over the parts chosen.
   Memorization (the owner, Nov 28): «أكمل من قوله تعالى: …» — 1 to 8 places in each page of the range, spread over the
   page; each asked on its own card, away from the Mushaf (the page's layout reminds the reader of the verse), and the
   reader's voice judged by the recitation check (js/live.js), the words he said shown as he says them. Each place is
   worth 20, less: a word wrong or not said 1, a word put right after the alert ½, a whole ayah passed over 2; a slip the
   reader puts right himself costs nothing (the measure of Sultan Qaboos's and al-Azhar's competitions).
   Applied tajweed: an ayah of the range with a word marked; which rule falls on the letter named — the right answer is
   the word's own rule in the colour Mushaf (data/tajweed/n<page>.json); the others are other rules.
   Word meanings: «السراج في بيان غريب القرآن» (data/quiz/siraj.json), as /quiz/ asks them.
   The result: out of 100 with each part's share, and the places to go back to; kept in the reader's record (exam_results)
   when he is signed in with a profile. */
(function () {
  'use strict';
  var B = function () { return window.__ltBook || {}; };
  var DIG = '٠١٢٣٤٥٦٧٨٩';
  var ar = function (n) { return String(n).replace(/\d/g, function (d) { return DIG[d]; }).replace('.', '٫'); };
  var esc = function (t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var shuffle = function (a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; };
  var pick = function (a) { return a[Math.floor(Math.random() * a.length)]; };
  var store = function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} };
  var load = function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } };
  var cache = {};
  var J = function (u) { return cache[u] || (cache[u] = fetch(u).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).catch(function (e) { delete cache[u]; throw e; })); };
  var r1 = function (x) { return Math.round(x * 10) / 10; };

  var SEC = { hifz: 'الحفظ', tja: 'التجويد التطبيقي', tjt: 'التجويد النظري', words: 'معاني الكلمات' };
  var W = { hifz: 70, tja: 15, tjt: 5, words: 10 };
  var ORDER = ['hifz', 'tja', 'tjt', 'words'];
  var PTS = 20;                                   // each memorization passage

  /* ---------- the Quran's map ---------- */
  var D = null;
  function data() {
    return D ? Promise.resolve(D) : Promise.all([J('/data/quran-pages.json'), J('/data/quran-index.json'), J('/data/ayah-lines.json'), J('/data/surah-names.json')])
      .then(function (v) { D = { map: v[0], idx: v[1], lines: v[2].s, names: v[3].ar }; return D; });
  }
  var K = function (s, a) { return s * 1000 + a; };
  function pageOf(s, a) {
    var k = K(s, a), P = D.map.pages;
    for (var i = 0; i < P.length; i++) if (k >= K(P[i][0], P[i][1]) && k <= K(P[i][2], P[i][3])) return i + 1;
    return 1;
  }
  function prevAyah(s, a) { return a > 1 ? [s, a - 1] : [s - 1, D.map.verses[s - 2]]; }
  // the range as [from, to], each [surah, ayah]
  function range(c) {
    var V = D.map.verses;
    if (c.t === 's') return [[c.s, 1], [c.s, V[c.s - 1]]];
    if (c.t === 'a') { var a1 = Math.max(1, Math.min(c.a1, V[c.s - 1])), a2 = Math.max(a1, Math.min(c.a2, V[c.s - 1])); return [[c.s, a1], [c.s, a2]]; }
    if (c.t === 'j') {
      var f = D.map.juz.indexOf(c.j), l = D.map.juz.lastIndexOf(c.j), P = D.map.pages;
      return [[P[f][0], P[f][1]], [P[l][2], P[l][3]]];
    }
    var R = D.idx.rub, st = R[(c.h - 1) * 4], nx = R[c.h * 4];
    return [[st[0], st[1]], nx ? prevAyah(nx[0], nx[1]) : [114, 6]];
  }
  var inR = function (rg, s, a) { var k = K(s, a); return k >= K(rg[0][0], rg[0][1]) && k <= K(rg[1][0], rg[1][1]); };
  function label(c, rg) {
    var N = D.names;
    if (c.t === 's') return 'سورة ' + N[c.s - 1];
    if (c.t === 'a') return 'سورة ' + N[c.s - 1] + '، من الآية ' + ar(rg[0][1]) + ' إلى الآية ' + ar(rg[1][1]);
    if (c.t === 'j') return 'الجزء ' + ar(c.j);
    return 'الحزب ' + ar(c.h);
  }
  // the ayahs of a page, in order
  function pageAyahs(p) {
    var x = D.map.pages[p - 1], out = [];
    for (var s = x[0]; s <= x[2]; s++) for (var a = s === x[0] ? x[1] : 1, e = s === x[2] ? x[3] : D.map.verses[s - 1]; a <= e; a++) out.push([s, a]);
    return out;
  }
  // a page's words: {"s:a": [{loc, t}]} (the Complex's Hafs script; the ayah's number left out)
  function pageWords(p) {
    return J('/data/mushaf/p' + p + '.json').then(function (d) {
      var by = {};
      (d.l || []).forEach(function (ln) {
        if (ln[0] !== 'a') return;
        ln[2].forEach(function (w) {
          if (!w[1] || /^[٠-٩\s]+$/.test(w[2] || '')) return;
          var x = w[1].split(':'), k = x[0] + ':' + x[1];
          (by[k] = by[k] || []).push({ loc: w[1], t: w[2] || '' });
        });
      });
      return by;
    });
  }
  var ayahText = function (ws) { return ws.map(function (w) { return w.t; }).join(' '); };

  /* ---------- the questions ---------- */
  // memorization: «per» places in each page, the page's verses (in the range) cut in «per» stretches by their lines, a
  // place drawn in each — from an ayah leaving at least half of its stretch, to the stretch's end
  function passages(rg, per) {
    var p0 = pageOf(rg[0][0], rg[0][1]), p1 = pageOf(rg[1][0], rg[1][1]), out = [];
    var L = function (x) { return D.lines[x[0] - 1][x[1] - 1] || 1; };
    for (var p = p0; p <= p1; p++) {
      var ay = pageAyahs(p).filter(function (x) { return inR(rg, x[0], x[1]); });
      if (!ay.length) continue;
      var tot = 0; ay.forEach(function (x) { tot += L(x); });
      var n = Math.min(per, ay.length), groups = [], acc = 0, g = [];
      ay.forEach(function (x, i) {
        g.push(x); acc += L(x);
        var left = ay.length - i - 1, need = n - groups.length - 1;
        if ((acc >= tot * (groups.length + 1) / n && need > 0 && left >= need) || left === need && need > 0) { groups.push(g); g = []; }
      });
      if (g.length) groups.push(g);
      groups.forEach(function (gr) {
        var gl = 0; gr.forEach(function (x) { gl += L(x); });
        var starts = gr.map(function (x, i) { return i; }).filter(function (i) { var r = 0; for (var j = i; j < gr.length; j++) r += L(gr[j]); return r >= gl / 2; });
        var seg = gr.slice(pick(starts.length ? starts : [0])), parts = [];
        seg.forEach(function (x) { var q = parts[parts.length - 1]; if (q && q.s === x[0]) q.b = x[1]; else parts.push({ s: x[0], a: x[1], b: x[1] }); });
        out.push({ page: p, ayahs: seg, parts: parts });
      });
    }
    return out;
  }

  // applied tajweed: the rules a word's letter carries (one rule only), as names a student learns them by
  var TJ = [
    [/^مد طبيعي/, 'المد الطبيعي', 'm'], [/^مد واجب/, 'المد الواجب المتصل', 'm'], [/^مد جائز/, 'المد الجائز المنفصل', 'm'],
    [/^مد لازم/, 'المد اللازم', 'm'], [/^مد عارض للسكون/, 'المد العارض للسكون', 'm'], [/^مد الصلة الصغرى/, 'مد الصلة الصغرى', 'm'],
    [/^غنة (النون|الميم) المشددة/, 'الغنة', 'n'], [/^غنة (الواو|الياء) \(إدغام بغنة\)/, 'الإدغام بغنة', 'n'],
    [/^إخفاء (النون الساكنة|التنوين)/, 'الإخفاء الحقيقي', 'n'], [/^إخفاء الميم الساكنة/, 'الإخفاء الشفوي', 'n'],
    [/^إقلاب/, 'الإقلاب', 'n'], [/^قلقلة/, 'القلقلة', 'q']
  ];
  function tjOf(note) {
    if (!note || /،/.test(note)) return null;          // one rule on the letter only
    for (var i = 0; i < TJ.length; i++) if (TJ[i][0].test(note)) {
      var m = /\(([^)]+)\)$/.exec(note), letter;
      if (TJ[i][1] === 'الإدغام بغنة') letter = /^غنة (\S+)/.exec(note)[1];
      else if (m) letter = m[1];
      else if (/ في /.test(note)) letter = note.split(' في ')[1];
      else letter = note.replace(/^(غنة|إخفاء|إقلاب|قلقلة)\s+/, '').replace(/\s+ميمًا$/, '');
      return { rule: TJ[i][1], fam: TJ[i][2], letter: letter.trim() };
    }
    return null;
  }
  function tajweedQs(rg, n) {
    var p0 = pageOf(rg[0][0], rg[0][1]), p1 = pageOf(rg[1][0], rg[1][1]), pgs = [];
    for (var p = p0; p <= p1; p++) pgs.push(p);
    pgs = shuffle(pgs).slice(0, Math.max(4, Math.min(pgs.length, n + 2)));
    return Promise.all(pgs.map(function (p) {
      return Promise.all([J('/data/tajweed/n' + p + '.json').catch(function () { return {}; }), pageWords(p)]).then(function (v) { return { notes: v[0], words: v[1] }; });
    })).then(function (pp) {
      var by = {};                                 // by rule: [{loc, letter, rule, ayah words}]
      pp.forEach(function (x) {
        Object.keys(x.notes).forEach(function (loc) {
          var l = loc.split(':'); if (!inR(rg, +l[0], +l[1])) return;
          var ns = x.notes[loc], keys = Object.keys(ns);
          // a letter named by two rules of the word (as «يتساءلون»: واجب and جائز on its alif) is not asked: no question
          // rather than one with a doubtful answer
          var rl = {};
          keys.forEach(function (k) { var y = tjOf(ns[k]) || /(?:في|\() ?(\S+)/.exec(ns[k] || ''); var lt = y && (y.letter || y[1]); if (lt) (rl[lt] = rl[lt] || {})[y.rule || ns[k]] = 1; });
          keys.forEach(function (k) {
            var q = tjOf(ns[k]); if (!q) return;
            if (Object.keys(rl[q.letter] || {}).length > 1) return;
            var ws = x.words[l[0] + ':' + l[1]]; if (!ws) return;
            (by[q.rule] = by[q.rule] || []).push({ loc: loc, s: +l[0], a: +l[1], letter: q.letter, rule: q.rule, fam: q.fam, ws: ws });
          });
        });
      });
      // the rules in turn, so a test asks of several (not ten times the natural madd)
      var rules = shuffle(Object.keys(by)), out = [], used = {};
      Object.keys(by).forEach(function (r) { shuffle(by[r]); });
      for (var round = 0; out.length < n && round < 50; round++) {
        var any = false;
        rules.forEach(function (r) {
          if (out.length >= n) return;
          var c = by[r].filter(function (x) { return !used[x.s + ':' + x.a]; })[0] || by[r].filter(function (x) { return !used[x.loc]; })[0];
          if (!c) return;
          any = true; used[c.s + ':' + c.a] = 1; used[c.loc] = 1;
          var others = TJ.map(function (t) { return t[1]; }).filter(function (t, i, a) { return t !== c.rule && a.indexOf(t) === i; });
          var same = shuffle(others.filter(function (t) { return TJ.some(function (y) { return y[1] === t && y[2] === c.fam; }); }));
          var rest = shuffle(others.filter(function (t) { return same.indexOf(t) < 0; }));
          var wrong = same.slice(0, 2).concat(rest).slice(0, 3);
          out.push({ kind: 'tja', s: c.s, a: c.a, loc: c.loc, ws: c.ws,
                     ask: 'ما حكم «' + c.letter + '» في الكلمة المميّزة؟', right: c.rule, opts: shuffle([c.rule].concat(wrong)) });
        });
        if (!any) break;
      }
      return shuffle(out);
    });
  }

  // word meanings: «السراج» (as js/quiz.js asks them: the right meaning and two of other words that look like it)
  var len = function (t) {
    return String(t || '').replace(/[ً-ٰٟۖ-ۭـ]/g, '').replace(/[ٱأإآا]/g, '').replace(/[ىئ]/g, 'ي').replace(/ؤ/g, 'و').replace(/ة/g, 'ه').replace(/[^ء-ي\s]/g, '').trim();
  };
  function wordQs(rg, n) {
    return J('/data/quiz/siraj.json').then(function (rows) {
      var ALL = rows.map(function (r) { return { s: r[0], a: r[1], head: r[2], mean: r[3], c: r[4] || [] }; });
      var ratio = function (e) { return e.mean.length / Math.max(4, e.head.replace(/[ً-ٰٟۖ-ۭ\s]/g, '').length); };
      var inS = shuffle(ALL.filter(function (e) { return inR(rg, e.s, e.a) && e.c.length >= 2; }));
      var qs = inS.filter(function (e) { return ratio(e) <= 3.2; }).concat(inS.filter(function (e) { return ratio(e) > 3.2; }));
      var list = [], seen = {};
      for (var i = 0; i < qs.length && list.length < n; i++) {
        var e = qs[i], k = len(e.head); if (seen[k]) continue; seen[k] = 1;
        var c = e.c.slice(0, 4), a = c.splice(Math.random() < 0.6 ? 0 : Math.floor(Math.random() * c.length), 1)[0], b = c[Math.floor(Math.random() * c.length)];
        list.push({ kind: 'words', s: e.s, a: e.a, head: e.head, right: e.mean, ask: 'ما معنى «' + e.head + '»؟', opts: shuffle([e.mean, ALL[a].mean, ALL[b].mean]) });
      }
      return Promise.all(list.map(function (q) { return pageWords(pageOf(q.s, q.a)).then(function (by) { q.ws = by[q.s + ':' + q.a] || []; return q; }); }));
    });
  }
  // the ayah, the asked word(s) marked: by place (tajweed) or by its letters (word meanings)
  function ayahHtml(q) {
    var ws = q.ws || [], at = -1, nh = 1;
    if (q.loc) ws.forEach(function (w, i) { if (w.loc === q.loc) at = i; });
    else if (q.head) {
      var hs = len(q.head).split(/\s+/).filter(Boolean); nh = hs.length;
      for (var i = 0; i + hs.length <= ws.length && at < 0; i++) {
        if (hs.every(function (h, k) { var w = len(ws[i + k].t); return w === h || (h.length >= 3 && w.length >= 3 && (w.indexOf(h) >= 0 || h.indexOf(w) >= 0)); })) at = i;
      }
    }
    return ws.map(function (w, i) { return at >= 0 && i >= at && i < at + nh ? '<mark>' + esc(w.t) + '</mark>' : esc(w.t); }).join(' ') +
      ' <span class="ex-an">﴿' + ar(q.a) + '﴾</span>';
  }

  /* ---------- the screens ---------- */
  var OV = null;
  function sheet(title, body, onX) {
    if (OV) OV.remove();
    OV = document.createElement('div'); OV.className = 'ex-ov';
    OV.innerHTML = '<div class="ex-box" role="dialog" aria-modal="true"><div class="ex-hd"><b>' + esc(title) + '</b>' +
      '<button type="button" class="ex-x" aria-label="إغلاق">×</button></div><div class="ex-bd">' + body + '</div></div>';
    document.body.appendChild(OV);
    OV.querySelector('.ex-x').onclick = function () { (onX || close)(); };
    return OV.querySelector('.ex-bd');
  }
  function close() { if (OV) { OV.remove(); OV = null; } }
  var toast = function (t) { var d = document.createElement('div'); d.className = 'bk-toast'; d.textContent = t; document.body.appendChild(d); setTimeout(function () { d.remove(); }, 3000); };

  function cfgLoad() {
    var c = null; try { c = JSON.parse(load('lt_exam_cfg') || 'null'); } catch (e) {}
    return c || { t: 's', s: 0, a1: 1, a2: 7, j: 0, h: 0, sec: { hifz: true, tja: false, tjt: false, words: false }, per: 2, pw: 3, nTj: 10, nW: 10 };
  }
  function shares(sec) {
    var on = ORDER.filter(function (k) { return sec[k] && k !== 'tjt'; }), sum = 0, out = {};
    on.forEach(function (k) { sum += W[k]; });
    on.forEach(function (k) { out[k] = sum ? W[k] * 100 / sum : 0; });
    return out;
  }

  function open() {
    data().then(function () {
      var c = cfgLoad(), cur = B().cur ? B().cur() : 1, pg = D.map.pages[cur - 1];
      if (!c.s) c.s = pg[0];
      if (!c.j) c.j = D.map.juz[cur - 1];
      if (!c.h) { var R = D.idx.rub, k = K(pg[0], pg[1]); c.h = 1; for (var i = 0; i < R.length; i += 4) if (K(R[i][0], R[i][1]) <= k) c.h = i / 4 + 1; }
      var o = function (v, t, sel) { return '<option value="' + v + '"' + (sel ? ' selected' : '') + '>' + esc(t) + '</option>'; };
      var sur = D.names.map(function (n, i) { return o(i + 1, ar(i + 1) + '. ' + n, c.s === i + 1); }).join('');
      var nums = function (n, v, pre) { var h = ''; for (var i = 1; i <= n; i++) h += o(i, pre + ' ' + ar(i), v === i); return h; };
      var seg = function (name, items, val) {
        return '<div class="ex-seg" data-n="' + name + '">' + items.map(function (x) {
          return '<label><input type="radio" name="ex' + name + '" value="' + x[0] + '"' + (String(val) === String(x[0]) ? ' checked' : '') + '><span>' + esc(x[1]) + '</span></label>';
        }).join('') + '</div>';
      };
      var chk = function (k, dis, note) {
        return '<label class="ex-ck' + (dis ? ' off' : '') + '"><input type="checkbox" data-k="' + k + '"' + (c.sec[k] && !dis ? ' checked' : '') + (dis ? ' disabled' : '') + '>' +
          '<span>' + esc(SEC[k]) + '</span><em data-w="' + k + '"></em>' + (note ? '<small>' + esc(note) + '</small>' : '') + '</label>';
      };
      var bd = sheet('اختبار',
        '<p class="ex-note">اختبر نفسك في الحفظ والتجويد ومعاني الكلمات، في النطاق الذي تختاره.</p>' +
        '<h4>النطاق:</h4>' + seg('t', [['s', 'سورة'], ['a', 'من آية إلى آية'], ['j', 'جزء'], ['h', 'حزب']], c.t) +
        '<div class="ex-row" data-for="s a"><select data-f="s">' + sur + '</select></div>' +
        '<div class="ex-row" data-for="a"><label>من الآية:<input type="text" inputmode="numeric" data-f="a1" value="' + ar(c.a1) + '"></label>' +
          '<label>إلى الآية:<input type="text" inputmode="numeric" data-f="a2" value="' + ar(c.a2) + '"></label></div>' +
        '<div class="ex-row" data-for="j"><select data-f="j">' + nums(30, c.j, 'الجزء') + '</select></div>' +
        '<div class="ex-row" data-for="h"><select data-f="h">' + nums(60, c.h, 'الحزب') + '</select></div>' +
        '<h4>الأقسام:</h4><div class="ex-cks">' + chk('hifz') + chk('tja') + chk('tjt', true, 'يُضاف بعد مراجعة المختص لشرح أحكام التجويد.') + chk('words') + '</div>' +
        '<div class="ex-opt" data-sec="hifz"><h4>الحفظ:</h4>' +
          '<div class="ex-row"><span>عدد المواضع في الصفحة:</span>' + seg('per', [1, 2, 3, 4, 5, 6, 7, 8].map(function (n) { return [n, ar(n)]; }), c.per || 2) + '</div>' +
          '<div class="ex-row"><span>بداية الموضع:</span>' + seg('pw', [[1, 'كلمة'], [3, 'ثلاث كلمات']], c.pw || 3) + '</div>' +
          '<p class="ex-note">يظهر لك: «أكمل من قوله تعالى: …»، فتكمل من حفظك. ويحكم عليه نظام التسميع، فيحتاج إلى الميكروفون.</p></div>' +
        '<div class="ex-opt" data-sec="tja"><h4>التجويد التطبيقي:</h4><div class="ex-row"><span>عدد الأسئلة:</span>' + seg('nTj', [[5, '٥'], [10, '١٠'], [15, '١٥']], c.nTj) + '</div></div>' +
        '<div class="ex-opt" data-sec="words"><h4>معاني الكلمات:</h4><div class="ex-row"><span>عدد الأسئلة:</span>' + seg('nW', [[5, '٥'], [10, '١٠'], [15, '١٥']], c.nW) + '</div></div>' +
        '<p class="ex-err" hidden></p><button type="button" class="ex-go">ابدأ الاختبار</button>');
      var val = function (n) { var r = bd.querySelector('input[name=ex' + n + ']:checked'); return r ? r.value : null; };
      var num = function (t) { return +String(t || '').replace(/[٠-٩]/g, function (d) { return DIG.indexOf(d); }).replace(/\D/g, ''); };
      var sync = function () {
        var t = val('t');
        bd.querySelectorAll('.ex-row[data-for]').forEach(function (r) { r.hidden = r.getAttribute('data-for').split(' ').indexOf(t) < 0; });
        var sec = {}; bd.querySelectorAll('.ex-ck input').forEach(function (x) { sec[x.getAttribute('data-k')] = x.checked; });
        var sh = shares(sec);
        bd.querySelectorAll('[data-w]').forEach(function (e) { var k = e.getAttribute('data-w'); e.textContent = sh[k] ? ar(r1(sh[k])) + '٪' : ''; });
        bd.querySelectorAll('.ex-opt').forEach(function (e) { e.hidden = !sec[e.getAttribute('data-sec')]; });
        return sec;
      };
      bd.addEventListener('change', sync); sync();
      bd.querySelector('.ex-go').onclick = function () {
        var sec = sync(), err = bd.querySelector('.ex-err');
        if (!ORDER.some(function (k) { return sec[k] && k !== 'tjt'; })) { err.textContent = 'اختر قسمًا واحدًا على الأقل.'; err.hidden = false; return; }
        var n = { t: val('t'), s: +bd.querySelector('[data-f=s]').value, a1: num(bd.querySelector('[data-f=a1]').value) || 1, a2: num(bd.querySelector('[data-f=a2]').value) || 1,
                  j: +bd.querySelector('[data-f=j]').value, h: +bd.querySelector('[data-f=h]').value, sec: sec,
                  per: +val('per') || 2, pw: +val('pw') || 3, nTj: +val('nTj') || 10, nW: +val('nW') || 10 };
        if (n.t === 'a' && n.a2 < n.a1) { var t0 = n.a1; n.a1 = n.a2; n.a2 = t0; }
        store('lt_exam_cfg', JSON.stringify(n));
        start(n);
      };
    }).catch(function () { toast('تعذّر تحميل بيانات الاختبار. تحقّق من الاتصال وأعد المحاولة.'); });
  }

  /* ---------- the run ---------- */
  var RUN = null;
  function start(c) {
    var rg = range(c), sec = c.sec;
    var bd = sheet('اختبار', '<p class="ex-note">جارٍ تجهيز الأسئلة…</p>');
    var jobs = [
      sec.hifz ? Promise.resolve(passages(rg, c.per || 2)) : Promise.resolve([]),
      sec.tja ? tajweedQs(rg, c.nTj) : Promise.resolve([]),
      sec.words ? wordQs(rg, c.nW) : Promise.resolve([])
    ];
    Promise.all(jobs).then(function (v) {
      RUN = { c: c, rg: rg, label: label(c, rg), t0: Date.now(), mode: B().mode ? B().mode() : 'read', page: B().cur ? B().cur() : 1,
              hifz: v[0].map(function (p) { return { p: p, pts: null, ded: 0, errs: [] }; }), tja: v[1], words: v[2], note: [] };
      if (sec.hifz && !RUN.hifz.length) RUN.note.push('لا توجد آيات للحفظ في هذا النطاق.');
      if (sec.tja && !RUN.tja.length) RUN.note.push('لم تُوجد في هذا النطاق أحكام تجويد صالحة للسؤال.');
      if (sec.words && !RUN.words.length) RUN.note.push('لا توجد في هذا النطاق كلمات غريبة من كتاب «السراج».');
      if (!RUN.hifz.length && !RUN.tja.length && !RUN.words.length) {
        bd.innerHTML = '<p class="ex-note">' + esc(RUN.note.join(' ')) + ' اختر نطاقًا أوسع.</p><button type="button" class="ex-go">رجوع</button>';
        bd.querySelector('.ex-go').onclick = open; RUN = null; return;
      }
      if (RUN.hifz.length) hifzGo(0); else mcq('tja', 0);
    }).catch(function () { bd.innerHTML = '<p class="ex-note">تعذّر تجهيز الأسئلة. تحقّق من الاتصال وأعد المحاولة.</p>'; });
  }

  // memorization: «أكمل من قوله تعالى: …» on its own card; what the reader says appears as he says it (never ahead of him)
  var LIVE = null;
  function liveLib() {
    if (window.LiveRecite) return Promise.resolve();
    return new Promise(function (ok, no) { var sc = document.createElement('script'); sc.src = '/js/live.js'; sc.onload = ok; sc.onerror = no; document.head.appendChild(sc); });
  }
  function liveStop() { if (LIVE) { try { LIVE.stop(); } catch (e) {} LIVE = null; } }
  // a short tone at a mistake (as in the Mushaf's recitation check)
  var actx = null;
  function tone() {
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      var g = actx.createGain(), os = actx.createOscillator(); os.frequency.value = 520; g.gain.value = 0.08;
      os.connect(g); g.connect(actx.destination); os.start(); os.stop(actx.currentTime + 0.18);
    } catch (e) {}
  }
  // the microphone goes off as soon as the reader leaves the page (the owner's privacy rule)
  document.addEventListener('visibilitychange', function () { if (document.hidden && LIVE) { liveStop(); var n = OV && OV.querySelector('.ex-st'); if (n) n.textContent = 'توقّف الاستماع لمغادرتك الصفحة.'; var b = OV && OV.querySelector('.ex-again'); if (b) b.hidden = false; } });
  function hifzGo(i) {
    if (!RUN) return;
    var H = RUN.hifz;
    liveStop();
    if (i >= H.length) return mcq('tja', 0);
    var q = H[i], f = q.p.ayahs[0];
    q.rec = {}; q.over = false;
    var bd = sheet(SEC.hifz + ': الموضع ' + ar(i + 1) + ' من ' + ar(H.length), '<p class="ex-note">جارٍ التجهيز…</p>', finish);
    pageWords(q.p.page).then(function (by) {
      q.words = q.p.ayahs.map(function (x) { return by[x[0] + ':' + x[1]] || []; });
      // the start shown: three words, or one word — of more than four letters (the owner, Nov 28), else the words up to
      // more than four letters, so a short word («قل», «إن») never stands alone
      var first = q.words[0] || [], pr;
      if ((RUN.c.pw || 3) === 1) {
        pr = []; var nl = 0;
        for (var wi = 0; wi < first.length && nl <= 4; wi++) { pr.push(first[wi]); nl += len(first[wi].t).replace(/\s/g, '').length; }
      } else pr = first.slice(0, Math.min(3, first.length));
      bd.innerHTML = '<p class="ex-ref">سورة ' + esc(D.names[f[0] - 1]) + '</p>' +
        '<p class="ex-ask">أكمل من قوله تعالى:</p><p class="ex-ayah ex-pr" lang="ar" translate="no">﴿' + esc(ayahText(pr)) + (first.length > pr.length ? ' …' : '') + '﴾</p>' +
        '<div class="ex-live"><span class="ex-st">جارٍ تشغيل الميكروفون…</span><button type="button" class="ex-again" hidden>أعد الموضع</button>' +
        '<p class="ex-said" lang="ar" translate="no"></p></div>' +
        '<div class="ex-bb"><button type="button" class="ex-go ex-done">انتهيت</button></div>' +
        '<button type="button" class="ex-end2">إنهاء الاختبار</button>';
      var said = bd.querySelector('.ex-said'), st = bd.querySelector('.ex-st');
      var draw = function () {
        var h = [];
        for (var ai = 0; ai < q.words.length; ai++) {
          var ws = q.words[ai], stop = false;
          for (var wi = 0; wi < ws.length; wi++) {
            var r = q.rec[ws[wi].loc]; if (!r) { stop = true; break; }
            h.push('<span class="ex-w ' + r.cls + '">' + esc(ws[wi].t) + '</span>');
          }
          if (stop) break;
          h.push('<span class="ex-an">﴿' + ar(q.p.ayahs[ai][1]) + '﴾</span>');
        }
        said.innerHTML = h.join(' ');
      };
      bd.querySelector('.ex-done').onclick = function () { liveStop(); hifzScore(i, true); };
      bd.querySelector('.ex-end2').onclick = function () { liveStop(); hifzScore(i, true, true); };
      bd.querySelector('.ex-again').onclick = function () { hifzGo(i); };
      liveLib().then(function () {
        LIVE = window.LiveRecite({
          parts: q.p.parts, lang: 'ar', againUnclear: true,
          onWord: function (p, w, cls, replay) {
            if (cls === 'ti' || replay) return;
            var s0 = q.p.parts[p].s, k = s0 + ':' + w.ayah + ':' + w.n, was = q.rec[k];
            q.rec[k] = { cls: cls, skip: !!w.skip };
            if ((cls === 'wrong' || cls === 'missing') && !(was && (was.cls === 'wrong' || was.cls === 'missing'))) tone();
            draw();
          },
          onAgain: function (p, from) { st.textContent = 'لم تتّضح كلمة. أعد من: ' + (from ? from.text : 'أول الآية') + '.'; tone(); },
          onDone: function () { liveStop(); hifzScore(i, false); },
          onState: function (s) {
            if (s === 'listening') st.textContent = 'يستمع… اقرأ من حفظك.';
            else if (s === 'denied') { liveStop(); RUN.note.push('لم يُختبر الحفظ: لم يُسمح بالميكروفون.'); RUN.hifz = H.slice(0, i); hifzGo(H.length); }
            else if (s === 'error' || s === 'lost') { liveStop(); st.textContent = 'توقّف الاستماع.'; bd.querySelector('.ex-again').hidden = false; }
          }
        });
        LIVE.start();
      }).catch(function () { st.textContent = 'تعذّر تشغيل نظام التسميع. تحقّق من الاتصال.'; bd.querySelector('.ex-again').hidden = false; });
    });
  }
  // a place's mark out of 20: a word wrong or not said 1, put right after the alert ½, a whole ayah passed over 2; what
  // the reader put right himself costs nothing. Ended early: the rest is counted as not said.
  function hifzScore(i, early, quit) {
    var q = RUN && RUN.hifz[i]; if (!q || q.over) return; q.over = true;
    var ded = 0, errs = [];
    (q.words || []).forEach(function (ws) {
      if (!ws.length) return;
      var rs = ws.map(function (w) { return q.rec[w.loc]; });
      var none = rs.every(function (r) { return !r || r.cls === 'missing' || (r.cls === 'wrong' && r.skip); });
      if (none && (early || rs.some(function (r) { return r && r.skip; }))) {
        ded += 2; errs.push({ loc: ws[0].loc, t: ayahText(ws.slice(0, 3)) + '…', k: 'ayah' }); return;
      }
      ws.forEach(function (w, wi) {
        var r = rs[wi];
        if (!r) { if (early) { ded += 1; errs.push({ loc: w.loc, t: w.t, k: 'none' }); } return; }
        if (r.cls === 'wrong' || r.cls === 'missing') { ded += 1; errs.push({ loc: w.loc, t: w.t, k: 'wrong' }); }
        else if (r.cls === 'fixed') { ded += 0.5; errs.push({ loc: w.loc, t: w.t, k: 'fixed' }); }
      });
    });
    q.ded = ded; q.pts = Math.max(0, PTS - ded); q.errs = errs; q.tjN = 0;
    if (quit) { RUN.hifz = RUN.hifz.slice(0, i + 1); return finish(); }
    var bd = OV && OV.querySelector('.ex-bd'); if (!bd) return;
    var st = bd.querySelector('.ex-st'); if (st) st.textContent = 'درجة هذا الموضع: ' + ar(r1(q.pts)) + ' من ' + ar(PTS) + '.';
    var dn = bd.querySelector('.ex-done');
    if (dn) { dn.textContent = i + 1 < RUN.hifz.length ? 'التالي' : (RUN.tja.length || RUN.words.length ? 'التالي' : 'النتيجة'); dn.onclick = function () { hifzGo(i + 1); }; }
  }

  // the questions with choices (applied tajweed, word meanings), one by one
  function mcq(kind, i) {
    if (!RUN) return;
    var list = RUN[kind] || [];
    if (i >= list.length) return kind === 'tja' ? mcq('words', 0) : finish();
    var q = list[i], title = SEC[kind] + ': السؤال ' + ar(i + 1) + ' من ' + ar(list.length);
    var bd = sheet(title,
      '<p class="ex-ref">سورة ' + esc(D.names[q.s - 1]) + '</p><p class="ex-ayah" lang="ar" translate="no">' + ayahHtml(q) + '</p>' +
      '<p class="ex-ask">' + esc(q.ask) + '</p><div class="ex-opts">' +
      q.opts.map(function (t, k) { return '<button type="button" class="ex-op" data-k="' + k + '">' + esc(t) + '</button>'; }).join('') + '</div>' +
      '<div class="ex-nx" hidden><button type="button" class="ex-go">' + (i + 1 < list.length || (kind === 'tja' && RUN.words.length) ? 'التالي' : 'النتيجة') + '</button></div>' +
      '<button type="button" class="ex-end2">إنهاء الاختبار</button>', finish);
    bd.querySelectorAll('.ex-op').forEach(function (b) {
      b.onclick = function () {
        if (q.ans != null) return;
        q.ans = q.opts[+b.getAttribute('data-k')]; q.ok = q.ans === q.right;
        bd.querySelectorAll('.ex-op').forEach(function (x) {
          var t = q.opts[+x.getAttribute('data-k')];
          if (t === q.right) x.classList.add('ok'); else if (x === b) x.classList.add('no');
          x.disabled = true;
        });
        bd.querySelector('.ex-nx').hidden = false;
      };
    });
    bd.querySelector('.ex-nx .ex-go').onclick = function () { mcq(kind, i + 1); };
    bd.querySelector('.ex-end2').onclick = finish;
  }

  /* ---------- the result ---------- */
  function finish() {
    if (!RUN) return close();
    liveStop();
    var R = RUN; RUN = null;
    var parts = {};
    var H = R.hifz.filter(function (q) { return q.pts != null; });
    if (R.c.sec.hifz && H.length) { var got = 0; H.forEach(function (q) { got += q.pts; }); parts.hifz = got * 100 / (PTS * H.length); }
    ['tja', 'words'].forEach(function (k) {
      var A = R[k].filter(function (q) { return q.ans != null; });
      if (R.c.sec[k] && A.length) parts[k] = A.filter(function (q) { return q.ok; }).length * 100 / A.length;
    });
    var sh = shares(parts.hifz != null || parts.tja != null || parts.words != null ? { hifz: parts.hifz != null, tja: parts.tja != null, words: parts.words != null } : {});
    var total = 0; Object.keys(sh).forEach(function (k) { total += parts[k] * sh[k] / 100; });
    var rows = Object.keys(sh).map(function (k) {
      return '<tr><td>' + esc(SEC[k]) + '</td><td>' + ar(r1(sh[k])) + '٪</td><td>' + ar(r1(parts[k])) + ' من ١٠٠</td></tr>';
    }).join('');
    var KN = { wrong: 'خطأ', fixed: 'صُحّحت بعد التنبيه', none: 'لم تُقرأ', ayah: 'آية لم تُقرأ' };
    var revH = H.filter(function (q) { return q.errs.length || q.tjN; }).map(function (q) {
      var f = q.p.ayahs[0], l = q.p.ayahs[q.p.ayahs.length - 1];
      return '<li><b>سورة ' + esc(D.names[f[0] - 1]) + ' ' + ar(f[1]) + (l[1] !== f[1] || l[0] !== f[0] ? '–' + ar(l[1]) : '') + ':</b> ' + ar(r1(q.pts)) + ' من ' + ar(PTS) + '.' +
        (q.errs.length ? '<span class="ex-ws">' + q.errs.map(function (e) { return '<i lang="ar">' + esc(e.t) + '</i> <small>(' + esc(KN[e.k]) + ')</small>'; }).join('، ') + '</span>' : '') +
        (q.tjN ? '<span class="ex-ws">ملاحظات التجويد في التسميع: ' + ar(q.tjN) + '.</span>' : '') + '</li>';
    }).join('');
    var revQ = function (k) {
      return R[k].filter(function (q) { return q.ans != null && !q.ok; }).map(function (q) {
        return '<li><b>سورة ' + esc(D.names[q.s - 1]) + ' ' + ar(q.a) + ':</b> ' + esc(q.ask) + '<span class="ex-ws">الصواب: ' + esc(String(q.right).replace(/[.\s]+$/, '')) + '.</span></li>';
      }).join('');
    };
    var rt = revQ('tja'), rw = revQ('words');
    var secs = Math.round((Date.now() - R.t0) / 1000);
    var bd = sheet('نتيجة الاختبار',
      '<p class="ex-ref">' + esc(R.label) + '.</p>' +
      (Object.keys(sh).length ? '<div class="ex-total"><b>' + ar(r1(total)) + '</b><span>من ١٠٠</span></div>' +
        '<table class="ex-tb"><tr><th>القسم</th><th>الوزن</th><th>الدرجة</th></tr>' + rows + '</table>' : '<p class="ex-note">لم يُجَب عن شيء من الأسئلة.</p>') +
      (R.note.length ? '<p class="ex-note">' + esc(R.note.join(' ')) + '</p>' : '') +
      (revH || rt || rw ? '<h4>مواضع تحتاج مراجعة:</h4>' +
        (revH ? '<h5>الحفظ:</h5><ul class="ex-rv">' + revH + '</ul>' : '') +
        (rt ? '<h5>التجويد التطبيقي:</h5><ul class="ex-rv">' + rt + '</ul>' : '') +
        (rw ? '<h5>معاني الكلمات:</h5><ul class="ex-rv">' + rw + '</ul>' : '') : (Object.keys(sh).length ? '<p class="ex-note">لا أخطاء، بارك الله فيك.</p>' : '')) +
      '<p class="ex-saved" hidden></p><div class="ex-bb"><button type="button" class="ex-go">اختبار جديد</button><button type="button" class="ex-end2">إغلاق</button></div>');
    bd.querySelector('.ex-go').onclick = open;
    bd.querySelector('.ex-end2').onclick = close;
    // kept in the reader's record (a profile of a signed-in account)
    var F = window.Fam, prof = F && F.current && F.current();
    if (prof && Object.keys(sh).length && F.ready) {
      F.ready().then(function (cl) {
        if (!cl) return;
        return cl.from('exam_results').insert({
          profile_id: prof.id, scope: { t: R.c.t, label: R.label, from: R.rg[0], to: R.rg[1] }, score: r1(total), seconds: Math.min(86400, secs),
          parts: Object.keys(sh).reduce(function (o, k) { o[k] = { share: r1(sh[k]), score: r1(parts[k]) }; return o; }, {}),
          detail: { hifz: H.map(function (q) { return { ayahs: q.p.ayahs, pts: q.pts, errs: q.errs.map(function (e) { return [e.loc, e.k]; }), tj: q.tjN }; }),
                    tja: R.tja.filter(function (q) { return q.ans != null; }).map(function (q) { return [q.loc, q.right, q.ok]; }),
                    words: R.words.filter(function (q) { return q.ans != null; }).map(function (q) { return [q.s, q.a, q.head, q.ok]; }) }
        }).then(function (r) {
          var e = bd.querySelector('.ex-saved');
          if (e && !r.error) { e.textContent = 'حُفظت النتيجة في سجل ' + (prof.name || 'الطالب') + '.'; e.hidden = false; }
        });
      }).catch(function () {});
    }
  }

  window.LtExam = { open: open };
})();
