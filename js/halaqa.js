/* The live circle (الحلقة المباشرة): a teacher leads his students' Mushafs and sees who has left them.

   Teacher (signed in): saved classes (live_classes) and their students (live_students: a list he pastes, or
   students registering themselves the first time); a session (live_sessions) opened from a class has a 6-digit code.
   Students (no account) join by the code or its link (?live=123456), pick their name or register, and follow.
   The teacher's projector opens the same link with &display=1: it follows, shows nothing of the roster.

   Live link: Supabase Realtime, one channel per session code.
   - broadcast 'st' (teacher → all): {p: page, lock, hide, focus: [s, a] | null, title}; again every 10 s and on 'hello'
   - broadcast 'hello' (a student or display arriving) → the teacher sends 'st' at once
   - broadcast 'end' (teacher) → students leave
   - presence (students): {id, name, st: 'g' on the teacher's page | 'y' another page | 'r' out of the Mushaf, p, ts}
   - broadcast 'au' (teacher → all): the recitation now {u: file, t: time, p: paused, r: speed, m: muted, h: highlight}
     on every change and every 2 s while it plays; st.au chooses how students take it: 'c' in class (no sound, they follow
     the highlight; the teacher's device is heard) or 'r' remote (each student's device plays the same file in step)
   - st.v: the view — 'g' together (the students' Mushafs as the teacher's device: its page held, its mode st.md, its
     hidden verses, its recitation) or 'i' individual (each browses freely; nothing follows). Applied on every 'st'
   - broadcast 'me' (student → teacher): the same record, on every change and every 4 s as a heartbeat
   A student whose phone leaves the Mushaf sends 'r' at once (by REST if the socket is down). A student the teacher
   has not heard from for 12 s counts as out (a phone in the background freezes and sends nothing). Both sides
   rejoin the channel as soon as the page shows again or the channel errors (wire()), and the student re-reports. The report: time in, time out and
   how often, per student, saved in live_sessions.report when the session ends.

   LtHalaqa.ui(section, {close})   the settings page: join by code; for a signed-in teacher, his classes
   LtHalaqa.join(code, {display})  a student or the projector joins
   LtHalaqa.page(p)                the book turned to page p */
