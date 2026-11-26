"""Recitation check (التسميع) — a small web service for ltestament.com.

The reader recites from memory; the page sends each stretch of recitation (POST /live) and is told, word by word,
what was right, said differently, left out, passed over, or not the passage at all. On the tajweed Mushaf, whole
verses recited are also heard for their tajweed (POST /tajweed): notes to learn from, not mistakes.

Only models whose licences allow any use, paid use included, are used here (the project may one day take fees or
gifts to keep going): tarteel-ai/whisper-base-ar-quran (Apache-2.0) to hear the words; HisnLabs/tajweed-v2
(Apache-2.0, with quran-transcript, MIT) for tajweed. No model licensed for non-profit use only.
"""
import json
import os
import subprocess
import tempfile
import unicodedata

import numpy as np
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

SR, N_FFT, HOP, N_MELS = 16000, 512, 160, 80
MAX_SECONDS = float(os.environ.get("MAX_SECONDS", "90"))
ORIGINS = os.environ.get("ALLOW_ORIGINS", "https://ltestament.com,https://www.ltestament.com").split(",")

app = FastAPI(title="Recitation check")
app.add_middleware(CORSMiddleware, allow_origins=[o.strip() for o in ORIGINS if o.strip()],
                   allow_methods=["POST", "GET"], allow_headers=["*"])

QURAN = json.load(open(os.path.join(os.path.dirname(__file__), "quran-simple.json"), encoding="utf-8"))["s"]
# the pause marks (ۖ ۗ ۚ ۛ …) stand as words of their own in this text: they are not said, so they are left out
import re as _re
_MARK = _re.compile("^[\u06D6-\u06ED]+$")
QURAN = {k: [" ".join(w for w in ay.split() if not _MARK.match(w)) for ay in v] for k, v in QURAN.items()}
# every pair of words that follows each other somewhere in the Quran (letters only): words said in place of the passage
# that are found here are Quran from another place (a real slip between similar verses), not someone else talking
_BIGRAMS = None


_VOCAB = None


def quranic_word(w):
    """a word found as such somewhere in the Quran (letters only)"""
    global _VOCAB
    if _VOCAB is None: _VOCAB = {skeleton(x) for v in QURAN.values() for ay in v for x in ay.split()}
    return skeleton(w) in _VOCAB


def quranic(words):
    global _BIGRAMS
    if _BIGRAMS is None:
        b = set()
        for v in QURAN.values():
            for ay in v:
                sk_ = [skeleton(w) for w in ay.split()]
                b.update(zip(sk_, sk_[1:]))
        _BIGRAMS = b
    sk_ = [skeleton(w) for w in words]
    pairs_ = list(zip(sk_, sk_[1:]))
    return bool(pairs_) and sum(p in _BIGRAMS for p in pairs_) * 2 >= len(pairs_)




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
    """Needleman–Wunsch on words, the expected words' tail free. Returns pairs (i, j) with None for a gap."""
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
    # the expected words after the last one said are not missing, only not reached yet: they cost nothing (semi-global).
    # Without this, a phrase said twice in the window (the basmala's «الرحمن الرحيم» and Al-Fatiha 3) could be matched
    # to the later one at the same cost, the words between taken as left out; now the nearest one wins
    i = int(np.argmax(S[:, m])) if m else n
    out = [(k_, None) for k_ in range(n - 1, i - 1, -1)]
    j = m
    while i > 0 or j > 0:
        k = B[i, j]
        if i > 0 and j > 0 and k == 0: out.append((i - 1, j - 1)); i -= 1; j -= 1
        elif i > 0 and (j == 0 or k == 1): out.append((i - 1, None)); i -= 1
        else: out.append((None, j - 1)); j -= 1
    return out[::-1], sim


@app.get("/")
def health():
    return {"ok": True, "live": WHISPER_REPO, "tajweed": TJ_REPO}


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


def transcribe(wav, prompt=None, beam=1):
    m2 = ct2()
    if m2 is not None:
        segs, _ = m2.transcribe(wav.astype(np.float32), language="ar", task="transcribe", beam_size=beam,
                                without_timestamps=True, condition_on_previous_text=False, vad_filter=False,
                                initial_prompt=prompt)
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


def seek_start(exp, hyp):
    """Where in the passage the reader began: the offset whose words best match the first words heard, in order.
    None when it is not clear yet (fewer than 2 words heard, or no clear best place)."""
    hs = [skeleton(w) for w in hyp[:6]]
    if len(hs) < 2: return None
    es = [skeleton(w) for w in exp]
    best, best_o, second = 0.0, None, 0.0
    for o in range(len(es)):
        sc = 0.0
        for i, h in enumerate(hs):
            if o + i >= len(es): break
            r = edit_ratio(es[o + i], h)
            if r < 0.6: break                       # in order: the run of matches stops at the first miss
            sc += r
        if sc > best: best, best_o, second = sc, o, best
        elif sc > second: second = sc
    need = min(len(hs), 3) * 0.75
    if best_o is None or best < need or best - second < 0.5: return None
    return best_o


