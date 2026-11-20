/* Phone notifications for khatma reminders (Web Push): the service worker /sw.js shows them, the edge function
   supabase/functions/push keeps each device's reminders and sends them at their time.
   iPhone: notifications work only from the site added to the home screen (Share → Add to Home Screen) and opened
   from its icon; LtPush.hint() says so where it is needed.

   LtPush.ok()            this browser can receive them now
   LtPush.hint(lang)      what the reader needs to know (or do) before they can come
   LtPush.enable(lang)    ask for permission (from a tap), subscribe, and send the reminders -> Promise
   LtPush.sync()          send the reminders again (after a khatma changes); quiet if not subscribed */
(function () {
  var FN = 'https://nikwwjswwlwcqekbnpzq.supabase.co/functions/v1/push', KEY = 'sb_publishable_k8fRjG4b4EMj5TH9yXR3qQ_w-fqi76l';
  var call = function (o) {
    return fetch(FN, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: KEY }, body: JSON.stringify(o) })
      .then(function (r) { return r.json(); });
  };
  var ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
  var standalone = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  function ok() { return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window; }
  var H = {
    ar: { ios: 'لتصلك التذكيرات على الآيفون: افتح الموقع في Safari، ثم زر المشاركة ← «إضافة إلى الشاشة الرئيسية»، ثم افتح المصحف من أيقونته وفعّل التذكير من هناك.',
      ask: 'سيطلب منك الجوال الإذن بالإشعارات.', denied: 'الإشعارات ممنوعة لهذا الموقع في إعدادات الجوال أو المتصفح؛ اسمح بها ثم فعّل التذكير.', on: 'التذكير مفعّل على هذا الجهاز.', no: 'هذا المتصفح لا يدعم الإشعارات.' },
    en: { ios: 'For reminders on iPhone: open the site in Safari, tap Share → “Add to Home Screen”, open the Mushaf from its icon and turn the reminder on there.',
      ask: 'Your phone will ask to allow notifications.', denied: 'Notifications are blocked for this site; allow them in the settings, then turn the reminder on.', on: 'Reminders are on for this device.', no: 'This browser does not support notifications.' }
  };
  function hint(lang) {
    var h = H[lang] || H.en;
    if (ios && !standalone) return h.ios;
    if (!ok()) return h.no;
    if (Notification.permission === 'denied') return h.denied;
    if (Notification.permission === 'granted') return h.on;
    return h.ask;
  }
  function b64(s) {
    var p = '='.repeat((4 - s.length % 4) % 4), b = atob((s + p).replace(/-/g, '+').replace(/_/g, '/')), a = new Uint8Array(b.length);
    for (var i = 0; i < b.length; i++) a[i] = b.charCodeAt(i);
    return a;
  }
  function reg() { return navigator.serviceWorker.register('/sw.js', { scope: '/' }).then(function () { return navigator.serviceWorker.ready; }); }
  // the khatmas' reminders on this device
  function reminders() {
    var K = window.Khatma; if (!K) return [];
    return K.list().filter(function (k) { return k.remind && k.remind.on && !k.fin; }).map(function (k) {
      var sl = K.slots(k);
      return { id: k.id, name: k.name, time: k.remind.time, days: k.rdays, start: k.start, end: sl[sl.length - 1] };
    });
  }
  var lang0 = 'ar';
  function send(sub) {
    var tz = 'Asia/Riyadh'; try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || tz; } catch (e) {}
    return call({ action: 'save', sub: sub.toJSON(), tz: tz, lang: lang0, reminders: reminders() });
  }
  function enable(lang) {
    lang0 = lang || lang0;
    if (!ok() || (ios && !standalone)) return Promise.resolve(false);
    return Notification.requestPermission().then(function (p) {
      if (p !== 'granted') return false;
      return reg().then(function (r) {
        return r.pushManager.getSubscription().then(function (s) {
          if (s) return s;
          return call({ action: 'key' }).then(function (k) { return r.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(k.key) }); });
        });
      }).then(send).then(function () { return true; });
    }).catch(function () { return false; });
  }
  function sync() {
    if (!ok() || Notification.permission !== 'granted') return Promise.resolve(false);
    return navigator.serviceWorker.getRegistration('/').then(function (r) {
      if (!r) return false;
      return r.pushManager.getSubscription().then(function (s) { return s ? send(s) : false; });
    }).catch(function () { return false; });
  }
  window.LtPush = { ok: ok, hint: hint, enable: enable, sync: sync, standalone: standalone, ios: ios };
  // the service worker is registered on every visit (it caches nothing), so the app installs cleanly
  if ('serviceWorker' in navigator) { try { navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(function () {}); } catch (e) {} }
})();
