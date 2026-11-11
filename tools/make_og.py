"""Generate a 1200x630 share image (og-<lang>.jpg) for one language of the site.
Usage: python3 make_og.py <lang> <out_dir>
"""
import subprocess, sys, pathlib
from PIL import Image

F = str(pathlib.Path(__file__).resolve().parent / 'fonts')  # put the .ttf files here (Google Fonts)
VERSE = 'مُصَدِّقًا لِمَا بَيْنَ يَدَيْهِ مِنَ الْكِتَابِ وَمُهَيْمِنًا عَلَيْهِ'

LANGS = {
    'ur': dict(dir='rtl', head='U', body='U', title_size=110, eyebrow_size=28,
               eyebrow='پرانا عہد نامہ · نیا عہد نامہ · آخری عہد نامہ',
               title='آخری عہد نامہ', ref='سورۃ المائدہ، آیت ۴۸', extra='h1{padding-bottom:34px}'),
    'en': dict(dir='ltr', head='Fr', body='W', title_size=120, eyebrow_size=26,
               eyebrow='The Old Testament · The New Testament · The Last Testament',
               title='The Last Testament', ref='The Qur’an, 5:48'),
    'fr': dict(dir='ltr', head='Fr', body='W', title_size=104, eyebrow_size=24,
               eyebrow='L’Ancien Testament · Le Nouveau Testament · Le Dernier Testament',
               title='Le Dernier Testament', ref='Le Coran, 5:48'),
    'es': dict(dir='ltr', head='Fr', body='W', title_size=98, eyebrow_size=24,
               eyebrow='El Antiguo Testamento · El Nuevo Testamento · El Último Testamento',
               title='El Último Testamento', ref='El Corán, 5:48'),
    'ru': dict(dir='ltr', head='Lo', body='In', title_size=104, eyebrow_size=24,
               eyebrow='Ветхий Завет · Новый Завет · Последний Завет',
               title='Последний Завет', ref='Коран, 5:48'),
}

def html(c):
    return f'''<!DOCTYPE html><html dir="{c['dir']}"><head><meta charset="utf-8"><style>
@font-face{{font-family:U;src:url({F}/NotoNastaliqUrdu.ttf)}}
@font-face{{font-family:Fr;src:url({F}/Fraunces.ttf)}}
@font-face{{font-family:W;src:url({F}/WorkSans.ttf)}}
@font-face{{font-family:A;src:url({F}/Amiri-Regular.ttf)}}
@font-face{{font-family:Lo;src:url({F}/Lora.ttf)}}
@font-face{{font-family:In;src:url({F}/Inter.ttf)}}
html,body{{margin:0;width:1200px;height:630px;overflow:hidden}}
body{{background:radial-gradient(ellipse 80% 70% at 50% 40%,#101B33 0%,#0A1425 75%);display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;color:#F3E8D0;position:relative}}
.frame{{position:absolute;inset:28px;border:1.5px solid rgba(200,155,60,.45);border-radius:6px}}
.eyebrow{{font:500 {c['eyebrow_size']}px/1.6 {c['body']};color:#DCC078;margin-bottom:6px}}
h1{{font:600 {c['title_size']}px/1.35 {c['head']};margin:0;text-shadow:0 0 50px rgba(200,155,60,.4)}}
.fl{{display:flex;align-items:center;gap:16px;margin:14px 0 18px}}.fl i{{width:120px;height:1.5px;background:linear-gradient(90deg,transparent,#C89B3C)}}.fl i:last-child{{transform:scaleX(-1)}}.fl b{{width:10px;height:10px;background:#C89B3C;transform:rotate(45deg)}}
.v{{font:400 38px/1.6 A;direction:rtl}}
.ref{{font:500 22px/1.8 {c['body']};color:#C89B3C;margin-top:4px}}
.dom{{position:absolute;bottom:50px;font:500 24px {c['body']};color:#DCC078;direction:ltr;letter-spacing:1px}}
{c.get('extra','')}
</style></head><body><div class="frame"></div>
<div class="eyebrow">{c['eyebrow']}</div><h1>{c['title']}</h1>
<div class="fl"><i></i><b></b><i></i></div>
<div class="v">{VERSE}</div><div class="ref">{c['ref']}</div>
<div class="dom">ltestament.com</div></body></html>'''

if __name__ == '__main__':
    lang, out = sys.argv[1], pathlib.Path(sys.argv[2])
    tmp = pathlib.Path(f'/tmp/og-{lang}.html')
    tmp.write_text(html(LANGS[lang]), encoding='utf-8')
    png = f'/tmp/og-{lang}.png'
    subprocess.run(['google-chrome', '--headless=new', '--no-sandbox', '--disable-gpu',
                    '--hide-scrollbars', '--allow-file-access-from-files',
                    '--window-size=1200,630', f'--screenshot={png}', f'file://{tmp}'],
                   check=True, capture_output=True)
    Image.open(png).convert('RGB').save(out / f'og-{lang}.jpg', quality=88)
    print('wrote', out / f'og-{lang}.jpg')
