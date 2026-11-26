#!/usr/bin/env python3
"""Build data/topics/modoee.json — the «المواضيع» tab of the search (Arabic site only).

Source: موسوعة التفسير الموضوعي – مركز تفسير للدراسات القرآنية, as served by web.surahapp.com
(permission from the Center's director, Nov 2026: names quoted verbatim, no summary,
rewording or translation, and a clear attribution).

tools/modoee/raw.json.gz is the extraction (made in a browser on web.surahapp.com, 26 Nov 2026):
  [[section, sectionId, topicId, topic, [[element, [refs], [[subElement, [refs]], …]], …]], …]
refs are the bracketed references as written, e.g. «البقرة: ٢٧٥ - ٢٧٦».

This script only turns each reference into numbers; it does not change any name.
A reference whose ayah number does not exist in its surah is left out and listed
(they were sent to the Center for review — see tools/modoee/README.md).

Run from the repo root:  python3 tools/build_topics.py
"""
import gzip, json, re, difflib, collections

ROOT = '.'
NAMES = json.loads(re.search(r"NAMES = (\[.*?\]);", open(ROOT + '/js/quiz.js', encoding='utf-8').read()).group(1).replace("'", '"'))
COUNT = [s[0] for s in json.load(open(ROOT + '/data/quran-index.json'))['surahs']]

def key(s):
    s = re.sub(r'[ً-ْٰـ‌-‏\s]', '', s).replace('سورة', '')
    return re.sub('[أإآا]', 'ا', s).replace('ة', 'ه').replace('ى', 'ي')

KEYS = {key(n): i + 1 for i, n in enumerate(NAMES)}
# spellings in the source that are not the surah's usual name
EXTRA = {key(n): s for n, s in [('المنافقين', 63), ('عمران', 3), ('الجائية', 45), ('الفرفان', 25),
                                ('اليقرة', 2), ('القرة', 2), ('الأعرف', 7)]}
DIG = str.maketrans('٠١٢٣٤٥٦٧٨٩', '0123456789')
fuzzy, bad = {}, collections.Counter()

def surah(name):
    k = key(name)
    if k in KEYS: return KEYS[k]
    if k in EXTRA: return EXTRA[k]
    if 'ال' + k in KEYS: return KEYS['ال' + k]
    m = difflib.get_close_matches(k, KEYS, 1, 0.8)   # «لأعراف», «لقصص»…
    if m: fuzzy[name] = NAMES[KEYS[m[0]] - 1]; return KEYS[m[0]]
    return None

def parse(refs):
    out = []
    parts = []
    for x in refs:   # «الحجر:٨٨، النحل:١٢٧» — two surahs in one bracket
        parts += re.split(r'[،,]\s*و?(?=\s*[^\d\s٠-٩])', x) if x.count(':') > 1 else [x]
    for x in parts:
        x = x.translate(DIG)
        name, _, ay = x.partition(':')
        # the source drops the word «النور» from its references ([: ٣٥]); every such case is An-Nur
        s = surah(name) if name.strip() else 24
        nums = [int(v) for v in re.findall(r'\d+', ay)]
        if not s or not nums or max(nums) > COUNT[s - 1] or min(nums) < 1:
            bad[x.strip()] += 1; continue
        if re.search(r'\d\s*[-–]\s*\d', ay) and len(nums) == 2 and nums[1] >= nums[0]:
            r = [s, nums[0], nums[1]]
            if r not in out: out.append(r)
        else:
            for v in nums:
                r = [s, v, v]
                if r not in out: out.append(r)
    # flat: s, a, b, s, a, b …
    return [n for r in out for n in r]

raw = json.load(gzip.open(ROOT + '/tools/modoee/raw.json.gz', 'rt', encoding='utf-8'))
sections, topics = [], []
for sec, sid, tid, name, els in raw:
    if not sections or sections[-1][0] != sec:
        sections.append([sec, sid, []])
    sections[-1][2].append(len(topics))
    E = []
    for title, refs, subs in els:
        E.append([title.strip(), parse(refs), [[st.strip(), parse(sr)] for st, sr in subs]])
    topics.append([name.strip(), tid, E])

out = {
    'src': 'موسوعة التفسير الموضوعي – مركز تفسير للدراسات القرآنية',
    'u': ['https://modoee.com', 'https://web.surahapp.com/ar/objective-interpretation'],
    's': sections,          # [name, id, [topic index …]]
    't': topics,            # [name, id, [[element, refs, [[sub, refs] …]] …]]
}
json.dump(out, open(ROOT + '/data/topics/modoee.json', 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
n = sum(len(r) // 3 for t in topics for e in t[2] for r in [e[1]] + [s[1] for s in e[2]])
print('sections', len(sections), 'topics', len(topics), 'refs', n)
print('left out', sum(bad.values()), dict(bad))
print('fuzzy names', fuzzy)
