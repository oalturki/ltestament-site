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
# the pause marks (ۖ ۗ ۚ ۛ …) stand as words of their own in this text: they are not said, so they are left out
import re as _re
_MARK = _re.compile("^[\u06D6-\u06ED]+$")
QURAN = {k: [" ".join(w for w in ay.split() if not _MARK.match(w)) for ay in v] for k, v in QURAN.items()}
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


# ---------- aligning a long recitation (a reciter's surah file) to the text ----------
# Gives the time of every ayah (and every word) in a recording, so a continuous recitation (e.g. hadr) can be cut
# into ayahs, followed with highlighting, or played from one ayah to another. Long audio is read in overlapping chunks.
import difflib
import urllib.request

CHUNK_S, OVERLAP_S = 30.0, 3.0
ALIGN_MAX_S = float(os.environ.get("ALIGN_MAX_SECONDS", "3600"))
ALIGN_HOSTS = [h.strip() for h in os.environ.get("ALIGN_HOSTS", "").split(",") if h.strip()]


def emissions(wav, sess, tok):
    """[(piece_id, seconds)] for the whole recording: each token at the frame where it is first emitted."""
    out, n, step = [], len(wav), int((CHUNK_S - OVERLAP_S) * SR)
    starts = list(range(0, max(1, n - int(OVERLAP_S * SR)), step)) or [0]
    for ci, s0 in enumerate(starts):
        seg = wav[s0:s0 + int(CHUNK_S * SR)]
        if len(seg) < SR // 4: break
        feats = log_mel(seg)[None, ...]
        lp = sess.run(None, {"audio_signal": feats, "length": np.array([feats.shape[2]], dtype=np.int64)})[0][0]
        fs = (len(seg) / SR) / lp.shape[0]
        lo = 0.0 if ci == 0 else OVERLAP_S / 2               # keep each token once: the middle of every overlap is the seam
        hi = len(seg) / SR if ci == len(starts) - 1 else CHUNK_S - OVERLAP_S / 2
        prev = -1
        for f, i in enumerate(lp.argmax(-1).tolist()):
            if i == BLANK: prev = -1; continue
            if i != prev:
                t = f * fs
                if lo <= t < hi: out.append((i, s0 / SR + t))
            prev = i
    return out


def words_of(ems, tok):
    """group pieces into words (a piece starting with ▁ starts a word): [(text, start_s, end_s)]"""
    ws = []
    for i, t in ems:
        p = tok.id_to_piece(i)
        if p.startswith("▁") or not ws: ws.append([[i], t, t])
        else: ws[-1][0].append(i); ws[-1][2] = t
    return [(tok.decode(w[0]).strip(), w[1], w[2]) for w in ws if tok.decode(w[0]).strip()]


def fetch_audio(url):
    if not url.startswith(("https://", "http://")): raise HTTPException(400, "url")
    host = url.split("/")[2].lower()
    if ALIGN_HOSTS and not any(host == h or host.endswith("." + h) for h in ALIGN_HOSTS): raise HTTPException(400, "host not allowed")
    req = urllib.request.Request(url, headers={"User-Agent": "ltestament-align/1.0"})
    with urllib.request.urlopen(req, timeout=120) as r:
        data = r.read(200_000_000)
    return data


@app.post("/align")
async def align(surah: int = Form(...), audio: UploadFile = File(None), url: str = Form(None),
                start: int = Form(1), end: int = Form(None)):
    if not 1 <= surah <= 114: raise HTTPException(400, "surah")
    ayahs = QURAN[str(surah)]
    end = end or len(ayahs)
    if not (1 <= start <= end <= len(ayahs)): raise HTTPException(400, "ayah range")
    raw = await audio.read() if audio is not None else (fetch_audio(url) if url else None)
    if not raw: raise HTTPException(400, "audio or url")
    wav = decode_audio(raw)
    dur = len(wav) / SR
    if dur > ALIGN_MAX_S: raise HTTPException(413, "audio too long")
    try:
        sess, tok = model()
    except Exception as e:
        raise HTTPException(503, f"model not available: {type(e).__name__}")
    hyp = words_of(emissions(wav, sess, tok), tok)
    exp, where = [], []
    for a in range(start, end + 1):
        for k, w in enumerate(ayahs[a - 1].split()):
            exp.append(w); where.append((a, k))
    es, hs = [skeleton(w) for w in exp], [skeleton(h[0]) for h in hyp]
    t_of = [None] * len(exp)
    sm = difflib.SequenceMatcher(None, es, hs, autojunk=False)
    for op, i1, i2, j1, j2 in sm.get_opcodes():
        if op == "equal" or (op == "replace" and i2 - i1 == j2 - j1):
            for d in range(i2 - i1): t_of[i1 + d] = (hyp[j1 + d][1], hyp[j1 + d][2])
    matched = sum(1 for t in t_of if t) / max(1, len(exp))
    # ayah start = its first timed word; a word with no time takes the time of the next timed one
    nxt = None
    for i in range(len(exp) - 1, -1, -1):
        if t_of[i]: nxt = t_of[i]
        elif nxt: t_of[i] = (nxt[0], nxt[0])
    res, words = [], []
    for a in range(start, end + 1):
        idx = [i for i, (aa, _) in enumerate(where) if aa == a and t_of[i]]
        if not idx: continue
        res.append([a, int(t_of[idx[0]][0] * 1000), None])
        for i in idx: words.append([a, where[i][1] + 1, int(t_of[i][0] * 1000), int(t_of[i][1] * 1000)])
    for i in range(len(res)):                                 # an ayah ends where the next begins
        res[i][2] = res[i + 1][1] if i + 1 < len(res) else int(dur * 1000)
    return {"surah": surah, "seconds": round(dur, 1), "matched": round(matched, 3), "ayahs": res, "words": words,
            "heard_words": len(hyp)}


