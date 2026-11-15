"""«المصحف ككتاب» — generate the open-book reader page for each language (<lang>/book/index.html)
and add a "read as a book" button to the reader header of each language home page (idempotent).
Usage: python3 tools/build_book.py
Data: data/quran-pages.json (Madinah Mushaf page map, 604 pages); runtime: js/book.js + css/book.css.
"""
import json, pathlib, re, sys
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from build_feedback import FONTS, PAGES as FB
import content_en, content_ru

REPO = pathlib.Path(__file__).resolve().parent.parent
LANGS = ['ar', 'en', 'ur', 'fr', 'es', 'ru']
NASTALIQ = 'https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;600&display=swap'
SERIF = "Georgia,'Times New Roman',serif"

AR_NAMES = ["الفاتحة","البقرة","آل عمران","النساء","المائدة","الأنعام","الأعراف","الأنفال","التوبة","يونس","هود","يوسف","الرعد","إبراهيم","الحجر","النحل","الإسراء","الكهف","مريم","طه","الأنبياء","الحج","المؤمنون","النور","الفرقان","الشعراء","النمل","القصص","العنكبوت","الروم","لقمان","السجدة","الأحزاب","سبأ","فاطر","يس","الصافات","ص","الزمر","غافر","فصلت","الشورى","الزخرف","الدخان","الجاثية","الأحقاف","محمد","الفتح","الحجرات","ق","الذاريات","الطور","النجم","القمر","الرحمن","الواقعة","الحديد","المجادلة","الحشر","الممتحنة","الصف","الجمعة","المنافقون","التغابن","الطلاق","التحريم","الملك","القلم","الحاقة","المعارج","نوح","الجن","المزمل","المدثر","القيامة","الإنسان","المرسلات","النبأ","النازعات","عبس","التكوير","الانفطار","المطففين","الانشقاق","البروج","الطارق","الأعلى","الغاشية","الفجر","البلد","الشمس","الليل","الضحى","الشرح","التين","العلق","القدر","البينة","الزلزلة","العاديات","القارعة","التكاثر","العصر","الهمزة","الفيل","قريش","الماعون","الكوثر","الكافرون","النصر","المسد","الإخلاص","الفلق","الناس"]
assert len(AR_NAMES) == 114
NAMES = {'en': content_en.L['surah_names'], 'ru': content_ru.L['surah_names']}

def qe(key, lang):
    return f'<a href="https://quranenc.com/{lang}/browse/{key}" target="_blank" rel="noopener">QuranEnc.com</a>'

# Same order on every page; labels in each translation's own language.
TRANSLATIONS = [
    dict(key='english_saheeh', label='English — Saheeh International', lang='en', dir='ltr', font=SERIF, names='en', juz='Juz',
         credit='Saheeh International — Noor International Center · ' + qe('english_saheeh', 'en')),
    dict(key='french_montada', label='Français — Dr Nabil Radwan', lang='fr', dir='ltr', font=SERIF, names='en', juz='Juz',
         credit='Dr Nabil Radwan — Centre Noor International · ' + qe('french_montada', 'fr')),
    dict(key='spanish_montada_latin', label='Español — Noor International', lang='es', dir='ltr', font=SERIF, names='en', juz='Yuz',
         credit='Versión latinoamericana — Centro Noor International · ' + qe('spanish_montada_latin', 'es')),
    dict(key='urdu_junagarhi', label='اردو — محمد جوناگڑھی', lang='ur', dir='rtl', font="'Noto Nastaliq Urdu',serif", fontUrl=NASTALIQ, names='ar', juz='پارہ',
         credit='محمد جوناگڑھی (مجمع الملک فہد) · ' + qe('urdu_junagarhi', 'ur')),
    dict(key='russian_aboadel', label='Русский — Абу Адель', lang='ru', dir='ltr', font=SERIF, names='ru', juz='Джуз',
         credit='Абу Адель · ' + qe('russian_aboadel', 'ru')),
]
DEFAULT_TR = {'ar': 'english_saheeh', 'en': 'english_saheeh', 'fr': 'french_montada', 'es': 'spanish_montada_latin',
              'ur': 'urdu_junagarhi', 'ru': 'russian_aboadel'}
UI_NAMES = {'ar': 'ar', 'ur': 'ar', 'en': 'en', 'fr': 'en', 'es': 'en', 'ru': 'ru'}