@app.post("/live")
def live(audio: UploadFile = File(...), surah: int = Form(...), start: int = Form(1), end: int = Form(None),
               pos: int = Form(0), final: bool = Form(False), sid: str = Form(""), append: bool = Form(False),
               seek: bool = Form(False), level: str = Form("normal")):
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
        # the stretch so far is not here (the service restarted, or the page's earlier piece never arrived): say so,
        # and the page sends the whole stretch again — never judge its end alone (the words before it would count as
        # left out)
        if append and sid not in _sess: raise HTTPException(409, "resend the whole stretch")
        if append: wav = np.concatenate([_sess[sid]["pcm"], wav])
        keep = {k_: v_ for k_, v_ in (_sess.get(sid) or {}).items() if k_.startswith("lead_")} if append else {}
        _sess[sid] = dict(keep, pcm=wav, t=now)     # what was found of the words before the start: asked once a stretch
        if final: _sess.pop(sid, None)
    dur = len(wav) / SR
    if dur > 30: raise HTTPException(413, "audio too long (30 s at most per stretch)")
    exp, where = [], []
    for a in range(start, end + 1):
        for k, w in enumerate(ayahs[a - 1].split()):
            exp.append(w); where.append((a, k))
    if not 0 <= pos <= len(exp): raise HTTPException(400, "pos")
    per_ayah = {}
    for a_, _ in where: per_ayah[a_] = per_ayah.get(a_, 0) + 1

    def whole_ayahs(ks):
        # of these words (by place in the passage), the verses held whole, from their first word to their last, however
        # short (كلا سيعلمون، مدهامتان): what is passed over is told by the verses' ends, not by a count of words
        got = {}
        for k_ in ks: got[where[k_][0]] = got.get(where[k_][0], 0) + 1
        return {a_ for a_, n_ in got.items() if n_ == per_ayah[a_]}
    try:
        heard = transcribe(wav) if dur >= 0.3 else ""
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"transcribe: {type(e).__name__}: {e}"[:400])
    # set aside the isti'adha and the basmala said before the passage (not part of it, except Al-Fatiha 1)
    bas = [skeleton(w) for w in QURAN["1"][0].split()]
    def words_of(text, pos):
        hyp = text.split()
        sk = [skeleton(w) for w in hyp]
        if sk[:5] == ISTI: hyp, sk = hyp[5:], sk[5:]
        if pos == 0 and sk[:4] == bas and not (surah == 1 and start == 1): hyp = hyp[4:]
        return hyp
    hyp = words_of(heard, pos)
    # "recite from anywhere": nothing recited yet in this passage, and the reader did not begin at its first word —
    # find where he began, and go on from there
    sought, led, report_pos, lead_try = None, [], None, {}

    def said_before(o):
        # the passage's first o words, looked for by their sounds at the start of the stretch: {k: score} when all are
        # there (each a little below «said» at worst, none «not said»), else None. Kept for the session: asked once
        if o > 16 or os.environ.get("CTC_CHECK", "1") != "1" or ctc_model() is None: return None
        s_ = _sess.get(sid) if sid else None
        if s_ is not None and s_.get("lead_o") == o: return s_["lead_fit"]
        try:
            # laid along the stretch's first seconds (they come before the words heard), all of them in order; a word not
            # said finds no good place for its sounds (ctc_prefix stopped after «بسم» on a basmala clearly there)
            wl = ctc_phonemes(surah, where, list(range(o)), waqf_last=False)
            f_ = ctc_words(ctc_lp(wav[: SR * 10]), wl) if wl else {}
            n_ = len(f_)
        except Exception:
            return None
        ok_ = n_ >= o and all(f_.get(k, -20) > CTC_LEAD_MIN for k in range(o)) \
            and float(np.mean([f_[k] for k in range(o)])) >= CTC_OK
        res_ = {k: f_[k] for k in range(o)} if ok_ else None
        lead_try.update({"o": o, "n": n_, "fit": f_})       # what was found, told back (the measure keeps it)
        if s_ is not None: s_["lead_o"], s_["lead_fit"] = o, res_
        return res_
    if seek and pos == 0 and hyp:
        first_ok = len(exp) and edit_ratio(skeleton(exp[0]), skeleton(hyp[0])) >= 0.6
        if not first_ok:
            o = seek_start(exp, hyp)
            if o:
                # the words before where the transcription placed him may have been said and not heard (a basmala said
                # low, Al-Fatiha 1): their sounds are looked for in the audio. All there: he began at the first word
                # (they are judged by their sounds, the rest as usual); not there: he began further on
                lead_fit = said_before(o)
                if lead_fit:
                    led = [{"k": k, "ayah": where[k][0], "i": where[k][1], "text": exp[k], "fit": lead_fit[k],
                            "status": "ok" if lead_fit[k] >= CTC_OK else "unclear", "led": True} for k in range(o)]
                    pos, report_pos = o, 0
                else:
                    pos, sought = o, o
            elif len(hyp) < 8:
                # the transcription could not place it (a voice not clear, «ما يسقصي الله يفرح»): the sounds of the
                # passage's first words are looked for in the audio itself. Found: those words are judged by them.
                # Not found, in a whole stretch of speech: «not clear» — the page asks to say it again, more clearly
                lead_n, lead = 0, {}
                if final and os.environ.get("CTC_CHECK", "1") == "1" and ctc_model() is not None:
                    try:
                        wl = ctc_phonemes(surah, where, list(range(0, min(len(exp), 16))), waqf_last=False)
                        if wl: lead_n, lead = ctc_prefix(ctc_lp(wav), wl)
                    except Exception:
                        lead_n, lead = 0, {}
                if lead_n >= 2:
                    ws_ = [{"k": k, "ayah": where[k][0], "i": where[k][1], "text": exp[k], "fit": lead.get(k),
                            "status": "ok" if lead.get(k, -20) >= CTC_OK else "unclear", "led": True} for k in range(lead_n)]
                    return {"pos": 0, "next": lead_n, "final": final, "heard": heard, "words": ws_, "seconds": round(dur, 2),
                            "ms": int((time.time() - t0) * 1000), "sought": None, "back": None, "skipped": 0, "relistened": 0,
                            "verified": 0, "fit": lead, "led": lead_n, "level": speech_level(wav), "other": None}
                return {"pos": 0, "next": 0, "final": final, "heard": heard, "words": [], "seconds": round(dur, 2),
                        "ms": int((time.time() - t0) * 1000), "seeking": True, "level": speech_level(wav),
                        "unclear": bool(final and dur >= 1.5), "lead": lead_n}
    # the reader went back and said again something he had already recited (to fix it, or to take a run at what comes
    # next): the stretch is checked against the earlier text it matches, not against the words still to come
    back = None
    if not sought and pos > 0 and len(hyp) >= 3 and edit_ratio(skeleton(exp[pos]) if pos < len(exp) else "", skeleton(hyp[0])) < 0.6:
        o = seek_start(exp[:pos + len(hyp)], hyp)
        if o is not None and o < pos: back, pos = pos, o
    # the reader went on further than the next word (a verse or more left out): from where he went on, and the words
    # he passed over are marked — not when the first words heard are the ones due (only the very first misheard)
    skipped = []
    if final and not sought and back is None and pos > 0 and len(hyp) >= 3 and pos < len(exp):
        due_ok = sum(edit_ratio(skeleton(exp[pos + i]), skeleton(hyp[i])) >= 0.6 for i in range(3) if pos + i < len(exp))
        if due_ok <= 1:
            o = seek_start(exp[pos:pos + 160], hyp)
            if o is not None and o >= 1:
                skipped = list(range(pos, pos + o)); pos += o
    # how strict the check is: a word heard close to the text is right; a little further, «not heard clearly»
    # (shown, not counted as a mistake: the model may have misheard); further still, wrong
    ok_thr, lo_thr = {"strict": (0.8, 0.8), "easy": (0.55, 0.3)}.get(level, (0.67, 0.4))

    def judge(hyp):
        win = exp[pos:pos + len(hyp) + 6]

        # the verse misheard, not other words: a third or more of the words said are close to the words due there
        def near(said, at):
            due = [skeleton(w) for w in win[max(0, at - 2):at + len(said) + 4]]
            close = sum(1 for w in said if any(edit_ratio(skeleton(w), d) >= 0.6 for d in due))
            return close * 3 >= len(said)

        words, nxt = [], pos
        if not (hyp and win): return words, nxt, None
        pairs, sim = align_words(win, hyp)
        # the last expected word that was matched: what lies after it has simply not been recited yet
        last = -1
        for i, j in pairs:
            if i is not None and j is not None and sim[i][j] >= 0.5: last = max(last, i)
        # after the last word heard right, something else was said: like a teacher, stop at the first word that
        # went wrong (the rest is not judged); the next stretch starts at it again, so it can be said again
        lastj = max([j for i, j in pairs if i is not None and j is not None and i <= last and sim[i][j] >= 0.5] or [-1])
        tail = hyp[lastj + 1:]
        # the words said in place of the missing ones: in a stretch with nothing matched, the words heard there
        # «other»: three words or more said in a stretch (two are as often the verse badly heard) where nothing matched — not the passage (someone else talking,
        # or the reader saying something else): the page asks him to say it again from the stretch's first word
        gap_heard, run, said, other, g0 = {}, [], [], None, None
        for i, j in pairs + [(-1, -1)]:
            if i == -1 or (i is not None and j is not None and sim[i][j] >= 0.5):      # a word heard right: the gap ends
                for i2 in run: gap_heard[i2] = " ".join(said[:4])
                if other is None and g0 is not None and len(said) >= 3 and i != -1 and not quranic(said) and not near(said, g0):
                    other = {"k": pos + g0, "text": " ".join(said[:6])}
                run, said, g0 = [], [], None
            else:
                if i is not None and g0 is None: g0 = i
                if j is None: run.append(i)
                else: said.append(hyp[j])
        stop_at = None
        if final and tail and last + 1 < len(win): stop_at = last + 1
        if other is None and stop_at is not None and len(tail) >= 3 and not quranic(tail[:6]) and not near(tail[:6], stop_at): other = {"k": pos + stop_at, "text": " ".join(tail[:6])}
        for i, j in pairs:
            if i is None or i > last: continue
            a, k = where[pos + i]
            w = {"k": pos + i, "ayah": a, "i": k, "text": win[i]}
            if j is None:
                # a short word the model often drops (و، في، من…) is not called missing unless the check is strict
                w["status"] = "missing" if level == "strict" or len(skeleton(win[i])) > 2 else "unclear"
                if gap_heard.get(i): w["heard"] = gap_heard[i]
            else:
                w["heard"] = hyp[j]
                s_ = sim[i][j]
                w["status"] = "ok" if s_ >= ok_thr else ("unclear" if s_ >= lo_thr else "wrong")
            words.append(w)
        # words left out together, nothing said in their place: a whole verse among them is passed over (one place,
        # not a word each); words left out of a verse said in part are word mistakes
        run_ = []
        for n_, w in enumerate(words + [None]):
            if w is not None and w["status"] in ("missing", "unclear") and "heard" not in w:     # not heard at all
                run_.append(n_); continue
            whole = whole_ayahs([words[m_]["k"] for m_ in run_]) if run_ else set()
            for m_ in run_:
                if where[words[m_]["k"]][0] in whole: words[m_]["status"] = "missing"; words[m_]["skip"] = True
            run_ = []
        if stop_at is not None:
            a, k = where[pos + stop_at]
            words.append({"k": pos + stop_at, "ayah": a, "i": k, "text": win[stop_at], "heard": " ".join(tail[:3]), "status": "wrong"})
        return words, pos + last + 1, other

    words, nxt, other = judge(hyp)
    if skipped and not words: pos, nxt, skipped = skipped[0], skipped[0], []
    if skipped:
        whole = whole_ayahs(skipped)
        words = [dict({"k": k, "ayah": where[k][0], "i": where[k][1], "text": exp[k], "status": "missing"}, **({"skip": True} if where[k][0] in whole else {}))
                 for k in skipped] + words
    # a second hearing: three or more mistakes in a row are more often a stretch the model misheard than a reader who
    # got a whole phrase wrong. So that stretch is heard again, more carefully (a wider search, and — unless the check
    # is strict — told which words to expect); a word heard right the second time is right. A phrase really
    # forgotten or changed stays wrong: the audio does not hold it, whichever way it is heard.
    relistened = 0
    if final and words:
        bad = {w["k"] for w in words if w["status"] in ("wrong", "missing")}
        run = best = 0
        for k in range(min(bad or {0}), max(bad or {0}) + 1):
            run = run + 1 if k in bad else 0; best = max(best, run)
        # and a single word heard as something else entirely (اهدنا heard «إذ جنص»): heard again the same way. A word
        # really said wrong is still heard wrong (the measure on the test set checks that this does not hide mistakes)
        if best >= 3 or any(w["status"] == "wrong" for w in words):
            try:
                prompt = None if level == "strict" else " ".join(exp[max(0, pos - 8):pos + len(hyp) + 6])
                heard2 = transcribe(wav, prompt=prompt, beam=5)
                words2, nxt2, other2 = judge(words_of(heard2, pos))
                if other and not other2: other = None
                by2 = {w["k"]: w for w in words2}
                for n_, w in enumerate(words):
                    w2 = by2.get(w["k"])
                    if w["status"] in ("wrong", "missing") and w2 and w2["status"] in ("ok", "unclear"):
                        words[n_] = dict(w2, again=True); relistened += 1
                known = {w["k"] for w in words}
                words += [dict(w2, again=True) for w2 in words2 if w2["k"] not in known and w2["status"] in ("ok", "unclear")]
                words.sort(key=lambda w: w["k"])
                nxt = max(nxt, nxt2)
                heard = heard + " ‖ " + heard2
            except Exception:
                pass
    # the constrained check: a word the transcription called wrong, missing or unclear whose sounds are all there in
    # the audio, in order with its neighbours, was said (the transcription misheard it)
    fit, verified, spans = {}, 0, {}
    if final and words and os.environ.get("CTC_CHECK", "1") == "1":
        try:
            # the words laid on the audio include a verse taken as passed over: the transcription may have missed a
            # whole verse at a stretch's start (read fast, right after a pause) — its sounds then settle it
            said_ks = sorted({w["k"] for w in words})
            if said_ks and said_ks[-1] - said_ks[0] < 80:
                ks = list(range(said_ks[0], said_ks[-1] + 1))
                fit = ctc_check(wav, surah, where, ks, spans)
                unskip = set()
                for n_, w in enumerate(words):
                    f_ = fit.get(w["k"])
                    if f_ is None: continue
                    w["fit"] = f_
                    if w["status"] in ("wrong", "missing", "unclear") and f_ >= CTC_OK:
                        if w.get("skip"): unskip.add(where[w["k"]][0])
                        words[n_] = dict(w, status="ok", verified=True); words[n_].pop("skip", None); verified += 1
                    # heard as something that is no Quran word at all (the hearing failed, «جنص»), and its sounds neither
                    # clearly there nor clearly absent: not understood — shown, not counted (the Quran's words decide)
                    elif w["status"] == "wrong" and w.get("heard") and CTC_BAD < f_ < CTC_OK \
                            and not any(quranic_word(x) for x in w["heard"].split()):
                        words[n_] = dict(w, status="unclear", garbled=True)
                    # a short word let pass as «not clear» (و، له، في…) whose sounds are nowhere: left out
                    elif w["status"] == "unclear" and "heard" not in w and f_ <= CTC_BAD:
                        words[n_] = dict(w, status="missing", absent=True)
                # a verse found in part is not passed over: its words not found are words left out
                if unskip:
                    for n_, w in enumerate(words):
                        if w.get("skip") and where[w["k"]][0] in unskip: words[n_] = dict(w); words[n_].pop("skip", None)
                # other words said in place of the verse: a run of words not heard right, where something was heard,
                # the sounds of at least one of them nowhere in the audio, and what was heard not Quran (no pair of its
                # words follows in the Quran; one word alone: not a Quran word) — whatever its length. Not a mistake in
                # the verse: the page asks to say it again from the run's first word
                if other is None:
                    run_, ws_ = [], sorted(words, key=lambda w: w["k"])
                    for w in ws_ + [None]:
                        if w is not None and w["status"] in ("wrong", "unclear", "missing") and not w.get("skip"):
                            run_.append(w); continue
                        hw = [x for r_ in run_ for x in (r_.get("heard") or "").split()]
                        # and the reader did not go on with the passage after it in this stretch: words of the verse
                        # heard right after the run mean words left out (a verse passed over, heard garbled — «إيا كان»
                        # for «إياك نعبد»), not something else said
                        after_ok = run_ and any(x["k"] > run_[-1]["k"] and x["status"] == "ok" for x in ws_)
                        if hw and not after_ok and any(r_.get("fit", 0) <= CTC_BAD for r_ in run_):
                            alien = (not quranic(hw)) if len(hw) >= 2 else not quranic_word(hw[0])
                            if alien: other = {"k": run_[0]["k"], "text": " ".join(hw[:6]), "by": "fit"}; break
                        run_ = []
        except Exception as e:
            fit = {"err": f"{type(e).__name__}: {e}"[:200]}
    # other words the transcription did not write at all (a Quran model hears «انتظر قليلًا» as nothing, or as «والنار»):
    # the words due laid on the audio leave a stretch of it to none of them, and in it the sounds of something said
    # (many different sounds — not a madd let run on, not a breath). Not when the reader went back over words (that is
    # said again, not something else), nor before the stretch's first word when an isti'adha or basmala was set aside,
    # nor after the passage's last word (آمين), nor where the words due next are what is there
    gap_other = None
    if final and other is None and back is None and spans.get("_lp") is not None and os.environ.get("GAP_CHECK", "1") == "1":
        try:
            gap_other = speech_between(spans, hyp, heard, exp, where, surah, wav)
            if gap_other: other = gap_other
        except Exception as e:
            gap_other = {"err": f"{type(e).__name__}: {e}"[:200]}
    return {"pos": pos if report_pos is None else report_pos, "next": nxt, "final": final, "heard": heard,
            "words": led + words, "seconds": round(dur, 2),
            "ms": int((time.time() - t0) * 1000), "sought": sought, "back": back, "skipped": len(skipped), "relistened": relistened,
            "verified": verified, "fit": fit, "level": speech_level(wav), "other": other if final else None, "led": len(led), "lead_try": lead_try or None,
            "gap": gap_other}


