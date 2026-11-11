"""Build a left-to-right language home page (<lang>/index.html) from the Arabic source page.

The Arabic page (index.html) is the reference: same sections, same order, same base CSS,
same Arabic verse texts. Each language supplies its strings in content_<lang>.py (dict L).

Usage: python3 build_lang.py en fr es ru
"""
import re, json, sys, pathlib, importlib

REPO = pathlib.Path(__file__).resolve().parent.parent
ALL_LANGS = [('ar', '/', 'عربي'), ('en', '/en/', 'EN'), ('ur', '/ur/', 'اردو'),
             ('fr', '/fr/', 'FR'), ('es', '/es/', 'ES'), ('ru', '/ru/', 'RU')]

ar = (REPO / 'index.html').read_text(encoding='utf-8')
BASE_CSS = re.search(r'<style>(.*?)</style>', ar, re.S).group(1)
BASE_CSS = re.sub(r'\n  /\* البطاقات.*?\*/\n', '\n', BASE_CSS, flags=re.S)
SRC_JS = re.search(r'const ayahData = (\{.*?\n  \});', ar, re.S).group(1)
SURAH_AR = re.search(r'const surahNames = (\[.*?\]);', ar).group(1)

def ar_field(key, field):
    block = re.search(r'\n    ' + key + r': \{(.*?)\n    \}', SRC_JS, re.S).group(1)
    return json.loads(re.search(field + r': (".*?[^\\]")(?:[,\n]|$)', block, re.S).group(1))

# Arabic verse texts shown on the page (identical in every language)
AR = dict(
    hero='مُصَدِّقًا لِمَا بَيْنَ يَدَيْهِ مِنَ الْكِتَابِ وَمُهَيْمِنًا عَلَيْهِ',
    torah='فِيهَا هُدًى وَنُورٌ',
    injil='فِيهِ هُدًى وَنُورٌ وَمُصَدِّقًا لِمَا بَيْنَ يَدَيْهِ مِنَ التَّوْرَاةِ',
    quran='مُصَدِّقًا لِمَا بَيْنَ يَدَيْهِ يَهْدِي إِلَى الْحَقِّ وَإِلَى طَرِيقٍ مُسْتَقِيمٍ',
    note='قُولُوا آمَنَّا بِاللَّهِ وَمَا أُنْزِلَ إِلَيْنَا وَمَا أُنْزِلَ إِلَى إِبْرَاهِيمَ وَإِسْمَاعِيلَ وَإِسْحَاقَ وَيَعْقُوبَ وَالْأَسْبَاطِ وَمَا أُوتِيَ مُوسَى وَعِيسَى وَمَا أُوتِيَ النَّبِيُّونَ مِنْ رَبِّهِمْ لَا نُفَرِّقُ بَيْنَ أَحَدٍ مِنْهُمْ وَنَحْنُ لَهُ مُسْلِمُونَ',
    closing='قُلْ لَا أَسْأَلُكُمْ عَلَيْهِ أَجْرًا إِنْ هُوَ إِلَّا ذِكْرَى لِلْعَالَمِينَ',
)