UI = {
 'ar': dict(title='المصحف ككتاب', sub='تصفّح القرآن الكريم صفحةً صفحة كما في مصحف المدينة، والمعنى بلغتك على الصفحة المقابلة.',
            page='صفحة', notes='حواشي الترجمة', retry='أعد المحاولة', error='تعذّر تحميل الصفحة. تأكد من اتصالك بالإنترنت ثم أعد المحاولة.',
            loading='جارِ فتح المصحف…', text='النص', meaning='المعنى', index='السورة', tr='الترجمة', prev='الصفحة السابقة', next='الصفحة التالية',
            hint='قلّب الصفحات بالسهمين أو بسحب الصفحة', btn='تصفّح كمصحف'),
 'en': dict(title='The Quran as a book', sub='Page through the Quran as laid out in the Madinah Mushaf, with the meaning in your language on the facing page.',
            page='Page', notes='Translator’s notes', retry='Try again', error='The page could not be loaded. Check your connection and try again.',
            loading='Opening the book…', text='Arabic', meaning='Meaning', index='Surah', tr='Translation', prev='Previous page', next='Next page',
            hint='Turn pages with the arrows or by swiping', btn='Read as a book'),
 'ur': dict(title='قرآن کتابی صورت میں', sub='مصحفِ مدینہ کی ترتیب سے قرآن کریم کو صفحہ بہ صفحہ پڑھیں، اور سامنے والے صفحے پر اپنی زبان میں معنی۔',
            page='صفحہ', notes='ترجمے کے حواشی', retry='دوبارہ کوشش کریں', error='صفحہ لوڈ نہیں ہو سکا۔ انٹرنیٹ کنکشن چیک کر کے دوبارہ کوشش کریں۔',
            loading='مصحف کھل رہا ہے…', text='متن', meaning='ترجمہ', index='سورت', tr='ترجمہ', prev='پچھلا صفحہ', next='اگلا صفحہ',
            hint='تیروں یا صفحہ سرکا کر ورق پلٹیں', btn='کتابی صورت میں پڑھیں'),
 'fr': dict(title='Le Coran comme un livre', sub='Feuilletez le Coran page par page, selon la mise en page du Mushaf de Médine, avec le sens en français en regard.',
            page='Page', notes='Notes du traducteur', retry='Réessayer', error='La page n’a pas pu être chargée. Vérifiez votre connexion et réessayez.',
            loading='Ouverture du livre…', text='Arabe', meaning='Sens', index='Sourate', tr='Traduction', prev='Page précédente', next='Page suivante',
            hint='Tournez les pages avec les flèches ou en faisant glisser', btn='Lire comme un livre'),
 'es': dict(title='El Corán como un libro', sub='Hojea el Corán página a página, según la disposición del Mushaf de Medina, con el significado en español en la página de enfrente.',
            page='Página', notes='Notas del traductor', retry='Reintentar', error='No se pudo cargar la página. Revisa tu conexión e inténtalo de nuevo.',
            loading='Abriendo el libro…', text='Árabe', meaning='Significado', index='Sura', tr='Traducción', prev='Página anterior', next='Página siguiente',
            hint='Pasa las páginas con las flechas o deslizando', btn='Leer como un libro'),
 'ru': dict(title='Коран как книга', sub='Листайте Коран страница за страницей, как в Мединском мусхафе, со смыслом на русском языке на соседней странице.',
            page='Стр.', notes='Примечания переводчика', retry='Повторить', error='Не удалось загрузить страницу. Проверьте соединение и попробуйте снова.',
            loading='Открываем книгу…', text='Арабский', meaning='Смысл', index='Сура', tr='Перевод', prev='Предыдущая страница', next='Следующая страница',
            hint='Листайте стрелками или свайпом', btn='Читать как книгу'),
}

def book_path(lang):
    return '/book/' if lang == 'ar' else f'/{lang}/book/'

