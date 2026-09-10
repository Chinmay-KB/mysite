---
name: Tinkerer's Wall
description: Chinmay Kabi's personal site — Metro panorama crossed with a punk flyer wall.
colors:
  paper: "#F4EEE1"
  paper-deep: "#EAE1CD"
  paper-well: "#E2D6BA"
  ink: "#201512"
  ink-soft: "#5D5245"
  vermilion: "#B23716"
  vermilion-deep: "#8C2C10"
  ochre: "#77530A"
  ochre-wash: "#ECDFC0"
  bench-green: "#43682E"
  green-wash: "#DDE3CB"
  night-amber: "#E8B64C"
  code-ink: "#201512"
  code-paper: "#F4EEE1"
  pre-link: "#F2B49B"
  pre-link-hover: "#FFD9C7"
typography:
  display:
    fontFamily: "Archivo Black, Arial Black, sans-serif"
    fontSize: "clamp(3.2rem, 13vw, 6rem)"
    fontWeight: 400
    lineHeight: 0.95
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Archivo Black, Arial Black, sans-serif"
    fontSize: "clamp(1.7rem, 5vw, 2.5rem)"
    fontWeight: 400
    lineHeight: 1.08
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Bitter, Georgia, serif"
    fontSize: "1.15rem"
    fontWeight: 600
    lineHeight: 1.35
  body:
    fontFamily: "Bitter, Georgia, serif"
    fontSize: "1.075rem"
    fontWeight: 400
    lineHeight: 1.65
  label:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    fontSize: "0.85rem"
    fontWeight: 400
rounded:
  sm: "3px"
  md: "4px"
spacing:
  wall-gutter: "1.25rem"
  section-gap: "4rem"
components:
  index-tab:
    textColor: "{colors.ink}"
  stamp-button:
    backgroundColor: "{colors.vermilion}"
    textColor: "{colors.paper}"
    rounded: "{rounded.md}"
    padding: "0.7rem 1.4rem"
  tool-card:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "1rem 1.1rem 0.9rem"
  flyer:
    backgroundColor: "{colors.ochre-wash}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "1.6rem 1.6rem 1.4rem"
---

# Design System: Tinkerer's Wall

## Overview

**Creative North Star: "Metro panorama crossed with a punk flyer wall"**

The owner's most-starred repo (a Windows Phone pivot tab bar) supplies the panorama: oversized type that bleeds off the edge. A workshop pegboard and taped-up flyers supply everything else: overlap, rotation, tape strips, pegs, stamps, dotted ledger leaders. The second build of this world exists because the first one defaulted — uniform cards, pill buttons, identical reveals — and an anti-slop pass (uniform rhythm, same-size cards, pills-everywhere, identical hovers, uniform scroll reveals, vague-noun headers) sent it back. Nothing here may resolve to an even grid of equal cards again.

**Key Characteristics:**
- Bleed, tilt, tape, and overlap — never an even grid of equals.
- Every project rendered from its own facts, at its own scale and angle.
- Headers make claims ("Hung up & still humming"), tabs stay literal for wayfinding.
- Motion is a per-section vocabulary; tilt is layout, not animation.

## Colors

Sunlit paper with ink work; vermilion acts, ochre files the writing, green hangs the tools, amber glows after hours.

