/* Study plan (المنهج المقرر) for a child profile: the engine shared by the account page and the Mushaf.
   A plan is a new-memorization range walked in Mushaf order or surah-reversed (الصف ← الممتحنة …, each surah from
   its first verse), split into daily lessons of N verses or N Mushaf lines (a verse is never cut), placed on the
   study days from a start date, skipping holidays; consolidation and exam days carry review only.
   Each day has three parts, as in halaqa plans: recent review (the last few lessons), the new lesson, and
   distant review (the earlier memorized range plus lessons older than the recent window, in a cycle of K days).
   A child who misses a day continues where he stopped; the parent sees how many lessons he is behind.

   Data: data/ayah-lines.json (lines each verse takes, 15 lines a page), data/quran-pages.json (page ranges),
   data/surah-names.json. Tables study_plans, plan_lessons, plan_days (supabase/migrations/study_plans.sql).
   Verse refs are 's:a' strings; inside, a verse is its global index g (0..6235) in Mushaf order. */
(function () {
  var D = null, dP = null;
  function load() {
    if (D) return Promise.resolve(D);
    if (!dP) dP = Promise.all(['/data/ayah-lines.json', '/data/quran-pages.json', '/data/surah-names.json'].map(function (u) {
      return fetch(u).then(function (r) { if (!r.ok) throw new Error(u); return r.json(); });
    })).then(function (x) {
      var len = [], start = [], cnt = [], g = 0;
      x[0].s.forEach(function (row) { start.push(g); cnt.push(row.length); row.forEach(function (v) { len.push(v); }); g += row.length; });
      var pageStart = x[1].pages.map(function (p) { return start[p[0] - 1] + p[1] - 1; });
      D = { len: len, start: start, cnt: cnt, total: g, pageStart: pageStart, names: x[2] };
      return D;
    });
    return dP;
  }
  function gOf(ref) { var p = String(ref).split(':'); var s = +p[0], a = +p[1]; return D.start[s - 1] + Math.min(Math.max(a, 1), D.cnt[s - 1]) - 1; }
  function saOf(g) { var lo = 0, hi = 113; while (lo < hi) { var m = (lo + hi + 1) >> 1; if (D.start[m] <= g) lo = m; else hi = m - 1; } return [lo + 1, g - D.start[lo] + 1]; }
  function refOf(g) { var x = saOf(g); return x[0] + ':' + x[1]; }
  function pageOf(g) { var lo = 0, hi = 603; while (lo < hi) { var m = (lo + hi + 1) >> 1; if (D.pageStart[m] <= g) lo = m; else hi = m - 1; } return lo + 1; }
  function lastRef(s) { return s + ':' + D.cnt[s - 1]; }

  // the verses from..to in plan order
  function walk(from, to, ord) {
    var a = gOf(from), b = gOf(to), out = [], i;
    if (ord !== 'reverse') { if (a > b) { var t = a; a = b; b = t; } for (i = a; i <= b; i++) out.push(i); return out; }
    var fs = saOf(a), ts = saOf(b);
    if (fs[0] < ts[0]) { for (i = a; i <= b; i++) out.push(i); return out; }   // a reversed plan within ascending surahs: Mushaf order
    for (var s = fs[0]; s >= ts[0]; s--) {
      var a0 = s === fs[0] ? fs[1] : 1, a1 = s === ts[0] ? ts[1] : D.cnt[s - 1];
      if (s === fs[0] && s === ts[0] && a0 > a1) { var t2 = a0; a0 = a1; a1 = t2; }
      for (var k = a0; k <= a1; k++) out.push(D.start[s - 1] + k - 1);
    }
    return out;
  }
  function size(g, unit) { return unit === 'ayah' ? 1 : D.len[g]; }

  // split a run of verses into lessons of about `amount` (a verse is never cut; a short surah tail joins the lesson)
  function chunk(vs, unit, amount) {
    var out = [], cur = [], acc = 0, i = 0;
    while (i < vs.length) {
      var g = vs[i], L = size(g, unit);
      if (cur.length && acc + L > amount + L / 2) {
        // the rest of this surah, if it continues the lesson and is short, stays with it
        var s = saOf(g)[0], rest = 0, j = i;
        while (j < vs.length && saOf(vs[j])[0] === s && vs[j] === vs[j - 1] + 1) { rest += size(vs[j], unit); j++; }
        if (j > i && saOf(cur[cur.length - 1])[0] === s && rest <= 0.3 * amount) { while (i < j) { cur.push(vs[i]); i++; } }
        out.push(cur); cur = []; acc = 0; continue;
      }
      cur.push(g); acc += L; i++;
    }
    if (cur.length) {
      var tail = cur.reduce(function (t, x) { return t + size(x, unit); }, 0);
      if (out.length && tail < 0.35 * amount) out[out.length - 1] = out[out.length - 1].concat(cur); else out.push(cur);
    }
    return out.map(function (c) { return { a_from: refOf(c[0]), a_to: refOf(c[c.length - 1]) }; });
  }

  // lessons for a plan: those done or edited up to the last of them stay; the rest are made again after it
  function lessons(plan, old) {
    var all = walk(plan.new_from, plan.new_to, plan.ord), keep = [];
    old = (old || []).slice().sort(function (x, y) { return x.idx - y.idx; });
    var lastKept = -1;
    old.forEach(function (l, i) { if (l.done_at || l.edited) lastKept = i; });
    for (var i = 0; i <= lastKept; i++) keep.push(old[i]);
    var startAt = 0;
    if (keep.length) {
      var endG = gOf(keep[keep.length - 1].a_to), pos = all.indexOf(endG);
      if (pos < 0) keep = []; else startAt = pos + 1;   // the range changed under the kept lessons: start the plan afresh
    }
    var fresh = chunk(all.slice(startAt), plan.unit, +plan.amount);
    return keep.map(function (l, i) { return { idx: i, a_from: l.a_from, a_to: l.a_to, edited: !!l.edited, done_at: l.done_at || null, done_how: l.done_how || null, mistakes: l.mistakes == null ? null : l.mistakes }; })
      .concat(fresh.map(function (l, i) { return { idx: keep.length + i, a_from: l.a_from, a_to: l.a_to, edited: false, done_at: null, done_how: null, mistakes: null }; }));
  }

  // dates
  function ymd(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function parse(s) { var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2], 12); }
  function today() { return ymd(new Date()); }

  // the verses of a lesson, in plan order
  function lessonVerses(plan, l) { return walk(l.a_from, l.a_to, plan.ord); }
  function linesOf(vs) { return vs.reduce(function (t, g) { return t + D.len[g]; }, 0); }

  // split the review pool (sorted verses) into k parts of about equal length, cutting at a surah end when one is near
  function parts(pool, k) {
    if (!pool.length) return [];
    var total = linesOf(pool), per = total / k, out = [], cur = [], acc = 0;
    for (var i = 0; i < pool.length; i++) {
      var g = pool[i]; cur.push(g); acc += D.len[g];
      var endsSurah = i + 1 >= pool.length || saOf(pool[i + 1])[0] !== saOf(g)[0] || pool[i + 1] !== g + 1;
      if (out.length < k - 1 && ((endsSurah && acc >= per * 0.75) || acc >= per * 1.3)) { out.push(cur); cur = []; acc = 0; }
    }
    if (cur.length) out.push(cur);
    return out;
  }
  // contiguous runs of a sorted verse list, as ranges
  function runs(vs) {
    var out = [], a = null, p = null;
    vs.forEach(function (g) { if (a === null) { a = p = g; } else if (g === p + 1) p = g; else { out.push([a, p]); a = p = g; } });
    if (a !== null) out.push([a, p]);
    return out;
  }

  /* The whole plan laid on dates: [{d, kind:'lesson'|'fix'|'exam', li, recent:[g…], fresh:[g…], distant:[g…]}].
     days: {date: 'off'|'fix'|'exam'} */
  function schedule(plan, ls, days, maxSlots) {
    days = days || {}; maxSlots = maxSlots || 900;
    var R = plan.recent_n | 0, K = Math.max(1, plan.old_days | 0);
    var lv = ls.map(function (l) { return lessonVerses(plan, l); });
    var oldVs = plan.old_from && plan.old_to ? walk(plan.old_from, plan.old_to, 'mushaf') : [];
    var avg = lv.length ? lv.reduce(function (t, v) { return t + linesOf(v); }, 0) / lv.length : 10;
    // the old range nearest the start of the plan, to fill the recent review in the first days
    var newStart = lv.length ? lv[0][0] : null;
    var oldNear = oldVs.slice();
    if (newStart != null) {
      var after = oldVs.filter(function (g) { return g > newStart; }), before = oldVs.filter(function (g) { return g < newStart; }).reverse();
      oldNear = plan.ord === 'reverse' ? after.concat(before) : before.concat(after);
    }
    var out = [], li = 0, cyc = 0, ps = null, d = parse(plan.start_date);
    for (var guard = 0; guard < 4000 && out.length < maxSlots && li < ls.length; guard++, d.setDate(d.getDate() + 1)) {
      var key = ymd(d), wd = d.getDay();
      if (!(plan.days & (1 << wd))) continue;
      var kind = days[key] || 'lesson';
      if (kind === 'off') continue;
      var slot = { d: key, kind: kind, li: kind === 'lesson' ? li : null };
      // recent review: the last R lessons before this one, topped up from the old range when there are fewer
      var rec = [];
      for (var j = Math.max(0, li - R); j < li; j++) rec = rec.concat(lv[j]);
      var short = R - Math.min(R, li);
      if (short > 0 && oldNear.length) {
        var want = short * avg, took = 0, add = [];
        for (var q = 0; q < oldNear.length && took < want; q++) { add.push(oldNear[q]); took += D.len[oldNear[q]]; }
        rec = add.concat(rec);
      }
      slot.recent = rec.slice().sort(function (x, y) { return x - y; });
      slot.fresh = kind === 'lesson' ? lv[li] : [];
      // distant review: the old range and the lessons older than the recent window, in a cycle of K days
      var pool = oldVs.slice();
      for (var m = 0; m < Math.max(0, li - R); m++) pool = pool.concat(lv[m]);
      var inRec = {}; slot.recent.forEach(function (g) { inRec[g] = 1; });
      pool = pool.filter(function (g) { return !inRec[g]; }).sort(function (x, y) { return x - y; });
      // the parts are cut once per cycle, so a week's distant review is a fixed rotation (as in printed plans)
      if (cyc % K === 0 || !ps) ps = parts(pool, K);
      slot.distant = ps.length ? ps[cyc % ps.length] : [];
      if (kind !== 'exam') cyc++;
      if (kind === 'lesson') li++;
      out.push(slot);
    }
    return out;
  }

  // where the child stands: today's slot, the next undone lesson, and how many lessons he is behind
  function status(plan, ls, slots) {
    var t = today(), next = -1;
    for (var i = 0; i < ls.length; i++) if (!ls[i].done_at) { next = i; break; }
    var due = 0;
    slots.forEach(function (s) { if (s.kind === 'lesson' && s.d < t && !ls[s.li].done_at) due++; });
    var todaySlot = null;
    slots.forEach(function (s) { if (s.d === t) todaySlot = s; });
    var done = ls.filter(function (l) { return l.done_at; }).length;
    return { next: next, behind: due, today: todaySlot, done: done, total: ls.length, finished: next < 0 && ls.length > 0 };
  }

  // the day's three parts for the child: the next undone lesson and its reviews (he goes on from where he stopped)
  function wird(plan, ls, slots) {
    var st = status(plan, ls, slots);
    if (st.finished) return { finished: true, status: st };
    var s = null;
    if (st.today && st.today.kind !== 'lesson') s = st.today;     // a consolidation or exam day
    if (!s) slots.forEach(function (x) { if (!s && x.kind === 'lesson' && x.li === st.next) s = x; });
    return { slot: s, lesson: s && s.li != null ? ls[s.li] : null, status: st };
  }

  // labels: "الصف ١–٧", "المجادلة ٢٢ – الحديد ٤", or surah names alone for whole surahs ("الجمعة – التحريم")
  function names(lang) { return D.names[lang] || D.names.ar; }
  function label(vs, lang, num) {
    if (!vs || !vs.length) return '';
    num = num || String;
    var nm = names(lang);
    var sorted = vs.slice().sort(function (x, y) { return x - y; });
    return runs(sorted).map(function (r) { return rangeLabel(r[0], r[1], nm, num); }).join('، ');
  }
  function rangeLabel(a, b, nm, num) {
    var A = saOf(a), B = saOf(b);
    var whole = A[1] === 1 && B[1] === D.cnt[B[0] - 1];
    if (whole) return A[0] === B[0] ? nm[A[0] - 1] : nm[A[0] - 1] + ' – ' + nm[B[0] - 1];
    if (A[0] === B[0]) return nm[A[0] - 1] + ' ' + num(A[1]) + '–' + num(B[1]);
    return nm[A[0] - 1] + ' ' + num(A[1]) + ' – ' + nm[B[0] - 1] + ' ' + num(B[1]);
  }
  // a lesson's label in plan order ("المجادلة ٢٢ – الحديد ٤" for a reversed plan)
  function lessonLabel(l, lang, num) {
    num = num || String; var nm = names(lang);
    var A = l.a_from.split(':').map(Number), B = l.a_to.split(':').map(Number);
    if (A[0] === B[0]) return nm[A[0] - 1] + ' ' + num(A[1]) + '–' + num(B[1]);
    return nm[A[0] - 1] + ' ' + num(A[1]) + ' – ' + nm[B[0] - 1] + ' ' + num(B[1]);
  }

  // database
  function db() { return Fam.ready(); }
  function fetchPlan(profileId) {
    return db().then(function (c) {
      if (!c) return null;
      return c.from('study_plans').select('*').eq('profile_id', profileId).eq('active', true).maybeSingle().then(function (r) {
        if (r.error) throw r.error;
        if (!r.data) return null;
        var plan = r.data;
        return Promise.all([
          c.from('plan_lessons').select('*').eq('plan_id', plan.id).order('idx'),
          c.from('plan_days').select('d,kind').eq('plan_id', plan.id)
        ]).then(function (x) {
          if (x[0].error) throw x[0].error; if (x[1].error) throw x[1].error;
          var days = {}; (x[1].data || []).forEach(function (r) { days[r.d] = r.kind; });
          return { plan: plan, lessons: x[0].data || [], days: days };
        });
      });
    });
  }
  var FIELDS = ['new_from', 'new_to', 'ord', 'unit', 'amount', 'days', 'start_date', 'recent_n', 'old_from', 'old_to', 'old_days', 'file_path'];
  function savePlan(profileId, plan, ls, days) {
    return db().then(function (c) {
      if (!c) throw new Error('signed out');
      var row = { profile_id: profileId, active: true, updated_at: new Date().toISOString() };
      FIELDS.forEach(function (f) { if (plan[f] !== undefined) row[f] = plan[f]; });
      var q = plan.id ? c.from('study_plans').update(row).eq('id', plan.id).select().single() : c.from('study_plans').insert(row).select().single();
      return q.then(function (r) {
        if (r.error) throw r.error;
        var id = r.data.id;
        return c.from('plan_lessons').delete().eq('plan_id', id).then(function (r2) {
          if (r2.error) throw r2.error;
          var rows = ls.map(function (l) { return { plan_id: id, idx: l.idx, a_from: l.a_from, a_to: l.a_to, edited: !!l.edited, done_at: l.done_at, done_how: l.done_how, mistakes: l.mistakes }; });
          var ins = rows.length ? c.from('plan_lessons').insert(rows) : Promise.resolve({});
          return ins;
        }).then(function (r3) {
          if (r3 && r3.error) throw r3.error;
          return c.from('plan_days').delete().eq('plan_id', id);
        }).then(function (r4) {
          if (r4.error) throw r4.error;
          var rows = Object.keys(days || {}).map(function (d) { return { plan_id: id, d: d, kind: days[d] }; });
          return rows.length ? c.from('plan_days').insert(rows) : {};
        }).then(function (r5) { if (r5 && r5.error) throw r5.error; return r.data; });
      });
    });
  }
  function endPlan(planId) {
    return db().then(function (c) { return c.from('study_plans').update({ active: false }).eq('id', planId); })
      .then(function (r) { if (r.error) throw r.error; });
  }
  function mark(planId, idx, how, mistakes) {
    return db().then(function (c) {
      if (!c) return null;
      var v = how ? { done_at: new Date().toISOString(), done_how: how, mistakes: mistakes == null ? null : mistakes } : { done_at: null, done_how: null, mistakes: null };
      return c.from('plan_lessons').update(v).eq('plan_id', planId).eq('idx', idx).then(function (r) { if (r.error) throw r.error; return v; });
    });
  }
  function uploadFile(file) {
    return db().then(function (c) {
      return c.auth.getUser().then(function (u) {
        var ext = (file.name.split('.').pop() || 'pdf').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 5);
        var path = u.data.user.id + '/' + Date.now() + '.' + ext;
        return c.storage.from('plan-files').upload(path, file, { upsert: false, contentType: file.type || undefined }).then(function (r) {
          if (r.error) throw r.error; return path;
        });
      });
    });
  }
  function fileUrl(path) {
    return db().then(function (c) { return c.storage.from('plan-files').createSignedUrl(path, 600); })
      .then(function (r) { if (r.error) throw r.error; return r.data.signedUrl; });
  }

  window.Plan = {
    load: load, walk: walk, chunk: chunk, lessons: lessons, schedule: schedule, status: status, wird: wird,
    label: label, lessonLabel: lessonLabel, lessonVerses: lessonVerses, pageOf: function (g) { return pageOf(g); },
    gOf: function (r) { return gOf(r); }, refOf: function (g) { return refOf(g); }, saOf: function (g) { return saOf(g); },
    count: function (s) { return D.cnt[s - 1]; }, lastRef: lastRef, names: names, linesOf: linesOf,
    today: today, ymd: ymd, parse: parse,
    fetch: fetchPlan, save: savePlan, end: endPlan, mark: mark, upload: uploadFile, fileUrl: fileUrl
  };
})();
