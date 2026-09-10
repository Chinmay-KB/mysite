export interface ThemeSeed {
  slug: string;
  name: string;
  description: string;
  prompt: string;
  avoid: string;
  /** Subject and style for theme covers (no user reference photo). */
  coverPrompt: string;
  /** Seed templates hidden from the create grid (soft-delete). */
  hidden?: boolean;
  /** Default aspect ratio for generations from this template. */
  defaultAspect?: string;
}

/** Retro-modern 80s wardrobe (replaces legacy “coloured Indian clothes” clause). */
export const EIGHTIES_CLOTHING =
  'retro-modern 80s clothing by default (high-waist denim, puff-sleeved tops, blazers, chic dresses, statement accessories — elegant, not costume-y; saree only if the photo already features one)';

/** Owner-ordered eighties prompt (verbatim except clothing clause). */
export const EIGHTIES_PROMPT =
  `Reimagine this image as a realistic portrait from an Indian film of the 80s. Use the recognisable facial features, natural skin tone, period-appropriate voluminous hair, ${EIGHTIES_CLOTHING}, warm studio lighting, subtle analogue film grain and slightly faded colours while maintaining the image's photorealism and natural and elegant appearance – make it look like a real photo taken in India in the 80s, not a modern photo with a vintage filter.`;

export const EIGHTIES_BODY_ANCHOR =
  'Keep the EXACT body shape, shoulder width, torso and posture of the original photo. No broadening shoulders, no widening the trunk, no bodybuilder proportions — the body must look naturally proportional, never absurd.';

export const EIGHTIES_AVOID =
  `Modern objects, smartphones, contemporary hairstyles, text, watermarks, logos, or distorted facial features. ${EIGHTIES_BODY_ANCHOR}`;

/** Owner-ordered studio portrait prompt (verbatim). */
export const STUDIO_PROMPT =
  'Use the attached image as the exact facial reference. Create a hyperrealistic professional studio editorial portrait that preserves the person\'s facial identity, proportions, expression, and natural features. Portrait style: contemporary high-end photography. Framing: medium head-and-shoulders shot, 4:5 aspect ratio. Pose: direct gaze into camera, neutral expression. Background: pure uniform black, no texture, no visible environment. Lighting: soft studio lighting with a side key light and gentle fill. Add subtle side chiaroscuro for depth and separation from the black background. Skin: natural, realistic skin texture with fine detail. No smoothing, no plastic effect, no artificial shine. Eyes: very sharp focus, crisp catchlights, high detail. Lens look: 85mm portrait lens, shallow depth of field. Color: neutral color correction, natural tones. Output: high-resolution, clean editorial portrait.';

export const STUDIO_AVOID =
  'No caricature. No painting or illustration style. No fake skin. No facial distortion. No exaggerated smile. No glossy or artificial skin. No visible background elements. No texture in the background. No overprocessed retouching';

/** Owner-ordered scribbles prompt (verbatim). */
export const SCRIBBLES_PROMPT =
  'Add a hand drawn overlay on top of the image. Final output should be stylish, relaxed and effortlessly casual. Drawing rules: Use thin, hand-drawn lines as if drawn with a white pen. Keep it in a single-stroke style: rough and slightly uneven. Add outlines tracing around the outer edges of objects. Use arrows or dotted lines to guide the viewer\'s eye. Text rules: Handwritten text. Keep it short, like a casual inner monologue. Tone: diary-like, brief, and emotion-focused. Commentary should be positive and sweet. Decorations: Add steam, sparkles, hearts, small emoticon-like faces sparingly. Avoid overdoing it; leave some negative space.';

/** Owner-ordered fix lighting prompt (verbatim). */
export const FIX_LIGHTING_PROMPT =
  'Improve the lighting while keeping everything else exactly the same. Do not change the person, pose, expression, background, or composition. Fix issues like back lighting, harsh shadows, underexposure or uneven lighting. Transform the original lighting into soft, natural, flattering light coming from slightly above eye level and facing the subject, so the face is evenly lit with realistic skin tones. Keep the result photorealistic and consistent with the original scene.';

