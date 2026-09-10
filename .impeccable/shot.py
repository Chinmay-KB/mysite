#!/usr/bin/env python3
"""Evidence captures (reduced-motion = settled layout) + interaction checks."""
from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:8321"
ART = "/articles/project-spampr-the-hero-that-tried-saving-hacktoberfest-20-1ddd/"

with sync_playwright() as p:
    b = p.chromium.launch(channel="chrome", headless=True)

    # 1. functional check: hover expands first drawer, no page errors
    ctx = b.new_context(viewport={"width": 1440, "height": 900})
    pg = ctx.new_page()
    errors = []
    pg.on("pageerror", lambda e: errors.append(str(e)))
    pg.goto(BASE, wait_until="networkidle")
    pg.wait_for_timeout(1500)
    head = pg.locator(".ledger-row").first
    op0 = pg.evaluate("getComputedStyle(document.querySelector('.l-arrow')).opacity")
    head.hover()
    pg.wait_for_timeout(600)
    op1 = pg.evaluate("getComputedStyle(document.querySelector('.l-arrow')).opacity")
    print("ledger arrow opacity rest/hover:", op0, op1)
    glow = pg.evaluate("getComputedStyle(document.querySelector('.glow')).opacity")
    print("glow opacity after mouse move:", glow)
    print("page errors:", errors if errors else "none")
    ctx.close()

    # 2. settled-layout evidence captures
    for url, w, h, out, mobile in [
        (BASE, 1440, 900, ".impeccable/review/desktop.png", False),
        (BASE, 390, 844, ".impeccable/review/mobile.png", True),
        (BASE + ART, 1440, 900, ".impeccable/review/article.png", False),
    ]:
        ctx = b.new_context(viewport={"width": w, "height": h}, is_mobile=mobile,
                            has_touch=mobile, reduced_motion="reduce")
        pg = ctx.new_page()
        pg.goto(url, wait_until="networkidle")
        pg.wait_for_timeout(1200)
        pg.screenshot(path=out, full_page=True)
        print("wrote", out)
        ctx.close()
    b.close()