(function () {
  var B = function () { return window.__ltBook || {}; };
  var lang = function () { return B().lang || 'ar'; };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var num = function (n) { return B().uiNum ? B().uiNum(n) : String(n); };
  var load = function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } };
  var store = function (k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} };

  var T = {
    ar: {
      title: 'الحلقة المباشرة', joinH: 'دخول حلقة', code: 'رمز الحلقة', join: 'دخول', badCode: 'لا توجد حلقة مفتوحة بهذا الرمز.',
      teacherH: 'حلقاتي وفصولي', signIn: 'لفتح حلقة سجّل الدخول من «حسابي».', newClass: 'حلقة أو فصل جديد', name: 'الاسم أو الرقم',
      kind: 'النوع', kinds: { halaqa: 'حلقة', 'class': 'فصل', section: 'شعبة' }, level: 'المستوى (اختياري)', save: 'حفظ', cancel: 'إلغاء',
      start: 'ابدأ جلسة', students: 'الطلاب', reports: 'التقارير', del: 'حذف', none: 'لا حلقات بعد.', noStudents: 'لا طلاب بعد. أضفهم هنا، أو يسجّلون أنفسهم حين يدخلون.',
      f1: 'الاسم الأول', f2: 'الثاني', f3: 'الثالث', f4: 'العائلة', sid: 'الرقم (اختياري)', add: 'إضافة', paste: 'لصق كشف',
      pasteHint: 'سطر لكل طالب: الاسم الأول، الثاني، الثالث، العائلة، الرقم — مفصولة بفواصل أو من Excel. أو الاسم كاملًا بمسافات.',
      pasteDo: 'أضف الكشف', added: function (n) { return 'أُضيف ' + n; },
      live: 'الجلسة', link: 'رابط الحلقة', copy: 'نسخ', copied: 'نُسخ', lock: 'قفل التنقل', hide: 'إخفاء الآيات', unfocus: 'إلغاء التركيز',
      present: 'وضع العرض', end: 'إنهاء الجلسة', endQ: 'إنهاء الجلسة وحفظ تقريرها؟', inMushaf: 'في المصحف', other: 'صفحة أخرى', out: 'خارج',
      notYet: 'لم يدخل', since: 'منذ', sec: 'ث', min: 'د', tapAyah: 'المس رقم آية ليركّز عليها الطلاب.', display: 'رابط شاشة العرض', displayHelp: 'افتح هذا الرابط على حاسب جهاز العرض، فيعرض الصفحة التي أنت عليها دون أسماء الطلاب.',
      who: 'من أنت؟', search: 'ابحث عن اسمك', notListed: 'لست في القائمة؟ سجّل اسمك', register: 'سجّل وادخل', shared: 'جهاز مشترك (معمل): لا تتذكر اسمي',
      need: 'اكتب الاسم الأول واسم العائلة على الأقل.', bar: 'حلقة', watch: 'المعلم يرى حضورك في المصحف', leave: 'خروج', ended: 'انتهت الحلقة.',
      mini: 'تصغير', open: 'فتح لوحة الحلقة', drag: 'اسحبه إلى أي مكان، والمسه للفتح',
      colName: 'الطالب', total: 'المجموع', present: 'الحضور', following: 'المتابعة', of: 'من', pageW: 'ص',
      auH: 'صوت التلاوة', auC: 'في الفصل', auR: 'عن بُعد',
      auHelp: 'في الفصل: تُسمع التلاوة من جهازك وحده، والطلاب يتابعون تظليل الكلمات على مصاحفهم دون صوت. عن بُعد: تُسمع عند كل طالب على جهازه، ويضغط الطالب مرة «تفعيل الصوت». وفي الحالين شغّل التلاوة من شريط مصحفك، وأجهزة الطلاب تتبعها.',
      auTip: 'شغّل التلاوة من شريط مصحفك، وأجهزة الطلاب تتبعها.', unlock: '🔊 تفعيل الصوت',
      viewH: 'العرض', viewG: 'جماعي', viewI: 'فردي',
      viewHelp: 'جماعي: مصاحف الطلاب وفق جهازك في الصفحة، والوضع، وإخفاء الآيات، والتلاوة. فردي: كل طالب يتصفح مصحفه بحرية. وفي الحالين: المس رقم آية ليركّز عليها الطلاب وتظهر لهم أحكامها.',
      locked: 'المعلم يقود التنقل', focusH: 'الآية', rules: 'أحكام التجويد', noRules: 'لا أحكام ملوّنة في هذه الآية.',
      repH: 'تقارير الجلسات', repNone: 'لا جلسات بعد.', csv: 'تصدير Excel', inT: 'حضور', outT: 'خروج', times: 'مرات', joined: 'دخل',
      summary: function (g, y, r, n) { return 'في المصحف ' + g + ' · صفحة أخرى ' + y + ' · خارج ' + r + ' · لم يدخل ' + n; }
    },
    en: {
      title: 'Live circle', joinH: 'Join a circle', code: 'Circle code', join: 'Join', badCode: 'No open circle has this code.',
      teacherH: 'My circles and classes', signIn: 'To open a circle, sign in from «My account».', newClass: 'New circle or class', name: 'Name or number',
      kind: 'Type', kinds: { halaqa: 'Circle', 'class': 'Class', section: 'Section' }, level: 'Level (optional)', save: 'Save', cancel: 'Cancel',
      start: 'Start a session', students: 'Students', reports: 'Reports', del: 'Delete', none: 'No circles yet.', noStudents: 'No students yet. Add them here, or they register when they join.',
      f1: 'First name', f2: 'Second', f3: 'Third', f4: 'Family', sid: 'ID (optional)', add: 'Add', paste: 'Paste a list',
      pasteHint: 'One student per line: first, second, third, family, ID — comma- or tab-separated (from Excel). Or the full name with spaces.',
      pasteDo: 'Add the list', added: function (n) { return n + ' added'; },
      live: 'Session', link: 'Circle link', copy: 'Copy', copied: 'Copied', lock: 'Lock navigation', hide: 'Hide the verses', unfocus: 'Clear focus',
      present: 'Present', end: 'End session', endQ: 'End the session and save its report?', inMushaf: 'In the Mushaf', other: 'Another page', out: 'Out',
      notYet: 'Not joined', since: 'for', sec: 's', min: 'm', tapAyah: 'Tap a verse number to focus the students on it.', display: 'Projector link', displayHelp: 'Open this link on the projector’s computer: it shows your page, without the students’ names.',
      who: 'Who are you?', search: 'Find your name', notListed: 'Not on the list? Register', register: 'Register and join', shared: 'Shared device (lab): don’t remember me',
      need: 'Write at least the first and family names.', bar: 'Circle', watch: 'The teacher sees whether you are in the Mushaf', leave: 'Leave', ended: 'The circle has ended.',
      mini: 'Minimise', open: 'Open the circle panel', drag: 'Drag it anywhere; tap to open',
      colName: 'Student', total: 'Total', present: 'Present', following: 'Following', of: 'of', pageW: 'p.',
      auH: 'Recitation sound', auC: 'In class', auR: 'Remote',
      auHelp: 'In class: the recitation is heard from your device only; the students follow the highlighted words on their Mushafs, silently. Remote: it is heard on each student’s device (each taps «Turn on the sound» once). Either way, play it from your Mushaf’s bar and the students’ Mushafs follow.',
      auTip: 'Play the recitation from your Mushaf’s bar; the students’ Mushafs follow it.', unlock: '🔊 Turn on the sound',
      viewH: 'View', viewG: 'Together', viewI: 'Individual',
      viewHelp: 'Together: the students’ Mushafs follow your device — page, mode, hidden verses and recitation. Individual: each student browses freely. Either way, tap a verse number to focus the students on it and show its tajweed rules.',
      locked: 'The teacher leads the pages', focusH: 'Verse', rules: 'Tajweed rules', noRules: 'No coloured rules in this verse.',
      repH: 'Session reports', repNone: 'No sessions yet.', csv: 'Export to Excel', inT: 'In', outT: 'Out', times: 'times', joined: 'Joined',
      summary: function (g, y, r, n) { return 'In the Mushaf ' + g + ' · other page ' + y + ' · out ' + r + ' · not joined ' + n; }
    }
  };
  var L = function () { return T[lang()] || T.en; };
  var toast = function (t) { var d = document.createElement('div'); d.className = 'bk-toast'; d.textContent = t; document.body.appendChild(d); setTimeout(function () { d.remove(); }, 3000); };
  var dur = function (ms) { var s = Math.round(ms / 1000), l = L(); return s < 60 ? num(s) + l.sec : num(Math.floor(s / 60)) + l.min + (s % 60 ? ' ' + num(s % 60) + l.sec : ''); };
  var client = function () { return window.Fam ? window.Fam.client() : Promise.reject('no client'); };
  var fam = function (cb) { if (window.Fam) return cb(); var s = document.createElement('script'); s.src = '/js/family.js?v=3'; s.onload = cb; document.head.appendChild(s); };
  var fullName = function (x) { return [x.first, x.second, x.third, x.family].filter(Boolean).join(' '); };

  /* ================= the settings page ================= */
  var SEC = null;
  function ui(sec, o) {
    SEC = sec; sec.innerHTML = '';
    var l = L();
    var box = document.createElement('div'); box.className = 'hq';
    box.innerHTML = '<h4>' + esc(l.joinH) + '</h4><div class="hq-row"><input class="hq-code" inputmode="numeric" maxlength="6" placeholder="' + esc(l.code) + '" dir="ltr"><button type="button" class="hq-b hq-go">' + esc(l.join) + '</button></div>' +
      '<h4>' + esc(l.teacherH) + '</h4><div class="hq-t"></div>';
    sec.appendChild(box);
    box.querySelector('.hq-go').onclick = function () {
      var c = (box.querySelector('.hq-code').value || '').replace(/\D/g, '');
      if (c.length !== 6) return toast(l.badCode);
      if (o && o.close) o.close();
      join(c, {});
    };
    fam(function () { teacher(box.querySelector('.hq-t'), o); });
  }
  function teacher(el, o) {
    var l = L();
    if (!window.Fam.signedIn()) { el.innerHTML = '<p class="hq-note">' + esc(l.signIn) + '</p>'; return; }
    el.innerHTML = '…';
    client().then(function (c) {
      return c.from('live_classes').select('id,name,kind,level').order('created_at').then(function (r) {
        if (r.error) throw r.error;
        var list = r.data || [];
        el.innerHTML = (list.length ? '' : '<p class="hq-note">' + esc(l.none) + '</p>') + list.map(function (k) {
          return '<div class="hq-cls" data-id="' + k.id + '"><div class="hq-ch"><b>' + esc(k.name) + '</b><small>' + esc(l.kinds[k.kind] || '') + (k.level ? ' · ' + esc(k.level) : '') + '</small></div>' +
            '<div class="hq-acts"><button type="button" class="hq-b hq-start">' + esc(l.start) + '</button><button type="button" class="hq-b2 hq-stu">' + esc(l.students) + '</button>' +
            '<button type="button" class="hq-b2 hq-rep">' + esc(l.reports) + '</button></div><div class="hq-more"></div></div>';
        }).join('') + '<details class="hq-new"><summary>' + esc(l.newClass) + '</summary><input class="hq-in hq-nm" placeholder="' + esc(l.name) + '">' +
          '<select class="hq-in hq-kd"><option value="halaqa">' + esc(l.kinds.halaqa) + '</option><option value="class">' + esc(l.kinds['class']) + '</option><option value="section">' + esc(l.kinds.section) + '</option></select>' +
          '<input class="hq-in hq-lv" placeholder="' + esc(l.level) + '"><button type="button" class="hq-b hq-mk">' + esc(l.save) + '</button></details>';
        el.querySelector('.hq-mk').onclick = function () {
          var nm = el.querySelector('.hq-nm').value.trim(); if (!nm) return;
          c.from('live_classes').insert({ name: nm, kind: el.querySelector('.hq-kd').value, level: el.querySelector('.hq-lv').value.trim() || null }).then(function (r2) {
            if (r2.error) return toast(r2.error.message); teacher(el, o);
          });
        };
        el.querySelectorAll('.hq-cls').forEach(function (d) {
          var id = d.getAttribute('data-id'), k = list.filter(function (x) { return x.id === id; })[0], more = d.querySelector('.hq-more');
          d.querySelector('.hq-start').onclick = function () { if (o && o.close) o.close(); startSession(c, k); };
          d.querySelector('.hq-stu').onclick = function () { if (more.dataset.v === 's') { more.innerHTML = ''; more.dataset.v = ''; return; } more.dataset.v = 's'; roster(c, k, more); };
          d.querySelector('.hq-rep').onclick = function () { if (more.dataset.v === 'r') { more.innerHTML = ''; more.dataset.v = ''; return; } more.dataset.v = 'r'; reports(c, k, more); };
        });
      });
    }).catch(function (e) { el.innerHTML = '<p class="hq-note">' + esc(e && e.message || e) + '</p>'; });
  }
  // a class's students: the list, one by one, a pasted list
  function roster(c, k, el) {
    var l = L();
    c.from('live_students').select('*').eq('class_id', k.id).order('first').then(function (r) {
      var list = r.data || [];
      el.innerHTML = (list.length ? '<ol class="hq-sl">' + list.map(function (x) {
        return '<li data-id="' + x.id + '"><span>' + esc(fullName(x)) + (x.sid ? ' <small dir="ltr">' + esc(x.sid) + '</small>' : '') + '</span><button type="button" class="hq-x" aria-label="' + esc(l.del) + '">×</button></li>';
      }).join('') + '</ol>' : '<p class="hq-note">' + esc(l.noStudents) + '</p>') +
        '<div class="hq-f4"><input class="hq-in" data-f="first" placeholder="' + esc(l.f1) + '"><input class="hq-in" data-f="second" placeholder="' + esc(l.f2) + '"><input class="hq-in" data-f="third" placeholder="' + esc(l.f3) + '"><input class="hq-in" data-f="family" placeholder="' + esc(l.f4) + '"><input class="hq-in" data-f="sid" placeholder="' + esc(l.sid) + '" dir="ltr"><button type="button" class="hq-b hq-add1">' + esc(l.add) + '</button></div>' +
        '<details class="hq-pst"><summary>' + esc(l.paste) + '</summary><p class="hq-note">' + esc(l.pasteHint) + '</p><textarea class="hq-in hq-ta" rows="6"></textarea><button type="button" class="hq-b hq-addn">' + esc(l.pasteDo) + '</button></details>';
      el.querySelectorAll('.hq-x').forEach(function (b) {
        b.onclick = function () { var id = b.parentNode.getAttribute('data-id'); c.from('live_students').delete().eq('id', id).then(function () { roster(c, k, el); }); };
      });
      el.querySelector('.hq-add1').onclick = function () {
        var o = { class_id: k.id }; el.querySelectorAll('.hq-f4 [data-f]').forEach(function (i) { o[i.getAttribute('data-f')] = i.value.trim() || null; });
        if (!o.first) return toast(l.need);
        c.from('live_students').insert(o).then(function (r2) { if (r2.error) return toast(r2.error.message); roster(c, k, el); });
      };
      el.querySelector('.hq-addn').onclick = function () {
        var rows = parseList(el.querySelector('.hq-ta').value).map(function (x) { x.class_id = k.id; return x; });
        if (!rows.length) return;
        c.from('live_students').insert(rows).then(function (r2) { if (r2.error) return toast(r2.error.message); toast(l.added(num(rows.length))); roster(c, k, el); });
      };
    });
  }
  // a pasted list: tab- or comma-separated columns (first, second, third, family, id), or a full name with spaces
  function parseList(txt) {
    return String(txt || '').split(/\r?\n/).map(function (ln) { return ln.trim(); }).filter(Boolean).map(function (ln) {
      var p = /[\t,،;]/.test(ln) ? ln.split(/[\t,،;]/).map(function (x) { return x.trim(); }) : null, sid = null;
      if (!p) {
        p = ln.split(/\s+/);
        if (p.length > 1 && /^[0-9٠-٩]+$/.test(p[p.length - 1])) sid = p.pop();
        if (p.length > 4) p = [p[0], p[1], p[2], p.slice(3).join(' ')];
        if (p.length === 2) p = [p[0], '', '', p[1]];
        if (p.length === 3) p = [p[0], p[1], '', p[2]];
      } else { sid = p[4] || null; }
      return { first: (p[0] || '').slice(0, 40), second: (p[1] || '').slice(0, 40) || null, third: (p[2] || '').slice(0, 40) || null, family: (p[3] || '').slice(0, 40) || null, sid: sid ? String(sid).slice(0, 30) : null };
    }).filter(function (x) { return x.first; });
  }
  function reports(c, k, el) {
    var l = L();
    c.from('live_sessions').select('id,code,started_at,ended_at,report').eq('class_id', k.id).order('started_at', { ascending: false }).limit(30).then(function (r) {
      var list = (r.data || []).filter(function (x) { return x.report; });
      if (!list.length) { el.innerHTML = '<p class="hq-note">' + esc(l.repNone) + '</p>'; return; }
      el.innerHTML = '<h5>' + esc(l.repH) + '</h5>' + list.map(function (x, i) {
        var d = new Date(x.started_at), st = (x.report.students || []);
        return '<details class="hq-rp"><summary>' + esc(d.toLocaleDateString(lang() === 'ar' ? 'ar-SA-u-ca-gregory' : undefined)) + ' · ' + esc(d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })) +
          ' · ' + num(st.filter(function (s) { return s.in > 0; }).length) + '/' + num(st.length) + '</summary><table class="hq-tb"><tr><th></th><th>' + esc(l.inT) + '</th><th>' + esc(l.outT) + '</th><th>' + esc(l.times) + '</th></tr>' +
          st.map(function (s) { return '<tr><td>' + esc(s.name) + '</td><td>' + (s.in ? dur(s.in) : '—') + '</td><td>' + (s.out ? dur(s.out) : '—') + '</td><td>' + num(s.outs || 0) + '</td></tr>'; }).join('') +
          '</table><button type="button" class="hq-b2 hq-csv" data-i="' + i + '">' + esc(l.csv) + '</button></details>';
      }).join('');
      el.querySelectorAll('.hq-csv').forEach(function (b) {
        b.onclick = function () {
          var x = list[+b.getAttribute('data-i')], rows = [['name', 'id', 'joined', 'in_minutes', 'out_minutes', 'times_out']];
          (x.report.students || []).forEach(function (s) { rows.push([s.name, s.sid || '', s.joined ? new Date(s.joined).toISOString() : '', (s.in / 60000).toFixed(1), (s.out / 60000).toFixed(1), s.outs || 0]); });
          var csv = '﻿' + rows.map(function (r2) { return r2.map(function (v) { return '"' + String(v).replace(/"/g, '""') + '"'; }).join(','); }).join('\r\n');
          var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
          a.download = (k.name + '-' + x.started_at.slice(0, 10)).replace(/[\\/:*?"<>|]/g, '-') + '.csv'; document.body.appendChild(a); a.click(); a.remove();
        };
      });
    });
  }

  /* ================= the teacher's session ================= */
  var S = null;        // {role: 'teacher'|'student'|'display', code, ch, ...}
  function startSession(c, k) {
    var tries = 0;
    var go = function () {
      var code = String(Math.floor(100000 + Math.random() * 900000));
      c.from('live_sessions').insert({ class_id: k.id, code: code, title: k.name }).select('id').single().then(function (r) {
        if (r.error) { if (++tries < 5) return go(); return toast(r.error.message); }
        c.from('live_students').select('id,first,second,third,family,sid').eq('class_id', k.id).then(function (r2) {
          teach(c, { id: r.data.id, code: code, title: k.name, cls: k, roster: (r2.data || []).map(function (x) { return { id: x.id, name: fullName(x), sid: x.sid }; }) });
        });
      });
    };
    go();
  }
  /* A minimised panel or bar becomes a small round button the user drags anywhere (its place is remembered per
     role); a tap without a drag opens it again. B_ = {el, show(html), hide(), remove()} */
  function bubble(key, onOpen) {
    var l = L(), el = document.createElement('button');
    el.type = 'button'; el.className = 'hq-bub'; el.title = l.drag; el.setAttribute('aria-label', l.open); el.hidden = true;
    document.body.appendChild(el);
    var place = function (x, y) {
      var w = el.offsetWidth || 56, h = el.offsetHeight || 56;
      x = Math.max(6, Math.min(innerWidth - w - 6, x)); y = Math.max(6, Math.min(innerHeight - h - 6, y));
      el.style.left = x + 'px'; el.style.top = y + 'px'; return [x, y];
    };
    var put = function () {
      var p = null; try { p = JSON.parse(load('lt_hq_pos_' + key)); } catch (e) {}
      if (p) place(p[0] * innerWidth, p[1] * innerHeight); else place(12, innerHeight - 150);
    };
    var d = null;
    el.addEventListener('pointerdown', function (e) {
      d = { x: e.clientX, y: e.clientY, l: el.offsetLeft, t: el.offsetTop, moved: false };
      try { el.setPointerCapture(e.pointerId); } catch (x) {}
    });
    el.addEventListener('pointermove', function (e) {
      if (!d) return;
      var dx = e.clientX - d.x, dy = e.clientY - d.y;
      if (!d.moved && Math.abs(dx) + Math.abs(dy) < 8) return;
      d.moved = true; el.classList.add('hq-drag');
      place(d.l + dx, d.t + dy);
    });
    var up = function () {
      if (!d) return;
      var moved = d.moved; d = null; el.classList.remove('hq-drag');
      if (moved) store('lt_hq_pos_' + key, JSON.stringify([el.offsetLeft / innerWidth, el.offsetTop / innerHeight]));
      else onOpen();
    };
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', function () { d = null; el.classList.remove('hq-drag'); });
    var onResize = function () { if (!el.hidden) place(el.offsetLeft, el.offsetTop); };
    window.addEventListener('resize', onResize);
    return {
      el: el,
      show: function (html) { if (html != null) el.innerHTML = html; el.hidden = false; put(); store('lt_hq_min_' + key, '1'); },
      set: function (html) { el.innerHTML = html; },
      hide: function () { el.hidden = true; store('lt_hq_min_' + key, null); },
      remove: function () { window.removeEventListener('resize', onResize); el.remove(); },
      wasMin: function () { return load('lt_hq_min_' + key) === '1'; }
    };
  }

  // one live channel that reopens itself: on an error or timeout, and when ensure() finds it not joined
  function wire(c, name, key, setup, onJoin) {
    var W = { ch: null, t: null, done: false };
    W.open = function () {
      clearTimeout(W.t);
      if (W.ch) { var o = W.ch; W.ch = null; try { c.removeChannel(o); } catch (e) {} }
      var ch = W.ch = c.channel(name, { config: { broadcast: { self: false }, presence: { key: key } } });
      setup(ch);
      ch.subscribe(function (st) {
        if (W.done || W.ch !== ch) return;
        if (st === 'SUBSCRIBED') onJoin(ch);
        else if (st === 'CHANNEL_ERROR' || st === 'TIMED_OUT' || st === 'CLOSED') { clearTimeout(W.t); W.t = setTimeout(function () { if (!W.done && W.ch === ch) W.open(); }, 1500); }
      });
    };
    W.ensure = function () {
      if (W.done) return;
      try { if (c.realtime && c.realtime.isConnected && !c.realtime.isConnected()) c.realtime.connect(); } catch (e) {}
      if (!W.ch || (W.ch.state !== 'joined' && W.ch.state !== 'joining')) W.open();
    };
    W.close = function () { W.done = true; clearTimeout(W.t); if (W.ch) { var o = W.ch; W.ch = null; try { c.removeChannel(o); } catch (e) {} } };
    W.open();
    return W;
  }
  var STALE = 12000;
  // a send or track that fails while the channel rejoins is not an error worth a console line
  var quiet = function (f) { try { var r = f(); if (r && r.catch) r.catch(function () {}); } catch (e) {} };
  function teach(c, ses) {
    var l = L(), now = Date.now();
    S = { role: 'teacher', code: ses.code, ses: ses, lock: false, hide: false, focus: null, au: 'c', view: 'g', t0: now, pages: {}, st: {}, c: c };
    // the students' running record: {id: {name, sid, joined, st, since, in, out, outs, p}}
    ses.roster.forEach(function (x) { S.st[x.id] = { name: x.name, sid: x.sid, joined: 0, st: 'n', since: now, in: 0, out: 0, outs: 0 }; });
    var sendSt = function () { if (S && S.ch) quiet(function () { return S.ch.send({ type: 'broadcast', event: 'st', payload: state() }); }); };
    S.send = sendSt;
    S.W = wire(c, 'hq-' + ses.code, 'teacher', function (ch) {
      S.ch = ch;
      ch.on('broadcast', { event: 'hello' }, function () { sendSt(); S.auK = null; auWatch(); });
      ch.on('broadcast', { event: 'me' }, function (m) { heard(m.payload || {}); drawPanel(); });
      ch.on('presence', { event: 'sync' }, function () { if (S && S.ch === ch) presenceSync(ch.presenceState()); });
    }, sendSt);
    S.beat = setInterval(sendSt, 5000);
    S.tk = setInterval(function () { stale(); drawPanel(); }, 1000);
    S.aw = setInterval(auWatch, 250);
    // back from the background: rejoin, resend, and give the students a moment before judging their silence
    S.vis = function () { if (document.visibilityState !== 'visible' || !S) return; S.grace = Date.now() + 6000; S.W.ensure(); sendSt(); };
    document.addEventListener('visibilitychange', S.vis); window.addEventListener('online', S.vis);
    S.pages[B().cur()] = 1;
    panel();
    document.addEventListener('click', ayahTap, true);
  }
  function state() {
    var g = S.view === 'g';
    return { p: S.page || B().cur(), v: S.view, lock: g, hide: g && !!(B().hidden && B().hidden()), focus: S.focus, title: S.ses.title, au: S.au,
      md: g && B().mode ? B().mode() : null, t: Date.now() };
  }
  // the teacher's recitation, watched four times a second and sent when it changes (and every 2 s while it plays)
  function auWatch() {
    if (!S || S.role !== 'teacher' || !S.ch) return;
    var mk = (B().mode ? B().mode() : '') + (B().hidden && B().hidden() ? 'h' : '');
    if (mk !== S.modeK) { S.modeK = mk; if (S.view === 'g') S.send(); }
    var x = B().audioNow ? B().audioNow() : null, h = B().hlNow ? B().hlNow() : null, now = Date.now();
    var m = x ? { u: x.u, t: Math.round(x.t * 100) / 100, p: x.p, r: x.r, m: x.m, h: h || null } : { stop: true, h: null };
    var k = x ? [x.u, x.p, x.r, x.m, JSON.stringify(h)].join('|') : 'stop';
    if (k === S.auK && (!x || x.p || now - S.auAt < 2000)) return;
    S.auK = k; S.auAt = now; S.auLast = m;
    quiet(function () { return S.ch.send({ type: 'broadcast', event: 'au', payload: m }); });
  }
  // presence → each student's colour, and the time it has held
  function presenceSync(ps) {
    var now = Date.now(), seen = {};
    Object.keys(ps).forEach(function (key) {
      if (key === 'teacher' || key === 'display') return;
      var m = ps[key][ps[key].length - 1] || {};
      seen[m.id || key] = 1;
      heard(m, key, true);
    });
    // gone from presence and not heard otherwise lately: out
    Object.keys(S.st).forEach(function (id) { var r = S.st[id]; if (!seen[id] && r.joined && r.st !== 'r' && now - (r.seen || 0) > 5000) setSt(r, 'r', now); });
    drawPanel();
  }
  // a student's record (from presence or his 'me' broadcast): the newer one wins
  // (a presence sync repeats every student's last record, so only a newer one counts as hearing from him)
  function heard(m, key, fromPresence) {
    var now = Date.now(), id = m.id || key;
    if (!id || !S || S.role !== 'teacher') return;
    var r = S.st[id];
    if (!r) r = S.st[id] = { name: m.name || '?', sid: m.sid || null, joined: 0, st: 'n', since: now, in: 0, out: 0, outs: 0 };
    if (!r.joined) { r.joined = now; r.seen = now; }
    if (!fromPresence || !r.ts || (m.ts && m.ts > r.ts)) r.seen = now;
    if (m.ts && r.ts && m.ts <= r.ts && fromPresence) return;
    if (m.ts && r.ts && m.ts < r.ts) return;
    if (m.ts) r.ts = m.ts;
    setSt(r, m.st || 'g', now); r.p = m.p;
  }
  // silence: a phone in the background sends nothing, so not heard for STALE ms → out
  function stale() {
    var now = Date.now();
    if (S.grace && now < S.grace) return;
    Object.keys(S.st).forEach(function (id) { var r = S.st[id]; if (r.joined && (r.st === 'g' || r.st === 'y') && now - (r.seen || 0) > STALE) setSt(r, 'r', now); });
  }
  function setSt(r, st, now) {
    if (r.st === st) return;
    acc(r, now);
    if (st === 'r' && r.st !== 'r' && r.st !== 'n') r.outs++;
    r.st = st; r.since = now;
  }
  function acc(r, now) { var d = now - r.since; if (r.st === 'g' || r.st === 'y') r.in += d; else if (r.st === 'r') r.out += d; r.since = now; }
  function ayahTap(e) {
    if (!S || S.role !== 'teacher') return;
    var ae = e.target.closest && e.target.closest('.bk-mpage .ae[data-l]');
    if (!ae) return;
    e.stopPropagation(); e.preventDefault();
    var x = ae.getAttribute('data-l').split(':').map(Number);
    S.focus = S.focus && S.focus[0] === x[0] && S.focus[1] === x[1] ? null : [x[0], x[1]];
    S.send(); focusShow(S.focus); drawPanel();
  }
  var P = null, BT = null;
  function stName(l, k) { return k === 'g' ? l.inMushaf : k === 'y' ? l.other : k === 'r' ? l.out : l.notYet; }
  function opt(cls, title, help, name, items) {
    return '<div class="hq-opt ' + cls + '"><div class="hq-or"><span class="hq-ot"><b>' + esc(title) + '</b><button type="button" class="hq-qm" aria-label="?" aria-expanded="false">?</button></span>' +
      '<span class="hq-seg">' + items.map(function (x, i) { return '<label><input type="radio" name="' + name + '" value="' + x[0] + '"' + (i ? '' : ' checked') + '><span>' + esc(x[1]) + '</span></label>'; }).join('') + '</span></div>' +
      '<p class="hq-help" hidden>' + esc(help) + '</p></div>';
  }
  function panel() {
    var l = L();
    P = document.createElement('div'); P.className = 'hq-panel';
    var link = location.origin + location.pathname + '?live=' + S.code;
    P.innerHTML = '<div class="hq-ph"><b class="hq-cd" dir="ltr">' + esc(S.code.slice(0, 3) + ' ' + S.code.slice(3)) + '</b><span class="hq-pt">' + esc(S.ses.title) + '</span>' +
      '<button type="button" class="hq-min" title="' + esc(l.mini) + '" aria-label="' + esc(l.mini) + '">–</button></div><div class="hq-pb">' +
      '<div class="hq-lk"><b class="hq-lkt">' + esc(l.link) + ':</b><span dir="ltr">' + esc(link.replace(/^https?:\/\//, '')) + '</span><button type="button" class="hq-b2 hq-cp">' + esc(l.copy) + '</button></div>' +
      // each setting on one line: its title, a «?» that opens its explanation, and its choices side by side
      opt('hq-view', l.viewH, l.viewHelp, 'hqv', [['g', l.viewG], ['i', l.viewI]]) +
      opt('hq-snd', l.auH, l.auHelp, 'hqau', [['c', l.auC], ['r', l.auR]]) +
      '<div class="hq-tg"><button type="button" class="hq-b2 hq-uf" hidden>' + esc(l.unfocus) + '</button></div>' +
      // the students: a column for each status, a mark where each one is now, and the total under each column
      // the students: present (green: in the Mushaf · red: out of it, or not come) and following (green: on the teacher's
      // page · red: another page); the totals under them
      '<table class="hq-tbl"><thead><tr><th>' + esc(l.colName) + '</th><th class="hq-c">' + esc(l.present) + '</th><th class="hq-c">' + esc(l.following) + '</th></tr></thead>' +
      '<tbody class="hq-rl"></tbody><tfoot><tr class="hq-tot"><td>' + esc(l.total) + '</td><td class="hq-c" data-k="in"></td><td class="hq-c" data-k="fo"></td></tr></tfoot></table>' +
      '<details class="hq-disp"><summary>' + esc(l.display) + '</summary><p class="hq-note">' + esc(l.displayHelp) + '</p><div class="hq-lk"><span dir="ltr">' + esc((link + '&display=1').replace(/^https?:\/\//, '')) + '</span><button type="button" class="hq-b2 hq-cp2">' + esc(l.copy) + '</button></div></details>' +
      '<button type="button" class="hq-b hq-end">' + esc(l.end) + '</button></div>';
    document.body.appendChild(P); document.body.classList.add('hq-teaching');
    var cp = function (t, b) { (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { b.textContent = l.copied; }, function () {}); };
    P.querySelector('.hq-cp').onclick = function () { cp(link, this); };
    P.querySelector('.hq-cp2').onclick = function () { cp(link + '&display=1', this); };
    var bt = BT = S.bub = bubble('t', function () { bt.hide(); if (P) P.hidden = false; });
    P.querySelector('.hq-min').onclick = function () { P.hidden = true; bt.show(); drawPanel(); };
    if (bt.wasMin()) { P.hidden = true; bt.show(); }
    P.querySelectorAll('.hq-qm').forEach(function (b) { b.onclick = function () {
      var h = b.closest('.hq-opt').querySelector('.hq-help'); h.hidden = !h.hidden; b.setAttribute('aria-expanded', String(!h.hidden)); b.classList.toggle('on', !h.hidden);
    }; });
    P.querySelectorAll('input[name=hqv]').forEach(function (r) { r.onchange = function () {
      if (!this.checked) return;
      S.view = this.value; var sn = P.querySelector('.hq-snd'); sn.classList.toggle('hq-off', S.view !== 'g'); sn.querySelectorAll('input').forEach(function (x) { x.disabled = S.view !== 'g'; });   // kept in place (greyed), so the panel does not change size S.send(); S.auK = null; auWatch();
    }; });
    P.querySelectorAll('input[name=hqau]').forEach(function (r) { r.onchange = function () { if (this.checked) { S.au = this.value; S.send(); S.auK = null; auWatch(); } }; });
    P.querySelector('.hq-uf').onclick = function () { S.focus = null; S.send(); focusShow(null); drawPanel(); };
    P.querySelector('.hq-end').onclick = function () { if (confirm(l.endQ)) endSession(); };
    drawPanel();
  }
  function drawPanel() {
    if (!P || !S || S.role !== 'teacher') return;
    var l = L(), now = Date.now(), ids = Object.keys(S.st), cnt = { g: 0, y: 0, r: 0, n: 0 };
    var order = { r: 0, y: 1, g: 2, n: 3 };
    ids.sort(function (a, b) { var x = S.st[a], y = S.st[b]; return (order[x.st] - order[y.st]) || x.name.localeCompare(y.name, 'ar'); });
    P.querySelector('.hq-rl').innerHTML = ids.map(function (id) {
      var r = S.st[id]; cnt[r.st]++;
      var here = r.st === 'g' || r.st === 'y';
      var dot = function (ok, sub, t) { return '<td class="hq-c"><i class="' + (ok ? 'ok' : 'no') + '" title="' + esc(t) + '"></i>' + (sub ? '<small>' + esc(sub) + '</small>' : '') + '</td>'; };
      return '<tr class="hq-s hq-' + r.st + '"><td>' + esc(r.name) + '</td>' +
        dot(here, r.st === 'r' ? dur(now - r.since) : r.st === 'n' ? l.notYet : '', stName(l, r.st)) +
        (here ? dot(r.st === 'g', r.st === 'y' && r.p ? l.pageW + ' ' + num(r.p) : '', stName(l, r.st)) : '<td class="hq-c">–</td>') + '</tr>';
    }).join('');
    // the count of each status, in the table under its header
    var tot = ids.length, inN = cnt.g + cnt.y;
    P.querySelector('.hq-tot [data-k=in]').textContent = num(inN) + ' ' + l.of + ' ' + num(tot);
    P.querySelector('.hq-tot [data-k=fo]').textContent = num(cnt.g) + ' ' + l.of + ' ' + num(inN);
    // the minimised button: how many are in (green), elsewhere (yellow) and out (red)
    if (S.bub) S.bub.set('<span class="hq-bc hq-g"><i></i>' + num(cnt.g) + '</span>' + (cnt.y ? '<span class="hq-bc hq-y"><i></i>' + num(cnt.y) + '</span>' : '') +
      '<span class="hq-bc hq-r"><i></i>' + num(cnt.r) + '</span>');
    P.querySelector('.hq-uf').hidden = !S.focus;
  }
  function endSession() {
    var now = Date.now(), c = S.c, ses = S.ses;
    Object.keys(S.st).forEach(function (id) { acc(S.st[id], now); });
    var rep = { started: S.t0, ended: now, pages: Object.keys(S.pages).map(Number), students: Object.keys(S.st).map(function (id) {
      var r = S.st[id]; return { id: id, name: r.name, sid: r.sid || null, joined: r.joined || null, in: Math.round(r.in), out: Math.round(r.out), outs: r.outs };
    }) };
    try { S.ch.send({ type: 'broadcast', event: 'end', payload: {} }); } catch (e) {}
    c.from('live_sessions').update({ ended_at: new Date(now).toISOString(), report: rep }).eq('id', ses.id).then(function () {});
    clearInterval(S.beat); clearInterval(S.tk); clearInterval(S.aw);
    try { S.ch.send({ type: 'broadcast', event: 'au', payload: { stop: true, h: null } }); } catch (e) {}
    document.removeEventListener('visibilitychange', S.vis); window.removeEventListener('online', S.vis);
    var W = S.W; setTimeout(function () { W.close(); }, 600); S = null;
    document.removeEventListener('click', ayahTap, true);
    if (P) { P.remove(); P = null; } document.body.classList.remove('hq-teaching');
    if (BT) { BT.remove(); BT = null; }
    focusShow(null);
    toast(L().ended);
  }

  /* ================= a student (or the projector) ================= */
  function join(code, o) {
    o = o || {};
    fam(function () {
      client().then(function (c) {
        return c.rpc('live_join_info', { p_code: code }).then(function (r) {
          if (r.error || !r.data) return toast(L().badCode);
          var info = r.data;
          if (o.display) return follow(c, code, info, null, 'display');
          var key = 'lt_hq_me_' + info['class'], me = null;
          try { me = JSON.parse(load(key) || 'null'); } catch (e) {}
          if (me && me.id) return follow(c, code, info, me, 'student');
          who(c, code, info, function (m, shared) { if (!shared) store(key, JSON.stringify(m)); follow(c, code, info, m, 'student'); });
        });
      }).catch(function () { toast(L().badCode); });
    });
  }
  // who are you: the roster to pick from, or a form to register
  function who(c, code, info, done) {
    var l = L(), ov = document.createElement('div'); ov.className = 'hq-ov';
    var ro = info.roster || [];
    ov.innerHTML = '<div class="hq-box"><h3>' + esc(info.title || l.title) + '</h3><h4>' + esc(l.who) + '</h4>' +
      (ro.length ? '<input class="hq-in hq-q" placeholder="' + esc(l.search) + '"><ul class="hq-pick">' + ro.map(function (x) { return '<li><button type="button" data-id="' + x.id + '">' + esc(x.name) + '</button></li>'; }).join('') + '</ul>' : '') +
      '<details class="hq-reg"' + (ro.length ? '' : ' open') + '><summary>' + esc(l.notListed) + '</summary><div class="hq-f4">' +
      '<input class="hq-in" data-f="p_first" placeholder="' + esc(l.f1) + '"><input class="hq-in" data-f="p_second" placeholder="' + esc(l.f2) + '"><input class="hq-in" data-f="p_third" placeholder="' + esc(l.f3) + '"><input class="hq-in" data-f="p_family" placeholder="' + esc(l.f4) + '"><input class="hq-in" data-f="p_sid" placeholder="' + esc(l.sid) + '" dir="ltr">' +
      '<button type="button" class="hq-b hq-rg">' + esc(l.register) + '</button></div></details>' +
      '<label class="hq-sh"><input type="checkbox" class="hq-shared"> ' + esc(l.shared) + '</label><button type="button" class="hq-b2 hq-cx">' + esc(l.cancel) + '</button></div>';
    document.body.appendChild(ov);
    var shared = function () { return ov.querySelector('.hq-shared').checked; };
    var q = ov.querySelector('.hq-q');
    if (q) q.oninput = function () { var v = q.value.trim(); ov.querySelectorAll('.hq-pick li').forEach(function (li) { li.hidden = v && li.textContent.indexOf(v) < 0; }); };
    ov.querySelectorAll('.hq-pick button').forEach(function (b) {
      b.onclick = function () { var id = b.getAttribute('data-id'), x = ro.filter(function (y) { return y.id === id; })[0]; ov.remove(); done({ id: id, name: x.name, sid: x.sid }, shared()); };
    });
    ov.querySelector('.hq-rg').onclick = function () {
      var a = { p_code: code }; ov.querySelectorAll('.hq-reg [data-f]').forEach(function (i) { a[i.getAttribute('data-f')] = i.value.trim(); });
      if (!a.p_first || !a.p_family) return toast(l.need);
      c.rpc('live_register', a).then(function (r) { if (r.error) return toast(r.error.message); ov.remove(); done({ id: r.data.id, name: r.data.name, sid: a.p_sid || null }, shared()); });
    };
    ov.querySelector('.hq-cx').onclick = function () { ov.remove(); };
  }
  function follow(c, code, info, me, role) {
    var l = L();
    S = { role: role, code: code, me: me, info: info, t: null, c: c };
    S.W = wire(c, 'hq-' + code, me ? me.id : 'display', function (ch) {
      S.ch = ch;
      ch.on('broadcast', { event: 'st' }, function (m) { applyState(m.payload || {}); });
      ch.on('broadcast', { event: 'au' }, function (m) { hearAu(m.payload || {}); });
      ch.on('broadcast', { event: 'end' }, function () { leave(true); });
    }, function (ch) {
      ch.send({ type: 'broadcast', event: 'hello', payload: {} });
      if (me) report(true);
    });
    // the heartbeat, and back from the background: rejoin at once and report
    S.hb = setInterval(function () { if (document.visibilityState === 'visible') report(); }, 4000);
    S.vis = function () {
      if (!S) return;
      if (document.visibilityState === 'visible') { S.W.ensure(); report(true); if (S.ch) S.ch.send({ type: 'broadcast', event: 'hello', payload: {} }); }
      else report();
    };
    document.addEventListener('visibilitychange', S.vis);
    window.addEventListener('pagehide', S.vis);
    window.addEventListener('online', S.vis);
    // the bar: which circle, that the teacher sees presence, leave
    var bar = S.bar = document.createElement('div'); bar.className = 'hq-bar' + (role === 'display' ? ' hq-disp' : '');
    bar.innerHTML = '<b>' + esc(l.bar) + ': ' + esc(info.title || '') + '</b>' + (me ? '<span>' + esc(me.name) + ' · ' + esc(l.watch) + '</span>' : '') +
      '<button type="button" class="hq-un" hidden>' + esc(l.unlock) + '</button>' +
      '<button type="button" class="hq-lv">' + esc(l.leave) + '</button><button type="button" class="hq-bmin" title="' + esc(l.mini) + '" aria-label="' + esc(l.mini) + '">–</button>';
    bar.querySelector('.hq-un').onclick = unlock;
    bar.querySelector('.hq-lv').onclick = function () { leave(false); };
    document.body.appendChild(bar); document.body.classList.add('hq-on');
    var bs = S.bub = bubble(role === 'display' ? 'd' : 's', function () { bs.hide(); bar.hidden = false; });
    bs.el.innerHTML = '<span class="hq-bc hq-g"><i></i>' + esc(l.bar) + '</span>';
    bar.querySelector('.hq-bmin').onclick = function () { bar.hidden = true; bs.show(); };
    if (bs.wasMin()) { bar.hidden = true; bs.show(); }
  }
  // the student's colour: out of the Mushaf (the page hidden) red; another page than the teacher's yellow; else green
  // presence carries it on every change (and after each rejoin); the 'me' broadcast carries it always — it reaches
  // the teacher at once, and by REST when the socket is down
  function report(force) {
    if (!S || S.role !== 'student' || !S.ch) return;
    var p = B().cur(), st = document.visibilityState === 'hidden' ? 'r' : (S.t && S.t.p && B().visible().indexOf(S.t.p) < 0 ? 'y' : 'g');
    var m = { id: S.me.id, name: S.me.name, sid: S.me.sid || null, st: st, p: p, ts: Date.now() }, k = st + ':' + p;
    quiet(function () { return S.ch.send({ type: 'broadcast', event: 'me', payload: m }); });
    if (force === true || k !== S.last) { S.last = k; quiet(function () { return S.ch.track(m); }); }
  }
  function applyState(t) {
    if (!S || S.role === 'teacher') return;
    var was = S.t || {}; S.t = t;
    var vis = B().visible();
    if (t.v !== 'i' && t.p && (vis.indexOf(t.p) < 0) && (!was.p || was.p !== t.p || t.lock)) B().show(t.p);   // together: the teacher's page
    document.body.classList.toggle('hq-locked', !!t.lock);
    if (!!t.hide !== !!was.hide) B().hide(!!t.hide);
    var f0 = was.focus ? was.focus.join(':') : '', f1 = t.focus ? t.focus.join(':') : '';
    if (f0 !== f1) focusShow(t.focus);
    if (t.au !== was.au || t.v !== was.v) auMode();
    if (t.v === 'i' && was.v !== 'i' && B().follow) B().follow(null);
    if (t.md && B().mode && B().mode() !== t.md) B().setMode(t.md);       // the mode the teacher set
    report();
  }
  /* ---------- the teacher's recitation on a student's (or the projector's) Mushaf ---------- */
  // the highlight follows in both ways; in 'r' (remote) a student's device also plays the same file, kept within
  // about half a second of the teacher's (a phone needs one tap first: «turn on the sound»)
  var SILENT = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';
  function remote() { return S && S.role === 'student' && S.t && S.t.au === 'r' && S.t.v !== 'i'; }
  function hearAu(m) {
    if (!S || S.role === 'teacher') return;
    S.au = m; S.auRecv = Date.now();
    if (S.t && S.t.v === 'i') { if (S.mA) S.mA.pause(); return; }        // individual: nothing follows
    if (B().follow) B().follow(m.h);
    if (remote()) mirror(m);
    else if (S.mA) S.mA.pause();
  }
  function auMode() {
    if (!S || !S.bar) return;
    var un = S.bar.querySelector('.hq-un'), need = remote() && !S.unlocked;
    if (un) un.hidden = !need;
    if (need && S.bar.hidden) { S.bar.hidden = false; if (S.bub) S.bub.hide(); }
    if (!remote() && S.mA) S.mA.pause();
    else if (remote() && S.unlocked && S.au) mirror(S.au);
  }
  function unlock() {
    if (!S) return;
    var A = S.mA || (S.mA = new Audio());
    S.unlocked = true;
    var un = S.bar && S.bar.querySelector('.hq-un'); if (un) un.hidden = true;
    if (S.au && S.au.u && !S.au.stop) return mirror(S.au);                 // play now, inside the tap
    A.src = SILENT; var pr = A.play(); if (pr && pr.then) pr.then(function () { A.pause(); }, function () {});
  }
  function mirror(m) {
    var A = S.mA || (S.mA = new Audio());
    if (m.stop || !m.u) { A.pause(); return; }
    if (!S.unlocked) return auMode();
    if (B().playing && B().playing()) B().stopAudio();                  // his own recitation gives way to the teacher's
    var rate = m.r || 1, late = function () { return (Date.now() - S.auRecv) / 1000 * rate + (m.p ? 0 : 0.15 * rate); };
    A.defaultPlaybackRate = A.playbackRate = rate; A.muted = !!m.m;
    if (A.getAttribute('src') !== m.u) {
      A.src = m.u;
      A.addEventListener('loadedmetadata', function () { if (A.getAttribute('src') === m.u) try { A.currentTime = m.t + late(); } catch (e) {} }, { once: true });
    } else if (Math.abs(A.currentTime - (m.t + late())) > 0.6) { try { A.currentTime = m.t + late(); } catch (e) {} }
    if (m.p) A.pause();
    else { var pr = A.play(); if (pr && pr.catch) pr.catch(function () { S.unlocked = false; auMode(); }); }
  }
  function leave(ended) {
    if (!S) return;
    clearInterval(S.hb);
    if (S.mA) { try { S.mA.pause(); } catch (e) {} }
    if (B().follow) B().follow(null);
    try { if (S.ch) S.ch.untrack(); } catch (e) {}
    S.W.close();
    document.removeEventListener('visibilitychange', S.vis);
    window.removeEventListener('pagehide', S.vis);
    window.removeEventListener('online', S.vis);
    if (S.bar) S.bar.remove();
    if (S.bub) S.bub.remove();
    document.body.classList.remove('hq-on', 'hq-locked');
    focusShow(null); if (S.t && S.t.hide) B().hide(false);
    S = null;
    if (ended) toast(L().ended);
  }

  /* ================= focus on an ayah: it lit on the page, and its tajweed rules in a card ================= */
  var FC = null;
  function focusShow(f) {
    document.querySelectorAll('.hq-fx').forEach(function (e) { e.classList.remove('hq-fx'); });
    if (FC) { FC.remove(); FC = null; }
    if (!f) return;
    var s = f[0], a = f[1], l = L();
    var lit = function () { document.querySelectorAll('.bk-mpage [data-l^="' + s + ':' + a + ':"]').forEach(function (e) { e.classList.add('hq-fx'); }); };
    var p = B().pageOf ? B().pageOf(s, a) : 0;
    if (p && B().visible().indexOf(p) < 0 && (!S || S.role === 'teacher' || !(S.t && S.t.lock))) B().show(p).then(lit); else lit();
    FC = document.createElement('div'); FC.className = 'hq-fc';
    FC.innerHTML = '<div class="hq-fch"><b>' + esc(l.focusH) + ' ' + esc(B().surahName ? B().surahName(s) : '') + ' ' + num(a) + '</b>' +
      (S && S.role === 'teacher' ? '<button type="button" class="hq-fcx">×</button>' : '') + '</div><div class="hq-fcb">…</div>';
    document.body.appendChild(FC);
    var x = FC.querySelector('.hq-fcx'); if (x) x.onclick = function () { S.focus = null; S.send(); focusShow(null); drawPanel(); };
    B().tjAyah(s, a).then(function (list) {
      if (!FC) return;
      FC.querySelector('.hq-fcb').innerHTML = list.length ? '<h4>' + esc(l.rules) + '</h4>' + list.map(function (r) {
        var nt = r[2] || {}, w = r[0].split(':')[2], words = B().words(s, a);
        return '<div class="tj-row"><span class="tj-w" lang="ar">' + esc(words[w - 1] || '') + '</span><span class="tj-rs">' + r[1].map(function (k) { return B().tjChip(k, nt[k]); }).join('') + '</span></div>';
      }).join('') : '<p class="hq-note">' + esc(l.noRules) + '</p>';
    }, function () {});
  }

  window.LtHalaqa = {
    ui: ui, join: join,
    page: function (p) {
      if (!S) return;
      if (S.role === 'teacher') { S.page = p; S.pages[p] = 1; S.send(); return; }
      if (S.role === 'student' && S.t && S.t.lock && S.t.p && B().visible().indexOf(S.t.p) < 0) { setTimeout(function () { if (S && S.t && S.t.lock) B().show(S.t.p); }, 400); return; }
      report();
    }
  };
})();
