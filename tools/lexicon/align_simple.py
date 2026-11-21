"""Step 0 of the recitation-check method (قاموس الكلمة): every Mushaf word (Madinah Mushaf, data/mushaf) linked to
its word(s) in the Tanzil «simple» (imla'i) text the recitation check matches against. Mostly one to one; «يا أيها»
and the like are two simple words for one Mushaf word. Linked by dynamic programming over letter skeletons.
Usage: python3 tools/lexicon/align_simple.py   → tools/lexicon/out/simple_map.json + a report of doubtful links"""
import json, re, glob, os, unicodedata
from difflib import SequenceMatcher
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, 'tools/lexicon/out'); os.makedirs(OUT, exist_ok=True)
MARK = re.compile('^[ۖ-ۭ]+$')
NUM = re.compile('^[٠-٩۰-۹\\d\\s]+$')

def skel(w):
    w = unicodedata.normalize('NFC', w)
    w = re.sub('[ً-ٰٟۖ-ۭـ]', '', w)          # harakat, dagger alef, small marks, tatweel
    for a, b in (('ٱ', 'ا'), ('أ', 'ا'), ('إ', 'ا'), ('آ', 'ا'), ('ى', 'ي'), ('ة', 'ه'), ('ؤ', 'ء'), ('ئ', 'ء'), ('ٰ', '')):
        w = w.replace(a, b)
    return w

def ratio(a, b): return SequenceMatcher(None, a, b).ratio()

def mushaf_words():
    mw = {}
    for f in sorted(glob.glob(os.path.join(ROOT, 'data/mushaf/p*.json'))):
        for L in json.load(open(f, encoding='utf-8'))['l']:
            if L[0] != 'a': continue
            for y in L[2]:
                if NUM.match(y[2] or ''): continue
                s, a, w = map(int, y[1].split(':'))
                mw.setdefault((s, a), {})[w] = y[2]
    return {k: [v[i] for i in sorted(v)] for k, v in mw.items()}

def align(m, sw):
    """m: Mushaf words, sw: simple words → list of (mushaf index, [simple indices]) minimising total dissimilarity"""
    INF = 1e9; n, k = len(m), len(sw)
    D = [[INF] * (k + 1) for _ in range(n + 1)]; B = [[0] * (k + 1) for _ in range(n + 1)]; D[0][0] = 0
    for i in range(1, n + 1):
        for j in range(1, k + 1):
            for t in (1, 2, 3):
                if j - t < 0 or D[i - 1][j - t] >= INF: continue
                c = D[i - 1][j - t] + (1 - ratio(skel(m[i - 1]), skel(''.join(sw[j - t:j])))) + (t - 1) * 0.15
                if c < D[i][j]: D[i][j], B[i][j] = c, t
            # one simple word written as two in the Mushaf (بعدما → بعد ما): both Mushaf words take it
            if i >= 2 and D[i - 2][j - 1] < INF:
                c = D[i - 2][j - 1] + 2 * (1 - ratio(skel(m[i - 2] + m[i - 1]), skel(sw[j - 1]))) + 0.3
                if c < D[i][j]: D[i][j], B[i][j] = c, -1
    if D[n][k] >= INF: return None
    out, j = [], k
    i = n
    while i > 0:
        t = B[i][j]
        if t == -1: out += [(i - 1, [j - 1]), (i - 2, [j - 1])]; i -= 2; j -= 1
        else: out.append((i - 1, list(range(j - t, j)))); i -= 1; j -= t
    return out[::-1]

if __name__ == '__main__':
    q = json.load(open(os.path.join(ROOT, 'asr-space/quran-simple.json'), encoding='utf-8'))['s']
    mw = mushaf_words()
    res, doubt, multi = {}, [], 0
    for s in range(1, 115):
        for a, ay in enumerate(q[str(s)], 1):
            sw = [x for x in ay.split() if not MARK.match(x)]
            m = mw[(s, a)]
            al = align(m, sw)
            if al is None: doubt.append((s, a, 'no alignment')); continue
            for mi, sj in al:
                loc = f'{s}:{a}:{mi + 1}'
                res[loc] = [sw[j] for j in sj]
                if len(sj) > 1: multi += 1
                r = ratio(skel(m[mi]), skel(''.join(sw[j] for j in sj)))
                if sum(1 for x, y in al if y == sj) > 1: r = 1.0          # half of a word the Mushaf writes as two
                if r < 0.6: doubt.append((loc, m[mi], ' '.join(sw[j] for j in sj), round(r, 2)))
    json.dump(res, open(os.path.join(OUT, 'simple_map.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    print('mushaf words', len(res), 'one-to-many', multi, 'doubtful', len(doubt))
    for d in doubt[:60]: print(d)
