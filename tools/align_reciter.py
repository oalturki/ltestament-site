"""Ayah timings for a reciter who has one audio file per surah (e.g. a continuous hadr recitation).

Asks the recitation-check service (asr-space/, the Space ltestament/tasmee) to line each surah file up with the
text, and writes data/rec/<id>.json = {"<surah>": [[ayah, start_ms, end_ms], ...]} — the format the book uses
for 'surah' reciters (the ayah being recited is highlighted, and any ayah or passage can be played).
Also writes tools/data/align/<id>.json with the word times and how well each surah matched, for checking.

Usage: python3 tools/align_reciter.py <id> "<url with {s} for the 3-digit surah number>" [first-last]
e.g.   python3 tools/align_reciter.py hadr_x "https://server.example/hadr/{s}.mp3" 78-114
"""
import json, os, sys, time, urllib.parse, urllib.request

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
API = os.environ.get("ALIGN_API", "https://ltestament-tasmee.hf.space") + "/align"


def call(surah, url):
    body = urllib.parse.urlencode({"surah": surah, "url": url}).encode()
    for attempt in range(4):
        try:
            with urllib.request.urlopen(urllib.request.Request(API, data=body), timeout=900) as r:
                return json.load(r)
        except Exception as e:
            print(f"  surah {surah}: {e} (try {attempt + 1})", flush=True); time.sleep(20)
    return None


def main():
    rid, tmpl = sys.argv[1], sys.argv[2]
    a, b = (sys.argv[3].split("-") + [None])[:2] if len(sys.argv) > 3 else ("1", "114")
    first, last = int(a), int(b or a)
    out_p = os.path.join(REPO, "data", "rec", rid + ".json")
    chk_p = os.path.join(REPO, "tools", "data", "align", rid + ".json")
    os.makedirs(os.path.dirname(chk_p), exist_ok=True)
    out = json.load(open(out_p)) if os.path.exists(out_p) else {}
    chk = json.load(open(chk_p)) if os.path.exists(chk_p) else {}
    for s in range(first, last + 1):
        res = call(s, tmpl.replace("{s}", f"{s:03d}"))
        if not res: continue
        out[str(s)] = res["ayahs"]
        chk[str(s)] = {"matched": res["matched"], "seconds": res["seconds"], "words": res["words"]}
        print(f"surah {s}: {len(res['ayahs'])} ayahs, matched {res['matched']:.1%}", flush=True)
        json.dump(out, open(out_p, "w"), ensure_ascii=False, separators=(",", ":"))
        json.dump(chk, open(chk_p, "w"), ensure_ascii=False, separators=(",", ":"))


if __name__ == "__main__":
    main()
