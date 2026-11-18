/* «التسميع» (trial): the reader recites from memory and the words appear as they are recited.
   The microphone is read here; every stretch of recitation (since the last pause) goes to the recitation service
   (asr-space/, a Hugging Face Space, POST /live) about every two seconds, with the index of the next expected word.
   The reply lines what was heard up with the words from there on: right words are shown, a wrong or missing one is
   marked and the reciter (Al-Minshawi) says it correctly, from his word timings.
   The service address is set below (or as window.TS_API before this file). */
(function () {
  var API = window.TS_API || 'https://ltestament-tasmee.hf.space';
  var $ = function (id) { return document.getElementById(id); };
  var sSel = $('tsS'), aIn = $('tsA'), bIn = $('tsB'), hide = $('tsHide'), box = $('tsText'), btn = $('tsBtn'), st = $('tsSt'), out = $('tsOut');
  var V = window.TS_VERSES || [];
  var AN = '٠١٢٣٤٥٦٧٨٩', num = function (n) { return String(n).replace(/\d/g, function (d) { return AN[d]; }); };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var MARK = /^[ۖ-ۭ]+$/;                          // pause marks: not words that are said
  var text = [], words = [], R = null;

  try {
    var q = new URLSearchParams(location.search), last = JSON.parse(localStorage.getItem('lt_tasmee') || 'null') || {};
    sSel.value = q.get('s') || last.s || '1'; aIn.value = q.get('a') || last.a || 1; bIn.value = q.get('b') || last.b || V[0];
  } catch (e) {}

  function range() {
    var s = +sSel.value, n = V[s - 1] || 1;
    var a = Math.max(1, Math.min(n, +aIn.value || 1)), b = Math.max(a, Math.min(n, +bIn.value || a));
    aIn.max = bIn.max = n; aIn.value = a; bIn.value = b;
    try { localStorage.setItem('lt_tasmee', JSON.stringify({ s: s, a: a, b: b })); } catch (e) {}
    return { s: s, a: a, b: b };
  }
  // the words of the passage, in the service's order: [{k, ayah, i, text}]
  function draw() {
    var r = range(), html = '', k = 0;
    words = [];
    for (var a = r.a; a <= r.b; a++) {
      (text[a - 1] || '').split(' ').filter(function (w) { return w && !MARK.test(w); }).forEach(function (w, i) {
        words.push({ k: k, ayah: a, i: i, text: w });
        html += '<span class="w" data-k="' + k + '">' + esc(w) + '</span> ';
        k++;
      });
      html += '<span class="num">﴿' + num(a) + '﴾</span> ';
    }
    box.innerHTML = html;
    box.classList.toggle('hide', hide.checked);
    box.classList.remove('done');
    out.innerHTML = '';
  }
  function load() {
    var s = +sSel.value;
    return fetch('/data/text-simple/' + s + '.json').then(function (r) { return r.json(); }).then(function (t) { text = t; draw(); });
  }
  sSel.onchange = function () { aIn.value = 1; bIn.value = V[+sSel.value - 1] || 1; load(); };
  aIn.onchange = bIn.onchange = draw;
  hide.onchange = function () { box.classList.toggle('hide', hide.checked && !box.classList.contains('done')); };
  load();

  function wEl(k) { return box.querySelector('[data-k="' + k + '"]'); }
  function mark(k, cls) {
    var e = wEl(k); if (!e) return;
    e.classList.remove('ti', 'ok', 'wrong', 'missing', 'fixed');
    e.classList.add(cls);
  }

  /* ---------- the reciter says a word (Al-Minshawi's ayah file, cut at his word times) ---------- */
  var PAGES = null, actx = null, bufs = {};
  function pageOf(s, a) {
    var k = s * 1000 + a;
    for (var i = 0; i < PAGES.length; i++) { var p = PAGES[i]; if (k >= p[0] * 1000 + p[1] && k <= p[2] * 1000 + p[3]) return i + 1; }
    return 1;
  }
  var YA = /^(و?يا|ها)$/;                                  // «يا» stands apart in this text, joined to the next word in the Mushaf
  function sk(w) { return w.replace(/[ً-ٰٟۖ-ۭـ]/g, '').replace(/[أإآٱ]/g, 'ا'); }
  function mushafIndex(ayahWords, i) {                       // 1-based word number in the Mushaf (and its timings)
    var n = 1;
    for (var j = 0; j < i; j++) if (!YA.test(sk(ayahWords[j]))) n++;
    return n;
  }
  function say(w) {
    if (!actx) return Promise.resolve();
    var s = range().s, pad = function (x) { return ('00' + x).slice(-3); };
    var url = 'https://audio-cdn.tarteel.ai/quran/minshawyMurattal/' + pad(s) + pad(w.ayah) + '.mp3';
    var ayahWords = (text[w.ayah - 1] || '').split(' ').filter(function (x) { return x && !MARK.test(x); });
    var n = mushafIndex(ayahWords, w.i);
    var times = fetch('/data/rec/minshawi/p' + pageOf(s, w.ayah) + '.json').then(function (r) { return r.json(); })
      .then(function (m) { return m[s + ':' + w.ayah] || []; });
    if (!bufs[url]) bufs[url] = fetch(url).then(function (r) { return r.arrayBuffer(); }).then(function (b) {
      return new Promise(function (ok, bad) { var p = actx.decodeAudioData(b, ok, bad); if (p && p.then) p.then(ok, bad); });
    });
    return Promise.all([bufs[url], times]).then(function (x) {
      var buf = x[0], ws = x[1], i = -1;
      ws.forEach(function (t, j) { if (t[0] === n) i = j; });
      if (i < 0) return;
      var t0 = Math.max(0, ws[i][1] - 60) / 1000, t1 = ws[i + 1] ? ws[i + 1][1] / 1000 : buf.duration;
      return new Promise(function (done) {
        var src = actx.createBufferSource(); src.buffer = buf; src.connect(actx.destination);
        src.onended = done; src.start(0, t0, Math.max(0.2, t1 - t0));
      });
    }).catch(function () {});
  }

  /* ---------- listening ---------- */
  // R: {stream, ctx, node, rate, seg: Float32Array chunks of the current stretch, speaking, quiet, pos, busy, queue}
  function wav16(chunks, rate) {
    var len = 0; chunks.forEach(function (c) { len += c.length; });
    var all = new Float32Array(len), o = 0; chunks.forEach(function (c) { all.set(c, o); o += c.length; });
    var ratio = rate / 16000, n = Math.floor(len / ratio), pcm = new Int16Array(n);
    for (var i = 0; i < n; i++) {                            // average down to 16 kHz
      var a = Math.floor(i * ratio), b = Math.min(len, Math.floor((i + 1) * ratio)), s = 0;
      for (var j = a; j < b; j++) s += all[j];
      var v = s / Math.max(1, b - a); pcm[i] = Math.max(-32768, Math.min(32767, v * 32767));
    }
    var buf = new ArrayBuffer(44 + n * 2), d = new DataView(buf);
    var w = function (o2, s2) { for (var k = 0; k < s2.length; k++) d.setUint8(o2 + k, s2.charCodeAt(k)); };
    w(0, 'RIFF'); d.setUint32(4, 36 + n * 2, true); w(8, 'WAVE'); w(12, 'fmt '); d.setUint32(16, 16, true);
    d.setUint16(20, 1, true); d.setUint16(22, 1, true); d.setUint32(24, 16000, true); d.setUint32(28, 32000, true);
    d.setUint16(32, 2, true); d.setUint16(34, 16, true); w(36, 'data'); d.setUint32(40, n * 2, true);
    new Int16Array(buf, 44).set(pcm);
    return new Blob([buf], { type: 'audio/wav' });
  }
  function send(chunks, final) {
    var r = range(), fd = new FormData();
    fd.append('audio', wav16(chunks, R.rate), 'a.wav');
    fd.append('surah', r.s); fd.append('start', r.a); fd.append('end', r.b);
    fd.append('pos', R.pos); fd.append('final', final ? 'true' : 'false');
    R.busy = true;
    return fetch(API + '/live', { method: 'POST', body: fd }).then(function (x) {
      if (!x.ok) return x.text().then(function (t) { throw new Error(x.status + ' ' + t); });
      return x.json();
    }).then(function (res) { R.busy = false; return res; }, function (e) { R.busy = false; throw e; });
  }
  // where the reader is: a soft marker on the next word expected
  function cursor() {
    box.querySelectorAll('.cur').forEach(function (e) { e.classList.remove('cur'); });
    if (!R) return;
    var k = R.pos; while (wEl(k) && wEl(k).classList.contains('ti')) k++;
    var e = wEl(k); if (e) e.classList.add('cur');
  }
  function interim(res) {
    // a stretch still being recited: show the words heard right so far (lightly), nothing else yet
    box.querySelectorAll('.ti').forEach(function (e) { e.classList.remove('ti'); });
    res.words.forEach(function (w) { if (w.status === 'ok' && !wEl(w.k).classList.contains('ok')) mark(w.k, 'ti'); });
    cursor();
  }
  function commit(res) {
    box.querySelectorAll('.ti').forEach(function (e) { e.classList.remove('ti'); });
    var errs = [];
    res.words.forEach(function (w) {
      var e = wEl(w.k), was = e && (e.classList.contains('wrong') || e.classList.contains('missing'));
      if (w.status === 'ok') mark(w.k, was ? 'fixed' : 'ok');
      else { mark(w.k, w.status); if (e && w.heard) e.title = 'سُمع: ' + w.heard; errs.push(w); }
    });
    R.pos = Math.max(R.pos, res.next);
    cursor();
    if (errs.length && R.say) {                              // the reciter says the first word that went wrong
      R.mute = true;
      say(words[errs[0].k]).then(function () { setTimeout(function () { R.mute = false; }, 250); });
    }
    if (R.pos >= words.length) finish();
  }
  function pump() {
    if (!R || R.busy) return;
    if (R.queue.length) {                                    // finished stretches go first, in order
      var c = R.queue.shift();
      send(c, true).then(commit).catch(fail).then(pump);
      return;
    }
    if (R.speaking && R.seg.length && R.fresh) {
      R.fresh = false;
      send(R.seg.slice(), false).then(function (res) { if (R && res.pos === R.pos) interim(res); }).catch(function () {}).then(pump);
    }
  }
  function fail(e) {
    var m = String(e && e.message || e);
    st.textContent = /^503/.test(m) ? 'الخدمة تستعد، أعد المحاولة بعد دقيقة.' : 'تعذّر الاتصال بخدمة التسميع، أعد المحاولة.';
  }
  // the microphone is kept for a while after a stop, so the next start does not ask for permission again
  // (Safari asks each time the microphone is opened anew); released after two idle minutes
  var MIC = null, micT = 0;
  function getMic() {
    clearTimeout(micT);
    if (MIC && MIC.getAudioTracks().some(function (t) { return t.readyState === 'live'; })) return Promise.resolve(MIC);
    return navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } })
      .then(function (m) { MIC = m; return m; });
  }
  function releaseMic() {
    clearTimeout(micT);
    micT = setTimeout(function () { if (MIC && !R) { MIC.getTracks().forEach(function (t) { t.stop(); }); MIC = null; } }, 120000);
  }
  document.addEventListener('visibilitychange', function () {
    if (document.hidden && MIC && !R) { MIC.getTracks().forEach(function (t) { t.stop(); }); MIC = null; }
  });
  function start() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { st.textContent = 'المتصفح لا يدعم التسجيل.'; return; }
    var AC = window.AudioContext || window.webkitAudioContext;
    actx = actx || new AC();
    if (actx.state !== 'running') actx.resume();
    try { if (navigator.audioSession) navigator.audioSession.type = 'play-and-record'; } catch (e) {}
    draw();
    box.classList.add('live');
    st.textContent = 'جارٍ تشغيل الميكروفون…';
    getMic().then(function (stream) {
      var src = actx.createMediaStreamSource(stream), node = actx.createScriptProcessor(4096, 1, 1);
      R = { stream: stream, node: node, src: src, rate: actx.sampleRate, seg: [], pre: [], speaking: false, quiet: 0, segLen: 0,
            noise: 0.004, lvl: 0, pos: 0, busy: false, queue: [], fresh: false, mute: false, say: true, tick: 0 };
      var blk = 4096 / actx.sampleRate;                     // seconds per block (~85 ms)
      node.onaudioprocess = function (ev) {
        if (!R) return;
        var x = new Float32Array(ev.inputBuffer.getChannelData(0));
        if (R.mute) { x.fill(0); }                           // the reciter is speaking: do not listen to him
        var e = 0; for (var i = 0; i < x.length; i++) e += x[i] * x[i];
        var rms = Math.sqrt(e / x.length), thr = Math.max(0.01, R.noise * 3.2);
        R.lvl = R.lvl * 0.6 + Math.min(1, rms / 0.12) * 0.4;     // the button breathes with the voice: «I hear you»
        btn.style.boxShadow = '0 0 0 ' + Math.round(4 + R.lvl * 22) + 'px rgba(200,70,60,' + (0.12 + R.lvl * 0.3).toFixed(2) + ')';
        if (!R.speaking) {
          R.noise = R.noise * 0.95 + Math.min(rms, 0.05) * 0.05;
          R.pre.push(x); if (R.pre.length > 4) R.pre.shift();
          if (rms > thr && !R.mute) { R.speaking = true; R.seg = R.pre.slice(); R.pre = []; R.quiet = 0; R.segLen = R.seg.length * blk; }
          return;
        }
        R.seg.push(x); R.segLen += blk;
        R.quiet = rms > thr ? 0 : R.quiet + blk;
        if (R.quiet >= 0.75 || R.segLen >= 22) {            // a pause (or a long stretch): this stretch is done
          R.queue.push(R.seg); R.seg = []; R.speaking = false; R.quiet = 0; R.segLen = 0; R.fresh = false;
          pump(); return;
        }
        R.tick += blk;
        if (R.tick >= 0.9) { R.tick = 0; R.fresh = true; pump(); }
      };
      src.connect(node); node.connect(actx.destination);
      btn.classList.add('on'); btn.setAttribute('aria-label', 'إيقاف');
      st.textContent = 'اقرأ من حفظك… تظهر الكلمات وأنت تقرأ.';
      cursor();
    }).catch(function () { st.textContent = 'لم يُسمح بالميكروفون.'; box.classList.remove('live'); });
  }
  function stop(keep) {
    if (!R) return;
    var r0 = R;
    if (r0.seg.length && r0.segLen > 0.4) r0.queue.push(r0.seg);
    r0.seg = []; r0.speaking = false;
    try { r0.node.disconnect(); r0.src.disconnect(); } catch (e) {}
    releaseMic();
    btn.classList.remove('on'); btn.setAttribute('aria-label', 'ابدأ'); btn.style.boxShadow = '';
    box.querySelectorAll('.cur').forEach(function (e) { e.classList.remove('cur'); });
    var drain = function () {
      if (r0.busy || r0.queue.length) { pump(); return setTimeout(drain, 300); }
      R = null; summary();
    };
    if (!keep) { st.textContent = 'لحظة…'; drain(); } else { R = null; summary(); }
  }
  function finish() { stop(true); }
  function summary() {
    box.classList.remove('live'); box.classList.add('done');
    var c = function (cls) { return box.querySelectorAll('.w.' + cls).length; };
    var ok = c('ok'), fx = c('fixed'), wr = c('wrong'), ms = c('missing'), n = words.length, left = n - ok - fx - wr - ms;
    st.textContent = 'انتهى التسميع.';
    out.innerHTML = '<p class="ts-sum">صحيحة: ' + num(ok) + (fx ? ' · صُحّحت: ' + num(fx) : '') + ' · مختلفة: ' + num(wr) + ' · ناقصة: ' + num(ms) +
      (left > 0 ? ' · لم تُقرأ: ' + num(left) : '') + '</p>';
  }
  btn.onclick = function () { if (R) stop(false); else start(); };
})();