# ---- constrained check (المطابقة المقيّدة), step 2 of «منهجية نظام التسميع الذكي». The text is known: instead of asking
# «what was said?», ask «does this sound fit the words due?». HisnLabs/tajweed-v2 (Apache-2.0) gives, for each 20 ms
# of the audio, how likely each sound of the Quran phonetic script is; the words due are written in that script
# (phon-simple.json, from the word lexicon data/lexicon: quran-transcript, Hafs) and laid along the audio (CTC Viterbi,
# free start and end). Each word gets a score: the mean, over its sounds, of the log-probability of the sound at its
# best moment (0 = surely said; much below = not this). A word the transcription misheard (اهدنا → «إذ جنص») but whose
# sounds are there is right; a word left out or changed has no good place for its sounds.
PHON = json.load(open(os.path.join(os.path.dirname(__file__), "phon-simple.json"), encoding="utf-8"))
CTC_OK = float(os.environ.get("CTC_OK", "-1.5"))     # a word whose score is at least this was said
CTC_LEAD_MIN = float(os.environ.get("CTC_LEAD_MIN", "-3.5"))   # words before where he began: each at least this, to count as said
CTC_BAD = float(os.environ.get("CTC_BAD", "-6"))     # at most this: its sounds are not in the audio (test set: said -3.7 at worst, left out -7.9 and below)
HARAKA = set("\u064e\u064f\u0650")
_cx = {"sess": None, "meta": None, "fe": None, "err": None}


