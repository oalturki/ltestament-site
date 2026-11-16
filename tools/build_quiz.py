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
out = ROOT / 'data/quiz/siraj.json'
out.write_text(json.dumps(rows, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
print(out.name, len(rows), 'rows', out.stat().st_size // 1024, 'KB')
