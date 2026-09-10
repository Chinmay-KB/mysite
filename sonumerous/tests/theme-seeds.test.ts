import { describe, expect, it } from 'vitest';
import {
  coverPromptForThemeId,
  EIGHTIES_AVOID,
  EIGHTIES_BODY_ANCHOR,
  EIGHTIES_PROMPT,
  FIX_LIGHTING_PROMPT,
  SCRIBBLES_PROMPT,
  STUDIO_AVOID,
  STUDIO_PROMPT,
  THEME_SEEDS,
  WANDERLUST_PROMPT,
  slugFromThemeId,
  themeIdForUser,
  visiblePublicThemes,
} from '../worker/themeSeeds';

describe('theme seeds', () => {
  it('uses the owner verbatim eighties prompt', () => {
    expect(THEME_SEEDS[0].prompt).toBe(EIGHTIES_PROMPT);
    expect(EIGHTIES_PROMPT).toMatch(/Indian film of the 80s/);
    expect(EIGHTIES_PROMPT).not.toMatch(/coloured Indian clothes/i);
    expect(EIGHTIES_PROMPT).toMatch(/high-waist denim/i);
    expect(THEME_SEEDS[0].coverPrompt).toMatch(/high-waist denim/i);
    expect(THEME_SEEDS[0].avoid).toBe(EIGHTIES_AVOID);
    expect(EIGHTIES_AVOID).toContain(EIGHTIES_BODY_ANCHOR);
    expect(THEME_SEEDS[0].coverPrompt).toContain(EIGHTIES_BODY_ANCHOR);
    expect(EIGHTIES_BODY_ANCHOR).toMatch(/No broadening shoulders/i);
  });

  it('uses the owner verbatim studio portrait prompt and avoid', () => {
    const studio = THEME_SEEDS.find(s => s.slug === 'studio');
    expect(studio?.prompt).toBe(STUDIO_PROMPT);
    expect(studio?.avoid).toBe(STUDIO_AVOID);
    expect(studio?.defaultAspect).toBe('4:5');
    expect(themeIdForUser('studio', 'local-user')).toBe('studio-local-user');
  });

  it('uses owner verbatim prompts for scribbles, fix lighting, and wanderlust', () => {
    expect(THEME_SEEDS.find(s => s.slug === 'scribbles')?.prompt).toBe(SCRIBBLES_PROMPT);
    expect(THEME_SEEDS.find(s => s.slug === 'fix-lighting')?.prompt).toBe(FIX_LIGHTING_PROMPT);
    expect(THEME_SEEDS.find(s => s.slug === 'wanderlust')?.prompt).toBe(WANDERLUST_PROMPT);
    for (const slug of ['scribbles', 'fix-lighting', 'wanderlust'] as const) {
      expect(THEME_SEEDS.find(s => s.slug === slug)?.defaultAspect).toBe('1:1');
      expect(THEME_SEEDS.find(s => s.slug === slug)?.hidden).toBeFalsy();
    }
  });

  it('defines India-specific cover prompts for every seed', () => {
    expect(THEME_SEEDS).toHaveLength(10);
    for (const seed of THEME_SEEDS) {
      expect(seed.coverPrompt.length).toBeGreaterThan(40);
      expect(seed.coverPrompt.toLowerCase()).toMatch(/indian/);
    }
  });

  it('keeps five templates visible; soft-hides legacy seeds', () => {
    for (const slug of ['eighties', 'studio', 'scribbles', 'fix-lighting', 'wanderlust'] as const) {
      expect(THEME_SEEDS.find(s => s.slug === slug)?.hidden).toBeFalsy();
    }
    for (const seed of THEME_SEEDS.filter(
      s => !['eighties', 'studio', 'scribbles', 'fix-lighting', 'wanderlust'].includes(s.slug),
    )) {
      expect(seed.hidden).toBe(true);
    }
  });

  it('resolves cover prompt by theme id', () => {
    const userId = 'local-user';
    const id = themeIdForUser('eighties', userId);
    expect(coverPromptForThemeId(id, userId)).toMatch(/Indian film of the 80s/);
    expect(coverPromptForThemeId('theme:eighties', userId)).toMatch(/Indian film of the 80s/);
    expect(slugFromThemeId('theme:eighties')).toBe('eighties');
    expect(coverPromptForThemeId('custom-theme', userId)).toBeUndefined();
  });

  it('exposes only visible templates on the public landing', () => {
    const visible = visiblePublicThemes();
    expect(visible.map(s => s.slug)).toEqual(['eighties', 'studio', 'scribbles', 'fix-lighting', 'wanderlust']);
  });
});
