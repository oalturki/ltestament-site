"""«المصحف ككتاب» — generate the open-book reader page for each language (<lang>/book/index.html)
and add a "read as a book" button to the reader header of each language home page (idempotent).
Usage: python3 tools/build_book.py
Data: data/quran-pages.json (Madinah Mushaf page map, 604 pages); runtime: js/book.js + css/book.css.
"""
import html, json, pathlib, re, sys
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
# Recitations for the book's audio player (timings built by tools/build_recitations.py; audio streams from these URLs).
# kind 'ayah'  : one file per ayah ({s}{a} = 3-digit surah + 3-digit ayah), word timings in /data/rec/<id>/p<N>.json
# kind 'surah' : one file per surah ({s}), ayah timings in /data/rec/<id>.json when timed=True
# langs: pages where it is offered (None = every page). The English-meaning recordings follow the Saheeh International text.
WALK = 'https://everyayah.com/data/English/Sahih_Intnl_Ibrahim_Walk_192kbps/{s}{a}.mp3'
RECITERS = [
    dict(id='abdulbasit', kind='ayah', url='https://audio-cdn.tarteel.ai/quran/abdulBasitMurattal/{s}{a}.mp3', timed=True, langs=None,
         label=dict(ar='عبد الباسط عبد الصمد', en='Abdul Basit Abdul Samad')),
    dict(id='minshawi', kind='ayah', url='https://audio-cdn.tarteel.ai/quran/minshawyMurattal/{s}{a}.mp3', timed=True, langs=None,
         label=dict(ar='محمد صديق المنشاوي', en='Muhammad Siddiq al-Minshawi')),
    # English pages: the same recitations, each ayah followed by its meaning read by Ibrahim Walk (Saheeh International,
    # one file per ayah from everyayah.com) — recitation and meaning stay in step because both are ayah by ayah.
    dict(id='abdulbasit-en', data='abdulbasit', kind='ayah', url='https://audio-cdn.tarteel.ai/quran/abdulBasitMurattal/{s}{a}.mp3', timed=True, langs=['en'],
         then=WALK, label=dict(ar='عبد الباسط + المعنى بالإنجليزية', en='Abdul Basit + English meaning (Ibrahim Walk)')),
    dict(id='minshawi-en', data='minshawi', kind='ayah', url='https://audio-cdn.tarteel.ai/quran/minshawyMurattal/{s}{a}.mp3', timed=True, langs=['en'],
         then=WALK, label=dict(ar='المنشاوي + المعنى بالإنجليزية', en='al-Minshawi + English meaning (Ibrahim Walk)')),
    # English pages: the meaning alone, read continuously (the English text is highlighted ayah by ayah).
    dict(id='walk', kind='ayah', url=WALK, timed=False, langs=['en'], meaningOnly=True,  # trimLead=True would skip the reciter's tail at the start of some files; off: it can clip the first English word
        
         label=dict(ar='المعنى بالإنجليزية فقط (إبراهيم ووك)', en='English meaning only (Ibrahim Walk)')),
]

def reciters(lang):
    ln = 'ar' if lang in ('ar', 'ur') else 'en'
    return [dict(id=r['id'], data=r.get('data', r['id']), kind=r['kind'], url=r['url'], timed=r['timed'], then=r.get('then'), meaningOnly=r.get('meaningOnly', False), trimLead=r.get('trimLead', False), label=r['label'][ln])
            for r in RECITERS if r['langs'] is None or lang in r['langs']]

UI_NAMES = {'ar': 'ar', 'ur': 'ar', 'en': 'en', 'fr': 'en', 'es': 'en', 'ru': 'ru'}
# the index (surah list) shows the names only, transliterated, as QuranEnc.com and the KSU Mushaf do
# (no institutional list of the names' meanings in en/fr/es/ru; less, but sound)
def index_names(lang):
    return AR_NAMES if UI_NAMES[lang] == 'ar' else NAMES[UI_NAMES[lang]]

