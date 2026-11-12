"""Add the site's X (Twitter) account to a language home page (idempotent).
- <meta name="twitter:site"> so shared links credit the account
- a link in the footer
Change HANDLE here and re-run to update every page:
    python3 tools/social_hooks.py
"""
import pathlib, re

HANDLE = 'ltestament4u'
URL = f'https://x.com/{HANDLE}'
# Accessible label per language ("Follow us on X")
LABEL = {
    'ar': 'تابعنا على X', 'en': 'Follow us on X', 'ur': 'X پر ہمیں فالو کریں',
    'fr': 'Suivez-nous sur X', 'es': 'Síguenos en X', 'ru': 'Мы в X',
}
ICON = ('<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" fill="currentColor">'
        '<path d="M18.9 2H22l-6.8 7.8L23 22h-6.1l-4.8-6.3L6.6 22H3.5l7.3-8.3L1 2h6.3l4.3 5.7L18.9 2z'
        'm-1.1 18h1.7L6.3 3.9H4.5L17.8 20z"/></svg>')
CSS = ('  .footer-x{ color:inherit; text-decoration:none; display:inline-flex; align-items:center; gap:7px; '
       'direction:ltr; white-space:nowrap; }\n'
       '  .footer-x:hover{ color:var(--gold, #d4af37); opacity:1; }\n')

def apply(path, lang):
    p = pathlib.Path(path)
    s = p.read_text(encoding='utf-8')
    orig = s
    meta = f'<meta name="twitter:site" content="@{HANDLE}">'
    s = re.sub(r'<meta name="twitter:site" content="[^"]*">\n?', '', s)
    s = s.replace('<meta name="twitter:card" content="summary_large_image">',
                  '<meta name="twitter:card" content="summary_large_image">\n' + meta, 1)
    s = re.sub(r'\s*<a class="footer-x"[^>]*>.*?</a>', '', s, flags=re.S)
    link = (f'\n  <a class="footer-x" href="{URL}" target="_blank" rel="noopener me" '
            f'aria-label="{LABEL[lang]}" title="{LABEL[lang]}">{ICON}<span>@{HANDLE}</span></a>')
    assert s.count('</footer>') == 1, path
    s = s.replace('\n</footer>', link + '\n</footer>', 1)
    if '.footer-x{' not in s:
        s = s.replace('</style>', CSS + '</style>', 1)
    if s != orig:
        p.write_text(s, encoding='utf-8')
    return s != orig

PAGES = {'ar': 'index.html', 'en': 'en/index.html', 'ur': 'ur/index.html',
         'fr': 'fr/index.html', 'es': 'es/index.html', 'ru': 'ru/index.html'}

if __name__ == '__main__':
    root = pathlib.Path(__file__).resolve().parent.parent
    for lang, rel in PAGES.items():
        print(lang, 'updated' if apply(root / rel, lang) else 'unchanged')
