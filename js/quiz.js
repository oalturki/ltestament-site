/* «اختبر معاني الكلمات» — a quiz on the meanings of Quran words (/quiz/), Arabic.
   Source: «السراج في بيان غريب القرآن» (QuranEnc key arabic_seraj), read from the QuranEnc API one surah at a time.
   Every text shown is from the book: the right answer is the word's own meaning, and the two wrong answers are
   the meanings of other words in the same surahs — true in their place, not invented. Nothing is stored.
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

  var MAP = null, cache = {};
  function getJSON(u) { return fetch(u).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }); }
  function surah(s) {
    if (!cache[s]) {
      cache[s] = getJSON(QE + s).then(function (d) {
        var out = [];
        (d.result || []).forEach(function (v) {
          String(v.translation || '').split(/\n+/).forEach(function (l) {
            var i = l.indexOf(':');
            if (i < 1) return;
            var head = l.slice(0, i).trim(), mean = l.slice(i + 1).trim();
            if (head && mean) out.push({ s: +v.sura, a: +v.aya, head: head, mean: mean, text: v.arabic_text || '' });
          });
        });
        return out;
      });
      cache[s].catch(function () { delete cache[s]; });
    }
    return cache[s];
  }
  // the ayahs [from, to] (each [surah, ayah]) a scope covers, and the surahs to read
  function ranges(sc) {
    var P = MAP.pages, rs = [];
    if (sc.t === 's') rs.push([[sc.n, 1], [sc.n, MAP.verses[sc.n - 1]]]);
    else if (sc.t === 'p') rs.push([[P[sc.n - 1][0], P[sc.n - 1][1]], [P[sc.n - 1][2], P[sc.n - 1][3]]]);
    else if (sc.t === 'j') {
      var a = null, b = null;
      MAP.juz.forEach(function (j, i) { if (j === sc.n) { if (!a) a = [P[i][0], P[i][1]]; b = [P[i][2], P[i][3]]; } });
      rs.push([a, b]);
    } else {                                   // the whole Mushaf: a fresh handful of surahs each round
      shuffle(Array.from({ length: 114 }, function (_, i) { return i + 1; })).slice(0, 8).forEach(function (s) {
        rs.push([[s, 1], [s, MAP.verses[s - 1]]]);
      });
    }
    return rs;
  }
  var inR = function (e, rs) {
    var k = e.s * 1000 + e.a;
    return rs.some(function (r) { return k >= r[0][0] * 1000 + r[0][1] && k <= r[1][0] * 1000 + r[1][1]; });
  };
  function pool(sc) {
    var rs = ranges(sc), ss = {};
    rs.forEach(function (r) { for (var s = r[0][0]; s <= r[1][0]; s++) ss[s] = 1; });
    var list = Object.keys(ss).map(Number);
    if (list.length < 3) {                      // a page or a short surah: neighbouring surahs give enough wrong answers
      var s0 = list[0];
      [s0 - 1, s0 + 1, s0 + 2].forEach(function (x) { if (x >= 1 && x <= 114) ss[x] = 1; });
      list = Object.keys(ss).map(Number);
    }
    return Promise.all(list.map(surah)).then(function (all) {
      var every = [].concat.apply([], all);
      return { q: every.filter(function (e) { return inR(e, rs); }), all: every };
    });
  }
  // two wrong answers: other words' meanings, clearly different, close in length to the right one
  function wrong(e, all) {
    var m = len(e.mean), hw = len(e.head), L = e.mean.length;
    var c = all.filter(function (x) {
      var xm = len(x.mean);
      return x !== e && len(x.head) !== hw && xm !== m && xm.indexOf(m) < 0 && m.indexOf(xm) < 0;
    });
    var seen = {}, out = [];
    shuffle(c).sort(function (a, b) { return Math.abs(a.mean.length - L) - Math.abs(b.mean.length - L); });
    for (var i = 0; i < c.length && out.length < 2; i++) {
      var k = len(c[i].mean);
      if (seen[k]) continue;
      seen[k] = 1; out.push(c[i].mean);
    }
    return out;
  }
  // the ayah with the asked word(s) marked
  function ayahHtml(e) {
    var ws = e.text.split(/\s+/), hs = len(e.head).split(/\s+/).filter(Boolean), at = -1;
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
    pool(scope).then(function (P) {
      var qs = shuffle(P.q.slice()), seen = {}, list = [];
      for (var i = 0; i < qs.length && list.length < N; i++) {
        var k = len(qs[i].head);
        if (seen[k]) continue;
        var w = wrong(qs[i], P.all);
        if (w.length < 2) continue;
        seen[k] = 1;
        list.push({ e: qs[i], opts: shuffle([qs[i].mean].concat(w)) });
      }
      if (!list.length) { root.innerHTML = '<p class="qz-note">لا توجد كلمات غريبة كافية في هذا النطاق. اختر نطاقًا أوسع.</p>'; setupAgain(); return; }
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
      '<div class="qz-ayah" translate="no">' + ayahHtml(e) + ' <span class="qz-ref">﴿' + esc(NAMES[e.s - 1]) + ' ' + ar(e.a) + '﴾</span></div>' +
      '<h2 class="qz-q">ما معنى <b translate="no">﴿' + esc(e.head) + '﴾</b>؟</h2>' +
      '<div class="qz-opts">' + Q.opts.map(function (t, i) { return '<button type="button" data-i="' + i + '">' + esc(t) + '</button>'; }).join('') + '</div>' +
      '<div class="qz-after" hidden></div>';
    root.querySelectorAll('.qz-opts button').forEach(function (b) {
      b.onclick = function () { answer(+b.dataset.i); };
    });
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
