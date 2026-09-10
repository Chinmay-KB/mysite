# Sonumerous

Private, mobile-first image studio on Cloudflare Workers (D1, R2, Images, Workflows) with a React/Vite frontend. Sign-in uses Cloudflare Access email OTP. Image generation uses OpenRouter when `OPENROUTER_API_KEY` is configured.

## Setup

```bash
cd sonumerous
npm install
npm run db:local
```

### Local development

Default ports: **API 8791**, **Vite 5173** (avoids common 8787 conflicts).

Terminal 1 — API (loopback auth as `studio@localhost`):

```bash
npm run dev:api
```

Terminal 2 — UI (proxies `/api` and `/media` to port 8791):

```bash
npm run dev
```

Open [http://127.0.0.1:5173](http://127.0.0.1:5173).

Optional: set `OPENROUTER_API_KEY` via Wrangler secret for local generation (`wrangler secret put OPENROUTER_API_KEY --config wrangler.local.jsonc`). Without a key, uploads, themes, preferences, and library flows still work; generation returns a clear 503.

**Generation idempotency:** Clients send a `requestKey` per intent. Reusing the same key returns the existing row (202) without creating a duplicate job. The workflow stores the provider response before publish and refuses ambiguous replays after a provider attempt (`attempted_at` set) rather than issuing another paid call. This is not exactly-once delivery to OpenRouter; interrupted attempts after a provider call require a new variation (new request key).

**Local image transforms:** Wrangler’s local Images binding often cannot produce thumb/preview/reference variants. The worker stores originals and serves them as fallbacks locally. **Production** uses Cloudflare Images transforms; that path is not verified in local dev.

### Production

Production `wrangler.jsonc` binds real D1/R2 and Access (`ACCESS_DOMAIN`, `ACCESS_AUD`). Deploy after build:

```bash
npm run build
npm run deploy
```

Coordinator manages Access app/policy and `OPENROUTER_API_KEY` secret. Without a valid Access JWT, API and media routes fail closed (401).

## Testing

```bash
npm run typecheck
npm run test
```

Unit tests always run. Integration tests **skip explicitly** when the worker is down unless you require them:

```bash
npm run db:local
npm run dev:api
npm run test:integration
```

`SONUMEROUS_INTEGRATION=1` fails the run if `http://127.0.0.1:8791` is unreachable.

End-to-end (starts dev servers on 8791 + 5173 if needed):

```bash
npx playwright install chromium
npm run test:e2e
```

Playwright’s detail/annotation test mocks only `/api/session` (`generationReady: true`) and `POST /api/generations` (synthetic queued job) in that test file. Annotation uploads still hit the real worker. Local dev without a Wrangler secret shows generation as disconnected; no fake OpenRouter key in config.

Review screenshots land in `.impeccable/review/` (`mobile.png`, `mobile-320.png`, `desktop.png`, plus detail/picker when captured).

## Regenerate Worker types

```bash
npm run types
```