UI = {
 'ar': dict(frame='شكل الإطار', frameFull='زخرفة كاملة', frameSides='تمييز اليمين واليسار', frameNone='بلا زخرفة', listen='استمع', pause='إيقاف', reciter='القارئ', full='افتح المصحف كاملًا', fontCredit='خط المصحف: مجمع الملك فهد لطباعة المصحف الشريف', title='المصحف ككتاب', sub='تصفّح القرآن الكريم صفحةً صفحة كما في مصحف المدينة النبوية المطبوع، مع التلاوة.',
            page='صفحة', notes='حواشي الترجمة', retry='أعد المحاولة', error='تعذّر تحميل الصفحة. تأكد من اتصالك بالإنترنت ثم أعد المحاولة.',
            loading='جارِ فتح المصحف…', text='النص', meaning='المعنى', index='السورة', tr='الترجمة', prev='الصفحة السابقة', next='الصفحة التالية',
            hint='قلّب الصفحات بالسهمين أو بسحب الصفحة', btn='تصفّح كمصحف'),
 'en': dict(frame='Page frame', frameFull='Full ornament', frameSides='Right / left pages', frameNone='Plain', listen='Listen', pause='Pause', reciter='Reciter', full='Open the full Quran', fontCredit='Mushaf font: King Fahd Glorious Quran Printing Complex', title='The Quran as a book', sub='Page through the Quran as laid out in the Madinah Mushaf, with the meaning in your language on the facing page.',
            page='Page', notes='Translator’s notes', retry='Try again', error='The page could not be loaded. Check your connection and try again.',
            loading='Opening the book…', text='Arabic', meaning='Meaning', index='Surah', tr='Translation', prev='Previous page', next='Next page',
            hint='Turn pages with the arrows or by swiping', btn='Read as a book'),
 'ur': dict(frame='فریم', frameFull='مکمل نقش و نگار', frameSides='دائیں / بائیں صفحہ', frameNone='سادہ', listen='سنیں', pause='روکیں', reciter='قاری', full='مکمل قرآن کھولیں', fontCredit='مصحف کا خط: شاہ فہد قرآن کریم پرنٹنگ کمپلیکس', title='قرآن کتابی صورت میں', sub='مصحفِ مدینہ کی ترتیب سے قرآن کریم کو صفحہ بہ صفحہ پڑھیں، اور سامنے والے صفحے پر اپنی زبان میں معنی۔',
            page='صفحہ', notes='ترجمے کے حواشی', retry='دوبارہ کوشش کریں', error='صفحہ لوڈ نہیں ہو سکا۔ انٹرنیٹ کنکشن چیک کر کے دوبارہ کوشش کریں۔',
            loading='مصحف کھل رہا ہے…', text='متن', meaning='ترجمہ', index='سورت', tr='ترجمہ', prev='پچھلا صفحہ', next='اگلا صفحہ',
            hint='تیروں یا صفحہ سرکا کر ورق پلٹیں', btn='کتابی صورت میں پڑھیں'),
 'fr': dict(frame='Cadre', frameFull='Ornement complet', frameSides='Pages droite / gauche', frameNone='Sobre', listen='Écouter', pause='Pause', reciter='Récitateur', full='Ouvrir le Coran complet', fontCredit='Police du Mushaf : Complexe du Roi Fahd pour l’impression du Saint Coran', title='Le Coran comme un livre', sub='Feuilletez le Coran page par page, selon la mise en page du Mushaf de Médine, avec le sens en français en regard.',
            page='Page', notes='Notes du traducteur', retry='Réessayer', error='La page n’a pas pu être chargée. Vérifiez votre connexion et réessayez.',
            loading='Ouverture du livre…', text='Arabe', meaning='Sens', index='Sourate', tr='Traduction', prev='Page précédente', next='Page suivante',
            hint='Tournez les pages avec les flèches ou en faisant glisser', btn='Lire comme un livre'),
 'es': dict(frame='Marco', frameFull='Ornamento completo', frameSides='Páginas derecha / izquierda', frameNone='Sencillo', listen='Escuchar', pause='Pausa', reciter='Recitador', full='Abrir el Corán completo', fontCredit='Tipografía del Mushaf: Complejo Rey Fahd para la Impresión del Sagrado Corán', title='El Corán como un libro', sub='Hojea el Corán página a página, según la disposición del Mushaf de Medina, con el significado en español en la página de enfrente.',
            page='Página', notes='Notas del traductor', retry='Reintentar', error='No se pudo cargar la página. Revisa tu conexión e inténtalo de nuevo.',
            loading='Abriendo el libro…', text='Árabe', meaning='Significado', index='Sura', tr='Traducción', prev='Página anterior', next='Página siguiente',
            hint='Pasa las páginas con las flechas o deslizando', btn='Leer como un libro'),
 'ru': dict(frame='Рамка', frameFull='Полный орнамент', frameSides='Правая / левая страница', frameNone='Простая', listen='Слушать', pause='Пауза', reciter='Чтец', full='Открыть весь Коран', fontCredit='Шрифт мусхафа: Комплекс короля Фахда по изданию Священного Корана', title='Коран как книга', sub='Листайте Коран страница за страницей, как в Мединском мусхафе, со смыслом на русском языке на соседней странице.',
            page='Стр.', notes='Примечания переводчика', retry='Повторить', error='Не удалось загрузить страницу. Проверьте соединение и попробуйте снова.',
            loading='Открываем книгу…', text='Арабский', meaning='Смысл', index='Сура', tr='Перевод', prev='Предыдущая страница', next='Следующая страница',
            hint='Листайте стрелками или свайпом', btn='Читать как книгу'),
}

