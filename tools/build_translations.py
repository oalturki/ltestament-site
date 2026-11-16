#!/usr/bin/env python3
"""The translations of the meanings, served by the site itself — data/tr/<key>/<surah>.json.

The book used to read every surah from the QuranEnc API while the reader turned pages; when that service is slow
or down (16 Nov 2026), the book could not open. Now the same texts are files of the site, and js/book.js reads
QuranEnc only as a fallback. Each file: [{"sura": s, "aya": a, "translation": "...", "footnotes": "..."}, ...]
— the shape of the QuranEnc API, so the book needs no other change.

Sources (tools/data/tr/):
  english_saheeh, french_montada, spanish_montada_latin, urdu_junagarhi — QuranEnc CSV downloads (with footnotes)
  russian_aboadel — QUL's copy (translation 446) + the 48 ayahs where QuranEnc differs (russian_aboadel_from_quranenc.json)
Update: download the CSV again from QuranEnc, then run  python3 tools/build_translations.py
"""
import csv, json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TR = ROOT / 'tools/data/tr'
OUT = ROOT / 'data/tr'


def write(key, rows):
    assert len(rows) == 6236, (key, len(rows))
    by = {}
    for r in rows:
        by.setdefault(r['sura'], []).append(r)
    d = OUT / key
    d.mkdir(parents=True, exist_ok=True)
    total = 0
    for s, items in by.items():
        p = d / f'{s}.json'
        p.write_text(json.dumps(sorted(items, key=lambda x: x['aya']), ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
        total += p.stat().st_size
    print(key, len(by), 'surahs', total // 1024, 'KB')


for key in ('english_saheeh', 'french_montada', 'spanish_montada_latin', 'urdu_junagarhi'):
    rows = [r for r in csv.reader(open(TR / f'{key}.csv', encoding='utf-8')) if r and r[0].isdigit()]
    write(key, [{'sura': int(r[1]), 'aya': int(r[2]), 'translation': r[3], 'footnotes': r[4] or None} for r in rows])

ru = json.load(open(TR / 'russian_aboadel_qul.json', encoding='utf-8'))
fix = json.load(open(TR / 'russian_aboadel_from_quranenc.json', encoding='utf-8'))
rows = []
for k, v in ru.items():
    s, a = map(int, k.split(':'))
    rows.append({'sura': s, 'aya': a, 'translation': fix.get(k, v['t']), 'footnotes': None})
write('russian_aboadel', rows)
