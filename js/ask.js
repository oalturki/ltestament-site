/* The Last Testament — "Ask your question" form. Shared by every language.
 * To add a language: add its strings to TEXT below.
 * Questions are stored in the Supabase project "ltestament" (table questions).
 * Visitors can only submit; only admins and the volunteer assigned to a question can read it.
 */
(function () {
  const CONFIG = {
    url: 'https://nikwwjswwlwcqekbnpzq.supabase.co',
    key: 'sb_publishable_k8fRjG4b4EMj5TH9yXR3qQ_w-fqi76l', // publishable key: permissions are enforced by database rules
    cooldownMinutes: 5
  };

  const TEXT = {
    ar: {
      question: 'سؤالك', questionPh: 'اكتب سؤالك أو ما يشغلك بحرية، بأي طول تريد.',
      how: 'كيف نرد عليك؟', email: 'بريد إلكتروني', whatsapp: 'واتساب', telegram: 'تيليجرام',
      emailPh: 'name@example.com', phonePh: 'رقم الجوال مع رمز الدولة، مثل +966…', telegramPh: 'اسم المستخدم مثل ‎@name أو رقم الجوال',
      name: 'اسمك (اختياري)', background: 'خلفيتك (اختياري)',
      bg: { '': '— اختر —', christian: 'مسيحي', jewish: 'يهودي', none: 'بلا دين', other: 'دين آخر', muslim: 'مسلم', undisclosed: 'أفضّل ألا أقول' },
      bgHint: 'تساعد المتطوع على اختيار المدخل المناسب لحوارك فقط.',
      consent: 'أوافق على أن يتواصل معي متطوع عبر الوسيلة التي اخترتها للرد على سؤالي',
      privacy: 'لا يطّلع على بيانات تواصلك إلا فريق الموقع والمتطوع الذي يرد عليك، ولا يُنشر سؤالك.',
      submit: 'إرسال السؤال', sending: 'جارِ الإرسال…',
      needQuestion: 'اكتب سؤالك أولًا.', needContact: 'اكتب وسيلة التواصل.', badEmail: 'تحقق من البريد الإلكتروني.', needConsent: 'نحتاج موافقتك لنتمكن من الرد عليك.',
      thanks: 'وصل سؤالك، جزاك الله خيرًا على ثقتك. سيرد عليك متطوع يعرف لغتك عادة خلال يومين.',
      tooSoon: 'أرسلت سؤالًا قبل قليل. يمكنك إرسال سؤال آخر بعد دقائق.',
      error: 'تعذّر الإرسال. تأكد من اتصالك بالإنترنت وأعد المحاولة.'
    },
    en: {
      question: 'Your question', questionPh: 'Write your question, or whatever is on your mind, freely and at any length.',
      how: 'How should we reply?', email: 'Email', whatsapp: 'WhatsApp', telegram: 'Telegram',
      emailPh: 'name@example.com', phonePh: 'Mobile number with country code, e.g. +1…', telegramPh: 'Username like @name, or mobile number',
      name: 'Your name (optional)', background: 'Your background (optional)',
      bg: { '': '— Choose —', christian: 'Christian', jewish: 'Jewish', none: 'No religion', other: 'Another religion', muslim: 'Muslim', undisclosed: 'I prefer not to say' },
      bgHint: 'It only helps the volunteer choose the right starting point for your conversation.',
      consent: 'I agree that a volunteer may contact me through the method I chose, to answer my question',
      privacy: 'Only the site team and the volunteer who answers you can see your contact details. Your question is never published.',
      submit: 'Send my question', sending: 'Sending…',
      needQuestion: 'Please write your question first.', needContact: 'Please enter your contact details.', badEmail: 'Please check your email address.', needConsent: 'We need your consent to be able to reply.',
      thanks: 'Your question has arrived — thank you for your trust. A volunteer who speaks your language will usually reply within two days.',
      tooSoon: 'You sent a question a moment ago. You can send another in a few minutes.',
      error: 'Sending failed. Please check your internet connection and try again.'
    },
    ur: {
      question: 'آپ کا سوال', questionPh: 'اپنا سوال یا جو بات آپ کے ذہن میں ہے، آزادی سے لکھیں۔',
      how: 'ہم آپ کو کیسے جواب دیں؟', email: 'ای میل', whatsapp: 'واٹس ایپ', telegram: 'ٹیلیگرام',
      emailPh: 'name@example.com', phonePh: 'ملک کے کوڈ کے ساتھ موبائل نمبر، جیسے ‎+92…', telegramPh: 'یوزر نیم جیسے ‎@name یا موبائل نمبر',
      name: 'آپ کا نام (اختیاری)', background: 'آپ کا پس منظر (اختیاری)',
      bg: { '': '— منتخب کریں —', christian: 'مسیحی', jewish: 'یہودی', none: 'کوئی مذہب نہیں', other: 'کوئی اور مذہب', muslim: 'مسلمان', undisclosed: 'میں نہیں بتانا چاہتا' },
      bgHint: 'یہ صرف رضاکار کو آپ کی گفتگو کا مناسب آغاز منتخب کرنے میں مدد دیتا ہے۔',
      consent: 'میں متفق ہوں کہ ایک رضاکار میرے سوال کا جواب دینے کے لیے میرے منتخب کردہ ذریعے سے مجھ سے رابطہ کرے',
      privacy: 'آپ کے رابطے کی معلومات صرف ویب سائٹ کی ٹیم اور جواب دینے والا رضاکار دیکھ سکتا ہے۔ آپ کا سوال شائع نہیں ہوتا۔',
      submit: 'سوال بھیجیں', sending: 'بھیجا جا رہا ہے…',
      needQuestion: 'پہلے اپنا سوال لکھیں۔', needContact: 'رابطے کی معلومات درج کریں۔', badEmail: 'ای میل ایڈریس چیک کریں۔', needConsent: 'جواب دینے کے لیے ہمیں آپ کی رضامندی درکار ہے۔',
      thanks: 'آپ کا سوال موصول ہو گیا، اعتماد کا شکریہ۔ آپ کی زبان جاننے والا رضاکار عموماً دو دن میں جواب دے گا۔',
      tooSoon: 'آپ نے ابھی ایک سوال بھیجا ہے۔ چند منٹ بعد دوسرا بھیج سکتے ہیں۔',
      error: 'بھیجنا ممکن نہیں ہو سکا۔ انٹرنیٹ کنکشن چیک کر کے دوبارہ کوشش کریں۔'
    },
    fr: {
      question: 'Votre question', questionPh: 'Écrivez librement votre question, ou ce qui vous préoccupe, sans limite de longueur.',
      how: 'Comment devons-nous vous répondre ?', email: 'E-mail', whatsapp: 'WhatsApp', telegram: 'Telegram',
      emailPh: 'nom@exemple.com', phonePh: 'Numéro de mobile avec l’indicatif du pays, ex. +33…', telegramPh: 'Nom d’utilisateur comme @nom, ou numéro de mobile',
      name: 'Votre nom (facultatif)', background: 'Votre arrière-plan (facultatif)',
      bg: { '': '— Choisir —', christian: 'Chrétien', jewish: 'Juif', none: 'Sans religion', other: 'Autre religion', muslim: 'Musulman', undisclosed: 'Je préfère ne pas le dire' },
      bgHint: 'Cela aide seulement le bénévole à choisir le bon point de départ pour votre échange.',
      consent: 'J’accepte qu’un bénévole me contacte par le moyen que j’ai choisi, pour répondre à ma question',
      privacy: 'Seuls l’équipe du site et le bénévole qui vous répond peuvent voir vos coordonnées. Votre question n’est jamais publiée.',
      submit: 'Envoyer ma question', sending: 'Envoi…',
      needQuestion: 'Écrivez d’abord votre question.', needContact: 'Indiquez vos coordonnées.', badEmail: 'Vérifiez votre adresse e-mail.', needConsent: 'Nous avons besoin de votre accord pour pouvoir vous répondre.',
      thanks: 'Votre question est bien arrivée — merci de votre confiance. Un bénévole qui parle votre langue vous répondra en général sous deux jours.',
      tooSoon: 'Vous venez d’envoyer une question. Vous pourrez en envoyer une autre dans quelques minutes.',
      error: 'L’envoi a échoué. Vérifiez votre connexion Internet et réessayez.'
    },
    es: {
      question: 'Tu pregunta', questionPh: 'Escribe con libertad tu pregunta, o lo que te inquieta, con la extensión que quieras.',
      how: '¿Cómo te respondemos?', email: 'Correo electrónico', whatsapp: 'WhatsApp', telegram: 'Telegram',
      emailPh: 'nombre@ejemplo.com', phonePh: 'Número de celular con código de país, p. ej. +52…', telegramPh: 'Usuario como @nombre, o número de celular',
      name: 'Tu nombre (opcional)', background: 'Tu trasfondo (opcional)',
      bg: { '': '— Elegir —', christian: 'Cristiano', jewish: 'Judío', none: 'Sin religión', other: 'Otra religión', muslim: 'Musulmán', undisclosed: 'Prefiero no decirlo' },
      bgHint: 'Solo ayuda al voluntario a elegir el mejor punto de partida para tu conversación.',
      consent: 'Acepto que un voluntario me contacte por el medio que elegí, para responder a mi pregunta',
      privacy: 'Solo el equipo del sitio y el voluntario que te responda pueden ver tus datos de contacto. Tu pregunta nunca se publica.',
      submit: 'Enviar mi pregunta', sending: 'Enviando…',
      needQuestion: 'Primero escribe tu pregunta.', needContact: 'Escribe tus datos de contacto.', badEmail: 'Revisa tu correo electrónico.', needConsent: 'Necesitamos tu consentimiento para poder responderte.',
      thanks: 'Tu pregunta llegó; gracias por tu confianza. Un voluntario que habla tu idioma suele responder en un plazo de dos días.',
      tooSoon: 'Acabas de enviar una pregunta. Podrás enviar otra en unos minutos.',
      error: 'No se pudo enviar. Revisa tu conexión a internet e inténtalo de nuevo.'
    },
    ru: {
      question: 'Ваш вопрос', questionPh: 'Напишите свободно свой вопрос или то, что вас волнует, любого объёма.',
      how: 'Как вам ответить?', email: 'E-mail', whatsapp: 'WhatsApp', telegram: 'Telegram',
      emailPh: 'name@example.com', phonePh: 'Номер мобильного с кодом страны, например +7…', telegramPh: 'Имя пользователя, например @name, или номер телефона',
      name: 'Ваше имя (необязательно)', background: 'Ваше мировоззрение (необязательно)',
      bg: { '': '— Выберите —', christian: 'Христианин', jewish: 'Иудей', none: 'Без религии', other: 'Другая религия', muslim: 'Мусульманин', undisclosed: 'Предпочитаю не говорить' },
      bgHint: 'Это лишь помогает волонтёру выбрать подходящее начало для беседы.',
      consent: 'Я согласен(на), чтобы волонтёр связался со мной выбранным способом, чтобы ответить на мой вопрос',
      privacy: 'Ваши контактные данные видят только команда сайта и волонтёр, который вам отвечает. Ваш вопрос не публикуется.',
      submit: 'Отправить вопрос', sending: 'Отправка…',
      needQuestion: 'Сначала напишите свой вопрос.', needContact: 'Укажите контактные данные.', badEmail: 'Проверьте адрес e-mail.', needConsent: 'Нам нужно ваше согласие, чтобы ответить вам.',
      thanks: 'Ваш вопрос получен — спасибо за доверие. Волонтёр, владеющий вашим языком, обычно отвечает в течение двух дней.',
      tooSoon: 'Вы только что отправили вопрос. Следующий можно отправить через несколько минут.',
      error: 'Не удалось отправить. Проверьте подключение к интернету и попробуйте ещё раз.'
    }
  };

  const storeGet = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const storeSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };

  function initForm(form, lang) {
    const t = TEXT[lang] || TEXT.en;
    const methods = ['email', 'whatsapp', 'telegram'];
    form.innerHTML = `
      <label class="fb-label" for="q-text">${t.question}</label>
      <textarea id="q-text" maxlength="4000" rows="7" placeholder="${t.questionPh}"></textarea>
      <fieldset class="q-methods">
        <legend class="fb-label">${t.how}</legend>
        <div class="q-method-row">
          ${methods.map((m, i) => `<label class="q-method"><input type="radio" name="q-method" value="${m}" ${i === 0 ? 'checked' : ''}> <span>${t[m]}</span></label>`).join('')}
        </div>
        <input id="q-contact" maxlength="200" dir="ltr" autocomplete="email" type="email" placeholder="${t.emailPh}">
      </fieldset>
      <div class="fb-row">
        <div><label class="fb-label" for="q-name">${t.name}</label><input id="q-name" maxlength="80" autocomplete="name"></div>
        <div><label class="fb-label" for="q-bg">${t.background}</label>
          <select id="q-bg">${Object.entries(t.bg).map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select></div>
      </div>
      <p class="q-hint">${t.bgHint}</p>
      <input class="fb-hp" id="q-website" tabindex="-1" autocomplete="off" aria-hidden="true">
      <label class="fb-consent"><input type="checkbox" id="q-consent"> <span>${t.consent}</span></label>
      <p class="q-privacy">${t.privacy}</p>
      <button type="submit" class="fb-submit">${t.submit}</button>
      <p class="fb-msg" aria-live="polite"></p>`;

    const contact = form.querySelector('#q-contact');
    const msg = form.querySelector('.fb-msg');
    form.querySelectorAll('input[name="q-method"]').forEach(r => r.addEventListener('change', () => {
      const m = form.querySelector('input[name="q-method"]:checked').value;
      contact.type = m === 'email' ? 'email' : 'text';
      contact.autocomplete = m === 'email' ? 'email' : 'tel';
      contact.inputMode = m === 'whatsapp' ? 'tel' : '';
      contact.placeholder = m === 'email' ? t.emailPh : m === 'whatsapp' ? t.phonePh : t.telegramPh;
    }));

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      msg.className = 'fb-msg';
      const fail = (txt) => { msg.textContent = txt; msg.classList.add('err'); };
      if (form.querySelector('#q-website').value) return; // bots fill hidden fields
      const question = form.querySelector('#q-text').value.trim();
      const method = form.querySelector('input[name="q-method"]:checked').value;
      const value = contact.value.trim();
      if (question.length < 3) return fail(t.needQuestion);
      if (value.length < 3) return fail(t.needContact);
      if (method === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return fail(t.badEmail);
      if (!form.querySelector('#q-consent').checked) return fail(t.needConsent);
      const last = +storeGet('ltAskAt') || 0;
      if (Date.now() - last < CONFIG.cooldownMinutes * 60000) { msg.textContent = t.tooSoon; return; }
      const btn = form.querySelector('.fb-submit');
      btn.disabled = true; btn.textContent = t.sending;
      try {
        const r = await fetch(CONFIG.url + '/rest/v1/questions', {
          method: 'POST',
          headers: { 'apikey': CONFIG.key, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
          body: JSON.stringify({
            lang, question, contact_method: method, contact_value: value,
            name: form.querySelector('#q-name').value.trim() || null,
            background: form.querySelector('#q-bg').value || null,
            consent: true
          })
        });
        if (!r.ok) throw new Error('HTTP ' + r.status);
        storeSet('ltAskAt', String(Date.now()));
        form.innerHTML = `<p class="fb-thanks">${t.thanks}</p>`;
        form.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } catch (err) {
        fail(t.error);
        btn.disabled = false; btn.textContent = t.submit;
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    const lang = document.documentElement.lang || 'en';
    document.querySelectorAll('[data-ask-form]').forEach(f => initForm(f, lang));
  });
})();
