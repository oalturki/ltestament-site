---
title: Tasmee — recitation check
emoji: 📖
colorFrom: indigo
colorTo: yellow
sdk: docker
app_port: 7860
pinned: false
license: other
short_description: Checks a memorised recitation word by word (Hafs)
---

# التسميع — recitation check for ltestament.com

`POST /check` (multipart): `audio` (any format a phone records), `surah`, `start`, `end`, `basmala` (true/false).
Answers each expected word with `status`: `ok`, `harakat` (same letters, other vowels), `wrong`, `missing`,
`unsure` (heard, but the pronunciation score is low); plus `extra` (words said that are not in the ayahs) and `heard`.

- Model: [Muno459/fastconformer-quran](https://huggingface.co/Muno459/fastconformer-quran) — Hafs only, licensed
  for non-profit use (NPL-1.1); built on NVIDIA FastConformer (CC-BY-4.0). The model repo is gated: set a read
  token as the Space secret `HF_TOKEN`.
- Text: Tanzil Quran Text (Simple), tanzil.net — verbatim.
- Source code lives in github.com/oalturki/ltestament-site (`asr-space/`) and is pushed here by a GitHub Action.
