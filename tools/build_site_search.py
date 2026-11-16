#!/usr/bin/env python3
"""Site-content search index — «العهد الأخير».

Reads every published page of each language and writes data/search/site-<lang>.json:
  {"i": [{"t": title, "s": small label, "x": text, "u": url}, ...]}
One item per thing a reader can land on:
  - each section of the home page (its heading, label and intro)          -> /<lang>/#<section id>
  - each card that opens a verse window (timeline books, figures), with
    the window's title, reference and note                                -> /<lang>/#m=<key>   (js/site.js opens it)
  - the "start here" cards                                                -> their own link
  - the other pages (ask, feedback, book): title + description            -> the page
Hidden sections (hidden attribute) are skipped, so unpublished content never shows up.
The Quran's own text is not indexed here: the Quran search covers it.

Run after changing any page:  python3 tools/build_site_search.py
"""
import json, re, subprocess, html
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LANGS = ['ar', 'en', 'ur', 'fr', 'es', 'ru']
VOID = {'br', 'img', 'input', 'meta', 'link', 'hr', 'source', 'path', 'circle', 'rect', 'line', 'polyline', 'polygon', 'area', 'wbr'}
SKIP = {'script', 'style', 'svg', 'noscript', 'template', 'select', 'button'}


class Node:
    def __init__(self, tag, attrs, parent):
        self.tag, self.a, self.parent, self.kids = tag, dict(attrs), parent, []
    def cls(self):
        return (self.a.get('class') or '').split()
    def text(self):
        out = []
        for k in self.kids:
            if isinstance(k, str): out.append(k)
            elif k.tag not in SKIP: out.append(' ' + k.text() + ' ')
        return re.sub(r'\s+', ' ', ''.join(out)).strip()
    def find(self, pred):
        for k in self.kids:
            if isinstance(k, Node):
                if pred(k): yield k
                yield from k.find(pred)
    def first(self, pred):
        return next(self.find(pred), None)
    def hidden(self):
        n = self
        while n:
            if 'hidden' in n.a: return True
            n = n.parent
        return False


class Tree(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.root = self.cur = Node('#root', {}, None)
    def handle_starttag(self, tag, attrs):
        n = Node(tag, attrs, self.cur); self.cur.kids.append(n)
        if tag not in VOID: self.cur = n
    def handle_startendtag(self, tag, attrs):
        self.cur.kids.append(Node(tag, attrs, self.cur))
    def handle_endtag(self, tag):
        n = self.cur
        while n is not self.root and n.tag != tag: n = n.parent
        if n is not self.root: self.cur = n.parent
    def handle_data(self, d):
        self.cur.kids.append(d)


def parse(p):
    t = Tree(); t.feed(p.read_text(encoding='utf-8')); return t.root


def modal_data(src):
    """The page's verse windows (const ayahData = {...}) — a JS object, read with node."""
    m = re.search(r'const ayahData\s*=\s*(\{.*?\n  \});', src, re.S)
    if not m: return {}
    out = subprocess.run(['node', '-e', 'process.stdout.write(JSON.stringify(' + m.group(1) + '))'],
                         capture_output=True, text=True, check=True).stdout
    return json.loads(out)


def has_cls(c):
    return lambda n: c in n.cls()


def build(lang):
    base = '/' if lang == 'ar' else f'/{lang}/'
    home = ROOT / ('index.html' if lang == 'ar' else f'{lang}/index.html')
    src = home.read_text(encoding='utf-8')
    root = parse(home)
    md = modal_data(src)
    items = []
    def add(t, s, x, u):
        t, s, x = (re.sub(r'\s+', ' ', v or '').strip() for v in (t, s, x))
        if not t: return
        same = next((i for i in items if i['u'] == u and i['t'] == t), None)   # one window opened from two places
        if same:
            if x not in same['x']: same['x'] = (same['x'] + ' ' + x).strip()
        else:
            items.append({'t': t, 's': s, 'x': x, 'u': u})

    for sec in root.find(lambda n: n.tag == 'section' and n.a.get('id')):
        if sec.hidden(): continue
        head = sec.first(has_cls('section-head'))
        if not head: continue
        h = head.first(lambda n: n.tag in ('h2', 'h3'))
        ey = head.first(has_cls('eyebrow'))
        ps = [p.text() for p in head.find(lambda n: n.tag == 'p' and 'eyebrow' not in n.cls())]
        add(h and h.text(), ey and ey.text(), ' '.join(ps), base + '#' + sec.a['id'])

    for card in root.find(lambda n: 'onclick' in n.a and 'openModal(' in n.a['onclick']):
        if card.hidden(): continue
        key = re.search(r"openModal\('(\w+)'\)", card.a['onclick']).group(1)
        d = md.get(key, {})
        label = card.first(lambda n: set(n.cls()) & {'t-name', 'figure-eyebrow'})
        rest = [n.text() for n in card.find(lambda n: set(n.cls()) & {'t-subname', 'figure-name', 'figure-fact', 't-desc'})]
        x = ' '.join(rest + [d.get('note', ''), d.get('treeLabel', ''), ' '.join(d.get('tree', []))])
        add(d.get('eyebrow') or (label and label.text()), d.get('ref', ''), x, base + '#m=' + key)

    for card in root.find(has_cls('path-card')):
        if card.hidden(): continue
        h = card.first(lambda n: n.tag == 'h3'); tag = card.first(has_cls('path-tag'))
        p = card.first(lambda n: n.tag == 'p')
        a = card.first(lambda n: n.tag == 'a' and 'go' in n.cls())
        href = a.a.get('href', '#') if a else '#'
        if href == '#': href = base + 'book/'   # "read the text" opens the reader = the book
        add(h and h.text(), tag and tag.text(), p and p.text(), href)

    for sub in ('book', 'ask', 'feedback', 'quiz'):
        p = ROOT / (f'{sub}/index.html' if lang == 'ar' else f'{lang}/{sub}/index.html')
        if not p.exists(): continue
        s = p.read_text(encoding='utf-8')
        t = re.search(r'<title>([^<]*)</title>', s)
        d = re.search(r'<meta name="description" content="([^"]*)"', s)
        title = html.unescape(t.group(1)).split(' — ')[0] if t else sub
        add(title, '', html.unescape(d.group(1)) if d else '', base + sub + '/')

    q = ROOT / f'data/search/site-{lang}.json'
    q.write_text(json.dumps({'i': items}, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    print(q.name, len(items), 'items', q.stat().st_size // 1024, 'KB')


if __name__ == '__main__':
    for l in LANGS: build(l)
