"""Where each tajweed rule falls in its word: the letter (and, where it helps, the kind of rule).

data/tajweed/p<N>.json (build_tajweed_rules.py) says which rules a word carries — read from the colours of the King
Fahd Complex's colour Mushaf — but not on which letter. The colour fixes the kind of rule; this finds, in the word's
Hafs text (the Complex's own script, data/mushaf/p<N>.json), the letter that kind of rule falls on.

Output: data/tajweed/n<N>.json = {"s:a:w": {"<rule>": "<what, in Arabic>", ...}} — e.g. {"6": "قلقلة الدال"} reads
"القلقلة على الدال". A rule whose letter is not found certainly is left out: the word then shows the rule alone, as before.

The script's marks (KFGQPC Hafs): ۡ sukun · ْ (U+0652) a letter not pronounced · ٞ ٖ ٗ tanween hidden or merged into the
next word · ۢ ۭ the small meem of iqlab · ٓ madda · ٰ the small alif · ۥ ۦ the small waw and yeh of the pronoun's
lengthening (sila) · ٱ hamzat al-wasl."""
import json, pathlib, collections, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent

NAMES = {'ا': 'الألف', 'أ': 'الهمزة', 'إ': 'الهمزة', 'ء': 'الهمزة', 'ؤ': 'الهمزة', 'ئ': 'الهمزة', 'ٱ': 'همزة الوصل',
         'ب': 'الباء', 'ت': 'التاء', 'ة': 'التاء', 'ث': 'الثاء', 'ج': 'الجيم', 'ح': 'الحاء', 'خ': 'الخاء', 'د': 'الدال',
         'ذ': 'الذال', 'ر': 'الراء', 'ز': 'الزاي', 'س': 'السين', 'ش': 'الشين', 'ص': 'الصاد', 'ض': 'الضاد', 'ط': 'الطاء',
         'ظ': 'الظاء', 'ع': 'العين', 'غ': 'الغين', 'ف': 'الفاء', 'ق': 'القاف', 'ك': 'الكاف', 'ل': 'اللام', 'م': 'الميم',
         'ن': 'النون', 'ه': 'الهاء', 'و': 'الواو', 'ي': 'الياء', 'ى': 'الألف', 'ٰ': 'الألف', 'ۥ': 'الواو', 'ۦ': 'الياء'}
SUK, SHAD, MADDA, SILENT = 'ۡ', 'ّ', 'ٓ', 'ْ'
FAT, DAM, KAS = 'َ', 'ُ', 'ِ'
TAN_OPEN = 'ٖٞٗ'          # tanween hidden / merged into the next word
TAN_SHUT = 'ًٌٍ'          # tanween pronounced clearly
TAN = TAN_OPEN + TAN_SHUT
IQLAB = 'ۭۢ'
VOW = FAT + DAM + KAS + TAN
QALQ, ISTILA = 'قطبجد', 'خصضغطقظ'
IKHFA = 'تثجدذزسشصضطظفقك'
LETTERS = set(NAMES) | set('ى')


def split(word):
    """The word's letters, each with its marks: [[letter, marks], ...] (tatweel and stop signs left out)."""
    out = []
    for ch in word:
        if ch in LETTERS and ch not in 'ٰ':
            out.append([ch, ''])
        elif ch == 'ٰ':                                    # the small alif: a letter of lengthening on its own
            out.append(['ٰ', ''])
        elif out and 'ً' <= ch <= 'ۿ' and ch not in 'ـ۞۩' and not ('ۖ' <= ch <= 'ۜ'):   # stop signs are not marks
            out[-1][1] += ch
    return out


def first_letter(word):
    s = split(word)
    return s[0] if s else None