def css(L):
    return BASE_CSS + r"""
  /* ---------- LTR LANGUAGE OVERRIDES ---------- */
  body{ font-family:BODY; line-height:1.7; }
  h1,h2,h3{ font-family:HEAD; font-weight:500; letter-spacing:-0.01em; }
  .nav-links{ font-size:0.85rem; letter-spacing:0.04em; }
  .lang-switch{ margin-inline-start:24px; }
  .brand-mark{ font-family:HEAD; font-weight:500; font-size:clamp(2.4rem,7vw,4.6rem); letter-spacing:-0.01em; }
  .brand-mark em{ font-style:italic; }
  .brand-sub{ font-size:0.78rem; letter-spacing:0.18em; text-transform:uppercase; margin-bottom:22px; }
  .ayah-arabic{ direction:rtl; }
  .ayah-translation{ font-family:HEAD; font-style:italic; font-weight:300; font-size:clamp(1rem,1.8vw,1.25rem); color:var(--cream); max-width:640px; margin-bottom:12px; opacity:0; animation:fadeUp 1s 1.4s ease-out forwards; }
  .ayah-ref{ letter-spacing:0.08em; animation-delay:1.8s; }
  .eyebrow{ font-size:0.78rem; letter-spacing:0.14em; text-transform:uppercase; font-weight:600; }
  .section-head h2{ font-weight:500; }
  .timeline-line{ background:linear-gradient(90deg, #C9BBA0 0%, #A9A691 33%, var(--gold) 66%, var(--gold) 100%); }
  .t-name{ font-family:HEAD; font-weight:600; }
  .t-quote{ direction:rtl; }
  .t-quote-tr{ font-family:HEAD; font-style:italic; font-size:0.98rem; color:#4a463c; line-height:1.6; margin-bottom:10px; max-width:290px; }
  .t-node:nth-child(3) .t-quote-tr{ color:#7a6f4e; }
  .timeline-note{ direction:rtl; }
  .timeline-note-tr{ display:block; direction:ltr; font-family:HEAD; font-style:italic; font-size:1rem; line-height:1.7; color:#4a463c; margin-top:12px; }
  .timeline-note-ref{ font-family:BODY; }
  .figure-card{ flex-basis:270px; }
  .figure-name{ font-family:HEAD; font-size:1.2rem; line-height:1.35; }
  .modal-box{ max-height:88vh; overflow-y:auto; }
  .modal-close{ left:auto; right:16px; }
  .modal-arabic{ direction:rtl; text-align:right; margin-bottom:12px; }
  .modal-translation{ font-family:HEAD; font-style:italic; font-size:1rem; line-height:1.7; color:#3b382f; margin-bottom:18px; }
  .modal-closing{ direction:rtl; margin-bottom:4px; }
  .modal-closing-tr{ font-family:HEAD; font-style:italic; font-size:0.95rem; color:#7a6f4e; text-align:center; margin-bottom:16px; }
  .modal-tree span{ font-family:BODY; font-size:0.85rem; }
  .modal-credit{ font-size:0.72rem; color:#8a836e; margin-top:12px; }
  .path-card h3{ font-weight:600; }
  .path-card .go svg{ transform:none; }
  .path-card:hover .go svg{ transform:translateX(4px); }
  .fact-num{ font-family:HEAD; font-weight:500; }
  .topic-cell .num{ font-family:BODY; }
  .topic-cell h3, .cta h2{ font-weight:600; }
  .reader-select, .reader-lang-btn{ font-family:BODY; }
  .reader-surah-title .en{ font-family:HEAD; font-style:italic; color:var(--cream); font-size:1.05rem; margin-bottom:4px; }
  .reader-verse-tr{ font-size:1.02rem; color:#c9c0ac; line-height:1.75; }
  .reader-verse-tr sup{ color:var(--gold-soft); font-size:0.7em; margin-left:1px; }
  .reader-fn{ margin-top:6px; }
  .reader-fn summary{ cursor:pointer; color:var(--gold-soft); font-size:0.75rem; letter-spacing:0.04em; list-style:none; display:inline-block; padding:2px 10px; border:1px solid rgba(200,155,60,0.3); border-radius:12px; }
  .reader-fn summary::-webkit-details-marker{ display:none; }
  .reader-fn p{ font-size:0.85rem; color:#9d9580; line-height:1.7; margin-top:8px; white-space:pre-line; }
  .reader-credit{ font-size:0.78rem; color:#8f8775; margin-top:8px; }
  .reader-credit a{ color:var(--gold-soft); }
""".replace('BODY', L['body_font']).replace('HEAD', L['head_font']) + L.get('extra_css', '')

ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M13 6l6 6-6 6"/></svg>'
STAR = '<path d="M50 5 L58 35 L90 35 L64 54 L74 85 L50 66 L26 85 L36 54 L10 35 L42 35 Z"/>'

def lang_switch(cur):
    return '\n'.join(f'      <a href="{p}"{" class=\"active\"" if l == cur else ""}>{n}</a>' for l, p, n in ALL_LANGS)

