import { describe, expect, it } from 'vitest';
import { outcomeForGenerationSubmit } from '../shared/generationReplay';
import type { Generation } from '../shared/types';

function job(partial: Partial<Generation> & Pick<Generation, 'status'>): Generation {
  return {
    id: '660e8400-e29b-41d4-a716-446655440000',
    root_id: '660e8400-e29b-41d4-a716-446655440000',
    parent_asset_id: null,
    model: 'google/gemini-3.1-flash-image',
    prompt: 'test',
    error: null,
    output_asset_id: null,
    created_at: '2026-01-01T00:00:00Z',
    snapshot: '{}',
    ...partial,
  };
}

describe('outcomeForGenerationSubmit', () => {
  it('does not treat failed replay as a fresh start', () => {
    const outcome = outcomeForGenerationSubmit(
      job({ status: 'failed', error: 'The model could not complete this image.' }),
      true,
    );
    expect(outcome.action).toBe('failed');
    expect(outcome.message).toMatch(/could not complete/i);
    expect(outcome.rotateRequestKey).toBe(true);
  });

  it('surfaces ready replay as library result, not started', () => {
    const outcome = outcomeForGenerationSubmit(
      job({ status: 'ready', output_asset_id: '550e8400-e29b-41d4-a716-446655440099' }),
      true,
    );
    expect(outcome.action).toBe('ready');
    if (outcome.action === 'ready') {
      expect(outcome.message).toMatch(/already in your library/i);
      expect(outcome.outputAssetId).toBe('550e8400-e29b-41d4-a716-446655440099');
    }
  });

  it('uses accurate in-progress copy for generating replay', () => {
    const outcome = outcomeForGenerationSubmit(job({ status: 'generating' }), true);
    expect(outcome.action).toBe('in_progress');
    if (outcome.action === 'in_progress') {
      expect(outcome.status).toBe('generating');
      expect(outcome.message).not.toMatch(/started/i);
    }
  });

  it('announces start only for a new queued submission', () => {
    const fresh = outcomeForGenerationSubmit(job({ status: 'queued' }), false);
    expect(fresh.action).toBe('started');
    const replay = outcomeForGenerationSubmit(job({ status: 'queued' }), true);
    expect(replay.action).toBe('in_progress');
  });
});
