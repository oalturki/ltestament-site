#!/usr/bin/env python3
"""Word-meaning quiz data — «اختبر معاني الكلمات» (/quiz/).

Source: «السراج في بيان غريب القرآن» (QuranEnc key arabic_seraj), every surah read from the QuranEnc API
(https://quranenc.com/api/v1/translation/sura/arabic_seraj/<n>) and saved as tools/data/siraj.json:
  [[surah, ayah, head-word, meaning], ...]   — one row per "head-word: meaning" line of the book (6109 rows).
Writes data/quiz/siraj.json, the same rows, for js/quiz.js: questions come from the chosen scope, the wrong
answers from the whole book (other words' meanings, chosen by likeness — see js/quiz.js).
Run:  python3 tools/build_quiz.py
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
rows = json.load(open(ROOT / 'tools/data/siraj.json', encoding='utf-8'))
rows = [[int(s), int(a), h.strip(), m.strip()] for s, a, h, m in rows if h.strip() and m.strip()]

# Not for a quiz: words about intimacy, private parts, menstruation and fornication. Their meanings are right in
# the book (the word sheet still shows them), but out of place as a game's question — and worse as a wrong answer
# offered for an unrelated word (asked about ﴿تَرْهَقُهَا﴾, a reader was offered «جامعها»).
import re
BARE = lambda t: re.sub(r'[\u064B-\u065F\u0670\u06D6-\u06ED\u0640]', '', t)
SENSITIVE = re.compile(r'جامع(ها|هن|وهن|تم|وا)\b|يجامع|الجماع|بالجماع|الوطء|يطأ|الفرج|فروج|فرجها|حيض|المحيض|\bمني\b|'
                       r'عورة|عورات|الرفث|\bرفث\b|الزن[اى]|بالزن[اى]|الفاحشة|الفواحش|ثدي|شهوة|البغاء|استمتع|الاستمتاع|'
                       r'سوء?ات|سوآت|يطاهن|يطمث|\bزان\b|\bزانين\b|\bزانيه\b|\bزانية\b|مسافحين|مسافحات|أخدان|عشيقات|\b(ال|بال|لل|و)?زن[اى]\b|يواري|باشروهن|لامستم|أفضى|الحرث|أحصنت|نطفة|همت به|تغشاها|هيت لك|راودته|الإفك')
before = len(rows)
rows = [r for r in rows if not SENSITIVE.search(BARE(r[2])) and not SENSITIVE.search(BARE(r[3]))]
print('left out (sensitive):', before - len(rows))
out = ROOT / 'data/quiz/siraj.json'
out.write_text(json.dumps(rows, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
print(out.name, len(rows), 'rows')
# the wrong answers for each word, chosen and reviewed (tools/quiz_choices.js, tools/data/quiz_review.json)
import subprocess
subprocess.run(['node', str(ROOT / 'tools/quiz_choices.js')], check=True)
print(out.name, out.stat().st_size // 1024, 'KB')
