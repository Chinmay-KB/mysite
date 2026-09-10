import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildReferenceIds, composePrompt } from '../worker/validation';
import { createWorkflowStep } from './helpers/workflow-step';
import { GENERATION_ID, PARENT_ID, createWorkflowFixture } from './helpers/workflow-run';
import { encodePng } from './fixtures/valid-png';
import { PARENT_REFERENCE_MAX_BYTES } from '../worker/core';

function imagePosts(calls: { url: string; body?: unknown }[]) {
  return calls.filter(c => c.url.includes('/api/v1/images') && c.body);
}

describe('buildReferenceIds', () => {
  it('orders parent, annotation, then extra references for the provider', () => {
    const ids = buildReferenceIds({
      parentAssetId: '550e8400-e29b-41d4-a716-446655440000',
      annotationAssetId: '550e8400-e29b-41d4-a716-446655440001',
      referenceIds: ['550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440003'],
    });
    expect(ids).toEqual([
      '550e8400-e29b-41d4-a716-446655440000',
      '550e8400-e29b-41d4-a716-446655440001',
      '550e8400-e29b-41d4-a716-446655440002',
      '550e8400-e29b-41d4-a716-446655440003',
    ]);
  });
});

describe('GenerationWorkflow.run (mocked provider boundary)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('persists original, variants, and ready status on success', async () => {
    const fx = createWorkflowFixture();
    await fx.run(createWorkflowStep());

    const row = fx.state.generations[0];
    expect(row.status).toBe('ready');
    expect(row.output_asset_id).toBe(GENERATION_ID);
    expect(row.error).toBeNull();

    const originalKey = `users/user-1/${GENERATION_ID}/original`;
    expect(await fx.env.MEDIA.head(originalKey)).toBeTruthy();
    expect(await fx.env.MEDIA.head(`${originalKey}/thumb.webp`)).toBeTruthy();
    expect(await fx.env.MEDIA.head(`${originalKey}/preview.webp`)).toBeTruthy();
    expect(await fx.env.MEDIA.head(`${originalKey}/reference.webp`)).toBeTruthy();
    expect(await fx.env.MEDIA.head(`jobs/${GENERATION_ID}/response.json`)).toBeNull();
    expect(imagePosts(fx.providerCalls)).toHaveLength(1);
  });

  it('sends parent, annotation, then extra reference order in provider body', async () => {
    const fx = createWorkflowFixture();
    await fx.run(createWorkflowStep());
    const body = imagePosts(fx.providerCalls)[0]?.body as {
      input_references: { image_url: { url: string } }[];
      quality?: string;
      aspect_ratio?: string;
    };
    expect(body.input_references).toHaveLength(3);
    expect(body.quality).toBe('high');
    expect(body.aspect_ratio).toBe('1:1');
    const payloads = body.input_references.map(r => r.image_url.url.split(',')[1] ?? '');
    expect(payloads[0]).not.toBe(payloads[1]);
    expect(payloads[1]).not.toBe(payloads[2]);
    expect(fx.referenceIds).toEqual([fx.input.parentAssetId, fx.input.annotationAssetId, fx.input.referenceIds[0]]);
  });

  it('maps 4:5 to 3:4 for Sunburst endpoint discovery', async () => {
    const fx = createWorkflowFixture();
    fx.input.aspectRatio = '4:5';
    fx.state.generations[0].snapshot = JSON.stringify({
      input: { ...fx.input, referenceIds: fx.referenceIds },
      compiledPrompt: 'compiled provider prompt',
    });
    await fx.run(createWorkflowStep());
    const body = imagePosts(fx.providerCalls)[0]?.body as { aspect_ratio?: string };
    expect(body.aspect_ratio).toBe('3:4');
  });

  it('sends parent reference from original bytes when under 12MB', async () => {
    const fx = createWorkflowFixture();
    const parentKey = `users/user-1/${PARENT_ID}/original`;
    const referenceBytes = encodePng(2, 2, 88);
    await fx.env.MEDIA.put(`${parentKey}/reference.webp`, referenceBytes, {
      httpMetadata: { contentType: 'image/webp' },
    });
    await fx.run(createWorkflowStep());
    const body = imagePosts(fx.providerCalls)[0]?.body as {
      input_references: { image_url: { url: string } }[];
    };
    const parentB64 = body.input_references[0]?.image_url.url.split(',')[1] ?? '';
    const parentBytes = Buffer.from(parentB64, 'base64');
    expect(parentBytes.equals(encodePng(2, 2, 1))).toBe(true);
    expect(parentBytes.equals(referenceBytes)).toBe(false);
  });

  it('template-style input (parent + photo ref, no region) uses original bytes and likeness anchor', async () => {
    const fx = createWorkflowFixture();
    const templateInput = {
      ...fx.input,
      prompt: 'An eighties portrait',
      referenceIds: [PARENT_ID],
      parentAssetId: PARENT_ID,
      annotationAssetId: null,
      region: null,
      preserve: '',
      themeId: 'eighties-local-user',
      themePrompt: 'Indian film of the 80s portrait',
      avoid: 'No text',
    };
    const refIds = buildReferenceIds(templateInput);
    expect(refIds).toEqual([PARENT_ID]);
    const compiledPrompt = composePrompt(templateInput, []);
    expect(compiledPrompt).toContain('Match the exact face');

    fx.state.generations[0].parent_asset_id = PARENT_ID;
    fx.state.generations[0].theme_id = templateInput.themeId;
    fx.state.generations[0].snapshot = JSON.stringify({
      input: { ...templateInput, referenceIds: refIds },
      compiledPrompt,
    });

    const parentKey = `users/user-1/${PARENT_ID}/original`;
    const referenceBytes = encodePng(2, 2, 88);
    await fx.env.MEDIA.put(`${parentKey}/reference.webp`, referenceBytes, {
      httpMetadata: { contentType: 'image/webp' },
    });

    await fx.run(createWorkflowStep());
    const body = imagePosts(fx.providerCalls)[0]?.body as {
      prompt?: string;
      input_references: { image_url: { url: string } }[];
    };
    expect(body.input_references).toHaveLength(1);
    expect(body.prompt).toContain('Match the exact face');
    const parentB64 = body.input_references[0]?.image_url.url.split(',')[1] ?? '';
    const parentBytes = Buffer.from(parentB64, 'base64');
    expect(parentBytes.equals(encodePng(2, 2, 1))).toBe(true);
    expect(parentBytes.equals(referenceBytes)).toBe(false);
  });

  it('falls back to reference.webp for parent when original exceeds 12MB', async () => {
    const fx = createWorkflowFixture();
    const parent = fx.state.assets.find(a => a.id === PARENT_ID)!;
    parent.bytes = PARENT_REFERENCE_MAX_BYTES + 1;
    const parentKey = parent.object_key;
    const referenceBytes = encodePng(2, 2, 88);
    await fx.env.MEDIA.put(`${parentKey}/reference.webp`, referenceBytes, {
      httpMetadata: { contentType: 'image/webp' },
    });
    await fx.run(createWorkflowStep());
    const body = imagePosts(fx.providerCalls)[0]?.body as {
      input_references: { image_url: { url: string } }[];
    };
    const parentB64 = body.input_references[0]?.image_url.url.split(',')[1] ?? '';
    const parentBytes = Buffer.from(parentB64, 'base64');
    expect(parentBytes.equals(referenceBytes)).toBe(true);
  });

  it('terminates failed on provider 429 without ready status', async () => {
    const fx = createWorkflowFixture({ providerStatus: 429 });
    await fx.run(createWorkflowStep());
    expect(fx.state.generations[0].status).toBe('failed');
    expect(fx.state.generations[0].error).toMatch(/busy/i);
    expect(imagePosts(fx.providerCalls)).toHaveLength(1);
  });

  it('terminates failed on invalid provider image output', async () => {
    const fx = createWorkflowFixture({ invalidOutput: true });
    await fx.run(createWorkflowStep());
    expect(fx.state.generations[0].status).toBe('failed');
    expect(fx.state.generations[0].output_asset_id).toBeNull();
  });

  it('does not call the provider again when raw response already exists (ambiguous replay)', async () => {
    const fx = createWorkflowFixture();
    const rawKey = `jobs/${GENERATION_ID}/response.json`;
    await fx.env.MEDIA.put(rawKey, new TextEncoder().encode(JSON.stringify(fx.providerPayload)), {
      httpMetadata: { contentType: 'application/json' },
    });
    fx.state.generations[0].attempted_at = new Date().toISOString();
    fx.state.generations[0].status = 'generating';

    await fx.run(createWorkflowStep());
    expect(imagePosts(fx.providerCalls)).toHaveLength(0);
    expect(fx.state.generations[0].status).toBe('ready');
  });

  it('retries publish/storage without a second provider generation (checkpoint cache)', async () => {
    const fx = createWorkflowFixture();
    const cache = new Map<string, unknown>();
    await fx.run(createWorkflowStep({ cache }));
    const postsAfterFirst = imagePosts(fx.providerCalls).length;
    expect(postsAfterFirst).toBe(1);

    const rawKey = `jobs/${GENERATION_ID}/response.json`;
    await fx.env.MEDIA.put(rawKey, new TextEncoder().encode(JSON.stringify(fx.providerPayload)), {
      httpMetadata: { contentType: 'application/json' },
    });
    for (const stepName of ['save-original', 'create-previews', 'publish-result', 'discard-provider-envelope']) {
      cache.delete(stepName);
    }
    fx.state.generations[0].status = 'generating';
    fx.state.generations[0].output_asset_id = null;

    await fx.run(createWorkflowStep({ cache }));
    expect(imagePosts(fx.providerCalls).length).toBe(postsAfterFirst);
    expect(fx.state.generations[0].status).toBe('ready');
  });
});

describe('valid PNG fixtures', () => {
  it('produces decodable dimensions for browser-style PNG bytes', () => {
    const png = encodePng(5, 4, 12);
    expect(png.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
    expect(png.length).toBeGreaterThan(60);
  });
});
