"""Generate the feedback page ("Your opinion matters") for each language.
Usage: python3 build_feedback.py   (writes <lang>/feedback/index.html in the repo)
"""
import pathlib
REPO = pathlib.Path(__file__).resolve().parent.parent

FONTS = {
    'ar': ('Tajawal', "https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap", "'Tajawal',sans-serif", "'Tajawal',sans-serif"),
    'en': ('Fraunces', "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Work+Sans:wght@400;500;600&display=swap", "'Work Sans',sans-serif", "'Fraunces',serif"),
    'fr': ('Fraunces', "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Work+Sans:wght@400;500;600&display=swap", "'Work Sans',sans-serif", "'Fraunces',serif"),
    'es': ('Fraunces', "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Work+Sans:wght@400;500;600&display=swap", "'Work Sans',sans-serif", "'Fraunces',serif"),
    'ru': ('Lora', "https://fonts.googleapis.com/css2?family=Lora:wght@500;600&family=Inter:wght@400;500;600&display=swap", "'Inter',sans-serif", "'Lora',serif"),
    'ur': ('Nastaliq', "https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;600;700&display=swap", "'Noto Nastaliq Urdu',serif", "'Noto Nastaliq Urdu',serif"),
}
PAGES = {
    'ar': dict(dir='rtl', home='/', path='/feedback/', site='العهد الأخير',
               title='رأيك يهمنا', back='→ العودة إلى العهد الأخير',
               sub='شاركنا انطباعك عن الموقع ومقترحاتك لتطويره. لا يُطلب منك تسجيل ولا بريد إلكتروني.'),
    'en': dict(dir='ltr', home='/en/', path='/en/feedback/', site='The Last Testament',
               title='Your opinion matters', back='← Back to The Last Testament',
               sub='Share your impressions of the site and your suggestions for improving it. No sign-up or email needed.'),
    'ur': dict(dir='rtl', home='/ur/', path='/ur/feedback/', site='آخری عہد نامہ',
               title='آپ کی رائے اہم ہے', back='→ آخری عہد نامہ پر واپس جائیں',
               sub='ویب سائٹ کے بارے میں اپنے تاثرات اور اسے بہتر بنانے کی تجاویز ہمیں بتائیں۔ نہ رجسٹریشن کی ضرورت ہے نہ ای میل کی۔'),
    'fr': dict(dir='ltr', home='/fr/', path='/fr/feedback/', site='Le Dernier Testament',
               title='Votre avis compte', back='← Retour au Dernier Testament',
               sub='Partagez vos impressions sur le site et vos suggestions pour l’améliorer. Aucune inscription ni adresse e-mail n’est demandée.'),
    'es': dict(dir='ltr', home='/es/', path='/es/feedback/', site='El Último Testamento',
               title='Tu opinión importa', back='← Volver a El Último Testamento',
               sub='Comparte tus impresiones sobre el sitio y tus sugerencias para mejorarlo. No necesitas registrarte ni dar tu correo.'),
    'ru': dict(dir='ltr', home='/ru/', path='/ru/feedback/', site='Последний Завет',
               title='Ваше мнение важно', back='← Вернуться к «Последнему Завету»',
               sub='Поделитесь впечатлениями о сайте и предложениями по его улучшению. Регистрация и e-mail не нужны.'),
}

def page(lang):
    p, (_, font_url, body_font, head_font) = PAGES[lang], FONTS[lang]
    lh = '2.1' if lang == 'ur' else '1.7'
    return f'''<!DOCTYPE html>
<html lang="{lang}" dir="{p['dir']}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{p['title']} — {p['site']}</title>
<meta name="description" content="{p['sub']}">
<link rel="canonical" href="https://ltestament.com{p['path']}">
<meta name="theme-color" content="#101B33">
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<meta property="og:title" content="{p['title']} — {p['site']}">
<meta property="og:description" content="{p['sub']}">
<meta property="og:image" content="https://ltestament.com/og-{lang}.jpg">
''' + ''.join(f'<link rel="alternate" hreflang="{l}" href="https://ltestament.com{PAGES[l]["path"]}">\n' for l in PAGES) + f'''<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="{font_url}" rel="stylesheet">
<link rel="stylesheet" href="/css/feedback.css">
<style>
  *{{margin:0;padding:0;box-sizing:border-box;}}
  body{{ font-family:{body_font}; line-height:{lh}; background:#0A1425; }}
  .fb-title, .tm-title{{ font-family:{head_font}; font-weight:600; }}
</style>
</head>
<body>
<main class="fb-page">
  <div class="fb-inner">
    <a class="fb-back" href="{p['home']}">{p['back']}</a>
    <h1 class="fb-title">{p['title']}</h1>
    <p class="fb-sub">{p['sub']}</p>
    <form class="fb-card" data-feedback-form novalidate></form>
  </div>
  <section class="tm" data-testimonials hidden>
    <h2 class="tm-title"></h2>
    <div class="tm-list"></div>
  </section>
</main>
<script src="/js/feedback.js"></script>
</body>
</html>
'''

if __name__ == '__main__':
  for lang in PAGES:
    out = REPO / PAGES[lang]['path'].strip('/') / 'index.html'
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(page(lang), encoding='utf-8')
    print('wrote', out)