def find(rule, word, nxt, ends_ayah, prv=''):
    """The note for this rule in this word, or None when its letter is not found certainly."""
    L = split(word)
    n = len(L)
    if not n:
        return None
    nf = first_letter(nxt) if nxt else None
    pl = split(prv) if prv else []
    # the previous word ends in a noon or tanween merged into this word's first letter (غِشَٰوَةٞ وَلَهُمۡ)
    def tan_end(W):
        for c, m in reversed(W):
            if any(x in m for x in TAN_OPEN): return True
            if c in 'اى' and not m: continue
            return False
        return False
    p_merge = bool(pl) and (tan_end(pl) or (pl[-1][0] == 'ن' and not any(x in pl[-1][1] for x in VOW + SUK + SHAD)))

    if rule == 6:                                          # qalqalah: a qalqalah letter with sukun, or stopped on
        hits = [c for c, m in L if c in QALQ and SUK in m]
        if not hits and ends_ayah and L[-1][0] in QALQ:
            hits = [L[-1][0]]
        if not hits and ends_ayah and L[-1][0] in 'اى' and n > 1 and L[-2][0] in QALQ:
            hits = [L[-2][0]]
        return 'قلقلة ' + ' و'.join(dict.fromkeys(NAMES[c] for c in hits)) if hits else None

    if rule == 5:                                          # tafkhim: the high letters, ra' heavy, lam of the Name
        hits = []
        for i, (c, m) in enumerate(L):
            if c in ISTILA:
                hits.append(NAMES[c])
            elif c == 'ر':
                prev = L[i - 1][1] if i else ''
                if FAT in m or DAM in m or 'ً' in m or 'ٌ' in m or 'ٞ' in m or 'ٗ' in m:
                    hits.append('الراء')
                elif SUK in m and (FAT in prev or DAM in prev):
                    hits.append('الراء')
                elif SUK in m and i and L[i - 1][0] == 'ٱ':                      # ٱرۡجِعۡ: after hamzat al-wasl
                    hits.append('الراء')
                elif not m and i == n - 1 and nf and nf[0] == 'ر':             # وَٱذۡكُر رَّبَّكَ: merged into the next ra'
                    hits.append('الراء')
                elif ends_ayah and i == n - 1:                                   # stopping on a ra' (ٱلنَّارِ، نُّكُرٍ، عَشۡرٖ)
                    j = i - 1
                    if j >= 0 and (L[j][0] in 'او' and not any(x in L[j][1] for x in VOW + SHAD) or FAT in L[j][1] or DAM in L[j][1]):
                        hits.append('الراء')
                    elif j >= 1 and SUK in L[j][1] and (FAT in L[j - 1][1] or DAM in L[j - 1][1]):
                        hits.append('الراء')
            elif c == 'ل' and SHAD in m and i + 1 < n and L[i + 1][0] == 'ه' and i >= 1 and L[i - 1][0] == 'ل' \
                    and (i < 2 or KAS not in L[i - 2][1]):
                hits.append('لام لفظ الجلالة')
        return 'تفخيم ' + ' و'.join(dict.fromkeys(hits)) if hits else None

    if rule == 4:                                          # ghunnah and ikhfa'
        hits = []
        for i, (c, m) in enumerate(L):
            last = i == n - 1
            after = L[i + 1][0] if i + 1 < n else (nf[0] if nf else None)
            if c in 'نم' and SHAD in m:
                hits.append('غنة ' + NAMES[c] + ' المشددة')
            elif c == 'ن' and any(x in m for x in IQLAB):
                hits.append('إقلاب النون ميمًا')
            elif any(x in m for x in IQLAB):
                hits.append('إقلاب التنوين ميمًا')
            elif c == 'ن' and not any(x in m for x in VOW + SUK + SHAD) and not last or (c == 'ن' and last and not any(x in m for x in VOW + SUK + SHAD) and after):
                if after and after in IKHFA:
                    hits.append('إخفاء النون الساكنة')
                # before ي ن م و the noon merges: its ghunnah sounds on the next letter (noted with that word)
            elif c == 'م' and not any(x in m for x in VOW + SUK + SHAD) and after == 'ب':
                hits.append('إخفاء الميم الساكنة')
            elif any(x in m for x in TAN_OPEN) and last and nf:
                if nf[0] in IKHFA:
                    hits.append('إخفاء التنوين')
            if any(x in m for x in TAN_OPEN) and not last and all(cc in 'اى' and not mm for cc, mm in L[i + 1:]) and nf:
                if nf[0] in IKHFA:
                    hits.append('إخفاء التنوين')
        if p_merge and L[0][0] in 'يو':
            hits.insert(0, 'غنة ' + NAMES[L[0][0]] + ' (إدغام بغنة)')
        elif not hits and p_merge and L[0][0] in 'نم':
            hits.append('غنة ' + NAMES[L[0][0]] + ' (إدغام بغنة)')
        return '، '.join(dict.fromkeys(hits)) if hits else None

    if rule in (0, 1, 2):                                  # madd of 6, of 4–5, of 2–4–6: the letter under the madda
        hits = []
        for i, (c, m) in enumerate(L):
            if MADDA in m:
                if c in 'اوىيٰۥۦ':
                    hits.append(NAMES[c])
                elif rule == 0:                          # the opening letters (الٓمٓ): the letter itself is lengthened
                    hits.append('حرف ' + NAMES[c].replace('ال', '', 1))
                elif c in 'أإءؤئ' and i and L[i - 1][0] in 'اوي':
                    hits.append(NAMES[L[i - 1][0]])
        kind = {0: 'مد لازم', 1: 'مد واجب', 2: 'مد جائز'}[rule]
        if hits:
            return kind + ' في ' + ' و'.join(dict.fromkeys(hits))
        if rule == 2 and ends_ayah and n >= 2:            # stopping at the ayah's end: the madd before the last letter
            for j in range(n - 2, max(-1, n - 4), -1):
                c, m = L[j]
                pv = L[j - 1][1] if j else ''
                if (c == 'ا' or c == 'ى' or c == 'ٰ') and not any(x in m for x in VOW + SUK + SHAD):
                    return 'مد عارض للسكون في الألف'
                if c == 'و' and not any(x in m for x in VOW + SHAD) and DAM in pv:
                    return 'مد عارض للسكون في الواو'
                if c == 'ي' and not any(x in m for x in VOW + SHAD) and KAS in pv:
                    return 'مد عارض للسكون في الياء'
                if c in 'وي' and SUK in m and FAT in pv:
                    return 'مد اللين عند الوقف في ' + NAMES[c]
                if any(x in m for x in VOW + SHAD):
                    break
        return None

    if rule == 3:                                          # madd of two counts: sila, 'iwad, the small alif
        hits = []
        for i, (c, m) in enumerate(L):
            if c in 'ۥۦ':
                hits.append('مد الصلة الصغرى (' + NAMES[c] + ' الصغيرة)')
            elif c == 'ا' and i and 'ً' in L[i - 1][1] and i == n - 1:
                hits.append('مد العوض عند الوقف')
            elif '\u06e7' in m:                                              # ٱلنَّبِيِّـۧنَ: the small yeh
                hits.append('مد طبيعي (الياء الصغيرة)')
            elif c == 'ٰ' and not MADDA in m:
                hits.append('مد طبيعي (الألف الصغيرة)')
        return '، '.join(dict.fromkeys(hits)) if hits else None

    if rule == 7:                                          # not pronounced
        hits = []
        for i, (c, m) in enumerate(L):
            nxt_m = L[i + 1][1] if i + 1 < n else (nf[1] if nf else '')
            nxt_c = L[i + 1][0] if i + 1 < n else (nf[0] if nf else '')
            if c == 'ٱ':
                hits.append('همزة الوصل')
            elif SILENT in m or '۠' in m:
                hits.append(NAMES.get(c, c))
            elif c == 'ل' and not any(x in m for x in VOW + SUK + SHAD) and SHAD in nxt_m:
                hits.append('اللام الشمسية')
            elif c in 'وى' and not m and i + 1 < n and L[i + 1][0] == 'ٰ':      # صَلَوٰة، هُدَىٰهُمۡ: written, read as alif
                hits.append(('الواو' if c == 'و' else 'الياء') + ' (تُقرأ ألفًا)')
            elif c == 'ن' and any(x in m for x in IQLAB):
                hits.append('النون (تُقلب ميمًا)')
            elif any(x in m for x in IQLAB):
                hits.append('التنوين (يُقلب ميمًا)')
            elif c == 'ن' and not any(x in m for x in VOW + SUK + SHAD) and nxt_c and nxt_c in 'لرينمو':
                hits.append('النون (مدغمة)')
            elif any(x in m for x in TAN_OPEN) and nf and nf[0] in 'لرينمو' and all(cc in 'اى' and not mm for cc, mm in L[i + 1:]):
                hits.append('التنوين (مدغم)')
            elif c not in 'اويىٰۥۦ' and not any(x in m for x in VOW + SUK + SHAD) and SHAD in nxt_m and i < n - 1:
                hits.append(NAMES.get(c, c) + ' (مدغمة)')
            elif c not in 'اويىٰۥۦ' and not any(x in m for x in VOW + SUK + SHAD) and i == n - 1 and nf and SHAD in nf[1]:
                hits.append(NAMES.get(c, c) + ' (مدغمة)')
            elif c in 'اوي' and not m and i and i < n - 1 and False:
                pass
        if hits:
            return 'لا يُلفظ: ' + ' و'.join(dict.fromkeys(hits))
        if not hits:                                     # a final long vowel dropped before a joined word (فِى ٱلۡ…)
            if L[-1][0] in 'اويى' and not L[-1][1] and nf and nf[0] == 'ٱ':
                hits.append('لا تُلفظ وصلًا: ' + NAMES[L[-1][0]])
        return '، '.join(dict.fromkeys(hits)) if hits else None
    return None


