#!/usr/bin/env python3
"""Build the page-exact Madinah Mushaf data (King Fahd Complex, 1421H print, 15 lines, 604 pages).

Sources (Quranic Universal Library, qul.tarteel.ai — downloaded by the site owner, kept OUT of the repo
in tools/data/qpc/ which .assetsignore excludes from the site):
  - layout-v2.db            KFGQPC V2 layout (1421H print)            /resources/mushaf-layout/10
  - words-v2.json           QPC V2 Glyph – word by word               /resources/quran-script/61
  - surah-header-lig.json   Surah header font: surah -> glyph         /resources/font/458
  - quran-meta.json         starts of the 240 hizb quarters and the 15 sajdas (from fawazahmed0/quran-api info.json)
Fonts (served by the site, unmodified):
  - fonts/qpc-v2/p1..p604.woff2   QPC V2 page fonts                   /resources/font/249
  - fonts/qpc-surah-header.woff2  Surah header colour font            /resources/font/458

Output:
  - data/mushaf/p{N}.json   one file per page: {"l": [line, ...]}
        ["s", surah, headerGlyph]          surah header (frame + name)
        ["b"]                              basmala line
        ["a", centered, [[glyph, "s:a:w", Hafs text], ...]]   a line of words (the ayah-end marks are words too)
      "m": [[lineIndex, label], ...]   margin notes, as in the printed Mushaf: hizb quarters and sajdas
  - data/quran-pages.json   page map used by the book: pages[p-1] = [s1, v1, s2, v2] (+ juz, verses),
                            rebuilt from this layout so the meaning page shows exactly the verses of the Mushaf page.

Usage:  python3 tools/build_mushaf.py [path/to/qpc-data-dir]
"""
import json, pathlib, sqlite3, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / 'tools' / 'data' / 'qpc'
OUT = ROOT / 'data' / 'mushaf'


def main():
    words = json.load(open(SRC / 'words-v2.json', encoding='utf-8'))
    # each word's text in the Complex's Hafs script (QUL /resources/quran-script, word by word) — shown when a word is tapped
    hafs = json.load(open(ROOT / 'tools/data/search/qpc-hafs-wbw.json', encoding='utf-8'))
    by_id = {w['id']: w for w in words.values()}
    heads = json.load(open(SRC / 'surah-header-lig.json', encoding='utf-8'))
    db = sqlite3.connect(f"file:{SRC / 'layout-v2.db'}?mode=ro", uri=True)
    rows = db.execute('select page_number, line_number, line_type, is_centered, first_word_id, last_word_id, surah_number '
                      'from pages order by page_number, line_number').fetchall()

    meta = json.load(open(SRC / 'quran-meta.json', encoding='utf-8'))
    AR = str.maketrans('0123456789', '٠١٢٣٤٥٦٧٨٩')
    notes = {}                                     # (surah, ayah) -> label; quarter notes sit on the ayah's first line
    for i, (s_, a_) in enumerate(meta['maqras']):
        if i == 0:
            continue
        h, q = i // 4 + 1, i % 4
        notes[(s_, a_, 'start')] = (['الحزب', 'ربع الحزب', 'نصف الحزب', 'ثلاثة أرباع الحزب'][q] + ' ' + str(h)).translate(AR)
    for s_, a_ in meta['sajdas']:
        notes[(s_, a_, 'end')] = 'سجدة'
    pages = {p: [] for p in range(1, 605)}
    marks = {p: [] for p in range(1, 605)}
    first_last = {}
    for p, _n, typ, cen, a, b, s in rows:
        if typ == 'surah_name':
            pages[p].append(['s', int(s), heads[f'surah-{int(s)}'].strip()])
        elif typ == 'basmallah':
            pages[p].append(['b'])
        else:
            line = []
            for i in range(int(a), int(b) + 1):
                w = by_id[i]
                line.append([w['text'], w['location'], hafs[w['location']]['text']])
                sa = (int(w['surah']), int(w['ayah']))
                if w['word'] == '1' and (*sa, 'start') in notes:
                    marks[p].append([len(pages[p]), notes[(*sa, 'start')]])
                nxt = by_id.get(i + 1)
                if (*sa, 'end') in notes and (not nxt or (int(nxt['surah']), int(nxt['ayah'])) != sa):
                    marks[p].append([len(pages[p]), notes[(*sa, 'end')]])
                key = (int(w['surah']), int(w['ayah']))
                fl = first_last.setdefault(p, [key, key])
                fl[0] = min(fl[0], key); fl[1] = max(fl[1], key)
            pages[p].append(['a', int(cen or 0), line])

    OUT.mkdir(parents=True, exist_ok=True)
    total = 0
    for p, lines in pages.items():
        assert len(lines) <= 15, p
        doc = {'l': lines}
        if marks[p]:
            doc['m'] = marks[p]
        s = json.dumps(doc, ensure_ascii=False, separators=(',', ':'))
        (OUT / f'p{p}.json').write_text(s, encoding='utf-8')
        total += len(s.encode())

    # page map for the meaning page
    mp_path = ROOT / 'data' / 'quran-pages.json'
    mp = json.load(open(mp_path, encoding='utf-8'))
    new_pages = [[*first_last[p][0], *first_last[p][1]] for p in range(1, 605)]
    changed = [p + 1 for p in range(604) if mp['pages'][p] != new_pages[p]]
    mp['pages'] = new_pages
    mp_path.write_text(json.dumps(mp, separators=(',', ':')), encoding='utf-8')
    print(f'pages: 604, data {total // 1024} KB, page map changes: {len(changed)} {changed[:20]}')


if __name__ == '__main__':
    main()
