/* مجموعة الاختبار — /record/: profiles of a family account record the test set of the recitation check
   (step 1 of «منهجية نظام التسميع الذكي»). Tasks come from data/testset/tasks.json (tools/lexicon/build_testset.py):
   each passage read as it is, and read with one planned mistake, so every recording carries its true answer.
   Each profile records under a consent the account holder gives for it (a guardian's, for a child), kept in
   rec_consents with the consent text's version; clips go to rec_clips and the private bucket "recitations" as
   16 kHz mono WAV, recorded with the same microphone settings as the live check (js/live.js).
   Withdrawing a profile's consent deletes its files and rows. Tables: supabase/migrations/recitation_testset.sql
   Invites (supabase/migrations/rec_invites.sql): the holder makes a link /record/?i=<token> for a reader from outside
   the family; that page (S.guest) works with no account — consent, recording and withdrawal go through the
   rec_invite_* functions, audio under recitations/inv/<token>/. */
(function () {
  var CONSENT_V = 'rec-v1';
  var RATE = 16000, MAX_S = 300;
  var app = document.getElementById('rcApp');
  var AR = '٠١٢٣٤٥٦٧٨٩';
  var num = function (n) { return String(n).replace(/[0-9]/g, function (d) { return AR[d]; }); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var h = function (html) { app.innerHTML = html; };
  var $ = function (s) { return app.querySelector(s); };

  var KIND = {
    clean: 'قراءة صحيحة', word: 'ترك كلمة', ayah: 'تجاوز آية', repeat: 'تكرار آية', restart: 'رجوع لأول الآية',
    other: 'كلام من غير الآية', madd: 'قصر مد', ghunna: 'ترك غنة', qalqala: 'ترك قلقلة',
    swap: 'إبدال كلمة', harf: 'تغيير حرف أو حركة', short: 'ترك كلمة قصيرة'
  };
  var AGE = { child: 'طفل (أقل من ١٣ سنة)', teen: 'يافع (١٣–١٧)', adult: 'بالغ (١٨ فأكثر)' };
  var LEVEL = { beginner: 'مبتدئ', middle: 'متوسط', hafiz: 'حافظ متقن' };

  var S = { c: null, uid: null, profiles: [], prof: null, consent: null, data: null, done: {}, task: null, guest: null };
  var GUEST = (location.search.match(/[?&]i=([A-Za-z0-9_-]{16,40})/) || [])[1] || null;

  function consentText(age) {
    return '<p>أوافق على أن تُحفظ تسجيلات التلاوة التي تُسجَّل في هذه الصفحة لهذا الملف، وأن تُستخدم فقط لاختبار نظام التسميع في موقع «العهد الأخير» وتحسينه، ومن ذلك تدريب نماذج التعرف على التلاوة الخاصة بالمشروع.</p>' +
      '<p>لا تُنشر التسجيلات، ولا تُباع، ولا تُعطى لأي جهة خارج المشروع، ولا يطّلع عليها إلا القائمون عليه. وتُحفظ على خوادم مزوّد الخدمة السحابية الذي يستخدمه الموقع. وتبقى الموافقة سارية إن قُدِّمت خدمات الموقع لاحقًا برعاية أو برسوم.</p>' +
      '<p>يُحفظ مع التسجيلات: الفئة العمرية، والجنس، ومستوى الحفظ، ونوع الجهاز. ولا يُطلب الاسم.</p>' +
      '<p>أستطيع في أي وقت سحب الموافقة من هذه الصفحة، فتُحذف التسجيلات كلها.</p>' +
      (age && age !== 'adult' ? '<p><b>وأُقرّ بأني وليّ أمر صاحب هذا الملف، وأنه يعلم بالتسجيل ولا يمانع، وأني أحضر تسجيله.</b></p>' : '');
  }

  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16);
    });
  }
  function fail(e) { console.error(e); alert('تعذّر الحفظ: ' + ((e && e.message) || e)); }

  /* ---------- start ---------- */
  function start() {
    h('<p class="rc-muted">جارٍ التحميل…</p>');
    if (GUEST) return startGuest();
    Promise.all([Fam.ready(), fetch('/data/testset/tasks.json').then(function (r) { return r.json(); })]).then(function (r) {
      S.c = r[0]; S.data = r[1];
      if (!S.c) {
        h('<div class="rc-card"><p>التسجيل لأفراد حساب الأسرة. ادخل إلى حسابك أولًا، ثم عُد إلى هذه الصفحة.</p>' +
          '<a class="fb-submit rc-btn" href="/account/">الدخول إلى الحساب</a></div>');
        return;
      }
      return S.c.auth.getSession().then(function (s) {
        S.uid = s.data.session.user.id;
        return Fam.profiles();
      }).then(function (list) { S.profiles = list; pickProfile(); });
    }).catch(fail);
  }

  /* ---------- a guest by an invite link ---------- */
  function startGuest() {
    S.guest = GUEST;
    Promise.all([Fam.client(), fetch('/data/testset/tasks.json').then(function (r) { return r.json(); })]).then(function (r) {
      S.c = r[0]; S.data = r[1];
      return guestInfo();
    }).then(function (i) {
      if (i.state !== 'ok') {
        h('<div class="rc-card"><p>' + (i.state === 'none' ? 'هذا الرابط غير صحيح. تأكد أنك نسخته كاملًا.' : 'انتهت مدة هذا الرابط أو أُلغي. اطلب من صاحب الدعوة رابطًا جديدًا.') + '</p></div>');
        return;
      }
      S.prof = { name: i.label };
      if (!S.consent) return guestWelcome();
      taskList();
    }).catch(fail);
  }
  function guestInfo() {
    return S.c.rpc('rec_invite_info', { p_token: S.guest }).then(function (r) {
      if (r.error) throw r.error;
      var i = r.data || {};
      S.consent = i.consent && i.consent.text_version === CONSENT_V ? i.consent : null;
      S.clips = i.clips || []; S.done = {};
      S.clips.forEach(function (x) { S.done[x.task] = (S.done[x.task] || 0) + 1; });
      return i;
    });
  }
  function guestWelcome() {
    h('<div class="rc-card"><h2 class="rc-h">أهلًا بك</h2>' +
      '<p>دُعيت إلى تسجيل تلاوات قصيرة نختبر بها نظام التسميع في مصحف «العهد الأخير» ونحسّنه. لا تحتاج إلى حساب.</p>' +
      '<p>اقرأ من حفظك كما تُسمّع لشيخك. وإذا أخطأت فلا تُعد التسجيل؛ الخطأ الطبيعي يفيدنا.</p>' +
      '<p class="rc-muted">إن كان القارئ دون ١٨ سنة فليقرأ وليّ أمره صفحة الموافقة التالية ويوافق عليها.</p>' +
      '<button class="fb-submit" id="rcGo">متابعة</button></div>');
    $('#rcGo').onclick = consentForm;
  }

  /* ---------- the holder's invites ---------- */
  function invitesHtml() {
    return '<div class="rc-card rc-inv"><h2 class="rc-h">دعوة قارئ من خارج الأسرة</h2>' +
      '<p class="rc-muted">رابط يسجّل به قارئ على جواله دون حساب، مثل طالب في حلقة. يوافق وليّ أمره في الصفحة نفسها، وتُحفظ تسجيلاته مع مجموعة الاختبار.</p>' +
      '<label class="fb-label" for="rcInvL">اسم يميّز الدعوة (يظهر في صفحة القارئ)</label>' +
      '<input id="rcInvL" maxlength="40" placeholder="مثل: طالب الحلقة ١">' +
      '<label class="fb-label">مدة الرابط</label><div class="rc-opts">' +
      '<label class="rc-opt"><input type="radio" name="invd" value="7"> أسبوع</label>' +
      '<label class="rc-opt"><input type="radio" name="invd" value="30" checked> شهر</label></div>' +
      '<button class="fb-submit" id="rcInvNew">أنشئ رابط الدعوة</button>' +
      '<ul class="rc-invl" id="rcInvList"><li class="rc-muted">جارٍ التحميل…</li></ul></div>';
  }
  function invLink(t) { return location.origin + '/record/?i=' + t; }
  function loadInvites() {
    var ul = document.getElementById('rcInvList'); if (!ul) return;
    Promise.all([
      S.c.from('rec_invites').select('id,token,label,expires_at,revoked,created_at').eq('account_id', S.uid).order('created_at', { ascending: false }),
      S.c.from('rec_clips').select('invite_id,path').not('invite_id', 'is', null)
    ]).then(function (r) {
      if (r[0].error) throw r[0].error;
      var cnt = {}, paths = {};
      (r[1].data || []).forEach(function (x) { cnt[x.invite_id] = (cnt[x.invite_id] || 0) + 1; (paths[x.invite_id] = paths[x.invite_id] || []).push(x.path); });
      var list = r[0].data || [], now = Date.now();
      if (!list.length) { ul.innerHTML = '<li class="rc-muted">لا توجد دعوات بعد.</li>'; return; }
      ul.innerHTML = list.map(function (v) {
        var exp = new Date(v.expires_at), live = !v.revoked && exp.getTime() > now;
        var st = v.revoked ? 'ملغى' : live ? 'ساري حتى ' + exp.toLocaleDateString('ar-SA-u-nu-latn', { day: 'numeric', month: 'long' }) : 'انتهت مدته';
        return '<li data-id="' + v.id + '"><div class="rc-invh"><b>' + esc(v.label) + '</b><small>' + esc(st) + ' · التسجيلات: ' + num(cnt[v.id] || 0) + '</small></div>' +
          '<div class="rc-inva">' + (live ? '<button class="rc-link" data-a="copy">نسخ الرابط</button>' + (navigator.share ? ' · <button class="rc-link" data-a="share">مشاركة</button>' : '') +
          ' · <button class="rc-link" data-a="revoke">إلغاء الرابط</button> · ' : '') +
          '<button class="rc-link rc-danger" data-a="del">حذف الدعوة وتسجيلاتها</button></div></li>';
      }).join('');
      ul.querySelectorAll('button[data-a]').forEach(function (b) {
        var li = b.closest('li'), v = list.filter(function (x) { return x.id === li.dataset.id; })[0], a = b.dataset.a;
        b.onclick = function () {
          if (a === 'copy') (navigator.clipboard ? navigator.clipboard.writeText(invLink(v.token)) : Promise.reject()).then(function () { b.textContent = 'نُسخ ✓'; }, function () { prompt('انسخ الرابط:', invLink(v.token)); });
          else if (a === 'share') navigator.share({ title: 'تسجيلات الاختبار', text: 'رابط تسجيل التلاوة لاختبار نظام التسميع:', url: invLink(v.token) }).catch(function () {});
          else if (a === 'revoke') { if (!confirm('إلغاء الرابط يمنع التسجيل به، وتبقى التسجيلات المحفوظة. هل تريد المتابعة؟')) return;
            S.c.from('rec_invites').update({ revoked: true }).eq('id', v.id).then(function (r) { if (r.error) return fail(r.error); loadInvites(); }); }
          else if (a === 'del') {
            var ps = paths[v.id] || [];
            if (!confirm('حذف دعوة «' + v.label + '» يحذف ' + num(ps.length) + ' تسجيلًا حذفًا نهائيًا لا يمكن التراجع عنه. هل تريد المتابعة؟')) return;
            removeFiles(ps).then(function () { return S.c.from('rec_invites').delete().eq('id', v.id); })
              .then(function (r) { if (r.error) throw r.error; loadInvites(); }).catch(fail);
          }
        };
      });
    }).catch(function (e) { console.error(e); ul.innerHTML = '<li class="rc-muted">تعذّر تحميل الدعوات.</li>'; });
  }
  function bindInvites() {
    $('#rcInvNew').onclick = function () {
      var lab = $('#rcInvL').value.trim(), d = +((app.querySelector('input[name=invd]:checked') || {}).value || 30), btn = this;
      if (!lab) { $('#rcInvL').focus(); return; }
      btn.disabled = true;
      S.c.from('rec_invites').insert({ label: lab, expires_at: new Date(Date.now() + d * 864e5).toISOString() }).select().then(function (r) {
        btn.disabled = false;
        if (r.error) throw r.error;
        $('#rcInvL').value = '';
        loadInvites();
      }).catch(function (e) { btn.disabled = false; fail(e); });
    };
    loadInvites();
  }
  function removeFiles(paths) {
    var chunks = [];
    for (var i = 0; i < paths.length; i += 100) chunks.push(paths.slice(i, i + 100));
    return chunks.reduce(function (p, ch) {
      return p.then(function () { return S.c.storage.from('recitations').remove(ch).then(function (r) { if (r.error) throw r.error; }); });
    }, Promise.resolve());
  }

  function pickProfile() {
    var cur = Fam.current();
    h('<div class="rc-card"><h2 class="rc-h">من سيسجّل؟</h2><div class="rc-profs">' +
      S.profiles.map(function (p) {
        return '<button class="rc-prof' + (cur && cur.id === p.id ? ' on' : '') + '" data-id="' + p.id + '">' + esc(p.name) + '</button>';
      }).join('') + '</div><p class="rc-muted">لإضافة ابن أو بنت: <a href="/book/?s=account">حسابي</a>.</p></div>' + invitesHtml());
    bindInvites();
    app.querySelectorAll('.rc-prof').forEach(function (b) {
      b.onclick = function () {
        S.prof = S.profiles.filter(function (p) { return p.id === b.dataset.id; })[0];
        loadProfile();
      };
    });
  }

  function loadProfile() {
    h('<p class="rc-muted">جارٍ التحميل…</p>');
    S.c.from('rec_consents').select('*').eq('profile_id', S.prof.id).eq('text_version', CONSENT_V).then(function (r) {
      if (r.error) throw r.error;
      S.consent = (r.data || [])[0] || null;
      if (!S.consent) return consentForm();
      return loadDone().then(taskList);
    }).catch(fail);
  }

  function loadDone() {
    if (S.guest) return guestInfo();
    return S.c.from('rec_clips').select('id,task,path,created_at').eq('profile_id', S.prof.id).then(function (r) {
      if (r.error) throw r.error;
      S.done = {}; S.clips = r.data || [];
      S.clips.forEach(function (x) { S.done[x.task] = (S.done[x.task] || 0) + 1; });
    });
  }

  /* ---------- consent ---------- */
  function radios(name, obj) {
    return Object.keys(obj).map(function (k) {
      return '<label class="rc-opt"><input type="radio" name="' + name + '" value="' + k + '"> ' + obj[k] + '</label>';
    }).join('');
  }
  function consentForm() {
    h('<div class="rc-card"><h2 class="rc-h">موافقة التسجيل — ' + esc(S.prof.name) + '</h2>' +
      '<label class="fb-label">الفئة العمرية</label><div class="rc-opts">' + radios('age', AGE) + '</div>' +
      '<label class="fb-label">الجنس</label><div class="rc-opts">' + radios('sex', { m: 'ذكر', f: 'أنثى' }) + '</div>' +
      '<label class="fb-label">مستوى الحفظ</label><div class="rc-opts">' + radios('level', LEVEL) + '</div>' +
      '<div id="rcGuard" hidden><label class="fb-label">اسم وليّ الأمر</label><input id="rcGName" maxlength="60" autocomplete="name"></div>' +
      '<div class="rc-consent" id="rcCText">' + consentText() + '</div>' +
      '<label class="fb-consent"><input type="checkbox" id="rcAgree"> <span>قرأت ما سبق وأوافق عليه.</span></label>' +
      '<button class="fb-submit" id="rcGo" disabled>أوافق وأبدأ</button>' + (S.guest ? '' : ' <button class="rc-link" id="rcBack">رجوع</button>') + '</div>');
    var val = function (n) { var x = app.querySelector('input[name=' + n + ']:checked'); return x && x.value; };
    var check = function () {
      var age = val('age');
      $('#rcGuard').hidden = !age || age === 'adult';
      $('#rcCText').innerHTML = consentText(age);
      var g = age && age !== 'adult' ? ($('#rcGName').value.trim().length >= 2) : true;
      $('#rcGo').disabled = !(age && val('sex') && val('level') && g && $('#rcAgree').checked);
    };
    app.addEventListener('input', check); app.addEventListener('change', check);
    if (!S.guest) $('#rcBack').onclick = pickProfile;
    $('#rcGo').onclick = function () {
      var age = val('age');
      this.disabled = true;
      if (S.guest) {
        S.c.rpc('rec_invite_consent', { p_token: S.guest, p_age: age, p_sex: val('sex'), p_level: val('level'),
          p_guardian: age !== 'adult' ? $('#rcGName').value.trim() : null, p_version: CONSENT_V }).then(function (r) {
          if (r.error) throw r.error;
          return guestInfo().then(taskList);
        }).catch(function (e) { fail(e); check(); });
        return;
      }
      S.c.from('rec_consents').insert({
        profile_id: S.prof.id, age_band: age, sex: val('sex'), level: val('level'), text_version: CONSENT_V,
        guardian_name: age !== 'adult' ? $('#rcGName').value.trim() : null
      }).select().then(function (r) {
        if (r.error) throw r.error;
        S.consent = r.data[0];
        return loadDone().then(taskList);
      }).catch(function (e) { fail(e); check(); });
    };
  }

  /* ---------- tasks ---------- */
  // a child reads each passage as he knows it (and may say a verse twice): the planned mistakes are too hard to do on
  // purpose at that age — his own natural slips are the test (written in the note)
  var CHILD = { clean: 1, repeat: 1 };
  function myTasks() {
    var child = S.consent.age_band === 'child';
    return S.data.tasks.filter(function (t) { return child ? CHILD[t.kind] : true; });
  }
  // the next task not yet recorded: after the one just done (the same passage first, then on), else from the start
  function nextTask(after) {
    var ts = myTasks(), at = 0;
    if (after) for (var j = 0; j < ts.length; j++) if (ts[j].id === after.id) at = j + 1;
    for (var i = 0; i < ts.length; i++) { var t = ts[(at + i) % ts.length]; if (!S.done[t.id]) return t; }
    return null;
  }
  function taskList() {
    var ts = myTasks(), n = ts.filter(function (t) { return S.done[t.id]; }).length, nx = nextTask(S.lastTask);
    var groups = {}, order = [];
    ts.forEach(function (t) { if (!groups[t.p]) { groups[t.p] = []; order.push(t.p); } groups[t.p].push(t); });
    h('<div class="rc-card"><h2 class="rc-h">' + esc(S.prof.name) + ' <small>· ' + AGE[S.consent.age_band] + '</small></h2>' +
      '<div class="rc-prog"><div style="width:' + Math.round(100 * n / ts.length) + '%"></div></div>' +
      '<p class="rc-muted">سُجِّل ' + num(n) + ' من ' + num(ts.length) + '. لا يلزم إكمالها في جلسة واحدة.</p>' +
      (nx ? '<button class="fb-submit" id="rcNext">التالي: ' + esc(S.data.passages[nx.p].title) + ' — ' + KIND[nx.kind] + '</button>' :
        '<p class="rc-ok">اكتملت المهام كلها. جزاك الله خيرًا.</p>') +
      '<div class="rc-groups">' + order.map(function (p) {
        return '<div class="rc-g"><b>' + esc(S.data.passages[p].title) + '</b><div>' + groups[p].map(function (t) {
          return '<button class="rc-t' + (S.done[t.id] ? ' done' : '') + '" data-id="' + t.id + '">' + (S.done[t.id] ? '✓ ' : '') + KIND[t.kind] + '</button>';
        }).join('') + '</div></div>';
      }).join('') + '</div>' +
      '<div class="rc-foot">' + (S.guest ? '' : '<button class="rc-link" id="rcOther">تغيير الملف</button> · ') +
      '<button class="rc-link rc-danger" id="rcWithdraw">سحب الموافقة وحذف ' + (S.guest ? 'تسجيلاتي' : 'تسجيلات هذا الملف') + '</button></div></div>');
    if (nx) $('#rcNext').onclick = function () { openTask(nx); };
    app.querySelectorAll('.rc-t').forEach(function (b) {
      b.onclick = function () { openTask(ts.filter(function (t) { return t.id === b.dataset.id; })[0]); };
    });
    if (!S.guest) $('#rcOther').onclick = pickProfile;
    $('#rcWithdraw').onclick = withdraw;
  }

  function wordOf(P, loc) {
    for (var i = 0; i < P.text.length; i++) for (var j = 0; j < P.text[i][1].length; j++)
      if (P.text[i][1][j][0] === loc) return P.text[i][1][j][1];
    return '';
  }
  function instruction(t, P) {
    var a = t.target ? +t.target.split(':')[1] : 0, W = t.target ? '«' + wordOf(P, t.target) + '»' : '';
    switch (t.kind) {
      case 'clean': return 'اقرأ الآيات كما هي، بتلاوتك المعتادة.';
      case 'word': return 'اقرأ الآيات، واترك كلمة ' + W + ' عمدًا فلا تنطقها، ثم أكمل.';
      case 'ayah': return 'اقرأ الآيات، وتجاوز الآية ' + num(a) + ' كاملة عمدًا.';
      case 'repeat': return 'اقرأ الآيات، وكرر الآية ' + num(a) + ' مرتين.';
      case 'restart': return 'في الآية ' + num(a) + ' توقف في منتصفها، ثم ارجع إلى أولها وأكمل.';
      case 'other': return 'بعد الآية ' + num(a) + ' قل جملة قصيرة من عندك ليست من القرآن (مثل: انتظر قليلًا)، ثم أكمل.';
      case 'madd': return 'اقرأ الآيات، واقصر المد في كلمة ' + W + ' إلى حركتين عمدًا.';
      case 'ghunna': return 'اقرأ الآيات، وانطق كلمة ' + W + ' بلا غنة عمدًا.';
      case 'qalqala': return 'اقرأ الآيات، وانطق كلمة ' + W + ' بلا قلقلة عمدًا.';
      case 'swap': return 'اقرأ الآيات، وقل «' + t.say + '» بدل كلمة ' + W + ' عمدًا، ثم أكمل.';
      case 'harf': return 'اقرأ الآيات، وانطق كلمة ' + W + ' هكذا: «' + t.say + '» عمدًا، ثم أكمل.';
      case 'short': return 'اقرأ الآيات، واترك كلمة ' + W + ' عمدًا فلا تنطقها، ثم أكمل.';
    }
  }
  function passageHtml(t, P) {
    var verse = t.target && t.target.split(':').length === 2 ? t.target : null;
    return P.text.map(function (av) {
      var vk = P.surah + ':' + av[0];
      var ws = av[1].map(function (w) { return '<span class="rc-w' + (w[0] === t.target ? ' tgt' : '') + '">' + esc(w[1]) + '</span>'; }).join(' ');
      return '<span class="rc-a' + (verse === vk ? ' tgt-' + t.kind : '') + '">' + ws + ' <span class="rc-n">﴿' + num(av[0]) + '﴾</span></span>';
    }).join(' ');
  }

  /* ---------- one task ---------- */
  var R = null;   // the recording in progress
  function openTask(t) {
    S.task = t; var P = S.data.passages[t.p];
    h('<div class="rc-card"><button class="rc-link" id="rcList">→ المهام</button>' +
      '<h2 class="rc-h">' + esc(P.title) + ' <span class="rc-kind k-' + t.kind + '">' + KIND[t.kind] + '</span></h2>' +
      '<p class="rc-ins">' + instruction(t, P) + '</p>' +
      (P.surah !== 1 && P.surah !== 9 && P.from === 1 ? '<p class="rc-muted">ابدأ بالبسملة إن شئت.</p>' : '') +
      '<div class="rc-text">' + passageHtml(t, P) + '</div>' +
      (S.done[t.id] ? '<p class="rc-muted">سجّلت هذه المهمة من قبل؛ تسجيل جديد يُضاف إليها.</p>' : '') +
      '<div class="rc-rec" id="rcRec"></div></div>');
    $('#rcList').onclick = function () { stopRec(true); taskList(); };
    recIdle();
  }
  function recIdle() {
    $('#rcRec').innerHTML = '<button class="rc-mic" id="rcStart">🎙️ ابدأ التسجيل</button>' +
      '<p class="rc-muted">في مكان هادئ إن أمكن، والجهاز على بُعد شبر تقريبًا.</p>';
    $('#rcStart').onclick = startRec;
  }

  function startRec() {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !AC) { alert('المتصفح لا يتيح المايك.'); return; }
    var actx = new AC();
    navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } }).then(function (stream) {
      actx.resume && actx.resume();
      var src = actx.createMediaStreamSource(stream), node = actx.createScriptProcessor(4096, 1, 1);
      R = { actx: actx, stream: stream, src: src, node: node, rate: actx.sampleRate, buf: [], len: 0, t0: Date.now() };
      node.onaudioprocess = function (e) {
        if (!R) return;
        var x = e.inputBuffer.getChannelData(0), c = new Float32Array(x), s = 0;
        R.buf.push(c); R.len += c.length;
        for (var i = 0; i < c.length; i += 8) s += c[i] * c[i];
        var lv = Math.min(1, Math.sqrt(s / (c.length / 8)) * 6), m = document.getElementById('rcLvl');
        if (m) m.style.width = Math.round(lv * 100) + '%';
        if (R.len / R.rate > MAX_S) stopRec();
      };
      src.connect(node); node.connect(actx.destination);
      $('#rcRec').innerHTML = '<div class="rc-live"><span class="rc-dot"></span> <span id="rcTime">٠:٠٠</span>' +
        '<div class="rc-lvl"><div id="rcLvl"></div></div></div><button class="rc-mic stop" id="rcStop">⏹ أوقف</button>';
      $('#rcStop').onclick = function () { stopRec(); };
      R.tick = setInterval(function () {
        var s = Math.floor((Date.now() - R.t0) / 1000), el = document.getElementById('rcTime');
        if (el) el.textContent = num(Math.floor(s / 60)) + ':' + num(('0' + s % 60).slice(-2));
      }, 500);
    }).catch(function (e) { actx.close && actx.close(); alert('لم يُسمح بالمايك: ' + (e.message || e)); });
  }

  function stopRec(discard) {
    if (!R) return;
    var r = R; R = null;
    clearInterval(r.tick);
    try { r.node.disconnect(); r.src.disconnect(); } catch (e) {}
    r.stream.getTracks().forEach(function (k) { k.stop(); });
    r.actx.close && r.actx.close();
    if (discard) return;
    var pcm = new Float32Array(r.len), o = 0;
    r.buf.forEach(function (c) { pcm.set(c, o); o += c.length; });
    var wav = toWav(resample(pcm, r.rate, RATE), RATE), secs = pcm.length / r.rate;
    review(wav, secs);
  }

  // average-then-pick resampling (good enough for speech from 44.1/48 kHz to 16 kHz)
  function resample(x, from, to) {
    if (from === to) return x;
    var ratio = from / to, n = Math.floor(x.length / ratio), y = new Float32Array(n);
    for (var i = 0; i < n; i++) {
      var a = Math.floor(i * ratio), b = Math.min(x.length, Math.floor((i + 1) * ratio)), s = 0;
      for (var j = a; j < b; j++) s += x[j];
      y[i] = b > a ? s / (b - a) : x[a];
    }
    return y;
  }
  function toWav(x, rate) {
    var b = new ArrayBuffer(44 + x.length * 2), v = new DataView(b);
    var w = function (o, s) { for (var i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    w(0, 'RIFF'); v.setUint32(4, 36 + x.length * 2, true); w(8, 'WAVE'); w(12, 'fmt ');
    v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, rate, true);
    v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, x.length * 2, true);
    for (var i = 0; i < x.length; i++) { var s = Math.max(-1, Math.min(1, x[i])); v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true); }
    return new Blob([b], { type: 'audio/wav' });
  }

  function review(wav, secs) {
    var t = S.task, url = URL.createObjectURL(wav), err = t.kind !== 'clean';
    $('#rcRec').innerHTML = '<audio controls src="' + url + '" class="rc-audio"></audio>' +
      '<p class="rc-muted">المدة ' + num(Math.round(secs)) + ' ثانية. استمع إن شئت ثم احفظ.</p>' +
      (err ? '<label class="fb-label">هل نفّذت المطلوب كما في التعليمات؟</label><div class="rc-opts">' +
        '<label class="rc-opt"><input type="radio" name="asked" value="1" checked> نعم</label>' +
        '<label class="rc-opt"><input type="radio" name="asked" value="0"> لا، حصل غيره</label></div>' : '') +
      '<label class="fb-label">ملاحظة (اختياري)</label><input id="rcNote" maxlength="300" placeholder="' + (S.consent.age_band === 'child' ? 'ما أخطأ فيه إن أخطأ، مثل: قال «الرحمان»' : 'مثلًا: أخطأت أيضًا في الآية ٣') + '">' +
      '<div class="rc-actions"><button class="fb-submit" id="rcSave">احفظ وانتقل للتالي</button>' +
      '<button class="rc-link" id="rcAgain">أعد التسجيل</button></div>';
    $('#rcAgain').onclick = function () { URL.revokeObjectURL(url); recIdle(); };
    $('#rcSave').onclick = function () {
      var btn = this; btn.disabled = true; btn.textContent = 'جارٍ الحفظ…';
      var id = uuid(), path = S.guest ? 'inv/' + S.guest + '/' + id + '.wav' : S.uid + '/' + S.prof.id + '/' + id + '.wav', P = S.data.passages[t.p];
      var asked = err ? (app.querySelector('input[name=asked]:checked') || {}).value === '1' : null;
      S.c.storage.from('recitations').upload(path, wav, { contentType: 'audio/wav' }).then(function (r) {
        if (r.error) throw r.error;
        if (S.guest) return S.c.rpc('rec_invite_clip', {
          p_token: S.guest, p_id: id, p_task: t.id, p_surah: P.surah, p_ayah: P.from, p_ayah_to: P.to, p_kind: t.kind,
          p_target: t.target || null, p_asked: asked, p_note: $('#rcNote').value.trim() || null,
          p_seconds: Math.round(secs * 10) / 10, p_device: navigator.userAgent.slice(0, 200)
        });
        return S.c.from('rec_clips').insert({
          id: id, profile_id: S.prof.id, consent_id: S.consent.id, task: t.id, surah: P.surah, ayah: P.from, ayah_to: P.to,
          kind: t.kind, target: t.target || null, done_as_asked: asked, note: $('#rcNote').value.trim() || null,
          seconds: Math.round(secs * 10) / 10, device: navigator.userAgent.slice(0, 200), path: path
        });
      }).then(function (r) {
        if (r.error) throw r.error;
        URL.revokeObjectURL(url);
        S.done[t.id] = (S.done[t.id] || 0) + 1;
        S.clips.push({ id: id, task: t.id, path: path });
        S.lastTask = t; var nx = nextTask(t);
        if (nx) openTask(nx); else taskList();
      }).catch(function (e) { fail(e); btn.disabled = false; btn.textContent = 'احفظ وانتقل للتالي'; });
    };
  }

  /* ---------- withdraw ---------- */
  function withdraw() {
    var n = S.clips.length;
    if (!confirm('سحب الموافقة لملف «' + S.prof.name + '» يحذف ' + num(n) + ' تسجيلًا حذفًا نهائيًا لا يمكن التراجع عنه. هل تريد المتابعة؟')) return;
    var paths = S.clips.map(function (x) { return x.path; });
    removeFiles(paths).then(function () {
      return S.guest ? S.c.rpc('rec_invite_withdraw', { p_token: S.guest }) : S.c.from('rec_consents').delete().eq('profile_id', S.prof.id);
    }).then(function (r) {
      if (r.error) throw r.error;
      S.consent = null; S.clips = []; S.done = {};
      alert('سُحبت الموافقة وحُذفت التسجيلات.');
      if (S.guest) guestWelcome(); else pickProfile();
    }).catch(fail);
  }

  window.addEventListener('pagehide', function () { stopRec(true); });
  document.addEventListener('visibilitychange', function () { if (document.hidden && R) stopRec(true), recIdle(); });
  start();
})();
