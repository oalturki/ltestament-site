/* Live recitation check (التسميع الحي) — the engine, shared by the Mushaf page and the tasmee page.
   The microphone is read here; each stretch of recitation (from a pause to the next) is sent in pieces about every
   second to the recitation service (asr-space/, POST /live), which lines what it heard up with the words expected
   from the reader's place on. The page is told, word by word, what was heard: tentatively while the stretch goes on,
   for good when it ends. A passage may run over several surahs ("parts"); the engine goes from one to the next.

   var L = LiveRecite({
     api, parts: [{s, a, b}],                     // surah, first and last ayah of each part, in order
     onWord(p, w, cls)                            // w = {k, ayah, i, text}; cls: 'ti' (heard, not final) | 'ok' | 'fixed' | 'wrong' | 'missing'
     onClear(p)                                   // drop the tentative marks of part p
     onCursor(p, k)                               // the next word expected
     onPartDone(p), onDone()                      // a part / the whole passage recited
     onLevel(x)                                   // 0..1, the voice level (to show that it hears)
     onState(s, detail)                           // 'mic' | 'listening' | 'stopped' | 'denied' | 'error' | 'waking'
     say(p, w) -> Promise                         // optional: the reciter says the word (the engine stops listening meanwhile)
   });
   L.start(); L.stop(); L.setParts(parts) (a new passage, keeps the microphone) */
