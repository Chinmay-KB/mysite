import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from 'cloudflare:workers';
import { boundedBytes, DEFAULT_IMAGE_MODEL, imageApiKeys, makeVariants, now, ownAsset, parentReferenceObject, providerAspectRatio, referenceObject, type AppEnv, type GenerationRow } from './core';
import type { GenerationInput } from '../shared/types';
import { slugFromThemeId, visiblePublicThemes } from './themeSeeds';

export interface GenerationParams { generationId: string }
interface Snapshot { input: GenerationInput; compiledPrompt: string }
function toBase64(bytes: ArrayBuffer) {
  const data = new Uint8Array(bytes); let binary = '';
  for (let i = 0; i < data.length; i += 8192) binary += String.fromCharCode(...data.subarray(i,i+8192));
  return btoa(binary);
}

export class GenerationWorkflow extends WorkflowEntrypoint<AppEnv, GenerationParams> {
  async run(event: WorkflowEvent<GenerationParams>, step: WorkflowStep) {
    const generationId = event.payload.generationId;
    try {
      const generation = await step.do('load-generation', async () => {
        const row = await this.env.DB.prepare('SELECT * FROM generations WHERE id=?').bind(generationId).first<GenerationRow>();
        if (!row) throw new Error('Generation not found'); return row;
      });
      const snapshot = JSON.parse(generation.snapshot) as Snapshot;
      const rawKey = `jobs/${generationId}/response.json`;
      await step.do('request-image', { retries: { limit: 0, delay: '1 second', backoff: 'constant' }, timeout: '10 minutes' }, async () => {
        if (await this.env.MEDIA.head(rawKey)) return;
        // Persist a claim before calling the provider. A resumed/ambiguous attempt must never issue a second paid call.
        const claim = await this.env.DB.prepare("UPDATE generations SET attempted_at=?,status='generating',updated_at=? WHERE id=? AND attempted_at IS NULL").bind(now(),now(),generationId).run();
        if (!claim.meta.changes) throw new Error('The previous request was interrupted. Start a new variation to try again.');
        const input = snapshot.input;
        const endpointResponse = await fetch(`https://openrouter.ai/api/v1/images/models/${input.model}/endpoints`, { signal: AbortSignal.timeout(20000) });
        if (!endpointResponse.ok) {
          console.log(JSON.stringify({ event: 'openrouter_endpoints_status', generationId, model: input.model, status: endpointResponse.status }));
          await endpointResponse.body?.cancel();
          throw new Error('The selected model is temporarily unavailable. Try another model.');
        }
        const endpointData = JSON.parse(new TextDecoder().decode(await boundedBytes(endpointResponse.body, 1024*1024))) as {endpoints: {provider_tag: string | null; supported_parameters: Record<string,{values?: string[];max?:number}>}[]};
        const endpoint = endpointData.endpoints.find(e => {
          if (!e.provider_tag) return false;
          const aspectValues = e.supported_parameters.aspect_ratio?.values ?? ['1:1'];
          const providerAspect = providerAspectRatio(input.aspectRatio, aspectValues);
          if (!aspectValues.includes(providerAspect)) return false;
          return (e.supported_parameters.input_references?.max ?? 0) >= input.referenceIds.length;
        });
        if (!endpoint) throw new Error('No provider supports these references and image shape. Try fewer references or a different model.');
        const aspectValues = endpoint.supported_parameters.aspect_ratio?.values ?? ['1:1'];
        const aspectRatio = providerAspectRatio(input.aspectRatio, aspectValues);
        const references: {type:'image_url';image_url:{url:string}}[] = []; let referenceBytes = 0;
        for (const refId of input.referenceIds) {
          const asset = await ownAsset(this.env, generation.user_id, refId, true);
          const loaded =
            input.parentAssetId && refId === input.parentAssetId
              ? await parentReferenceObject(this.env, asset)
              : await referenceObject(this.env, asset.object_key);
          if (!loaded) throw new Error('A reference image is unavailable. Please select it again.');
          referenceBytes += loaded.object.size;
          if (referenceBytes > 8 * 1024 * 1024) throw new Error('These references are too large together. Try fewer images.');
          references.push({ type: 'image_url', image_url: { url: `data:${loaded.mime};base64,${toBase64(await loaded.object.arrayBuffer())}` } });
        }
        const requestBody: Record<string, unknown> = {
          model: input.model,
          prompt: snapshot.compiledPrompt,
          aspect_ratio: aspectRatio,
          n: 1,
          input_references: references,
          provider: { only: [endpoint.provider_tag], allow_fallbacks: false },
        };
        if (input.model === DEFAULT_IMAGE_MODEL) requestBody.quality = 'high';
        // Try the primary key first; on key/credit/rate-limit rejections fall
        // back to the backup key once. A rejected attempt produces no image
        // (and no charge), so retrying with the other key is safe. Only the
        // key label and status are logged — never key material.
        const apiKeys = imageApiKeys(this.env);
        let response: Response | null = null;
        let lastStatus = 0;
        for (const [index, apiKey] of apiKeys.entries()) {
          const attempt = await fetch('https://openrouter.ai/api/v1/images', {
            method:'POST', signal:AbortSignal.timeout(540000),
            headers:{Authorization:`Bearer ${apiKey}`, 'Content-Type':'application/json'},
            body:JSON.stringify(requestBody),
          });
          if (attempt.ok) { response = attempt; break; }
          lastStatus = attempt.status;
          await attempt.body?.cancel();
          console.log(JSON.stringify({ event: 'openrouter_images_status', generationId, model: input.model, provider: endpoint.provider_tag, status: lastStatus, key: index === 0 ? 'primary' : 'backup' }));
          if ((lastStatus === 401 || lastStatus === 402 || lastStatus === 429) && index + 1 < apiKeys.length) continue;
          throw new Error(lastStatus === 429 ? 'The image model is busy. Try again in a little while.' : lastStatus === 401 ? 'The studio image key was rejected. The owner needs to store a valid key.' : lastStatus === 402 ? 'The studio image account is out of credit. The owner needs to top it up.' : 'The model could not complete this image. Try another prompt or model.');
        }
        if (!response) throw new Error('Image generation is not connected yet. You can still save references and themes.');
        // Store the bounded provider response before further processing. Subsequent steps never regenerate it.
        const bytes = await boundedBytes(response.body, 24 * 1024 * 1024);
        await this.env.MEDIA.put(rawKey,bytes,{httpMetadata:{contentType:'application/json'}});
      });
      const assetMeta = await step.do('save-original', async () => {
        await this.env.DB.prepare("UPDATE generations SET status='saving',updated_at=? WHERE id=?").bind(now(),generationId).run();
        const saved = await this.env.MEDIA.get(rawKey); if (!saved) throw new Error('The image response could not be recovered.');
        const data = await saved.json<{data?:{b64_json?:string;media_type?:string}[]}>();
        const output = data.data?.[0];
        if (!output?.b64_json || output.b64_json.length > 20*1024*1024) throw new Error('The model returned no supported image. Try again with a different model.');
        const binary = atob(output.b64_json); const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
        const mime = output.media_type ?? 'image/png';
        if (!['image/png','image/jpeg','image/webp','image/avif'].includes(mime)) throw new Error('The model returned an unsupported image format.');
        const info = await this.env.IMAGES.info(new Blob([bytes]).stream());
        if (!('width' in info) || !info.width || !info.height) throw new Error('The generated image could not be read.');
        const key = `users/${generation.user_id}/${generationId}/original`;
        await this.env.MEDIA.put(key,bytes,{httpMetadata:{contentType:mime}});
        return {key,mime,width:info.width,height:info.height,bytes:bytes.byteLength};
      });
      await step.do('create-previews', async () => { await makeVariants(this.env,assetMeta.key); });
      await step.do('publish-result', async () => {
        const statements = [
          this.env.DB.prepare("INSERT OR IGNORE INTO assets (id,user_id,kind,name,object_key,mime,width,height,bytes,generation_id) VALUES (?,?,'generated',?,?,?,?,?,?,?)").bind(generationId,generation.user_id,generation.prompt.slice(0,100),assetMeta.key,assetMeta.mime,assetMeta.width,assetMeta.height,assetMeta.bytes,generationId),
          this.env.DB.prepare("UPDATE generations SET status='ready',output_asset_id=?,error=NULL,updated_at=? WHERE id=?").bind(generationId,now(),generationId),
        ];
        if (generation.purpose === 'theme_cover' && generation.theme_id) {
          statements.push(this.env.DB.prepare("UPDATE themes SET cover_asset_id=?, updated_at=? WHERE id=?").bind(generationId, now(), generation.theme_id));
          const slug = slugFromThemeId(generation.theme_id);
          if (slug && visiblePublicThemes().some(s => s.slug === slug)) {
            const thumb = await this.env.MEDIA.get(`${assetMeta.key}/thumb.webp`);
            if (thumb) {
              await this.env.MEDIA.put(`public/covers/${slug}/thumb.webp`, thumb.body, { httpMetadata: { contentType: 'image/webp' } });
            }
          }
        }
        await this.env.DB.batch(statements);
      });
      await step.do('discard-provider-envelope', async () => { await this.env.MEDIA.delete(rawKey); });
    } catch (error) {
      await step.do('record-failure', async () => {
        const message = error instanceof Error ? error.message : 'Generation was interrupted. Try a new variation.';
        // Only controlled, user-facing messages are retained. Infrastructure exceptions never expose internals.
        const safe = /^(The |A reference|These references|No provider)/.test(message) ? message.slice(0,300) : 'Generation was interrupted. Your references are saved. Try a new variation.';
        await this.env.DB.prepare("UPDATE generations SET status='failed',error=?,updated_at=? WHERE id=? AND status!='ready'").bind(safe,now(),generationId).run();
        console.error(JSON.stringify({event:'generation_failed',generationId}));
      });
    }
  }
}
