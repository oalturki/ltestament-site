#!/usr/bin/env python3
"""Build the recitation timing data used by the book's audio player (js/book.js).

Sources (Quranic Universal Library, qul.tarteel.ai — downloaded by the site owner, kept in tools/data/rec/):
  abdulbasit-murattal.json      Abdul Basit, murattal, ayah by ayah, word timings      /resources/recitation/115
  minshawi-murattal.json        Al-Minshawi, murattal, ayah by ayah, word timings      /resources/recitation/108
  maher-murattal.json           Maher al-Muaiqly, murattal, ayah by ayah, word timings /resources/recitation/113
  basfar-walk-segments.json     Abdullah Basfar + Ibrahim Walk (Saheeh Intl), surah files, ayah timings   /resources/recitation/331
  basfar-walk-surah.json
  abdulbasit-walk-surah.json    Abdul Basit + Ibrahim Walk (Saheeh Intl), surah files, no timings         /resources/recitation/326
The audio itself is NOT stored on the site; it streams from the URLs in RECITERS (tools/build_book.py).

Output:
  data/rec/<id>/p<N>.json   word reciters, one file per Mushaf page: {"s:a": [[word, startMs, endMs], ...], ...}
  data/rec/<id>.json        surah reciters with ayah timings: {"<surah>": [[ayah, fromMs, toMs], ...], ...}
"""
import json, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / 'tools' / 'data' / 'rec'
OUT = ROOT / 'data' / 'rec'
WORD = {'abdulbasit': 'abdulbasit-murattal.json', 'minshawi': 'minshawi-murattal.json', 'maher': 'maher-murattal.json'}
AYAH = {}  # surah-file reciters with ayah timings (none in use: the Basfar + Walk timings in QUL do not match its audio)


def page_of_ayah():
    mp = json.load(open(ROOT / 'data' / 'quran-pages.json'))
    out = {}
    for i, (s1, v1, s2, v2) in enumerate(mp['pages']):
        for s in range(s1, s2 + 1):
            a = v1 if s == s1 else 1
            b = v2 if s == s2 else mp['verses'][s - 1]
            for v in range(a, b + 1):
                out.setdefault((s, v), i + 1)
    return out


def main():
    pages = page_of_ayah()
    assert len(pages) == 6236
    for rid, fn in WORD.items():
        d = json.load(open(SRC / fn, encoding='utf-8'))
        by_page = {}
        for k, v in d.items():
            s, a = map(int, k.split(':'))
            by_page.setdefault(pages[(s, a)], {})[k] = [[int(w), int(st), int(en)] for w, st, en in v['segments']]
        (OUT / rid).mkdir(parents=True, exist_ok=True)
        for p, m in by_page.items():
            (OUT / rid / f'p{p}.json').write_text(json.dumps(m, separators=(',', ':')), encoding='utf-8')
        print(rid, len(by_page), 'pages')
    for rid, fn in AYAH.items():
        d = json.load(open(SRC / fn, encoding='utf-8'))
        by_s = {}
        for k, v in d.items():
            s, a = map(int, k.split(':'))
            by_s.setdefault(str(s), []).append([a, int(v['timestamp_from']), int(v['timestamp_to'])])
        for l in by_s.values():
            l.sort()
        (OUT / f'{rid}.json').write_text(json.dumps(by_s, separators=(',', ':')), encoding='utf-8')
        print(rid, sum(len(l) for l in by_s.values()), 'ayahs')


if __name__ == '__main__':
    main()
