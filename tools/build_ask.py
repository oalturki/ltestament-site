"""Generate the "Ask your question" page for each language: <lang>/ask/index.html
Usage: python3 tools/build_ask.py
"""
import pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from build_feedback import FONTS, PAGES as FB
REPO = pathlib.Path(__file__).resolve().parent.parent

ASK = {
    'ar': ('اسأل سؤالك', 'اسأل بحرية عن العهد الأخير ورسالته، بلا ضغط ولا تسجيل. سيرد عليك متطوع يعرف لغتك وخلفيتك.'),
    'en': ('Ask your question', 'Ask freely about the Last Testament and its message — no pressure, no sign-up. A volunteer who knows your language and background will reply.'),
    'ur': ('اپنا سوال پوچھیں', 'آخری عہد نامہ اور اس کے پیغام کے بارے میں آزادی سے پوچھیں — نہ کوئی دباؤ، نہ رجسٹریشن۔ آپ کی زبان اور پس منظر جاننے والا رضاکار جواب دے گا۔'),
    'fr': ('Posez votre question', 'Posez librement vos questions sur le Dernier Testament et son message — sans pression, sans inscription. Un bénévole qui connaît votre langue et votre culture vous répondra.'),
    'es': ('Haz tu pregunta', 'Pregunta con total libertad sobre el Último Testamento y su mensaje, sin presión y sin registrarte. Un voluntario que conoce tu idioma y tu contexto te responderá.'),
    'ru': ('Задайте вопрос', 'Спрашивайте свободно о Последнем Завете и его послании — без давления и без регистрации. Вам ответит волонтёр, знающий ваш язык и вашу культуру.'),
}

def ask_path(lang):
    return '/ask/' if lang == 'ar' else f'/{lang}/ask/'

def page(lang):
    p, (_, font_url, body_font, head_font) = FB[lang], FONTS[lang]
    title, sub = ASK[lang]
    lh = '2.1' if lang == 'ur' else '1.7'
    alts = ''.join(f'<link rel="alternate" hreflang="{l}" href="https://ltestament.com{ask_path(l)}">\n' for l in ASK)
    return f'''<!DOCTYPE html>
<html lang="{lang}" dir="{p['dir']}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{title} — {p['site']}</title>
<meta name="description" content="{sub}">
<link rel="canonical" href="https://ltestament.com{ask_path(lang)}">
<meta name="theme-color" content="#101B33">
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<meta property="og:title" content="{title} — {p['site']}">
<meta property="og:description" content="{sub}">
<meta property="og:image" content="https://ltestament.com/og-{lang}.jpg">
{alts}<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="{font_url}" rel="stylesheet">
<link rel="stylesheet" href="/css/feedback.css">
<style>
  *{{margin:0;padding:0;box-sizing:border-box;}}
  body{{ font-family:{body_font}; line-height:{lh}; background:#0A1425; }}
  .fb-title{{ font-family:{head_font}; font-weight:600; }}
</style>
</head>
<body>
<main class="fb-page">
  <div class="fb-inner">
    <a class="fb-back" href="{p['home']}">{p['back']}</a>
    <h1 class="fb-title">{title}</h1>
    <p class="fb-sub">{sub}</p>
    <form class="fb-card" data-ask-form novalidate></form>
  </div>
</main>
<script src="/js/ask.js"></script>
</body>
</html>
'''

if __name__ == '__main__':
    for lang in ASK:
        out = REPO / ask_path(lang).strip('/') / 'index.html'
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(page(lang), encoding='utf-8')
        print('wrote', out)
