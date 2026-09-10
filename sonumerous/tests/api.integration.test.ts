import { beforeAll, describe, expect, it } from 'vitest';
import { API, INTEGRATION_REQUIRED, api, assertWorkerForIntegration, tinyPng, workerReachable } from './helpers/integration';

describe('local worker API', () => {
  let workerUp = false;

  beforeAll(async () => {
    await assertWorkerForIntegration();
    workerUp = await workerReachable();
  });

  it('returns a local session', async ({ skip }) => {
    if (!workerUp) {
      if (INTEGRATION_REQUIRED) throw new Error('Worker unreachable');
      skip(`Worker not running at ${API}`);
    }
    const { status, data } = await api<{ authenticated: boolean; local?: boolean }>('/api/session');
    expect(status).toBe(200);
    expect(data.authenticated).toBe(true);
    expect(data.local).toBe(true);
  });

  it('lists public themes without authentication', async ({ skip }) => {
    if (!workerUp) {
      if (INTEGRATION_REQUIRED) throw new Error('Worker unreachable');
      skip(`Worker not running at ${API}`);
    }
    const response = await fetch(`${API}/api/public/themes`);
    expect(response.status).toBe(200);
    const themes = await response.json() as { slug: string; name: string; coverUrl: string }[];
    expect(themes.length).toBe(5);
    expect(themes[0].coverUrl).toMatch(/^\/public\/covers\//);
  });

  it('deduplicates identical uploads on repeat POST', async ({ skip }) => {
    if (!workerUp) {
      if (INTEGRATION_REQUIRED) throw new Error('Worker unreachable');
      skip(`Worker not running at ${API}`);
    }
    const name = `fixture-dedup-${Date.now()}.png`;
    const first = await api<{ id: string }>(`/api/assets?name=${name}`, {
      method: 'POST',
      headers: { 'Content-Type': 'image/png' },
      body: tinyPng,
    });
    expect([200, 201]).toContain(first.status);
    const second = await api<{ id: string }>(`/api/assets?name=${name}-copy.png`, {
      method: 'POST',
      headers: { 'Content-Type': 'image/png' },
      body: tinyPng,
    });
    expect([200, 201]).toContain(second.status);
    expect(second.data.id).toBe(first.data.id);
  });

  it('lists global starter themes without creating new user copies', async ({ skip }) => {
    if (!workerUp) {
      if (INTEGRATION_REQUIRED) throw new Error('Worker unreachable');
      skip(`Worker not running at ${API}`);
    }
    const before = await api<{ id: string; scope?: string }[]>('/api/themes');
    const session = await api<{ authenticated: boolean }>('/api/session');
    expect(session.status).toBe(200);
    const themes = await api<{ id: string; name: string; scope?: string; cover_asset_id: string | null; hidden?: number; default_aspect?: string }[]>('/api/themes');
    expect(themes.status).toBe(200);
    expect(themes.data.length).toBeGreaterThanOrEqual(5);
    const globals = themes.data.filter(t => t.scope === 'global');
    expect(globals).toHaveLength(5);
    expect(globals.map(t => t.id)).toEqual(expect.arrayContaining([
      'theme:eighties',
      'theme:studio',
      'theme:scribbles',
      'theme:fix-lighting',
      'theme:wanderlust',
    ]));
    expect(themes.data.some(t => t.id.startsWith('yearbook-90s-'))).toBe(false);
    const studio = themes.data.find(t => t.id === 'theme:studio');
    expect(studio?.default_aspect).toBe('4:5');
    expect(themes.data.every(t => 'cover_asset_id' in t)).toBe(true);
    expect(themes.data.every(t => !t.hidden)).toBe(true);
    expect(themes.data.filter(t => t.scope === 'global').map(t => t.id)).toEqual(
      before.data.filter(t => t.scope === 'global').map(t => t.id),
    );
    const prefs = await api<unknown[]>('/api/preferences');
    expect(prefs.status).toBe(200);
  });

  it('theme cover endpoint dedupes or accepts enqueue', async ({ skip }) => {
    if (!workerUp) {
      if (INTEGRATION_REQUIRED) throw new Error('Worker unreachable');
      skip(`Worker not running at ${API}`);
    }
    const themes = await api<{ id: string; scope?: string; cover_asset_id: string | null }[]>('/api/themes');
    const theme = themes.data.find(t => t.scope === 'global' && !t.cover_asset_id);
    expect(theme).toBeTruthy();
    const first = await api<{ ok?: boolean; purpose?: string; status?: string; id?: string }>(`/api/themes/${theme!.id}/cover`, { method: 'POST' });
    expect([200, 202, 503]).toContain(first.status);
    const second = await api<{ ok?: boolean; id?: string }>(`/api/themes/${theme!.id}/cover`, { method: 'POST' });
    expect([200, 202, 503]).toContain(second.status);
    if (first.status === 202 && second.status === 202 && first.data.id && second.data.id) {
      expect(second.data.id).toBe(first.data.id);
    }
  });

  it('rejects malformed JSON with 400', async ({ skip }) => {
    if (!workerUp) {
      if (INTEGRATION_REQUIRED) throw new Error('Worker unreachable');
      skip(`Worker not running at ${API}`);
    }
    const response = await fetch(`${API}/api/preferences`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{not-json',
    });
    expect(response.status).toBe(400);
  });

  it('returns 404 for another user asset id shape (ownership)', async ({ skip }) => {
    if (!workerUp) {
      if (INTEGRATION_REQUIRED) throw new Error('Worker unreachable');
      skip(`Worker not running at ${API}`);
    }
    const missing = await api<{ error?: string }>('/api/assets/550e8400-e29b-41d4-a716-446655440099');
    expect(missing.status).toBe(404);
  });

  it('creates, updates, and deletes a preference', async ({ skip }) => {
    if (!workerUp) {
      if (INTEGRATION_REQUIRED) throw new Error('Worker unreachable');
      skip(`Worker not running at ${API}`);
    }
    const created = await api<{ id: string }>('/api/preferences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'Prefer soft light.', themeId: null }),
    });
    expect(created.status).toBe(201);
    const updated = await api<{ ok: boolean }>(`/api/preferences/${created.data.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'Prefer warmer tones.', themeId: null }),
    });
    expect(updated.status).toBe(200);
    const removed = await api<{ ok: boolean }>(`/api/preferences/${created.data.id}`, { method: 'DELETE' });
    expect(removed.status).toBe(200);
  });

  it('saves theme edits without mutating create draft theme override semantics', async ({ skip }) => {
    if (!workerUp) {
      if (INTEGRATION_REQUIRED) throw new Error('Worker unreachable');
      skip(`Worker not running at ${API}`);
    }
    const themes = await api<{ id: string; prompt: string }[]>('/api/themes');
    const starter = themes.data[0];
    expect(starter).toBeTruthy();
    const overridePrompt = 'One-off direction for a single image.';
    const genAttempt = await api<{ error?: string }>('/api/generations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: 'Test prompt',
        model: 'google/gemini-3.1-flash-image',
        aspectRatio: '1:1',
        referenceIds: [],
        themeId: starter!.id,
        themePrompt: overridePrompt,
        avoid: '',
        parentAssetId: null,
        preserve: '',
        annotationAssetId: null,
        region: null,
        usePreferences: false,
        requestKey: crypto.randomUUID(),
      }),
    });
    expect([503, 202]).toContain(genAttempt.status);
    const after = await api<{ id: string; prompt: string }[]>(`/api/themes`);
    expect(after.data.find(t => t.id === starter!.id)?.prompt).toBe(starter!.prompt);
  });
});
