/* قياس نظام التسميع — /record/eval/ (admin): runs the live recitation check (js/live.js, unchanged) over each recording
   of the test set, fed block by block as if it came from the microphone, and compares what it found with what the reader
   was asked to do (data/testset/tasks.json). Each run is kept in rec_evals (supabase/migrations/recitation_evals.sql)
   under ENGINE, the name of the check measured — bump it whenever the check changes, so versions compare.
   Measures: detected (the planned mistake found), false alarms (words said right marked wrong), unreached (words the
   check never got to), and on the tajweed tasks the tajweed notes on the target word and elsewhere. */
(function () {
  var ENGINE = 'live-2026-11-21b';   // b: alignment prefers the nearest match (basmala)
  var app = document.getElementById('evApp');
  var AR = '٠١٢٣٤٥٦٧٨٩', num = function (n) { return String(n).replace(/[0-9]/g, function (d) { return AR[d]; }); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var KIND = { clean: 'صحيحة', word: 'ترك كلمة', ayah: 'تجاوز آية', repeat: 'تكرار آية', restart: 'رجوع لأول الآية',
               other: 'كلام من غير الآية', madd: 'قصر مد', ghunna: 'ترك غنة', qalqala: 'ترك قلقلة' };
  var FIND = { word: 1, ayah: 1, other: 1, madd: 1, ghunna: 1, qalqala: 1 };
  var TJ = { madd: 1, ghunna: 1, qalqala: 1 };
  var S = { c: null, clips: [], evals: {}, data: null, lex: {}, running: false, speed: 1 };

  function lex(s) {
    if (!S.lex[s]) S.lex[s] = fetch('/data/lexicon/' + s + '.json').then(function (r) { return r.json(); });
    return S.lex[s];
  }

  function start() {
    app.innerHTML = '<p class="rc-muted">جارٍ التحميل…</p>';
    Promise.all([Fam.ready(), fetch('/data/testset/tasks.json').then(function (r) { return r.json(); })]).then(function (r) {
      S.c = r[0]; S.data = r[1];
      if (!S.c) { app.innerHTML = '<div class="rc-card"><p>ادخل إلى <a href="/account/">حسابك</a> أولًا.</p></div>'; return; }
      return S.c.rpc('is_admin').then(function (a) {
        if (!a.data) { app.innerHTML = '<div class="rc-card"><p>هذه الصفحة للمشرف.</p></div>'; return; }
        return load();
      });
    }).catch(function (e) { app.innerHTML = '<p class="rc-muted">تعذّر التحميل: ' + esc(e.message || e) + '</p>'; });
  }
  function load() {
    return Promise.all([
      S.c.from('rec_clips').select('*, rec_consents(age_band, sex, level)').order('created_at'),
      S.c.from('rec_evals').select('id, clip_id, engine, detected, false_alarms, unreached, result, created_at').order('created_at')
    ]).then(function (r) {
      if (r[0].error) throw r[0].error; if (r[1].error) throw r[1].error;
      S.clips = r[0].data; S.evals = {};
      r[1].data.forEach(function (e) { (S.evals[e.clip_id] = S.evals[e.clip_id] || []).push(e); });
      draw();
    });
  }
  function last(clip) { var l = (S.evals[clip.id] || []).filter(function (e) { return e.engine === ENGINE; }); return l[l.length - 1]; }

  function draw() {
    var rows = S.clips, done = rows.filter(last);
    var finds = done.filter(function (c) { return FIND[c.kind] && c.done_as_asked !== false; });
    var found = finds.filter(function (c) { return last(c).detected; }).length;
    var fa = done.reduce(function (n, c) { return n + last(c).false_alarms; }, 0);
    var un = done.reduce(function (n, c) { return n + last(c).unreached; }, 0);
    app.innerHTML = '<div class="rc-card"><h2 class="rc-h">الإصدار: ' + ENGINE + '</h2>' +
      '<div class="ev-sum"><div><b>' + num(done.length) + '/' + num(rows.length) + '</b><span>تسجيلات مقيسة</span></div>' +
      '<div><b>' + (finds.length ? num(Math.round(100 * found / finds.length)) + '٪' : '—') + '</b><span>اكتشاف الأخطاء المقصودة (' + num(found) + ' من ' + num(finds.length) + ')</span></div>' +
      '<div><b>' + num(fa) + '</b><span>إنذارات خاطئة (كلمات صحيحة عُدّت خطأ)</span></div>' +
      '<div><b>' + num(un) + '</b><span>كلمات لم يصلها النظام</span></div></div>' +
      '<div class="rc-actions" style="justify-content:flex-start"><button class="fb-submit" id="evRun"' + (S.running ? ' disabled' : '') + '>قِس ما لم يُقس</button>' +
      '<button class="rc-link" id="evAll">أعد قياس الكل</button>' +
      '<label class="rc-muted">السرعة <select id="evSpeed"><option value="1">عادية</option><option value="2">ضعفان</option></select></label></div>' +
      '<p class="rc-muted" id="evNow"></p>' +
      '<table class="ev-t"><thead><tr><th>المهمة</th><th>القارئ</th><th>المطلوب</th><th>اكتُشف؟</th><th>إنذار خاطئ</th><th>لم يصلها</th><th>ما قاله النظام</th><th></th></tr></thead><tbody>' +
      rows.map(function (c) {
        var e = last(c), k = c.rec_consents || {};
        var det = !e ? '' : e.detected === true ? '<span class="ev-y">✓</span>' : e.detected === false ? '<span class="ev-n">✗</span>' : '—';
        return '<tr data-id="' + c.id + '"><td>' + esc(c.task) + '</td><td>' + esc((k.age_band || '') + ' ' + (k.sex || '')) + '</td>' +
          '<td>' + KIND[c.kind] + (c.done_as_asked === false ? ' <small>(لم يُنفَّذ)</small>' : '') + '</td><td>' + det + '</td>' +
          '<td>' + (e ? num(e.false_alarms) : '') + '</td><td>' + (e ? num(e.unreached) : '') + '</td>' +
          '<td class="ev-said">' + (e ? said(e.result) : '') + '</td><td><button class="rc-link ev-play">▶</button> <button class="rc-link ev-one">قِس</button></td></tr>';
      }).join('') + '</tbody></table></div>';
    document.getElementById('evSpeed').value = String(S.speed);
    document.getElementById('evSpeed').onchange = function () { S.speed = +this.value; };
    document.getElementById('evRun').onclick = function () { run(S.clips.filter(function (c) { return !last(c); })); };
    document.getElementById('evAll').onclick = function () { run(S.clips.slice()); };
    app.querySelectorAll('.ev-one').forEach(function (b) {
      b.onclick = function () { run(S.clips.filter(function (c) { return c.id === b.closest('tr').dataset.id; })); };
    });
    app.querySelectorAll('.ev-play').forEach(function (b) {
      b.onclick = function () {
        var c = S.clips.filter(function (x) { return x.id === b.closest('tr').dataset.id; })[0];
        S.c.storage.from('recitations').download(c.path).then(function (r) {
          if (r.error) throw r.error;
          if (S.audio) S.audio.pause();
          S.audio = new Audio(URL.createObjectURL(r.data)); S.audio.play();
        });
      };
    });
  }
  function said(r) {
    var out = (r.errors || []).map(function (x) {
      return '<span class="ev-e' + (x.target ? ' tgt' : '') + '">' + esc(x.text) + ' <small>' + (x.skip ? 'تجاوز' : x.cls === 'missing' ? 'ناقصة' : 'خطأ' + (x.heard ? ': ' + esc(x.heard) : '')) + '</small></span>';
    });
    if (r.other) out.push('<span class="ev-e tgt">بطاقة «أعد التلاوة» عند ' + esc(r.other) + '</span>');
    (r.tj || []).forEach(function (x) { out.push('<span class="ev-e tj' + (x.target ? ' tgt' : '') + '">' + esc(x.loc) + ': ' + esc(x.notes.join('، ')) + '</span>'); });
    return out.join(' ') || '<span class="ev-y">لا أخطاء</span>';
  }

  /* ---------- one measure ---------- */
  function run(list) {
    if (S.running || !list.length) return;
    S.running = true; draw();
    var i = 0;
    var next = function () {
      if (i >= list.length) { S.running = false; return load(); }
      var c = list[i++];
      document.getElementById('evNow').textContent = 'أقيس ' + c.task + ' (' + num(i) + ' من ' + num(list.length) + ')…';
      return measure(c).then(function (res) {
        return S.c.from('rec_evals').insert(res).then(function (r) { if (r.error) throw r.error; });
      }).catch(function (e) { console.error(e); document.getElementById('evNow').textContent = 'تعذّر قياس ' + c.task + ': ' + (e.message || e); })
        .then(function () { return load(); }).then(next);
    };
    next();
  }

  function pcm(buf) {
    var d = new DataView(buf), o = 12, rate = 16000, data = null;
    while (o + 8 <= d.byteLength) {
      var id = String.fromCharCode(d.getUint8(o), d.getUint8(o + 1), d.getUint8(o + 2), d.getUint8(o + 3)), n = d.getUint32(o + 4, true);
      if (id === 'fmt ') rate = d.getUint32(o + 12, true);
      if (id === 'data') { data = new Int16Array(buf.slice(o + 8, o + 8 + n)); break; }
      o += 8 + n + (n & 1);
    }
    var x = new Float32Array(data.length);
    for (var i = 0; i < data.length; i++) x[i] = data[i] / 32768;
    return { rate: rate, x: x };
  }

  function measure(c) {
    var P = S.data.passages[(S.data.tasks.filter(function (t) { return t.id === c.task; })[0] || {}).p] || {};
    var t0 = Date.now();
    return Promise.all([S.c.storage.from('recitations').download(c.path), lex(c.surah)]).then(function (r) {
      if (r[0].error) throw r[0].error;
      var L0 = r[1];
      return r[0].data.arrayBuffer().then(function (buf) {
        var a = pcm(buf), final = {}, allW = {}, other = null, tj = [], stretches = [];
        return new Promise(function (ok) {
          var L = LiveRecite({
            parts: [{ s: c.surah, a: c.ayah, b: c.ayah_to }], input: { rate: a.rate },
            tajweed: function () { return !!TJ[c.kind]; }, lang: 'ar',
            onWord: function (p, w, cls) {
              var loc = c.surah + ':' + w.ayah + ':' + w.n;
              allW[loc] = w.text;
              if (cls !== 'ti') final[loc] = { cls: cls, skip: !!w.skip, heard: w.heard || '', text: w.text };
            },
            onResult: function (res) {
              stretches.push({ pos: res.pos, next: res.next, heard: res.heard, sec: res.seconds, back: res.back || null, skipped: res.skipped || 0,
                sought: res.sought || null, other: res.other ? res.other.text : null,
                bad: (res.words || []).filter(function (x) { return x.status !== 'ok'; }).map(function (x) { return x.k + ':' + x.status + (x.heard ? '«' + x.heard + '»' : ''); }) });
            },
            onOther: function (p, w) { other = w ? c.surah + ':' + w.ayah + ':' + w.n : '?'; },
            onTajweed: function (p, s, d) {
              var idx = 0;
              (d.counts || []).forEach(function (cnt, ai) {
                var av = d.ayah + ai, rs = (d.words || []).slice(idx, idx + cnt); idx += cnt;
                rs.forEach(function (x, j) {
                  if (!x || x.ok !== false) return;
                  var loc = s + ':' + av + ':' + (j + 1), row = L0[loc] || {};
                  var ns = (x.notes || []).filter(function (n) { return !(row.stop && /idgham|ikhfa|iqlab|ghunn/i.test(n.rule || '')); });
                  if (ns.length) tj.push({ loc: loc, rules: ns.map(function (n) { return n.rule; }),
                    notes: ns.map(function (n) { return (n.msg && n.msg.ar) || n.rule; }), target: loc === c.target });
                });
              });
            },
            onState: function (st) { if (st === 'stopped') ok(); }
          });
          L.start();
          // the recording, in blocks about as long as the microphone's (4096 at 48 kHz), then a second of silence
          var B = Math.round(a.rate * 4096 / 48000), k = 0, sil = new Float32Array(B), tail = Math.ceil(a.rate * 1.5 / B);
          var step = function () {
            if (k < a.x.length) { L.feed(a.x.slice(k, k + B)); k += B; }
            else if (tail-- > 0) L.feed(sil);
            else return L.stop(true);
            setTimeout(step, 1000 * B / a.rate / S.speed);
          };
          step();
        }).then(function () { return new Promise(function (ok) { setTimeout(ok, TJ[c.kind] ? 6000 : 300); }); }).then(function () {
          // every word of the passage, from the lexicon (the engine numbers words like the Mushaf)
          var words = Object.keys(L0).filter(function (loc) { var q = loc.split(':'); return +q[1] >= c.ayah && +q[1] <= c.ayah_to; });
          var inTarget = function (loc) {
            if (!c.target) return false;
            return c.kind === 'ayah' ? loc.indexOf(c.target + ':') === 0 : loc === c.target;
          };
          var errors = [], fa = 0, unreached = 0, tHit = 0, tAll = 0;
          words.forEach(function (loc) {
            var f = final[loc], tg = inTarget(loc);
            if (tg) tAll++;
            if (!f) { unreached++; return; }
            if (f.cls === 'wrong' || f.cls === 'missing') {
              errors.push({ loc: loc, text: L0[loc].u, cls: f.cls, skip: f.skip, heard: f.heard, target: tg });
              if (tg) tHit++; else fa++;
            }
          });
          var det = null;
          if (c.kind === 'word') det = tHit > 0;
          else if (c.kind === 'ayah') det = tAll > 0 && tHit * 2 >= tAll;
          else if (c.kind === 'other') det = !!other;
          else if (TJ[c.kind]) det = tj.some(function (x) { return x.target; });
          return {
            clip_id: c.id, engine: ENGINE, level: (function () { try { return localStorage.getItem('lt_live_level') || 'normal'; } catch (e) { return 'normal'; } })(),
            detected: det, false_alarms: fa, unreached: unreached,
            result: { errors: errors, other: other, tj: tj, stretches: stretches, tj_false: tj.filter(function (x) { return !x.target; }).length,
                      words: words.length, ms: Date.now() - t0, speed: S.speed, title: P.title }
          };
        });
      });
    });
  }
  start();
})();
