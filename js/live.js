/* Live recitation check (التسميع الحي) — the engine, shared by the Mushaf page and the tasmee page.
   The microphone is read here; each stretch of recitation (from a pause to the next) is sent in pieces about every
   second to the recitation service (asr-space/, POST /live), which lines what it heard up with the words expected
   from the reader's place on. The page is told, word by word, what was heard: tentatively while the stretch goes on,
   for good when it ends. A passage may run over several surahs ("parts"); the engine goes from one to the next.

   var L = LiveRecite({
     api, parts: [{s, a, b}],                     // surah, first and last ayah of each part, in order
     onWord(p, w, cls)                            // w = {k, ayah, i, text, skip}; cls: 'ti' (heard, not final) | 'ok' | 'fixed' | 'wrong' | 'missing' (skip: passed over)
     onClear(p)                                   // drop the tentative marks of part p
     onCursor(p, k)                               // the next word expected
     onPartDone(p), onDone()                      // a part / the whole passage recited
     onLevel(x)                                   // 0..1, the voice level (to show that it hears)
     onOther(p, w, text)                          // optional: words not from the Quran were heard; say it again from w
     onUnclear(p)                                 // optional: a stretch was said but nothing of the passage could be made out
     onState(s, detail)                           // 'mic' | 'listening' | 'stopped' | 'denied' | 'error' | 'waking'
     say(p, w) -> Promise                         // optional: the reciter says the word (the engine stops listening meanwhile)
   });
   L.start(); L.stop(); L.setParts(parts) (a new passage, keeps the microphone)
   With o.input = {rate} it hears a recording instead: L.feed(float32 block) (the test-set measure, /record/eval/) */
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
  // the microphone serves only the page while it is in front: hidden (another app or tab, the screen locked), it is
  // let go at once — the recitation waits and goes on when the page is back; the page closed, it is let go for good
  document.addEventListener('visibilitychange', function () { if (document.hidden) dropMic(); });
  window.addEventListener('pagehide', dropMic);

  var warmT = 0;
  function warm(api) { if (Date.now() - warmT < 20000) return; warmT = Date.now(); fetch(api + '/live', { cache: 'no-store' }).catch(function () {}); }

  function LiveRecite(o) {
    var API = o.api || 'https://ltestament-tasmee.hf.space';
    var noop = function () {};
    ['onWord', 'onClear', 'onCursor', 'onPartDone', 'onDone', 'onLevel', 'onState'].forEach(function (k) { if (!o[k]) o[k] = noop; });
    var parts = [], P = 0, R = null, actx = null;

    // a passage already begun in this session (the reader turned to another page and came back) goes on where it was
    var seen = {};
    function loadParts(list) {
      parts = list.map(function (x) {
        var key = x.s + ':' + x.a + ':' + x.b;
        return seen[key] || (seen[key] = { s: x.s, a: x.a, b: x.b, words: [], pos: 0, ready: null });
      });
      P = 0;
      while (P + 1 < parts.length && parts[P].ready && parts[P].pos >= parts[P].words.length) P++;
      parts.forEach(function (pt) {
        if (pt.ready) return;
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
    function send(seg, final, again) {
      var pt = parts[P], fd = new FormData(), from = seg.sent || 0;
      fd.append('audio', wav16(seg.slice(from), R.rate), 'a.wav');
      fd.append('sid', seg.sid); fd.append('append', from > 0 ? 'true' : 'false');
      seg.sent = seg.length;
      fd.append('surah', pt.s); fd.append('start', pt.a); fd.append('end', pt.b);
      fd.append('pos', pt.pos); fd.append('final', final ? 'true' : 'false');
      if (!pt.started && pt.pos === 0) fd.append('seek', 'true');   // nothing recited yet: he may begin anywhere
      var lv = 'normal'; try { lv = localStorage.getItem('lt_live_level') || 'normal'; } catch (e) {}
      fd.append('level', lv);                                      // how strict the check is (easy / normal / strict)
      R.busy = true;
      var myP = P;
      return fetch(API + '/live', { method: 'POST', body: fd }).then(function (x) {
        // the service does not have this stretch's beginning (restarted, or a piece was lost): send it whole, once
        if (x.status === 409 && !again) { seg.sent = 0; return send(seg, final, true).then(function (r) { r.__again = 1; return r; }); }
        if (!x.ok) return x.text().then(function (t) { throw new Error(x.status + ' ' + t); });
        return x.json();
      }).then(function (res) { if (res.__again) return res; R && (R.busy = false); res.part = myP; return res; },
        function (e) { R && (R.busy = false); seg.sent = 0; throw e; });
    }
    function interim(res) {
      // while a stretch goes on: show the words already heard right, never fewer than already shown (no flicker)
      var pt = parts[res.part]; if (!pt || res.part !== P) return;
      sought(pt, res);
      if (res.pos !== pt.pos) return;
      // only the words heard right one after another from the reader's place: a word is never shown before it was
      // said (other words heard, or a word not yet clear, stop it — the end of the stretch judges them)
      var far = pt.tiTo || -1, st = {};
      res.words.forEach(function (x) { st[x.k] = x.status; });
      for (var k0 = Math.max(pt.pos, far + 1); st[k0] === 'ok'; k0++) far = k0;
      pt.tiTo = far;
      for (var k = pt.pos; k <= far && k < pt.words.length; k++) {
        var w = pt.words[k];
        if (!w.done && !w.ti) { w.ti = true; o.onWord(P, w, 'ti'); }
      }
      cursor();
    }
    // the reader began further on: the passage goes on from where he began
    function sought(pt, res) {
      if (res.sought && !pt.started && pt.pos === 0) { pt.pos = res.sought; pt.started = true; if (o.onSought) o.onSought(P, pt.words[res.sought]); }
    }
    function commit(res) {
      var pt = parts[res.part]; if (!pt || res.part !== P) return;
      if (o.onResult) o.onResult(res);                    // optional: each stretch as the service judged it (the measure keeps it)
      if (res.unclear && o.onUnclear) o.onUnclear(res.part);  // a whole stretch said, nothing of the passage made out: «say it again, clearer»
      sought(pt, res);
      if (res.words.length) pt.started = true;
      pt.words.forEach(function (w) { w.ti = false; });
      pt.tiTo = -1;
      o.onClear(P);
      var errs = [];
      // words said that are not the Quran at all (someone else talking, or the reader saying something else): not a
      // mistake yet — the page asks him to say it again from that word. The second time at the same word, it counts.
      var oth = res.other, again = oth && !(pt.otherAt = pt.otherAt || {})[oth.k];
      if (again) { pt.otherAt[oth.k] = 1; res.words = res.words.filter(function (x) { return x.k < oth.k; }); res.next = oth.k; }
      var pos0 = pt.pos;
      // a word not clearly heard: as in a halaqa, neither let pass nor called wrong — he says it again, from where he
      // paused before it (the stretch's first word: stretches are cut at his pauses). The second time at the same
      // word it stays «not made out» (shown apart, not counted right). Only where the page asks for it (o.againUnclear):
      // the measure on the test set judges the recording as it is
      var askAt = null, unc = !again && o.againUnclear && res.words.filter(function (x) { return x.status === 'unclear' && x.k >= pos0; })[0];
      if (unc) {
        pt.uncAt = pt.uncAt || {};
        if (!pt.uncAt[unc.k]) {
          pt.uncAt[unc.k] = 1;
          var ks = res.words.map(function (x) { return x.k; }).filter(function (k) { return k >= pos0; });
          askAt = { from: Math.min.apply(null, ks), k: unc.k };
          res.words = res.words.filter(function (x) { return x.k < askAt.from; }); res.next = askAt.from;
        }
      }
      res.words.forEach(function (x) {
        var w = pt.words[x.k]; if (!w) return;
        var was = w.done === 'wrong' || w.done === 'missing';
        // said again (the reader went back over what he had recited): a mistake then put right counts as corrected;
        // a word already right stays as it was (not marked again, nor turned into a mistake)
        if (x.k < pos0 && w.done && !(was && (x.status === 'ok' || x.status === 'unclear'))) return;
        if (x.status === 'ok') { w.done = was ? 'fixed' : 'ok'; o.onWord(P, w, w.done); }
        else if (x.status === 'unclear') { w.done = was ? 'fixed' : 'unclear'; o.onWord(P, w, w.done); }   // not clearly heard: shown, not a mistake
        else { w.done = x.status; w.heard = x.heard; w.skip = !!x.skip; o.onWord(P, w, x.status); if (!x.skip || !errs.length) errs.push(w); }
      });
      pt.pos = Math.max(pt.pos, res.next);
      cursor();
      if (again && o.onOther) { o.onOther(P, pt.words[oth.k], oth.text); errs = []; }
      if (askAt && o.onAgain) { o.onAgain(P, pt.words[askAt.from], pt.words[askAt.k]); errs = []; }
      if (o.tajweed && o.tajweed()) tjCollect(pt, res, pos0, again || !!askAt);
      if (errs.length && o.say && R) {                     // the reciter says the first word that went wrong
        R.mute = true;
        Promise.resolve(o.say(P, errs[0])).catch(noop).then(function () { setTimeout(function () { if (R) R.mute = false; }, 250); });
      }
      if (pt.pos >= pt.words.length) {
        o.onPartDone(P);
        if (P + 1 < parts.length) { P++; cursor(); } else { o.onDone(); }
      }
    }
    // the tajweed Mushaf: the recitation of whole verses (from a verse's first word to its last, in one go or over a
    // few stretches) is sent on to be heard for its tajweed; what comes back is given to the page (o.onTajweed)
    function tjCollect(pt, res, pos0, again) {
      var ws = res.words.filter(function (x) { return x.k >= pos0; }).sort(function (a, b) { return a.k - b.k; });
      if (!ws.length || res.back || again || ws.some(function (x) { return x.skip; }) || !res.chunks) { pt.tj = null; return; }
      var first = pt.words[ws[0].k], last = pt.words[ws[ws.length - 1].k];
      if (!first || !last) { pt.tj = null; return; }
      if (pt.tj && first.k !== pt.tj.next) pt.tj = null;
      if (!pt.tj) { if (first.i !== 0) return; pt.tj = { a: first.ayah, chunks: [], secs: 0 }; }
      pt.tj.chunks = pt.tj.chunks.concat(res.chunks);
      pt.tj.secs += res.chunks.reduce(function (n, c) { return n + c.length; }, 0) / res.rate;
      pt.tj.next = last.k + 1; pt.tj.rate = res.rate;
      if (pt.tj.secs > 28) { pt.tj = null; return; }
      var nx = pt.words[last.k + 1];
      if (nx && nx.ayah === last.ayah) return;              // the verse goes on in the next stretch
      var job = pt.tj, s = pt.s, p0 = parts.indexOf(pt); pt.tj = null;
      var fd = new FormData();
      fd.append('audio', wav16(job.chunks, job.rate), 'a.wav');
      fd.append('surah', s); fd.append('ayah', job.a); fd.append('to', last.ayah); fd.append('lang', o.lang || 'ar');
      fetch(API + '/tajweed', { method: 'POST', body: fd }).then(function (x) { return x.ok ? x.json() : null; })
        .then(function (d) { if (d && o.onTajweed) o.onTajweed(p0, s, d); }).catch(noop);
    }
    function pump() {
      if (!R || R.busy) return;
      if (R.queue.length) {
        var c = R.queue.shift();
        var rate = R.rate;
        parts[P].ready.then(function () { return send(c, true); }).then(function (res) { res.chunks = c; res.rate = rate; return res; }).then(commit).catch(fail).then(pump);
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
      if (o.input) { begin(o.input.rate); return; }        // a recording fed by the page (L.feed), not the microphone
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { o.onState('error', 'no microphone'); return; }
      warm(API);
      var AC = window.AudioContext || window.webkitAudioContext;
      actx = actx || new AC();
      if (actx.state !== 'running') actx.resume();
      try { if (navigator.audioSession) navigator.audioSession.type = 'play-and-record'; } catch (e) {}
      o.onState('mic');
      getMic().then(function (stream) {
        var src = actx.createMediaStreamSource(stream), node = actx.createScriptProcessor(4096, 1, 1);
        begin(actx.sampleRate, src, node);
      }).catch(function () { o.onState('denied'); });
    }
    function begin(rate, src, node) {
      R = { node: node, src: src, rate: rate, seg: [], pre: [], speaking: false, quiet: 0, segLen: 0, input: !src,
            noise: 0.004, lvl: 0, busy: false, queue: [], fresh: false, mute: false, tick: 0 };
      LiveRecite.active = true;
      R.proc = function (ev) {
        if (!R) return;
        R.lastT = Date.now();
        var x = new Float32Array(ev.inputBuffer.getChannelData(0)), blk = x.length / R.rate;
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
        // a stretch ends at a pause; a long one (read on without pausing) at the first short dip after 20 s — not cut
        // mid-word at a fixed length (that made a word into two wrong halves) — and at 28 s at most (the service takes 30)
        if (R.quiet >= 0.75 || (R.segLen >= 20 && R.quiet >= 0.2) || R.segLen >= 28) {
          R.queue.push(R.seg); R.seg = []; R.speaking = false; R.quiet = 0; R.segLen = 0; R.fresh = false;
          pump(); return;
        }
        R.tick += blk;
        if (R.tick >= 0.9) { R.tick = 0; R.fresh = true; pump(); }
      };
      if (node) { node.onaudioprocess = R.proc; src.connect(node); node.connect(actx.destination); }
      o.onState('listening'); cursor();
    }
    // back on the page after another app or tab: the phone may have cut the microphone off meanwhile (the session goes
    // on, nothing heard) — open it again and join it to the same listening
    function rehook(force) {
      if (!R || R.input) return;
      var r0 = R;
      if (document.hidden) { try { r0.node.disconnect(); r0.src.disconnect(); } catch (e) {} r0.seg = []; r0.speaking = false; return; }
      if (actx && actx.state !== 'running') actx.resume();
      var live_ = MIC && MIC.getAudioTracks().some(function (t) { return t.readyState === 'live' && !t.muted; });
      if (live_ && force !== true) return;
      MIC = null;
      getMic().then(function (stream) {
        if (R !== r0) return;
        try { r0.node.disconnect(); r0.src.disconnect(); } catch (e) {}
        var src = actx.createMediaStreamSource(stream), node = actx.createScriptProcessor(4096, 1, 1);
        node.onaudioprocess = r0.proc; r0.src = src; r0.node = node;
        src.connect(node); node.connect(actx.destination);
      }).catch(function () { o.onState('denied'); });
    }
    document.addEventListener('visibilitychange', function () { rehook(); });
    window.addEventListener('pageshow', function () { rehook(); });
    // and if no sound at all reaches the page for three seconds while it is shown, the same
    setInterval(function () {
      if (R && !R.input && !document.hidden && R.lastT && Date.now() - R.lastT > 3000) { R.lastT = Date.now(); if (actx.state !== 'running') actx.resume(); rehook(true); }
    }, 1500);
    function stop(release) {
      if (!R) { if (release) dropMic(); return; }
      var r0 = R;
      if (r0.seg.length && r0.segLen > 0.4) r0.queue.push(r0.seg);
      r0.seg = []; r0.speaking = false;
      try { r0.node.disconnect(); r0.src.disconnect(); } catch (e) {}
      if (release) dropMic(); else releaseMic();
      o.onLevel(0);
      var drain = function () {
        if (r0.busy || r0.queue.length) { pump(); return (o.tick || setTimeout)(drain, 300); }   // o.tick: the measure's own timer (a hidden tab slows setTimeout)
        if (R === r0) R = null;
        LiveRecite.active = false;
        o.onState('stopped');
      };
      drain();
    }
    return {
      start: start, stop: stop, warm: function () { warm(API); },
      // a recording instead of the microphone (o.input = {rate}): the page gives it block by block, at its own pace
      feed: function (x) { if (R && R.input) R.proc({ inputBuffer: { getChannelData: function () { return x; } } }); },
      setParts: function (list) {
        loadParts(list); if (R) cursor();
        // a passage gone back to: its words recited so far are shown again as they were (the page drew them anew)
        parts.forEach(function (pt, i) {
          pt.ready.then(function () { pt.words.forEach(function (w) { if (w.done) o.onWord(i, w, w.done, true); }); });
        });
      },
      // stop listening while something plays (a word said on request), so the microphone does not take it for the reader
      hold: function (pr) { if (!R) return; R.mute = true; Promise.resolve(pr).catch(noop).then(function () { setTimeout(function () { if (R) R.mute = false; }, 250); }); },
      get running() { return !!R; }
    };
  }
  LiveRecite.active = false;
  window.LiveRecite = LiveRecite;
})();