/** Owner-ordered wanderlust prompt (verbatim). */
export const WANDERLUST_PROMPT =
  'Use this image to create a travel collage by placing the main subject of the original image in a travel destination location with location appropriate styling as an instant photo with instant photo style lighting, color and quality. Include a postcard from a random less traveled destination in blue ink pen inspiring me to travel to new places. It should feel intimate, personal, and cleanly curated. Add souvenirs and small details that create a sense of a memento in a balanced layout with natural lighting.';

export const THEME_SEEDS: ThemeSeed[] = [
  {
    slug: 'eighties',
    name: 'An ’80s kind of day',
    description: 'Warm analog tones, soft flash, and retro studio charm.',
    prompt: EIGHTIES_PROMPT,
    avoid: EIGHTIES_AVOID,
    coverPrompt:
      `Realistic portrait of a young Indian woman as if from an Indian film of the 80s. Natural skin tone, recognisable facial features, period-appropriate voluminous hair, retro-modern 80s clothing (high-waist denim, puff-sleeved top or chic dress, statement accessories — elegant, not costume-y), warm studio lighting, subtle analogue film grain and slightly faded colours. Photorealistic and elegant — a real photo taken in India in the 80s, not a modern vintage filter. ${EIGHTIES_BODY_ANCHOR}`,
    hidden: false,
    defaultAspect: '1:1',
  },
  {
    slug: 'studio',
    name: 'Studio Portrait',
    description: 'Editorial head-and-shoulders on pure black, natural skin, and crisp studio light.',
    prompt: STUDIO_PROMPT,
    avoid: STUDIO_AVOID,
    coverPrompt:
      'Hyperrealistic professional studio editorial portrait of a young Indian woman. Medium head-and-shoulders, direct gaze, neutral expression. Pure uniform black background with no texture. Soft side key light, gentle fill, subtle chiaroscuro. Natural realistic skin texture, sharp eyes with catchlights, 85mm portrait lens look, shallow depth of field, neutral natural tones.',
    hidden: false,
    defaultAspect: '4:5',
  },
  {
    slug: 'scribbles',
    name: 'Handwritten Scribbles',
    description: 'White-pen doodles and sweet diary notes layered over your photo.',
    prompt: SCRIBBLES_PROMPT,
    avoid: 'Heavy filters, unreadable text blocks, cluttered overlays, or changing the underlying photo.',
    coverPrompt:
      'Stylish casual photo of a young Indian woman with a hand-drawn white-pen overlay: thin single-stroke outlines, arrows, short sweet handwritten diary text, and sparing sparkles and hearts. Relaxed, effortlessly casual, with negative space.',
    hidden: false,
    defaultAspect: '1:1',
  },
  {
    slug: 'fix-lighting',
    name: 'Fix Lighting',
    description: 'Soft, even light on your face—pose, background, and scene stay the same.',
    prompt: FIX_LIGHTING_PROMPT,
    avoid: 'Pose changes, background swaps, beauty retouching, or altered composition.',
    coverPrompt:
      'Photorealistic portrait of an Indian person with soft, natural, flattering light from slightly above eye level. Even facial lighting, realistic skin tones, unchanged pose and background—only lighting improved.',
    hidden: false,
    defaultAspect: '1:1',
  },
  {
    slug: 'wanderlust',
    name: 'Wanderlust',
    description: 'Travel collage with instant photos, a handwritten postcard, and memento details.',
    prompt: WANDERLUST_PROMPT,
    avoid: 'Cluttered layouts, illegible postcard text, or generic stock-travel clichés without a personal feel.',
    coverPrompt:
      'Intimate travel collage featuring an Indian traveler as the main subject in instant-photo style at a lesser-known destination. Blue-ink postcard, souvenirs, balanced memento layout, natural lighting, personal and cleanly curated.',
    hidden: false,
    defaultAspect: '1:1',
  },
  {
    slug: 'yearbook-90s',
    name: '90s Yearbook Portrait',
    description: 'Classic studio pose with consumer-film colour and grain.',
    prompt:
      'Turn the reference into a classic 1990s yearbook portrait. Preserve face, features, skin tone, and identity. Simple studio backdrop, authentic 90s hairstyle and outfit, consumer-film colour, subtle grain, and gently faded tones.',
    avoid: 'Modern streetwear, smartphones, text, watermarks, logos, or contemporary studio lighting.',
    coverPrompt:
      'Classic 1990s yearbook portrait of an Indian college student. Simple studio backdrop, authentic 90s hairstyle and outfit, consumer-film colour, subtle grain, and gently faded tones. Natural skin tone and realistic facial features.',
    hidden: true,
  },
  {
    slug: 'y2k-fashion',
    name: 'Y2K Fashion Editorial',
    description: 'Glossy early-2000s magazine energy with cool studio light.',
    prompt:
      'Reimagine the reference as an early-2000s fashion editorial portrait. Preserve identity, face, and skin tone. Denim or Y2K styling, metallic details, glossy textures, bright studio lighting, slightly cool palette, and subtle digital noise.',
    avoid: 'Readable text, watermarks, logos, heavy HDR, or obvious 2020s fashion cues.',
    coverPrompt:
      'Early-2000s fashion editorial portrait of a young Indian woman. Denim or Y2K styling, metallic details, glossy textures, bright studio lighting, slightly cool palette, and subtle digital noise. Natural skin tone and realistic facial features.',
    hidden: true,
  },
  {
    slug: 'action-figure',
    name: 'Action Figure Toy Box',
    description: 'Collectible boxed toy with your look on the figure.',
    prompt:
      'Place the person from the reference as a collectible action figure inside clear toy packaging with accessories. Keep face and outfit recognizable on the figure. Studio product lighting, playful diorama props, no readable brand names.',
    avoid: 'Readable text, logos, watermarks, real trademarked characters, or distorted facial features.',
    coverPrompt:
      'Collectible action-hero toy figure styled as an Indian hero, sealed in clear toy packaging with accessories. Studio product lighting, playful diorama props, no readable brand names or logos on the box.',
    hidden: true,
  },
  {
    slug: 'cinematic-poster',
    name: 'Cinematic Movie Poster',
    description: 'Moody indie poster grade with cinematic shadows.',
    prompt:
      'Create a dramatic indie movie-poster portrait from the reference. Preserve identity and likeness. Cinematic shadows, subtle grain, moody colour grade, atmospheric background, heroic but natural framing. Do not invent a movie title.',
    avoid: 'Readable title text, credits, watermarks, logos, or blockbuster superhero tropes unless implied by the reference.',
    coverPrompt:
      'Dramatic Bollywood-style movie-poster portrait of an Indian man. Cinematic shadows, subtle grain, moody colour grade, atmospheric background, heroic but natural framing. No title text, credits, or watermarks.',
    hidden: true,
  },
  {
    slug: 'retro-film',
    name: 'Retro Film Memory',
    description: 'Faded disposable-camera candour with dusty warmth.',
    prompt:
      'Make the reference feel like a faded disposable-camera memory. Preserve face and identity. Dusty grain, soft blur, light leak, warm tones, candid framing, and a subtle date-stamp mood without readable text.',
    avoid: 'Readable date stamps, text, watermarks, smartphones, or sharp digital clarity.',
    coverPrompt:
      'Candid outdoor picnic scene with an Indian woman, photographed like a faded disposable-camera memory. Dusty grain, soft blur, light leak, warm tones, and natural framing. No readable text or date stamps.',
    hidden: true,
  },
];

export function themeIdForUser(slug: string, userId: string) {
  return `${slug}-${userId}`;
}

export function coverPromptForThemeId(themeId: string, userId: string): string | undefined {
  const seed = THEME_SEEDS.find(s => themeId === s.slug || themeId === `theme:${s.slug}` || themeIdForUser(s.slug, userId) === themeId);
  return seed?.coverPrompt;
}

export function slugFromThemeId(themeId: string): string | undefined {
  const seed = THEME_SEEDS.find(s => themeId === s.slug || themeId === `theme:${s.slug}` || themeId.startsWith(`${s.slug}-`));
  return seed?.slug;
}

export function visiblePublicThemes(): ThemeSeed[] {
  return THEME_SEEDS.filter(s => !s.hidden);
}
