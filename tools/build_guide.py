"""The Mushaf's user guide (دليل الاستخدام): tools/data/guide/<lang>.md → data/guide/<lang>.html, an HTML fragment
the Mushaf's settings load into their «Guide» page (js/book.js). The text is written and approved in the project's
doc «دليل استخدام مصحف العهد الأخير»; side headings end with a colon. Run: python3 tools/build_guide.py"""
import pathlib, markdown
ROOT = pathlib.Path(__file__).resolve().parent.parent
for src in sorted((ROOT / 'tools/data/guide').glob('*.md')):
    html = markdown.markdown(src.read_text(encoding='utf-8'), extensions=['sane_lists'])
    # each side heading opens a section that folds, so the guide reads as a list of services
    parts = html.split('<h2>')
    out = parts[0]
    for p in parts[1:]:
        head, body = p.split('</h2>', 1)
        out += '<details class="gd-s"><summary>' + head + '</summary>' + body + '</details>'
    dst = ROOT / 'data/guide' / (src.stem + '.html')
    dst.write_text(out, encoding='utf-8')
    print(dst.relative_to(ROOT), len(out))
