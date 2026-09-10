#!/usr/bin/env python3
"""Tiny Markdown generator for chinmaykabi.com.

content/articles/*.md (frontmatter + body) -> articles/<slug>/index.html
+ regenerates index.html (home) and articles/index.html.
Run: python3 build.py
"""
import html
import json
import re
from pathlib import Path

import markdown

ROOT = Path(__file__).parent
CONTENT = ROOT / "content" / "articles"

WP_INTEREST = [
    {"name": "wp_pivot_flutter", "stars": 17,
     "desc": "Windows Phone–style Pivot tab bar and WP8.1 UI primitives for Flutter — typography, motion, and controls measured from the real OS.",
     "repo": "https://github.com/Chinmay-KB/wp_pivot_flutter"},
    {"name": "metrophone", "stars": 0,
     "desc": "Android launcher scaffold with a WP8.1 Start screen — tiles, app list, and alphabet jump built on wp_pivot_flutter.",
     "repo": "https://github.com/Chinmay-KB/metrophone"},
    {"name": "glance", "stars": 0,
     "desc": "Python WinUSB client for mirroring and recording a Windows Phone 8.1 screen over USB — a modern take on Microsoft’s projection stack.",
     "repo": "https://github.com/Chinmay-KB/glance"},
]

PROJECTS = [
    {"name": "translations_cleaner", "stars": 6,
     "desc": "Dart package that prunes unused translations from .arb files.",
     "repo": "https://github.com/Chinmay-KB/translations_cleaner",
     "motif": '<div class="strike-spec" aria-hidden="true">welcome_title ✓<br><del>old_promo_banner</del> ✗<br><del>unused_cta_v2</del> ✗</div>'},
    {"name": "stringr", "stars": 6,
     "desc": "String manipulation library for Dart and Flutter, on steroids.",
     "repo": "https://github.com/Chinmay-KB/stringr",
     "motif": '<div class="code-morph" aria-hidden="true">"  padded  ".trim() → <b>"padded"</b></div>'},
    {"name": "Daydream", "stars": 1,
     "desc": "Menu-bar app that lays a screensaver overlay over the MacBook display.",
     "repo": "https://github.com/Chinmay-KB/Daydream",
     "motif": '<div class="night-bar" aria-hidden="true"><span>daydreaming…</span><span><i>●</i> 02:47</span></div>'},
]

WP_X_POSTS_PATH = ROOT / "content" / "wp-x-posts.json"

IFX_BUILT_Y = {
    "repo": "https://github.com/Chinmay-KB/ifXBuiltY",
    "site": "https://xbuildsy.com",
    "stars": 1,
    "card": "https://github.com/Chinmay-KB/ifXBuiltY/raw/main/public/card-smol.png",
    "desc": ("A playful image generator for the thought experiment “what if X built Y?” — "
             "blend one product’s visual language with another’s shape into shareable fake screenshots."),
    "stack": "Next.js · Supabase · TypeScript",
    "license": "MIT licensed",
}

CONTACTS = [
    ("Email", "mailto:chinmaykabi@live.com", "chinmaykabi@live.com"),
    ("LinkedIn", "https://linkedin.com/in/chinmaykabi", "in/chinmaykabi"),
    ("GitHub", "https://github.com/Chinmay-KB", "@Chinmay-KB"),
    ("X", "https://twitter.com/chinmaykb", "@chinmaykb"),
    ("dev.to", "https://dev.to/chinmaykb", "@chinmaykb"),
]

INTRO = ("Production-focused Flutter engineer with 5+ years building rendering "
         "systems, monetization infrastructure, and cross-platform products.")