def main():
    stats = collections.Counter(); miss = collections.defaultdict(list)
    for p in range(1, 605):
        fp = ROOT / f'data/tajweed/p{p}.json'
        if not fp.exists():
            continue
        rules = json.loads(fp.read_text())
        m = json.loads((ROOT / f'data/mushaf/p{p}.json').read_text())
        words = []                                          # the page's words in order, with ayah ends
        for L in m['l']:
            if L[0] != 'a':
                continue
            for w in L[2]:
                if len(w) > 2 and w[1] and len(w[1].split(':')) == 3:
                    words.append((w[1], w[2] or ''))
        out = {}
        for i, (loc, txt) in enumerate(words):
            if loc not in rules or txt.strip().isdigit() or not txt:
                continue
            nxt = words[i + 1][1] if i + 1 < len(words) else ''
            ends = (not nxt) or nxt.strip().translate({ord(d): None for d in '٠١٢٣٤٥٦٧٨٩'}) == ''
            if ends:
                nxt = ''
            notes = {}
            for r in rules[loc]:
                stats[(r, 'all')] += 1
                note = find(r, txt, nxt, ends, words[i - 1][1] if i and not words[i - 1][1].strip().isdigit() else '')
                if note:
                    notes[str(r)] = note; stats[(r, 'ok')] += 1
                else:
                    miss[r].append((loc, txt, nxt))
            if notes:
                out[loc] = notes
        (ROOT / f'data/tajweed/n{p}.json').write_text(json.dumps(out, ensure_ascii=False, separators=(',', ':')))
    for r in range(8):
        a, o = stats[(r, 'all')], stats[(r, 'ok')]
        print(r, a, o, '%.1f%%' % (100 * o / a if a else 0))
    if len(sys.argv) > 1:
        r = int(sys.argv[1])
        for x in miss[r][:int(sys.argv[2]) if len(sys.argv) > 2 else 40]:
            print(x)


if __name__ == '__main__':
    main()
