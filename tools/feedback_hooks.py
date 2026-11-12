"""Add the feedback feature hooks to a language home page (idempotent).
- stylesheet link, nav link, CTA button, "What people say" section, script tag.
"""
import pathlib, re

LABELS = {
    'ar': dict(nav='رأيك يهمنا', btn='رأيك يهمنا', tm='قالوا عن الموقع', href='/feedback/'),
    'en': dict(nav='Your Opinion', btn='Share your opinion', tm='What people say about the site', href='/en/feedback/'),
    'ur': dict(nav='آپ کی رائے', btn='اپنی رائے دیں', tm='لوگ ویب سائٹ کے بارے میں کیا کہتے ہیں', href='/ur/feedback/'),
    'fr': dict(nav='Votre avis', btn='Donnez votre avis', tm='Ce qu’ils disent du site', href='/fr/feedback/'),
    'es': dict(nav='Tu opinión', btn='Comparte tu opinión', tm='Lo que dicen del sitio', href='/es/feedback/'),
    'ru': dict(nav='Ваш отзыв', btn='Оставить отзыв', tm='Что говорят о сайте', href='/ru/feedback/'),
}

def apply(path, lang):
    p = pathlib.Path(path)
    s = p.read_text(encoding='utf-8')
    L = LABELS[lang]
    if 'data-testimonials' in s:
        return False
    def once(old, new, count=1):
        nonlocal s
        assert s.count(old) == count, (path, old[:60], s.count(old))
        s = s.replace(old, new)
    once('</head>', '<link rel="stylesheet" href="/css/feedback.css">\n</head>')
    # nav: add after the "#talk" nav link (first one, in <nav>)
    m = re.search(r'(<div class="nav-links">\s*(?:<a [^>]*>[^<]*</a>\s*)*?<a href="(?:#talk|/(?:[a-z]{2}/)?ask/)">[^<]*</a>)', s)
    s = s[:m.end()] + f'\n    <a href="{L["href"]}">{L["nav"]}</a>' + s[m.end():]
    # CTA: feedback button after the existing buttons
    m = re.search(r'(<div class="cta-buttons">.*?)(\n    </div>)', s, re.S)
    s = s[:m.end(1)] + f'\n      <a href="{L["href"]}" class="btn btn-outline">{L["btn"]}</a>' + s[m.end(1):]
    # testimonials section before the CTA
    once('<section class="cta" id="talk">', f'''<section class="tm" data-testimonials hidden>
  <h2 class="tm-title">{L["tm"]}</h2>
  <div class="tm-list"></div>
</section>

<section class="cta" id="talk">''')
    once('</body>', '<script src="/js/feedback.js"></script>\n</body>')
    p.write_text(s, encoding='utf-8')
    return True

if __name__ == '__main__':
    R = str(pathlib.Path(__file__).resolve().parent.parent) + '/'
    for f, l in [('index.html', 'ar'), ('en/index.html', 'en'), ('ur/index.html', 'ur')]:
        print(f, apply(R + f, l))
