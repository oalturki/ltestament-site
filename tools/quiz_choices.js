#!/usr/bin/env node
/* Wrong answers for the word-meaning quiz, chosen once at build time (so they can be reviewed and corrected).
   Reads data/quiz/siraj.json ([[surah, ayah, head-word, meaning], ...], written by tools/build_quiz.py) and adds to each
   row its best wrong-answer candidates: [surah, ayah, head-word, meaning, [row index, ...]] (best first).
   Likeness of the word (kind, letters, rhyme, sound, length, pronoun), of the meaning (kind, length) and of its
   topic (God, the Hereafter, Paradise, Hell, nature, prophets' stories, ...), while clearly a different meaning.
   Review: tools/data/quiz_review.json — {"bad": [[asked word, wrong answer as shown], ...], "drop": [word, ...]}
   (heads as written in the book, without vowels) — pairs never offered together, words never asked.
   Run by tools/build_quiz.py; or: node tools/quiz_choices.js */
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const FILE = path.join(ROOT, 'data/quiz/siraj.json');
const REVIEW = path.join(ROOT, 'tools/data/quiz_review.json');
var len = function (t) {
    return String(t || '').replace(/[ً-ٰٟۖ-ۭـ]/g, '').replace(/[ٱأإآا]/g, '')
      .replace(/[ىئ]/g, 'ي').replace(/ؤ/g, 'و').replace(/ة/g, 'ه').replace(/[^ء-ي\s]/g, '').trim();
  };
