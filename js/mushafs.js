/* «مصاحفي»: the reader's own Mushafs — the same Mushaf, each with its own place and settings (the owner, Nov 28 2026:
   «هو نفس المصحف ولكن هي تحميل للإعدادات فقط»). The general one (المصحف العام) is the Mushaf as it always was; besides
   it the khatma's, the memorizing and the reviewing ones, and any he names himself.
   Each keeps where he stopped (saved as he turns the pages — he forgets to mark it, in the mosque), its mode (reading,
   memorizing, reciting, silent), what is shown (the Mushaf, tajweed, a tafsir), the reciter and the listening and
   reciting choices. The look of the Mushaf (frame, font weight, night, language) stays the same in all of them.
   The khatma's shows today's wird of his khatma; the memorizing and reviewing ones follow a plan of his (خططي) and
   show its wird; the reviewing one tests him in its plan's range (الاختبارات).

   Kept per profile: lt_mushafs (synced to the account by js/sync.js as 'mushafs'), the one in use lt_mus_active
   (this device). The one in use holds its settings in the usual keys; the others hold theirs in m.s.
   Switching: the settings are exchanged and the Mushaf opens again at the other's page.

   LtMushafs.boot()                after the Mushaf is built: opens in the mode of the one in use
   LtMushafs.ui(el, o)             the settings page (o: {lang, openSec(k), close()})
   LtMushafs.list() / .active() / .name(m, lang) / .switchTo(id) / .strip(lang) -> {h, v, page} | null */
