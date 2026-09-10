# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Tiny Markdown generator: posts written in Markdown, a small script builds the HTML, deployed as static assets to Cloudflare Workers (chinmaykabi.com via wrangler).

## Users

The site's primary job is self-representation for Chinmay Kabi: his work, his ideas, his personality. It is explicitly not a hiring or recruiter asset. Secondary visitors are peers, friends, and anyone who finds the writing — no application funnel, no conversion goal.

## Product Purpose

A personal home on the web that collects everything in one owned place: the full archive of writing from dev.to, write-ups of projects he cares about, plus resume and contact details. Success means the site reads as unmistakably him.

## Positioning

A working engineer's personal site — production-focused Flutter background, real shipped systems (rendering, monetization, realtime clients) — where the writing and the projects are the substance, not marketing copy.

## Operating Context

Static site served from Cloudflare Workers Static Assets at chinmaykabi.com (apex + www). Deploys with `wrangler deploy` from this repo. Source writing lives partly off-site today (dev.to profile: https://dev.to/chinmaykb) and will be imported.

## Capabilities and Constraints

- Import the full dev.to archive (https://dev.to/chinmaykb), not a curated subset.
- Project case studies, including shareable Blend/Kreate work plus side projects.
- Keep the resume PDF download (docs/resume.pdf) and frictionless contact (email, LinkedIn, GitHub, X, dev.to).
- Undecided: exact article count after import, final project list, what Blend work is publicly shareable.

## Brand Commitments

Name: Chinmay Kabi. Factual, first-person voice carried over from the current copy. No binding visual constraints volunteered.

## Evidence on Hand

- Current site: index.html, styles.css (single page: hero, employment, contact links).
- Resume: docs/resume.pdf.
- Writing source: https://dev.to/chinmaykb (full archive to be imported).
- Profiles: https://github.com/Chinmay-KB, https://linkedin.com/in/chinmaykabi, https://twitter.com/chinmaykb, mailto:chinmaykabi@live.com.
- Absence future work must not fabricate: project details beyond what Chinmay confirms; testimonials; metrics without sources.

## Product Principles

- Represents the person, not a job application; never reads as a resume site.
- Completeness over curation: the whole archive, warts and all.
- Keep the build boring and fast: plain static output, no heavy frameworks.
- Own the content: canonical home is chinmaykabi.com, not rented platforms.