# ---------- live recitation (التسميع الحي) with Whisper, while FastConformer awaits access ----------
# tarteel-ai/whisper-base-ar-quran (Apache-2.0): Whisper base fine-tuned on Quran recitation. It writes the words it
# hears (without the fine vowel marks), so it tells right / wrong / missing words, not vowel slips.
# The page sends the stretch of recitation since the last pause, with the index of the next expected word; the reply
# lines it up with the words from there on, so the page can show each word as it is recited.
import threading

WHISPER_REPO = os.environ.get("WHISPER_REPO", "tarteel-ai/whisper-base-ar-quran")
_wh = {"model": None, "proc": None, "err": None}
_wh_lock = threading.Lock()


def whisper():
    with _wh_lock:
        if _wh["model"] is None and _wh["err"] is None:
            try:
                import torch
                from transformers import WhisperForConditionalGeneration, WhisperProcessor
                torch.set_num_threads(int(os.environ.get("TORCH_THREADS", "2")))   # the Space has 2 vCPUs; os.cpu_count() reports the host's
                try:
                    proc = WhisperProcessor.from_pretrained(WHISPER_REPO)
                except Exception:                     # the fine-tuned repo may lack the processor files: same as base
                    proc = WhisperProcessor.from_pretrained("openai/whisper-base")
                m = WhisperForConditionalGeneration.from_pretrained(WHISPER_REPO)
                m.eval()
                try:                                  # older fine-tunes lack the language table: take the base model's
                    if not getattr(m.generation_config, "lang_to_id", None):
                        from transformers import GenerationConfig
                        m.generation_config = GenerationConfig.from_pretrained("openai/whisper-base")
                except Exception:
                    pass
                _wh["model"], _wh["proc"] = m, proc
            except Exception as e:
                _wh["err"] = f"{type(e).__name__}: {e}"[:300]
    if _wh["model"] is None: raise HTTPException(503, "live model not available: " + str(_wh["err"]))
    return _wh["model"], _wh["proc"]




# faster engine: the same model converted to CTranslate2 (int8) while building (Dockerfile); about 3-4x faster on CPU
CT2_DIR = os.environ.get("CT2_DIR", "/home/user/ct2-whisper")
_ct2 = {"m": None, "tried": False}


def ct2():
    with _wh_lock:
        if not _ct2["tried"]:
            _ct2["tried"] = True
            try:
                if os.path.isdir(CT2_DIR):
                    from faster_whisper import WhisperModel
                    _ct2["m"] = WhisperModel(CT2_DIR, device="cpu", compute_type="int8",
                                             cpu_threads=int(os.environ.get("TORCH_THREADS", "2")))
            except Exception as e:
                _wh["err"] = f"ct2 {type(e).__name__}: {e}"[:300]
    return _ct2["m"]


def transcribe(wav):
    m2 = ct2()
    if m2 is not None:
        segs, _ = m2.transcribe(wav.astype(np.float32), language="ar", task="transcribe", beam_size=1,
                                without_timestamps=True, condition_on_previous_text=False, vad_filter=False)
        return " ".join(sg.text.strip() for sg in segs).strip()
    return transcribe_hf(wav)


def transcribe_hf(wav):
    import torch
    m, proc = whisper()
    feats = proc.feature_extractor(wav, sampling_rate=SR, return_tensors="pt").input_features
    with torch.inference_mode():
        try:
            ids = m.generate(feats, language="ar", task="transcribe", num_beams=1, max_new_tokens=200)
        except Exception:
            ids = m.generate(feats, forced_decoder_ids=proc.get_decoder_prompt_ids(language="ar", task="transcribe"),
                             num_beams=1, max_new_tokens=200)
    return proc.batch_decode(ids, skip_special_tokens=True)[0].strip()


ISTI = ["اعوذ", "بالله", "من", "الشيطان", "الرجيم"]