// a rough stem: no و ف ب ل ك, no «ال», no present-tense prefix, no attached pronoun or plural ending (تنفع / ينفعه → نفع)
// the possible stems of a word, roughly (prefixes و ف ب ل ك «ال», present-tense and «است» prefixes, attached
// pronouns and plural endings may or may not be there: بينا / بيناه، تركك / تركنا، مهلك / تهلك، حجة / بحجة)
function stems(x) {
  var w = String(x).replace(/[ً-ٰٟۖ-ۭـ]/g, '').replace(/[ٱأإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي')
    .replace(/[^ء-ي]/g, '');
  var out = [w];
  var add = function (v) { if (v.length >= 3 && out.indexOf(v) < 0) out.push(v); };
  var pre = /^(وال|فال|بال|كال|لل|ال|و|ف|ب|ل|ك)/.exec(w), base = [w];
  if (pre) { add(w.slice(pre[0].length)); base.push(w.slice(pre[0].length)); }
  base.slice().forEach(function (v) { var c = v.replace(/(هما|هم|هن|كم|نا|ها|ه|ك|ون|ين|وا|ات|تم)$/, ''); if (c !== v) { add(c); base.push(c); } });
  base.forEach(function (v) { var m = /^(است|[يتنم])/.exec(v); if (m && v.length - m[0].length >= 3) add(v.slice(m[0].length)); });
  return out;
}
// two words of one root, roughly: a common stem, or common last three letters of stems
function sameRoot(a, b) {
  return a.some(function (x) { return b.some(function (y) { return x === y || (x.length >= 3 && y.length >= 3 && x.slice(-3) === y.slice(-3)); }); });
}
  var BARE = function (t) { return String(t || '').replace(/[\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g, '').replace(/[ٱأإآ]/g, 'ا').replace(/[^\u0621-\u064A\s]/g, '').trim(); };
var PR = /(هما|هم|هن|كم|كن|نا|ها|ه|ك|ي)$/;
// the kind of a voweled word: n noun, v verb, p particle — from its vowels, prefixes and endings
var HAR = /[\u064B-\u065F\u0670\u06D6-\u06ED]/g;
function kind(raw) {
  var w0 = String(raw).replace(/[^\u0621-\u065F\u0670\u06D6-\u06ED\s]/g, ' ').trim().split(/\s+/)[0] || '';   // the first word, without punctuation
  var w = w0.replace(/^[وف]َ?/, '');
  var wv = w.replace(/^أَ(?=[يتنأ])/, '').replace(/^سَ(?=[يتن])/, '');   // أَيَحْسَبُ (question), سَيُجَنَّبُهَا (future)                     // the conjunction و / ف
  var b = w.replace(HAR, '').replace(/[ٱأإآ]/g, 'ا');
  if (b.length <= 2 || /^(من|عن|في|على|إلى|الى|إن|أن|ان|لا|ما|لم|لن|قد|بل|ثم|أو|او|إذ|اذ|إذا|اذا|كلا|حتى|لعل|ليت|لكن|إلا|الا)$/.test(b)) return 'p';
  if (/^[اٱ]لْ[^\u064B-\u065F][َُِ][^\u064B-\u065F][ِْ]?$/.test(w)) return 'v';   // الْزَمْ / الْزَمِ: an imperative of a verb beginning with ل, not «ال»   // الْزَمْ: an imperative, not «ال»
  if (/^(بِ|كَ|لِ)?[اٱ]ل/.test(w.replace(HAR, '')) || /[\u064B\u064C\u064D]/.test(w)) return 'n';   // «ال» (not أَلْقَتْ) or tanween
  if (/^أَ[^\u064B-\u065F]ْ[^\u064B-\u065F]َ[^\u064B-\u065F]َ$/.test(w)) return 'v';   // أَفْعَلَ: أَصْلَحَ
  var body = w.replace(/(هُمَا|هُمْ|هُنَّ|كُمْ|كُنَّ|نَا|هَا|هُ|هِ|كَ|كِ|نِي|ي)[ً-ٟ]*$/, '');
  var suf = w.slice(body.length);
  if (/َتِ$/.test(body)) return 'v';                                                     // وَبُرِّزَتِ: past feminine before a hamzat wasl
  if (/^نَا/.test(suf) && /ْ$/.test(body)) return 'v';                                    // شَدَدْنَا
  if (/ِ$/.test(body)) return 'n';                                                      // genitive ending: a noun
  if (/تْ$|تُمْ?$|تُنَّ$|ْتَ$|ُوا$|وْا$|ُوهُ|وهَا|ُونِ$/.test(body) || /تْ(ه|ه|ك)/.test(w)) return 'v';  // فعلتْ، فعلتم، فعلوا
  if (/^[يتن]َ[^\u064B-\u065F]َا[^\u064B-\u065F]ِ[^\u064B-\u065F]ُ?$/.test(w)) return 'n';   // نَمَارِقُ، تَمَاثِيلُ: a broken plural, not a verb
  if (/^[يتن][َُ]/.test(wv) && b.length >= 4 && /[ُْ]$|ونَ$|وْنَ$|انِ$|ِي$|ي$/.test(body)) return 'v';   // يَفْعَلُ، يُنَادَوْنَ، يُغْشِي
  if (/^[^\u064B-\u065F]ُ[^\u064B-\u065F]ِ[^\u064B-\u065F][َ]$/.test(body)) return 'v';                   // قُضِيَ                // يفعلُ، تفعلون، يفعلْ
  if (/^[^ً-ٟ]َ[^ً-ٟ][َُِ]?[^ً-ٟ]َ$/.test(body)) return 'v'; // فَعَلَ
  if (/^[اأ][ُِ]?[^ً-ٟ]ْ/.test(w) && /ْ$|ُوا$/.test(body)) return 'v';          // افعلْ (imperative)
  return 'n';
}
function feat(e) {
  var hb = BARE(e.head), mb = BARE(e.mean), w = hb.split(' ');
  var core = w[0].replace(/^(و|ف|ب)/, '').replace(/^ال/, '').replace(PR, '');
  e.f = {
    key: len(e.head), mk: len(e.mean),
    words: w.length, letters: hb.replace(/\s/g, '').length,
    kind: kind(e.head), mkind: kind(e.mean), al: /^(و|ف|ب)?ال/.test(w[0]),
    lead: /^[وفب]/.test(w[0]) ? w[0][0] : '', tail: (PR.exec(w[0]) || [''])[0], end2: w[w.length - 1].slice(-2),
    set: core.split('').filter(function (c, i, a) { return a.indexOf(c) === i; }),
    shape: core.replace(/[اوي]/g, '_'),                                                    // the consonant skeleton: how it sounds
    mwords: mb.split(' ').filter(function (x) { return x.length > 2; }).map(stems),
    mtail: (PR.exec(mb.split(' ')[0]) || [''])[0], mlen: e.mean.length
  };
  return e;
}
function likeness(e, x) {
  var a = e.f, b = x.f, sc = 0;
  sc += a.kind === b.kind ? 40 : -20;                                                      // noun with noun, verb with verb
  sc += a.mkind === b.mkind ? 30 : -10;                                                    // meaning read the same way (a verb's meaning is a verb)
  sc += a.words === b.words ? 15 : 0;
  sc -= Math.abs(a.letters - b.letters) * 4;
  sc += a.al === b.al ? 8 : 0;
  sc += a.tail === b.tail ? 12 : 0;
  sc += a.lead === b.lead ? 6 : 0;
  sc += a.end2 === b.end2 ? 8 : 0;                                                         // the same rhyme
  sc += a.shape.length === b.shape.length ? 6 : 0;
  var common = a.set.filter(function (c) { return b.set.indexOf(c) >= 0; }).length;
  sc += 14 * common / Math.max(1, Math.max(a.set.length, b.set.length));                  // shared letters
  sc += a.mtail === b.mtail ? 8 : 0;
  sc -= Math.abs(a.mlen - b.mlen) / 1.5;                                                   // the answers about the same length
  return sc;
}
function distinct(e, x) {                                                                   // clearly a different meaning
  var a = e.f, b = x.f;
  if (x === e || a.key === b.key || a.mk === b.mk || a.mk.indexOf(b.mk) >= 0 || b.mk.indexOf(a.mk) >= 0) return false;
  if (b.key === a.mk || b.mk === a.key) return false;   // the right answer is itself a word of the book (﴿تَغْشَاهَا﴾): no crossing
  var shared = a.mwords.filter(function (w) { return b.mwords.some(function (v) { return sameRoot(w, v); }); }).length;
  return shared / Math.max(1, Math.min(a.mwords.length, b.mwords.length)) < 0.34;
}

// topics, from the words of the meaning (and the head word): same topic = a more plausible wrong answer
const TOPICS = {
  allah: / (الله|لله|بالله|ربك|ربه|ربهم|الرب|سبحانه|تعالي|معبود|الاله|الخالق|خالق|عظمته|قدرته|علمه|رحمته) /,
  qiyama: / (القيامه|البعث|الحساب|الجزاء|الاخره|النفخه|الصور|الموت|القبور|الساعه|الحشر|يوم) /,
  janna: / (الجنه|نعيم|الحور|انهار|فاكهه|ثمار|الخمر|اكواب|سرر|فرش|ظل|الولدان|حرير) /,
  nar: / (النار|جهنم|عذاب|العذاب|الحميم|سعير|لهب|عقاب|الزقوم|الجحيم) /,
  nature: / (ماء|الماء|مطر|المطر|ريح|الرياح|سحاب|جبال|الجبال|الارض|السماء|نجوم|النجوم|الشمس|القمر|الليل|النهار|البحر|شجر|الشجر|نبات|النبات|زرع|الزرع|نخل|حب) /,
  story: / (موسي|فرعون|ابراهيم|نوح|هود|صالح|لوط|يوسف|سليمان|داود|عيسي|مريم|اسرائيل|ثمود|عاد|مدين|شعيب|زكريا|يحيي|يونس|ايوب|ذي القرنين|اصحاب) /,
  animal: / (ناقه|الناقه|ابل|الابل|خيل|الخيل|طير|الطير|بقر|البقره|غنم|كلب|الكلب|نمل|حوت|الحوت|انعام|الانعام|بعير) /,
  people: / (الكفار|الكافرين|المشركين|المنافقين|المؤمنين|المومنين|الناس|قوم|قومه|اليهود|النصاري|اهل الكتاب) /,
  speech: / (قول|القول|كلام|الكلام|القران|الوحي|كتاب|الكتاب|ايات|الايات|حجه|برهان|علم|العلم) /,
  war: / (قتال|القتال|حرب|الحرب|جيش|الجيش|جند|الجنود|سلاح|سيف|اسري|غنيمه|الغنائم) /
};
function topics(e) {
  const nm = x => String(x).replace(/[\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g, '').replace(/[ٱأإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/[^\u0621-\u064A ]/g, ' ');
  const t = ' ' + nm(e.mean) + ' ' + nm(e.head) + ' ', out = [];
  for (const k in TOPICS) if (TOPICS[k].test(t)) out.push(k);
  return out;
}

const rows = JSON.parse(fs.readFileSync(FILE, 'utf8')).map(r => r.slice(0, 4));
const review = fs.existsSync(REVIEW) ? JSON.parse(fs.readFileSync(REVIEW, 'utf8')) : { bad: [], drop: [] };
const bad = new Set((review.bad || []).map(p => len(p[0]) + '|' + len(p[1])));
const ALL = rows.map((r, i) => { const e = feat({ s: r[0], a: r[1], head: r[2], mean: r[3], i: i }); e.t = topics(e); return e; });
// near-synonyms, learnt from the book itself: a head word is linked to the words of its meaning, and the words of one
// meaning to each other («يحفظكم، ويحرسكم»). A wrong answer sharing such a link with the right one is too close to offer.
const LINK = new Map();
const link = (p, q) => { if (p === q) return; (LINK.get(p) || LINK.set(p, new Set()).get(p)).add(q); (LINK.get(q) || LINK.set(q, new Set()).get(q)).add(p); };
ALL.forEach(e => {
  const hs = BARE(e.head).split(' ').filter(x => x.length > 2).map(x => stems(x)[stems(x).length - 1]), ms = e.f.mwords.map(v => v[v.length - 1]);
  hs.forEach(h => ms.forEach(m => link(h, m)));
  ms.forEach((m, i) => ms.slice(i + 1).forEach(n => link(m, n)));
});
function nearSyn(e, x) {
  return e.f.mwords.some(w => { const L = LINK.get(w[w.length - 1]); return L && x.f.mwords.some(v => L.has(v[v.length - 1])); });
}
const K = 6;
let noTopic = 0;
ALL.forEach(e => {
  const scored = [];
  for (const x of ALL) {
    if (!distinct(e, x) || nearSyn(e, x) || bad.has(e.f.key + '|' + x.f.mk)) continue;
    let sc = likeness(e, x);
    if (e.t.length && x.t.length) sc += e.t.some(t => x.t.indexOf(t) >= 0) ? 25 : -5;   // same topic
    scored.push([sc, x]);
  }
  scored.sort((p, q) => q[0] - p[0]);
  const pick = [];
  for (const [, x] of scored) {
    if (pick.length >= K) break;
    if (pick.some(y => !distinct(y, x))) continue;                                         // the wrong answers differ from each other too
    pick.push(x);
  }
  if (!e.t.length) noTopic++;
  rows[e.i][4] = pick.map(x => x.i);
});
const drop = new Set((review.drop || []).map(len));
rows.forEach((r, i) => { if (drop.has(len(r[2]))) r[4] = []; });                          // never asked (kept as wrong answers)
fs.writeFileSync(FILE, JSON.stringify(rows));
console.log('choices for', rows.length, 'words;', noTopic, 'without a topic;', bad.size, 'pairs and', drop.size, 'words set aside by review');
