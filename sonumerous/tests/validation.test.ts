import { describe, expect, it } from 'vitest';
import { buildReferenceIds, composePrompt, generationSchema, regionSchema } from '../worker/validation';

describe('buildReferenceIds', () => {
  it('deduplicates while preserving parent-first order', () => {
    const parent = '550e8400-e29b-41d4-a716-446655440010';
    expect(buildReferenceIds({ parentAssetId: parent, annotationAssetId: parent, referenceIds: [parent] })).toEqual([parent]);
  });
});

describe('regionSchema', () => {
  it('accepts normalized rectangles inside the frame', () => {
    expect(regionSchema.parse({ x: 0.1, y: 0.2, width: 0.3, height: 0.4 })).toEqual({ x: 0.1, y: 0.2, width: 0.3, height: 0.4 });
  });

  it('rejects selections that spill past the edge', () => {
    expect(() => regionSchema.parse({ x: 0.8, y: 0.1, width: 0.3, height: 0.2 })).toThrow();
  });
});

describe('generationSchema', () => {
  const base = {
    prompt: 'Make the sky warmer.',
    model: 'google/gemini-3.1-flash-image',
    aspectRatio: '1:1',
    referenceIds: [] as string[],
    themeId: null,
    themePrompt: '',
    avoid: '',
    parentAssetId: '550e8400-e29b-41d4-a716-446655440000',
    preserve: 'Keep the face.',
    annotationAssetId: '550e8400-e29b-41d4-a716-446655440001',
    region: { x: 0.1, y: 0.1, width: 0.2, height: 0.2 },
    usePreferences: true,
    requestKey: '550e8400-e29b-41d4-a716-446655440002',
  };

  it('requires annotation and parent when a region is set', () => {
    expect(generationSchema.parse(base).region).toBeTruthy();
    expect(() => generationSchema.parse({ ...base, annotationAssetId: null })).toThrow();
  });

  it('allows create flows without parent or region', () => {
    expect(
      generationSchema.parse({
        ...base,
        parentAssetId: null,
        preserve: '',
        annotationAssetId: null,
        region: null,
      }).parentAssetId,
    ).toBeNull();
  });
});

describe('composePrompt', () => {
  it('mentions the red annotation when refining a region', () => {
    const text = composePrompt(
      generationSchema.parse({
        prompt: 'Soften the background.',
        model: 'google/gemini-3.1-flash-image',
        aspectRatio: '1:1',
        referenceIds: [],
        themeId: null,
        themePrompt: '',
        avoid: '',
        parentAssetId: '550e8400-e29b-41d4-a716-446655440000',
        preserve: '',
        annotationAssetId: '550e8400-e29b-41d4-a716-446655440001',
        region: { x: 0, y: 0, width: 0.5, height: 0.5 },
        usePreferences: false,
        requestKey: '550e8400-e29b-41d4-a716-446655440002',
      }),
      [],
    );
    expect(text).toContain('red rectangle');
    expect(text).toContain('Edit the first reference');
    expect(text).toContain('Match the exact face');
    expect(text).toContain('MUST respect the natural proportions');
  });
});
