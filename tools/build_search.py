#!/usr/bin/env python3
"""Build the data for the site search (js/search.js).

Sources (QUL, qul.tarteel.ai/resources/quran-script):
  imlaei-simple.json       "Imlaei simple – Ayah by ayah" (84): plain undiacritised spelling — what is searched
  qpc-hafs-wbw.json        "KFGQPC Hafs script – Word by word" (312): the Complex's text — what results show
  imlaei-simple-wbw.json   "Imlaei simple" word by word (60): same word numbering as the Hafs words — used to know
                           which shown word matched (a word can be two plain words, e.g. «يا ايها» = «يَٰٓأَيُّهَا»)

Output: data/search/quran-ar.json  {"v": [ayah counts per surah], "t": [6236 plain ayah texts in order],
          "u": [6236 × Hafs words joined by "|"], "k": [6236 × plain words joined by "|"], "n": {lang: [114 surah names]}}
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
from collections import defaultdict
U, K = defaultdict(list), defaultdict(list)
hafs = json.load(open(ROOT / 'tools/data/search/qpc-hafs-wbw.json', encoding='utf-8'))
plain = json.load(open(ROOT / 'tools/data/search/imlaei-simple-wbw.json', encoding='utf-8'))
for w in sorted(hafs.values(), key=lambda x: x['id']):
    U[(int(w['surah']), int(w['ayah']))].append(w['text'])
for w in sorted(plain.values(), key=lambda x: x['id']):
    K[(int(w['surah']), int(w['ayah']))].append(w['text'])
u, k = [], []
for r in rows:
    key = (r['surah'], r['ayah'])
    hw, pw = U[key][:-1], K[key][:-1]          # the last "word" of each ayah is its end mark
    assert len(hw) == len(pw), key
    u.append('|'.join(hw)); k.append('|'.join(pw))
out = {'v': counts, 't': [r['text'] for r in rows], 'u': u, 'k': k, 'n': names}
p = ROOT / 'data/search/quran-ar.json'
p.write_text(json.dumps(out, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
print(p, p.stat().st_size // 1024, 'KB')
