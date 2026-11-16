"""Self-hosted copies of the word-sheet and quiz texts, so they work when QuranEnc.com is down.

Writes data/tafsir/<key>/<surah>.json = [text of ayah 1, text of ayah 2, ...] ("" where none) for:
  arabic_seraj      «السراج في بيان غريب القرآن» — from tools/data/siraj.json (fetched from the QuranEnc API)
  arabic_moyassar   «التفسير الميسر» (King Fahd Complex)
  *_mokhtasar       «المختصر في تفسير القرآن الكريم» (Tafsir Center) en/fr/es/ru
  arabic_text       the ayah in the Complex's script (QuranEnc's arabic_text), for the quiz
Moyassar/Mukhtasar: the QUL copies on GitHub (spa5k/tafsir_api), with every ayah whose text differs
from QuranEnc's API replaced by QuranEnc's text (tools/data/tafsir/quranenc_fixes.json, compared
ayah by ayah on 2026-11-16), so the result is QuranEnc's text exactly; arabic_text is all from QuranEnc.
Usage: python3 tools/build_tafsir.py   (downloads the GitHub copies into /tmp/taf if missing)"""
import json, os, re, subprocess
REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(REPO, 'data', 'tafsir')
GH = {'arabic_moyassar': 'ar-tafsir-muyassar', 'english_mokhtasar': 'en-tafsir-al-mukhtasar',
      'french_mokhtasar': 'french-mokhtasar', 'spanish_mokhtasar': 'spanish-mokhtasar',
      'russian_mokhtasar': 'russian-mokhtasar'}
fix = json.load(open(os.path.join(REPO, 'tools/data/tafsir/quranenc_fixes.json'), encoding='utf-8'))
counts = {}
for k, v in fix['arabic_text'].items():
    s, a = map(int, k.split(':')); counts[s] = max(counts.get(s, 0), a)
assert sum(counts.values()) == 6236

def write(key, texts):
    os.makedirs(os.path.join(OUT, key), exist_ok=True)
    for s in range(1, 115):
        row = [texts.get(f'{s}:{a}', '') for a in range(1, counts[s] + 1)]
        with open(os.path.join(OUT, key, f'{s}.json'), 'w', encoding='utf-8') as f:
            json.dump(row, f, ensure_ascii=False, separators=(',', ':'))

def gh(slug, s):
    p = f'/tmp/taf/{slug}/{s}.json'
    if not os.path.exists(p):
        os.makedirs(os.path.dirname(p), exist_ok=True)
        subprocess.run(['curl', '-sSfo', p, f'https://raw.githubusercontent.com/spa5k/tafsir_api/main/tafsir/{slug}/{s}.json'], check=True)
    return json.load(open(p, encoding='utf-8'))

for key, slug in GH.items():
    t = {}
    for s in range(1, 115):
        for e in gh(slug, s): t[f"{e['surah']}:{e['ayah']}"] = e['text'].strip()
    t.update(fix[key])
    write(key, t)
write('arabic_text', fix['arabic_text'])

seraj = {}
for s, a, head, mean in json.load(open(os.path.join(REPO, 'tools/data/siraj.json'), encoding='utf-8')):
    seraj.setdefault(f'{s}:{a}', []).append(f'{head}: {mean}')
write('arabic_seraj', {k: '\n'.join(v) for k, v in seraj.items()})
print('written', OUT)
