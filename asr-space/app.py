"""Recitation check (التسميع) — a small web service for ltestament.com.

The reader recites ayahs from memory; this service tells which words were recited as written, which were
missed, which were said differently, and which sound unsure.

How it works
1. The audio (any format a phone records) is turned into 16 kHz mono with ffmpeg.
2. FastConformer-Quran (Muno459/fastconformer-quran, Hafs only) gives, for every ~80 ms of audio, the
   probability of each text piece (CTC log-probabilities).
3. Two checks against the ayahs the reader chose (Tanzil «simple» text — the model's own script):
   a. what the model heard (greedy reading) is lined up with the expected words (word alignment), and
   b. the expected text is forced through the audio (CTC Viterbi) and each word gets a «goodness of
      pronunciation» score: how likely its own pieces were, against the best other piece, where they were said.
   A word is «wrong» when the model heard something else; «unsure» when it was heard but scored low.
The model is licensed for non-profit use only (NPL-1.1); this service is free and runs no ads.
"""
import json
import os
import subprocess
import tempfile
import unicodedata

import numpy as np
import onnxruntime as ort
import sentencepiece as spm
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from huggingface_hub import hf_hub_download

MODEL_REPO = os.environ.get("MODEL_REPO", "Muno459/fastconformer-quran")
MODEL_FILE = os.environ.get("MODEL_FILE", "onnx/model.onnx")
HF_TOKEN = os.environ.get("HF_TOKEN")          # a read token, set as a Space secret (the model repo is gated)
SR, N_FFT, HOP, N_MELS = 16000, 512, 160, 80
MAX_SECONDS = float(os.environ.get("MAX_SECONDS", "90"))
GOP_UNSURE = float(os.environ.get("GOP_UNSURE", "-3.0"))   # the model card's threshold for its GOP signal
ORIGINS = os.environ.get("ALLOW_ORIGINS", "https://ltestament.com,https://www.ltestament.com").split(",")

app = FastAPI(title="Recitation check")
app.add_middleware(CORSMiddleware, allow_origins=[o.strip() for o in ORIGINS if o.strip()],
                   allow_methods=["POST", "GET"], allow_headers=["*"])

QURAN = json.load(open(os.path.join(os.path.dirname(__file__), "quran-simple.json"), encoding="utf-8"))["s"]
_session = _tok = None
BLANK = 1024


def model():
    global _session, _tok, BLANK
    if _session is None:
        onnx_path = hf_hub_download(MODEL_REPO, MODEL_FILE, token=HF_TOKEN)
        tok_path = hf_hub_download(MODEL_REPO, "tokenizer.model", token=HF_TOKEN)
        _session = ort.InferenceSession(onnx_path, providers=["CPUExecutionProvider"])
        _tok = spm.SentencePieceProcessor(model_file=tok_path)
        BLANK = _tok.get_piece_size()      # CTC blank is the last class (1024 for a 1024-piece vocabulary)
    return _session, _tok


