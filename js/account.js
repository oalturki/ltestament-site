/* «سجل الطالب» — the account page (/account/): sign up and sign in by email, the family's profiles, each profile's
   map of the 604 Mushaf pages, and the parents' board. Data: js/family.js (Supabase, row level security).
   Language: ?lang=ar|ur|en|fr|es|ru (the Mushaf passes its own), else the last one used, else Arabic. */
(function () {
  var T = {
    ar: { mailFail: "تعذّر إرسال رسالة البريد الآن؛ أعد المحاولة بعد قليل.", title: 'سجل الطالب', sub: 'حساب واحد للأسرة، وملف لكل ابن: ما حفظه وما سمّعه وما حان وقت مراجعته، وأين توقف.', back: '→ العودة إلى المصحف',
      signin: 'دخول', signup: 'حساب جديد', email: 'البريد الإلكتروني', password: 'كلمة المرور', name: 'اسمك', go: 'دخول', create: 'إنشاء الحساب',
      magic: 'أرسل لي رابط دخول', forgot: 'نسيت كلمة المرور', sent: 'أرسلنا رسالة إلى بريدك، افتحها واضغط الرابط الذي فيها.',
      checkEmail: 'أُنشئ الحساب. أرسلنا إلى بريدك رسالة تأكيد، اضغط الرابط الذي فيها ثم ادخل.', consent: 'أوافق على أن يحفظ الموقع ما يلزم لسجل التحفيظ كما هو موضّح أدناه.',
      privacy: 'نحفظ بريدك، ولكل ابن لقبًا ورمزًا وسجلَّ حفظه فقط؛ لا عمر ولا صورة ولا مدرسة. لا يُحفظ الصوت، ولا تُشارك البيانات مع أحد، ويحذفها حذفُ الحساب نهائيًا.',
      newPass: 'كلمة مرور جديدة', savePass: 'حفظ كلمة المرور', passSaved: 'حُفظت كلمة المرور.', signout: 'تسجيل الخروج',
      family: 'الأسرة', you: '(أنت)', addChild: 'إضافة ابن أو ابنة', childName: 'الاسم أو اللقب', avatar: 'الرمز', add: 'إضافة', open: 'افتح المصحف',
      mapBtn: 'الخريطة', edit: 'تعديل', del: 'حذف', delAsk: 'سيُحذف الملف وسجله كله نهائيًا. اكتب الاسم للتأكيد:', save: 'حفظ', cancel: 'إلغاء',
      mastered: 'مُتقَنة', learning: 'يحفظها', due: 'حانت مراجعتها', overdue: 'متأخرة', notStarted: 'لم يبدأ', today: 'مراجعة اليوم',
      lastPage: 'آخر موضع: صفحة', active: 'أيام النشاط (٧ أيام)', avgM: 'متوسط الأخطاء في الصفحة', week: 'هذا الأسبوع', prev: 'الأسبوع الماضي',
      topM: 'كلمات يتكرر الخطأ فيها', selfA: 'تقدير ذاتي — تسميع صامت (٧ أيام)', skips: 'مواضع التجاوز (٧ أيام)', none: 'لا شيء بعد', page: 'صفحة', juz: 'الجزء', close: 'إغلاق', openPage: 'افتح الصفحة',
      lastRec: 'آخر تسميع', mistakes: 'الأخطاء', nextRev: 'المراجعة القادمة', masteryMax: 'حدّ الإتقان (أخطاء في الصفحة)', of604: 'من ٦٠٤',
      pin: 'رمز حماية ملف الوالد على هذا الجهاز (٤ أرقام، اختياري)', pinSave: 'حفظ الرمز', pinOff: 'إلغاء الرمز', pinAsk: 'رمز ملف الوالد', pinBad: 'الرمز غير صحيح.',
      err: 'حدث خطأ، أعد المحاولة.', badLogin: 'البريد أو كلمة المرور غير صحيحة.', exists: 'هذا البريد مسجَّل من قبل؛ ادخل أو استعد كلمة المرور.',
      weak: 'كلمة المرور قصيرة: ٨ أحرف على الأقل.', limit: 'بلغت الأسرة الحد الأعلى: ١٠ ملفات.', fill: 'أكمل الحقول.', board: 'لوحة المتابعة',
      delAccount: 'حذف الحساب', delAccAsk: 'لحذف الحساب وكل سجلات الأسرة نهائيًا، راسلنا من صفحة «رأيك يهمنا» وسنحذفه خلال أيام.', settings: 'الإعدادات',
      unconfirmed: 'لم يُؤكَّد البريد بعد: افتح رسالة التأكيد في بريدك أولًا.' },
    en: { mailFail: "The email could not be sent just now; please try again shortly.", title: 'Student record', sub: 'One account for the family and a profile for each child: what they memorized, recited and should review, and where they stopped.', back: '← Back to the Mushaf',
      signin: 'Sign in', signup: 'New account', email: 'Email', password: 'Password', name: 'Your name', go: 'Sign in', create: 'Create account',
      magic: 'Email me a sign-in link', forgot: 'Forgot password', sent: 'We sent you an email; open it and tap the link.',
      checkEmail: 'Account created. We sent a confirmation email; tap its link, then sign in.', consent: 'I agree that the site keeps what the memorization record needs, as described below.',
      privacy: 'We keep your email and, for each child, a nickname, an icon and their memorization record only — no age, photo or school. No audio is kept, nothing is shared, and deleting the account erases it all.',
      newPass: 'New password', savePass: 'Save password', passSaved: 'Password saved.', signout: 'Sign out',
      family: 'Family', you: '(you)', addChild: 'Add a child', childName: 'Name or nickname', avatar: 'Icon', add: 'Add', open: 'Open the Mushaf',
      mapBtn: 'Map', edit: 'Edit', del: 'Delete', delAsk: 'The profile and its whole record will be deleted for good. Type the name to confirm:', save: 'Save', cancel: 'Cancel',
      mastered: 'Mastered', learning: 'Memorizing', due: 'Due for review', overdue: 'Overdue', notStarted: 'Not started', today: 'Review today',
      lastPage: 'Last place: page', active: 'Active days (7 days)', avgM: 'Average mistakes per page', week: 'This week', prev: 'Last week',
      topM: 'Words often missed', selfA: 'Self-assessed — silent (7 days)', skips: 'Places passed over (7 days)', none: 'Nothing yet', page: 'Page', juz: 'Juz', close: 'Close', openPage: 'Open the page',
      lastRec: 'Last recited', mistakes: 'Mistakes', nextRev: 'Next review', masteryMax: 'Mastery limit (mistakes per page)', of604: 'of 604',
      pin: 'PIN for the parent profile on this device (4 digits, optional)', pinSave: 'Save PIN', pinOff: 'Remove PIN', pinAsk: 'Parent profile PIN', pinBad: 'Wrong PIN.',
      err: 'Something went wrong; please try again.', badLogin: 'Wrong email or password.', exists: 'This email is already registered; sign in or reset the password.',
      weak: 'Password too short: at least 8 characters.', limit: 'The family has reached the limit of 10 profiles.', fill: 'Please fill in the fields.', board: 'Progress board',
      delAccount: 'Delete account', delAccAsk: 'To delete the account and all the family’s records for good, write to us from the Feedback page and we will delete it within days.', settings: 'Settings',
      unconfirmed: 'Email not confirmed yet: open the confirmation email first.' },
    ur: { mailFail: "ابھی ای میل نہیں بھیجی جا سکی؛ تھوڑی دیر بعد دوبارہ کوشش کریں۔", title: 'طالب علم کا ریکارڈ', sub: 'خاندان کے لیے ایک اکاؤنٹ اور ہر بچے کا الگ پروفائل: کیا یاد کیا، کیا سنایا، کس کی دہرائی باقی ہے، اور کہاں رکے۔', back: '→ مصحف پر واپس',
      signin: 'لاگ اِن', signup: 'نیا اکاؤنٹ', email: 'ای میل', password: 'پاس ورڈ', name: 'آپ کا نام', go: 'لاگ اِن', create: 'اکاؤنٹ بنائیں',
      magic: 'مجھے لاگ اِن لنک بھیجیں', forgot: 'پاس ورڈ بھول گئے', sent: 'ہم نے آپ کو ای میل بھیجی ہے؛ اسے کھول کر لنک دبائیں۔',
      checkEmail: 'اکاؤنٹ بن گیا۔ تصدیقی ای میل بھیجی گئی ہے؛ اس کا لنک دبائیں، پھر لاگ اِن کریں۔', consent: 'میں اتفاق کرتا ہوں کہ سائٹ حفظ کے ریکارڈ کے لیے ضروری معلومات محفوظ رکھے، جیسا کہ نیچے بیان ہے۔',
      privacy: 'ہم آپ کا ای میل، اور ہر بچے کا لقب، نشان اور حفظ کا ریکارڈ ہی رکھتے ہیں — عمر، تصویر یا اسکول نہیں۔ آواز محفوظ نہیں ہوتی، کچھ شیئر نہیں ہوتا، اور اکاؤنٹ حذف کرنے سے سب مٹ جاتا ہے۔',
      newPass: 'نیا پاس ورڈ', savePass: 'پاس ورڈ محفوظ کریں', passSaved: 'پاس ورڈ محفوظ ہو گیا۔', signout: 'لاگ آؤٹ',
      family: 'خاندان', you: '(آپ)', addChild: 'بچہ شامل کریں', childName: 'نام یا لقب', avatar: 'نشان', add: 'شامل کریں', open: 'مصحف کھولیں',
      mapBtn: 'نقشہ', edit: 'ترمیم', del: 'حذف', delAsk: 'پروفائل اور اس کا پورا ریکارڈ ہمیشہ کے لیے حذف ہو جائے گا۔ تصدیق کے لیے نام لکھیں:', save: 'محفوظ کریں', cancel: 'منسوخ',
      mastered: 'پختہ', learning: 'یاد کر رہا ہے', due: 'دہرائی کا وقت', overdue: 'تاخیر', notStarted: 'شروع نہیں', today: 'آج کی دہرائی',
      lastPage: 'آخری جگہ: صفحہ', active: 'سرگرم دن (۷ دن)', avgM: 'فی صفحہ اوسط غلطیاں', week: 'یہ ہفتہ', prev: 'پچھلا ہفتہ',
      topM: 'بار بار غلط ہونے والے الفاظ', selfA: 'خود جائزہ — خاموش تسمیع (۷ دن)', skips: 'چھوڑے گئے مقامات (۷ دن)', none: 'ابھی کچھ نہیں', page: 'صفحہ', juz: 'پارہ', close: 'بند کریں', openPage: 'صفحہ کھولیں',
      lastRec: 'آخری بار سنایا', mistakes: 'غلطیاں', nextRev: 'اگلی دہرائی', masteryMax: 'پختگی کی حد (فی صفحہ غلطیاں)', of604: '۶۰۴ میں سے',
      pin: 'اس آلے پر والد/والدہ کے پروفائل کا پن (۴ ہندسے، اختیاری)', pinSave: 'پن محفوظ کریں', pinOff: 'پن ہٹائیں', pinAsk: 'والد/والدہ کا پن', pinBad: 'غلط پن۔',
      err: 'کچھ غلط ہو گیا؛ دوبارہ کوشش کریں۔', badLogin: 'ای میل یا پاس ورڈ غلط ہے۔', exists: 'یہ ای میل پہلے سے رجسٹرڈ ہے؛ لاگ اِن کریں یا پاس ورڈ بحال کریں۔',
      weak: 'پاس ورڈ کم از کم ۸ حروف کا ہو۔', limit: 'خاندان ۱۰ پروفائلز کی حد تک پہنچ گیا۔', fill: 'خانے پُر کریں۔', board: 'پیش رفت',
      delAccount: 'اکاؤنٹ حذف کریں', delAccAsk: 'اکاؤنٹ اور تمام ریکارڈ حذف کرنے کے لیے رائے کے صفحے سے ہمیں لکھیں، ہم چند دنوں میں حذف کر دیں گے۔', settings: 'ترتیبات',
      unconfirmed: 'ای میل کی تصدیق ابھی نہیں ہوئی: پہلے تصدیقی ای میل کھولیں۔' },
    fr: { mailFail: "L’e-mail n’a pas pu être envoyé ; réessayez dans un moment.", title: 'Dossier de l’élève', sub: 'Un compte pour la famille et un profil par enfant : ce qu’il a mémorisé, récité, doit réviser, et où il s’est arrêté.', back: '← Retour au Mushaf',
      signin: 'Connexion', signup: 'Nouveau compte', email: 'E-mail', password: 'Mot de passe', name: 'Votre nom', go: 'Se connecter', create: 'Créer le compte',
      magic: 'M’envoyer un lien de connexion', forgot: 'Mot de passe oublié', sent: 'Nous vous avons envoyé un e-mail ; ouvrez-le et touchez le lien.',
      checkEmail: 'Compte créé. Un e-mail de confirmation vous a été envoyé ; touchez son lien, puis connectez-vous.', consent: 'J’accepte que le site conserve ce qu’exige le dossier de mémorisation, comme décrit ci-dessous.',
      privacy: 'Nous gardons votre e-mail et, pour chaque enfant, un surnom, une icône et son dossier de mémorisation seulement — ni âge, ni photo, ni école. Aucun audio n’est gardé, rien n’est partagé, et supprimer le compte efface tout.',
      newPass: 'Nouveau mot de passe', savePass: 'Enregistrer', passSaved: 'Mot de passe enregistré.', signout: 'Se déconnecter',
      family: 'Famille', you: '(vous)', addChild: 'Ajouter un enfant', childName: 'Nom ou surnom', avatar: 'Icône', add: 'Ajouter', open: 'Ouvrir le Mushaf',
      mapBtn: 'Carte', edit: 'Modifier', del: 'Supprimer', delAsk: 'Le profil et tout son dossier seront supprimés définitivement. Tapez le nom pour confirmer :', save: 'Enregistrer', cancel: 'Annuler',
      mastered: 'Maîtrisée', learning: 'En mémorisation', due: 'À réviser', overdue: 'En retard', notStarted: 'Non commencée', today: 'Révision du jour',
      lastPage: 'Dernière position : page', active: 'Jours actifs (7 jours)', avgM: 'Erreurs moyennes par page', week: 'Cette semaine', prev: 'Semaine dernière',
      topM: 'Mots souvent manqués', selfA: 'Auto-évaluation — silencieux (7 jours)', skips: 'Passages sautés (7 jours)', none: 'Rien pour l’instant', page: 'Page', juz: 'Juz', close: 'Fermer', openPage: 'Ouvrir la page',
      lastRec: 'Dernière récitation', mistakes: 'Erreurs', nextRev: 'Prochaine révision', masteryMax: 'Seuil de maîtrise (erreurs par page)', of604: 'sur 604',
      pin: 'Code du profil parent sur cet appareil (4 chiffres, facultatif)', pinSave: 'Enregistrer le code', pinOff: 'Retirer le code', pinAsk: 'Code du profil parent', pinBad: 'Code incorrect.',
      err: 'Une erreur s’est produite ; réessayez.', badLogin: 'E-mail ou mot de passe incorrect.', exists: 'Cet e-mail est déjà inscrit ; connectez-vous ou réinitialisez le mot de passe.',
      weak: 'Mot de passe trop court : 8 caractères au moins.', limit: 'La famille a atteint la limite de 10 profils.', fill: 'Remplissez les champs.', board: 'Suivi',
      delAccount: 'Supprimer le compte', delAccAsk: 'Pour supprimer le compte et tous les dossiers, écrivez-nous depuis la page Avis ; nous le supprimerons sous quelques jours.', settings: 'Réglages',
      unconfirmed: 'E-mail non confirmé : ouvrez d’abord l’e-mail de confirmation.' },
    es: { mailFail: "No se pudo enviar el correo ahora; inténtalo de nuevo en un momento.", title: 'Registro del alumno', sub: 'Una cuenta para la familia y un perfil por hijo: lo que memorizó, recitó y debe repasar, y dónde se detuvo.', back: '← Volver al Mushaf',
      signin: 'Entrar', signup: 'Cuenta nueva', email: 'Correo', password: 'Contraseña', name: 'Tu nombre', go: 'Entrar', create: 'Crear cuenta',
      magic: 'Envíame un enlace de acceso', forgot: 'Olvidé la contraseña', sent: 'Te enviamos un correo; ábrelo y toca el enlace.',
      checkEmail: 'Cuenta creada. Te enviamos un correo de confirmación; toca su enlace y luego entra.', consent: 'Acepto que el sitio guarde lo que necesita el registro de memorización, como se describe abajo.',
      privacy: 'Guardamos tu correo y, de cada hijo, un apodo, un icono y su registro de memorización — sin edad, foto ni escuela. No se guarda audio, nada se comparte y borrar la cuenta lo elimina todo.',
      newPass: 'Nueva contraseña', savePass: 'Guardar contraseña', passSaved: 'Contraseña guardada.', signout: 'Salir',
      family: 'Familia', you: '(tú)', addChild: 'Añadir un hijo', childName: 'Nombre o apodo', avatar: 'Icono', add: 'Añadir', open: 'Abrir el Mushaf',
      mapBtn: 'Mapa', edit: 'Editar', del: 'Borrar', delAsk: 'El perfil y todo su registro se borrarán para siempre. Escribe el nombre para confirmar:', save: 'Guardar', cancel: 'Cancelar',
      mastered: 'Dominada', learning: 'Memorizando', due: 'Toca repasar', overdue: 'Atrasada', notStarted: 'Sin empezar', today: 'Repaso de hoy',
      lastPage: 'Último lugar: página', active: 'Días activos (7 días)', avgM: 'Errores medios por página', week: 'Esta semana', prev: 'Semana pasada',
      topM: 'Palabras que suele fallar', selfA: 'Autoevaluación — en silencio (7 días)', skips: 'Pasajes saltados (7 días)', none: 'Nada aún', page: 'Página', juz: 'Yuz', close: 'Cerrar', openPage: 'Abrir la página',
      lastRec: 'Última recitación', mistakes: 'Errores', nextRev: 'Próximo repaso', masteryMax: 'Límite de dominio (errores por página)', of604: 'de 604',
      pin: 'PIN del perfil del padre en este dispositivo (4 cifras, opcional)', pinSave: 'Guardar PIN', pinOff: 'Quitar PIN', pinAsk: 'PIN del perfil del padre', pinBad: 'PIN incorrecto.',
      err: 'Algo falló; inténtalo de nuevo.', badLogin: 'Correo o contraseña incorrectos.', exists: 'Este correo ya está registrado; entra o restablece la contraseña.',
      weak: 'Contraseña corta: al menos 8 caracteres.', limit: 'La familia llegó al límite de 10 perfiles.', fill: 'Completa los campos.', board: 'Seguimiento',
      delAccount: 'Borrar la cuenta', delAccAsk: 'Para borrar la cuenta y todos los registros, escríbenos desde la página de Opiniones; la borraremos en unos días.', settings: 'Ajustes',
      unconfirmed: 'Correo sin confirmar: abre primero el correo de confirmación.' },
    ru: { mailFail: "Письмо сейчас не удалось отправить; попробуйте чуть позже.", title: 'Журнал ученика', sub: 'Один аккаунт для семьи и профиль для каждого ребёнка: что выучено, прочитано наизусть, что пора повторить и где остановились.', back: '← Назад к Мусхафу',
      signin: 'Вход', signup: 'Новый аккаунт', email: 'Эл. почта', password: 'Пароль', name: 'Ваше имя', go: 'Войти', create: 'Создать аккаунт',
      magic: 'Прислать ссылку для входа', forgot: 'Забыли пароль', sent: 'Мы отправили письмо; откройте его и нажмите ссылку.',
      checkEmail: 'Аккаунт создан. Мы отправили письмо для подтверждения; нажмите ссылку, затем войдите.', consent: 'Я согласен, что сайт хранит то, что нужно для журнала заучивания, как описано ниже.',
      privacy: 'Мы храним вашу почту и для каждого ребёнка только прозвище, значок и журнал заучивания — без возраста, фото и школы. Звук не хранится, ничего не передаётся, удаление аккаунта стирает всё.',
      newPass: 'Новый пароль', savePass: 'Сохранить пароль', passSaved: 'Пароль сохранён.', signout: 'Выйти',
      family: 'Семья', you: '(вы)', addChild: 'Добавить ребёнка', childName: 'Имя или прозвище', avatar: 'Значок', add: 'Добавить', open: 'Открыть Мусхаф',
      mapBtn: 'Карта', edit: 'Изменить', del: 'Удалить', delAsk: 'Профиль и весь его журнал будут удалены навсегда. Введите имя для подтверждения:', save: 'Сохранить', cancel: 'Отмена',
      mastered: 'Выучена', learning: 'Учит', due: 'Пора повторить', overdue: 'Просрочена', notStarted: 'Не начата', today: 'Повторение сегодня',
      lastPage: 'Последнее место: стр.', active: 'Активные дни (7 дней)', avgM: 'Ошибок на страницу в среднем', week: 'Эта неделя', prev: 'Прошлая неделя',
      topM: 'Слова с частыми ошибками', selfA: 'Самооценка — беззвучно (7 дней)', skips: 'Пропущенные места (7 дней)', none: 'Пока ничего', page: 'Стр.', juz: 'Джуз', close: 'Закрыть', openPage: 'Открыть страницу',
      lastRec: 'Последнее чтение', mistakes: 'Ошибки', nextRev: 'Следующее повторение', masteryMax: 'Порог (ошибок на страницу)', of604: 'из 604',
      pin: 'PIN профиля родителя на этом устройстве (4 цифры, по желанию)', pinSave: 'Сохранить PIN', pinOff: 'Убрать PIN', pinAsk: 'PIN профиля родителя', pinBad: 'Неверный PIN.',
      err: 'Что-то пошло не так; попробуйте ещё раз.', badLogin: 'Неверная почта или пароль.', exists: 'Эта почта уже зарегистрирована; войдите или восстановите пароль.',
      weak: 'Пароль короткий: не менее 8 символов.', limit: 'В семье уже 10 профилей — это предел.', fill: 'Заполните поля.', board: 'Успехи',
      delAccount: 'Удалить аккаунт', delAccAsk: 'Чтобы удалить аккаунт и все записи, напишите нам со страницы отзывов; мы удалим его в течение нескольких дней.', settings: 'Настройки',
      unconfirmed: 'Почта не подтверждена: сначала откройте письмо с подтверждением.' }
  };
  var q = new URLSearchParams(location.search), lang = q.get('lang');
  try { if (lang && T[lang]) localStorage.setItem('lt_acc_lang', lang); else lang = localStorage.getItem('lt_acc_lang'); } catch (e) {}
  if (!T[lang]) lang = 'ar';
  var L = T[lang], RTL = lang === 'ar' || lang === 'ur';
  document.documentElement.lang = lang; document.documentElement.dir = RTL ? 'rtl' : 'ltr';
  var BOOK = lang === 'ar' ? '/book/' : '/' + lang + '/book/';
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var DIG = lang === 'ar' ? '٠١٢٣٤٥٦٧٨٩' : lang === 'ur' ? '۰۱۲۳۴۵۶۷۸۹' : null;
  var num = function (n) { var s = String(n); return DIG ? s.replace(/\d/g, function (d) { return DIG[d]; }) : s; };
  var day = function (d) { try { return new Date(d).toLocaleDateString(lang === 'ar' ? 'ar-SA-u-ca-gregory' : lang); } catch (e) { return String(d).slice(0, 10); } };
  $('acTitle').textContent = L.title; $('acSub').textContent = L.sub; $('acBack').textContent = L.back; $('acBack').href = BOOK;
  document.title = L.title + ' — ' + (lang === 'ar' ? 'العهد الأخير' : 'The Last Testament');
  var app = $('acApp');
  // an eye beside each password field, to show what was typed
  var SHOWPW = { ar: ['إظهار كلمة المرور', 'إخفاء كلمة المرور'], ur: ['پاس ورڈ دکھائیں', 'پاس ورڈ چھپائیں'], en: ['Show password', 'Hide password'],
                 fr: ['Afficher le mot de passe', 'Masquer le mot de passe'], es: ['Mostrar la contraseña', 'Ocultar la contraseña'], ru: ['Показать пароль', 'Скрыть пароль'] };
  function eyes() {
    var t = SHOWPW[lang] || SHOWPW.en;
    app.querySelectorAll('input[type=password]').forEach(function (inp) {
      if (inp.parentNode.classList.contains('ac-pw')) return;
      var w = document.createElement('div'); w.className = 'ac-pw'; w.dir = 'ltr';
      inp.parentNode.insertBefore(w, inp); w.appendChild(inp);
      var b = document.createElement('button'); b.type = 'button'; b.className = 'ac-eye'; b.setAttribute('aria-label', t[0]); b.title = t[0];
      b.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.8" d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.8"/><path class="ac-slash" stroke="currentColor" stroke-width="1.8" d="M4 4l16 16"/></svg>';
      b.onclick = function () {
        var show = inp.type === 'password'; inp.type = show ? 'text' : 'password';
        b.classList.toggle('on', show); b.setAttribute('aria-label', t[show ? 1 : 0]); b.title = t[show ? 1 : 0]; inp.focus();
      };
      w.appendChild(b);
    });
  }
  function msg(el, t, bad) { el.textContent = t || ''; el.classList.toggle('err', !!bad); }
  function errText(e) {
    var m = String(e && (e.message || e.code) || e);
    if (/sending|confirmation email|smtp|magic link email|recovery email/i.test(m)) return L.mailFail;
    if (/invalid login/i.test(m)) return L.badLogin;
    if (/already registered|already been registered|user_already_exists/i.test(m)) return L.exists;
    if (/password/i.test(m) && /(short|least|weak)/i.test(m)) return L.weak;
    if (/not confirmed/i.test(m)) return L.unconfirmed;
    if (/profile limit/i.test(m)) return L.limit;
    return L.err;
  }

  /* ---------- signed out: sign in / new account / password reset ---------- */
  function authView(mode) {
    mode = mode || 'in';
    app.innerHTML =
      '<div class="ac-tabs"><button type="button" data-m="in" class="' + (mode === 'in' ? 'on' : '') + '">' + esc(L.signin) + '</button>' +
      '<button type="button" data-m="up" class="' + (mode === 'up' ? 'on' : '') + '">' + esc(L.signup) + '</button></div>' +
      '<form class="fb-card ac-form" novalidate>' +
        (mode === 'up' ? '<label class="fb-label" for="acName">' + esc(L.name) + '</label><input id="acName" autocomplete="name" maxlength="40">' : '') +
        '<label class="fb-label" for="acEmail">' + esc(L.email) + '</label><input id="acEmail" type="email" autocomplete="email" dir="ltr">' +
        '<label class="fb-label" for="acPass">' + esc(L.password) + '</label><input id="acPass" type="password" autocomplete="' + (mode === 'up' ? 'new-password' : 'current-password') + '" dir="ltr" minlength="8">' +
        (mode === 'up' ? '<label class="fb-consent"><input type="checkbox" id="acOk"> <span>' + esc(L.consent) + '</span></label>' : '') +
        '<button class="fb-submit" type="submit">' + esc(mode === 'up' ? L.create : L.go) + '</button>' +
        (mode === 'in' ? '<div class="ac-links"><button type="button" class="ac-link" id="acMagic">' + esc(L.magic) + '</button><button type="button" class="ac-link" id="acForgot">' + esc(L.forgot) + '</button></div>' : '') +
        '<p class="fb-msg" id="acMsg"></p>' +
      '</form><p class="ac-privacy">' + esc(L.privacy) + '</p>';
    app.querySelectorAll('.ac-tabs button').forEach(function (b) { b.onclick = function () { authView(b.dataset.m); }; });
    eyes();
    var form = app.querySelector('form'), m = $('acMsg'), btn = form.querySelector('.fb-submit');
    var redirect = location.origin + '/account/?lang=' + lang;
    form.onsubmit = function (e) {
      e.preventDefault();
      var email = $('acEmail').value.trim(), pass = $('acPass').value;
      if (!email || !pass || (mode === 'up' && (!$('acName').value.trim() || !$('acOk').checked))) return msg(m, L.fill, true);
      if (pass.length < 8 && mode === 'up') return msg(m, L.weak, true);
      btn.disabled = true; msg(m, '');
      Fam.client().then(function (c) {
        if (mode === 'up') return c.auth.signUp({ email: email, password: pass, options: { emailRedirectTo: redirect, data: { name: $('acName').value.trim().slice(0, 40), lang: lang } } })
          .then(function (r) {
            if (r.error) throw r.error;
            if (r.data && r.data.user && r.data.user.identities && !r.data.user.identities.length) throw new Error('already registered');
            if (r.data.session) return home(); app.querySelector('.ac-form').innerHTML = '<p class="fb-thanks">' + esc(L.checkEmail) + '</p>';
          });
        return c.auth.signInWithPassword({ email: email, password: pass }).then(function (r) { if (r.error) throw r.error; return home(); });
      }).catch(function (er) { msg(m, errText(er), true); }).then(function () { btn.disabled = false; });
    };
    if (mode === 'in') {
      $('acMagic').onclick = function () {
        var email = $('acEmail').value.trim(); if (!email) return msg(m, L.fill, true);
        Fam.client().then(function (c) { return c.auth.signInWithOtp({ email: email, options: { emailRedirectTo: redirect, shouldCreateUser: false } }); })
          .then(function (r) { if (r.error) throw r.error; msg(m, L.sent); }).catch(function (er) { msg(m, errText(er), true); });
      };
      $('acForgot').onclick = function () {
        var email = $('acEmail').value.trim(); if (!email) return msg(m, L.fill, true);
        Fam.client().then(function (c) { return c.auth.resetPasswordForEmail(email, { redirectTo: redirect + '&reset=1' }); })
          .then(function (r) { if (r.error) throw r.error; msg(m, L.sent); }).catch(function (er) { msg(m, errText(er), true); });
      };
    }
  }
  function resetView() {
    app.innerHTML = '<form class="fb-card ac-form" novalidate><label class="fb-label" for="acNew">' + esc(L.newPass) + '</label>' +
      '<input id="acNew" type="password" autocomplete="new-password" dir="ltr" minlength="8"><button class="fb-submit" type="submit">' + esc(L.savePass) + '</button><p class="fb-msg" id="acMsg"></p></form>';
    eyes();
    app.querySelector('form').onsubmit = function (e) {
      e.preventDefault();
      var p = $('acNew').value, m = $('acMsg');
      if (p.length < 8) return msg(m, L.weak, true);
      Fam.client().then(function (c) { return c.auth.updateUser({ password: p }); })
        .then(function (r) { if (r.error) throw r.error; msg(m, L.passSaved); history.replaceState(null, '', location.pathname + '?lang=' + lang); setTimeout(home, 900); })
        .catch(function (er) { msg(m, errText(er), true); });
    };
  }

  /* ---------- signed in: the family ---------- */
  var PAGES = null;
  function pages() { return PAGES || (PAGES = fetch('/data/quran-pages.json').then(function (r) { return r.json(); })); }
  var today = function () { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); };

  function home() {
    app.innerHTML = '<p class="ac-wait">…</p>';
    return Fam.client().then(function (c) {
      return c.auth.getUser().then(function (u) {
        var user = u.data && u.data.user;
        if (!user) return authView('in');
        var meta = user.user_metadata || {};
        return Fam.ensureParent(meta.name || user.email.split('@')[0]).then(function (list) {
          return c.from('page_state').select('profile_id,page,state,stage,due,last_recited,last_mistakes').then(function (ps) {
            if (ps.error) throw ps.error;
            render(c, user, list, ps.data || []);
          });
        });
      });
    }).catch(function (e) { app.innerHTML = '<p class="fb-msg err">' + esc(errText(e)) + '</p>'; });
  }
  function counts(states, pid) {
    var t = today(), r = { mastered: 0, learning: 0, due: 0, overdue: 0 };
    var od = new Date(); od.setDate(od.getDate() - 3); var ods = od.toISOString().slice(0, 10);
    states.forEach(function (s) {
      if (s.profile_id !== pid) return;
      if (s.state === 'mastered') { r.mastered++; if (s.due && s.due <= t) { r.due++; if (s.due < ods) r.overdue++; } } else r.learning++;
    });
    return r;
  }
  function render(c, user, list, states) {
    var cur = Fam.current();
    if (!cur || !list.some(function (p) { return p.id === cur.id; })) { Fam.use(list[0]); cur = Fam.current(); }
    var html = '<div class="ac-head"><span>' + esc(user.email) + '</span><button type="button" class="ac-link" id="acOut">' + esc(L.signout) + '</button></div>' +
      '<h2 class="ac-h2">' + esc(L.family) + '</h2><div class="ac-cards">';
    list.forEach(function (p) {
      var k = counts(states, p.id);
      html += '<div class="ac-card' + (cur && cur.id === p.id ? ' cur' : '') + '" data-id="' + p.id + '">' +
        '<div class="ac-av" style="' + (p.color ? 'background:' + p.color : '') + '">' + Fam.avatar(p.avatar) + '</div>' +
        '<div class="ac-cbody"><b>' + esc(p.name) + (p.is_parent ? ' <small>' + esc(L.you) + '</small>' : '') + '</b>' +
        '<div class="ac-stats">' + (k.mastered || k.learning ? '<span class="st-m">' + num(k.mastered) + ' ' + esc(L.mastered) + '</span>' : '<span class="st-n">' + esc(L.notStarted) + '</span>') +
        (k.learning ? '<span class="st-l">' + num(k.learning) + ' ' + esc(L.learning) + '</span>' : '') +
        (k.due ? '<span class="st-d">' + esc(L.today) + ': ' + num(k.due) + '</span>' : '') + '</div>' +
        (p.last_page ? '<div class="ac-last">' + esc(L.lastPage) + ' ' + num(p.last_page) + '</div>' : '') +
        '<div class="ac-plan" data-plan="' + p.id + '"></div>' +
        '<div class="ac-read" data-read="' + p.id + '"></div>' +
        '<div class="ac-btns"><button type="button" data-a="open" class="ac-btn pri">' + esc(L.open) + '</button>' +
        '<button type="button" data-a="plan" class="ac-btn">' + esc(PlanUI.T[lang].planLine) + '</button>' +
        '<button type="button" data-a="map" class="ac-btn">' + esc(L.mapBtn) + '</button>' +
        '<button type="button" data-a="edit" class="ac-btn">' + esc(L.edit) + '</button></div></div></div>';
    });
    html += '</div>';
    if (list.length < 10) html += '<form class="fb-card ac-add" novalidate><b>' + esc(L.addChild) + '</b>' +
      '<label class="fb-label" for="acCN">' + esc(L.childName) + '</label><input id="acCN" maxlength="20">' +
      '<span class="fb-label">' + esc(L.avatar) + '</span><div class="ac-avs">' +
      Object.keys(Fam.avatars).map(function (k, i) { return '<button type="button" data-av="' + k + '"' + (i === 1 ? ' class="on"' : '') + '>' + Fam.avatars[k] + '</button>'; }).join('') +
      '</div><button class="fb-submit" type="submit">' + esc(L.add) + '</button><p class="fb-msg" id="acAM"></p></form>';
    html += '<div id="acRead"></div><div id="acPanel"></div>' +
      '<details class="ac-set"><summary>' + esc(L.settings) + '</summary><div class="fb-card">' +
      '<label class="fb-label" for="acPin">' + esc(L.pin) + '</label><input id="acPin" inputmode="numeric" maxlength="4" dir="ltr" autocomplete="off">' +
      '<div class="ac-btns"><button type="button" class="ac-btn pri" id="acPinS">' + esc(L.pinSave) + '</button>' +
      (Fam.pinSet() ? '<button type="button" class="ac-btn" id="acPinO">' + esc(L.pinOff) + '</button>' : '') + '</div><p class="fb-msg" id="acPM"></p>' +
      '<p class="ac-privacy">' + esc(L.privacy) + '</p><p class="ac-privacy"><b>' + esc(L.delAccount) + ':</b> ' + esc(L.delAccAsk) + '</p></div></details>';
    app.innerHTML = html;
    $('acOut').onclick = function () { Fam.signOut().then(function () { authView('in'); }); };
    app.querySelectorAll('.ac-card').forEach(function (card) {
      var p = list.filter(function (x) { return x.id === card.dataset.id; })[0];
      card.querySelector('[data-a=open]').onclick = function () { guard(p, function () { Fam.use(p); location.href = BOOK + (p.last_page ? '#p=' + p.last_page : ''); }); };
      card.querySelector('[data-a=map]').onclick = function () { guard(p, function () { mapView(c, p, states); }); };
      // plans are made and followed in the Mushaf («خططي»): the parent's own profile shows his children's plans
      card.querySelector('[data-a=plan]').onclick = function () { location.href = BOOK + (BOOK.indexOf('?') < 0 ? '?' : '&') + 's=plans'; };
      card.querySelector('[data-a=edit]').onclick = function () { guard(null, function () { editView(c, p); }); };
    });
    var add = app.querySelector('.ac-add');
    if (add) {
      var av = 'moon';
      add.querySelectorAll('.ac-avs button').forEach(function (b) { b.onclick = function () { av = b.dataset.av; add.querySelectorAll('.ac-avs button').forEach(function (x) { x.classList.toggle('on', x === b); }); }; });
      add.onsubmit = function (e) {
        e.preventDefault();
        var n = $('acCN').value.trim(); if (!n) return msg($('acAM'), L.fill, true);
        c.from('family_profiles').insert({ name: n.slice(0, 20), avatar: av }).then(function (r) { if (r.error) throw r.error; home(); })
          .catch(function (er) { msg($('acAM'), errText(er), true); });
      };
    }
    $('acPinS').onclick = function () {
      var v = $('acPin').value.trim();
      if (!/^\d{4}$/.test(v)) return msg($('acPM'), L.fill, true);
      guard(null, function () { Fam.pinSave(v).then(function () { msg($('acPM'), '✓'); home(); }); });
    };
    if ($('acPinO')) $('acPinO').onclick = function () { guard(null, function () { Fam.pinSave(null).then(home); }); };
    var cp = list.filter(function (x) { return cur && x.id === cur.id; })[0];
    if (cp) mapView(c, cp, states, true);
    planLines(list);
    readLines(list, cur);
  }
  // reading statistics (js/readstats.js): this week's pages and letters on each card; the whole card for the profile in use
  function readLines(list, cur) {
    if (!window.ReadStats) return;
    ReadStats.sumMany(list.map(function (p) { return p.id; })).then(function (m) {
      Object.keys(m).forEach(function (pid) {
        var el = app.querySelector('.ac-read[data-read="' + pid + '"]'); if (!el) return;
        el.textContent = m[pid].year.pages ? ReadStats.line(m[pid], lang) : '';
      });
      var box = $('acRead'), p = list.filter(function (x) { return cur && x.id === cur.id; })[0];
      if (box && p && m[p.id]) {
        box.innerHTML = '<p class="ac-rname">' + esc(p.name) + '</p>' + ReadStats.html(m[p.id], lang);
        ReadStats.wire(box);
      }
    });
  }
  // each card's plan line: lessons done and how far behind
  function planLines(list) {
    return;     // the study plan moved into the Mushaf's plans (js/plans.js)
    PlanUI.summary(list.map(function (p) { return p.id; })).then(function (m) {
      Object.keys(m).forEach(function (pid) {
        var el = app.querySelector('.ac-plan[data-plan="' + pid + '"]'); if (!el) return;
        el.textContent = PlanUI.summaryText(m[pid], lang, num);
        el.classList.toggle('late', m[pid].behind > 0);
      });
    });
  }
  function planView(p) {
    PlanUI.open($('acPanel'), { profile: p, lang: lang, num: num, esc: esc, book: BOOK, msg: msg,
      guard: function (fn) { guard(null, fn); },
      onChange: function () { Fam.profiles().then(planLines); } });
  }
  // the parent's profile (and settings, editing) behind the device PIN, when one is set and a child's profile is in use
  // (each profile may have its own code, set in the Mushaf's «حسابي»: asked before opening it, the parent's before his settings)
  function guard(p, then) {
    Fam.profiles().then(function (list) {
      var t = p || list.filter(function (x) { return x.is_parent; })[0];
      return Fam.guard(t, function () { return prompt(L.pinAsk + (t ? ' — ' + t.name : '')); });
    }).then(function (ok) { if (ok) then(); else if (ok === false) alert(L.pinBad); }).catch(function () { then(); });
  }
  function editView(c, p) {
    var pan = $('acPanel');
    pan.innerHTML = '<form class="fb-card ac-edit" novalidate><b>' + Fam.avatar(p.avatar) + ' ' + esc(p.name) + '</b>' +
      '<label class="fb-label" for="acEN">' + esc(L.childName) + '</label><input id="acEN" maxlength="20" value="' + esc(p.name) + '">' +
      '<span class="fb-label">' + esc(L.avatar) + '</span><div class="ac-avs">' +
      Object.keys(Fam.avatars).map(function (k) { return '<button type="button" data-av="' + k + '"' + (k === p.avatar ? ' class="on"' : '') + '>' + Fam.avatars[k] + '</button>'; }).join('') + '</div>' +
      '<label class="fb-label" for="acEM">' + esc(L.masteryMax) + '</label><input id="acEM" type="number" min="0" max="20" dir="ltr" value="' + p.mastery_max + '">' +
      '<div class="ac-btns"><button class="fb-submit" type="submit">' + esc(L.save) + '</button><button type="button" class="ac-btn" id="acEC">' + esc(L.cancel) + '</button>' +
      (p.is_parent ? '' : '<button type="button" class="ac-btn del" id="acED">' + esc(L.del) + '</button>') + '</div><p class="fb-msg" id="acEMsg"></p></form>';
    pan.scrollIntoView({ behavior: 'smooth', block: 'start' });
    var av = p.avatar, f = pan.querySelector('form');
    f.querySelectorAll('.ac-avs button').forEach(function (b) { b.onclick = function () { av = b.dataset.av; f.querySelectorAll('.ac-avs button').forEach(function (x) { x.classList.toggle('on', x === b); }); }; });
    $('acEC').onclick = function () { pan.innerHTML = ''; };
    f.onsubmit = function (e) {
      e.preventDefault();
      var n = $('acEN').value.trim(), mm = Math.max(0, Math.min(20, parseInt($('acEM').value, 10) || 0));
      if (!n) return msg($('acEMsg'), L.fill, true);
      c.from('family_profiles').update({ name: n.slice(0, 20), avatar: av, mastery_max: mm }).eq('id', p.id)
        .then(function (r) { if (r.error) throw r.error; var cur = Fam.current(); if (cur && cur.id === p.id) Fam.use(Object.assign({}, p, { name: n, avatar: av })); home(); })
        .catch(function (er) { msg($('acEMsg'), errText(er), true); });
    };
    if ($('acED')) $('acED').onclick = function () {
      var v = prompt(L.delAsk + ' ' + p.name);
      if (v == null || v.trim() !== p.name.trim()) return;
      c.from('family_profiles').delete().eq('id', p.id).then(function (r) {
        if (r.error) throw r.error; var cur = Fam.current(); if (cur && cur.id === p.id) Fam.use(null); home();
      }).catch(function (er) { msg($('acEMsg'), errText(er), true); });
    };
  }

  /* ---------- a profile's map and board ---------- */
  function mapView(c, p, allStates, quiet) {
    var pan = $('acPanel');
    var st = {}; allStates.forEach(function (s) { if (s.profile_id === p.id) st[s.page] = s; });
    var t = today(), od = new Date(); od.setDate(od.getDate() - 3); var ods = od.toISOString().slice(0, 10);
    var cls = function (s) { if (!s) return 'n'; if (s.state !== 'mastered') return 'l'; if (s.due && s.due < ods) return 'o'; if (s.due && s.due <= t) return 'd'; return 'm'; };
    pages().then(function (M) {
      var k = counts(allStates, p.id);
      var html = '<div class="fb-card ac-map"><div class="ac-maphead"><span class="ac-av sm">' + Fam.avatar(p.avatar) + '</span><b>' + esc(p.name) + '</b>' +
        '<span class="ac-big">' + num(k.mastered) + ' <small>' + esc(L.of604) + '</small></span></div>' +
        '<div class="ac-legend"><span class="lg m">' + esc(L.mastered) + '</span><span class="lg d">' + esc(L.due) + '</span><span class="lg o">' + esc(L.overdue) + '</span>' +
        '<span class="lg l">' + esc(L.learning) + '</span><span class="lg n">' + esc(L.notStarted) + '</span></div><div class="ac-grid">';
      for (var j = 1; j <= 30; j++) {
        html += '<div class="ac-juz"><span class="jn">' + num(j) + '</span><div class="cells">';
        for (var pg = 1; pg <= 604; pg++) if (M.juz[pg - 1] === j) html += '<button type="button" class="c ' + cls(st[pg]) + '" data-p="' + pg + '" title="' + esc(L.page) + ' ' + pg + '"></button>';
        html += '</div></div>';
      }
      html += '</div><div id="acCell"></div></div><div class="fb-card ac-board" id="acBoard"><b>' + esc(L.board) + '</b><p class="ac-wait">…</p></div>';
      pan.innerHTML = html;
      if (!quiet) pan.scrollIntoView({ behavior: 'smooth', block: 'start' });
      pan.querySelectorAll('.ac-grid .c').forEach(function (b) {
        b.onclick = function () {
          var pg = +b.dataset.p, s = st[pg];
          $('acCell').innerHTML = '<div class="ac-cell"><b>' + esc(L.page) + ' ' + num(pg) + '</b> · ' + esc(L[{ m: 'mastered', d: 'due', o: 'overdue', l: 'learning', n: 'notStarted' }[cls(s)]]) +
            (s && s.last_recited ? '<br>' + esc(L.lastRec) + ': ' + esc(day(s.last_recited)) + (s.last_mistakes != null ? ' · ' + esc(L.mistakes) + ': ' + num(s.last_mistakes) : '') : '') +
            (s && s.due ? '<br>' + esc(L.nextRev) + ': ' + esc(day(s.due)) : '') +
            '<div class="ac-btns"><a class="ac-btn pri" href="' + BOOK + '#p=' + pg + '">' + esc(L.openPage) + '</a></div></div>';
          $('acCell').querySelector('a').onclick = function () { Fam.use(p); };
        };
      });
      board(c, p, M);
    });
  }
  function board(c, p, M) {
    var since = new Date(); since.setDate(since.getDate() - 14);
    var s60 = new Date(); s60.setDate(s60.getDate() - 60);
    Promise.all([
      c.from('recite_sessions').select('kind,page,mistakes,complete,created_at').eq('profile_id', p.id).gte('created_at', since.toISOString()).order('created_at', { ascending: false }).limit(500),
      c.from('recite_mistakes').select('loc,kind,created_at').eq('profile_id', p.id).gte('created_at', s60.toISOString()).limit(1000)
    ]).then(function (r) {
      var S = (r[0].data || []), X = (r[1].data || []);
      var now = Date.now(), d7 = now - 7 * 864e5, days = {}, a = [0, 0], b = [0, 0];
      S.forEach(function (s) {
        var t = new Date(s.created_at).getTime();
        if (t >= d7) days[s.created_at.slice(0, 10)] = 1;
        if (s.kind === 'recite' && s.complete) { if (t >= d7) { a[0] += s.mistakes || 0; a[1]++; } else { b[0] += s.mistakes || 0; b[1]++; } }
      });
      var avg = function (x) { return x[1] ? (Math.round(x[0] / x[1] * 10) / 10) : null; };
      // the two kinds apart: words (said wrong, left out) and places passed over — one place per run of words passed
      // over together in one recitation (stored a row per word), counted for the last seven days
      var cnt = {}, skB = {}, selfN = 0;
      X.forEach(function (x) {
        if (x.kind === 'self' && new Date(x.created_at).getTime() >= d7) selfN++;
        if (x.kind === 'skip') { if (new Date(x.created_at).getTime() >= d7) (skB[x.created_at] = skB[x.created_at] || []).push(x.loc); return; }
        cnt[x.loc] = (cnt[x.loc] || 0) + 1;
      });
      var skips = 0;
      Object.keys(skB).forEach(function (t) {
        var xs = skB[t].map(function (l) { return l.split(':').map(Number); }).sort(function (a2, b2) { return a2[0] - b2[0] || a2[1] - b2[1] || a2[2] - b2[2]; }), pv = null;
        xs.forEach(function (x) { if (!(pv && x[0] === pv[0] && ((x[1] === pv[1] && x[2] === pv[2] + 1) || (x[1] === pv[1] + 1 && x[2] === 1)))) skips++; pv = x; });
      });
      var top = Object.keys(cnt).sort(function (x, y) { return cnt[y] - cnt[x]; }).slice(0, 8);
      var el = $('acBoard'); if (!el) return;
      el.innerHTML = '<b>' + esc(L.board) + '</b><div class="ac-kpis">' +
        '<div><span>' + esc(L.active) + '</span><b>' + num(Object.keys(days).length) + '</b></div>' +
        '<div><span>' + esc(L.avgM) + ' — ' + esc(L.week) + '</span><b>' + (avg(a) == null ? '—' : num(avg(a))) + '</b></div>' +
        '<div><span>' + esc(L.avgM) + ' — ' + esc(L.prev) + '</span><b>' + (avg(b) == null ? '—' : num(avg(b))) + '</b></div>' +
        '<div><span>' + esc(L.skips) + '</span><b>' + num(skips) + '</b></div>' +
        (selfN ? '<div><span>' + esc(L.selfA) + '</span><b>' + num(selfN) + '</b></div>' : '') +
        (p.last_page ? '<div><span>' + esc(L.lastPage) + '</span><b>' + num(p.last_page) + '</b></div>' : '') + '</div>' +
        '<span class="fb-label">' + esc(L.topM) + '</span><div class="ac-words" id="acWords">' + (top.length ? '…' : esc(L.none)) + '</div>';
      if (!top.length) return;
      // each word as it stands in the Mushaf (its page file), with its place
      var pageOf = function (s, a2) { var k = s * 1000 + a2; for (var i = 0; i < M.pages.length; i++) { var pp = M.pages[i]; if (k >= pp[0] * 1000 + pp[1] && k <= pp[2] * 1000 + pp[3]) return i + 1; } return 1; };
      Promise.all(top.map(function (loc) {
        var x = loc.split(':'), pg = pageOf(+x[0], +x[1]);
        return fetch('/data/mushaf/p' + pg + '.json').then(function (r) { return r.json(); }).then(function (d) {
          var w = ''; (d.l || []).forEach(function (L2) { if (L2[2] && L2[2].forEach) L2[2].forEach(function (y) { if (y[1] === loc) w = y[2] || ''; }); });
          return { loc: loc, pg: pg, w: w };
        }).catch(function () { return { loc: loc, pg: pg, w: '' }; });
      })).then(function (ws) {
        var box = $('acWords'); if (!box) return;
        box.innerHTML = ws.map(function (w) {
          var x = w.loc.split(':');
          return '<a class="ac-word" href="' + BOOK + '#p=' + w.pg + '"><span class="ar" lang="ar">' + esc(w.w || '…') + '</span><small>' + num(x[0]) + ':' + num(x[1]) + ' · ×' + num(cnt[w.loc]) + '</small></a>';
        }).join('');
        box.querySelectorAll('a').forEach(function (a2) { a2.onclick = function () { Fam.use(p); }; });
      });
    });
  }

  /* ---------- start ---------- */
  var resetting = q.get('reset') === '1' || /type=recovery/.test(location.hash);
  Fam.client().then(function (c) {
    c.auth.onAuthStateChange(function (ev) { if (ev === 'PASSWORD_RECOVERY') { resetting = true; resetView(); } });
    return c.auth.getSession().then(function (r) {
      if (resetting && r.data.session) return resetView();
      if (r.data.session) return home();
      authView(q.get('m') === 'up' ? 'up' : 'in');
    });
  }).catch(function () { app.innerHTML = '<p class="fb-msg err">' + esc(L.err) + '</p>'; });
})();
