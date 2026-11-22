"""Check that every Mushaf page shows all its lines inside the frame, on phones, iPads and computers.
Serve the site (python3 -m http.server 8765 in the repo), then: python3 tools/tests/mushaf_fit.py
Prints the font size per page (two for a spread); !n = n lines outside the frame; FAIL pages must be 0."""
import asyncio, json, sys
from playwright.async_api import async_playwright
SIZES=[(375,812,0),(390,844,0),(430,932,0),(360,740,0),(768,1024,1),(820,1180,1),(1024,1366,1),(1180,820,1),(1366,1024,1),(1440,900,1),(1920,1080,1),(1280,720,1),(768,1024,0),(1440,900,0)]
PAGES=[1,2,3,50,187,293,442,585,600,604]
JS="""() => {
 const out=[]; document.querySelectorAll('.bk-page.bk-mpage').forEach(pg=>{ if(pg.offsetParent===null) return;
  const box=pg.querySelector('.bk-mushaf'); if(!box) return; const fr=box.parentNode.getBoundingClientRect();
  const page=pg.getBoundingClientRect(); let bad=0, n=0;
  box.querySelectorAll('.ml').forEach(l=>{ n++; const r=l.getBoundingClientRect(); if(r.top<fr.top-2||r.bottom>fr.bottom+2||r.left<fr.left-2||r.right>fr.right+2||r.bottom>page.bottom+1||r.top<page.top-1) bad++; });
  out.push({fs:parseFloat(box.style.fontSize).toFixed(1), n, bad, vis: fr.bottom<=innerHeight+1 && fr.top>=0});
 }); return out; }"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
        fails=0
        for w,h,wide in SIZES:
            ctx = await b.new_context(viewport={"width":w,"height":h}, is_mobile=w<600, has_touch=w<1100)
            pg = await ctx.new_page(); errs=[]; pg.on("pageerror", lambda e: errs.append(str(e)))
            row=[]
            for P in PAGES:
                await pg.goto(f"http://localhost:8765/book/index.html?wide={wide}&t={P}#p={P}", wait_until="networkidle")
                await pg.wait_for_timeout(1600)
                r = await pg.evaluate(JS)
                bad = sum(x['bad'] for x in r); fails += bad>0
                row.append(f"p{P}:" + "/".join(f"{x['fs']}{'!'+str(x['bad']) if x['bad'] else ''}{'' if x['vis'] else '~'}" for x in r))
            print(f"{w}x{h} wide={wide} err={len(errs)} :: " + "  ".join(row), flush=True)
            await ctx.close()
        print("FAIL pages:", fails)
        await b.close()
asyncio.run(main())