(function () {
  var MARK = /^[ۖ-ۭ]+$/;
  var texts = {};
  function surahText(s) {
    if (!texts[s]) texts[s] = fetch('/data/text-simple/' + s + '.json').then(function (r) { return r.json(); });
    return texts[s];
  }
  // «يا» stands apart in this text and is joined to the next word in the Mushaf: the word's number in the Mushaf
  var YA = /^(و?يا|ها)$/;
  function sk(w) { return w.replace(/[ً-ٰٟۖ-ۭـ]/g, '').replace(/[أإآٱ]/g, 'ا'); }
  function mushafNo(ayahWords, i) { var n = 1; for (var j = 0; j < i; j++) if (!YA.test(sk(ayahWords[j]))) n++; return n; }

  function wav16(chunks, rate) {
    var len = 0; chunks.forEach(function (c) { len += c.length; });
    var all = new Float32Array(len), o = 0; chunks.forEach(function (c) { all.set(c, o); o += c.length; });
    var ratio = rate / 16000, n = Math.floor(len / ratio), pcm = new Int16Array(n);
    for (var i = 0; i < n; i++) {
      var a = Math.floor(i * ratio), b = Math.min(len, Math.floor((i + 1) * ratio)), s = 0;
      for (var j = a; j < b; j++) s += all[j];
      pcm[i] = Math.max(-32768, Math.min(32767, s / Math.max(1, b - a) * 32767));
    }
    var buf = new ArrayBuffer(44 + n * 2), d = new DataView(buf);
    var w = function (o2, s2) { for (var k = 0; k < s2.length; k++) d.setUint8(o2 + k, s2.charCodeAt(k)); };
    w(0, 'RIFF'); d.setUint32(4, 36 + n * 2, true); w(8, 'WAVE'); w(12, 'fmt '); d.setUint32(16, 16, true);
    d.setUint16(20, 1, true); d.setUint16(22, 1, true); d.setUint32(24, 16000, true); d.setUint32(28, 32000, true);
    d.setUint16(32, 2, true); d.setUint16(34, 16, true); w(36, 'data'); d.setUint32(40, n * 2, true);
    new Int16Array(buf, 44).set(pcm);
    return new Blob([buf], { type: 'audio/wav' });
  }

  // the microphone is kept between starts for two idle minutes (Safari asks each time it is opened anew)
  var MIC = null, micT = 0;
  function getMic() {
    clearTimeout(micT);
    if (MIC && MIC.getAudioTracks().some(function (t) { return t.readyState === 'live'; })) return Promise.resolve(MIC);
    return navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } })
      .then(function (m) { MIC = m; return m; });
  }
  function dropMic() { clearTimeout(micT); if (MIC) { MIC.getTracks().forEach(function (t) { t.stop(); }); MIC = null; } }
  function releaseMic() { clearTimeout(micT); micT = setTimeout(dropMic, 120000); }
  document.addEventListener('visibilitychange', function () { if (document.hidden && !LiveRecite.active) dropMic(); });

  var warmT = 0;
  function warm(api) { if (Date.now() - warmT < 20000) return; warmT = Date.now(); fetch(api + '/live', { cache: 'no-store' }).catch(function () {}); }

  function LiveRecite(o) {
    var API = o.api || 'https://ltestament-tasmee.hf.space';
    var noop = function () {};
    ['onWord', 'onClear', 'onCursor', 'onPartDone', 'onDone', 'onLevel', 'onState'].forEach(function (k) { if (!o[k]) o[k] = noop; });
    var parts = [], P = 0, R = null, actx = null;

    function loadParts(list) {
      parts = list.map(function (x) { return { s: x.s, a: x.a, b: x.b, words: [], pos: 0, ready: null }; });
      P = 0;
      parts.forEach(function (pt) {
        pt.ready = surahText(pt.s).then(function (t) {
          var k = 0;
          for (var a = pt.a; a <= pt.b; a++) {
            var ws = (t[a - 1] || '').split(' ').filter(function (w) { return w && !MARK.test(w); });
            ws.forEach(function (w, i) { pt.words.push({ k: k++, ayah: a, i: i, n: mushafNo(ws, i), text: w }); });
          }
        });
      });
    }
    loadParts(o.parts || []);

    function cursor() {
      var pt = parts[P]; if (!pt || !R) return;
      var k = pt.pos; while (k < pt.words.length && pt.words[k].ti) k++;
      o.onCursor(P, k < pt.words.length ? pt.words[k] : null);
    }
    function send(seg, final) {
      var pt = parts[P], fd = new FormData(), from = seg.sent || 0;
      fd.append('audio', wav16(seg.slice(from), R.rate), 'a.wav');
      fd.append('sid', seg.sid); fd.append('append', from > 0 ? 'true' : 'false');
      seg.sent = seg.length;
      fd.append('surah', pt.s); fd.append('start', pt.a); fd.append('end', pt.b);
      fd.append('pos', pt.pos); fd.append('final', final ? 'true' : 'false');
      R.busy = true;
      var myP = P;
      return fetch(API + '/live', { method: 'POST', body: fd }).then(function (x) {
        if (!x.ok) return x.text().then(function (t) { throw new Error(x.status + ' ' + t); });
        return x.json();
      }).then(function (res) { R && (R.busy = false); res.part = myP; return res; },
        function (e) { R && (R.busy = false); seg.sent = 0; throw e; });
    }
    function interim(res) {
      var pt = parts[res.part]; if (!pt || res.part !== P || res.pos !== pt.pos) return;
      pt.words.forEach(function (w) { w.ti = false; });
      o.onClear(P);
      res.words.forEach(function (x) { var w = pt.words[x.k]; if (w && x.status === 'ok' && !w.done) { w.ti = true; o.onWord(P, w, 'ti'); } });
      cursor();
    }
    function commit(res) {
      var pt = parts[res.part]; if (!pt || res.part !== P) return;
      pt.words.forEach(function (w) { w.ti = false; });
      o.onClear(P);
      var errs = [];
      res.words.forEach(function (x) {
        var w = pt.words[x.k]; if (!w) return;
        var was = w.done === 'wrong' || w.done === 'missing';
        if (x.status === 'ok') { w.done = was ? 'fixed' : 'ok'; o.onWord(P, w, w.done); }
        else { w.done = x.status; w.heard = x.heard; o.onWord(P, w, x.status); errs.push(w); }
      });
      pt.pos = Math.max(pt.pos, res.next);
      cursor();
      if (errs.length && o.say && R) {                     // the reciter says the first word that went wrong
        R.mute = true;
        Promise.resolve(o.say(P, errs[0])).catch(noop).then(function () { setTimeout(function () { if (R) R.mute = false; }, 250); });
      }
      if (pt.pos >= pt.words.length) {
        o.onPartDone(P);
        if (P + 1 < parts.length) { P++; cursor(); } else { o.onDone(); }
      }
    }
    function pump() {
      if (!R || R.busy) return;
      if (R.queue.length) {
        var c = R.queue.shift();
        parts[P].ready.then(function () { return send(c, true); }).then(commit).catch(fail).then(pump);
        return;
      }
      if (R.speaking && R.seg.length && R.fresh) {
        R.fresh = false;
        parts[P].ready.then(function () { return send(R.seg, false); }).then(interim).catch(noop).then(pump);
      }
    }
    function fail(e) { var m = String(e && e.message || e); o.onState(/^503/.test(m) ? 'waking' : 'error', m); }

    function start() {
      if (R) return;
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { o.onState('error', 'no microphone'); return; }
      warm(API);
      var AC = window.AudioContext || window.webkitAudioContext;
      actx = actx || new AC();
      if (actx.state !== 'running') actx.resume();
      try { if (navigator.audioSession) navigator.audioSession.type = 'play-and-record'; } catch (e) {}
      o.onState('mic');
      getMic().then(function (stream) {
        var src = actx.createMediaStreamSource(stream), node = actx.createScriptProcessor(4096, 1, 1);
        R = { node: node, src: src, rate: actx.sampleRate, seg: [], pre: [], speaking: false, quiet: 0, segLen: 0,
              noise: 0.004, lvl: 0, busy: false, queue: [], fresh: false, mute: false, tick: 0 };
        LiveRecite.active = true;
        var blk = 4096 / actx.sampleRate;
        node.onaudioprocess = function (ev) {
          if (!R) return;
          var x = new Float32Array(ev.inputBuffer.getChannelData(0));
          if (R.mute) x.fill(0);
          var e = 0; for (var i = 0; i < x.length; i++) e += x[i] * x[i];
          var rms = Math.sqrt(e / x.length), thr = Math.max(0.01, R.noise * 3.2);
          R.lvl = R.lvl * 0.6 + Math.min(1, rms / 0.12) * 0.4; o.onLevel(R.lvl);
          if (!R.speaking) {
            R.noise = R.noise * 0.95 + Math.min(rms, 0.05) * 0.05;
            R.pre.push(x); if (R.pre.length > 4) R.pre.shift();
            if (rms > thr && !R.mute) {
              R.speaking = true; R.seg = R.pre.slice(); R.pre = []; R.quiet = 0; R.segLen = R.seg.length * blk;
              R.seg.sid = Math.random().toString(36).slice(2) + Date.now().toString(36); R.seg.sent = 0;
            }
            return;
          }
          R.seg.push(x); R.segLen += blk;
          R.quiet = rms > thr ? 0 : R.quiet + blk;
          if (R.quiet >= 0.75 || R.segLen >= 22) {
            R.queue.push(R.seg); R.seg = []; R.speaking = false; R.quiet = 0; R.segLen = 0; R.fresh = false;
            pump(); return;
          }
          R.tick += blk;
          if (R.tick >= 0.9) { R.tick = 0; R.fresh = true; pump(); }
        };
        src.connect(node); node.connect(actx.destination);
        o.onState('listening'); cursor();
      }).catch(function () { o.onState('denied'); });
    }
    function stop(release) {
      if (!R) { if (release) dropMic(); return; }
      var r0 = R;
      if (r0.seg.length && r0.segLen > 0.4) r0.queue.push(r0.seg);
      r0.seg = []; r0.speaking = false;
      try { r0.node.disconnect(); r0.src.disconnect(); } catch (e) {}
      if (release) dropMic(); else releaseMic();
      o.onLevel(0);
      var drain = function () {
        if (r0.busy || r0.queue.length) { pump(); return setTimeout(drain, 300); }
        if (R === r0) R = null;
        LiveRecite.active = false;
        o.onState('stopped');
      };
      drain();
    }
    return {
      start: start, stop: stop, warm: function () { warm(API); },
      setParts: function (list) { loadParts(list); if (R) cursor(); },
      // stop listening while something plays (a word said on request), so the microphone does not take it for the reader
      hold: function (pr) { if (!R) return; R.mute = true; Promise.resolve(pr).catch(noop).then(function () { setTimeout(function () { if (R) R.mute = false; }, 250); }); },
      get running() { return !!R; }
    };
  }
  LiveRecite.active = false;
  window.LiveRecite = LiveRecite;
})();
