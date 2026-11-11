/* The Last Testament — visitor feedback (opinions, star ratings, testimonials)
 * Shared by every language. To add a language: add its strings to TEXT below.
 * Data lives in the Supabase project "ltestament". Visitors can only submit;
 * ratings and unpublished opinions are visible to admins only (enforced in the database).
 */
(function () {
  const CONFIG = {
    url: 'https://nikwwjswwlwcqekbnpzq.supabase.co',
    key: 'sb_publishable_k8fRjG4b4EMj5TH9yXR3qQ_w-fqi76l', // publishable key: safe to expose, permissions are enforced by database rules
    cooldownMinutes: 10
  };

  const TEXT = {
    ar: {
      ratingLabel: 'كيف تقيّم الموقع؟',
      stars: ['ضعيف', 'مقبول', 'جيد', 'جيد جدًا', 'ممتاز'],
      commentLabel: 'انطباعك ومقترحاتك',
      commentPh: 'ما الذي أعجبك؟ وما الذي تقترح إضافته أو تحسينه؟',
      nameLabel: 'الاسم أو اللقب (اختياري)',
      countryLabel: 'البلد (اختياري)',
      consent: 'أوافق على نشر رأيي في الموقع بعد مراجعته',
      submit: 'إرسال',
      sending: 'جارِ الإرسال…',
      needRating: 'اختر عدد النجوم أولًا.',
      thanks: 'شكرًا لك! وصل رأيك، وسيراجعه فريق الموقع.',
      tooSoon: 'أرسلت رأيك قبل قليل. شكرًا لك، يمكنك الإرسال مرة أخرى بعد دقائق.',
      error: 'تعذّر الإرسال. تأكد من اتصالك بالإنترنت وأعد المحاولة.',
      testimonialsTitle: 'قالوا عن الموقع',
      anonymous: 'زائر'
    },
    en: {
      ratingLabel: 'How would you rate the site?',
      stars: ['Poor', 'Fair', 'Good', 'Very good', 'Excellent'],
      commentLabel: 'Your impressions and suggestions',
      commentPh: 'What did you like? What would you suggest we add or improve?',
      nameLabel: 'Name or nickname (optional)',
      countryLabel: 'Country (optional)',
      consent: 'I agree that my opinion may be published on the site after review',
      submit: 'Send',
      sending: 'Sending…',
      needRating: 'Please choose a star rating first.',
      thanks: 'Thank you! Your opinion has been received and will be reviewed by the site team.',
      tooSoon: 'You sent your opinion a moment ago — thank you. You can send another in a few minutes.',
      error: 'Sending failed. Please check your internet connection and try again.',
      testimonialsTitle: 'What people say about the site',
      anonymous: 'A visitor'
    },
    ur: {
      ratingLabel: 'آپ اس ویب سائٹ کو کیسا درجہ دیں گے؟',
      stars: ['کمزور', 'قابلِ قبول', 'اچھی', 'بہت اچھی', 'بہترین'],
      commentLabel: 'آپ کے تاثرات اور تجاویز',
      commentPh: 'آپ کو کیا پسند آیا؟ آپ کیا اضافہ یا بہتری تجویز کرتے ہیں؟',
      nameLabel: 'نام یا لقب (اختیاری)',
      countryLabel: 'ملک (اختیاری)',
      consent: 'میں متفق ہوں کہ جائزے کے بعد میری رائے ویب سائٹ پر شائع کی جا سکتی ہے',
      submit: 'بھیجیں',
      sending: 'بھیجا جا رہا ہے…',
      needRating: 'پہلے ستاروں کی تعداد منتخب کریں۔',
      thanks: 'شکریہ! آپ کی رائے موصول ہو گئی ہے، ویب سائٹ کی ٹیم اس کا جائزہ لے گی۔',
      tooSoon: 'آپ نے ابھی اپنی رائے بھیجی ہے، شکریہ۔ چند منٹ بعد دوبارہ بھیج سکتے ہیں۔',
      error: 'بھیجنا ممکن نہیں ہو سکا۔ اپنا انٹرنیٹ کنکشن چیک کر کے دوبارہ کوشش کریں۔',
      testimonialsTitle: 'لوگ ویب سائٹ کے بارے میں کیا کہتے ہیں',
      anonymous: 'ایک قاری'
    }
  };

  const esc = (t) => String(t || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const api = (path, body) => fetch(CONFIG.url + path, {
    method: 'POST',
    headers: { 'apikey': CONFIG.key, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
    body: JSON.stringify(body)
  });
  const storeGet = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const storeSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };

  /* ---------- Feedback form ---------- */
  function initForm(form, lang) {
    const t = TEXT[lang] || TEXT.en;
    let rating = 0;
    form.innerHTML = `
      <fieldset class="fb-stars-wrap">
        <legend class="fb-label">${t.ratingLabel}</legend>
        <div class="fb-stars" role="radiogroup">
          ${[1, 2, 3, 4, 5].map(n => `<button type="button" class="fb-star" data-v="${n}" role="radio" aria-checked="false" aria-label="${n} — ${t.stars[n - 1]}">★</button>`).join('')}
        </div>
        <p class="fb-star-word" aria-live="polite"></p>
      </fieldset>
      <label class="fb-label" for="fb-comment">${t.commentLabel}</label>
      <textarea id="fb-comment" maxlength="2000" rows="6" placeholder="${t.commentPh}"></textarea>
      <div class="fb-row">
        <div><label class="fb-label" for="fb-name">${t.nameLabel}</label><input id="fb-name" maxlength="60" autocomplete="nickname"></div>
        <div><label class="fb-label" for="fb-country">${t.countryLabel}</label><input id="fb-country" maxlength="60" autocomplete="country-name"></div>
      </div>
      <input class="fb-hp" id="fb-website" tabindex="-1" autocomplete="off" aria-hidden="true">
      <label class="fb-consent"><input type="checkbox" id="fb-consent"> <span>${t.consent}</span></label>
      <button type="submit" class="fb-submit">${t.submit}</button>
      <p class="fb-msg" aria-live="polite"></p>`;

    const stars = [...form.querySelectorAll('.fb-star')];
    const word = form.querySelector('.fb-star-word');
    const msg = form.querySelector('.fb-msg');
    const paint = (v) => stars.forEach(s => s.classList.toggle('on', +s.dataset.v <= v));
    stars.forEach(s => {
      s.addEventListener('click', () => {
        rating = +s.dataset.v;
        paint(rating);
        stars.forEach(x => x.setAttribute('aria-checked', String(+x.dataset.v === rating)));
        word.textContent = t.stars[rating - 1];
      });
      s.addEventListener('mouseenter', () => paint(+s.dataset.v));
      s.addEventListener('mouseleave', () => paint(rating));
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      msg.className = 'fb-msg';
      if (form.querySelector('#fb-website').value) return; // bots fill hidden fields
      if (!rating) { msg.textContent = t.needRating; msg.classList.add('err'); return; }
      const last = +storeGet('ltFeedbackAt') || 0;
      if (Date.now() - last < CONFIG.cooldownMinutes * 60000) { msg.textContent = t.tooSoon; return; }
      const btn = form.querySelector('.fb-submit');
      btn.disabled = true; btn.textContent = t.sending;
      const clean = (id) => form.querySelector(id).value.trim() || null;
      try {
        const r = await api('/rest/v1/feedback', {
          lang, rating,
          comment: clean('#fb-comment'),
          display_name: clean('#fb-name'),
          country: clean('#fb-country'),
          consent_publish: form.querySelector('#fb-consent').checked
        });
        if (!r.ok) throw new Error('HTTP ' + r.status);
        storeSet('ltFeedbackAt', String(Date.now()));
        form.innerHTML = `<p class="fb-thanks">${t.thanks}</p>`;
      } catch (err) {
        msg.textContent = t.error; msg.classList.add('err');
        btn.disabled = false; btn.textContent = t.submit;
      }
    });
  }

  /* ---------- Testimonials ("What people say") ---------- */
  async function renderTestimonials(section, lang) {
    const t = TEXT[lang] || TEXT.en;
    try {
      const r = await api('/rest/v1/rpc/get_testimonials', { p_lang: lang, p_limit: 9 });
      if (!r.ok) return;
      const items = await r.json();
      if (!items.length) return; // stays hidden until something is approved
      const list = section.querySelector('.tm-list');
      const title = section.querySelector('.tm-title');
      if (title && !title.textContent.trim()) title.textContent = t.testimonialsTitle;
      list.innerHTML = items.map(i => `
        <figure class="tm-card">
          <blockquote>${esc(i.comment)}</blockquote>
          <figcaption>— ${esc(i.display_name || t.anonymous)}${i.country ? '، ' + esc(i.country) : ''}</figcaption>
        </figure>`).join('');
      if (lang !== 'ar' && lang !== 'ur') list.querySelectorAll('figcaption').forEach(f => f.textContent = f.textContent.replace('، ', ', '));
      section.hidden = false;
    } catch (e) { /* section simply stays hidden */ }
  }

  document.addEventListener('DOMContentLoaded', () => {
    const lang = document.documentElement.lang || 'en';
    document.querySelectorAll('[data-feedback-form]').forEach(f => initForm(f, lang));
    document.querySelectorAll('[data-testimonials]').forEach(s => renderTestimonials(s, lang));
  });
})();