# ---------- audio -> features (as in the model's own demo) ----------
def _mel_fb(sr, n_fft, n_mels):
    mel_max = 1127.0 * np.log(1.0 + (sr / 2) / 700.0)
    hz = 700.0 * (np.exp(np.linspace(0.0, mel_max, n_mels + 2) / 1127.0) - 1.0)
    b = np.floor((n_fft + 1) * hz / sr).astype(int)
    fb = np.zeros((n_mels, n_fft // 2 + 1), dtype=np.float32)
    for m in range(1, n_mels + 1):
        l, c, r = b[m - 1], b[m], b[m + 1]
        for k in range(l, c):
            if c != l: fb[m - 1, k] = (k - l) / (c - l)
        for k in range(c, r):
            if r != c: fb[m - 1, k] = (r - k) / (r - c)
    return fb


MEL_FB = _mel_fb(SR, N_FFT, N_MELS)


def log_mel(wav):
    wav = np.append(wav[0:1], wav[1:] - 0.97 * wav[:-1]).astype(np.float32)
    wav = np.pad(wav, N_FFT // 2, mode="reflect")
    n = 1 + (len(wav) - N_FFT) // HOP
    frames = np.lib.stride_tricks.as_strided(wav, shape=(n, N_FFT), strides=(HOP * wav.strides[0], wav.strides[0])).copy()
    frames *= np.hanning(N_FFT).astype(np.float32)
    spec = np.abs(np.fft.rfft(frames, n=N_FFT, axis=1)) ** 2
    lm = np.log(spec @ MEL_FB.T + 1e-5).astype(np.float32).T
    return (lm - lm.mean(axis=1, keepdims=True)) / (lm.std(axis=1, keepdims=True) + 1e-5)


def decode_audio(raw: bytes):
    with tempfile.NamedTemporaryFile(suffix=".bin") as f:
        f.write(raw); f.flush()
        p = subprocess.run(["ffmpeg", "-v", "error", "-i", f.name, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
                           capture_output=True, timeout=60)
    if p.returncode != 0 or not p.stdout:
        raise HTTPException(400, "audio could not be read")
    return np.frombuffer(p.stdout, dtype=np.float32)


# ---------- text ----------
DIAC = set("ًٌٍَُِّْٰٕٓٔۡ۟ۥۦـ")


def skeleton(w):
    """letters only: no harakat, one form of alef / ya / ta marbuta / hamza seats"""
    w = unicodedata.normalize("NFC", w)
    w = "".join(ch for ch in w if ch not in DIAC)
    for a, b in (("أ", "ا"), ("إ", "ا"), ("آ", "ا"), ("ٱ", "ا"), ("ى", "ي"), ("ة", "ه"), ("ؤ", "ء"), ("ئ", "ء")):
        w = w.replace(a, b)
    return w


def edit_ratio(a, b):
    if a == b: return 1.0
    la, lb = len(a), len(b)
    if not la or not lb: return 0.0
    prev = list(range(lb + 1))
    for i in range(1, la + 1):
        cur = [i] + [0] * lb
        for j in range(1, lb + 1):
            cur[j] = min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] != b[j - 1]))
        prev = cur
    return 1.0 - prev[lb] / max(la, lb)


def align_words(exp, hyp):
    """Needleman–Wunsch on words. Returns pairs (i, j) with None for a gap."""
    n, m = len(exp), len(hyp)
    es, hs = [skeleton(w) for w in exp], [skeleton(w) for w in hyp]
    sim = [[edit_ratio(es[i], hs[j]) for j in range(m)] for i in range(n)]
    G = -0.6
    S = np.zeros((n + 1, m + 1)); B = np.zeros((n + 1, m + 1), dtype=np.int8)
    S[:, 0] = np.arange(n + 1) * G; S[0, :] = np.arange(m + 1) * G; B[1:, 0] = 1; B[0, 1:] = 2
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            s = sim[i - 1][j - 1]
            opts = (S[i - 1, j - 1] + (s * 2 - 1), S[i - 1, j] + G, S[i, j - 1] + G)
            k = int(np.argmax(opts)); S[i, j] = opts[k]; B[i, j] = k
    i, j, out = n, m, []
    while i > 0 or j > 0:
        k = B[i, j]
        if i > 0 and j > 0 and k == 0: out.append((i - 1, j - 1)); i -= 1; j -= 1
        elif i > 0 and (j == 0 or k == 1): out.append((i - 1, None)); i -= 1
        else: out.append((None, j - 1)); j -= 1
    return out[::-1], sim


def ctc_force(logp, ids):
    """Viterbi path of the token sequence ids through CTC log-probs (T, V). Returns, per token, its frames."""
    T = logp.shape[0]
    ext = [BLANK]
    for t in ids: ext += [t, BLANK]
    S = len(ext)
    NEG = -1e30
    dp = np.full((T, S), NEG, dtype=np.float64); bp = np.zeros((T, S), dtype=np.int32)
    dp[0, 0] = logp[0, ext[0]]
    if S > 1: dp[0, 1] = logp[0, ext[1]]
    for t in range(1, T):
        for s in range(S):
            best, arg = dp[t - 1, s], s
            if s >= 1 and dp[t - 1, s - 1] > best: best, arg = dp[t - 1, s - 1], s - 1
            if s >= 2 and ext[s] != BLANK and ext[s] != ext[s - 2] and dp[t - 1, s - 2] > best: best, arg = dp[t - 1, s - 2], s - 2
            dp[t, s] = best + logp[t, ext[s]]; bp[t, s] = arg
    s = S - 1 if S == 1 or dp[T - 1, S - 1] >= dp[T - 1, S - 2] else S - 2
    frames = [[] for _ in ids]
    for t in range(T - 1, -1, -1):
        if ext[s] != BLANK: frames[(s - 1) // 2].append(t)
        s = bp[t, s]
    return frames


@app.get("/")
def health():
    return {"ok": True, "model": MODEL_REPO, "loaded": _session is not None}


@app.post("/check")
async def check(audio: UploadFile = File(...), surah: int = Form(...), start: int = Form(1), end: int = Form(None),
                basmala: bool = Form(True)):
    if not 1 <= surah <= 114: raise HTTPException(400, "surah")
    ayahs = QURAN[str(surah)]
    end = end or start
    if not (1 <= start <= end <= len(ayahs)): raise HTTPException(400, "ayah range")
    raw = await audio.read()
    if len(raw) > 12_000_000: raise HTTPException(413, "audio too long")
    wav = decode_audio(raw)
    dur = len(wav) / SR
    if dur > MAX_SECONDS: raise HTTPException(413, "audio too long")
    if dur < 0.5: raise HTTPException(400, "audio too short")
    try:
        sess, tok = model()
    except Exception as e:                  # e.g. the gated model not yet granted to this account
        raise HTTPException(503, f"model not available: {type(e).__name__}")
    feats = log_mel(wav)[None, ...]
    out = sess.run(None, {"audio_signal": feats, "length": np.array([feats.shape[2]], dtype=np.int64)})
    logp = out[0][0].astype(np.float32)            # (T, V)
    # what was heard (greedy)
    ids, prev = [], -1
    for i in logp.argmax(-1).tolist():
        if i == BLANK: prev = -1; continue
        if i != prev: ids.append(i)
        prev = i
    heard = tok.decode(ids)
    hyp = heard.split()
    # the expected words, ayah by ayah; a basmala said before the first ayah is set aside
    exp, where = [], []
    for a in range(start, end + 1):
        for k, w in enumerate(ayahs[a - 1].split()):
            exp.append(w); where.append((a, k))
    bas = QURAN["1"][0].split()
    if basmala and len(hyp) >= 3 and [skeleton(w) for w in hyp[:4]] == [skeleton(w) for w in bas] and \
            not (surah == 1 and start == 1):
        hyp = hyp[4:]
    pairs, sim = align_words(exp, hyp)
    # goodness of pronunciation per expected word (forced alignment of the expected text)
    gop = [None] * len(exp)
    try:
        wtok = [tok.encode(w) for w in exp]
        flat = [t for ws in wtok for t in ws]
        if flat and len(flat) * 2 + 1 <= logp.shape[0] * 2:
            fr = ctc_force(logp, flat)
            other = logp.copy(); other[:, BLANK] = -1e9
            p = 0
            for wi, ws in enumerate(wtok):
                sc = []
                for t in ws:
                    fs = fr[p]; p += 1
                    if fs:
                        own = logp[fs, t].mean()
                        o2 = other[fs].copy(); o2[:, t] = -1e9
                        sc.append(float(own - o2.max(axis=1).mean()))
                gop[wi] = round(min(sc), 2) if sc else None
    except Exception:
        pass
    words, extra = [], []
    for i, j in pairs:
        if i is None:
            extra.append(hyp[j]); continue
        a, k = where[i]
        w = {"ayah": a, "i": k, "text": exp[i], "gop": gop[i]}
        if j is None:
            w["status"] = "missing"
        else:
            w["heard"] = hyp[j]
            if unicodedata.normalize("NFD", hyp[j]) == unicodedata.normalize("NFD", exp[i]): w["status"] = "ok"
            elif skeleton(hyp[j]) == skeleton(exp[i]): w["status"] = "harakat"   # same letters, different vowels
            else: w["status"] = "wrong"
        if w["status"] == "ok" and gop[i] is not None and gop[i] < GOP_UNSURE: w["status"] = "unsure"
        words.append(w)
    return {"surah": surah, "start": start, "end": end, "seconds": round(dur, 1), "heard": heard,
            "words": words, "extra": extra}
