---
title: Tasmee — recitation check
emoji: 📖
colorFrom: indigo
colorTo: yellow
sdk: docker
app_port: 7860
pinned: false
license: apache-2.0
short_description: Checks a memorised recitation word by word (Hafs)
---

# التسميع — recitation check for ltestament.com

`POST /live` (multipart): a stretch of recitation (16 kHz WAV), `surah`, `start`, `end`, `pos` (the next word due),
`final`, `level` (easy / normal / strict). Answers, word by word: `ok`, `unclear`, `wrong`, `missing` (with `skip`
for a whole verse passed over), and `other` when what was said is not the passage at all.

`POST /tajweed` (multipart, the tajweed Mushaf): whole verses recited (`surah`, `ayah`, `to`), at most 30 s —
word by word, notes on madd, ghunna, ikhfa / iqlab / idgham, qalqala, letters and vowels.

Every model here may be used for any purpose, paid use included (no non-profit-only licences):
- Words heard: [tarteel-ai/whisper-base-ar-quran](https://huggingface.co/tarteel-ai/whisper-base-ar-quran) — Apache-2.0
  (on OpenAI Whisper, MIT), run with CTranslate2 (int8).
- Tajweed: [HisnLabs/tajweed-v2](https://huggingface.co/HisnLabs/tajweed-v2) — Apache-2.0; its phonetiser
  [quran-transcript](https://pypi.org/project/quran-transcript/) — MIT.
- Text: Tanzil Quran Text (Simple), tanzil.net — verbatim, with its notice.
- Source code lives in github.com/oalturki/ltestament-site (`asr-space/`) and is pushed here by a GitHub Action.
