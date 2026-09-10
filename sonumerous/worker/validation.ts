import { z } from 'zod';

export const regionSchema = z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1), width: z.number().positive().max(1), height: z.number().positive().max(1) }).refine(r => r.x + r.width <= 1.001 && r.y + r.height <= 1.001, 'Selection must be inside the image');
export const generationSchema = z.object({
  prompt: z.string().trim().min(1, 'Describe what you would like to make.').max(6000),
  model: z.string().min(1).max(100), aspectRatio: z.string().max(12), referenceIds: z.array(z.string().uuid()).max(8),
  themeId: z.string().max(100).nullable(), themePrompt: z.string().max(6000), avoid: z.string().max(2000),
  parentAssetId: z.string().uuid().nullable(), preserve: z.string().max(3000), annotationAssetId: z.string().uuid().nullable(),
  region: regionSchema.nullable(), usePreferences: z.boolean(), requestKey: z.string().uuid(),
}).refine(v => (!v.region && !v.annotationAssetId) || (!!v.region && !!v.annotationAssetId && !!v.parentAssetId), 'An area edit needs its original image and selection.');
export const themeSchema = z.object({ name: z.string().trim().min(1).max(80), description: z.string().trim().max(200), prompt: z.string().trim().min(1).max(6000), avoid: z.string().max(2000) });
export const preferenceSchema = z.object({ text: z.string().trim().min(1).max(1000), themeId: z.string().max(100).nullable(), sourceEditId: z.string().uuid().nullable().optional() });

export function buildReferenceIds(input: Pick<z.infer<typeof generationSchema>, 'parentAssetId' | 'annotationAssetId' | 'referenceIds'>) {
  return [...new Set([input.parentAssetId, input.annotationAssetId, ...input.referenceIds].filter((v): v is string => !!v))];
}

export const PROPORTIONS_ANCHOR =
  'MUST respect the natural proportions of the body and face. No slimming, no enlarging, no reshaping.';

export function composePrompt(input: z.infer<typeof generationSchema>, preferences: string[]): string {
  return [
    input.parentAssetId
      ? 'Edit the first reference image. Preserve its identity and composition unless explicitly asked otherwise.\n\nMatch the exact face: same eyes, nose, lips, face shape, skin tone, age. Do not beautify into a different person.'
      : 'Create one image following this creative brief.',
    input.themePrompt && `Creative direction:\n${input.themePrompt}`,
    `Requested ${input.parentAssetId ? 'changes' : 'image'}:\n${input.prompt}`,
    input.preserve && `Keep unchanged:\n${input.preserve}`,
    input.avoid && `Avoid:\n${input.avoid}`,
    input.region && `The second reference marks the edit area with a red rectangle. Change the contents of that area. Do not reproduce the annotation. Normalized area: ${JSON.stringify(input.region)}. Keep the surrounding image as close to the original as possible.`,
    preferences.length && `Remembered preferences (the explicit request above takes priority):\n${preferences.join('\n')}`,
    PROPORTIONS_ANCHOR,
  ].filter(Boolean).join('\n\n');
}
