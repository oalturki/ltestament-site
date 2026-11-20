"""Tajweed rules of each word, read from the colours of the King Fahd Complex's colour Mushaf (QPC V4 fonts).

Each word of a page is one glyph of that page's font; in the font's COLR table the glyph is drawn in layers, each in a
colour of the palette (CPAL). The colours mark the tajweed rules (the Complex's key, TJKEY in js/book.js), so the
colours of a word's layers are the rules that word carries. Output: data/tajweed/p<N>.json = {"s:a:w": [rule, ...]},
words with no rule left out. Rule numbers follow TJCOL / TJKEY in js/book.js:
0 مد لازم #b50000 · 1 مد واجب #f40000 · 2 مد جائز #ff7b00 · 3 مد حركتان #ce9e00 · 4 غنة وإخفاء #09b000 ·
5 تفخيم #3f48e6 · 6 قلقلة #2fadff · 7 ما لا يُلفظ #a5a5a5 (and its near greys)."""
import json, pathlib
from fontTools.ttLib import TTFont
ROOT = pathlib.Path(__file__).resolve().parent.parent
RULE = {'b50000': 0, 'f40000': 1, 'ff7b00': 2, 'ce9e00': 3, '09b000': 4, '3f48e6': 5, '2fadff': 6,
        'a5a5a5': 7, 'a3a5a5': 7, '9fa5a5': 7}
out_dir = ROOT / 'data/tajweed'; out_dir.mkdir(exist_ok=True)
seen = {}
for p in range(1, 605):
    fp = ROOT / f'fonts/qpc-v4/p{p}.woff2'
    if not fp.exists(): continue
    f = TTFont(fp); colr = f['COLR']; pal = f['CPAL'].palettes[0]; cmap = f.getBestCmap()
    hexes = ['%02x%02x%02x' % (c.red, c.green, c.blue) for c in pal]
    m = json.loads((ROOT / f'data/mushaf/p{p}.json').read_text())
    res = {}
    for L in m['l']:
        if L[0] != 'a': continue
        for w in L[2]:
            if not w[1] or len(w[1].split(':')) != 3 or len(w[0]) != 1: continue
            g = cmap.get(ord(w[0])); layers = colr.ColorLayers.get(g) if g else None
            if not layers: continue
            rs = sorted({RULE[hexes[l.colorID]] for l in layers if l.colorID < len(hexes) and hexes[l.colorID] in RULE})
            for l in layers:
                h = hexes[l.colorID] if l.colorID < len(hexes) else '?'
                seen[h] = seen.get(h, 0) + 1
            if rs and not (w[2] or '').strip().isdigit(): res[w[1]] = rs
    (out_dir / f'p{p}.json').write_text(json.dumps(res, ensure_ascii=False, separators=(',', ':')))
print(sorted(seen.items(), key=lambda x: -x[1])[:20])
