/* Reminders of the Mushaf (besides the khatmas' own): the daily wird, Surat al-Kahf on Friday, a time to memorize,
   a time to review, and the reader's own. Kept on this device (localStorage lt_reminders); sent with the khatmas'
   reminders to the push function (js/push.js → supabase/functions/push), which sends each at its time.

   LtRemind.items()          the reminders that are on, in the push function's form
   LtRemind.ui(el, o)        the page in the Mushaf's settings: o = {lang, show(page)}
   A reminder: {id, kind: wird|kahf|hifz|review|custom, title, time 'HH:MM', days (bit0 = Sunday), on, surah} */
(function () {
  var KEY = 'lt_reminders';
  var load = function () { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; } };
  var save = function (l) { try { localStorage.setItem(KEY, JSON.stringify(l)); } catch (e) {} };
  // the suggested ones, all off until the reader turns one on
  var PRESET = [
    { id: 'wird', kind: 'wird', time: '20:00', days: 127, on: false },
    { id: 'kahf', kind: 'kahf', time: '13:00', days: 32, on: false, surah: 18 },
    { id: 'hifz', kind: 'hifz', time: '17:00', days: 127, on: false },
    { id: 'review', kind: 'review', time: '05:30', days: 127, on: false }
  ];
  function list() {
    var l = load();
    if (!Array.isArray(l)) { l = PRESET.map(function (x) { return Object.assign({}, x); }); save(l); }
    return l;
  }
  // where a reminder opens the Mushaf
  var KAHF_PAGE = 293;
  function url(r) {
    if (r.kind === 'kahf') return '/book/#p=' + KAHF_PAGE;
    if (r.kind === 'hifz') return '/book/?m=hifz';
    if (r.kind === 'review') return '/book/?m=tasmee';
    return '/book/';
  }
  function items() {
    return list().filter(function (r) { return r.on; }).map(function (r) {
      return { id: 'r-' + r.id, kind: r.kind, name: r.kind === 'custom' ? (r.title || '') : '', time: r.time, days: r.days || 127, url: url(r) };
    });
  }

  var T = {
    ar: { wird: 'الورد اليومي', kahf: 'سورة الكهف', hifz: 'وقت الحفظ', review: 'وقت المراجعة', custom: 'تذكير',
      sug: 'تذكيرات مقترحة', mine: 'تذكيراتي', add: 'تذكير جديد', title: 'العنوان', time: 'الوقت', days: 'الأيام', del: 'حذف', every: 'كل يوم',
      enable: 'تفعيل الإشعارات', wd: ['أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'] },
    en: { wird: 'Daily wird', kahf: 'Surat al-Kahf', hifz: 'Time to memorize', review: 'Time to review', custom: 'Reminder',
      sug: 'Suggested reminders', mine: 'My reminders', add: 'New reminder', title: 'Title', time: 'Time', days: 'Days', del: 'Delete', every: 'Every day',
      enable: 'Turn on notifications', wd: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] },
    ur: { wird: 'روزانہ ورد', kahf: 'سورۃ الکہف', hifz: 'حفظ کا وقت', review: 'دہرائی کا وقت', custom: 'یاد دہانی',
      sug: 'تجویز کردہ یاد دہانیاں', mine: 'میری یاد دہانیاں', add: 'نئی یاد دہانی', title: 'عنوان', time: 'وقت', days: 'دن', del: 'حذف', every: 'ہر روز',
      enable: 'اطلاعات فعال کریں', wd: ['اتوار', 'پیر', 'منگل', 'بدھ', 'جمعرات', 'جمعہ', 'ہفتہ'] },
    fr: { wird: 'Wird quotidien', kahf: 'Sourate al-Kahf', hifz: 'Temps de mémorisation', review: 'Temps de révision', custom: 'Rappel',
      sug: 'Rappels suggérés', mine: 'Mes rappels', add: 'Nouveau rappel', title: 'Titre', time: 'Heure', days: 'Jours', del: 'Supprimer', every: 'Chaque jour',
      enable: 'Activer les notifications', wd: ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'] },
    es: { wird: 'Wird diario', kahf: 'Sura al-Kahf', hifz: 'Hora de memorizar', review: 'Hora de repasar', custom: 'Recordatorio',
      sug: 'Recordatorios sugeridos', mine: 'Mis recordatorios', add: 'Nuevo recordatorio', title: 'Título', time: 'Hora', days: 'Días', del: 'Eliminar', every: 'Cada día',
      enable: 'Activar notificaciones', wd: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'] },
    ru: { wird: 'Ежедневный вирд', kahf: 'Сура аль-Кахф', hifz: 'Время заучивания', review: 'Время повторения', custom: 'Напоминание',
      sug: 'Предлагаемые напоминания', mine: 'Мои напоминания', add: 'Новое напоминание', title: 'Название', time: 'Время', days: 'Дни', del: 'Удалить', every: 'Каждый день',
      enable: 'Включить уведомления', wd: ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'] }
  };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };

  function ui(el, o) {
    var lang = (o && o.lang) || 'ar', t = T[lang] || T.en, P = window.LtPush, open = null;
    var name = function (r) { return r.kind === 'custom' ? (r.title || t.custom) : t[r.kind]; };
    var daysTxt = function (d) {
      if ((d & 127) === 127) return t.every;
      return t.wd.filter(function (x, i) { return (d >> i) & 1; }).join('، ');
    };
    var sync = function () { if (P && Notification && Notification.permission === 'granted') P.sync(); };
    var draw = function () {
      var l = list(), sug = l.filter(function (r) { return r.kind !== 'custom'; }), mine = l.filter(function (r) { return r.kind === 'custom'; });
      var row = function (r) {
        var h = '<div class="rm-row' + (open === r.id ? ' open' : '') + '" data-id="' + esc(r.id) + '"><button type="button" class="rm-main"><b>' + esc(name(r)) + '</b><small>' +
          esc(r.time) + ' · ' + esc(daysTxt(r.days || 127)) + '</small></button>' +
          '<button type="button" class="rm-sw' + (r.on ? ' on' : '') + '" role="switch" aria-checked="' + (r.on ? 'true' : 'false') + '" aria-label="' + esc(name(r)) + '"></button></div>';
        if (open === r.id) {
          h += '<div class="rm-ed" data-id="' + esc(r.id) + '">' +
            (r.kind === 'custom' ? '<label><span>' + esc(t.title) + '</span><input type="text" class="rm-title" maxlength="50" value="' + esc(r.title || '') + '" placeholder="' + esc(t.custom) + '"></label>' : '') +
            '<label><span>' + esc(t.time) + '</span><input type="time" class="rm-time" value="' + esc(r.time) + '"></label>' +
            '<div class="rm-days"><span>' + esc(t.days) + '</span><div>' + t.wd.map(function (w, i) {
              return '<button type="button" data-d="' + i + '" class="' + (((r.days || 127) >> i) & 1 ? 'on' : '') + '">' + esc(w) + '</button>'; }).join('') + '</div></div>' +
            (r.kind === 'custom' ? '<button type="button" class="rm-del">' + esc(t.del) + '</button>' : '') + '</div>';
        }
        return h;
      };
      var hint = P ? P.hint(lang) : '', granted = window.Notification && Notification.permission === 'granted';
      el.innerHTML = '<div class="rm-note">' + esc(hint) + (P && !granted && P.ok() && !(P.ios && !P.standalone) ? ' <button type="button" class="rm-en">' + esc(t.enable) + '</button>' : '') + '</div>' +
        '<h4 class="rm-h">' + esc(t.sug) + '</h4><div class="rm-card">' + sug.map(row).join('') + '</div>' +
        '<h4 class="rm-h">' + esc(t.mine) + '</h4><div class="rm-card">' + mine.map(row).join('') + '<button type="button" class="rm-add">' + esc(t.add) + '</button></div>';
    };
    var upd = function (id, fn) { var l = list(); l.forEach(function (r) { if (r.id === id) fn(r); }); save(l); };
    el.onclick = function (e) {
      var b = e.target.closest('button'); if (!b) return;
      var rw = b.closest('[data-id]'), id = rw && rw.dataset.id;
      if (b.classList.contains('rm-en')) { if (P) P.enable(lang).then(draw); return; }
      if (b.classList.contains('rm-add')) {
        var l = list(), nid = 'c' + Date.now().toString(36);
        l.push({ id: nid, kind: 'custom', title: '', time: '21:00', days: 127, on: true }); save(l); open = nid; draw();
        if (P) P.enable(lang).then(function () { sync(); draw(); });
        return;
      }
      if (b.classList.contains('rm-sw')) {
        var on = !b.classList.contains('on');
        upd(id, function (r) { r.on = on; }); draw();
        if (on && P && !(window.Notification && Notification.permission === 'granted')) P.enable(lang).then(function () { sync(); draw(); });
        else sync();
        return;
      }
      if (b.classList.contains('rm-main')) { open = open === id ? null : id; draw(); return; }
      if (b.dataset.d != null) { var d = +b.dataset.d; upd(id, function (r) { var v = (r.days || 127) ^ (1 << d); r.days = v || (1 << d); }); draw(); sync(); return; }
      if (b.classList.contains('rm-del')) { save(list().filter(function (r) { return r.id !== id; })); open = null; draw(); sync(); return; }
    };
    el.onchange = function (e) {
      var ed = e.target.closest('.rm-ed'); if (!ed) return;
      var id = ed.dataset.id;
      if (e.target.classList.contains('rm-time') && /^\d\d:\d\d$/.test(e.target.value)) upd(id, function (r) { r.time = e.target.value; });
      if (e.target.classList.contains('rm-title')) upd(id, function (r) { r.title = e.target.value.trim().slice(0, 50); });
      draw(); sync();
    };
    draw();
  }
  window.LtRemind = { items: items, list: list, ui: ui };
})();