def build(code):
    L = importlib.import_module('content_' + code).L
    path = f'/{code}/'
    head = f'''<!DOCTYPE html>
<html lang="{code}" dir="ltr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{L['title']}</title>
<meta name="description" content="{L['desc']}">
<link rel="canonical" href="https://ltestament.com{path}">
<meta name="theme-color" content="#101B33">
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" type="image/png" href="/favicon.png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<meta property="og:type" content="website">
<meta property="og:site_name" content="{L['site_name']}">
<meta property="og:locale" content="{L['locale']}">
<meta property="og:url" content="https://ltestament.com{path}">
<meta property="og:title" content="{L['title']}">
<meta property="og:description" content="{L['desc']}">
<meta property="og:image" content="https://ltestament.com/og-{code}.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{L['title']}">
<meta name="twitter:description" content="{L['desc']}">
<meta name="twitter:image" content="https://ltestament.com/og-{code}.jpg">
''' + ''.join(f'<link rel="alternate" hreflang="{l}" href="https://ltestament.com{p}">\n' for l, p, _ in ALL_LANGS) + f'''<link rel="alternate" hreflang="x-default" href="https://ltestament.com/">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="{L['fonts_url']}" rel="stylesheet">
<style>{css(L)}</style>
</head>'''

    nodes = ''
    for key, (name, sub, era, tr, desc) in zip(['torah', 'injil', 'quran'], L['nodes']):
        nodes += f'''        <div class="t-node" onclick="openModal('{key}')">
          <div class="t-dot"></div>
          <div class="t-name">{name}</div>
          <span class="t-subname">{sub}</span>
          <div class="t-era">{era}</div>
          <p class="t-quote">{AR[key]}</p>
          <p class="t-quote-tr">{tr}</p>
          <p class="t-desc">{desc}</p>
          <p class="t-hint">{L['hint']}</p>
        </div>
'''
    figs = '\n'.join(f'''      <div class="figure-card reveal" onclick="openModal('{k}')">
        <p class="figure-eyebrow">{e}</p>
        <p class="figure-name">{n}</p>
        <p class="figure-fact">{f}</p>
        <span class="figure-link">{L['fig_link']}</span>
      </div>''' for k, e, n, f in L['figures'])
    facts = '\n'.join(f'    <div class="reveal"><div class="fact-num">{n}</div><div class="fact-label">{t}</div></div>'
                      for n, t in zip(['3', '114', '25+', '40+'], L['facts']))
    nav = L['nav']
    body = f'''
<body>

<div class="dev-banner">{L['banner']}</div>

<nav>
  <div class="logo">
    <svg viewBox="0 0 24 24" fill="none" stroke="#C89B3C" stroke-width="1.3"><path d="M12 2 L14 10 L22 12 L14 14 L12 22 L10 14 L2 12 L10 10 Z"/></svg>
  </div>
  <div class="nav-links">
    <a href="#timeline">{nav[0]}</a>
    <a href="#paths">{nav[1]}</a>
    <a href="#talk">{nav[2]}</a>
    <span class="lang-switch">
{lang_switch(code)}
    </span>
  </div>
</nav>

<section class="hero">
  <div class="stars"></div>
  <div class="glow"></div>
  <div class="glow-verse"></div>
  <svg class="star-motif" viewBox="0 0 100 100" fill="none" stroke="#C89B3C" stroke-width="1">
    {STAR}
  </svg>
  <p class="brand-mark">{L['brand_mark']}</p>
  <p class="brand-sub">{L['brand_sub']}</p>
  <div class="hero-flourish"><span class="fl-line left"></span><span class="fl-dot"></span><span class="fl-line right"></span></div>
  <p class="ayah-arabic">{AR['hero']}</p>
  <p class="ayah-translation">{L['hero_tr']}</p>
  <p class="ayah-ref">{L['hero_ref']}</p>
  <div class="scroll-cue"><span class="line"></span>{L['scroll']}</div>
</section>

<div class="divider">
  <svg viewBox="0 0 100 100" fill="none" stroke="#3E7C74" stroke-width="1.2">{STAR}</svg>
</div>

<section class="timeline" id="timeline">
  <div class="section-inner">
    <div class="section-head reveal">
      <p class="eyebrow">{L['tl_eyebrow']}</p>
      <h2>{L['tl_h2']}</h2>
      <p>{L['tl_p']}</p>
    </div>
    <div class="timeline-track reveal">
      <div class="timeline-line"></div>
      <div class="timeline-nodes">
{nodes}      </div>
    </div>
    <p class="timeline-note-title reveal">{L['note_title']}</p>
    <p class="timeline-note reveal">
      {AR['note']}
      <span class="timeline-note-tr">{L['note_tr']}</span>
      <span class="timeline-note-ref">{L['note_ref']}</span>
    </p>
  </div>
</section>

<section class="paths" id="paths">
  <div class="section-inner">
    <div class="section-head reveal">
      <p class="eyebrow">{L['paths_eyebrow']}</p>
      <h2>{L['paths_h2']}</h2>
      <p>{L['paths_p']}</p>
    </div>
    <div class="paths-grid">
      <div class="path-card featured reveal">
        <span class="path-tag">{L['c1_tag']}</span>
        <h3>{L['c1_h3']}</h3>
        <p>{L['c1_p']}</p>
        <a class="go" href="#" onclick="openReader(); return false;">{L['c1_link']} {ARROW}</a>
      </div>
      <div class="path-card reveal">
        <span class="path-tag">{L['c2_tag']}</span>
        <h3>{L['c2_h3']}</h3>
        <p>{L['c2_p']}</p>
        <a class="go" href="#talk">{L['c2_link']} {ARROW}</a>
      </div>
    </div>
  </div>
</section>

<section class="facts">
  <div class="facts-grid">
{facts}
  </div>
</section>

<section class="figures" id="figures">
  <div class="section-inner">
    <div class="section-head reveal">
      <p class="eyebrow">{L['fig_eyebrow']}</p>
      <h2>{L['fig_h2']}</h2>
      <p>{L['fig_p']}</p>
    </div>
    <div class="figures-scroll">
{figs}
    </div>
  </div>
</section>

<!-- Hidden until the topics are ready: remove "hidden" to show it -->
<section class="topics" id="topics" hidden>
  <div class="section-inner">
    <div class="section-head reveal">
      <h2>{L['topics_h2']}</h2>
    </div>
    <div class="topics-grid">
    </div>
  </div>
</section>

<section class="cta" id="talk">
  <div class="reveal">
    <div class="cta-buttons">
      <a href="#" class="btn btn-primary">{L['cta_ask']}</a>
      <a href="#" class="btn btn-outline" onclick="openReader(); return false;">{L['cta_browse']}</a>
    </div>
  </div>
</section>

<div class="modal-overlay" id="modalOverlay" onclick="if(event.target===this) closeModal()">
  <div class="modal-box">
    <div class="modal-close" onclick="closeModal()">×</div>
    <p class="modal-eyebrow" id="modalEyebrow"></p>
    <p class="modal-arabic" id="modalArabic"></p>
    <p class="modal-translation" id="modalTranslation"></p>
    <p class="modal-closing" id="modalClosing" style="display:none;"></p>
    <p class="modal-closing-tr" id="modalClosingTr" style="display:none;"></p>
    <p class="modal-tree-label" id="modalTreeLabel" style="display:none;"></p>
    <div class="modal-tree" id="modalTree"></div>
    <p class="modal-ref" id="modalRef"></p>
    <p class="modal-note" id="modalNote"></p>
    <p class="modal-credit">{L['modal_credit']}</p>
  </div>
</div>

<div class="reader-overlay" id="readerOverlay">
  <div class="reader-header">
    <div class="reader-close" onclick="closeReader()">×</div>
    <select class="reader-select" id="surahSelect" onchange="loadSurah()"></select>
    <div class="reader-lang-toggle">
      <button class="reader-lang-btn" id="btnAr" onclick="setLang('ar')">{L['btn_ar']}</button>
      <button class="reader-lang-btn" id="btnTr" onclick="setLang('tr')">{L['btn_tr']}</button>
      <button class="reader-lang-btn active" id="btnBoth" onclick="setLang('both')">{L['btn_both']}</button>
    </div>
  </div>
  <div class="reader-body" id="readerBody">
    <div class="reader-loading">{L['loading']}</div>
  </div>
</div>

<footer>
  <span>{L['footer']}</span>
</footer>
'''
    ayah = {}
    for k, d in L['ayah'].items():
        d = dict(d)
        d['arabic'] = ar_field(k, 'arabic')
        if d.get('closingTr'):
            d['closing'] = AR['closing']
        ayah[k] = d
    assert set(ayah) == {'torah','injil','quran','moses','jesus','mary','abraham','david','solomon','patriarchs','muhammad'}
    assert len(L['surah_names']) == 114

    script = '''
<script>
  const ayahData = ''' + json.dumps(ayah, ensure_ascii=False, indent=2).replace('\n', '\n  ') + ''';

  function openModal(key){
    const d = ayahData[key];
    document.getElementById('modalEyebrow').textContent = d.eyebrow;
    document.getElementById('modalArabic').textContent = d.arabic;
    document.getElementById('modalTranslation').textContent = d.tr;
    document.getElementById('modalRef').textContent = d.ref;
    document.getElementById('modalNote').textContent = d.note;
    const closingEl = document.getElementById('modalClosing');
    const closingTrEl = document.getElementById('modalClosingTr');
    const treeLabelEl = document.getElementById('modalTreeLabel');
    const treeEl = document.getElementById('modalTree');
    treeEl.innerHTML = '';
    closingEl.style.display = d.closing ? 'block' : 'none';
    closingTrEl.style.display = d.closingTr ? 'block' : 'none';
    if(d.closing) closingEl.textContent = d.closing;
    if(d.closingTr) closingTrEl.textContent = d.closingTr;
    if(d.tree){
      treeLabelEl.textContent = d.treeLabel;
      treeLabelEl.style.display = 'block';
      d.tree.forEach(name=>{ const s = document.createElement('span'); s.textContent = name; treeEl.appendChild(s); });
    } else { treeLabelEl.style.display = 'none'; }
    document.getElementById('modalOverlay').classList.add('open');
  }
  function closeModal(){ document.getElementById('modalOverlay').classList.remove('open'); }
  document.addEventListener('keydown', (e)=>{ if(e.key==='Escape') closeModal(); });

  // ---------- QURAN READER ----------
  // Arabic text: Uthmani (Hafs) via fawazahmed0/quran-api, with QuranEnc's Arabic text as a fallback.
  // Translation of the meanings: QuranEnc.com (reviewed translations), fetched per surah.
  const READER = ''' + json.dumps(dict(arabicEdition='ara-quranuthmanihaf', translationKey=L['reader_key'], credit=L['reader_credit']), ensure_ascii=False) + ''';
  const UI = ''' + json.dumps(dict(loading=L['loading'], surah=L['surah_word'], verses=L['verses_word'], note=L['note_word'], error=L['reader_error']), ensure_ascii=False) + ''';
  const surahNames = ''' + SURAH_AR + ''';
  const surahNamesTr = ''' + json.dumps(L['surah_names'], ensure_ascii=False) + ''';
  let currentLang = 'both';
  let currentSurah = 1;

  const esc = (t)=> String(t||'').replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const fnMarks = (t)=> esc(t).replace(/^\\s*\\d+\\.\\s+/, '').replace(/\\[(\\d+)\\]/g, '<sup>$1</sup>');
  const trUrl = (s)=> `https://quranenc.com/api/v1/translation/sura/${READER.translationKey}/${s}`;

  function fetchWithTimeout(url, ms=12000){
    const controller = new AbortController();
    const timer = setTimeout(()=>controller.abort(), ms);
    return fetch(url, {signal: controller.signal}).then(r=>{
      if(!r.ok) throw new Error('HTTP '+r.status);
      return r.json();
    }).finally(()=>clearTimeout(timer));
  }
  async function fetchArabic(s){
    try{
      const d = await fetchWithTimeout(`https://cdn.jsdelivr.net/gh/fawazahmed0/quran-api@1/editions/${READER.arabicEdition}/${s}.json`);
      return d.chapter.map(v=>v.text);
    }catch(e){
      const d = await fetchWithTimeout(trUrl(s));
      return [...d.result].sort((a,b)=>a.aya-b.aya).map(v=>v.arabic_text);
    }
  }

  function populateSurahSelect(){
    const sel = document.getElementById('surahSelect');
    sel.innerHTML = surahNamesTr.map((name,i)=>`<option value="${i+1}">${i+1}. ${name} · ${surahNames[i]}</option>`).join('');
  }
  function openReader(){
    if(document.getElementById('surahSelect').options.length === 0) populateSurahSelect();
    document.getElementById('readerOverlay').classList.add('open');
    document.body.style.overflow = 'hidden';
    if(!document.getElementById('readerBody').dataset.loaded) loadSurah();
  }
  function closeReader(){
    document.getElementById('readerOverlay').classList.remove('open');
    document.body.style.overflow = '';
  }
  function setLang(lang){
    currentLang = lang;
    document.getElementById('btnAr').classList.toggle('active', lang==='ar');
    document.getElementById('btnTr').classList.toggle('active', lang==='tr');
    document.getElementById('btnBoth').classList.toggle('active', lang==='both');
    loadSurah();
  }

  async function loadSurah(){
    const sel = document.getElementById('surahSelect');
    currentSurah = sel.value || 1;
    const body = document.getElementById('readerBody');
    body.dataset.loaded = '1';
    body.innerHTML = `<div class="reader-loading">${UI.loading}</div>`;
    try{
      const needsAr = currentLang === 'ar' || currentLang === 'both';
      const needsTr = currentLang === 'tr' || currentLang === 'both';
      const [arAyahs, trData] = await Promise.all([
        needsAr ? fetchArabic(currentSurah) : null,
        needsTr ? fetchWithTimeout(trUrl(currentSurah)) : null
      ]);
      const trAyahs = trData ? [...trData.result].sort((a,b)=>a.aya-b.aya) : null;
      const count = (arAyahs || trAyahs).length;
      let html = `<div class="reader-surah-title"><h3>${surahNames[currentSurah-1]}</h3><p class="en">${surahNamesTr[currentSurah-1]}</p><p>${UI.surah} ${currentSurah} — ${count} ${UI.verses}</p>`;
      if(trAyahs) html += `<p class="reader-credit">${READER.credit}</p>`;
      html += `</div>`;
      for(let i=0;i<count;i++){
        html += `<div class="reader-verse"><span class="reader-verse-num">${i+1}</span>`;
        if(arAyahs) html += `<p class="reader-verse-ar">${arAyahs[i]}</p>`;
        if(trAyahs){
          html += `<p class="reader-verse-tr">${fnMarks(trAyahs[i].translation)}</p>`;
          if(trAyahs[i].footnotes) html += `<details class="reader-fn"><summary>${UI.note}</summary><p>${fnMarks(trAyahs[i].footnotes)}</p></details>`;
        }
        html += `</div>`;
      }
      body.innerHTML = html;
    }catch(err){
      body.innerHTML = `<div class="reader-error">${UI.error}</div>`;
    }
  }
  document.addEventListener('keydown', (e)=>{ if(e.key==='Escape') closeReader(); });

  const io = new IntersectionObserver((entries)=>{
    entries.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } });
  }, {threshold:0.15});
  document.querySelectorAll('.reveal').forEach(el=>io.observe(el));
</script>

</body>
</html>
'''
    out = REPO / code / 'index.html'
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(head + body + script, encoding='utf-8')
    sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
    import feedback_hooks
    if code in feedback_hooks.LABELS:
        feedback_hooks.apply(out, code)
    print('built', out)

if __name__ == '__main__':
    sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
    for c in sys.argv[1:]:
        build(c)