def audio_ui(u):
    return (f'<div class="bk-audio"><button type="button" class="bk-play" data-bk="play" aria-label="{u["listen"]}" title="{u["listen"]}">'
            f'<svg class="i-play" viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M7 4.5v15l12.5-7.5z" fill="currentColor"/></svg>'
            f'<svg class="i-pause" viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M6.5 4.5h4v15h-4zM13.5 4.5h4v15h-4z" fill="currentColor"/></svg>'
            f' <span class="t">{u["listen"]}</span></button>'
            f'<select class="bk-ctl" data-bk="reciter" aria-label="{u["reciter"]}"></select></div>')

def frame_ui(u):
    return (f'<select class="bk-ctl bk-framesel" data-bk="frameSel" aria-label="{u["frame"]}" title="{u["frame"]}">'
            f'<option value="sides">{u["frameSides"]}</option><option value="full">{u["frameFull"]}</option>'
            f'<option value="none">{u["frameNone"]}</option></select>')

def book_path(lang):
    return '/book/' if lang == 'ar' else f'/{lang}/book/'

def page(lang):
    fb, (_, ui_font_url, body_font, head_font) = FB[lang], FONTS[lang]
    u = UI[lang]
    cfg = dict(
        # The Arabic site opens the Mushaf itself (two facing Arabic pages); other languages, the Mushaf with the meaning.
        lang=lang, mode='mushaf' if lang == 'ar' else 'bilingual', translationOptional=(lang == 'ar'),
        arabicDigits=(lang == 'ar'), defaultShow='ar' if lang == 'ar' else 'tr',
        defaultTranslation=DEFAULT_TR[lang], translations=TRANSLATIONS,
        arabicNames=AR_NAMES, names=NAMES,
        uiNames=index_names(lang),
        ui={**{k: u[k] for k in ('page', 'notes', 'retry', 'error', 'loading', 'listen', 'pause')}, 'noTr': 'المصحف بلا ترجمة'},
        reciters=reciters(lang),
    )
    alts = ''.join(f'<link rel="alternate" hreflang="{l}" href="https://ltestament.com{book_path(l)}">\n' for l in LANGS)
    extra_font = f'<link href="{NASTALIQ}" rel="stylesheet" data-font="urdu_junagarhi">\n' if lang == 'ur' else ''
    tr_ui = (f'''  <select class="bk-ctl" data-bk="trSel" aria-label="{u['tr']}"></select>
  <div class="bk-tabs">
    <button class="bk-tab" data-show="ar">{u['text']}</button>
    <button class="bk-tab" data-show="tr">{u['meaning']}</button>
  </div>''')
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
  <select class="bk-ctl" data-bk="surahSel" aria-label="{u['index']}"></select>
  <label class="bk-pageno">{u['page']} <input class="bk-ctl" data-bk="pageInput" type="number" min="1" max="604" inputmode="numeric"></label>
{tr_ui}
</header>
<main class="bk-stage">
  <button class="bk-nav" data-bk="prev" aria-label="{u['prev']}" title="{u['prev']}"><svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
  <div class="bk-book anim" data-bk="book">
    <section class="bk-page bk-ar notranslate" data-bk="pgAr" lang="ar" translate="no"></section>
    <section class="bk-page bk-tr" data-bk="pgTr"></section>
  </div>
  <button class="bk-nav" data-bk="next" aria-label="{u['next']}" title="{u['next']}"><svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