@app.on_event("startup")
def _warm_start():
    threading.Thread(target=lambda: (_safe(ct2), _safe(whisper)), daemon=True).start()


def _safe(f):
    try: f()
    except Exception: pass


@app.get("/live")
def live_status():
    return {"model": WHISPER_REPO, "loaded": _wh["model"] is not None, "engine": "ctranslate2-int8" if _ct2["m"] else "transformers",
            "error": _wh["err"]}


_sess = {}


def pcm_wav(raw):
    """16 kHz mono 16-bit WAV (what the page sends): read directly, without ffmpeg."""
    try:
        if raw[:4] != b"RIFF" or raw[8:12] != b"WAVE": return None
        ch = int.from_bytes(raw[22:24], "little"); rate = int.from_bytes(raw[24:28], "little"); bits = int.from_bytes(raw[34:36], "little")
        if ch != 1 or rate != SR or bits != 16 or raw[36:40] != b"data": return None
        return np.frombuffer(raw[44:], dtype="<i2").astype(np.float32) / 32768.0
    except Exception:
        return None


@app.post("/live")
def live(audio: UploadFile = File(...), surah: int = Form(...), start: int = Form(1), end: int = Form(None),
               pos: int = Form(0), final: bool = Form(False), sid: str = Form(""), append: bool = Form(False)):
    import time
    t0 = time.time()
    if not 1 <= surah <= 114: raise HTTPException(400, "surah")
    ayahs = QURAN[str(surah)]
    end = end or start
    if not (1 <= start <= end <= len(ayahs)): raise HTTPException(400, "ayah range")
    raw = audio.file.read()                            # a plain function: FastAPI runs it beside the event loop
    if len(raw) > 4_000_000: raise HTTPException(413, "audio too long")
    wav = pcm_wav(raw)
    if wav is None: wav = decode_audio(raw)
    # a session: the page sends only the new audio, the stretch so far is kept here (much less to upload)
    if sid:
        now = time.time()
        for k in [k for k, v in _sess.items() if now - v["t"] > 120]: _sess.pop(k, None)
        if append and sid in _sess: wav = np.concatenate([_sess[sid]["pcm"], wav])
        _sess[sid] = {"pcm": wav, "t": now}
        if final: _sess.pop(sid, None)
    dur = len(wav) / SR
    if dur > 30: raise HTTPException(413, "audio too long (30 s at most per stretch)")
    exp, where = [], []
    for a in range(start, end + 1):
        for k, w in enumerate(ayahs[a - 1].split()):
            exp.append(w); where.append((a, k))
    if not 0 <= pos <= len(exp): raise HTTPException(400, "pos")
    try:
        heard = transcribe(wav) if dur >= 0.3 else ""
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"transcribe: {type(e).__name__}: {e}"[:400])
    hyp = heard.split()
    # set aside the isti'adha and the basmala said before the passage (not part of it, except Al-Fatiha 1)
    sk = [skeleton(w) for w in hyp]
    if sk[:5] == ISTI: hyp, sk = hyp[5:], sk[5:]
    bas = [skeleton(w) for w in QURAN["1"][0].split()]
    if pos == 0 and sk[:4] == bas and not (surah == 1 and start == 1): hyp = hyp[4:]
    win = exp[pos:pos + len(hyp) + 6]
    words, nxt = [], pos
    if hyp and win:
        pairs, sim = align_words(win, hyp)
        # the last expected word that was matched: what lies after it has simply not been recited yet
        last = -1
        for i, j in pairs:
            if i is not None and j is not None and sim[i][j] >= 0.5: last = max(last, i)
        # after the last word heard right, something else was said: like a teacher, stop at the first word that
        # went wrong (the rest is not judged); the next stretch starts at it again, so it can be said again
        lastj = max([j for i, j in pairs if i is not None and j is not None and i <= last and sim[i][j] >= 0.5] or [-1])
        tail = hyp[lastj + 1:]
        stop_at = None
        if final and tail and last + 1 < len(win): stop_at = last + 1
        for i, j in pairs:
            if i is None or i > last: continue
            a, k = where[pos + i]
            w = {"k": pos + i, "ayah": a, "i": k, "text": win[i]}
            if j is None: w["status"] = "missing"
            else:
                w["heard"] = hyp[j]
                w["status"] = "ok" if sim[i][j] >= 0.8 else "wrong"
            words.append(w)
        if stop_at is not None:
            a, k = where[pos + stop_at]
            words.append({"k": pos + stop_at, "ayah": a, "i": k, "text": win[stop_at], "heard": " ".join(tail[:3]), "status": "wrong"})
        nxt = pos + last + 1
    return {"pos": pos, "next": nxt, "final": final, "heard": heard, "words": words, "seconds": round(dur, 2),
            "ms": int((time.time() - t0) * 1000)}