JOBS = [
    ("Blend · Software Development Engineer II", "Oct 2022 – Present", [
        "Migrated export rendering to client-side Flutter, cutting latency from ~5–6s to under 2s.",
        "Designed real-time client systems for chat, generation queues, and AI-assisted workflows using REST, Server-Sent Events, and WebSockets.",
        "Architected monetization systems across credits, subscriptions, and entitlement flows.",
        'Built <a href="https://blendnow.com" rel="noopener noreferrer">blendnow.com</a> from the ground up, bringing feature parity to the existing app.',
    ]),
    ("Kreate · Mobile Application Developer", "Sep 2021 – Oct 2022", [
        "Led Flutter app delivery across Android, iOS, and web for buyer and seller journeys.",
        "Built reusable internal packages for APIs and business logic used across projects.",
        "Partnered with backend teams on system design and delivery planning.",
    ]),
    ("PuStack · SDE I", "Jul 2021 – Sep 2021", [
        "Built text and video chat experiences in Flutter with Firebase and Agora.",
        "Implemented cross-platform call notifications using FCM and Pushy.",
        "Prototyped an online classroom experience for real-time collaboration.",
    ]),
]


def clean(s):
    """Strip surrounding quotes and unescape JSON-style escapes from frontmatter values."""
    s = (s or "").strip()
    if len(s) >= 2 and s[0] == '"' and s[-1] == '"':
        s = s[1:-1]
    return s.replace('\\"', '"').replace("\\\\", "\\")


def parse_frontmatter(text):
    m = re.match(r"^---\n(.*?)\n---\n(.*)$", text, re.DOTALL)
    meta, body = {}, text
    if m:
        meta, body = {}, m.group(2)
        for line in m.group(1).splitlines():
            k, _, v = line.partition(":")
            meta[k.strip()] = v.strip()
    return meta, body


def liquid_to_html(body):
    def yt(m):
        vid = m.group(1).strip()
        return (f'<div class="embed"><iframe src="https://www.youtube-nocookie.com/embed/{vid}" '
                f'title="Embedded video" loading="lazy" '
                f'allow="accelerometer; encrypted-media; picture-in-picture" '
                f'allowfullscreen></iframe></div>')
    body = re.sub(r"{%\s*youtube\s+([A-Za-z0-9_-]+)\s*%}", yt, body)

    def tw(m):
        tid = m.group(1).strip()
        return (f'<blockquote class="embed-note"><p>A tweet referenced in the original post — '
                f'<a href="https://twitter.com/i/status/{tid}" rel="noopener noreferrer">'
                f'view it on X</a>.</p></blockquote>')
    body = re.sub(r"{%\s*twitter\s+(\d+)\s*%}", tw, body)
    return body


def md_to_html(body):
    body = liquid_to_html(body)
    out = markdown.markdown(body, extensions=["fenced_code", "tables"])
    out = out.replace("<img ", '<img loading="lazy" ')
    return out