### Primary
- **Signal Vermilion** (#B23716): the only shouting hue. Index numerals, ledger arrows, read links, markers, stamp button, progress hairline. Deepened until body text on paper passes 4.5:1.
- **Vermilion Deep** (#8C2C10): hover and press states on light grounds only. Never set on ink — code links use Pale Signal instead.

### Secondary
- **Drawer Ochre** (#77530A): owns writing — ledger rule, flyer kicker, star counts. **Bench Green** (#43682E): owns projects — hover shadows, success feedback.
- **Night Amber** (#E8B64C): the Daydream screensaver dot and nothing else. One motif, one color.

### Tertiary
- **Ochre Wash** (#ECDFC0): taped-flyer ground. **Green Wash** (#DDE3CB): reserved project callouts.

### Neutral
- **Warm Paper** (#F4EEE1): ground. **Paper Deep** (#EAE1CD): marginalia, inline code. **Paper Well** (#E2D6BA): dotted-leader filler tone.
- **Ink** (#201512): text, rules, pegs, stamp-button border. **Ink Soft** (#5D5245): secondary text, tinted from ink — never gray.
- **Code Ink on Code Paper** with **Pale Signal** links (#F2B49B, hover #FFD9C7).

### Named Rules
**The One Accent Rule.** Vermilion shouts; ochre and green file and hang. Amber dots one night bar.
**The Tinted Secondary Rule.** Secondary text is tinted from ink or the surface hue, never neutral gray.

## Typography

**Display Font:** Archivo Black (with Arial Black)
**Body Font:** Bitter (with Georgia, serif)
**Label/Mono Font:** JetBrains Mono (with ui-monospace, monospace)

**Character:** Painted signage shouting over a warm reading voice, with a clipboard mono for anything measured.

### Hierarchy
- **Display** (400, clamp(3.2rem, 13vw, 6rem), 0.95): panorama hero, one line bleeding off-canvas on desktop, single name on small screens. Tracking never tighter than -0.02em; never exceeds 6rem.
- **Headline** (400, clamp(1.7rem, 5vw, 2.5rem), 1.08): claim headers, uppercase.
- **Title** (600, 1.15–1.25rem, 1.35): ledger and row titles.
- **Body** (400, 1.075rem/1rem mobile, 1.65): prose and lists; article measure capped at 68ch.
- **Label** (400/700, 0.72–0.9rem, mono): status, dates, tags, stamps, footer. Tabular numerals throughout.

### Named Rules
**The Mono Is Data Rule.** Monospace for code, dates, measurements, status — never decoration.
**The Claims Up Top Rule.** Section headers make specific claims; literal labels live in the tab strip for wayfinding.

## Layout

One wall column (1080px, 1.25rem gutters); articles narrow to 760px. Rhythm varies deliberately: dense ledger, overlapping pegboard, airy panorama, compressed footer. Hero is a 1.6fr/1fr split (claim plus taped marginalia) collapsing to one column under 720px. Pegboard runs 6 tracks (featured spans 4), two columns under 720px, one under 460px. About is a margin-date timeline (9rem rail) stacking under 720px. Overflow is structurally refused (overflow-x clip plus min-width-zero grid/flex children); panorama bleeds inside an overflow-clip mask, never the viewport.

## Elevation & Depth

Flat paper with ink borders; lift is a hard offset shadow that grows and cools or warms by section.

### Shadow Vocabulary
- **Hung tool at rest** (`box-shadow: 4px 4px 0 rgba(32, 21, 18, 0.16)`): pegboard cards off the wall.
- **Tool lifted** (`box-shadow: 7px 9px 0 rgba(67, 104, 46, 0.3)` with rise and counter-rotation): hover; the shadow cools toward bench green.
- **Flyer at rest** (`box-shadow: 6px 6px 0 rgba(32, 21, 18, 0.18)`), straightening and warming toward vermilion on hover.
- **Stamp button** (`box-shadow: 4px 4px 0 ink`): physically presses to 1px offset on active.

### Named Rules
**The Flat-By-Default Rule.** Surfaces are flat at rest except hung tools and the taped flyer. Shadows respond to state.

## Shapes

Squared paper: 3px on flyers, tape notes, and stamps; 4px on tools, code, embeds, and callouts; pills appear nowhere. Pegs are 14px ink dots; tape strips are dashed-edge translucent ochre rectangles. Rules are 2px ink, ledger separators 1px dotted ink-soft. Rotation (-1.5deg panorama, ±tilts on tools, taped corners) is layout geometry, present identically under reduced motion.

### Named Rules
**The Tilt Is Layout Rule.** Angles are compositional and static; entrance motion never owns them, and reduced motion keeps every tilt.
**The Tape Means Pinned Rule.** Tape strips appear only on the marginalia note and the featured flyer — the two things stuck up most recently.

## Components

### Stamp button
- **Shape:** 4px radius, 3px ink border, offset ink shadow, uppercase mono.
- **Primary:** vermilion fill, paper text. Hover nudges; active physically stamps down.
- **Hover / Focus:** 120ms expo; 3px vermilion focus outline offset 3px.

### Index tabs
- **Style:** raw mono links with vermilion numerals and 2px underlines, slash-separated. No pills, no chips.
- **State:** hover warms the underline to vermilion.

### Ledger rows
- **Style:** dotted-leader rows — semibold title, dotted filler, right-aligned tabular date, margin tags. Visited titles fall back to ink-soft.
- **State:** hover reddens the title and slides in the vermilion arrow; the arrow is enhancement, the row is a real link.

### Tool cards
- **Corner Style:** 4px, 2px ink border, peg dot on top.
- **Background:** paper; mono name plus ochre stars; plain-speech description; per-project specimen (pivot strip, strike list, code morph, stamps, night bar, mashup); mono repo path.
- **Shadow Strategy:** hung-tool rest and lifted states (see Elevation).
- **Internal Padding:** 1rem 1.1rem 0.9rem.

### Taped flyer
- **Style:** ochre-wash ground, 3px radius, twin tape strips, -1deg rest, kicker plus display title.
- **State:** hover straightens, lifts, and warms the shadow.

### Navigation
- **Style:** static stamped strip with pulse dot and live clock; hero tab strip; breadcrumbs on subpages. The wall doesn't follow you — nothing is sticky.
- **Default/hover/active states:** underlines offset 0.22em at 1.5px; hover goes vermilion-deep on light, pale signal in code blocks.
- **Mobile treatment:** status links collapse to three; panorama shows one name; grids stack.

### Status readout (signature component)
Mono clock line with 9px vermilion pulse dot; footer twin keeps IST. Decorative pulse frozen under reduced motion.

## Do's and Don'ts

### Do:
- **Do** render each project from its own facts at its own scale and angle — never an even grid of equals.
- **Do** keep every animated change to transform and opacity, under 300ms, on expo-out curves, with per-section vocabularies (rise, slide, swing, settle).
- **Do** keep tilt, tape, and pegs static across all motion preferences.
- **Do** tint secondary text from ink or the surface hue, and use tabular numerals for dates, counts, clocks.
- **Do** theme browser surfaces from the palette: selection, scrollbar, caret, focus, underline offset.

### Don't:
- **Don't** ship uniform cards, pill buttons, identical hovers, or one reveal stamped on every section.
- **Don't** use gradient text, glassmorphism, aurora blobs, particle fields, or emoji as icons.
- **Don't** set eyebrow kickers, colored left-border callouts, or sticky navigation.
- **Don't** animate from scale(0), use ease-in on UI, or put hover lifts on the hover target itself.
- **Don't** use mono as decoration or introduce hues beyond vermilion, ochre, green, and the one amber dot.
- **Don't** let a section header stay a vague noun — claims up top, literal labels in the tabs.
