"""مجموعة الاختبار — the tasks of /record/ (step 1 of «منهجية نظام التسميع الذكي»), from the word lexicon.

Passages chosen for children and adults alike, short to long, rich in tajweed rules. Each passage gives:
  clean    read it as it is (the reference for all the others)
  word     leave one word out, mid-verse                         → expected: missing at that word
  ayah     leave one whole verse out                             → expected: skip of that verse
  repeat   read one verse twice                                  → expected: no error
  restart  stop mid-verse, go back to its start, go on           → expected: no error
  other    say a few words that are not of the verse, then go on → expected: «أعد التلاوة» card, no word error
  madd     shorten a long madd (lazim/muttasil, colours 0/1) to two harakat      (teen and adult)
  ghunna   read a ghunna / ikhfa word without ghunna (colour 4)                   (teen and adult)
  qalqala  read a qalqala letter without qalqala (colour 6)                       (teen and adult)
Picks are fixed (passages hold the text once; tasks point to them by p) (same tasks for every reader), so readings compare. Output: data/testset/tasks.json"""
import json, os
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PASSAGES = [  # (id, surah, from, to, title)
    ('fatiha', 1, 1, 7, 'الفاتحة'), ('ikhlas', 112, 1, 4, 'الإخلاص'), ('falaq', 113, 1, 5, 'الفلق'),
    ('nas', 114, 1, 6, 'الناس'), ('asr', 103, 1, 3, 'العصر'), ('kawthar', 108, 1, 3, 'الكوثر'),
    ('qadr', 97, 1, 5, 'القدر'), ('naba', 78, 1, 16, 'النبأ ١–١٦'), ('mulk', 67, 1, 5, 'الملك ١–٥'),
    ('baqara', 2, 1, 5, 'البقرة ١–٥'), ('kursi', 2, 255, 255, 'آية الكرسي'), ('yasin', 36, 1, 12, 'يس ١–١٢'),
    ('rahman', 55, 1, 13, 'الرحمن ١–١٣'), ('kahf', 18, 1, 5, 'الكهف ١–٥'),
]
ADULT = {'madd', 'ghunna', 'qalqala'}
lex = {}
def L(s):
    if s not in lex: lex[s] = json.load(open(os.path.join(ROOT, f'data/lexicon/{s}.json'), encoding='utf-8'))
    return lex[s]

def words(s, a):
    d = L(s); out, w = [], 1
    while f'{s}:{a}:{w}' in d: out.append((f'{s}:{a}:{w}', d[f'{s}:{a}:{w}'])); w += 1
    return out

def mid(ws):   # a word in the middle of the verse, not its first or last, not a short particle
    cand = [x for x in ws[1:-1] if len(x[1]['i'][0] if x[1]['i'] else '') > 3] or ws[1:-1] or ws
    return cand[len(cand) // 2]

tasks, passages = [], {}
for pid, s, a0, a1, title in PASSAGES:
    ayat = [(a, words(s, a)) for a in range(a0, a1 + 1)]
    text = [[a, [[loc, r['u']] for loc, r in ws]] for a, ws in ayat]
    passages[pid] = {'surah': s, 'from': a0, 'to': a1, 'title': title, 'text': text}
    base = {'p': pid}
    tasks.append(dict(base, id=pid, kind='clean'))
    longest = max(ayat, key=lambda x: len(x[1]))
    loc, r = mid(longest[1])
    tasks.append(dict(base, id=pid + '-word', kind='word', target=loc))
    if len(ayat) >= 3:
        a = ayat[len(ayat) // 2][0]
        tasks.append(dict(base, id=pid + '-ayah', kind='ayah', target=f'{s}:{a}'))
    if len(ayat) >= 2:
        tasks.append(dict(base, id=pid + '-repeat', kind='repeat', target=f'{s}:{ayat[1][0]}'))
    if len(longest[1]) >= 6:
        tasks.append(dict(base, id=pid + '-restart', kind='restart', target=f'{s}:{longest[0]}'))
    tasks.append(dict(base, id=pid + '-other', kind='other', target=f'{s}:{ayat[min(1, len(ayat) - 1)][0]}'))
    allw = [(loc, r) for _, ws in ayat for loc, r in ws]
    for kind, test in (('madd', lambda r: any(c in (0, 1) for c in r.get('c', []))),
                       ('ghunna', lambda r: 4 in r.get('c', [])),
                       ('qalqala', lambda r: 6 in r.get('c', []))):
        hit = [x for x in allw if test(x[1])]
        if hit: tasks.append(dict(base, id=f'{pid}-{kind}', kind=kind, target=hit[len(hit) // 2][0]))
for t in tasks: t['adult'] = t['kind'] in ADULT
json.dump({'v': 1, 'passages': passages, 'tasks': tasks}, open(os.path.join(ROOT, 'data/testset/tasks.json'), 'w', encoding='utf-8'),
          ensure_ascii=False, separators=(',', ':'))
from collections import Counter
print(len(tasks), Counter(t['kind'] for t in tasks))
