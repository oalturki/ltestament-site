/* «التسميع» (trial): the reader recites from memory; the recitation-check service (asr-space/, a Hugging Face
   Space) answers word by word, and the words are coloured here.
   The service address is set once below (or as window.TS_API before this file) after the Space is created. */
(function () {
  var API = window.TS_API || '';            // e.g. https://<user>-tasmee.hf.space
  var $ = function (id) { return document.getElementById(id); };
  var sSel = $('tsS'), aIn = $('tsA'), bIn = $('tsB'), hide = $('tsHide'), box = $('tsText'), btn = $('tsBtn'), st = $('tsSt'), out = $('tsOut');
  var V = window.TS_VERSES || [];
  var AN = '٠١٢٣٤٥٦٧٨٩', num = function (n) { return String(n).replace(/\d/g, function (d) { return AN[d]; }); };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var text = [], rec = null, chunks = [], stream = null, t0 = 0, timer = 0;

  // start from the URL (?s=112&a=1&b=4) or the last choice
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
  function draw(res) {
    var r = range(), html = '', k = 0, st2 = {};
    if (res) res.words.forEach(function (w) { st2[w.ayah + ':' + w.i] = w; });
    for (var a = r.a; a <= r.b; a++) {
      (text[a - 1] || '').split(' ').forEach(function (w, i) {
        var x = st2[a + ':' + i], cls = 'w' + (x ? ' ' + x.status : ''), tip = x && x.heard && x.status !== 'ok' ? ' title="سُمع: ' + esc(x.heard) + '"' : '';
        html += '<span class="' + cls + '"' + tip + '>' + esc(w) + '</span> ';
      });
      html += '<span class="num">﴿' + num(a) + '﴾</span> ';
    }
    box.innerHTML = html;
    box.classList.toggle('hide', hide.checked && !res);
    box.classList.toggle('done', !!res);
  }
  function load() {
    var s = +sSel.value;
    return fetch('/data/text-simple/' + s + '.json').then(function (r) { return r.json(); }).then(function (t) { text = t; out.innerHTML = ''; draw(null); });
  }
  sSel.onchange = function () { aIn.value = 1; bIn.value = V[+sSel.value - 1]; load(); };
  aIn.onchange = bIn.onchange = function () { out.innerHTML = ''; draw(null); };
  hide.onchange = function () { box.classList.toggle('hide', hide.checked && !box.classList.contains('done')); };

  function stopTracks() { if (stream) stream.getTracks().forEach(function (t) { t.stop(); }); stream = null; }
  function start() {
    if (!API) { st.textContent = 'الخدمة لم تُفعَّل بعد.'; return; }
    if (!navigator.mediaDevices || !window.MediaRecorder) { st.textContent = 'متصفحك لا يدعم التسجيل.'; return; }
    out.innerHTML = ''; draw(null);
    navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: true, autoGainControl: true } }).then(function (s) {
      stream = s; chunks = [];
      rec = new MediaRecorder(s);
      rec.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
      rec.onstop = send;
      rec.start();
      t0 = Date.now(); btn.classList.add('on'); btn.setAttribute('aria-label', 'إنهاء التسجيل');
      timer = setInterval(function () {
        var sec = Math.round((Date.now() - t0) / 1000);
        st.textContent = 'يُسجَّل الآن… ' + num(sec) + ' ث — اضغط الزر عند الانتهاء.';
        if (sec >= 88) stop();
      }, 500);
    }).catch(function () { st.textContent = 'لم يُسمح بالوصول إلى الميكروفون.'; });
  }
  function stop() {
    clearInterval(timer); btn.classList.remove('on'); btn.setAttribute('aria-label', 'ابدأ التسجيل');
    if (rec && rec.state !== 'inactive') rec.stop();
    stopTracks();
  }
  function send() {
    var r = range(), blob = new Blob(chunks, { type: (rec && rec.mimeType) || 'audio/webm' });
    var fd = new FormData();
    fd.append('audio', blob, 'rec'); fd.append('surah', r.s); fd.append('start', r.a); fd.append('end', r.b);
    st.textContent = 'يُحلَّل التسجيل… (أول مرة قد تأخذ دقيقة حتى تستيقظ الخدمة)';
    fetch(API.replace(/\/$/, '') + '/check', { method: 'POST', body: fd }).then(function (x) {
      if (!x.ok) throw new Error(x.status);
      return x.json();
    }).then(function (res) {
      draw(res);
      var c = { ok: 0, harakat: 0, wrong: 0, missing: 0, unsure: 0 };
      res.words.forEach(function (w) { c[w.status]++; });
      var n = res.words.length;
      out.innerHTML = '<p class="ts-sum">' + num(c.ok) + ' من ' + num(n) + ' كلمة صحيحة' +
        (c.wrong + c.harakat + c.missing ? ' — راجع الكلمات الملوّنة' : ' — أحسنت') + '</p>' +
        (res.extra.length ? '<p class="ts-heard">كلمات زائدة: ' + esc(res.extra.join(' ')) + '</p>' : '') +
        '<p class="ts-heard">ما سمعه النظام: ' + esc(res.heard) + '</p>';
      st.textContent = 'اضغط الزر لتسميع جديد.';
    }).catch(function () { st.textContent = 'تعذّر التحليل، أعد المحاولة بعد قليل.'; });
  }
  btn.onclick = function () { if (rec && rec.state === 'recording') stop(); else start(); };
  load();
})();
