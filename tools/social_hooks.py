"""Hooks for site-wide settings on each language home page (idempotent):
- an empty social-links container in the footer, filled by /js/site.js from the admin panel's
  "إعدادات الموقع" (table public.site_settings) — shown/hidden there, no code change needed
- CSS for the container and for hiding the "under development" banner
- <script src="/js/site.js">
- <meta name="twitter:site"> (static, read by X when a link is shared). Set TWITTER_SITE to the
  handle when the X account goes public, or None to leave it out, then run:
    python3 tools/social_hooks.py
"""
import pathlib, re

TWITTER_SITE = None          # e.g. 'ltestament4u' once the account is launched

CSS = ('  .footer-social{ display:flex; gap:16px; align-items:center; direction:ltr; }\n'
       '  .footer-social[hidden]{ display:none; }\n'
       '  .footer-social a{ color:inherit; display:inline-flex; transition:color .2s; }\n'
       '  .footer-social a:hover{ color:var(--gold); }\n'
       '  .no-dev-banner .dev-banner{ display:none; }\n'
       '  .no-dev-banner nav{ top:0; }\n')
BOX = '\n  <span class="footer-social" data-social hidden></span>'
SCRIPT = '<script src="/js/site.js" defer></script>\n'

def apply(path, lang=None):
    p = pathlib.Path(path)
    s = p.read_text(encoding='utf-8')
    orig = s
    # clean previous versions
    s = re.sub(r'<meta name="twitter:site" content="[^"]*">\n?', '', s)
    s = re.sub(r'\s*<a class="footer-x"[^>]*>.*?</a>', '', s, flags=re.S)
    s = re.sub(r'  \.footer-x\{[^\n]*\n', '', s)
    s = re.sub(r'  \.footer-x:hover\{[^\n]*\n', '', s)
    s = s.replace(CSS, '').replace(BOX, '').replace(SCRIPT, '')
    # add
    if TWITTER_SITE:
        s = s.replace('<meta name="twitter:card" content="summary_large_image">',
                      '<meta name="twitter:card" content="summary_large_image">\n'
                      f'<meta name="twitter:site" content="@{TWITTER_SITE}">', 1)
    assert s.count('</footer>') == 1, path
    s = s.replace('\n</footer>', BOX + '\n</footer>', 1)
    s = s.replace('</style>', CSS + '</style>', 1)
    s = s.replace('</body>', SCRIPT + '</body>', 1)
    if s != orig:
        p.write_text(s, encoding='utf-8')
    return s != orig

PAGES = {'ar': 'index.html', 'en': 'en/index.html', 'ur': 'ur/index.html',
         'fr': 'fr/index.html', 'es': 'es/index.html', 'ru': 'ru/index.html'}

if __name__ == '__main__':
    root = pathlib.Path(__file__).resolve().parent.parent
    for lang, rel in PAGES.items():
        print(lang, 'updated' if apply(root / rel, lang) else 'unchanged')
