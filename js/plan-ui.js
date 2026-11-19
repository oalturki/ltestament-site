/* The study plan on the account page: set it up, see the dated table, mark lessons, edit a lesson or a day.
   PlanUI.open(panel, {c, profile, lang, num, esc, guard, book, onChange})   the plan of one child, in the panel
   PlanUI.summary(profileIds) -> Promise<{id: {done, total, behind, next}}>   a line for each card
   Engine and storage: js/plan.js. */
(function () {
  var T = {
    ar: { past: 'اعتبار دروس الأيام الماضية منجزة ({n})', pastAsk: 'تعليم {n} من دروس الأيام الماضية بأنها سُمّعت؟ يفيد إذا بدأ المنهج قبل تسجيله هنا.', imp: 'استيراد خطة المدرسة بالذكاء الاصطناعي', imp1: '١. انسخ التعليمات، ثم افتح أي ذكاء اصطناعي (ChatGPT أو Claude أو غيرهما)، وأرفق ملف الخطة، والصق التعليمات.', imp2: '٢. انسخ ردّه كاملًا والصقه هنا:', impCopy: 'نسخ التعليمات', impCopied: 'نُسخت التعليمات.', impRead: 'قراءة الخطة', impOk: 'قُرئت الخطة (عدد الدروس: {n}). راجع الجدول ثم احفظ.', impBad: 'لم أفهم الأسطر:', impNone: 'لم أجد أيام دراسة في النص.', title: 'المنهج المقرر', none: 'لم يُحدَّد منهج بعد. حدّد ما يحفظه الابن ومقداره اليومي، فيُولَّد جدول بالتواريخ تعدّل فيه ما تشاء.',
      setup: 'تحديد المنهج', newFrom: 'يبدأ الحفظ من', newTo: 'وينتهي عند', surah: 'السورة', ayah: 'الآية', ord: 'الترتيب',
      ordM: 'بترتيب المصحف', ordR: 'عكسي بالسور (الناس ← … أو الصف ← الممتحنة …)', amount: 'مقدار الحفظ اليومي', lines: 'أسطر', ayat: 'آيات',
      linesHint: 'الوجه ١٥ سطرًا؛ لا تُقطع الآية أبدًا.', days: 'أيام الدراسة', start: 'تاريخ البدء', oldT: 'المحفوظ سابقًا (للمراجعة البعيدة) — اختياري',
      oldFrom: 'من سورة', oldTo: 'إلى سورة', oldDays: 'تُقسَّم المراجعة البعيدة على', daysW: 'أيام', recentN: 'المراجعة القريبة: آخر', lessonsW: 'دروس',
      file: 'ملف خطة المدرسة أو الحلقة (PDF أو صورة) — اختياري', fileOpen: 'ملف الخطة', preview: 'إنشاء الجدول', save: 'حفظ المنهج', cancel: 'إلغاء',
      edit: 'تعديل المنهج', end: 'إنهاء المنهج', endAsk: 'إنهاء هذا المنهج؟ يبقى سجله، ويمكن تحديد منهج جديد.',
      done: 'أنجز', of: 'من', lessonsN: 'دروس', behind: 'متأخر', ahead: 'متقدم', onTrack: 'في موعده', finished: 'أتمّ المنهج، بارك الله فيه.',
      wird: 'ورد اليوم', recent: 'المراجعة القريبة', fresh: 'الحفظ الجديد', distant: 'المراجعة البعيدة', date: 'التاريخ',
      off: 'إجازة', fix: 'ضبط وتثبيت', exam: 'اختبار', normal: 'يوم دراسي', dayKind: 'نوع اليوم', mark: 'سمّع للمحفّظ', unmark: 'إلغاء الإنجاز',
      auto: 'بالتسميع', manual: 'سجّله الأب', lessonEnd: 'ينتهي هذا الدرس عند', applyEnd: 'تطبيق (تتعدّل الدروس بعده)', open: 'افتح في المصحف',
      ends: 'ينتهي المنهج تقريبًا في', wd: ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'],
      fill: 'أكمل الحقول.', err: 'تعذّر الحفظ؛ أعد المحاولة.', saved: 'حُفظ.', more: 'عرض بقية الجدول', planLine: 'المنهج' },
    en: { past: 'Mark past days’ lessons as done ({n})', pastAsk: 'Mark {n} lessons from past days as recited? Useful when the plan began before it was set up here.', imp: 'Import the school’s plan with AI', imp1: '1. Copy the instructions, open any AI (ChatGPT, Claude…), attach the plan file and paste the instructions.', imp2: '2. Copy its whole reply and paste it here:', impCopy: 'Copy the instructions', impCopied: 'Instructions copied.', impRead: 'Read the plan', impOk: 'Plan read: {n} lessons. Check the table, then save.', impBad: 'Could not read lines:', impNone: 'No study days found in the text.', title: 'Study plan', none: 'No plan yet. Set what your child memorizes and how much each day, and a dated table is made that you can edit.',
      setup: 'Set the plan', newFrom: 'Memorization starts at', newTo: 'and ends at', surah: 'Surah', ayah: 'Verse', ord: 'Order',
      ordM: 'Mushaf order', ordR: 'Surahs in reverse (An-Nas ← … or As-Saff ← Al-Mumtahanah …)', amount: 'New memorization each day', lines: 'lines', ayat: 'verses',
      linesHint: 'A page is 15 lines; a verse is never cut.', days: 'Study days', start: 'Start date', oldT: 'Already memorized (for long review) — optional',
      oldFrom: 'From surah', oldTo: 'To surah', oldDays: 'Long review spread over', daysW: 'days', recentN: 'Recent review: the last', lessonsW: 'lessons',
      file: 'The school’s or circle’s plan (PDF or image) — optional', fileOpen: 'Plan file', preview: 'Make the table', save: 'Save the plan', cancel: 'Cancel',
      edit: 'Edit the plan', end: 'End the plan', endAsk: 'End this plan? Its record stays and you can set a new one.',
      done: 'Done', of: 'of', lessonsN: 'lessons', behind: 'Behind by', ahead: 'Ahead by', onTrack: 'On schedule', finished: 'Plan completed — may God bless him.',
      wird: 'Today', recent: 'Recent review', fresh: 'New memorization', distant: 'Long review', date: 'Date',
      off: 'Holiday', fix: 'Consolidation', exam: 'Exam', normal: 'Study day', dayKind: 'Day type', mark: 'Recited to the teacher', unmark: 'Undo',
      auto: 'by recitation', manual: 'marked by parent', lessonEnd: 'This lesson ends at', applyEnd: 'Apply (later lessons adjust)', open: 'Open in the Mushaf',
      ends: 'The plan ends around', wd: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
      fill: 'Fill in the fields.', err: 'Could not save; try again.', saved: 'Saved.', more: 'Show the rest of the table', planLine: 'Plan' },
    ur: { past: 'گزشتہ دنوں کے اسباق مکمل مانیں ({n})', pastAsk: 'گزشتہ دنوں کے {n} اسباق مکمل درج کریں؟', imp: 'مدرسے کا منصوبہ مصنوعی ذہانت سے درآمد کریں', imp1: '۱۔ ہدایات نقل کریں، کوئی بھی مصنوعی ذہانت کھولیں، منصوبے کی فائل منسلک کریں اور ہدایات چسپاں کریں۔', imp2: '۲۔ اس کا پورا جواب یہاں چسپاں کریں:', impCopy: 'ہدایات نقل کریں', impCopied: 'ہدایات نقل ہو گئیں۔', impRead: 'منصوبہ پڑھیں', impOk: 'منصوبہ پڑھ لیا: {n} اسباق۔ جدول دیکھ کر محفوظ کریں۔', impBad: 'یہ سطریں سمجھ نہیں آئیں:', impNone: 'متن میں پڑھائی کے دن نہیں ملے۔', title: 'مقررہ نصاب', none: 'ابھی نصاب مقرر نہیں۔ بچہ کیا یاد کرے اور روزانہ کتنا، یہ طے کریں تو تاریخوں والا جدول بن جائے گا جس میں آپ ترمیم کر سکیں گے۔',
      setup: 'نصاب مقرر کریں', newFrom: 'حفظ یہاں سے شروع', newTo: 'اور یہاں ختم', surah: 'سورت', ayah: 'آیت', ord: 'ترتیب',
      ordM: 'مصحف کی ترتیب', ordR: 'سورتیں الٹی ترتیب سے', amount: 'روزانہ نیا حفظ', lines: 'سطریں', ayat: 'آیات',
      linesHint: 'ایک صفحہ ۱۵ سطریں؛ آیت کبھی نہیں کٹتی۔', days: 'پڑھائی کے دن', start: 'آغاز کی تاریخ', oldT: 'پہلے سے یاد (دور کی دہرائی کے لیے) — اختیاری',
      oldFrom: 'سورت سے', oldTo: 'سورت تک', oldDays: 'دور کی دہرائی تقسیم ہو', daysW: 'دنوں پر', recentN: 'قریبی دہرائی: آخری', lessonsW: 'اسباق',
      file: 'مدرسے یا حلقے کا منصوبہ (PDF یا تصویر) — اختیاری', fileOpen: 'منصوبے کی فائل', preview: 'جدول بنائیں', save: 'نصاب محفوظ کریں', cancel: 'منسوخ',
      edit: 'نصاب میں ترمیم', end: 'نصاب ختم کریں', endAsk: 'یہ نصاب ختم کریں؟ اس کا ریکارڈ باقی رہے گا۔',
      done: 'مکمل', of: 'از', lessonsN: 'اسباق', behind: 'پیچھے', ahead: 'آگے', onTrack: 'وقت پر', finished: 'نصاب مکمل، اللہ برکت دے۔',
      wird: 'آج کا ورد', recent: 'قریبی دہرائی', fresh: 'نیا حفظ', distant: 'دور کی دہرائی', date: 'تاریخ',
      off: 'چھٹی', fix: 'پختگی کا دن', exam: 'امتحان', normal: 'پڑھائی کا دن', dayKind: 'دن کی قسم', mark: 'استاد کو سنا دیا', unmark: 'واپس',
      auto: 'تلاوت سے', manual: 'والد نے درج کیا', lessonEnd: 'یہ سبق یہاں ختم', applyEnd: 'لاگو کریں (بعد کے اسباق بدل جائیں گے)', open: 'مصحف میں کھولیں',
      ends: 'نصاب تقریباً ختم ہوگا', wd: ['اتوار', 'پیر', 'منگل', 'بدھ', 'جمعرات', 'جمعہ', 'ہفتہ'],
      fill: 'خانے پُر کریں۔', err: 'محفوظ نہ ہو سکا؛ دوبارہ کوشش کریں۔', saved: 'محفوظ ہو گیا۔', more: 'باقی جدول دکھائیں', planLine: 'نصاب' },
    fr: { past: 'Marquer les leçons passées comme faites ({n})', pastAsk: 'Marquer {n} leçons passées comme récitées ?', imp: 'Importer le programme de l’école avec une IA', imp1: '1. Copiez les instructions, ouvrez une IA (ChatGPT, Claude…), joignez le fichier et collez les instructions.', imp2: '2. Copiez toute sa réponse et collez-la ici :', impCopy: 'Copier les instructions', impCopied: 'Instructions copiées.', impRead: 'Lire le programme', impOk: 'Programme lu : {n} leçons. Vérifiez le tableau puis enregistrez.', impBad: 'Lignes illisibles :', impNone: 'Aucun jour d’étude trouvé.', title: 'Programme', none: 'Aucun programme. Indiquez ce que votre enfant mémorise et combien par jour : un tableau daté est créé, que vous pouvez modifier.',
      setup: 'Définir le programme', newFrom: 'La mémorisation commence à', newTo: 'et se termine à', surah: 'Sourate', ayah: 'Verset', ord: 'Ordre',
      ordM: 'Ordre du Mushaf', ordR: 'Sourates à rebours', amount: 'Mémorisation par jour', lines: 'lignes', ayat: 'versets',
      linesHint: 'Une page fait 15 lignes ; un verset n’est jamais coupé.', days: 'Jours d’étude', start: 'Date de début', oldT: 'Déjà mémorisé (révision lointaine) — facultatif',
      oldFrom: 'De la sourate', oldTo: 'À la sourate', oldDays: 'Révision lointaine répartie sur', daysW: 'jours', recentN: 'Révision récente : les', lessonsW: 'dernières leçons',
      file: 'Programme de l’école ou du cercle (PDF ou image) — facultatif', fileOpen: 'Fichier du programme', preview: 'Créer le tableau', save: 'Enregistrer', cancel: 'Annuler',
      edit: 'Modifier', end: 'Terminer le programme', endAsk: 'Terminer ce programme ? Son historique est conservé.',
      done: 'Fait', of: 'sur', lessonsN: 'leçons', behind: 'En retard de', ahead: 'En avance de', onTrack: 'À jour', finished: 'Programme achevé — qu’Allah le bénisse.',
      wird: 'Aujourd’hui', recent: 'Révision récente', fresh: 'Nouvelle mémorisation', distant: 'Révision lointaine', date: 'Date',
      off: 'Congé', fix: 'Consolidation', exam: 'Examen', normal: 'Jour d’étude', dayKind: 'Type de jour', mark: 'Récité au maître', unmark: 'Annuler',
      auto: 'par récitation', manual: 'noté par le parent', lessonEnd: 'Cette leçon se termine à', applyEnd: 'Appliquer (les leçons suivantes s’ajustent)', open: 'Ouvrir dans le Mushaf',
      ends: 'Fin prévue vers', wd: ['dim', 'lun', 'mar', 'mer', 'jeu', 'ven', 'sam'],
      fill: 'Remplissez les champs.', err: 'Échec ; réessayez.', saved: 'Enregistré.', more: 'Voir la suite du tableau', planLine: 'Programme' },
    es: { past: 'Marcar como hechas las lecciones pasadas ({n})', pastAsk: '¿Marcar {n} lecciones pasadas como recitadas?', imp: 'Importar el plan de la escuela con IA', imp1: '1. Copia las instrucciones, abre una IA (ChatGPT, Claude…), adjunta el archivo y pega las instrucciones.', imp2: '2. Copia toda su respuesta y pégala aquí:', impCopy: 'Copiar las instrucciones', impCopied: 'Instrucciones copiadas.', impRead: 'Leer el plan', impOk: 'Plan leído: {n} lecciones. Revisa la tabla y guarda.', impBad: 'No se entendieron las líneas:', impNone: 'No hay días de estudio en el texto.', title: 'Plan de estudio', none: 'Aún no hay plan. Indica qué memoriza tu hijo y cuánto al día, y se crea una tabla con fechas que puedes editar.',
      setup: 'Fijar el plan', newFrom: 'La memorización empieza en', newTo: 'y termina en', surah: 'Sura', ayah: 'Versículo', ord: 'Orden',
      ordM: 'Orden del Mushaf', ordR: 'Suras en orden inverso', amount: 'Memorización diaria', lines: 'líneas', ayat: 'versículos',
      linesHint: 'Una página tiene 15 líneas; nunca se corta un versículo.', days: 'Días de estudio', start: 'Fecha de inicio', oldT: 'Ya memorizado (repaso lejano) — opcional',
      oldFrom: 'Desde la sura', oldTo: 'Hasta la sura', oldDays: 'Repaso lejano repartido en', daysW: 'días', recentN: 'Repaso reciente: las últimas', lessonsW: 'lecciones',
      file: 'Plan de la escuela o del círculo (PDF o imagen) — opcional', fileOpen: 'Archivo del plan', preview: 'Crear la tabla', save: 'Guardar el plan', cancel: 'Cancelar',
      edit: 'Editar el plan', end: 'Terminar el plan', endAsk: '¿Terminar este plan? Su historial se conserva.',
      done: 'Hecho', of: 'de', lessonsN: 'lecciones', behind: 'Atrasado', ahead: 'Adelantado', onTrack: 'Al día', finished: 'Plan completado — que Dios lo bendiga.',
      wird: 'Hoy', recent: 'Repaso reciente', fresh: 'Memorización nueva', distant: 'Repaso lejano', date: 'Fecha',
      off: 'Festivo', fix: 'Consolidación', exam: 'Examen', normal: 'Día de estudio', dayKind: 'Tipo de día', mark: 'Recitado al maestro', unmark: 'Deshacer',
      auto: 'por recitación', manual: 'marcado por el padre', lessonEnd: 'Esta lección termina en', applyEnd: 'Aplicar (se ajustan las siguientes)', open: 'Abrir en el Mushaf',
      ends: 'El plan termina hacia', wd: ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'],
      fill: 'Completa los campos.', err: 'No se pudo guardar; inténtalo de nuevo.', saved: 'Guardado.', more: 'Ver el resto de la tabla', planLine: 'Plan' },
    ru: { past: 'Отметить прошедшие уроки выполненными ({n})', pastAsk: 'Отметить {n} прошедших уроков как рассказанные?', imp: 'Импорт плана школы через ИИ', imp1: '1. Скопируйте инструкцию, откройте любой ИИ (ChatGPT, Claude…), приложите файл плана и вставьте инструкцию.', imp2: '2. Скопируйте весь ответ и вставьте сюда:', impCopy: 'Скопировать инструкцию', impCopied: 'Инструкция скопирована.', impRead: 'Прочитать план', impOk: 'План прочитан: {n} уроков. Проверьте таблицу и сохраните.', impBad: 'Не удалось прочитать строки:', impNone: 'В тексте нет учебных дней.', title: 'Учебный план', none: 'Плана пока нет. Укажите, что ребёнок заучивает и сколько в день, — появится таблица по датам, которую можно править.',
      setup: 'Задать план', newFrom: 'Заучивание начинается с', newTo: 'и заканчивается на', surah: 'Сура', ayah: 'Аят', ord: 'Порядок',
      ordM: 'По порядку Мусхафа', ordR: 'Суры в обратном порядке', amount: 'Новое заучивание в день', lines: 'строк', ayat: 'аятов',
      linesHint: 'На странице 15 строк; аят никогда не разрывается.', days: 'Учебные дни', start: 'Дата начала', oldT: 'Уже выучено (дальнее повторение) — по желанию',
      oldFrom: 'С суры', oldTo: 'По суру', oldDays: 'Дальнее повторение на', daysW: 'дней', recentN: 'Ближнее повторение: последние', lessonsW: 'уроков',
      file: 'План школы или кружка (PDF или фото) — по желанию', fileOpen: 'Файл плана', preview: 'Составить таблицу', save: 'Сохранить план', cancel: 'Отмена',
      edit: 'Изменить план', end: 'Завершить план', endAsk: 'Завершить этот план? Записи сохранятся.',
      done: 'Сделано', of: 'из', lessonsN: 'уроков', behind: 'Отстаёт на', ahead: 'Опережает на', onTrack: 'По графику', finished: 'План выполнен — да благословит его Аллах.',
      wird: 'Сегодня', recent: 'Ближнее повторение', fresh: 'Новое заучивание', distant: 'Дальнее повторение', date: 'Дата',
      off: 'Выходной', fix: 'Закрепление', exam: 'Экзамен', normal: 'Учебный день', dayKind: 'Тип дня', mark: 'Рассказал учителю', unmark: 'Отменить',
      auto: 'по чтению', manual: 'отметил родитель', lessonEnd: 'Урок заканчивается на', applyEnd: 'Применить (следующие уроки сдвинутся)', open: 'Открыть в Мусхафе',
      ends: 'План завершится примерно', wd: ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'],
      fill: 'Заполните поля.', err: 'Не удалось сохранить; попробуйте ещё раз.', saved: 'Сохранено.', more: 'Показать остальную таблицу', planLine: 'План' }
  };

  var O = null, L = null;
  function n(x) { return O.num(x); }
  function E(x) { return O.esc(x); }
  function hijri(d) {
    try { return new Intl.DateTimeFormat((O.lang === 'ur' ? 'ur' : 'ar-SA') + '-u-ca-islamic-umalqura', { day: 'numeric', month: 'short' }).format(Plan.parse(d)).replace(/\s*هـ$/, ''); } catch (e) { return ''; }
  }
  function greg(d) {
    try { return Plan.parse(d).toLocaleDateString(O.lang === 'ar' ? 'ar-SA-u-ca-gregory' : O.lang, { day: 'numeric', month: 'short' }); } catch (e) { return d; }
  }
  function wd(d) { return L.wd[Plan.parse(d).getDay()]; }
  function lab(vs) { return Plan.label(vs, O.lang === 'ur' ? 'ar' : O.lang, n); }
  function surahOpts(sel) {
    var nm = Plan.names(O.lang === 'ur' ? 'ar' : O.lang), h = '';
    for (var i = 1; i <= 114; i++) h += '<option value="' + i + '"' + (i === sel ? ' selected' : '') + '>' + n(i) + '. ' + E(nm[i - 1]) + '</option>';
    return h;
  }
  function refPick(id, ref) {
    var p = (ref || '1:1').split(':');
    return '<div class="pl-ref"><select id="' + id + 'S" aria-label="' + E(L.surah) + '">' + surahOpts(+p[0]) + '</select>' +
      '<span>' + E(L.ayah) + '</span><input id="' + id + 'A" type="number" min="1" dir="ltr" value="' + (+p[1]) + '" aria-label="' + E(L.ayah) + '"></div>';
  }
  function readRef(id) {
    var s = +document.getElementById(id + 'S').value, a = Math.max(1, Math.min(Plan.count(s), parseInt(document.getElementById(id + 'A').value, 10) || 1));
    return s + ':' + a;
  }

  var state = null;   // {plan, lessons, days, slots}
  function open(panel, opts) {
    O = opts; L = T[O.lang] || T.ar;
    panel.innerHTML = '<div class="fb-card pl-card"><p class="ac-wait">…</p></div>';
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    Plan.load().then(function () { return Plan.fetch(O.profile.id); }).then(function (r) {
      state = r ? { plan: r.plan, lessons: r.lessons, days: r.days } : null;
      if (state) { state.slots = Plan.schedule(state.plan, state.lessons, state.days); show(panel); }
      else empty(panel);
    }).catch(function () { panel.innerHTML = '<div class="fb-card"><p class="fb-msg err">' + E(L.err) + '</p></div>'; });
  }
  function head() {
    return '<div class="ac-maphead"><span class="ac-av sm">' + Fam.avatar(O.profile.avatar) + '</span><b>' + E(O.profile.name) + ' — ' + E(L.title) + '</b></div>';
  }
  function empty(panel) {
    panel.innerHTML = '<div class="fb-card pl-card">' + head() + '<p class="pl-note">' + E(L.none) + '</p>' +
      '<div class="ac-btns"><button type="button" class="ac-btn pri" id="plSet">' + E(L.setup) + '</button></div></div>';
    document.getElementById('plSet').onclick = function () { O.guard(function () { form(panel, null); }); };
  }

  /* ---------- the form ---------- */
  function form(panel, plan) {
    var p = plan || { new_from: '78:1', new_to: '114:6', ord: 'mushaf', unit: 'line', amount: 7, days: 31, start_date: Plan.today(), recent_n: 5, old_from: null, old_to: null, old_days: 5 };
    var dayBoxes = L.wd.map(function (w, i) { return '<label class="pl-day"><input type="checkbox" value="' + i + '"' + (p.days & (1 << i) ? ' checked' : '') + '><span>' + E(w) + '</span></label>'; }).join('');
    var oS = p.old_from ? +p.old_from.split(':')[0] : 0, oE = p.old_to ? +p.old_to.split(':')[0] : 0;
    var imp = null;   // a plan read from an AI's reply: its lessons and days are kept as given
    panel.innerHTML = '<form class="fb-card pl-card pl-form" novalidate>' + head() +
      '<details class="pl-more pl-imp"><summary>' + E(L.imp) + '</summary><p class="pl-note">' + E(L.imp1) + '</p>' +
        '<div class="ac-btns"><button type="button" class="ac-btn" id="plCopy">' + E(L.impCopy) + '</button></div>' +
        '<p class="pl-note">' + E(L.imp2) + '</p><textarea id="plTxt" rows="6" dir="auto"></textarea>' +
        '<div class="ac-btns"><button type="button" class="ac-btn pri" id="plRead">' + E(L.impRead) + '</button></div><p class="fb-msg" id="plIM"></p></details>' +
      '<span class="fb-label">' + E(L.newFrom) + '</span>' + refPick('plF', p.new_from) +
      '<span class="fb-label">' + E(L.newTo) + '</span>' + refPick('plT', p.new_to) +
      '<span class="fb-label">' + E(L.ord) + '</span><div class="pl-radio">' +
        '<label><input type="radio" name="plO" value="mushaf"' + (p.ord !== 'reverse' ? ' checked' : '') + '> ' + E(L.ordM) + '</label>' +
        '<label><input type="radio" name="plO" value="reverse"' + (p.ord === 'reverse' ? ' checked' : '') + '> ' + E(L.ordR) + '</label></div>' +
      '<span class="fb-label">' + E(L.amount) + '</span><div class="pl-amt"><input id="plN" type="number" min="1" max="300" step="0.5" dir="ltr" value="' + (+p.amount) + '">' +
        '<select id="plU"><option value="line"' + (p.unit !== 'ayah' ? ' selected' : '') + '>' + E(L.lines) + '</option><option value="ayah"' + (p.unit === 'ayah' ? ' selected' : '') + '>' + E(L.ayat) + '</option></select></div>' +
      '<p class="pl-hint">' + E(L.linesHint) + '</p>' +
      '<span class="fb-label">' + E(L.days) + '</span><div class="pl-days">' + dayBoxes + '</div>' +
      '<label class="fb-label" for="plD">' + E(L.start) + '</label><input id="plD" type="date" dir="ltr" value="' + E(p.start_date) + '">' +
      '<details class="pl-more"' + (p.old_from ? ' open' : '') + '><summary>' + E(L.oldT) + '</summary>' +
        '<div class="pl-two"><label><span>' + E(L.oldFrom) + '</span><select id="plOF"><option value="0">—</option>' + surahOpts(oS) + '</select></label>' +
        '<label><span>' + E(L.oldTo) + '</span><select id="plOT"><option value="0">—</option>' + surahOpts(oE) + '</select></label></div>' +
        '<div class="pl-inline">' + E(L.oldDays) + ' <input id="plK" type="number" min="1" max="30" dir="ltr" value="' + (p.old_days || 5) + '"> ' + E(L.daysW) + '</div>' +
        '<div class="pl-inline">' + E(L.recentN) + ' <input id="plR" type="number" min="0" max="30" dir="ltr" value="' + (p.recent_n == null ? 5 : p.recent_n) + '"> ' + E(L.lessonsW) + '</div>' +
      '</details>' +
      '<label class="fb-label" for="plFile">' + E(L.file) + '</label><input id="plFile" type="file" accept="application/pdf,image/*">' +
      '<div class="ac-btns"><button type="button" class="ac-btn" id="plPrev">' + E(L.preview) + '</button><button class="fb-submit" type="submit">' + E(L.save) + '</button>' +
      '<button type="button" class="ac-btn" id="plCancel">' + E(L.cancel) + '</button></div><p class="fb-msg" id="plMsg"></p><div id="plPreview"></div></form>';
    var f = panel.querySelector('form'), m = document.getElementById('plMsg');
    // a later start than end in the Mushaf suggests the reversed order
    function guessOrd() {
      var a = +document.getElementById('plFS').value, b = +document.getElementById('plTS').value;
      if (a !== b) f.querySelector('input[name=plO][value=' + (a > b ? 'reverse' : 'mushaf') + ']').checked = true;
    }
    document.getElementById('plFS').onchange = function () { document.getElementById('plFA').value = 1; guessOrd(); };
    document.getElementById('plTS').onchange = function () { document.getElementById('plTA').value = Plan.count(+this.value); guessOrd(); };
    function read() {
      var days = 0; f.querySelectorAll('.pl-days input').forEach(function (x) { if (x.checked) days |= 1 << +x.value; });
      var of = +document.getElementById('plOF').value, ot = +document.getElementById('plOT').value;
      if (of && ot && of > ot) { var t = of; of = ot; ot = t; }
      var amt = parseFloat(document.getElementById('plN').value);
      var d = document.getElementById('plD').value;
      if (!days || !(amt > 0) || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return null;
      return Object.assign({}, plan || {}, {
        new_from: readRef('plF'), new_to: readRef('plT'), ord: f.querySelector('input[name=plO]:checked').value,
        unit: document.getElementById('plU').value, amount: Math.min(300, amt), days: days, start_date: d,
        recent_n: Math.max(0, Math.min(30, parseInt(document.getElementById('plR').value, 10) || 0)),
        old_from: of && ot ? of + ':1' : null, old_to: of && ot ? Plan.lastRef(ot) : null,
        old_days: Math.max(1, Math.min(30, parseInt(document.getElementById('plK').value, 10) || 5))
      });
    }
    function build(pl) {
      if (imp) return { plan: pl, lessons: imp.lessons, days: imp.days, slots: Plan.schedule(pl, imp.lessons, imp.days) };
      var ls = Plan.lessons(pl, plan ? state.lessons : []);
      var days = plan ? state.days : {};
      return { plan: pl, lessons: ls, days: days, slots: Plan.schedule(pl, ls, days) };
    }
    document.getElementById('plCopy').onclick = function () {
      var t = Plan.importPrompt(O.lang), im = document.getElementById('plIM');
      var done = function () { O.msg(im, L.impCopied); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(done, function () { fallback(); });
      else fallback();
      function fallback() { var ta = document.getElementById('plTxt'); ta.value = t; ta.select(); try { document.execCommand('copy'); done(); } catch (e) {} ta.value = ''; }
    };
    document.getElementById('plRead').onclick = function () {
      var im = document.getElementById('plIM'), r = Plan.importText(document.getElementById('plTxt').value);
      if (!r.lessons) return O.msg(im, L.impNone, true);
      imp = r;
      // the form shows what was read, so the reviews (and anything else) can still be set
      var setRef = function (id, ref) { var x = ref.split(':'); document.getElementById(id + 'S').value = x[0]; document.getElementById(id + 'A').value = x[1]; };
      setRef('plF', r.plan.new_from); setRef('plT', r.plan.new_to);
      f.querySelector('input[name=plO][value=' + r.plan.ord + ']').checked = true;
      document.getElementById('plN').value = r.plan.amount; document.getElementById('plU').value = 'line';
      f.querySelectorAll('.pl-days input').forEach(function (x) { x.checked = !!(r.plan.days & (1 << +x.value)); });
      document.getElementById('plD').value = r.plan.start_date;
      if (r.plan.old_from) { document.getElementById('plOF').value = r.plan.old_from.split(':')[0]; document.getElementById('plOT').value = r.plan.old_to.split(':')[0]; }
      f.querySelector('.pl-more:not(.pl-imp)').open = true;   // the reviews are set here, so show them
      O.msg(im, L.impOk.replace('{n}', n(r.lessons.length)) + (r.errors.length ? ' ' + L.impBad + ' ' + r.errors.map(n).join('، ') : ''), !!r.errors.length);
      var b = build(read());
      document.getElementById('plPreview').innerHTML = endLine(b.slots) + table(b, 0, true);
    };
    document.getElementById('plPrev').onclick = function () {
      var pl = read(); if (!pl) return O.msg(m, L.fill, true);
      O.msg(m, '');
      var b = build(pl);
      document.getElementById('plPreview').innerHTML = endLine(b.slots) + table(b, 15, true);
    };
    document.getElementById('plCancel').onclick = function () { if (state) show(panel); else empty(panel); };
    f.onsubmit = function (e) {
      e.preventDefault();
      var pl = read(); if (!pl) return O.msg(m, L.fill, true);
      var btn = f.querySelector('.fb-submit'); btn.disabled = true; O.msg(m, '…');
      var file = document.getElementById('plFile').files[0];
      (file ? Plan.upload(file).then(function (path) { pl.file_path = path; }) : Promise.resolve()).then(function () {
        var b = build(pl);
        return Plan.save(O.profile.id, pl, b.lessons, b.days).then(function (row) {
          state = { plan: row, lessons: b.lessons, days: b.days, slots: Plan.schedule(row, b.lessons, b.days) };
          show(panel); if (O.onChange) O.onChange();
        });
      }).catch(function () { O.msg(m, L.err, true); btn.disabled = false; });
    };
  }
  function endLine(slots) {
    var last = slots.length ? slots[slots.length - 1].d : null;
    return last ? '<p class="pl-note">' + E(L.ends) + ' ' + E(wd(last)) + ' ' + E(hijri(last)) + ' — ' + E(greg(last)) + '</p>' : '';
  }

  /* ---------- the plan: where he stands, today, the table ---------- */
  function statusLine(st) {
    if (st.finished) return '<p class="pl-status ok">' + E(L.finished) + '</p>';
    var b = st.behind > 0 ? '<span class="pl-b late">' + E(L.behind) + ' ' + n(st.behind) + '</span>' : '<span class="pl-b ok">' + E(L.onTrack) + '</span>';
    return '<p class="pl-status"><b>' + E(L.done) + ' ' + n(st.done) + ' ' + E(L.of) + ' ' + n(st.total) + ' ' + E(L.lessonsN) + '</b> ' + b + '</p>' +
      '<div class="pl-bar"><i style="width:' + Math.round(100 * st.done / Math.max(1, st.total)) + '%"></i></div>';
  }
  function partLink(vs, cls, title, text) {
    if (!vs || !vs.length) return '';
    var pg = Plan.pageOf(Math.min.apply(null, vs));
    return '<a class="pl-part ' + cls + '" href="' + O.book + '#p=' + pg + '"><span>' + E(title) + '</span><b>' + E(text || lab(vs)) + '</b></a>';
  }
  function wirdBox(w) {
    if (w.finished || !w.slot) return '';
    var s = w.slot, kind = s.kind !== 'lesson' ? '<span class="pl-kind ' + s.kind + '">' + E(L[s.kind]) + '</span>' : '';
    return '<div class="pl-wird"><b>' + E(L.wird) + '</b>' + kind +
      partLink(s.recent, 'r', L.recent) + partLink(s.fresh, 'n', L.fresh, w.lesson ? Plan.lessonLabel(w.lesson, O.lang === 'ur' ? 'ar' : O.lang, n) : '') + partLink(s.distant, 'd', L.distant) + '</div>';
  }
  function table(b, limit, preview) {
    var t = Plan.today(), rows = '', shown = 0, startAt = 0;
    if (!preview) { for (var i = 0; i < b.slots.length; i++) if (b.slots[i].d >= t) { startAt = Math.max(0, i - 3); break; } }
    for (var j = startAt; j < b.slots.length && (!limit || shown < limit); j++, shown++) {
      var s = b.slots[j], l = s.li != null ? b.lessons[s.li] : null;
      var cls = (s.d === t ? ' today' : '') + (l && l.done_at ? ' done' : '') + (s.kind !== 'lesson' ? ' sp ' + s.kind : '');
      rows += '<div class="pl-row' + cls + '" data-i="' + j + '">' +
        '<div class="pl-date"><b>' + E(wd(s.d)) + '</b><span>' + E(hijri(s.d)) + '</span><small>' + E(greg(s.d)) + '</small></div>' +
        '<div class="pl-cell r"><small>' + E(L.recent) + '</small>' + E(lab(s.recent) || '—') + '</div>' +
        '<div class="pl-cell n"><small>' + E(L.fresh) + '</small>' + (l ? E(Plan.lessonLabel(l, O.lang === 'ur' ? 'ar' : O.lang, n)) : '<span class="pl-kind ' + s.kind + '">' + E(L[s.kind]) + '</span>') + '</div>' +
        '<div class="pl-cell d"><small>' + E(L.distant) + '</small>' + E(lab(s.distant) || '—') + '</div>' +
        '<div class="pl-mark">' + (l && l.done_at ? '✓' : '') + '</div></div>';
    }
    var more = limit && j < b.slots.length ? '<button type="button" class="ac-btn pl-moreb">' + E(L.more) + '</button>' : '';
    var hd = '<div class="pl-row hd"><div>' + E(L.date) + '</div><div>' + E(L.recent) + '</div><div>' + E(L.fresh) + '</div><div>' + E(L.distant) + '</div><div></div></div>';
    return '<div class="pl-table">' + hd + rows + '</div>' + more;
  }
  function show(panel) {
    var st = Plan.status(state.plan, state.lessons, state.slots), w = Plan.wird(state.plan, state.lessons, state.slots);
    var t0 = Plan.today(), past = [];
    state.slots.forEach(function (s) { if (s.kind === 'lesson' && s.d < t0 && !state.lessons[s.li].done_at) past.push(s.li); });
    panel.innerHTML = '<div class="fb-card pl-card">' + head() + statusLine(st) + wirdBox(w) + endLine(state.slots) +
      '<div class="ac-btns"><button type="button" class="ac-btn" id="plEdit">' + E(L.edit) + '</button>' +
      (state.plan.file_path ? '<button type="button" class="ac-btn" id="plFileO">' + E(L.fileOpen) + '</button>' : '') +
      '<button type="button" class="ac-btn del" id="plEnd">' + E(L.end) + '</button></div>' +
      (past.length ? '<div class="ac-btns"><button type="button" class="ac-btn pri" id="plPast">' + E(L.past.replace('{n}', n(past.length))) + '</button></div>' : '') +
      '<div id="plT">' + table(state, 21) + '</div><div id="plRow"></div><p class="fb-msg" id="plMsg"></p></div>';
    panel.querySelectorAll('.pl-part').forEach(function (a) { a.onclick = function () { Fam.use(O.profile); }; });
    document.getElementById('plEdit').onclick = function () { O.guard(function () { form(panel, state.plan); }); };
    if (document.getElementById('plFileO')) document.getElementById('plFileO').onclick = function () {
      var win = window.open('', '_blank');
      Plan.fileUrl(state.plan.file_path).then(function (u) { if (win) win.location = u; else location.href = u; }).catch(function () { if (win) win.close(); });
    };
    if (document.getElementById('plPast')) document.getElementById('plPast').onclick = function () {
      O.guard(function () {
        if (!confirm(L.pastAsk.replace('{n}', n(past.length)))) return;
        Plan.markMany(state.plan.id, past.map(function (i) { return state.lessons[i].idx; })).then(function (v) {
          past.forEach(function (i) { Object.assign(state.lessons[i], v); });
          show(panel); if (O.onChange) O.onChange();
        }).catch(function () { O.msg(document.getElementById('plMsg'), L.err, true); });
      });
    };
    document.getElementById('plEnd').onclick = function () {
      O.guard(function () {
        if (!confirm(L.endAsk)) return;
        Plan.end(state.plan.id).then(function () { state = null; empty(panel); if (O.onChange) O.onChange(); });
      });
    };
    wireTable(panel, 21);
  }
  function wireTable(panel, limit) {
    var mb = panel.querySelector('.pl-moreb');
    if (mb) mb.onclick = function () { document.getElementById('plT').innerHTML = table(state, 0); wireTable(panel, 0); };
    panel.querySelectorAll('.pl-row:not(.hd)').forEach(function (r) { r.onclick = function () { rowEditor(panel, +r.dataset.i); }; });
  }
  // a day: its type, its lesson's end, and the lesson's completion
  function rowEditor(panel, i) {
    var s = state.slots[i], l = s.li != null ? state.lessons[s.li] : null, box = document.getElementById('plRow');
    var kind = state.days[s.d] || 'lesson';
    box.innerHTML = '<div class="pl-edit"><b>' + E(wd(s.d)) + ' ' + E(hijri(s.d)) + ' — ' + E(greg(s.d)) + '</b>' +
      (l ? '<p>' + E(Plan.lessonLabel(l, O.lang === 'ur' ? 'ar' : O.lang, n)) + (l.done_at ? ' · ✓ ' + E(l.done_how === 'auto' ? L.auto : L.manual) : '') + '</p>' : '') +
      '<div class="ac-btns">' + (l ? (l.done_at ? '<button type="button" class="ac-btn" id="plUn">' + E(L.unmark) + '</button>' : '<button type="button" class="ac-btn pri" id="plDone">' + E(L.mark) + '</button>') : '') +
      (l ? '<a class="ac-btn" href="' + O.book + '#p=' + Plan.pageOf(Plan.gOf(l.a_from)) + '" id="plGo">' + E(L.open) + '</a>' : '') + '</div>' +
      '<span class="fb-label">' + E(L.dayKind) + '</span><div class="pl-radio row">' +
      ['lesson', 'fix', 'exam', 'off'].map(function (k) { return '<label><input type="radio" name="plK" value="' + k + '"' + (k === kind ? ' checked' : '') + '> ' + E(k === 'lesson' ? L.normal : L[k]) + '</label>'; }).join('') + '</div>' +
      (l && !l.done_at ? '<span class="fb-label">' + E(L.lessonEnd) + '</span>' + refPick('plLE', l.a_to) + '<div class="ac-btns"><button type="button" class="ac-btn" id="plLEgo">' + E(L.applyEnd) + '</button></div>' : '') +
      '</div>';
    box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    var m = document.getElementById('plMsg');
    function persist() {
      state.lessons = Plan.lessons(state.plan, state.lessons);
      state.slots = Plan.schedule(state.plan, state.lessons, state.days);
      return Plan.save(O.profile.id, state.plan, state.lessons, state.days).then(function () { show(panel); O.msg(document.getElementById('plMsg'), L.saved); })
        .catch(function () { O.msg(m, L.err, true); });
    }
    if (document.getElementById('plGo')) document.getElementById('plGo').onclick = function () { Fam.use(O.profile); };
    if (document.getElementById('plDone')) document.getElementById('plDone').onclick = function () {
      O.guard(function () { Plan.mark(state.plan.id, l.idx, 'manual').then(function (v) { Object.assign(l, v); show(panel); }).catch(function () { O.msg(m, L.err, true); }); });
    };
    if (document.getElementById('plUn')) document.getElementById('plUn').onclick = function () {
      O.guard(function () { Plan.mark(state.plan.id, l.idx, null).then(function (v) { Object.assign(l, v); show(panel); }).catch(function () { O.msg(m, L.err, true); }); });
    };
    box.querySelectorAll('input[name=plK]').forEach(function (x) {
      x.onchange = function () {
        O.guard(function () {
          if (x.value === 'lesson') delete state.days[s.d]; else state.days[s.d] = x.value;
          persist();
        });
      };
    });
    if (document.getElementById('plLEgo')) document.getElementById('plLEgo').onclick = function () {
      O.guard(function () { l.a_to = readRef('plLE'); l.edited = true; persist(); });
    };
  }

  // one line per card: lessons done, and how far behind
  function summary(ids) {
    return Plan.load().then(function () { return Fam.ready(); }).then(function (c) {
      if (!c || !ids.length) return {};
      return c.from('study_plans').select('*').in('profile_id', ids).eq('active', true).then(function (r) {
        if (r.error || !r.data || !r.data.length) return {};
        var plans = r.data, pids = plans.map(function (p) { return p.id; });
        return Promise.all([c.from('plan_lessons').select('plan_id,idx,a_from,a_to,edited,done_at,done_how,mistakes').in('plan_id', pids).order('idx'),
          c.from('plan_days').select('plan_id,d,kind').in('plan_id', pids)]).then(function (x) {
          var out = {};
          plans.forEach(function (p) {
            var ls = (x[0].data || []).filter(function (l) { return l.plan_id === p.id; });
            var days = {}; (x[1].data || []).forEach(function (d) { if (d.plan_id === p.id) days[d.d] = d.kind; });
            var st = Plan.status(p, ls, Plan.schedule(p, ls, days));
            out[p.profile_id] = st;
          });
          return out;
        });
      });
    }).catch(function () { return {}; });
  }
  function summaryText(st, lang, num) {
    var L2 = T[lang] || T.ar;
    if (st.finished) return L2.planLine + ': ' + L2.finished;
    return L2.planLine + ': ' + num(st.done) + '/' + num(st.total) + (st.behind > 0 ? ' · ' + L2.behind + ' ' + num(st.behind) : ' · ' + L2.onTrack);
  }

  window.PlanUI = { open: open, summary: summary, summaryText: summaryText, T: T };
})();