def page(lang):
    fb, (_, ui_font_url, body_font, head_font) = FB[lang], FONTS[lang]
    u = UI[lang]
    cfg = dict(
        lang=lang, arabicDigits=(lang == 'ar'), defaultShow='ar' if lang == 'ar' else 'tr',
        defaultTranslation=DEFAULT_TR[lang], translations=TRANSLATIONS,
        arabicNames=AR_NAMES, names=NAMES,
        uiNames=AR_NAMES if UI_NAMES[lang] == 'ar' else NAMES[UI_NAMES[lang]],
        ui={k: u[k] for k in ('page', 'notes', 'retry', 'error', 'loading')},
    )
    alts = ''.join(f'<link rel="alternate" hreflang="{l}" href="https://ltestament.com{book_path(l)}">\n' for l in LANGS)
    extra_font = f'<link href="{NASTALIQ}" rel="stylesheet" data-font="urdu_junagarhi">\n' if lang == 'ur' else ''
    return f'''<!DOCTYPE html>
<html lang="{lang}" dir="{fb['dir']}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<title>{u['title']} — {fb['site']}</title>
<meta name="description" content="{u['sub']}">
<link rel="canonical" href="https://ltestament.com{book_path(lang)}">
<meta name="theme-color" content="#0A1425">
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<meta property="og:title" content="{u['title']} — {fb['site']}">
<meta property="og:description" content="{u['sub']}">
<meta property="og:image" content="https://ltestament.com/og-{lang}.jpg">
<meta name="twitter:card" content="summary_large_image">
{alts}<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Amiri+Quran&family=Amiri:wght@400;700&display=swap" rel="stylesheet">
<link href="{ui_font_url}" rel="stylesheet">
{extra_font}<link rel="preconnect" href="https://quranenc.com">
<link rel="preconnect" href="https://cdn.jsdelivr.net">
<link rel="stylesheet" href="/css/book.css">
<style>body.bk{{ font-family:{body_font}; }} .bk-title{{ font-family:{head_font}; }}</style>
</head>
<body class="bk">
<header class="bk-bar">
  <a class="bk-back" href="{fb['home']}">{fb['back']}</a>
  <h1 class="bk-title">{u['title']}</h1>
  <select class="bk-ctl" id="surahSel" aria-label="{u['index']}"></select>
  <label class="bk-pageno">{u['page']} <input class="bk-ctl" id="pageInput" type="number" min="1" max="604" inputmode="numeric"></label>
  <select class="bk-ctl" id="trSel" aria-label="{u['tr']}"></select>
  <div class="bk-tabs">
    <button class="bk-tab" data-show="ar">{u['text']}</button>
    <button class="bk-tab" data-show="tr">{u['meaning']}</button>
  </div>
</header>
<main class="bk-stage">
  <button class="bk-nav" id="prev" aria-label="{u['prev']}" title="{u['prev']}">&#8250;</button>
  <div class="bk-book anim" id="book">
    <section class="bk-page bk-ar" id="pgAr" lang="ar"></section>
    <section class="bk-page bk-tr" id="pgTr"></section>
  </div>
  <button class="bk-nav" id="next" aria-label="{u['next']}" title="{u['next']}">&#8249;</button>
</main>
<div class="bk-bottom">
  <input type="range" id="range" min="1" max="604" value="1" aria-label="{u['page']}">
  <small id="rangeLbl"></small>
  <small class="bk-hint">{u['hint']}</small>
</div>
<script>window.BOOK = {json.dumps(cfg, ensure_ascii=False)};</script>
<script src="/js/site.js" defer></script>
<script src="/js/book.js" defer></script>
</body>
</html>
'''

# ---------- entry button in each home page's reader header ----------
BTN_CSS = ('  .reader-book{ display:inline-flex; align-items:center; gap:6px; padding:9px 14px; border-radius:6px; '
           'border:1px solid var(--gold); color:var(--gold-soft); text-decoration:none; font-size:0.85rem; white-space:nowrap; }\n'
           '  .reader-book:hover{ background:rgba(200,155,60,0.15); }\n')

def home_hook(path, lang):
    p = pathlib.Path(path)
    s = p.read_text(encoding='utf-8')
    orig = s
    s = re.sub(r'\n\s*<a class="reader-book"[^>]*>.*?</a>', '', s, flags=re.S)
    btn = f'\n    <a class="reader-book" href="{book_path(lang)}">📖 {UI[lang]["btn"]}</a>'
    m = re.search(r'(<div class="reader-lang-toggle">.*?</div>)', s, re.S)
    assert m, path
    s = s[:m.end()] + btn + s[m.end():]
    if BTN_CSS not in s:
        s = s.replace('</style>', BTN_CSS + '</style>', 1)
    if s != orig:
        p.write_text(s, encoding='utf-8')
    return s != orig

HOMES = {'ar': 'index.html', 'en': 'en/index.html', 'ur': 'ur/index.html',
         'fr': 'fr/index.html', 'es': 'es/index.html', 'ru': 'ru/index.html'}

if __name__ == '__main__':
    for lang in LANGS:
        out = REPO / book_path(lang).strip('/') / 'index.html'
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(page(lang), encoding='utf-8')
        print('built', out.relative_to(REPO), '| home hook:', home_hook(REPO / HOMES[lang], lang))