GAP_SOUNDS = int(os.environ.get("GAP_SOUNDS", "8"))   # different sounds heard in a stretch no word due covers: something else said
GAP_SEC = float(os.environ.get("GAP_SEC", "1.2"))      # and that stretch at least this long (test set: other speech 3.3 s and more)


def speech_between(spans, hyp, heard, exp, where, surah, wav):
    """{"k", "text", "by": "gap", "sounds"} for something else said between (or around) the words due, else None"""
    lp = spans.pop("_lp")
    sp = sorted((v[0], v[1], k) for k, v in spans.items() if isinstance(k, int))
    if len(sp) < 1: return None
    ks = [k for _, _, k in sp]
    # went back over words (a verse said again): the words heard that are words of the passage around here outnumber
    # the words laid on the audio — then what no word covers is that, said again
    near_sk = [skeleton(w) for w in exp[max(0, ks[0] - 12):ks[-1] + 3]]
    matched = sum(1 for w in hyp if any(edit_ratio(skeleton(w), d) >= 0.75 for d in near_sk))
    if matched > ks[-1] - ks[0] + 1: return None
    T = lp.shape[0]
    am = lp.argmax(1)
    def sounds(a, b):
        out, prev = [], 0
        for t in range(max(0, a), min(T, b)):
            x = int(am[t])
            if x != 0 and x != prev: out.append(x)
            prev = x
        return out
    def ph_ids(k):
        a, i = where[k]
        ay = (PHON.get(str(surah)) or [])[a - 1] if a - 1 < len(PHON.get(str(surah)) or []) else []
        ph = (ay[i] if i < len(ay) and ay[i] else "").replace(" ", "")
        return [_cx["id"].get(c) for c in ph if _cx["id"].get(c)]
    stripped = len(heard.split(" ‖ ")[0].split()) > len(hyp) if hyp else False
    # before the first word: not when what was heard there is words of the passage said before it (said again)
    before_sk = [skeleton(w) for w in exp[max(0, ks[0] - 12):ks[0]]]
    said_before = any(edit_ratio(skeleton(w), d) >= 0.6 for w in hyp[:4] for d in before_sk)
    gaps = []
    if not stripped and not said_before: gaps.append((0, sp[0][0], ks[0], None))
    for (a0, a1, ka), (b0, b1, kb) in zip(sp, sp[1:]):
        gaps.append((a1 + 1, b0, kb, ka))
    if ks[-1] + 1 < len(exp): gaps.append((sp[-1][1] + 1, T, ks[-1] + 1, ks[-1]))
    fs = (len(wav) / SR + 0.8) / T
    for a, b, k_next, k_prev in gaps:
        if (b - a) * fs < GAP_SEC: continue
        s_ = sounds(a, b)
        near_ = set()
        if k_prev is not None: near_ |= set(ph_ids(k_prev)[-2:])
        if k_next < len(exp): near_ |= set(ph_ids(k_next)[:2])
        s_ = [x for x in s_ if x not in near_]
        if len(set(s_)) < GAP_SOUNDS: continue
        # after the last word: is it the words due next (the transcription let them go)? their sounds there settle it
        if b == T and k_next < len(exp):
            nxt_w = ctc_phonemes(surah, where, list(range(k_next, min(len(exp), k_next + 3))), waqf_last=False)
            f_ = ctc_words(lp[a:b], nxt_w) if nxt_w else {}
            if f_ and float(np.mean(list(f_.values()))) >= CTC_OK: continue
        return {"k": k_next, "text": "", "by": "gap", "sounds": len(s_), "sec": round((b - a) * fs, 2)}
    return None


