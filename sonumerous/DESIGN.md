---
name: Sonumerous
description: Clean gallery personal image studio — paper white, charcoal controls, photography-first layout.
colors:
  paper: "#fcfcfa"
  paper-elevated: "#ffffff"
  ink: "#171717"
  ink-secondary: "#4a4a48"
  ink-muted: "#6f6f6b"
  line: "#e8e8e4"
  line-strong: "#d4d4cf"
  accent: "#171717"
  accent-soft: "#f3f3ef"
  brand: "#9c2126"
  brand-strong: "#7c1a1e"
  brand-soft: "#f8ecea"
  focus: "#2563eb"
  error-bg: "#fdf0ef"
  error-ink: "#7a241f"
  success-bg: "#eef6ef"
  success-ink: "#1f4d2c"
  favourite: "#b42318"
typography:
  body:
    fontFamily: "Manrope Variable, Manrope, system-ui, sans-serif"
    fontSize: "1rem"
    lineHeight: "1.55"
  display:
    fontFamily: "Manrope Variable, Manrope, system-ui, sans-serif"
    fontSize: "clamp(1.65rem, 4vw, 2.35rem)"
    fontWeight: "650"
    letterSpacing: "-0.03em"
spacing:
  radius: "12px"
  radius-sm: "8px"
  sidebar: "15.5rem"
  mobile-nav: "4.25rem"
  measure: "min(72ch, 100%)"
shadows:
  shadow-soft: "0 18px 40px rgba(23, 23, 23, 0.06)"
  shadow-card: "0 1px 0 rgba(23, 23, 23, 0.04), 0 12px 32px rgba(23, 23, 23, 0.05)"
motion:
  ease-out: "cubic-bezier(0.16, 1, 0.3, 1)"
---

# Overview

Sonumerous presents saved uploads and generated work like a restrained photography gallery: large image surfaces, quiet chrome, and Manrope typography on paper-white backgrounds. Operate mode on Create/Refine; Experience mode on Library.

# Design principles

1. **Image first** — previews and detail views dominate; controls stay compact beside or below.
2. **Permanent library** — copy reinforces that uploads and results are kept and reusable.
3. **Honest states** — empty, loading, error, and “generation not connected” are explicit; no fake results.
4. **Flat gallery chrome** — 12px corners, hairline borders, soft offset shadows; no decorative gradients on UI shells (legibility scrims over imagery excepted).
5. **Committed sindoor-red accent** — `--brand` carries primary actions and the wordmark dot; `--brand-strong` carries links and active states; imagery stays full-bleed with overlaid labels.

# Design tokens

## Color

| Token | Value | Use |
|-------|-------|-----|
| paper | `#fcfcfa` | Page background (`--paper`) |
| paper-elevated | `#ffffff` | Cards, composer, modals |
| ink | `#171717` | Primary text, primary buttons |
| ink-secondary | `#4a4a48` | Supporting copy |
| ink-muted | `#6f6f6b` | Labels, meta |
| line | `#e8e8e4` | Dividers, borders |
| line-strong | `#d4d4cf` | Input borders, stronger dividers |
| accent-soft | `#f3f3ef` | Hover/active fills |
| brand | `#9c2126` | Primary actions (Generate, CTA), wordmark dot |
| brand-strong | `#7c1a1e` | Primary hover, links, active nav text |
| brand-soft | `#f8ecea` | Active nav fill, tile placeholder ground |
| focus | `#2563eb` | Focus rings |
| error-bg / error-ink | `#fdf0ef` / `#7a241f` | Error banners |
| success-bg / success-ink | `#eef6ef` / `#1f4d2c` | Success banners |
| favourite | `#b42318` | Favourite heart |

## Typography

- **Family:** Manrope Variable (`--font`), system-ui fallback.
- **Headings:** 650 weight, negative tracking, balanced wraps.
- **Body:** `--measure` (~72ch max) in prose blocks; tabular nums on region inputs.

## Spacing and shape

- **Radius:** `--radius` 12px panels, `--radius-sm` 8px controls.
- **Layout:** Desktop `--sidebar` 15.5rem; mobile `--mobile-nav` 4.25rem bottom nav; studio grid composer + preview (preview hidden on mobile until in-progress or result).

## Motion

- **Ease:** `--ease-out` cubic-bezier(0.16, 1, 0.3, 1) for short UI transitions.

# Visual rules

**Do:** Keep generous whitespace between sections; use dashed preview canvas only when empty; theme browser surfaces (selection, scrollbars, focus).

**Don’t:** Lavender or heavy retro chrome globally; credit/pricing UI; sample generations posing as user work.

# Components

| Component | Role |
|-----------|------|
| Composer | Prompt, theme override, references, model/shape, generate |
| Preview canvas | Latest or in-progress generation (collapsed on mobile when empty) |
| Asset grid | Library and reference picker |
| Image detail | Version strip, before/after, region select, refine panel |
| Modal | Theme and preference editing (Radix Dialog) |

# Patterns

- **Create:** Describe → optional theme/references → generate → open detail to refine.
- **Refine:** Parent image + optional red rectangle annotation + instruction/preserve → new version in tree.
- **Remember:** Explicit preferences in Settings or from detail; fixes tied to edits when saved from refinement.
