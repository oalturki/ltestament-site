/* The person's Mushaf data in his account (حسابي): reminders and bookmarks belong to the profile in use (the person,
   or a child he added) and follow it to every device he signs in on. Khatmas sync themselves (js/khatma.js).

   On the device each kind lives in its usual key (lt_reminders, lt_book_marks) for the profile in use; the other
   profiles' copies wait in key@<profile id>. Without an account the device's data is the person's own ('me'); on the
   first sign-in it becomes his profile's, and is merged with what the account already holds.
   Table profile_data (supabase/migrations/profile_data.sql), one row per profile and kind.

   LtSync.touch(kind)   the data of this kind changed here: send it to the account (a moment later)
   LtSync.pull()        bring this profile's data from the account
   LtSync.switched()    the profile in use changed (event lt-profile): swap the device's copies, then pull */
(function () {
  if (window.LtSync) return;
  var KINDS = { reminders: 'lt_reminders', marks: 'lt_book_marks' };
  var load = function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } };
  var store = function (k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} };
  var signedIn = function () { return !!load('sb-nikwwjswwlwcqekbnpzq-auth-token'); };
  var prof = function () { try { return JSON.parse(load('lt_profile') || 'null'); } catch (e) { return null; } };
  var who = function () { var p = signedIn() && prof(); return p && p.id ? p.id : 'me'; };
  var famP = null;
  function fam() {
    if (window.Fam) return Promise.resolve(window.Fam);
    if (!famP) famP = new Promise(function (ok, bad) { var s = document.createElement('script'); s.src = '/js/family.js?v=1'; s.onload = function () { ok(window.Fam); }; s.onerror = bad; document.head.appendChild(s); });
    return famP;
  }
  var dirty = function () { try { return JSON.parse(load('lt_sync_dirty') || '{}'); } catch (e) { return {}; } };
  var setDirty = function (d) { store('lt_sync_dirty', JSON.stringify(d)); };
  var changed = function () { try { window.dispatchEvent(new CustomEvent('lt-sync')); } catch (e) {} };

  // the device's copies when the profile in use changes
  function switched() {
    var was0 = load('lt_sync_owner'), was = was0 || 'me', now = who();
    if (was === now) { store('lt_sync_owner', now); return pull(); }
    // the device's data becomes the person's own: on this device's first sync (what is here is his), or when he signs
    // in after using the Mushaf without an account (and his profile has nothing waiting on this device)
    var p = prof(), waiting = Object.keys(KINDS).some(function (k) { return load(KINDS[k] + '@' + now) != null; });
    var first = was0 == null || (was === 'me' && p && p.parent && !waiting);
    if (first) {
      if (was === 'me' && load('lt_kh_me') != null && load('lt_kh_' + now) == null) store('lt_kh_' + now, load('lt_kh_me'));
      var d = dirty(); Object.keys(KINDS).forEach(function (k) { if (load(KINDS[k]) != null) d[k] = 1; }); setDirty(d);
    } else {
      Object.keys(KINDS).forEach(function (k) {
        var key = KINDS[k];
        store(key + '@' + was, load(key));
        store(key, load(key + '@' + now));
        store(key + '@' + now, null);
      });
      setDirty({});
    }
    store('lt_sync_owner', now);
    changed();
    if (window.LtPush && window.LtPush.sync) window.LtPush.sync();
    return pull();
  }

  // merging: bookmarks are joined (this device's order first); reminders by id (this device's when it changed here)
  function merge(kind, mine, theirs, mineChanged) {
    if (kind === 'marks') {
      var out = (mine || []).slice();
      (theirs || []).forEach(function (x) { if (out.indexOf(x) < 0) out.push(x); });
      return out.slice(0, 50);
    }
    if (!mine) return theirs;
    if (!theirs) return mine;
    var by = {}, ord = [];
    (mineChanged ? [theirs, mine] : [mine, theirs]).forEach(function (l) {
      l.forEach(function (r) { if (!by[r.id]) ord.push(r.id); by[r.id] = r; });
    });
    return ord.map(function (id) { return by[id]; });
  }

  function pull() {
    var pid = who(); if (pid === 'me') return Promise.resolve();
    return fam().then(function (F) { return F.ready(); }).then(function (c) {
      if (!c) return;
      return c.from('profile_data').select('key,data').eq('profile_id', pid).then(function (r) {
        if (r.error || who() !== pid) return;
        var rows = {}, d = dirty(), send = false, ch = false;
        (r.data || []).forEach(function (x) { rows[x.key] = x.data; });
        Object.keys(KINDS).forEach(function (k) {
          var key = KINDS[k], mine = null;
          try { mine = JSON.parse(load(key) || 'null'); } catch (e) {}
          if (!(k in rows)) { if (mine) { d[k] = 1; send = true; } return; }
          var m = merge(k, mine, rows[k], !!d[k]);
          if (JSON.stringify(m) !== JSON.stringify(mine)) { store(key, JSON.stringify(m)); ch = true; }
          if (JSON.stringify(m) !== JSON.stringify(rows[k])) { d[k] = 1; send = true; } else delete d[k];
        });
        setDirty(d);
        if (ch) { changed(); if (window.LtPush && window.LtPush.sync) window.LtPush.sync(); }
        if (send) push();
      });
    }).catch(function () {});
  }

  var t = null;
  function push() {
    t = null;
    var pid = who(), d = dirty(); if (pid === 'me' || !Object.keys(d).length) return;
    fam().then(function (F) { return F.ready(); }).then(function (c) {
      if (!c) return;
      Object.keys(d).forEach(function (k) {
        var v = null; try { v = JSON.parse(load(KINDS[k]) || 'null'); } catch (e) {}
        if (v == null) return;
        c.from('profile_data').upsert({ profile_id: pid, key: k, data: v, updated_at: new Date().toISOString() }).then(function (r) {
          if (!r.error && who() === pid) { var d2 = dirty(); delete d2[k]; setDirty(d2); }
        });
      });
    }).catch(function () {});
  }
  function touch(kind) {
    if (!KINDS[kind]) return;
    var d = dirty(); d[kind] = 1; setDirty(d);
    if (who() !== 'me' && !t) t = setTimeout(push, 2000);
  }

  window.LtSync = { touch: touch, pull: pull, switched: switched };
  window.addEventListener('lt-profile', function () { switched(); });
  if (signedIn()) setTimeout(switched, 1500);
})();