def speech_level(wav):
    """how loud the reader is: the level (RMS) of the loudest tenth of the stretch's 20 ms frames — to tell, once
    measured on the test set, a voice too low to judge («ارفع صوتك») from one heard well"""
    n = SR // 50
    if len(wav) < n: return 0.0
    fr = wav[: len(wav) // n * n].reshape(-1, n)
    return round(float(np.percentile(np.sqrt((fr ** 2).mean(1)), 90)), 4)


def ctc_model():
    if _cx["sess"] is None and _cx["err"] is None:
        try:
            import onnxruntime as ort
            from faster_whisper.feature_extractor import FeatureExtractor
            tajweed_engine()
            d = _tj["dir"]
            so = ort.SessionOptions(); so.intra_op_num_threads = int(os.environ.get("TORCH_THREADS", "2"))
            _cx["sess"] = ort.InferenceSession(os.path.join(d, "onnx/model-int8.onnx"), so, providers=["CPUExecutionProvider"])
            _cx["meta"] = json.load(open(os.path.join(d, "config.json"), encoding="utf-8"))
            _cx["fe"] = FeatureExtractor(feature_size=80)
            _cx["id"] = {ph: i + 1 for i, ph in enumerate(_cx["meta"]["phonemes"])}
        except Exception as e:
            _cx["err"] = f"{type(e).__name__}: {e}"[:300]
    return _cx["sess"]


def ctc_lp(wav):
    """log-probabilities (frames x sounds; 0 = blank) of the audio"""
    lead = np.zeros(int(SR * 0.4), np.float32)
    audio = np.concatenate([lead, wav.astype(np.float32), lead])
    mel = _cx["fe"](audio, padding=0)
    mel = mel[:, : min(3000, mel.shape[1] // 2 * 2)]
    return _cx["sess"].run(None, {"mel": mel[None].astype(np.float32), "riwaya": np.array([0], np.int64)})[0][0]


def ctc_words(lp, words, spans=None):
    """words: [(key, phonemes)]. The words laid along the audio in order (CTC Viterbi, start and end free).
    Returns {key: score} (mean over a word's sounds of the log-probability at its best frame). spans (a dict), when
    given, gets each word's first and last frame on that path: {key: [t0, t1]}."""
    ids, owner = [], []
    for key, ph in words:
        prev = None
        for ch in ph:
            i = _cx["id"].get(ch)
            if i is None or i == prev: continue        # repeats (madd, shadda) as one sound: the memorising, not the length
            ids.append(i); owner.append(key); prev = i
    U = len(ids)
    if not U: return {}
    T = lp.shape[0]
    ext = np.zeros(2 * U + 1, np.int64); ext[1::2] = ids
    S = len(ext)
    NEG = -1e9
    skip_ok = np.zeros(S, bool)
    for s_ in range(2, S):
        skip_ok[s_] = ext[s_] != 0 and ext[s_] != ext[s_ - 2]
    dp = np.full(S, NEG); bp = np.zeros((T, S), np.int8)   # 0 stay, 1 from s-1, 2 from s-2, 3 entered here
    best_end, best_t, best_s = NEG, -1, -1
    for t in range(T):
        e = lp[t, ext]
        stay = dp
        one = np.concatenate([[NEG], dp[:-1]])
        two = np.concatenate([[NEG, NEG], dp[:-2]]); two[~skip_ok] = NEG
        enter = np.full(S, NEG); enter[0] = 0.0; enter[1] = 0.0          # start anywhere
        cand = np.stack([stay, one, two, enter])
        k = cand.argmax(0); dp = cand[k, np.arange(S)] + e; bp[t] = k
        for s_ in (S - 1, S - 2):                                        # end anywhere
            if dp[s_] > best_end: best_end, best_t, best_s = dp[s_], t, s_
    if best_t < 0: return {}
    best = {}
    s_, t = best_s, best_t
    while t >= 0:
        if ext[s_] != 0:
            u = (s_ - 1) // 2
            best[u] = max(best.get(u, NEG), float(lp[t, ext[s_]]))
            if spans is not None:
                sp = spans.setdefault(owner[u], [t, t]); sp[0] = min(sp[0], t); sp[1] = max(sp[1], t)
        k = bp[t, s_]
        if k == 3: break
        s_ -= int(k); t -= 1
    out = {}
    for u, key in enumerate(owner):
        out.setdefault(key, []).append(best.get(u, -20.0))
    # the last word: where the reader stops, its last sound is often clipped or let fade (the stretch's end): not counted
    last = owner[-1]
    if len(out[last]) > 2: out[last] = out[last][:-1]
    return {k_: round(float(np.mean(v)), 2) for k_, v in out.items()}


CTC_BONUS = 2.5   # what a sound laid on the audio earns: a word whose sounds are there gains, one whose sounds are not loses


def ctc_prefix(lp, words):
    """How many of the words (in order, from the first) the audio holds: the words laid along it, each sound scored
    against the best sound of its frame (0 when it is the best) plus CTC_BONUS, so a word heard earns and a word not
    said costs — the alignment stops after the last word worth taking. Returns (n, {key: score})."""
    ids, owner, wend = [], [], []
    for n_, (key, ph) in enumerate(words):
        prev = None
        for ch in ph:
            i = _cx["id"].get(ch)
            if i is None or i == prev: continue
            ids.append(i); owner.append(n_); prev = i
        wend.append(len(ids))
    U = len(ids)
    if not U: return 0, {}
    lpn = lp - lp.max(1, keepdims=True)
    T = lpn.shape[0]
    ext = np.zeros(2 * U + 1, np.int64); ext[1::2] = ids
    S = len(ext); NEG = -1e9
    skip_ok = np.zeros(S, bool)
    for s_ in range(2, S): skip_ok[s_] = ext[s_] != 0 and ext[s_] != ext[s_ - 2]
    is_lab = ext != 0
    end_ok = np.zeros(S, bool)                         # a word's last sound, or the blank after it
    for e_ in wend:
        if e_ > 0: end_ok[2 * e_ - 1] = True; end_ok[2 * e_] = True
    dp = np.full(S, NEG); bp = np.zeros((T, S), np.int8)
    best_end, best_t, best_s = NEG, -1, -1
    for t in range(T):
        e = lpn[t, ext]
        stay = dp
        one = np.concatenate([[NEG], dp[:-1]]) + np.where(is_lab, CTC_BONUS, 0)
        two = np.concatenate([[NEG, NEG], dp[:-2]]) + CTC_BONUS; two[~skip_ok] = NEG
        enter = np.full(S, NEG); enter[0] = 0.0; enter[1] = CTC_BONUS
        cand = np.stack([stay, one, two, enter])
        k = cand.argmax(0); dp = cand[k, np.arange(S)] + e; bp[t] = k
        m = np.where(end_ok, dp, NEG); s_ = int(m.argmax())
        if m[s_] > best_end: best_end, best_t, best_s = m[s_], t, s_
    if best_t < 0 or best_end <= 0: return 0, {}
    n_words = owner[(best_s - 1) // 2] + 1 if best_s % 2 else owner[best_s // 2 - 1] + 1
    best = {}
    s_, t = best_s, best_t
    while t >= 0:
        if ext[s_] != 0:
            u = (s_ - 1) // 2
            best[u] = max(best.get(u, NEG), float(lp[t, ext[s_]]))
        k = bp[t, s_]
        if k == 3: break
        s_ -= int(k); t -= 1
    out = {}
    for u in range(U):
        if owner[u] < n_words: out.setdefault(words[owner[u]][0], []).append(best.get(u, -20.0))
    return n_words, {k_: round(float(np.mean(v)), 2) for k_, v in out.items()}


def ctc_phonemes(surah, where, ks, waqf_last=True):
    ph_s = PHON.get(str(surah)) or []
    words = []
    for n_, k in enumerate(ks):
        a, i = where[k]
        ay = ph_s[a - 1] if a - 1 < len(ph_s) else []
        if len(ay) != len(QURAN[str(surah)][a - 1].split()): return []
        ph = (ay[i] or "").replace(" ", "")
        if waqf_last and n_ == len(ks) - 1:
            while ph and ph[-1] in HARAKA: ph = ph[:-1]
        words.append((k, ph))
    return words


def ctc_check(wav, surah, where, ks, spans=None):
    """the scores of the passage's words ks (in order) in this audio; the last one said as the reader stops (waqf)"""
    if ctc_model() is None: return {}
    ph_s = PHON.get(str(surah))
    if not ph_s: return {}
    words = []
    for n_, k in enumerate(ks):
        a, i = where[k]
        ay = ph_s[a - 1]
        if len(ay) != len(QURAN[str(surah)][a - 1].split()) or not ay[i]: continue
        ph = ay[i].replace(" ", "")
        if n_ == len(ks) - 1:
            while ph and ph[-1] in HARAKA: ph = ph[:-1]
        words.append((k, ph))
    if not words: return {}
    lp = ctc_lp(wav)
    if spans is not None: spans["_lp"] = lp
    return ctc_words(lp, words, spans)


# ---- tajweed notes (the tajweed Mushaf only: the ordinary Mushaf's check is about the memorising, this one about
# how it is said). HisnLabs/tajweed-v2 hears the phonetic script of a passage it is told; its rule engine (imam.py)
# sets it beside the passage as it should be said and gives, word by word, what was off: madd length, ghunna,
# ikhfa / iqlab / idgham, qalqala, a letter or vowel. It can be wrong: notes, not mistakes in the memorising.
TJ_REPO = "HisnLabs/tajweed-v2"
_tj = {"tried": False, "inf": None, "imam": None, "err": None, "dir": None}


def tajweed_engine():
    if not _tj["tried"]:
        _tj["tried"] = True
        try:
            import sys, importlib
            from huggingface_hub import snapshot_download
            d = snapshot_download(TJ_REPO, allow_patterns=["*.py", "config.json", "onnx/model-int8.onnx"])
            _tj["dir"] = d
            if d not in sys.path: sys.path.insert(0, d)
            cwd = os.getcwd(); os.chdir(d)                 # the engine may look for its files beside itself
            try:
                _tj["inf"] = importlib.import_module("inference")
                _tj["imam"] = importlib.import_module("imam")
            finally:
                os.chdir(cwd)
        except Exception as e:
            _tj["err"] = f"{type(e).__name__}: {e}"[:400]
    return _tj["inf"], _tj["imam"]


def _plain(x):
    """the engine's results as plain JSON"""
    import dataclasses
    if dataclasses.is_dataclass(x): x = dataclasses.asdict(x)
    if hasattr(x, "model_dump"): x = x.model_dump()
    if isinstance(x, dict): return {str(k): _plain(v) for k, v in x.items()}
    if isinstance(x, (list, tuple)): return [_plain(v) for v in x]
    if isinstance(x, (np.floating, np.integer)): return x.item()
    if isinstance(x, (str, int, float, bool)) or x is None: return x
    return str(x)


@app.get("/tajweed")
def tajweed_status():
    import inspect
    inf, im = tajweed_engine()
    sig = lambda m, n: str(inspect.signature(getattr(m, n))) if m is not None and hasattr(m, n) else None
    return {"loaded": inf is not None and im is not None, "error": _tj["err"],
            "hear": sig(inf, "hear"), "recited": sig(im, "recited"), "listen": sig(im, "listen")}


@app.post("/tajweed")
def tajweed(audio: UploadFile = File(...), surah: int = Form(...), ayah: int = Form(...), to: int = Form(None), lang: str = Form("ar")):
    """a verse or a few following ones (ayah..to), said whole, at most 30 s: word by word, what in the saying was off"""
    import time
    t0 = time.time()
    inf, im = tajweed_engine()
    if inf is None or im is None: raise HTTPException(503, "tajweed engine: " + str(_tj["err"]))
    raw = audio.file.read()
    if len(raw) > 4_000_000: raise HTTPException(413, "audio too long")
    wav = pcm_wav(raw)
    if wav is None: wav = decode_audio(raw)
    if len(wav) / SR > 30: raise HTTPException(413, "audio too long (30 s at most)")
    try:
        return _tajweed_run(inf, im, wav, surah, ayah, to or ayah, lang, t0)
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        raise HTTPException(500, f"tajweed: {type(e).__name__}: {e} | " + traceback.format_exc()[-700:])


def _tajweed_run(inf, im, wav, surah, ayah, to, lang, t0):
    import time
    from quran_transcript import Aya
    if not (1 <= surah <= 114 and 1 <= ayah <= to <= len(QURAN[str(surah)]) and to - ayah < 10): raise HTTPException(400, "ayah range")
    words, counts = [], []
    for a in range(ayah, to + 1):
        ws = Aya(surah, a).get().uthmani.split(); words += ws; counts.append(len(ws))
    out = inf.hear(wav.astype(np.float32), riwaya="hafs")
    heard, prob, times = (list(out) + [None, None])[:3] if isinstance(out, (tuple, list)) else (out, None, None)
    ref = im.recited(words, heard, riwaya="hafs")
    lg = lang if lang in ("ar", "en", "fr") else "en"
    res = [_plain(r) for r in im.listen(ref, heard, heard_probs=prob, heard_times=times, min_prob=0.3, min_prob_jali=0.7, langs=(lg,))]
    return {"surah": surah, "ayah": ayah, "to": to, "counts": counts, "words": res, "heard": _plain(heard) if isinstance(heard, str) else str(type(heard)),
            "hear_out": len(out) if isinstance(out, (tuple, list)) else 1, "ms": int((time.time() - t0) * 1000)}