HEAD = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="{desc}">
<title>{title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Archivo+Black&family=Bitter:ital,wght@0,400;0,500;0,600;0,700;1,400&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="{root}styles.css">
<noscript><style>.reveal{{opacity:1 !important;transform:none !important}}.panorama h1 .paint{{transform:none !important;animation:none !important}}</style></noscript>
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%23B23716'/%3E%3Ctext x='16' y='23' font-family='monospace' font-size='18' font-weight='bold' text-anchor='middle' fill='%23F4EEE1'%3EC%3C/text%3E%3C/svg%3E">
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<div class="glow" aria-hidden="true"></div>
"""

STATUSBAR = ""

FOOTER = """<footer class="footer">
  <p>Chinmay Kabi</p>
  <p><a href="#top" data-magnet>Back to top ↑</a></p>
</footer>
<script src="{root}app.js" defer></script>
</body>
</html>
"""


def status_links():
    return "".join(
        f'<a href="{href}" data-magnet rel="noopener noreferrer">{name}</a>'
        for name, href, _ in CONTACTS)


def load_articles():
    arts = []
    for path in sorted(CONTENT.glob("*.md")):
        meta, body = parse_frontmatter(path.read_text())
        title = clean(meta.get("title", path.stem))
        try:
            tags = eval(meta.get("tags", "[]"))
        except Exception:
            tags = []
        if isinstance(tags, str):  # dev.to detail API returns a comma string
            tags = [t.strip().lstrip("#") for t in tags.split(",") if t.strip()]
        arts.append({
            "slug": path.stem,
            "title": title,
            "date": meta.get("date", ""),
            "tags": tags,
            "canonical": meta.get("canonical", ""),
            "cover": (meta.get("cover", "") or "").strip(),
            "description": clean(meta.get("description", "") or ""),
            "html": md_to_html(body),
        })
    arts.sort(key=lambda a: a["date"], reverse=True)
    return arts


def ledger_row(a):
    tags = " ".join(f"#{t}" for t in a["tags"][:4])
    return f"""<a class="ledger-row" href="articles/{a['slug']}/" data-magnet>
    <span class="l-title">{html.escape(a['title'])} <span class="leader" aria-hidden="true">· · ·</span></span>
    <time datetime="{a['date']}">{a['date']}</time>
    <span class="l-meta">{tags}</span>
    <span class="l-arrow" aria-hidden="true">→</span>
  </a>"""


def tool_card(p):
    cls = "tool featured" if p.get("featured") else "tool"
    return f"""<a class="{cls}" href="{p['repo']}" rel="noopener noreferrer">
  <span class="tool-inner">
    <span class="tool-top"><strong>{p['name']}</strong><span class="stars" title="{p['stars']} stars">★ {p['stars']}</span></span>
    <span class="tool-desc">{p['desc']}</span>
    {p.get('motif', '')}
    <span class="tool-link">github.com/Chinmay-KB/{p['name']} ↗</span>
  </span>
</a>"""


def build_previous_home(arts):
    newest = arts[0]
    ledger = "\n".join(ledger_row(a) for a in arts)
    tools = "\n".join(tool_card(p) for p in PROJECTS)
    jobs = "\n".join(
        f"""<article class="job">
  <time>{d}</time>
  <div><h3>{t}</h3>
  <ul>{"".join(f'<li>{li}</li>' for li in lis)}</ul></div>
</article>""" for t, d, lis in JOBS)
    socials = "\n".join(
        f'<li><a href="{href}" data-magnet rel="noopener noreferrer"><strong>{name}</strong><span>{label}</span></a></li>'
        for name, href, label in CONTACTS)
    socials += '\n<li><a href="docs/resume.pdf" data-magnet><strong>Resume</strong><span>pdf, one page</span></a></li>'

    return (HEAD.format(title="Chinmay Kabi — tinkerer’s wall",
                        desc="Chinmay Kabi: Flutter engineer, writer, master tinkerer. Projects, field notes, contact.",
                        root="")
            + STATUSBAR.format(links=status_links())
            + f"""<main class="wall" id="main">
  <section class="signage" id="top" aria-label="Intro">
    <div class="panorama"><h1><span class="paint">Chinmay Kabi</span><span class="gap" aria-hidden="true"></span><span class="paint rep" aria-hidden="true">Chinmay Kabi</span></h1></div>
    <div class="hero-grid">
      <p class="hero-claim reveal" data-reveal="rise">I build things with Flutter for a living and <em>break things for fun</em> — rendering engines, paywalls, screensavers, spam-hunting bots.</p>
      <aside class="marginalia">
        <p>{INTRO}</p>
        <p class="mono">currently: SDE II @ Blend · <span id="clock3">--:--</span> IST</p>
      </aside>
    </div>
    <nav class="indextabs reveal" data-reveal="rise" aria-label="Sections">
      <a href="#writing" data-magnet><b>01</b><u>Field notes</u></a><span class="slash" aria-hidden="true">/</span>
      <a href="#projects" data-magnet><b>02</b><u>Hung tools</u></a><span class="slash" aria-hidden="true">/</span>
      <a href="#about" data-magnet><b>03</b><u>Clocked in</u></a><span class="slash" aria-hidden="true">/</span>
      <a href="#contact" data-magnet><b>04</b><u>Yell at me</u></a>
    </nav>
  </section>

  <div class="flyer-wrap reveal" data-reveal="settle">
    <a class="flyer" href="articles/{newest['slug']}/" data-magnet>
      <p class="flyer-kicker">Fresh off the bench · {newest['date']}</p>
      <h2>{html.escape(newest['title'])}</h2>
      <p>{html.escape(newest['description'])}</p>
      <span class="read">Read it <span aria-hidden="true">→</span></span>
    </a>
  </div>

  <section id="writing" aria-labelledby="writing-h">
    <div class="section-head reveal" data-reveal="slide"><h2 id="writing-h">Field notes, 2020–22</h2><a href="articles/" data-magnet>All {len(arts)} pieces →</a></div>
    <p class="section-sub reveal" data-reveal="slide">Everything I posted on dev.to, moved home. Flutter, Firebase, and one bot war.</p>
    <div class="ledger">{ledger}</div>
  </section>

  <section id="projects" aria-labelledby="projects-h">
    <div class="section-head reveal" data-reveal="slide"><h2 id="projects-h">Hung up &amp; still humming</h2><a href="https://github.com/Chinmay-KB" rel="noopener noreferrer" data-magnet>133 repos →</a></div>
    <p class="section-sub reveal" data-reveal="slide">Side builds from 133 public repos. The big one gets the wide hook — it earned it.</p>
    <div class="pegboard">{tools}</div>
  </section>

  <section id="about" aria-labelledby="about-h">
    <div class="section-head reveal" data-reveal="slide"><h2 id="about-h">Where I've clocked in</h2></div>
    <div class="timeline">{jobs}</div>
  </section>

  <section id="contact" aria-labelledby="contact-h">
    <div class="section-head reveal" data-reveal="slide"><h2 id="contact-h">Yell at me</h2></div>
    <a class="giant-mail reveal" data-reveal="rise" href="mailto:chinmaykabi@live.com">chinmaykabi@live.com</a>
    <ul class="social-ledger">{socials}</ul>
    <p><button class="stampbtn" id="copyemail" data-email="chinmaykabi@live.com">Stamp this address</button>
    <span class="copied" id="copied" role="status" aria-live="polite"></span></p>
  </section>
</main>
""" + FOOTER.format(root=""))


def load_wp_x_posts():
    data = json.loads(WP_X_POSTS_PATH.read_text(encoding="utf-8"))
    return data["posts"]


def wp_post_text_html(text):
    return html.escape(text).replace("\n\n", "<br><br>").replace("\n", "<br>")


def wp_post_card(post):
    text = wp_post_text_html(post["text"])
    media = ""
    if post.get("media_label") and post.get("media_href"):
        media = (
            f'<br><a href="{html.escape(post["media_href"])}" rel="noopener noreferrer">'
            f'{html.escape(post["media_label"])}</a>'
        )
    return f"""<div class="wp-post">
  <blockquote class="twitter-tweet" data-dnt="true">
    <p lang="en" dir="ltr">{text}{media}</p>
    &mdash; {html.escape(post["author_name"])} ({html.escape(post["author_handle"])})
    <a href="{html.escape(post["url"])}" rel="noopener noreferrer">{html.escape(post["date_display"])}</a>
  </blockquote>
</div>"""


def wp_posts_html():
    cards = [wp_post_card(p) for p in load_wp_x_posts()]
    return "\n".join(cards)


def wp_interest_section():
    cards = []
    for p in WP_INTEREST:
        name = html.escape(p["name"])
        cards.append(f"""<article class="wp-repo">
  <a href="{p['repo']}" rel="noopener noreferrer"><h4>{name}</h4></a>
  <p>{html.escape(p['desc'])}</p>
  <p class="experiment-meta"><span class="stars" title="{p['stars']} stars on GitHub">★ {p['stars']}</span> · <a href="{p['repo']}" rel="noopener noreferrer">GitHub ↗</a></p>
</article>""")
    posts = wp_posts_html()
    section = f"""<section class="wp-lab" id="wp-lab" aria-labelledby="wp-lab-h">
  <h3 id="wp-lab-h">Windows Phone</h3>
  <p class="wp-lab-lede">I have a fascination with Windows Phone, and I work on these projects in my free time.</p>
  <div class="wp-repo-grid">{"".join(cards)}</div>
  <div class="wp-posts" aria-label="Posts about these projects">{posts}</div>
  <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>
</section>"""
    return section


def ifx_feature():
    return f"""<article class="ifx-spotlight" id="ifx">
  <div class="ifx-copy">
    <h3><a href="{IFX_BUILT_Y["site"]}" rel="noopener noreferrer">ifXBuiltY</a> <span class="stars" title="{IFX_BUILT_Y["stars"]} star on GitHub">★ {IFX_BUILT_Y["stars"]}</span></h3>
    <p>{html.escape(IFX_BUILT_Y["desc"])}</p>
    <div class="ifx-facts" aria-label="ifXBuiltY facts"><span>{html.escape(IFX_BUILT_Y["stack"])}</span><span>{html.escape(IFX_BUILT_Y["license"])}</span><span>shareable fake screenshots</span></div>
    <p class="ifx-meta"><a href="{IFX_BUILT_Y["repo"]}" rel="noopener noreferrer">source on GitHub ↗</a> <a href="{IFX_BUILT_Y["site"]}" rel="noopener noreferrer">try xbuildsy.com ↗</a></p>
  </div>
  <div class="ifx-stage">
    <img class="ifx-card" src="{IFX_BUILT_Y["card"]}" width="640" height="360" alt="ifXBuiltY banner: stylized phone frames and the xBuildsy mark" loading="lazy">
  </div>
</article>"""


def experiment_card(p):
    name = html.escape(p["name"])
    desc = html.escape(p["desc"])
    motif = p.get("motif", "")
    if p["name"] == "translations_cleaner":
        motif = """<button type="button" class="strike-spec" data-strike-toy aria-label="Tap to prune unused strings">
  welcome_title ✓<br><del>old_promo_banner</del> ✗<br><del>unused_cta_v2</del> ✗
</button>"""
    elif p["name"] == "stringr":
        motif = """<button type="button" class="code-morph" data-trim-toy aria-label="Tap to trim whitespace">
  <span data-trim-before>"&nbsp;&nbsp;padded&nbsp;&nbsp;"</span><span class="trim-arrow">.trim() →</span> <b data-trim-after>"padded"</b>
</button>"""
    elif p["name"] == "Daydream":
        motif = """<button type="button" class="night-bar" data-dream-toy aria-pressed="false" aria-label="Toggle daydream overlay">
  <span>daydreaming…</span><span><i>●</i> <span data-dream-time>02:47</span></span>
</button>"""
    stars = p.get("stars", 0)
    return f"""<article class="experiment">
  <a href="{p['repo']}" rel="noopener noreferrer"><h3>{name}</h3></a>
  <p>{desc}</p>
  <p class="experiment-meta"><span class="stars" title="{stars} stars on GitHub">★ {stars}</span> · <a href="{p['repo']}" rel="noopener noreferrer">GitHub ↗</a></p>
  {motif}
</article>"""


STACK_STRIP = """<div class="stack-strip is-orbit" aria-label="Stacks I reach for: Flutter, React, Next.js, TypeScript, Android, iOS">
  <a class="stack-logo" title="Flutter — filter my GitHub repos" aria-label="Flutter repos on GitHub" href="https://github.com/Chinmay-KB?tab=repositories&q=flutter" rel="noopener noreferrer" style="--i:0"><img src="assets/stack/flutter.svg" alt="Flutter" width="26" height="26" loading="lazy"></a>
  <a class="stack-logo" title="React — filter my GitHub repos" aria-label="React repos on GitHub" href="https://github.com/Chinmay-KB?tab=repositories&q=react" rel="noopener noreferrer" style="--i:1"><img src="assets/stack/react.svg" alt="React" width="26" height="26" loading="lazy"></a>
  <a class="stack-logo" title="Next.js — filter my GitHub repos" aria-label="Next.js repos on GitHub" href="https://github.com/Chinmay-KB?tab=repositories&q=next" rel="noopener noreferrer" style="--i:2"><img src="assets/stack/nextjs.svg" alt="Next.js" width="26" height="26" loading="lazy"></a>
  <a class="stack-logo" title="TypeScript — filter my GitHub repos" aria-label="TypeScript repos on GitHub" href="https://github.com/Chinmay-KB?tab=repositories&q=typescript" rel="noopener noreferrer" style="--i:3"><img src="assets/stack/typescript.svg" alt="TypeScript" width="26" height="26" loading="lazy"></a>
  <a class="stack-logo" title="Android — filter my GitHub repos" aria-label="Android repos on GitHub" href="https://github.com/Chinmay-KB?tab=repositories&q=android" rel="noopener noreferrer" style="--i:4"><img src="assets/stack/android.svg" alt="Android" width="26" height="26" loading="lazy"></a>
  <a class="stack-logo" title="iOS — filter my GitHub repos" aria-label="iOS repos on GitHub" href="https://github.com/Chinmay-KB?tab=repositories&q=ios" rel="noopener noreferrer" style="--i:5"><img src="assets/stack/ios.svg" alt="iOS" width="26" height="26" loading="lazy"></a>
</div>"""

ICON_LINKS = """<nav class="icon-links" aria-label="Personal links">
  <a class="icon-link" href="https://github.com/Chinmay-KB" rel="noopener noreferrer" aria-label="GitHub profile" title="GitHub"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2C6.48 2 2 6.58 2 12.26c0 4.52 2.87 8.35 6.84 9.7.5.1.68-.22.68-.48 0-.24-.01-.87-.01-1.7-2.78.62-3.37-1.36-3.37-1.36-.45-1.18-1.12-1.5-1.12-1.5-.92-.64.07-.63.07-.63 1.02.07 1.55 1.06 1.55 1.06.9 1.56 2.36 1.11 2.94.85.09-.67.35-1.11.64-1.37-2.22-.26-4.56-1.13-4.56-5.02 0-1.11.39-2.01 1.03-2.72-.1-.26-.45-1.32.1-2.74 0 0 .84-.27 2.75 1.04A9.3 9.3 0 0 1 12 6.84c.85 0 1.71.12 2.51.34 1.91-1.31 2.75-1.04 2.75-1.04.55 1.42.2 2.48.1 2.74.64.71 1.03 1.61 1.03 2.72 0 3.9-2.34 4.76-4.57 5.02.36.32.68.94.68 1.9 0 1.37-.01 2.47-.01 2.8 0 .27.18.59.69.49A10.03 10.03 0 0 0 22 12.26C22 6.58 17.52 2 12 2z"/></svg></a>
  <a class="icon-link" href="mailto:chinmaykabi@live.com" aria-label="Email chinmaykabi@live.com" title="Email"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4-8 5L4 8V6l8 5 8-5v2z"/></svg></a>
  <a class="icon-link" href="docs/resume.pdf" aria-label="Resume PDF" title="Resume"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm-1 2 5 5h-5V4zM8 13h8v2H8v-2zm0 4h5v2H8v-2z"/></svg></a>
</nav>"""


def build_home(arts):
    letters = lambda word: ''.join(f'<span>{letter}</span>' for letter in word)
    wp_section = wp_interest_section()
    projects = ifx_feature() + wp_section + "".join(experiment_card(p) for p in PROJECTS)
    writing = ''.join(
        f'<li><a href="articles/{a["slug"]}/">{html.escape(a["title"])}</a><time>{a["date"][:4]}</time></li>'
        for a in arts)
    doodles = STACK_STRIP
    bubbles = "".join(
        f'<button type="button" class="bubble b{i}" data-bubble aria-label="Pop bubble {i + 1}"></button>'
        for i in range(7))
    return HEAD.format(title="Chinmay Kabi", desc="Chinmay Kabi. Software, side projects, and writing.", root="") + f'''<link rel="stylesheet" href="play.css">
<noscript><style>.bubble{{display:none}}</style></noscript>
<main class="personal" id="main">
  <section class="hello" id="top">
    <div class="hello-grid" aria-hidden="true"></div>
    <div class="bubble-field" data-bubble-field aria-label="Pop the bubbles">{bubbles}</div>
    <div class="hello-doodles">{doodles}</div>
    <p class="hello-note">Hi, I'm</p>
    <h1 aria-label="Chinmay Kabi"><span class="name-line" aria-hidden="true">{letters('Chinmay')}</span><span class="name-line surname" aria-hidden="true">{letters('Kabi')}</span></h1>
    <button class="wiggle" type="button" aria-label="Make the letters dance">Again!</button>
    <div class="intro-copy"><p>unserious developer, serious tinkerer.</p><p class="ifx-hello"><a href="#ifx">if X built Y</a> — mashup generator at <a href="https://xbuildsy.com" rel="noopener noreferrer">xbuildsy.com</a>.</p><a href="#projects">Recent projects ↓</a></div>
    <button class="eyes" type="button" aria-label="Googly eyes — they follow your cursor"><span><i></i></span><span><i></i></span></button>
    {ICON_LINKS}
  </section>
   <section class="experiments" id="projects">
     <h2>Recent projects</h2>
     <p class="section-lede">A few small things I’ve made. The toys are just quick demos.</p>
    <div class="experiment-list">{projects}</div>
  </section>
  <section class="small-writing"><h2>I also used to write.</h2><p>These are my posts from dev.to, from 2020 to 2022.</p><ul>{writing}</ul><p><a href="articles/">All {len(arts)} articles →</a></p></section>
  <footer class="personal-footer"><p>Chinmay Kabi</p><a href="mailto:chinmaykabi@live.com">Say hello</a><a href="https://linkedin.com/in/chinmaykabi">LinkedIn</a><a href="#top">Back up ↑</a></footer>
</main><script src="play.js" defer></script></body></html>'''


def build_articles_index(arts):
    rows = "\n".join(
        f"""<a class="arow reveal" data-reveal="rise" href="{a['slug']}/" data-magnet>
  <time datetime="{a['date']}">{a['date']}</time>
  <div><h2>{html.escape(a['title'])}</h2>
  <span class="arow-tags">{' '.join('#'+t for t in a['tags'][:3])}</span></div>
</a>""" for a in arts)
    return (HEAD.format(title="Writing — Chinmay Kabi", desc="Every article by Chinmay Kabi, newest first.", root="../")
            + STATUSBAR.format(links=status_links())
            + f"""<main class="page narrow" id="main">
  <p class="crumb"><a href="../">← Home</a></p>
  <h1 class="pagetitle">Writing</h1>
  <p class="lede">My posts from dev.to.</p>
  <div class="arows">{rows}</div>
</main>
""" + FOOTER.format(root="../"))


def build_article(a, prev_a, next_a):
    nav = ""
    if prev_a or next_a:
        nav = '<nav class="pageturn" aria-label="More articles">'
        if prev_a:
            nav += f'<a href="../{prev_a["slug"]}/" data-magnet>← {html.escape(prev_a["title"][:48])}</a>'
        if next_a:
            nav += f'<a href="../{next_a["slug"]}/" data-magnet>{html.escape(next_a["title"][:48])} →</a>'
        nav += "</nav>"
    tags = " ".join(f"<span>#{t}</span>" for t in a["tags"])
    return (HEAD.format(title=html.escape(a["title"]) + " — Chinmay Kabi",
                        desc=a["description"] or a["title"], root="../../")
            + STATUSBAR.format(links=status_links())
            + f"""<div class="progress" aria-hidden="true"><span id="progress"></span></div>
<main class="page narrow" id="main">
  <p class="crumb"><a href="../../">Home</a> / <a href="../">Writing</a></p>
  <h1 class="pagetitle">{html.escape(a["title"])}</h1>
  <p class="bymeta"><time datetime="{a["date"]}">{a["date"]}</time> <span aria-hidden="true">·</span> {tags} <span aria-hidden="true">·</span> <a href="{a["canonical"]}" rel="noopener noreferrer">original on dev.to ↗</a></p>
  <article class="prose">{a["html"]}</article>
  {nav}
</main>
""" + FOOTER.format(root="../../"))


def main():
    arts = load_articles()
    print(f"{len(arts)} articles")
    (ROOT / "index.html").write_text(build_home(arts))
    idx = ROOT / "articles" / "index.html"
    idx.parent.mkdir(parents=True, exist_ok=True)
    idx.write_text(build_articles_index(arts))
    for i, a in enumerate(arts):
        d = ROOT / "articles" / a["slug"]
        d.mkdir(parents=True, exist_ok=True)
        prev_a = arts[i - 1] if i > 0 else None
        next_a = arts[i + 1] if i + 1 < len(arts) else None
        (d / "index.html").write_text(build_article(a, prev_a, next_a))
    print("built: index, articles index,", len(arts), "articles")


if __name__ == "__main__":
    main()