(function () {
  if (window.LtMushafs) return;
  var LIST = 'lt_mushafs', ACT = 'lt_mus_active';
  var KEYS = ['lt_book_page', 'lt_book_rec', 'lt_book_tajweed', 'lt_book_tr', 'lt_book_show', 'lt_rec_rep', 'lt_live_err', 'lt_live_level', 'lt_sil_pace', 'lt_sil_speed'];
  var load = function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } };
  var store = function (k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} };
  var sGet = function (k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } };
  var sSet = function (k, v) { try { if (v == null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, v); } catch (e) {} };
  var B = function () { return window.__ltBook || {}; };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var AR = '٠١٢٣٤٥٦٧٨٩';
  var num = function (n, lang) { return lang === 'ar' || lang === 'ur' ? String(n).replace(/\d/g, function (d) { return AR[d]; }) : String(n); };

  var T = {
    ar: { title: 'مصاحفي', kinds: { g: 'المصحف العام', khatma: 'مصحف الختمة', hifz: 'مصحف الحفظ', review: 'مصحف المراجعة', custom: 'مصحف' },
          kindsS: { g: 'عام', khatma: 'ختمة', hifz: 'حفظ', review: 'مراجعة' },
          modes: { read: 'تلاوة', hifz: 'تحفيظ', tasmee: 'تسميع', silent: 'تسميع صامت' },
          note: 'هو المصحف نفسه، ولكلٍّ منها موضعُه وإعداداته: يُحفظ موضعك فيه وأنت تقلّب الصفحات، ويفتح على وضعه وقارئه وطريقة عرضه.',
          inUse: 'المفتوح الآن', open: 'افتح', page: 'ص', mode: 'الوضع', edit: 'تعديل', del: 'حذف', delAsk: 'حذف هذا المصحف؟ لا يمسّ ذلك ختماتك ولا خططك.',
          yes: 'نعم، احذف', no: 'إلغاء', save: 'حفظ', name: 'الاسم', kind: 'النوع', add: 'مصحف جديد', addB: 'إضافة', nameReq: 'اكتب اسمًا للمصحف.',
          plan: 'الخطة', noPlan: 'بلا خطة', plansB: 'خططي', khB: 'ختماتي', goWird: 'اذهب إلى الورد', test: 'اختبر نفسي في نطاق الخطة',
          noKh: 'لا ختمة جارية. ابدأ ختمة من «ختماتي» فيظهر وردها هنا.', noPl: 'اربطه بخطة من «خططي» فيظهر وردها هنا وعلى الصفحة.', noPlans: 'لا خطط بعد.',
          newPl: 'إنشاء خطة', today: 'ورد اليوم', back: 'العودة إلى المصحف العام', manage: 'إدارة مصاحفي' },
    en: { title: 'My Mushafs', kinds: { g: 'General Mushaf', khatma: 'Khatma Mushaf', hifz: 'Memorization Mushaf', review: 'Review Mushaf', custom: 'Mushaf' },
          kindsS: { g: 'General', khatma: 'Khatma', hifz: 'Memorize', review: 'Review' },
          modes: { read: 'Reading', hifz: 'Memorizing', tasmee: 'Reciting', silent: 'Silent recitation' },
          note: 'The same Mushaf, each with its own place and settings: your place is kept as you turn the pages, and it opens in its own mode, reciter and view.',
          inUse: 'Open now', open: 'Open', page: 'p.', mode: 'Mode', edit: 'Edit', del: 'Delete', delAsk: 'Delete this Mushaf? Your khatmas and plans stay.',
          yes: 'Yes, delete', no: 'Cancel', save: 'Save', name: 'Name', kind: 'Type', add: 'New Mushaf', addB: 'Add', nameReq: 'Write a name for the Mushaf.',
          plan: 'Plan', noPlan: 'No plan', plansB: 'My plans', khB: 'My khatmas', goWird: 'Go to the wird', test: 'Test myself in the plan’s range',
          noKh: 'No khatma under way. Start one in «My khatmas» and its wird shows here.', noPl: 'Link it to a plan from «My plans» and its wird shows here and on the page.', noPlans: 'No plans yet.',
          newPl: 'Make a plan', today: 'Today', back: 'Back to the General Mushaf', manage: 'Manage my Mushafs' },
    ur: { title: 'میرے مصاحف', kinds: { g: 'عام مصحف', khatma: 'ختم کا مصحف', hifz: 'حفظ کا مصحف', review: 'دہرائی کا مصحف', custom: 'مصحف' },
          kindsS: { g: 'عام', khatma: 'ختم', hifz: 'حفظ', review: 'دہرائی' },
          modes: { read: 'تلاوت', hifz: 'حفظ', tasmee: 'تسمیع', silent: 'خاموش تسمیع' },
          note: 'ایک ہی مصحف، ہر ایک کی اپنی جگہ اور ترتیبات: صفحے پلٹتے ہوئے آپ کی جگہ محفوظ ہوتی ہے۔',
          inUse: 'ابھی کھلا ہے', open: 'کھولیں', page: 'ص', mode: 'انداز', edit: 'ترمیم', del: 'حذف', delAsk: 'یہ مصحف حذف کریں؟ آپ کے ختم اور منصوبے باقی رہیں گے۔',
          yes: 'ہاں، حذف کریں', no: 'منسوخ', save: 'محفوظ کریں', name: 'نام', kind: 'قسم', add: 'نیا مصحف', addB: 'شامل کریں', nameReq: 'مصحف کا نام لکھیں۔',
          plan: 'منصوبہ', noPlan: 'کوئی منصوبہ نہیں', plansB: 'میرے منصوبے', khB: 'میرے ختم', goWird: 'ورد پر جائیں', test: 'منصوبے کے حصے میں اپنا امتحان',
          noKh: 'کوئی ختم جاری نہیں۔', noPl: 'اسے «میرے منصوبے» سے کسی منصوبے سے جوڑیں۔', noPlans: 'ابھی کوئی منصوبہ نہیں۔',
          newPl: 'منصوبہ بنائیں', today: 'آج', back: 'عام مصحف پر واپس', manage: 'میرے مصاحف' },
    fr: { title: 'Mes Mushafs', kinds: { g: 'Mushaf général', khatma: 'Mushaf de khatma', hifz: 'Mushaf de mémorisation', review: 'Mushaf de révision', custom: 'Mushaf' },
          kindsS: { g: 'Général', khatma: 'Khatma', hifz: 'Mémoriser', review: 'Réviser' },
          modes: { read: 'Lecture', hifz: 'Mémorisation', tasmee: 'Récitation', silent: 'Récitation silencieuse' },
          note: 'Le même Mushaf, chacun avec sa place et ses réglages : votre place est gardée en tournant les pages.',
          inUse: 'Ouvert', open: 'Ouvrir', page: 'p.', mode: 'Mode', edit: 'Modifier', del: 'Supprimer', delAsk: 'Supprimer ce Mushaf ? Vos khatmas et plans restent.',
          yes: 'Oui, supprimer', no: 'Annuler', save: 'Enregistrer', name: 'Nom', kind: 'Type', add: 'Nouveau Mushaf', addB: 'Ajouter', nameReq: 'Écrivez un nom.',
          plan: 'Plan', noPlan: 'Aucun plan', plansB: 'Mes plans', khB: 'Mes khatmas', goWird: 'Aller au wird', test: 'Me tester sur le plan',
          noKh: 'Aucune khatma en cours.', noPl: 'Liez-le à un plan de «Mes plans».', noPlans: 'Aucun plan.',
          newPl: 'Créer un plan', today: 'Aujourd’hui', back: 'Revenir au Mushaf général', manage: 'Gérer mes Mushafs' },
    es: { title: 'Mis Mushafs', kinds: { g: 'Mushaf general', khatma: 'Mushaf de jatma', hifz: 'Mushaf de memorización', review: 'Mushaf de repaso', custom: 'Mushaf' },
          kindsS: { g: 'General', khatma: 'Jatma', hifz: 'Memorizar', review: 'Repasar' },
          modes: { read: 'Lectura', hifz: 'Memorizar', tasmee: 'Recitar', silent: 'Recitación en silencio' },
          note: 'El mismo Mushaf, cada uno con su lugar y sus ajustes: su lugar se guarda al pasar las páginas.',
          inUse: 'Abierto', open: 'Abrir', page: 'p.', mode: 'Modo', edit: 'Editar', del: 'Borrar', delAsk: '¿Borrar este Mushaf? Sus jatmas y planes se quedan.',
          yes: 'Sí, borrar', no: 'Cancelar', save: 'Guardar', name: 'Nombre', kind: 'Tipo', add: 'Nuevo Mushaf', addB: 'Añadir', nameReq: 'Escriba un nombre.',
          plan: 'Plan', noPlan: 'Sin plan', plansB: 'Mis planes', khB: 'Mis jatmas', goWird: 'Ir al wird', test: 'Ponerme a prueba en el plan',
          noKh: 'Ninguna jatma en curso.', noPl: 'Vincúlelo a un plan de «Mis planes».', noPlans: 'Aún no hay planes.',
          newPl: 'Crear un plan', today: 'Hoy', back: 'Volver al Mushaf general', manage: 'Gestionar mis Mushafs' },
    ru: { title: 'Мои мусхафы', kinds: { g: 'Общий мусхаф', khatma: 'Мусхаф хатмы', hifz: 'Мусхаф заучивания', review: 'Мусхаф повторения', custom: 'Мусхаф' },
          kindsS: { g: 'Общий', khatma: 'Хатма', hifz: 'Заучивание', review: 'Повторение' },
          modes: { read: 'Чтение', hifz: 'Заучивание', tasmee: 'Чтение наизусть', silent: 'Беззвучная проверка' },
          note: 'Тот же мусхаф, у каждого своё место и настройки: место сохраняется при листании.',
          inUse: 'Открыт', open: 'Открыть', page: 'с.', mode: 'Режим', edit: 'Изменить', del: 'Удалить', delAsk: 'Удалить этот мусхаф? Хатмы и планы останутся.',
          yes: 'Да, удалить', no: 'Отмена', save: 'Сохранить', name: 'Название', kind: 'Тип', add: 'Новый мусхаф', addB: 'Добавить', nameReq: 'Напишите название.',
          plan: 'План', noPlan: 'Без плана', plansB: 'Мои планы', khB: 'Мои хатмы', goWird: 'К вирду', test: 'Проверить себя по плану',
          noKh: 'Нет текущей хатмы.', noPl: 'Свяжите его с планом из «Мои планы».', noPlans: 'Планов пока нет.',
          newPl: 'Создать план', today: 'Сегодня', back: 'Вернуться к общему мусхафу', manage: 'Мои мусхафы' }
  };
  var L = function (lang) { return T[lang] || T.en; };
  var MODE0 = { g: 'read', khatma: 'read', hifz: 'hifz', review: 'tasmee', custom: 'read' };

  var all = function () {
    var ls = null; try { ls = JSON.parse(load(LIST) || 'null'); } catch (e) {}
    if (!ls || !ls.length) ls = [{ id: 'g', kind: 'g' }, { id: 'k', kind: 'khatma' }, { id: 'h', kind: 'hifz' }, { id: 'r', kind: 'review' }];
    if (!ls.some(function (m) { return m.id === 'g'; })) ls.unshift({ id: 'g', kind: 'g' });
    return ls;
  };
  var list = function () { return all().filter(function (m) { return !m.deleted; }); };
  var keep = function (ls) { store(LIST, JSON.stringify(ls)); if (window.LtSync) window.LtSync.touch('mushafs'); };
  var activeId = function () { var a = load(ACT) || 'g'; return list().some(function (m) { return m.id === a; }) ? a : 'g'; };
  var active = function () { var a = activeId(); return list().filter(function (m) { return m.id === a; })[0]; };
  var name = function (m, lang) { return m.name || L(lang).kinds[m.kind] || L(lang).kinds.custom; };
  var modeOf = function (m) { return m.mode || MODE0[m.kind] || 'read'; };

  // the one in use, as it is now: its page, mode and settings
  function snap(m) {
    var b = B(); m.s = {}; KEYS.forEach(function (k) { m.s[k] = load(k); });
    m.artr = sGet('lt_book_artr');
    if (b.cur) m.page = b.cur();
    if (b.mode && m.id !== 'g') m.mode = b.mode();
    m.t = Date.now();
    return m;
  }
  function put(m) {
    var ls = all(), i = -1; ls.forEach(function (x, j) { if (x.id === m.id) i = j; });
    if (i >= 0) ls[i] = m; else ls.push(m);
    keep(ls); return m;
  }
  var leaving = false;   // switching: the page reloads for the other one — nothing more is saved here
  function saveActive() { if (leaving) return; var a = active(); if (a) put(snap(a)); }

  function switchTo(id) {
    var from = active(), to = list().filter(function (m) { return m.id === id; })[0];
    if (!to || !from) return;
    if (to.id === from.id) return;
    put(snap(from));
    // a Mushaf not opened before starts with the settings in use, at its kind's mode
    if (to.s) KEYS.forEach(function (k) { store(k, to.s[k]); });
    sSet('lt_book_artr', to.s ? to.artr : sGet('lt_book_artr'));
    var pg = to.page || (B().cur ? B().cur() : 1);
    if (!to.page && to.kind === 'khatma' && window.Khatma) { var kt = window.Khatma.stripText('ar'); if (kt && kt.page) pg = kt.page; }
    if (!to.page && to.plan && window.LtPlans) { var w = window.LtPlans.wird(to.plan, 'ar'); if (w && w.page) pg = w.page; }
    store('lt_book_page', String(pg));
    leaving = true;
    store(ACT, to.id);
    sSet('lt_mus_go', '1');
    history.replaceState(null, '', location.pathname + location.search.replace(/[?&]s=\w+/, '') + '#p=' + pg);
    setTimeout(function () { location.reload(); }, 60);
  }

  // the line on the page: the wird of the khatma or of the plan this Mushaf follows
  function strip(lang) {
    var a = active(); if (!a || a.id === 'g') return null;
    if ((a.kind === 'hifz' || a.kind === 'review' || a.plan) && a.plan && window.LtPlans) {
      var w = window.LtPlans.wird(a.plan, lang); if (w && !w.fin && w.v) return { h: w.h, v: w.v, page: w.page, plan: 1 };
    }
    return null;
  }

  function boot() {
    var a = active(); if (!a) return;
    var b = B();
    // the mode it was left in (the general Mushaf opens in reading, as always)
    if (a.id !== 'g' && b.setMode && b.mode && b.mode() !== modeOf(a)) b.setMode(modeOf(a));
    sSet('lt_mus_go', null);
    if (a.plan) loadPlans(function () { try { window.dispatchEvent(new CustomEvent('lt-mushaf')); } catch (e) {} });
  }
  var plP = null;
  function loadPlans(fn) {
    if (!plP) plP = new Promise(function (ok) {
      var go = function () { window.LtPlans.boot().then(ok, ok); };
      if (window.LtPlans) return go();
      var s = document.createElement('script'); s.src = '/js/plans.js'; s.onload = go; s.onerror = ok; document.head.appendChild(s);
    });
    plP.then(fn);
  }
  // the place and the mode are kept as he leaves (another app, the phone locked, the page closed)
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden' && load(LIST)) saveActive(); });
  window.addEventListener('pagehide', function () { if (load(LIST)) saveActive(); });

  /* ---- the settings page ---- */
  function ui(el, o) {
    var lang = o.lang, l = L(lang), isAr = lang === 'ar' || lang === 'ur';
    var edit = null, ask = null;
    var draw = function () {
      var a = active(), ls = list(), b = B();
      var h = '<p class="mu-note">' + esc(l.note) + '</p>';
      ls.forEach(function (m) {
        var on = m.id === a.id, pg = on && b.cur ? b.cur() : m.page, md = on && b.mode ? b.mode() : modeOf(m);
        if (m.id === 'g' && !on) md = 'read';
        h += '<div class="mu-card' + (on ? ' on' : '') + '" data-id="' + esc(m.id) + '">' +
          '<div class="mu-top"><span class="mu-nm"><b>' + esc(name(m, lang)) + '</b>' + (on ? '<em>' + esc(l.inUse) + '</em>' : '') + '</span>' +
          (on ? '' : '<button type="button" class="mu-open" data-open="' + esc(m.id) + '">' + esc(l.open) + '</button>') + '</div>' +
          '<div class="mu-sub">' + (pg ? esc(l.page) + ' ' + num(pg, lang) + ' · ' : '') + esc(l.modes[md] || '') + '</div>';
        if (on) h += '<div class="mu-ext" data-ext="' + esc(m.id) + '"></div>';
        if (edit === m.id) {
          h += '<div class="mu-form">' +
            (m.id === 'g' ? '' : '<label>' + esc(l.name) + ':<input type="text" data-f="name" maxlength="30" value="' + esc(name(m, lang)) + '"></label>') +
            '<label>' + esc(l.mode) + ':<select data-f="mode">' + ['read', 'hifz', 'tasmee', 'silent'].map(function (x) { return '<option value="' + x + '"' + (modeOf(m) === x ? ' selected' : '') + '>' + esc(l.modes[x]) + '</option>'; }).join('') + '</select></label>' +
            (m.kind === 'hifz' || m.kind === 'review' || m.kind === 'custom' ? '<label>' + esc(l.plan) + ':<select data-f="plan"><option value="">' + esc(l.noPlan) + '</option></select></label>' : '') +
            '<div class="mu-btns"><button type="button" class="mu-b1" data-save="' + esc(m.id) + '">' + esc(l.save) + '</button><button type="button" class="mu-b2" data-cancel="1">' + esc(l.no) + '</button></div></div>';
        } else if (ask === m.id) {
          h += '<div class="mu-form"><p>' + esc(l.delAsk) + '</p><div class="mu-btns"><button type="button" class="mu-b1 mu-red" data-delok="' + esc(m.id) + '">' + esc(l.yes) + '</button>' +
            '<button type="button" class="mu-b2" data-cancel="1">' + esc(l.no) + '</button></div></div>';
        } else {
          h += '<div class="mu-acts">' + (m.id === 'g' ? '' : '<button type="button" data-edit="' + esc(m.id) + '">' + esc(l.edit) + '</button>') +
            (m.id === 'g' || on ? '' : '<button type="button" data-del="' + esc(m.id) + '">' + esc(l.del) + '</button>') + '</div>';
        }
        h += '</div>';
      });
      // a new one: a name and its kind
      h += '<div class="mu-card mu-new"><div class="mu-top"><b>' + esc(l.add) + '</b></div><div class="mu-form">' +
        '<label>' + esc(l.name) + ':<input type="text" data-f="nname" maxlength="30"></label>' +
        '<label>' + esc(l.kind) + ':<select data-f="nkind">' + ['g', 'khatma', 'hifz', 'review'].map(function (k) { return '<option value="' + (k === 'g' ? 'custom' : k) + '">' + esc(l.kindsS[k]) + '</option>'; }).join('') + '</select></label>' +
        '<p class="mu-err" hidden></p><div class="mu-btns"><button type="button" class="mu-b1" data-add="1">' + esc(l.addB) + '</button></div></div></div>';
      el.innerHTML = '<div class="mu">' + h + '</div>';
      wire(); ext();
      if (edit) {
        var ps = el.querySelector('[data-f=plan]'), m0 = list().filter(function (x) { return x.id === edit; })[0];
        if (ps) loadPlans(function () {
          (window.LtPlans ? window.LtPlans.list() : []).forEach(function (p) {
            var op = document.createElement('option'); op.value = p.id; op.textContent = p.name || ''; if (m0 && m0.plan === p.id) op.selected = true; ps.appendChild(op);
          });
        });
      }
    };
    // what the one in use adds: its khatma's or plan's wird, and the way to them
    var ext = function () {
      var a = active(), box = el.querySelector('.mu-ext'); if (!box || a.id === 'g') return;
      var btn = function (k, t) { return '<button type="button" data-x="' + k + '">' + esc(t) + '</button>'; };
      if (a.kind === 'khatma') {
        var kt = window.Khatma && window.Khatma.stripText(lang);
        box.innerHTML = (kt ? '<p class="mu-w"><b>' + esc(kt.h) + ':</b> ' + kt.v + '</p>' : '<p class="mu-w">' + esc(l.noKh) + '</p>') +
          '<div class="mu-acts">' + (kt && kt.page ? btn('kgo', l.goWird) : '') + btn('kh', l.khB) + '</div>';
        if (kt) box.dataset.page = kt.page;
      } else if (a.plan || a.kind === 'hifz' || a.kind === 'review') {
        loadPlans(function () {
          var w = a.plan && window.LtPlans ? window.LtPlans.wird(a.plan, lang) : null;
          box.innerHTML = (w ? '<p class="mu-w"><b>' + esc(w.h) + (w.v ? ':' : '') + '</b> ' + esc(w.v) + '</p>' : '<p class="mu-w">' + esc(l.noPl) + '</p>') +
            '<div class="mu-acts">' + (w && w.page ? btn('pgo', l.goWird) : '') + btn('pl', l.plansB) +
            (a.kind === 'review' && lang === 'ar' && a.plan ? btn('test', l.test) : '') + '</div>';
          if (w) box.dataset.page = w.page;
          wireExt(box);
        });
        return;
      }
      wireExt(box);
    };
    var wireExt = function (box) {
      box.querySelectorAll('[data-x]').forEach(function (bt) {
        bt.onclick = function () {
          var x = bt.dataset.x, a = active();
          if (x === 'kgo' || x === 'pgo') { o.close(); B().show(+box.dataset.page); }
          if (x === 'kh') o.openSec('khatma');
          if (x === 'pl') o.openSec('plans');
          if (x === 'test') window.LtPlans.pages(a.plan).then(function (pp) {
            o.close();
            var go = function () { window.LtExam.open(pp); };
            if (window.LtExam) go(); else { var s = document.createElement('script'); s.src = '/js/exam.js?v=8'; s.onload = go; document.head.appendChild(s); }
          });
        };
      });
    };
    var wire = function () {
      el.querySelectorAll('[data-open]').forEach(function (bt) { bt.onclick = function () { o.close(); switchTo(bt.dataset.open); }; });
      el.querySelectorAll('[data-edit]').forEach(function (bt) { bt.onclick = function () { edit = bt.dataset.edit; ask = null; draw(); }; });
      el.querySelectorAll('[data-del]').forEach(function (bt) { bt.onclick = function () { ask = bt.dataset.del; edit = null; draw(); }; });
      el.querySelectorAll('[data-cancel]').forEach(function (bt) { bt.onclick = function () { edit = ask = null; draw(); }; });
      el.querySelectorAll('[data-delok]').forEach(function (bt) {
        bt.onclick = function () { var id = bt.dataset.delok; keep(all().map(function (m) { return m.id === id ? { id: id, deleted: true, t: Date.now() } : m; })); ask = null; draw(); };
      });
      el.querySelectorAll('[data-save]').forEach(function (bt) {
        bt.onclick = function () {
          var id = bt.dataset.save, m = all().filter(function (x) { return x.id === id; })[0]; if (!m) return;
          var f = function (k) { var e = el.querySelector('[data-f=' + k + ']'); return e ? e.value : null; };
          var nm = f('name'); if (nm != null) { nm = nm.trim(); m.name = nm && nm !== L(lang).kinds[m.kind] ? nm : ''; }
          var md = f('mode'), was = modeOf(m); if (md) m.mode = md;
          var pl = f('plan'); if (pl != null) m.plan = pl || null;
          m.t = Date.now(); put(m); edit = null;
          if (m.id === activeId() && md && md !== was && B().setMode) B().setMode(md);
          draw();
          try { window.dispatchEvent(new CustomEvent('lt-mushaf')); } catch (e) {}
        };
      });
      var ad = el.querySelector('[data-add]');
      if (ad) ad.onclick = function () {
        var nm = (el.querySelector('[data-f=nname]').value || '').trim(), kd = el.querySelector('[data-f=nkind]').value, er = el.querySelector('.mu-err');
        if (!nm) { er.textContent = l.nameReq; er.hidden = false; return; }
        var m = { id: 'm' + Date.now().toString(36), kind: kd, name: nm, mode: MODE0[kd], t: Date.now() };
        put(m); edit = null; draw();
      };
    };
    draw();
    window.addEventListener('lt-sync', function () { if (el.isConnected && !el.hidden && !edit && !ask) draw(); });
  }

  window.LtMushafs = { boot: boot, ui: ui, list: list, active: active, name: name, switchTo: switchTo, strip: strip, save: saveActive, L: L };
})();
