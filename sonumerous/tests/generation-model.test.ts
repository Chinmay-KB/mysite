import { describe, expect, it } from 'vitest';
import { COVER_IMAGE_MODELS, DEFAULT_IMAGE_MODEL, providerAspectRatio } from '../worker/core';

describe('providerAspectRatio', () => {
  it('maps 4:5 to 3:4 when the provider lacks 4:5 (Sunburst)', () => {
    expect(providerAspectRatio('4:5', ['1:1', '3:4'])).toBe('3:4');
  });

  it('keeps 4:5 when supported', () => {
    expect(providerAspectRatio('4:5', ['1:1', '4:5', '3:4'])).toBe('4:5');
  });

  it('defaults template generation model to Sunburst', () => {
    expect(DEFAULT_IMAGE_MODEL).toBe('openai/gpt-image-2.5-sunburst');
  });

  it('prefers cheap models for theme covers while defaulting generations to Sunburst', () => {
    expect(DEFAULT_IMAGE_MODEL).toBe('openai/gpt-image-2.5-sunburst');
    expect(COVER_IMAGE_MODELS[0]).toBe('google/gemini-3.1-flash-lite-image');
  });
});
