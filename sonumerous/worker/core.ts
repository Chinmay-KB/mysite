import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { Asset, Generation, Model } from '../shared/types';

export interface AppEnv extends Omit<Env, 'LOCAL_DEV' | 'ACCESS_DOMAIN' | 'ACCESS_AUD'> { OPENROUTER_API_KEY?: string; OPENROUTER_API_KEY_BACKUP?: string; LOCAL_DEV: string; ACCESS_DOMAIN: string; ACCESS_AUD: string }
export interface AssetRow extends Asset { user_id: string; object_key: string; bytes: number; sha256: string | null }
export interface GenerationRow extends Generation { user_id: string; attempted_at: string | null; request_key: string; theme_id: string | null; purpose: 'user' | 'theme_cover' }
export class ApiError extends Error { constructor(public status: number, message: string) { super(message); } }
export const id = () => crypto.randomUUID();
export const now = () => new Date().toISOString();

/** Image provider keys in priority order: primary first, backup as fallback. Values are never logged. */
export function imageApiKeys(env: AppEnv): string[] {
  return [env.OPENROUTER_API_KEY, env.OPENROUTER_API_KEY_BACKUP].filter((key): key is string => !!key);
}

export function imageGenerationReady(env: AppEnv): boolean {
  return imageApiKeys(env).length > 0;
}
export async function digest(bytes: ArrayBuffer) { return [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(b => b.toString(16).padStart(2, '0')).join(''); }

export async function identity(request: Request, env: AppEnv) {
  const host = new URL(request.url).hostname;
  if (env.LOCAL_DEV === 'true' && ['127.0.0.1', 'localhost', '[::1]'].includes(host)) return { id: 'local-user', email: 'studio@localhost' };
  if (!env.ACCESS_DOMAIN || !env.ACCESS_AUD) return null;
  const token = request.headers.get('Cf-Access-Jwt-Assertion');
  if (!token) return null;
  try {
    const issuer = `https://${env.ACCESS_DOMAIN}`;
    const keys = createRemoteJWKSet(new URL(`${issuer}/cdn-cgi/access/certs`));
    const audiences = env.ACCESS_AUD.split(',').map(s => s.trim()).filter(Boolean);
    const { payload } = await jwtVerify(token, keys, { issuer, audience: audiences, algorithms: ['RS256'] });
    if (typeof payload.sub !== 'string' || typeof payload.email !== 'string') return null;
    return { id: payload.sub, email: payload.email };
  } catch { return null; }
}

export async function boundedBytes(stream: ReadableStream<Uint8Array> | null, max: number): Promise<ArrayBuffer> {
  if (!stream) throw new ApiError(400, 'No file was received.');
  const reader = stream.getReader(); const chunks: Uint8Array[] = []; let length = 0;
  try {
    while (true) {
      const { value, done } = await reader.read(); if (done) break;
      length += value.byteLength;
      if (length > max) { await reader.cancel(); throw new ApiError(413, `The file is too large. Please use an image under ${Math.round(max / 1024 / 1024)} MB.`); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const output = new Uint8Array(length); let offset = 0;
  for (const chunk of chunks) { output.set(chunk, offset); offset += chunk.length; }
  return output.buffer;
}

export async function ownAsset(env: AppEnv, userId: string, assetId: string, allowAnnotation = false) {
  const row = await env.DB.prepare('SELECT * FROM assets WHERE id = ? AND user_id = ?').bind(assetId, userId).first<AssetRow>();
  if (!row || (!allowAnnotation && row.kind === 'annotation')) throw new ApiError(404, 'This image could not be found.');
  return row;
}

/** Default image model for template and refine generations. */
export const DEFAULT_IMAGE_MODEL = 'openai/gpt-image-2.5-sunburst';

/** Parent facial reference: use full original up to this size, else the 1024px reference.webp variant. */
export const PARENT_REFERENCE_MAX_BYTES = 12 * 1024 * 1024;

export const UPLOAD_COMPRESS_MAX_BYTES = 4 * 1024 * 1024;
export const UPLOAD_COMPRESS_MAX_EDGE = 2048;

export interface PreparedUpload {
  bytes: Uint8Array;
  mime: string;
  width: number;
  height: number;
}

/** Downscale oversized uploads before storage; hash and store the prepared bytes. */
export async function prepareUploadImage(env: AppEnv, raw: ArrayBuffer, mime: string): Promise<PreparedUpload> {
  let info;
  try {
    info = await env.IMAGES.info(new Blob([raw]).stream());
  } catch {
    throw new ApiError(400, 'This image could not be read. Try exporting it as a JPG or PNG.');
  }
  if (!('width' in info) || !info.width || !info.height || info.width * info.height > 40_000_000) {
    throw new ApiError(400, 'Please use a raster image under 40 megapixels.');
  }
  const longEdge = Math.max(info.width, info.height);
  const needsCompress = longEdge > UPLOAD_COMPRESS_MAX_EDGE || raw.byteLength > UPLOAD_COMPRESS_MAX_BYTES;
  if (!needsCompress) {
    return { bytes: new Uint8Array(raw), mime, width: info.width, height: info.height };
  }
  const response = (await env.IMAGES.input(new Blob([raw]).stream())
    .transform({ width: UPLOAD_COMPRESS_MAX_EDGE, fit: 'scale-down' })
    .output({ format: 'image/webp', quality: 82 })).response();
  const out = new Uint8Array(await boundedBytes(response.body, 20 * 1024 * 1024));
  const outInfo = await env.IMAGES.info(new Blob([out]).stream());
  if (!('width' in outInfo) || !outInfo.width || !outInfo.height) {
    throw new ApiError(400, 'This image could not be processed. Try a smaller JPG or PNG.');
  }
  return { bytes: out, mime: 'image/webp', width: outInfo.width, height: outInfo.height };
}

/**
 * Map requested aspect to a provider-supported ratio. Studio keeps 4:5 in DB; Sunburst endpoints use 3:4.
 */
export function providerAspectRatio(requested: string, supportedValues: string[]): string {
  if (supportedValues.includes(requested)) return requested;
  if (requested === '4:5' && supportedValues.includes('3:4')) return '3:4';
  return requested;
}

function catalogRatiosForModel(modelId: string, values: string[]): string[] {
  const ratios = [...values];
  if (modelId === DEFAULT_IMAGE_MODEL && !ratios.includes('4:5')) ratios.push('4:5');
  return ratios;
}

/** Reference payload for OpenRouter: prefer the reference variant, fall back to the original bytes. */
export async function referenceObject(env: AppEnv, objectKey: string) {
  const variant = await env.MEDIA.get(`${objectKey}/reference.webp`);
  if (variant) return { object: variant, mime: 'image/webp' as const };
  const original = await env.MEDIA.get(objectKey);
  if (!original) return null;
  const mime = original.httpMetadata?.contentType;
  const safeMime = mime && ['image/png', 'image/jpeg', 'image/webp', 'image/avif'].includes(mime) ? mime : 'image/png';
  return { object: original, mime: safeMime };
}

/** Subject parent reference: full original when within size cap, otherwise the downscaled reference variant. */
export async function parentReferenceObject(env: AppEnv, asset: AssetRow) {
  if (asset.bytes <= PARENT_REFERENCE_MAX_BYTES) {
    const original = await env.MEDIA.get(asset.object_key);
    if (original) {
      const mime = original.httpMetadata?.contentType;
      const safeMime = mime && ['image/png', 'image/jpeg', 'image/webp', 'image/avif'].includes(mime) ? mime : asset.mime;
      return { object: original, mime: safeMime };
    }
  }
  return referenceObject(env, asset.object_key);
}

export async function makeVariants(env: AppEnv, objectKey: string) {
  for (const [suffix, width, quality] of [['thumb', 400, 76], ['preview', 1400, 85], ['reference', 1024, 85]] as const) {
    const key = `${objectKey}/${suffix}.webp`;
    if (await env.MEDIA.head(key)) continue;
    const original = await env.MEDIA.get(objectKey);
    if (!original) throw new Error('Original missing');
    try {
      const response = (await env.IMAGES.input(original.body).transform({ width, fit: 'scale-down' }).output({ format: 'image/webp', quality })).response();
      await env.MEDIA.put(key, response.body, { httpMetadata: { contentType: 'image/webp' } });
    } catch (error) {
      if (env.LOCAL_DEV !== 'true') throw error;
      // Local wrangler often lacks remote Images transforms; variants are optional and media falls back to the original.
    }
  }
}

const allowedModels: Record<string, [string, string]> = {
  'openai/gpt-image-2.5-sunburst': ['GPT Image 2.5 Sunburst', 'Precision portraits and strong face adherence'],
  'google/gemini-3.1-flash-image': ['Nano Banana 2', 'A versatile starting point'],
  'google/gemini-3-pro-image': ['Nano Banana Pro', 'For considered details'],
  'openai/gpt-image-2.5-flare': ['GPT Image 2.5 Flare', 'OpenAI image generation'],
};
interface Capability { type: string; values?: string[]; min?: number; max?: number }
interface CatalogEntry { id: string; supported_parameters: Record<string, Capability> }
export async function models(env: AppEnv): Promise<Model[]> {
  const cache = await env.DB.prepare('SELECT data, updated_at FROM model_cache WHERE id = ?').bind('images').first<{ data: string; updated_at: number }>();
  if (cache && Date.now() - cache.updated_at < 3_600_000) return JSON.parse(cache.data);
  try {
    const response = await fetch('https://openrouter.ai/api/v1/images/models', { signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error('Model catalogue unavailable');
    const data = JSON.parse(new TextDecoder().decode(await boundedBytes(response.body, 4 * 1024 * 1024))) as { data: CatalogEntry[] };
    const result = Object.entries(allowedModels).flatMap(([modelId, [name, description]]) => {
      const entry = data.data.find(m => m.id === modelId); if (!entry) return [];
      const catalogRatios = entry.supported_parameters.aspect_ratio?.values ?? ['1:1'];
      return [{ id: modelId, name, description, ratios: catalogRatiosForModel(modelId, catalogRatios), maxReferences: entry.supported_parameters.input_references?.max ?? 0 }];
    });
    if (!result.length) throw new Error('No supported image models are available');
    await env.DB.prepare('INSERT INTO model_cache VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at').bind('images', JSON.stringify(result), Date.now()).run();
    return result;
  } catch (e) { if (cache) return JSON.parse(cache.data); throw new ApiError(503, 'Image models are temporarily unavailable. Try again in a moment.'); }
}

export function publicAsset(row: AssetRow): Asset {
  const { id, name, kind, mime, width, height, favourite, generation_id, created_at } = row;
  return { id, name, kind, mime, width, height, favourite, generation_id, created_at };
}
