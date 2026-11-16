/* «اختبر معاني الكلمات» — a quiz on the meanings of Quran words (/quiz/), Arabic.
   Source: «السراج في بيان غريب القرآن» (QuranEnc key arabic_seraj): data/quiz/siraj.json (tools/build_quiz.py);
   the ayah shown with each question is read from the QuranEnc API.
   Every text shown is from the book: the right answer is the word's own meaning, and the two wrong answers are
   the meanings of other words of the whole book — true in their place, not invented. Nothing is stored.
   Scope from the address: ?s=SURAH | ?j=JUZ | ?p=PAGE (the book's «اختبر نفسك» button) | ?all ; default: juz 30.
   Data: /data/quran-pages.json (page -> first/last ayah, juz) for the juz/page ranges. */
(function () {
  'use strict';
  var QE = 'https://quranenc.com/api/v1/translation/sura/arabic_seraj/';
  var N = 10;                                   // questions per round
  var DIG = '٠١٢٣٤٥٦٧٨٩';
  var NAMES = ['الفاتحة','البقرة','آل عمران','النساء','المائدة','الأنعام','الأعراف','الأنفال','التوبة','يونس','هود','يوسف','الرعد','إبراهيم','الحجر','النحل','الإسراء','الكهف','مريم','طه','الأنبياء','الحج','المؤمنون','النور','الفرقان','الشعراء','النمل','القصص','العنكبوت','الروم','لقمان','السجدة','الأحزاب','سبأ','فاطر','يس','الصافات','ص','الزمر','غافر','فصلت','الشورى','الزخرف','الدخان','الجاثية','الأحقاف','محمد','الفتح','الحجرات','ق','الذاريات','الطور','النجم','القمر','الرحمن','الواقعة','الحديد','المجادلة','الحشر','الممتحنة','الصف','الجمعة','المنافقون','التغابن','الطلاق','التحريم','الملك','القلم','الحاقة','المعارج','نوح','الجن','المزمل','المدثر','القيامة','الإنسان','المرسلات','النبأ','النازعات','عبس','التكوير','الانفطار','المطففين','الانشقاق','البروج','الطارق','الأعلى','الغاشية','الفجر','البلد','الشمس','الليل','الضحى','الشرح','التين','العلق','القدر','البينة','الزلزلة','العاديات','القارعة','التكاثر','العصر','الهمزة','الفيل','قريش','الماعون','الكوثر','الكافرون','النصر','المسد','الإخلاص','الفلق','الناس'];
  var root = document.querySelector('[data-quiz]');
  if (!root) return;
  var ar = function (n) { return String(n).replace(/\d/g, function (d) { return DIG[d]; }); };
  var esc = function (t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  // compare words across spellings: no marks, no alef, one form of ya/waw/ta marbuta
  var len = function (t) {
    return String(t || '').replace(/[ً-ٰٟۖ-ۭـ]/g, '').replace(/[ٱأإآا]/g, '')
      .replace(/[ىئ]/g, 'ي').replace(/ؤ/g, 'و').replace(/ة/g, 'ه').replace(/[^ء-ي\s]/g, '').trim();
  };
  var shuffle = function (a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; };
  var track = function (e, d) { try { if (window.ltTrack) window.ltTrack(e, d); } catch (x) {} };

  var MAP = null, ALL = null, ayaTxt = {};
  function getJSON(u) { return fetch(u).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }); }
  // the whole book once (data/quiz/siraj.json, tools/build_quiz.py): [[surah, ayah, head-word, meaning], ...]
  function book() {
    return ALL ? Promise.resolve(ALL) : getJSON('/data/quiz/siraj.json').then(function (rows) {
      ALL = rows.map(function (r) { return feat({ s: r[0], a: r[1], head: r[2], mean: r[3] }); });
      return ALL;
    });
  }
  // the ayah's text in the Complex's script, for showing the question (QuranEnc gives it with the meanings)
  function ayah(e) {
    var k = e.s + ':' + e.a;
    if (!ayaTxt[k]) {
      ayaTxt[k] = getJSON('https://quranenc.com/api/v1/translation/aya/arabic_seraj/' + e.s + '/' + e.a)
        .then(function (d) { return (d.result && d.result.arabic_text) || ''; }, function () { delete ayaTxt[k]; return ''; });
    }
    return ayaTxt[k];
  }
  // the ayahs [from, to] (each [surah, ayah]) a scope covers
  function ranges(sc) {
    var P = MAP.pages, rs = [];
    if (sc.t === 's') rs.push([[sc.n, 1], [sc.n, MAP.verses[sc.n - 1]]]);
    else if (sc.t === 'p') rs.push([[P[sc.n - 1][0], P[sc.n - 1][1]], [P[sc.n - 1][2], P[sc.n - 1][3]]]);
    else if (sc.t === 'j') {
      var a = null, b = null;
      MAP.juz.forEach(function (j, i) { if (j === sc.n) { if (!a) a = [P[i][0], P[i][1]]; b = [P[i][2], P[i][3]]; } });
      rs.push([a, b]);
    } else rs.push([[1, 1], [114, 6]]);
    return rs;
  }
  var inR = function (e, rs) {
    var k = e.s * 1000 + e.a;
    return rs.some(function (r) { return k >= r[0][0] * 1000 + r[0][1] && k <= r[1][0] * 1000 + r[1][1]; });
  };

  /* Choosing the two wrong answers — from the whole book, not only the surah.
     A good wrong answer is the meaning of a word that LOOKS like the asked one, so the choice rests on knowing
     the meaning, not on form: close in wording (shared letters, same ending / rhyme), in pronunciation
     (same pattern of letters), in length (letter count, number of words) and in kind (noun with «ال» or
     tanween, verb, particle; the same attached pronoun and the same leading و / ف / ب) — and whose meaning
     reads like the right one (similar length, same pronoun) while being clearly different (no shared sense:
     few common words, neither contains the other), so the reader can still tell them apart. */
  var BARE = function (t) { return String(t || '').replace(/[\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g, '').replace(/[ٱأإآ]/g, 'ا').replace(/[^\u0621-\u064A\s]/g, '').trim(); };
  var PR = /(هما|هم|هن|كم|كن|نا|ها|ه|ك|ي)$/;
  function kind(raw, bare) {
    var w = bare.split(' ')[0];
    if (/^(و|ف|ب|ك|ل)?ال/.test(w) || /[\u064B\u064C\u064D]/.test(raw)) return 'n';         // «ال» or tanween: a noun
    if (/^(و|ف)?(س)?[يتنأ]/.test(w) && w.length >= 4 && !/ة$/.test(w)) return 'v';         // يفعل / تفعل / نفعل / أفعل
    if (/(وا|تم|تن|ت|نا)$/.test(w) && w.length >= 4) return 'v';                             // فعلوا / فعلتم / فعلت
    if (w.length <= 3) return 'p';
    return 'n';
  }
  function feat(e) {
    var hb = BARE(e.head), mb = BARE(e.mean), w = hb.split(' ');
    var core = w[0].replace(/^(و|ف|ب)/, '').replace(/^ال/, '').replace(PR, '');
    e.f = {
      key: len(e.head), mk: len(e.mean),
      words: w.length, letters: hb.replace(/\s/g, '').length,
      kind: kind(e.head, hb), al: /^(و|ف|ب)?ال/.test(w[0]),
      lead: /^[وفب]/.test(w[0]) ? w[0][0] : '', tail: (PR.exec(w[0]) || [''])[0], end2: w[w.length - 1].slice(-2),
      set: core.split('').filter(function (c, i, a) { return a.indexOf(c) === i; }),
      shape: core.replace(/[اوي]/g, '_'),                                                    // the consonant skeleton: how it sounds
      mwords: mb.split(' ').filter(function (x) { return x.length > 2; }).map(len),
      mtail: (PR.exec(mb.split(' ')[0]) || [''])[0], mlen: e.mean.length
    };
    return e;
  }
  function likeness(e, x) {
    var a = e.f, b = x.f, sc = 0;
    sc += a.kind === b.kind ? 30 : 0;
    sc += a.words === b.words ? 15 : 0;
    sc -= Math.abs(a.letters - b.letters) * 4;
    sc += a.al === b.al ? 8 : 0;
    sc += a.tail === b.tail ? 12 : 0;
    sc += a.lead === b.lead ? 6 : 0;
    sc += a.end2 === b.end2 ? 8 : 0;                                                         // the same rhyme
    sc += a.shape.length === b.shape.length ? 6 : 0;
    var common = a.set.filter(function (c) { return b.set.indexOf(c) >= 0; }).length;
    sc += 14 * common / Math.max(1, Math.max(a.set.length, b.set.length));                  // shared letters
    sc += a.mtail === b.mtail ? 8 : 0;
    sc -= Math.abs(a.mlen - b.mlen) / 3;
    return sc;
  }
  function distinct(e, x) {                                                                   // clearly a different meaning
    var a = e.f, b = x.f;
    if (x === e || a.key === b.key || a.mk === b.mk || a.mk.indexOf(b.mk) >= 0 || b.mk.indexOf(a.mk) >= 0) return false;
    var shared = a.mwords.filter(function (w) { return b.mwords.indexOf(w) >= 0; }).length;
    return shared / Math.max(1, Math.min(a.mwords.length, b.mwords.length)) < 0.34;
  }
  function wrong(e) {
    var best = ALL.filter(function (x) { return distinct(e, x); })
      .map(function (x) { return [likeness(e, x) + Math.random() * 6, x]; })              // a little chance: rounds differ
      .sort(function (p, q) { return q[0] - p[0]; }).slice(0, 12).map(function (p) { return p[1]; });
    var out = [];
    for (var i = 0; i < best.length && out.length < 2; i++) {
      if (out.length && !distinct(out[0], best[i])) continue;                               // the two wrong answers differ too
      out.push(best[i]);
    }
    return out.map(function (x) { return x.mean; });
  }
  // the ayah with the asked word(s) marked
  function ayahHtml(e, text) {
    var ws = text.split(/\s+/), hs = len(e.head).split(/\s+/).filter(Boolean), at = -1;
    for (var i = 0; i + hs.length <= ws.length && at < 0; i++) {
      var ok = hs.every(function (h, k) { var w = len(ws[i + k]); return w === h || (h.length >= 3 && (w.indexOf(h) >= 0 || h.indexOf(w) >= 0) && w.length >= 3); });
      if (ok) at = i;
    }
    return ws.map(function (w, i) { return at >= 0 && i >= at && i < at + hs.length ? '<mark>' + esc(w) + '</mark>' : esc(w); }).join(' ');
  }

  var scope = (function () {
    var q = new URLSearchParams(location.search), n;
    if ((n = +q.get('s')) >= 1 && n <= 114) return { t: 's', n: n };
    if ((n = +q.get('j')) >= 1 && n <= 30) return { t: 'j', n: n };
    if ((n = +q.get('p')) >= 1 && n <= 604) return { t: 'p', n: n };
    if (q.has('all')) return { t: 'a', n: 0 };
    return { t: 'j', n: 30 };
  })();
  var label = function (sc) {
    return sc.t === 's' ? 'سورة ' + NAMES[sc.n - 1] : sc.t === 'j' ? 'الجزء ' + ar(sc.n) : sc.t === 'p' ? 'صفحة ' + ar(sc.n) + ' من المصحف' : 'القرآن كله';
  };

  var round = null;
  function setup() {
    var o = function (v, t, sel) { return '<option value="' + v + '"' + (sel ? ' selected' : '') + '>' + esc(t) + '</option>'; };
    var nums = function (t) {
      if (t === 's') return NAMES.map(function (n, i) { return o(i + 1, ar(i + 1) + '. ' + n, scope.t === 's' && scope.n === i + 1); }).join('');
      if (t === 'j') return Array.from({ length: 30 }, function (_, i) { return o(i + 1, 'الجزء ' + ar(i + 1), scope.t === 'j' && scope.n === i + 1); }).join('');
      return '';
    };
    root.innerHTML =
      '<div class="qz-scope"><label>اختر النطاق</label><div class="qz-row">' +
      '<select data-q="type">' + o('j', 'جزء', scope.t === 'j') + o('s', 'سورة', scope.t === 's') + o('a', 'القرآن كله', scope.t === 'a') +
      (scope.t === 'p' ? o('p', 'صفحة ' + ar(scope.n), true) : '') + '</select>' +
      '<select data-q="num"></select></div>' +
      '<button type="button" class="qz-go" data-q="go">ابدأ</button></div>';
    var ty = root.querySelector('[data-q=type]'), nu = root.querySelector('[data-q=num]');
    var fill = function () { nu.innerHTML = nums(ty.value); nu.hidden = !nu.innerHTML; };
    ty.onchange = fill; fill();
    root.querySelector('[data-q=go]').onclick = function () {
      var t = ty.value;
      scope = t === 'a' ? { t: 'a', n: 0 } : t === 'p' ? scope : { t: t, n: +nu.value };
      var q = scope.t === 'a' ? '?all' : '?' + scope.t + '=' + scope.n;
      history.replaceState(null, '', location.pathname + q);
      start();
    };
  }
  function start() {
    root.innerHTML = '<p class="qz-note">جارٍ تجهيز الأسئلة…</p>';
    book().then(function () {
      var rs = ranges(scope), qs = shuffle(ALL.filter(function (e) { return inR(e, rs); })), seen = {}, list = [];
      for (var i = 0; i < qs.length && list.length < N; i++) {
        if (seen[qs[i].f.key]) continue;
        var w = wrong(qs[i]);
        if (w.length < 2) continue;
        seen[qs[i].f.key] = 1;
        list.push({ e: qs[i], opts: shuffle([qs[i].mean].concat(w)) });
      }
      if (!list.length) { root.innerHTML = '<p class="qz-note">لا توجد كلمات غريبة في هذا النطاق. اختر نطاقًا أوسع.</p>'; setupAgain(); return; }
      list.forEach(function (Q) { ayah(Q.e); });                                             // fetch the ayahs ahead
      round = { list: list, i: 0, ok: 0 };
      track('quiz_start', scope.t + scope.n);
      ask();
    }, function () {
      root.innerHTML = '<p class="qz-note">تعذّر تحميل الأسئلة. تأكد من اتصالك ثم أعد المحاولة.</p>';
      setupAgain();
    });
  }
  function setupAgain() {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'qz-go'; b.textContent = 'تغيير النطاق';
    b.onclick = setup; root.appendChild(b);
  }
  function ask() {
    var Q = round.list[round.i], e = Q.e;
    root.innerHTML =
      '<div class="qz-top"><span>' + esc(label(scope)) + '</span><span>السؤال ' + ar(round.i + 1) + ' من ' + ar(round.list.length) + '</span></div>' +
      '<div class="qz-ayah" translate="no">…</div>' +
      '<h2 class="qz-q">ما معنى <b translate="no">﴿' + esc(e.head) + '﴾</b>؟</h2>' +
      '<div class="qz-opts">' + Q.opts.map(function (t, i) { return '<button type="button" data-i="' + i + '">' + esc(t) + '</button>'; }).join('') + '</div>' +
      '<div class="qz-after" hidden></div>';
    root.querySelectorAll('.qz-opts button').forEach(function (b) {
      b.onclick = function () { answer(+b.dataset.i); };
    });
    var box = root.querySelector('.qz-ayah'), ref = ' <span class="qz-ref">﴿' + esc(NAMES[e.s - 1]) + ' ' + ar(e.a) + '﴾</span>';
    ayah(e).then(function (t) { if (round.list[round.i] === Q) box.innerHTML = (t ? ayahHtml(e, t) : '') + ref; });
    if (round.i) root.scrollIntoView({ block: 'start', behavior: 'smooth' });   // a long ayah: start each question at its top
  }
  function answer(i) {
    var Q = round.list[round.i], e = Q.e, right = Q.opts[i] === e.mean;
    if (right) round.ok++;
    root.querySelectorAll('.qz-opts button').forEach(function (b, k) {
      b.disabled = true;
      if (Q.opts[k] === e.mean) b.classList.add('ok');
      else if (k === i) b.classList.add('no');
    });
    var last = round.i === round.list.length - 1, af = root.querySelector('.qz-after');
    af.hidden = false;
    af.innerHTML = '<p class="' + (right ? 'qz-yes' : 'qz-nope') + '">' + (right ? 'إجابة صحيحة' : 'الإجابة الصحيحة مظلَّلة بالأخضر') + '</p>' +
      '<p class="qz-src">﴿' + esc(e.head) + '﴾: ' + esc(e.mean) + ' — السراج في بيان غريب القرآن · ' +
      '<a href="/book/#a=' + e.s + ':' + e.a + '">الآية في المصحف</a></p>' +
      '<button type="button" class="qz-go">' + (last ? 'النتيجة' : 'السؤال التالي') + '</button>';
    af.querySelector('button').onclick = function () { if (last) done(); else { round.i++; ask(); } };
  }
  function done() {
    var n = round.list.length, ok = round.ok;
    track('quiz_done', ok + '/' + n);
    root.innerHTML = '<div class="qz-done"><div class="qz-score">' + ar(ok) + ' / ' + ar(n) + '</div>' +
      '<p>' + (ok === n ? 'ما شاء الله! أجبت عن كل الأسئلة.' : ok >= n * 0.7 ? 'أحسنت.' : 'كل جولة تزيدك معرفة بكلمات القرآن.') + '</p>' +
      '<button type="button" class="qz-go" data-a="again">جولة جديدة</button> <button type="button" class="qz-go qz-alt" data-a="scope">تغيير النطاق</button></div>';
    root.querySelector('[data-a=again]').onclick = start;
    root.querySelector('[data-a=scope]').onclick = setup;
  }

  getJSON('/data/quran-pages.json').then(function (m) { MAP = m; if (/[?&](s|j|p)=|[?&]all/.test(location.search)) start(); else setup(); },
    function () { root.innerHTML = '<p class="qz-note">تعذّر التحميل. أعد تحميل الصفحة.</p>'; });
})();