</main>
<div class="bk-bottom">
  {audio_ui(u)}
  {frame_ui(u)}
  <input type="range" data-bk="range" min="1" max="604" value="1" aria-label="{u['page']}">
  <small data-bk="rangeLbl"></small>
  <small class="bk-hint">{u['hint']}</small>
  <small class="bk-fontcredit">{u['fontCredit']}</small>
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

EMBED_START, EMBED_END = '<!--book-embed-->', '<!--/book-embed-->'
HEAD_CSS = '<link rel="stylesheet" href="/css/book.css">'
BOOK_JS = '<script src="/js/book.js" defer></script>'

def embed(lang):
    """The open book shown on the home page, under «… فاقرأ رسالته إليك». Arabic page: a two-page Mushaf."""
    u = UI[lang]
    mushaf = lang == 'ar'
    cfg = dict(lang=lang, mode='mushaf' if mushaf else 'bilingual', arabicDigits=(lang == 'ar'),
               defaultShow='tr', defaultTranslation=DEFAULT_TR[lang], translations=TRANSLATIONS,
               arabicNames=AR_NAMES, names=NAMES,
               ui={k: u[k] for k in ('page', 'notes', 'retry', 'error', 'loading', 'listen', 'pause')},
               reciters=reciters(lang))
    data = html.escape(json.dumps(cfg, ensure_ascii=False), quote=True)
    bar = '' if mushaf else (
        f'\n    <select class="bk-ctl" data-bk="trSel" aria-label="{u["tr"]}"></select>'
        f'\n    <div class="bk-tabs"><button type="button" class="bk-tab" data-show="ar">{u["text"]}</button>'
        f'<button type="button" class="bk-tab" data-show="tr">{u["meaning"]}</button></div>')
    return f'''{EMBED_START}
<section class="bk-embed reveal" data-book="{data}">
  <div class="bk-embed-bar">{bar}
    {audio_ui(u)}
    {frame_ui(u)}
  </div>
  <div class="bk-stage">
    <button type="button" class="bk-nav" data-bk="prev" aria-label="{u['prev']}" title="{u['prev']}"><svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
    <div class="bk-book anim" data-bk="book">
      <section class="bk-page bk-ar notranslate" data-bk="pgAr" lang="ar" translate="no"></section>
      <section class="bk-page bk-tr" data-bk="pgTr"></section>
    </div>
    <button type="button" class="bk-nav" data-bk="next" aria-label="{u['next']}" title="{u['next']}"><svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
  </div>
  <div class="bk-embed-foot">
    <small data-bk="rangeLbl"></small>
    <a class="bk-full" href="{book_path(lang)}">📖 {u['full']}</a>
    <small>{u['fontCredit']}</small>
  </div>
</section>
{EMBED_END}
'''

def home_hook(path, lang):
    """Add (or refresh) on a home page: the reader-header button to /book/, and the embedded book."""
    p = pathlib.Path(path)
    s = p.read_text(encoding='utf-8')
    orig = s
    # button in the reader header
    s = re.sub(r'\n\s*<a class="reader-book"[^>]*>.*?</a>', '', s, flags=re.S)
    btn = f'\n    <a class="reader-book" href="{book_path(lang)}">📖 {UI[lang]["btn"]}</a>'
    m = re.search(r'(<div class="reader-lang-toggle">.*?</div>)', s, re.S)
    assert m, path
    s = s[:m.end()] + btn + s[m.end():]
    if BTN_CSS not in s:
        s = s.replace('</style>', BTN_CSS + '</style>', 1)
    # embedded book, before the cards of the «paths» section
    s = re.sub(re.escape(EMBED_START) + '.*?' + re.escape(EMBED_END) + '\n?', '', s, flags=re.S)
    anchor = s.find('<div class="paths-grid">', s.find('id="paths"'))
    assert anchor > 0, path
    line = s.rfind('\n', 0, anchor) + 1
    s = s[:line] + embed(lang) + s[line:]
    if HEAD_CSS not in s:
        s = s.replace('</head>', HEAD_CSS + '\n</head>', 1)
    if BOOK_JS not in s:
        s = s.replace('</body>', BOOK_JS + '\n</body>', 1)
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
