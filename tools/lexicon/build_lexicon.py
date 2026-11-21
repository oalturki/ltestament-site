"""قاموس الكلمة — step 0 of the recitation-check method (see «منهجية نظام التسميع الذكي»).

One row per Mushaf word (Madinah Mushaf, 77,432 words), keyed by its place s:a:w, holding every form the system
needs, so all its parts speak one language:
  u   the word as in the Madinah Mushaf (data/mushaf)                         — shown, and the tajweed's reference
  i   its imla'i (Tanzil simple) word(s), the recitation check's text           — tools/lexicon/align_simple.py
  p   how it is said, joined to the words around it (wasl)                     — quran-transcript (MIT), Hafs
  pw  how it is said when the reader stops on it (waqf), where he may stop      — the verse phonetised up to the word
  r   tajweed rules from quran-transcript: [rule, golden length (harakat) or null]
  c   rule colours of the King Fahd Complex's colour Mushaf (data/tajweed: 0..7, see build_tajweed_rules.py)
  t   timing in the reference recitations, ms: {"minshawi": [start, end], "abdulbasit": [...]}
  stop 1 when a pause mark follows the word, 2 at the verse's end (the reader may stop: the waqf form is allowed)
Default readings (MoshafAttributes): madd munfasil 4, muttasil 4, aarid 2; the other valid lengths are allowed by
rule in the matching, not written per word.
Usage: /tmp/qtenv/bin/python tools/lexicon/build_lexicon.py [first last]   → data/lexicon/<surah>.json"""
import json, os, re, sys, glob
from difflib import SequenceMatcher
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from align_simple import mushaf_words, skel, MARK
from quran_transcript import Aya, quran_phonetizer, MoshafAttributes

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, 'data/lexicon'); os.makedirs(OUT, exist_ok=True)
MOSHAF = MoshafAttributes(rewaya='hafs', madd_monfasel_len=4, madd_mottasel_len=4, madd_mottasel_waqf=4, madd_aared_len=2)
SIMPLE = json.load(open(os.path.join(ROOT, 'tools/lexicon/out/simple_map.json'), encoding='utf-8'))
TANZIL = json.load(open(os.path.join(ROOT, 'asr-space/quran-simple.json'), encoding='utf-8'))['s']   # with pause marks

def load_pages(kind):
    d = {}
    for f in glob.glob(os.path.join(ROOT, f'data/{kind}/p*.json')): d.update(json.load(open(f, encoding='utf-8')))
    return d
COLOURS = load_pages('tajweed')
TIMES = {r: load_pages(f'rec/{r}') for r in ('minshawi', 'abdulbasit')}

def word_spans(text):
    """[(start, end)] of each space-separated word in text"""
    out, i = [], 0
    for w in text.split(' '):
        out.append((i, i + len(w))); i += len(w) + 1
    return out

def per_word(uth, out):
    """the phonetic script and rules of each word of uth, from the phonetizer's character mapping"""
    res = []
    for a, b in word_spans(uth):
        ps, rules = [], []
        for m in out.mappings[a:b]:
            if m.pos and not m.deleted: ps.append(m.pos)
            for r in (m.tajweed_rules or []):
                nm = getattr(r, 'name', None); nm = getattr(nm, 'ar', None) or str(nm)
                key = (nm, getattr(r, 'golden_len', None))
                if key not in rules: rules.append(key)
        if ps:
            lo, hi = min(p[0] for p in ps), max(p[1] for p in ps)
            res.append((lo, hi, rules))
        else: res.append((None, None, rules))
    # the phonemes between words (a sound joined across the gap) belong to the word before
    ph = out.phonemes
    words = []
    for k, (lo, hi, rules) in enumerate(res):
        if lo is None: words.append(('', rules)); continue
        nxt = next((r[0] for r in res[k + 1:] if r[0] is not None), len(ph))
        words.append((ph[lo:nxt].strip(), rules))
    return words

def stops_of(s, a):
    """simple-text word numbers followed by a pause mark"""
    out, w = set(), 0
    for x in TANZIL[str(s)][a - 1].split():
        if MARK.match(x): out.add(w)
        else: w += 1
    return out

def build(s):
    mw = mushaf_words()
    rows = {}
    for a in range(1, len(TANZIL[str(s)]) + 1):
        aya = Aya(s, a).get(); uth = aya.uthmani
        out = quran_phonetizer(uth, MOSHAF, sura_idx=s)
        pw = per_word(uth, out)
        uw = uth.split(' ')
        m = mw[(s, a)]
        # the phonetizer's (Tanzil Uthmani) words against the Mushaf's: same count almost always; else by letters
        if len(uw) == len(m): link = list(range(len(m)))
        else:
            link, j = [], 0
            for i, w in enumerate(m):
                best, bj = -1, j
                for jj in range(j, min(len(uw), j + 3)):
                    r = SequenceMatcher(None, skel(w), skel(uw[jj])).ratio()
                    if r > best: best, bj = r, jj
                link.append(bj); j = bj + 1
        stops = stops_of(s, a)
        # where the reader may stop inside the verse: its words up to there, said as he stops (waqf)
        simple_index, n = {}, 0
        for i in range(len(m)):
            loc = f'{s}:{a}:{i + 1}'
            for _ in SIMPLE.get(loc, []): n += 1
            simple_index[i] = n
        for i, w in enumerate(m):
            loc = f'{s}:{a}:{i + 1}'
            ph, rules = pw[link[i]] if link[i] < len(pw) else ('', [])
            row = {'u': w, 'i': SIMPLE.get(loc, []), 'p': ph, 'r': [[x, y] for x, y in rules]}
            if loc in COLOURS: row['c'] = COLOURS[loc]
            t = {}
            for rec, tm in TIMES.items():
                for x in tm.get(f'{s}:{a}', []):
                    if x[0] == i + 1: t[rec] = [x[1], x[2]]
            if t: row['t'] = t
            last = i == len(m) - 1
            if last or simple_index[i] in stops:
                row['stop'] = 2 if last else 1
                try:
                    cut = ' '.join(uw[:link[i] + 1])
                    o2 = quran_phonetizer(cut, MOSHAF, sura_idx=s)
                    pw2 = per_word(cut, o2)
                    if pw2 and pw2[-1][0] != ph: row['pw'] = pw2[-1][0]
                except Exception: pass
            rows[loc] = row
    return rows

if __name__ == '__main__':
    a, b = (int(sys.argv[1]), int(sys.argv[2])) if len(sys.argv) > 2 else (1, 114)
    for s in range(a, b + 1):
        rows = build(s)
        json.dump(rows, open(os.path.join(OUT, f'{s}.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
        print(s, len(rows), flush=True)
