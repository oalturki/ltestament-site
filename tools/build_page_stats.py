"""Words and letters on each Mushaf page, for the reading statistics (data/page-stats.json).

Source: data/text-simple/<surah>.json (one string per ayah) and data/quran-pages.json (the ayahs of each page).
Letters: the written Arabic letters (hamza to yaa, and alef wasla), without harakat, small marks, tatweel or the
superscript alef. Words: separated by spaces. Output: [[words, letters], ...] for pages 1..604."""
import json, pathlib, re
ROOT = pathlib.Path(__file__).resolve().parent.parent
m = json.loads((ROOT / 'data/quran-pages.json').read_text())
texts = {s: json.loads((ROOT / f'data/text-simple/{s}.json').read_text()) for s in range(1, 115)}
LET = re.compile('[ء-غف-يٱ]')
out, tw, tl = [], 0, 0
for s1, a1, s2, a2 in m['pages']:
    w = l = 0
    for s in range(s1, s2 + 1):
        lo = a1 if s == s1 else 1
        hi = a2 if s == s2 else len(texts[s])
        for a in range(lo, hi + 1):
            t = texts[s][a - 1]
            w += len(t.split()); l += len(LET.findall(t))
    out.append([w, l]); tw += w; tl += l
(ROOT / 'data/page-stats.json').write_text(json.dumps(out, separators=(',', ':')))
print('pages', len(out), 'words', tw, 'letters', tl)
