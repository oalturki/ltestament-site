/* «حسابي» in the Mushaf settings: the person's account, where his Mushaf data is kept (khatmas, reminders, bookmarks,
   recitation record) and from where he adds and follows his children's profiles. The site's account page
   (/account/) keeps what is not the Mushaf's own: the password, the account itself.
   LtAcc.ui(el, {lang, done()})   the section; done() after a sign-in, sign-out or profile change (to refresh the menu)
   LtAcc.label(lang)              the line under «حسابي» in the menu: who is reading, or «not signed in» */
(function () {
  var T = {"ar": {"title": "حسابي", "intro": "ادخل حسابك لتُحفظ ختماتك وتذكيراتك وعلاماتك وسجل تسميعك، وتجدها على كل أجهزتك. ولك أن تضيف ملفات لأولادك وتتابعهم.", "who": "من يقرأ؟", "addKid": "إضافة ملف لأحد أولادي", "manage": "إدارة الحساب وكلمة المرور", "as": "داخل باسم", "notIn": "غير مسجّل", "signin": "دخول", "signup": "حساب جديد", "email": "البريد الإلكتروني", "password": "كلمة المرور", "name": "اسمك", "go": "دخول", "create": "إنشاء الحساب", "forgot": "نسيت كلمة المرور", "sent": "أرسلنا رسالة إلى بريدك، افتحها واضغط الرابط الذي فيها.", "checkEmail": "أُنشئ الحساب. أرسلنا إلى بريدك رسالة تأكيد، اضغط الرابط الذي فيها ثم ادخل.", "consent": "أوافق على أن يحفظ الموقع ما يلزم لسجل التحفيظ كما هو موضّح أدناه.", "privacy": "نحفظ بريدك، ولكل ابن لقبًا ورمزًا وسجلَّ حفظه فقط؛ لا عمر ولا صورة ولا مدرسة. لا يُحفظ الصوت، ولا تُشارك البيانات مع أحد، ويحذفها حذفُ الحساب نهائيًا.", "signout": "تسجيل الخروج", "childName": "الاسم أو اللقب", "add": "إضافة", "cancel": "إلغاء", "err": "حدث خطأ، أعد المحاولة.", "badLogin": "البريد أو كلمة المرور غير صحيحة.", "exists": "هذا البريد مسجَّل من قبل؛ ادخل أو استعد كلمة المرور.", "weak": "كلمة المرور قصيرة: ٨ أحرف على الأقل.", "limit": "بلغت الأسرة الحد الأعلى: ١٠ ملفات.", "fill": "أكمل الحقول.", "mailFail": "تعذّر إرسال رسالة البريد الآن؛ أعد المحاولة بعد قليل.", "unconfirmed": "لم يُؤكَّد البريد بعد: افتح رسالة التأكيد في بريدك أولًا.", "pinAsk": "رمز ملف الوالد", "pinBad": "الرمز غير صحيح.", "code": "رمز الدخول", "codeOf": "رمز دخول ملف", "codeSet": "تعيين رمز", "codeChange": "تغيير الرمز", "codeOff": "إلغاء الرمز", "code4": "٤ أرقام", "codeNo": "بلا رمز", "codeOn": "محمي برمز", "codeNeed": "اكتب ٤ أرقام.", "codeBad": "الرمز غير صحيح.", "codeWhy": "يُطلب عند فتح هذا الملف على أي جهاز. وتفتح أنت ملفات أولادك دون رموزهم.", "save": "حفظ", "readingAs": "تقرأ الآن باسم", "backTo": "العودة إلى ملف", "mine": "ملفي", "subs": "الحسابات الفرعية", "noSubs": "لا حسابات فرعية بعد.", "readAs": "اقرأ باسمه", "tPlans": "الخطط", "tReports": "التقارير", "tKhatmas": "الختمات", "tSettings": "الإعدادات", "rMastered": "صفحات متقنة", "rLearning": "يحفظها", "rDue": "حانت مراجعتها", "rLast": "آخر تسميع", "rMore": "الخريطة التفصيلية للصفحات", "kNone": "لا ختمات له بعد.", "behind": "متأخر", "onTime": "على الموعد", "kEdit": "تعديل الاسم والرمز أو حذف الملف", "profiles": "الملفات", "you": "(أنت)", "needCode": "إذا كان أولادك يستعملون هذا الجهاز فضع رمزًا لملفك، حتى لا يفتحوه ولا يروا تقاريرك وخططك."}, "en": {"title": "My account", "intro": "Sign in so your khatmas, reminders, bookmarks and recitation record are kept and follow you to all your devices. You can also add profiles for your children and follow them.", "who": "Who is reading?", "addKid": "Add a profile for my child", "manage": "Manage the account and password", "as": "Signed in as", "notIn": "Not signed in", "signin": "Sign in", "signup": "New account", "email": "Email", "password": "Password", "name": "Your name", "go": "Sign in", "create": "Create account", "forgot": "Forgot password", "sent": "We sent you an email; open it and tap the link.", "checkEmail": "Account created. We sent a confirmation email; tap its link, then sign in.", "consent": "I agree that the site keeps what the memorization record needs, as described below.", "privacy": "We keep your email and, for each child, a nickname, an icon and their memorization record only — no age, photo or school. No audio is kept, nothing is shared, and deleting the account erases it all.", "signout": "Sign out", "childName": "Name or nickname", "add": "Add", "cancel": "Cancel", "err": "Something went wrong; please try again.", "badLogin": "Wrong email or password.", "exists": "This email is already registered; sign in or reset the password.", "weak": "Password too short: at least 8 characters.", "limit": "The family has reached the limit of 10 profiles.", "fill": "Please fill in the fields.", "mailFail": "The email could not be sent just now; please try again shortly.", "unconfirmed": "Email not confirmed yet: open the confirmation email first.", "pinAsk": "Parent profile PIN", "pinBad": "Wrong PIN.", "code": "Code", "codeOf": "Code for", "codeSet": "Set a code", "codeChange": "Change the code", "codeOff": "Remove the code", "code4": "4 digits", "codeNo": "No code", "codeOn": "Protected by a code", "codeNeed": "Enter 4 digits.", "codeBad": "Wrong code.", "codeWhy": "Asked when this profile is opened on any device. You open your children’s profiles without their codes.", "save": "Save", "readingAs": "Reading as", "backTo": "Back to", "mine": "My profile", "subs": "Sub-accounts", "noSubs": "No sub-accounts yet.", "readAs": "Read as him", "tPlans": "Plans", "tReports": "Reports", "tKhatmas": "Khatmas", "tSettings": "Settings", "rMastered": "Pages mastered", "rLearning": "Learning", "rDue": "Due for review", "rLast": "Last recitation", "rMore": "Detailed map of the pages", "kNone": "No khatmas yet.", "behind": "Behind", "onTime": "On time", "kEdit": "Rename, change the icon or delete", "profiles": "Profiles", "you": "(you)", "needCode": "If your children use this device, set a code on your profile so they cannot open it or see your reports and plans."}, "fr": {"title": "Mon compte", "intro": "Connectez-vous pour garder vos khatmas, rappels, signets et votre dossier de récitation sur tous vos appareils. Vous pouvez aussi ajouter des profils pour vos enfants et les suivre.", "who": "Qui lit ?", "addKid": "Ajouter un profil pour mon enfant", "manage": "Gérer le compte et le mot de passe", "as": "Connecté :", "notIn": "Non connecté", "signin": "Connexion", "signup": "Nouveau compte", "email": "E-mail", "password": "Mot de passe", "name": "Votre nom", "go": "Se connecter", "create": "Créer le compte", "forgot": "Mot de passe oublié", "sent": "Nous vous avons envoyé un e-mail ; ouvrez-le et touchez le lien.", "checkEmail": "Compte créé. Un e-mail de confirmation vous a été envoyé ; touchez son lien, puis connectez-vous.", "consent": "J’accepte que le site conserve ce qu’exige le dossier de mémorisation, comme décrit ci-dessous.", "privacy": "Nous gardons votre e-mail et, pour chaque enfant, un surnom, une icône et son dossier de mémorisation seulement — ni âge, ni photo, ni école. Aucun audio n’est gardé, rien n’est partagé, et supprimer le compte efface tout.", "signout": "Se déconnecter", "childName": "Nom ou surnom", "add": "Ajouter", "cancel": "Annuler", "err": "Une erreur s’est produite ; réessayez.", "badLogin": "E-mail ou mot de passe incorrect.", "exists": "Cet e-mail est déjà inscrit ; connectez-vous ou réinitialisez le mot de passe.", "weak": "Mot de passe trop court : 8 caractères au moins.", "limit": "La famille a atteint la limite de 10 profils.", "fill": "Remplissez les champs.", "mailFail": "L’e-mail n’a pas pu être envoyé ; réessayez dans un moment.", "unconfirmed": "E-mail non confirmé : ouvrez d’abord l’e-mail de confirmation.", "pinAsk": "Code du profil parent", "pinBad": "Code incorrect.", "code": "Code", "codeOf": "Code de", "codeSet": "Définir un code", "codeChange": "Changer le code", "codeOff": "Retirer le code", "code4": "4 chiffres", "codeNo": "Sans code", "codeOn": "Protégé par un code", "codeNeed": "Saisissez 4 chiffres.", "codeBad": "Code incorrect.", "codeWhy": "Demandé à l’ouverture de ce profil sur tout appareil. Vous ouvrez les profils de vos enfants sans leur code.", "save": "Enregistrer", "readingAs": "Reading as", "backTo": "Back to", "mine": "My profile", "subs": "Sub-accounts", "noSubs": "No sub-accounts yet.", "readAs": "Read as him", "tPlans": "Plans", "tReports": "Reports", "tKhatmas": "Khatmas", "tSettings": "Settings", "rMastered": "Pages mastered", "rLearning": "Learning", "rDue": "Due for review", "rLast": "Last recitation", "rMore": "Detailed map of the pages", "kNone": "No khatmas yet.", "behind": "Behind", "onTime": "On time", "kEdit": "Rename, change the icon or delete", "profiles": "Profiles", "you": "(you)", "needCode": "If your children use this device, set a code on your profile so they cannot open it or see your reports and plans."}, "es": {"title": "Mi cuenta", "intro": "Entra para que tus jatmas, recordatorios, marcadores y registro de recitación se guarden y te sigan en todos tus dispositivos. También puedes añadir perfiles para tus hijos y seguirlos.", "who": "¿Quién lee?", "addKid": "Añadir un perfil para mi hijo", "manage": "Gestionar la cuenta y la contraseña", "as": "Conectado:", "notIn": "Sin conectar", "signin": "Entrar", "signup": "Cuenta nueva", "email": "Correo", "password": "Contraseña", "name": "Tu nombre", "go": "Entrar", "create": "Crear cuenta", "forgot": "Olvidé la contraseña", "sent": "Te enviamos un correo; ábrelo y toca el enlace.", "checkEmail": "Cuenta creada. Te enviamos un correo de confirmación; toca su enlace y luego entra.", "consent": "Acepto que el sitio guarde lo que necesita el registro de memorización, como se describe abajo.", "privacy": "Guardamos tu correo y, de cada hijo, un apodo, un icono y su registro de memorización — sin edad, foto ni escuela. No se guarda audio, nada se comparte y borrar la cuenta lo elimina todo.", "signout": "Salir", "childName": "Nombre o apodo", "add": "Añadir", "cancel": "Cancelar", "err": "Algo falló; inténtalo de nuevo.", "badLogin": "Correo o contraseña incorrectos.", "exists": "Este correo ya está registrado; entra o restablece la contraseña.", "weak": "Contraseña corta: al menos 8 caracteres.", "limit": "La familia llegó al límite de 10 perfiles.", "fill": "Completa los campos.", "mailFail": "No se pudo enviar el correo ahora; inténtalo de nuevo en un momento.", "unconfirmed": "Correo sin confirmar: abre primero el correo de confirmación.", "pinAsk": "PIN del perfil del padre", "pinBad": "PIN incorrecto.", "code": "Código", "codeOf": "Código de", "codeSet": "Poner un código", "codeChange": "Cambiar el código", "codeOff": "Quitar el código", "code4": "4 cifras", "codeNo": "Sin código", "codeOn": "Protegido con código", "codeNeed": "Escribe 4 cifras.", "codeBad": "Código incorrecto.", "codeWhy": "Se pide al abrir este perfil en cualquier dispositivo. Tú abres los perfiles de tus hijos sin sus códigos.", "save": "Guardar", "readingAs": "Reading as", "backTo": "Back to", "mine": "My profile", "subs": "Sub-accounts", "noSubs": "No sub-accounts yet.", "readAs": "Read as him", "tPlans": "Plans", "tReports": "Reports", "tKhatmas": "Khatmas", "tSettings": "Settings", "rMastered": "Pages mastered", "rLearning": "Learning", "rDue": "Due for review", "rLast": "Last recitation", "rMore": "Detailed map of the pages", "kNone": "No khatmas yet.", "behind": "Behind", "onTime": "On time", "kEdit": "Rename, change the icon or delete", "profiles": "Profiles", "you": "(you)", "needCode": "If your children use this device, set a code on your profile so they cannot open it or see your reports and plans."}, "ru": {"title": "Мой аккаунт", "intro": "Войдите, чтобы ваши хатмы, напоминания, закладки и журнал чтения сохранялись и были на всех ваших устройствах. Можно также добавить профили детей и следить за ними.", "who": "Кто читает?", "addKid": "Добавить профиль ребёнка", "manage": "Управление аккаунтом и паролем", "as": "Вы вошли:", "notIn": "Вход не выполнен", "signin": "Вход", "signup": "Новый аккаунт", "email": "Эл. почта", "password": "Пароль", "name": "Ваше имя", "go": "Войти", "create": "Создать аккаунт", "forgot": "Забыли пароль", "sent": "Мы отправили письмо; откройте его и нажмите ссылку.", "checkEmail": "Аккаунт создан. Мы отправили письмо для подтверждения; нажмите ссылку, затем войдите.", "consent": "Я согласен, что сайт хранит то, что нужно для журнала заучивания, как описано ниже.", "privacy": "Мы храним вашу почту и для каждого ребёнка только прозвище, значок и журнал заучивания — без возраста, фото и школы. Звук не хранится, ничего не передаётся, удаление аккаунта стирает всё.", "signout": "Выйти", "childName": "Имя или прозвище", "add": "Добавить", "cancel": "Отмена", "err": "Что-то пошло не так; попробуйте ещё раз.", "badLogin": "Неверная почта или пароль.", "exists": "Эта почта уже зарегистрирована; войдите или восстановите пароль.", "weak": "Пароль короткий: не менее 8 символов.", "limit": "В семье уже 10 профилей — это предел.", "fill": "Заполните поля.", "mailFail": "Письмо сейчас не удалось отправить; попробуйте чуть позже.", "unconfirmed": "Почта не подтверждена: сначала откройте письмо с подтверждением.", "pinAsk": "PIN профиля родителя", "pinBad": "Неверный PIN.", "code": "Код", "codeOf": "Код профиля", "codeSet": "Задать код", "codeChange": "Изменить код", "codeOff": "Убрать код", "code4": "4 цифры", "codeNo": "Без кода", "codeOn": "Защищён кодом", "codeNeed": "Введите 4 цифры.", "codeBad": "Неверный код.", "codeWhy": "Запрашивается при открытии этого профиля на любом устройстве. Вы открываете профили детей без их кодов.", "save": "Сохранить", "readingAs": "Reading as", "backTo": "Back to", "mine": "My profile", "subs": "Sub-accounts", "noSubs": "No sub-accounts yet.", "readAs": "Read as him", "tPlans": "Plans", "tReports": "Reports", "tKhatmas": "Khatmas", "tSettings": "Settings", "rMastered": "Pages mastered", "rLearning": "Learning", "rDue": "Due for review", "rLast": "Last recitation", "rMore": "Detailed map of the pages", "kNone": "No khatmas yet.", "behind": "Behind", "onTime": "On time", "kEdit": "Rename, change the icon or delete", "profiles": "Profiles", "you": "(you)", "needCode": "If your children use this device, set a code on your profile so they cannot open it or see your reports and plans."}, "ur": {"title": "میرا اکاؤنٹ", "intro": "لاگ اِن کریں تاکہ آپ کے ختم، یاد دہانیاں، نشانات اور تلاوت کا ریکارڈ محفوظ رہیں اور آپ کے سب آلات پر ملیں۔ آپ اپنے بچوں کے پروفائل بنا کر ان کی نگرانی بھی کر سکتے ہیں۔", "who": "کون پڑھ رہا ہے؟", "addKid": "اپنے بچے کا پروفائل شامل کریں", "manage": "اکاؤنٹ اور پاس ورڈ کا انتظام", "as": "لاگ اِن:", "notIn": "لاگ اِن نہیں", "signin": "لاگ اِن", "signup": "نیا اکاؤنٹ", "email": "ای میل", "password": "پاس ورڈ", "name": "آپ کا نام", "go": "لاگ اِن", "create": "اکاؤنٹ بنائیں", "forgot": "پاس ورڈ بھول گئے", "sent": "ہم نے آپ کو ای میل بھیجی ہے؛ اسے کھول کر لنک دبائیں۔", "checkEmail": "اکاؤنٹ بن گیا۔ تصدیقی ای میل بھیجی گئی ہے؛ اس کا لنک دبائیں، پھر لاگ اِن کریں۔", "consent": "میں اتفاق کرتا ہوں کہ سائٹ حفظ کے ریکارڈ کے لیے ضروری معلومات محفوظ رکھے، جیسا کہ نیچے بیان ہے۔", "privacy": "ہم آپ کا ای میل، اور ہر بچے کا لقب، نشان اور حفظ کا ریکارڈ ہی رکھتے ہیں — عمر، تصویر یا اسکول نہیں۔ آواز محفوظ نہیں ہوتی، کچھ شیئر نہیں ہوتا، اور اکاؤنٹ حذف کرنے سے سب مٹ جاتا ہے۔", "signout": "لاگ آؤٹ", "childName": "نام یا لقب", "add": "شامل کریں", "cancel": "منسوخ", "err": "کچھ غلط ہو گیا؛ دوبارہ کوشش کریں۔", "badLogin": "ای میل یا پاس ورڈ غلط ہے۔", "exists": "یہ ای میل پہلے سے رجسٹرڈ ہے؛ لاگ اِن کریں یا پاس ورڈ بحال کریں۔", "weak": "پاس ورڈ کم از کم ۸ حروف کا ہو۔", "limit": "خاندان ۱۰ پروفائلز کی حد تک پہنچ گیا۔", "fill": "خانے پُر کریں۔", "mailFail": "ابھی ای میل نہیں بھیجی جا سکی؛ تھوڑی دیر بعد دوبارہ کوشش کریں۔", "unconfirmed": "ای میل کی تصدیق ابھی نہیں ہوئی: پہلے تصدیقی ای میل کھولیں۔", "pinAsk": "والد/والدہ کا پن", "pinBad": "غلط پن۔", "code": "پن", "codeOf": "پروفائل کا پن:", "codeSet": "پن مقرر کریں", "codeChange": "پن بدلیں", "codeOff": "پن ہٹائیں", "code4": "۴ ہندسے", "codeNo": "بغیر پن", "codeOn": "پن سے محفوظ", "codeNeed": "۴ ہندسے لکھیں۔", "codeBad": "غلط پن۔", "codeWhy": "کسی بھی آلے پر یہ پروفائل کھولتے وقت پوچھا جاتا ہے۔ آپ اپنے بچوں کے پروفائل ان کے پن کے بغیر کھولتے ہیں۔", "save": "محفوظ کریں", "readingAs": "Reading as", "backTo": "Back to", "mine": "My profile", "subs": "Sub-accounts", "noSubs": "No sub-accounts yet.", "readAs": "Read as him", "tPlans": "Plans", "tReports": "Reports", "tKhatmas": "Khatmas", "tSettings": "Settings", "rMastered": "Pages mastered", "rLearning": "Learning", "rDue": "Due for review", "rLast": "Last recitation", "rMore": "Detailed map of the pages", "kNone": "No khatmas yet.", "behind": "Behind", "onTime": "On time", "kEdit": "Rename, change the icon or delete", "profiles": "Profiles", "you": "(you)", "needCode": "If your children use this device, set a code on your profile so they cannot open it or see your reports and plans."}};
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var famP = null;
  function fam() {
    if (window.Fam) return Promise.resolve(window.Fam);
    if (!famP) famP = new Promise(function (ok, bad) { var s = document.createElement('script'); s.src = '/js/family.js?v=3'; s.onload = function () { ok(window.Fam); }; s.onerror = bad; document.head.appendChild(s); });
    return famP;
  }
  function errText(L, e) {
    var m = String(e && (e.message || e.code) || e);
    if (/sending|confirmation email|smtp|magic link email|recovery email/i.test(m)) return L.mailFail;
    if (/invalid login/i.test(m)) return L.badLogin;
    if (/already registered|already been registered|user_already_exists/i.test(m)) return L.exists;
    if (/password/i.test(m) && /(short|least|weak)/i.test(m)) return L.weak;
    if (/not confirmed/i.test(m)) return L.unconfirmed;
    if (/profile limit/i.test(m)) return L.limit;
    return L.err;
  }
  function label(lang) {
    var L = T[lang] || T.en, p = null;
    try { if (localStorage.getItem('sb-nikwwjswwlwcqekbnpzq-auth-token')) p = JSON.parse(localStorage.getItem('lt_profile') || 'null'); } catch (e) {}
    return p ? p.name : L.notIn;
  }
  function ui(el, o) {
    var lang = o.lang, L = T[lang] || T.en, acc = '/account/?lang=' + lang;
    var done = function () { if (o.done) o.done(); };
    // signed out: sign in, or make the account
    var authView = function (mode) {
      el.innerHTML = '<div class="ma"><p class="ma-intro">' + esc(L.intro) + '</p>' +
        '<div class="kh-seg ma-tabs"><button type="button" data-m="in"' + (mode === 'in' ? ' class="on"' : '') + '>' + esc(L.signin) + '</button><button type="button" data-m="up"' + (mode === 'up' ? ' class="on"' : '') + '>' + esc(L.signup) + '</button></div>' +
        '<form class="ma-form" novalidate>' +
        (mode === 'up' ? '<label>' + esc(L.name) + '<input class="ma-name" maxlength="40" autocomplete="name"></label>' : '') +
        '<label>' + esc(L.email) + '<input class="ma-email" type="email" dir="ltr" autocomplete="email" inputmode="email"></label>' +
        '<label>' + esc(L.password) + '<input class="ma-pass" type="password" dir="ltr" autocomplete="' + (mode === 'up' ? 'new-password' : 'current-password') + '"></label>' +
        (mode === 'up' ? '<label class="ma-ok"><input type="checkbox" class="ma-agree"><span>' + esc(L.consent) + '</span></label>' : '') +
        '<button type="submit" class="ma-go">' + esc(mode === 'up' ? L.create : L.go) + '</button>' +
        (mode === 'in' ? '<button type="button" class="ma-link ma-forgot">' + esc(L.forgot) + '</button>' : '') +
        '<p class="ma-msg"></p></form>' +
        (mode === 'up' ? '<p class="ma-priv">' + esc(L.privacy) + '</p>' : '') + '</div>';
      var $ = function (s) { return el.querySelector(s); }, m = $('.ma-msg'), btn = $('.ma-go');
      var msg = function (t, bad) { m.textContent = t || ''; m.classList.toggle('bad', !!bad); };
      el.querySelectorAll('.ma-tabs button').forEach(function (b) { b.onclick = function () { authView(b.dataset.m); }; });
      var redirect = location.origin + '/account/?lang=' + lang;
      $('.ma-form').onsubmit = function (e) {
        e.preventDefault();
        var email = $('.ma-email').value.trim(), pass = $('.ma-pass').value;
        if (!email || !pass || (mode === 'up' && (!$('.ma-name').value.trim() || !$('.ma-agree').checked))) return msg(L.fill, true);
        if (mode === 'up' && pass.length < 8) return msg(L.weak, true);
        btn.disabled = true; msg('');
        fam().then(function (F) {
          return F.client().then(function (c) {
            if (mode === 'up') {
              var nm = $('.ma-name').value.trim().slice(0, 40);
              return c.auth.signUp({ email: email, password: pass, options: { emailRedirectTo: redirect, data: { name: nm, lang: lang } } }).then(function (r) {
                if (r.error) throw r.error;
                if (r.data && r.data.user && r.data.user.identities && !r.data.user.identities.length) throw new Error('already registered');
                if (r.data.session) return enter(F, nm);
                el.querySelector('.ma-form').innerHTML = '<p class="ma-msg">' + esc(L.checkEmail) + '</p>';
              });
            }
            return c.auth.signInWithPassword({ email: email, password: pass }).then(function (r) {
              if (r.error) throw r.error;
              var u = r.data.user || {}, meta = u.user_metadata || {};
              return enter(F, meta.name || email.split('@')[0]);
            });
          });
        }).catch(function (er) { msg(errText(L, er), true); }).then(function () { btn.disabled = false; });
      };
      if ($('.ma-forgot')) $('.ma-forgot').onclick = function () {
        var email = $('.ma-email').value.trim(); if (!email) return msg(L.fill, true);
        fam().then(function (F) { return F.client(); }).then(function (c) { return c.auth.resetPasswordForEmail(email, { redirectTo: redirect + '&reset=1' }); })
          .then(function (r) { if (r.error) throw r.error; msg(L.sent); }).catch(function (er) { msg(errText(L, er), true); });
      };
    };
    // signed in: the person's own profile is the one in use (made on the first sign-in)
    var enter = function (F, name) {
      return F.ensureParent(name).then(function (list) {
        var me = list.filter(function (p) { return p.is_parent; })[0] || list[0];
        F.use(me); done(); return inView(F);
      });
    };
    // a profile's code: set, change or remove (his own; the parent also sets his children's)
    var codeBox = function (F, p, again) {
      var box = document.createElement('div');
      box.innerHTML = '<div class="ma-code"><span><b>' + esc(L.codeOf) + ' ' + esc(p.name) + '</b><small>' + esc(F.hasCode(p) ? L.codeOn : L.codeNo) + '</small></span>' +
        '<button type="button" class="ma-cset">' + esc(F.hasCode(p) ? L.codeChange : L.codeSet) + '</button></div><div class="ma-cbox" hidden></div>';
      var cb = box.querySelector('.ma-cbox');
      box.querySelector('.ma-cset').onclick = function () {
        cb.hidden = false;
        cb.innerHTML = '<p class="ma-priv">' + esc(L.codeWhy) + '</p><input class="ma-pin" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="4" autocomplete="off" dir="ltr" placeholder="' + esc(L.code4) + '">' +
          '<div class="ma-btns"><button type="button" class="ma-go ma-csave">' + esc(L.save) + '</button>' +
          (F.hasCode(p) ? '<button type="button" class="ma-cancel ma-coff">' + esc(L.codeOff) + '</button>' : '<button type="button" class="ma-cancel ma-cno">' + esc(L.cancel) + '</button>') + '</div><p class="ma-msg"></p>';
        var pin = cb.querySelector('.ma-pin'), mm = cb.querySelector('.ma-msg');
        pin.oninput = function () { pin.value = pin.value.replace(/[٠-٩]/g, function (d) { return '٠١٢٣٤٥٦٧٨٩'.indexOf(d); }).replace(/[^0-9]/g, '').slice(0, 4); };
        cb.querySelector('.ma-csave').onclick = function () {
          if (!/^[0-9]{4}$/.test(pin.value)) { mm.textContent = L.codeNeed; mm.classList.add('bad'); return; }
          F.setCode(p, pin.value).then(again).catch(function (er) { mm.textContent = errText(L, er); mm.classList.add('bad'); });
        };
        if (cb.querySelector('.ma-coff')) cb.querySelector('.ma-coff').onclick = function () { F.setCode(p, null).then(again); };
        if (cb.querySelector('.ma-cno')) cb.querySelector('.ma-cno').onclick = function () { cb.hidden = true; cb.innerHTML = ''; };
        pin.focus();
      };
      return box;
    };
    var go = function (F, p) { F.use(p); done(); inView(F); };
    var inView = function (F, kidId) {
      return Promise.all([F.profiles(), F.client().then(function (c) { return c.auth.getUser(); })]).then(function (x) {
        var list = x[0], user = (x[1].data || {}).user || {}, cur = F.current();
        if (!list.length) return enter(F, (user.user_metadata || {}).name || String(user.email || '').split('@')[0]);
        if (!cur || !list.some(function (p) { return p.id === cur.id; })) { F.use(list[0]); cur = F.current(); }
        var me = list.filter(function (p) { return p.id === cur.id; })[0], parent = list.filter(function (p) { return p.is_parent; })[0] || list[0];
        var kids = list.filter(function (p) { return !p.is_parent; });
        var again = function () { inView(F, kidId); };
        // a child's profile in use: his own page; the account's settings stay with the parent
        if (!me.is_parent) {
          kidView(F, me, { self: true });
          var bk = document.createElement('button'); bk.type = 'button'; bk.className = 'ma-add ma-back';
          bk.innerHTML = F.avatar(parent.avatar) + ' ' + esc(L.backTo) + ' ' + esc(parent.name);
          el.querySelector('.ma').appendChild(bk);
          bk.onclick = function () {
            F.guard(parent, function () { return prompt(L.code + ' — ' + parent.name); }).then(function (ok) { if (ok) go(F, parent); else if (ok === false) alert(L.codeBad); });
          };
          return;
        }
        if (kidId) { var k = list.filter(function (x2) { return x2.id === kidId; })[0]; if (k) return kidView(F, k, { self: k.id === me.id, up: true }); }
        // the parent: his account, his own profile, and his children's (the sub-accounts)
        el.innerHTML = '<div class="ma"><p class="ma-as">' + esc(L.as) + ' <b dir="ltr">' + esc(user.email || '') + '</b></p>' +
          // the profiles: his own first, then the sub-accounts; each opens its page (plans, reports, khatmas, settings)
          '<div class="ma-l">' + esc(L.profiles) + '</div><div class="ma-kids">' + [me].concat(kids).map(function (k2) {
            return '<button type="button" class="ma-kid" data-k="' + k2.id + '"><span class="av">' + F.avatar(k2.avatar) + '</span><b>' + esc(k2.name) + (k2.id === me.id ? ' <small>' + esc(L.you) + '</small>' : '') + '</b><small>' + esc(F.hasCode(k2) ? L.codeOn : '') + '</small><i>‹</i></button>';
          }).join('') + '</div>' +
          // a device the children use too: his own profile behind a code, or they can open it
          (kids.length && !F.hasCode(me) ? '<div class="ma-warn"><p>' + esc(L.needCode) + '</p><div class="ma-cslot"></div></div>' : '') +
          '<button type="button" class="ma-add">+ ' + esc(L.addKid) + '</button><div class="ma-new" hidden></div>' +
          '<a class="ma-link" href="' + acc + '">' + esc(L.manage) + '</a>' +
          '<button type="button" class="ma-link ma-out">' + esc(L.signout) + '</button></div>';
        el.querySelectorAll('.ma-kid').forEach(function (b) { b.onclick = function () { inView(F, b.dataset.k); }; });
        if (el.querySelector('.ma-warn .ma-cslot')) el.querySelector('.ma-warn .ma-cslot').appendChild(codeBox(F, me, again));
        var nb = el.querySelector('.ma-new');
        el.querySelector('.ma-add').onclick = function () {
          var keys = Object.keys(F.avatars), av = keys[0];
          nb.hidden = false;
          nb.innerHTML = '<label>' + esc(L.childName) + '<input class="ma-kidn" maxlength="20"></label><div class="ma-avs">' +
            keys.map(function (k3, i) { return '<button type="button" data-av="' + k3 + '"' + (i ? '' : ' class="on"') + '>' + F.avatars[k3] + '</button>'; }).join('') + '</div>' +
            '<div class="ma-btns"><button type="button" class="ma-go ma-save">' + esc(L.add) + '</button><button type="button" class="ma-cancel">' + esc(L.cancel) + '</button></div><p class="ma-msg"></p>';
          nb.querySelectorAll('[data-av]').forEach(function (b) { b.onclick = function () { av = b.dataset.av; nb.querySelectorAll('[data-av]').forEach(function (x3) { x3.classList.toggle('on', x3 === b); }); }; });
          nb.querySelector('.ma-cancel').onclick = function () { nb.hidden = true; nb.innerHTML = ''; };
          nb.querySelector('.ma-save').onclick = function () {
            var n = nb.querySelector('.ma-kidn').value.trim(), mm = nb.querySelector('.ma-msg');
            if (!n) { mm.textContent = L.fill; mm.classList.add('bad'); return; }
            F.ready().then(function (c) { return c.from('family_profiles').insert({ name: n.slice(0, 20), avatar: av }); })
              .then(function (r) { if (r.error) throw r.error; inView(F); })
              .catch(function (er) { mm.textContent = errText(L, er); mm.classList.add('bad'); });
          };
          nb.querySelector('.ma-kidn').focus();
        };
        el.querySelector('.ma-out').onclick = function () { F.signOut().then(function () { done(); authView('in'); }); };
      });
    };
    // a child's page, for his parent: by subject — his plans, his reports, his khatmas, his settings
    var load1 = function (src, has) { return has() ? Promise.resolve() : new Promise(function (ok) { var s2 = document.createElement('script'); s2.src = src; s2.onload = ok; s2.onerror = ok; document.head.appendChild(s2); }); };
    var kidView = function (F, k, opt) {
      opt = opt || {};
      var TABS = [['plans', L.tPlans], ['reports', L.tReports], ['khatmas', L.tKhatmas], ['settings', L.tSettings]], tab = kidView.tab || 'plans';
      el.innerHTML = '<div class="ma">' + (opt.up ? '<button type="button" class="ma-link ma-up">‹ ' + esc(L.profiles) + '</button>' : '') +
        '<div class="ma-khead"><span class="av">' + F.avatar(k.avatar) + '</span><b>' + esc(k.name) + '</b>' + (opt.self ? '' : '<button type="button" class="ma-cset ma-as2">' + esc(L.readAs) + '</button>') + '</div>' +
        '<div class="kh-seg ma-tabs2">' + TABS.map(function (t) { return '<button type="button" data-t="' + t[0] + '"' + (t[0] === tab ? ' class="on"' : '') + '>' + esc(t[1]) + '</button>'; }).join('') + '</div>' +
        '<div class="ma-tab"></div></div>';
      if (el.querySelector('.ma-up')) el.querySelector('.ma-up').onclick = function () { inView(F); };
      if (el.querySelector('.ma-as2')) el.querySelector('.ma-as2').onclick = function () { go(F, k); };
      el.querySelectorAll('.ma-tabs2 button').forEach(function (b) { b.onclick = function () { kidView.tab = b.dataset.t; if (opt.self && !opt.up) inView(F); else kidView(F, k, opt); }; });
      var box = el.querySelector('.ma-tab');
      box.innerHTML = '<p class="ma-priv">…</p>';
      if (tab === 'plans') {
        load1('/js/plans.js', function () { return !!window.LtPlans; }).then(function () { window.LtPlans.ui(box, opt.self ? { lang: lang, open: o.open || function () {} } : { lang: lang, kid: k, open: function () {} }); });
      } else if (tab === 'reports') {
        Promise.all([load1('/js/readstats.js', function () { return !!window.ReadStats; }), F.ready()]).then(function (x) {
          var c = x[1], t = new Date(), today = t.getFullYear() + '-' + ('0' + (t.getMonth() + 1)).slice(-2) + '-' + ('0' + t.getDate()).slice(-2);
          return Promise.all([
            window.ReadStats ? window.ReadStats.sum(k.id).catch(function () { return null; }) : null,
            c.from('page_state').select('state,due').eq('profile_id', k.id).then(function (r) { return r.data || []; }),
            c.from('recite_sessions').select('created_at').eq('profile_id', k.id).order('created_at', { ascending: false }).limit(1).then(function (r) { return r.data || []; })
          ]).then(function (y) {
            var ps = y[1], m = ps.filter(function (r) { return r.state === 'mastered'; }), due = m.filter(function (r) { return r.due && r.due <= today; }).length;
            var learning = ps.filter(function (r) { return r.state !== 'mastered'; }).length, last = y[2][0] ? new Date(y[2][0].created_at).toLocaleDateString(lang === 'ar' ? 'ar-SA-u-ca-islamic-umalqura' : lang) : '—';
            var nm = function (n) { return lang === 'ar' ? String(n).replace(/[0-9]/g, function (d) { return '٠١٢٣٤٥٦٧٨٩'[d]; }) : String(n); };
            box.innerHTML = '<div class="ma-kpis"><div><b>' + nm(m.length) + '</b><small>' + esc(L.rMastered) + '</small></div><div><b>' + nm(learning) + '</b><small>' + esc(L.rLearning) + '</small></div>' +
              '<div><b>' + nm(due) + '</b><small>' + esc(L.rDue) + '</small></div><div><b>' + esc(last) + '</b><small>' + esc(L.rLast) + '</small></div></div><div class="ma-rs"></div>' +
              '<a class="ma-link" href="' + acc + '&map=' + k.id + '">' + esc(L.rMore) + '</a>';
            if (y[0] && window.ReadStats) { var rs = box.querySelector('.ma-rs'); rs.innerHTML = window.ReadStats.html(y[0], lang); window.ReadStats.wire(rs); }
          });
        }).catch(function () { box.innerHTML = ''; });
      } else if (tab === 'khatmas') {
        Promise.all([load1('/js/khatma.js', function () { return !!window.Khatma; }), F.ready()]).then(function (x) {
          return x[1].from('khatmas').select('data').eq('profile_id', k.id).then(function (r) {
            var ks = (r.data || []).map(function (row) { return row.data; }).filter(function (d) { return d && !d.deleted; });
            if (!ks.length) { box.innerHTML = '<p class="ma-priv">' + esc(L.kNone) + '</p>'; return; }
            box.innerHTML = ks.map(function (d) {
              var st = window.Khatma.stat(d);
              return '<div class="kh-card" style="--kc:' + esc(d.color || '#2f6b45') + '"><div class="kh-top"><b>' + esc(d.name) + '</b></div><div class="kh-bar"><i style="width:' + st.pct + '%"></i></div>' +
                '<div class="kh-meta"><span>' + st.done + ' / ' + st.total + '</span><span' + (st.behind > 0 ? ' class="kh-late">' + esc(L.behind) : (st.fin ? ' class="kh-ok">✓' : '>' + esc(L.onTime))) + '</span></div></div>';
            }).join('');
          });
        }).catch(function () { box.innerHTML = ''; });
      } else {
        box.innerHTML = '';
        box.appendChild(codeBox(F, k, function () { kidView(F, k, opt); }));
        if (opt.up) { var a = document.createElement('a'); a.className = 'ma-link'; a.href = acc + '&edit=' + k.id; a.textContent = L.kEdit; box.appendChild(a); }
      }
    };
    el.innerHTML = '<p class="ma-intro">…</p>';
    fam().then(function (F) {
      if (!F.signedIn()) return authView('in');
      return F.ready().then(function (c) { if (!c) return authView('in'); return inView(F); });
    }).catch(function () { el.innerHTML = '<a class="ma-link" href="' + acc + '">' + esc(L.title) + '</a>'; });
  }
  window.LtAcc = { ui: ui, label: label };
})();
