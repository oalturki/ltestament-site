"""Replace the Quran quotations on the home pages (written in the usual imla'i spelling) with the
King Fahd Complex Uthmanic text of the same words, so they can be shown in the Complex font.

How: every run of fully-vowelled Arabic in the page is split into chunks (at verse-number markers and
"..."), and each chunk is matched word-for-word against the verses in tools/data/quran_quotes.json
(Complex Hafs text from QuranEnc). A chunk is replaced only when every word matches closely.
Verse-number markers become plain Arabic-Indic digits, which the Complex font draws as the ornamented
end-of-verse sign. Idempotent: text already in Uthmanic spelling is left alone.

Adding a new quotation? Add its verse(s) to tools/data/quran_quotes.json (QuranEnc arabic_text), then:
    python3 tools/uthmani_hook.py            # all six home pages
    python3 tools/uthmani_hook.py --dry-run  # show what would change
"""
import difflib, json, pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
VERSES = json.loads((ROOT / 'tools/data/quran_quotes.json').read_text(encoding='utf-8'))
PAGES = ['index.html', 'en/index.html', 'ur/index.html', 'fr/index.html', 'es/index.html', 'ru/index.html']

MARKS = re.compile('[ً-ٰٟۖ-ࣰۭ-ࣲـ]')
ARABIC_RUN = re.compile('[؀-ۿࣰ-ࣲ][؀-ۿࣰ-ࣲ\\s().﴿﴾…0-9]*[؀-ۿࣰ-ࣲ)﴾]')
MARKER = re.compile('\\s*(?:[(﴿]\\s*([٠-٩0-9]+)\\s*[)﴾])\\s*')
ELLIPSIS = re.compile('\\s*(?:\\.\\.\\.|…)\\s*')
UTHMANI_ONLY = re.compile('[ۡۥۦٱࣰ-ࣲٗٞ]')  # signs used only in Uthmanic text
AR_DIGITS = '٠١٢٣٤٥٦٧٨٩'

def skel(w):
    w = MARKS.sub('', w)
    w = re.sub('[ٱأإآٲ]', 'ا', w).replace('ؤ', 'و').replace('ئ', 'ي').replace('ة', 'ه')
    w = re.sub('[اءى]', '', w)
    w = re.sub('وو+', 'و', w)
    w = re.sub('يي+', 'ي', w)
    return w

def sim(a, b):
    return difflib.SequenceMatcher(None, skel(a), skel(b)).ratio()

def match(chunk):
    """Best (verse words window) for a chunk of imla'i words; None unless every word matches."""
    words = chunk.split()
    n = len(words)
    best = None
    for ref, text in VERSES.items():
        vw = text.split()
        for i in range(0, len(vw) - n + 1):
            scores = [sim(a, b) for a, b in zip(words, vw[i:i + n])]
            score, worst = sum(scores) / n, min(scores)
            if worst >= 0.6 and (best is None or score > best[0]):
                best = (score, ref, ' '.join(vw[i:i + n]))
    return best if best and best[0] >= 0.85 else None

def digits(n):
    return ''.join(AR_DIGITS[int(d)] if d.isdigit() and d in '0123456789' else d for d in n)

def convert(run):
    """Convert one Arabic run; returns (new_text, log) or (None, reason)."""
    if UTHMANI_ONLY.search(run):
        return None, 'already uthmani'
    letters = re.sub('[^ء-ي]', '', run)
    vowels = len(MARKS.findall(run))
    if len(run.split()) < 2 or not letters or vowels / len(letters) < 0.5:
        return None, 'not a vowelled quotation'
    # split into chunks, remembering the separators (verse markers / ellipses)
    parts, pos, out, log = [], 0, [], []
    for m in re.finditer(MARKER.pattern + '|' + ELLIPSIS.pattern, run):
        parts.append((run[pos:m.start()], m.group(1), m.group(0)))
        pos = m.end()
    parts.append((run[pos:], None, ''))
    for text, num, sep in parts:
        text = text.strip()
        if text:
            m = match(text)
            if not m:
                return None, 'no confident match for: ' + text[:60]
            out.append(m[2]); log.append(f'{m[1]} ({m[0]:.2f})')
        if num is not None:
            out.append(digits(num))
        elif sep.strip():
            out.append('…')
    return ' '.join(out), ', '.join(log)

def apply(path, dry=False):
    p = pathlib.Path(path)
    s = p.read_text(encoding='utf-8')
    changes = []
    def rep(m):
        new, info = convert(m.group(0))
        if new is None:
            return m.group(0)
        changes.append((m.group(0)[:50], info))
        return new
    s2 = ARABIC_RUN.sub(rep, s)
    if not dry and s2 != s:
        p.write_text(s2, encoding='utf-8')
    return changes

if __name__ == '__main__':
    dry = '--dry-run' in sys.argv
    for rel in PAGES:
        ch = apply(ROOT / rel, dry)
        print(f'{rel}: {len(ch)} quotations')
        if dry or rel == 'index.html':
            for old, info in ch:
                print('   ', info, '|', old)
