#!/usr/bin/env python3
"""Build the data for the site search (js/search.js).

Source: tools/data/search/imlaei-simple.json — QUL "Imlaei simple – Ayah by ayah" (qul.tarteel.ai/resources/quran-script):
the Quran in plain (undiacritised) Arabic spelling, good for searching. The Mushaf itself is shown with the Complex's text.

Output: data/search/quran-ar.json  {"v": [ayah counts per surah], "t": [6236 ayah texts in order],
                                    "n": {lang: [114 surah names]}}
"""
import json, pathlib, sys
ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / 'tools'))
import build_book

d = json.load(open(ROOT / 'tools/data/search/imlaei-simple.json', encoding='utf-8'))
rows = sorted(d.values(), key=lambda r: r['id'])
assert len(rows) == 6236
counts = [0] * 114
for r in rows:
    counts[r['surah'] - 1] += 1
names = {'ar': build_book.AR_NAMES, 'en': build_book.NAMES['en'], 'ru': build_book.NAMES['ru']}
out = {'v': counts, 't': [r['text'] for r in rows], 'n': names}
p = ROOT / 'data/search/quran-ar.json'
p.write_text(json.dumps(out, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
print(p, p.stat().st_size // 1024, 'KB')
