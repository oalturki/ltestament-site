/* Student record (سجل الطالب): the family account and its profiles, shared by the account page and the Mushaf.
   Supabase (project "ltestament"): auth by email; tables family_profiles, recite_sessions, page_state,
   recite_mistakes, each row kept to its own account by row level security (supabase/migrations/student_record_phase1.sql).
   The current profile on this device is kept in localStorage (lt_profile: {id, name, avatar, color, parent}).

   Fam.ready() -> Promise<client|null>      the Supabase client, loaded on demand (null if no session on this device)
   Fam.client() -> Promise<client>          the client, loaded on demand, signed in or not
   Fam.current() -> profile|null            the profile in use on this device
   Fam.use(profile)                         make a profile the current one
   Fam.profiles() -> Promise<[profile]>     the account's profiles (the parent's first)
   Fam.recital({page, words, total, mistakes, seconds, complete, locs, kinds}) -> Promise<page_state>
   Fam.practice({kind, surah, from, to, pages, seconds})
   Fam.lastPage(page)                       remember where the current profile is (debounced)
   Fam.signedIn() -> bool                   a session is stored on this device (no network) */
(function () {
  var URL = 'https://nikwwjswwlwcqekbnpzq.supabase.co';
  var KEY = 'sb_publishable_k8fRjG4b4EMj5TH9yXR3qQ_w-fqi76l';   // publishable key: permissions are enforced by database rules
  var LIB = '/js/vendor/supabase-2.119.0.js';
  var AUTH_KEY = 'sb-nikwwjswwlwcqekbnpzq-auth-token';
  var AVATARS = { star: '⭐', moon: '🌙', palm: '🌴', camel: '🐪', lion: '🦁', turtle: '🐢', tulip: '🌷', blossom: '🌸',
                  clover: '🍀', book: '📘', mosque: '🕌', sun: '☀️', rose: '🌹', bird: '🕊️', tree: '🌳', gem: '💎' };
  var load = function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } };
  var store = function (k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} };

  var libP = null, sb = null;
  function client() {
    if (sb) return Promise.resolve(sb);
    if (!libP) libP = new Promise(function (ok, bad) {
      if (window.supabase && window.supabase.createClient) return ok();
      var s = document.createElement('script'); s.src = LIB; s.onload = ok; s.onerror = bad; document.head.appendChild(s);
    });
    return libP.then(function () {
      sb = sb || window.supabase.createClient(URL, KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
      return sb;
    });
  }
  function signedIn() { return !!load(AUTH_KEY); }
  function ready() {
    if (!signedIn()) return Promise.resolve(null);
    return client().then(function (c) { return c.auth.getSession().then(function (r) { return r.data.session ? c : null; }); });
  }
  function current() { try { return JSON.parse(load('lt_profile') || 'null'); } catch (e) { return null; } }
  function use(p) {
    store('lt_profile', p ? JSON.stringify({ id: p.id, name: p.name, avatar: p.avatar, color: p.color || null, parent: !!p.is_parent }) : null);
    try { window.dispatchEvent(new CustomEvent('lt-profile', { detail: current() })); } catch (e) {}
  }
  function profiles() {
    return ready().then(function (c) {
      if (!c) return [];
      return c.from('family_profiles').select('*').order('is_parent', { ascending: false }).order('created_at').then(function (r) {
        if (r.error) throw r.error;
        return r.data || [];
      });
    });
  }
  // the account's own profile for the parent, made on first sign-in
  function ensureParent(name) {
    return profiles().then(function (list) {
      if (list.some(function (p) { return p.is_parent; })) return list;
      return client().then(function (c) {
        return c.from('family_profiles').insert({ name: (name || '—').slice(0, 20), avatar: 'book', is_parent: true }).select().then(function (r) {
          if (r.error) throw r.error;
          return [r.data[0]].concat(list);
        });
      });
    });
  }
  function rpc(fn, args) {
    return ready().then(function (c) {
      if (!c) return null;
      return c.rpc(fn, args).then(function (r) { if (r.error) throw r.error; return r.data; });
    });
  }
  function recital(o) {
    var p = current(); if (!p) return Promise.resolve(null);
    return rpc('record_recital', {
      p_profile: p.id, p_page: o.page, p_words: o.words | 0, p_total: o.total | 0, p_mistakes: o.mistakes | 0,
      p_seconds: Math.min(86400, Math.round(o.seconds || 0)), p_complete: !!o.complete,
      p_locs: (o.locs || []).slice(0, 200), p_kinds: (o.kinds || []).slice(0, 200)
    });
  }
  function practice(o) {
    var p = current(); if (!p) return Promise.resolve(null);
    return rpc('record_practice', {
      p_profile: p.id, p_kind: o.kind, p_surah: o.surah, p_from: o.from, p_to: o.to,
      p_pages: o.pages, p_seconds: Math.min(86400, Math.round(o.seconds || 0))
    });
  }
  var lpT = 0;
  function lastPage(page) {
    var p = current(); if (!p || !signedIn()) return;
    clearTimeout(lpT);
    lpT = setTimeout(function () {
      ready().then(function (c) { if (c) c.from('family_profiles').update({ last_page: page }).eq('id', p.id).then(function () {}); });
    }, 4000);
  }
  // a short PIN on the parent's profile, kept on this device only (switching on a shared family device)
  function pinSet() { return !!load('lt_pin'); }
  function pinHash(pin) {
    var enc = new TextEncoder().encode('lt-pin:' + pin);
    return crypto.subtle.digest('SHA-256', enc).then(function (b) { return Array.from(new Uint8Array(b)).map(function (x) { return ('0' + x.toString(16)).slice(-2); }).join(''); });
  }
  function pinSave(pin) { if (!pin) { store('lt_pin', null); return Promise.resolve(); } return pinHash(pin).then(function (h) { store('lt_pin', h); }); }
  function pinCheck(pin) { var h0 = load('lt_pin'); if (!h0) return Promise.resolve(true); return pinHash(pin).then(function (h) { return h === h0; }); }

  window.Fam = {
    client: client, ready: ready, signedIn: signedIn, current: current, use: use, profiles: profiles, ensureParent: ensureParent,
    recital: recital, practice: practice, lastPage: lastPage, avatars: AVATARS,
    avatar: function (k) { return AVATARS[k] || AVATARS.star; },
    pinSet: pinSet, pinSave: pinSave, pinCheck: pinCheck,
    signOut: function () { return client().then(function (c) { return c.auth.signOut(); }).then(function () { use(null); }); }
  };
})();
