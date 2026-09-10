import { vi } from 'vitest';
import type { GenerationInput } from '../../shared/types';
import type { AppEnv, AssetRow, GenerationRow } from '../../worker/core';
import { GenerationWorkflow } from '../../worker/workflow';
import type { WorkflowStep } from '../mocks/cloudflare-workers';
import { buildMockEnv, type MockState } from './mock-env';
import { encodePng, PROVIDER_OUTPUT_PNG } from '../fixtures/valid-png';

export const PARENT_ID = '550e8400-e29b-41d4-a716-446655440000';
export const ANNOTATION_ID = '550e8400-e29b-41d4-a716-446655440001';
export const EXTRA_REF_ID = '550e8400-e29b-41d4-a716-446655440002';
export const GENERATION_ID = '660e8400-e29b-41d4-a716-446655440000';

export function buildReferenceAssets(): { assets: AssetRow[]; bytesById: Record<string, Buffer> } {
  const bytesById: Record<string, Buffer> = {
    [PARENT_ID]: encodePng(2, 2, 1),
    [ANNOTATION_ID]: encodePng(2, 2, 2),
    [EXTRA_REF_ID]: encodePng(2, 2, 3),
  };
  const base = (id: string, kind: AssetRow['kind'], key: string): AssetRow => ({
    id,
    user_id: 'user-1',
    kind,
    name: `${id}.png`,
    object_key: key,
    mime: 'image/png',
    width: 2,
    height: 2,
    bytes: bytesById[id].byteLength,
    sha256: null,
    favourite: 0,
    generation_id: null,
    created_at: new Date().toISOString(),
  });
  return {
    assets: [
      base(PARENT_ID, 'upload', `users/user-1/${PARENT_ID}/original`),
      base(ANNOTATION_ID, 'annotation', `users/user-1/${ANNOTATION_ID}/original`),
      base(EXTRA_REF_ID, 'upload', `users/user-1/${EXTRA_REF_ID}/original`),
    ],
    bytesById,
  };
}

export function buildGenerationInput(): GenerationInput {
  return {
    prompt: 'Warm the sky slightly.',
    model: 'openai/gpt-image-2.5-sunburst',
    aspectRatio: '1:1',
    referenceIds: [EXTRA_REF_ID],
    themeId: null,
    themePrompt: '',
    avoid: '',
    parentAssetId: PARENT_ID,
    preserve: 'Keep the face.',
    annotationAssetId: ANNOTATION_ID,
    region: { x: 0.1, y: 0.1, width: 0.4, height: 0.4 },
    usePreferences: false,
    requestKey: '770e8400-e29b-41d4-a716-446655440000',
  };
}

export function createWorkflowFixture(options?: { providerStatus?: number; providerStatuses?: number[]; invalidOutput?: boolean }) {
  const input = buildGenerationInput();
  const referenceIds = [PARENT_ID, ANNOTATION_ID, EXTRA_REF_ID];
  const generation: GenerationRow = {
    id: GENERATION_ID,
    user_id: 'user-1',
    root_id: GENERATION_ID,
    parent_asset_id: PARENT_ID,
    theme_id: null,
    purpose: 'user',
    model: input.model,
    prompt: input.prompt,
    status: 'queued',
    error: null,
    output_asset_id: null,
    created_at: new Date().toISOString(),
    attempted_at: null,
    request_key: input.requestKey,
    snapshot: JSON.stringify({
      input: { ...input, referenceIds },
      compiledPrompt: 'compiled provider prompt',
    }),
  };

  const refs = buildReferenceAssets();
  const state: MockState = {
    generations: [generation],
    assets: refs.assets,
    media: new Map(),
  };

  for (const asset of state.assets) {
    const body = refs.bytesById[asset.id];
    state.media.set(asset.object_key, {
      body,
      size: body.byteLength,
      httpMetadata: { contentType: 'image/png' },
    });
  }

  const env = buildMockEnv(state, 4, 4);
  const providerCalls: { url: string; body?: unknown }[] = [];
  const b64 = PROVIDER_OUTPUT_PNG.toString('base64');
  const providerPayload = options?.invalidOutput
    ? { data: [{ b64_json: 'not-a-valid-image!!!', media_type: 'image/png' }] }
    : { data: [{ b64_json: b64, media_type: 'image/png' }] };

  const statusQueue = [...(options?.providerStatuses ?? (options?.providerStatus !== undefined ? [options.providerStatus] : []))];
  const fetchImpl = async (url: string, init?: RequestInit) => {
    if (url.includes('/endpoints')) {
      return new Response(
        JSON.stringify({
          endpoints: [
            {
              provider_tag: 'test-provider',
              supported_parameters: {
                aspect_ratio: { values: ['1:1', '3:4'] },
                input_references: { max: 8 },
              },
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }
    if (url.includes('/api/v1/images') && init?.method === 'POST') {
      providerCalls.push({ url, body: init.body ? JSON.parse(String(init.body)) : undefined });
      const status = statusQueue.length ? statusQueue.shift()! : 200;
      if (status !== 200) {
        return new Response(JSON.stringify({ error: `provider status ${status}` }), { status });
      }
      return new Response(JSON.stringify(providerPayload), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response('not found', { status: 404 });
  };

  vi.stubGlobal('fetch', vi.fn(fetchImpl));

  async function run(step: WorkflowStep) {
    const workflow = new GenerationWorkflow({} as ExecutionContext, env as AppEnv);
    await workflow.run(
      {
        payload: { generationId: GENERATION_ID },
        timestamp: new Date(),
        instanceId: 'test-instance',
        workflowName: 'GenerationWorkflow',
      },
      step as never,
    );
  }

  return { env, state, run, providerCalls, input, referenceIds, providerPayload };
}
