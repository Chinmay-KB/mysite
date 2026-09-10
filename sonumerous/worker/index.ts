import { Hono } from 'hono';
import { z } from 'zod';
import { ApiError, boundedBytes, digest, id, identity, imageGenerationReady, makeVariants, models, now, ownAsset, prepareUploadImage, publicAsset, type AppEnv, type AssetRow, type GenerationRow } from './core';
import { buildReferenceIds, composePrompt, generationSchema, preferenceSchema, themeSchema } from './validation';
import type { GenerationInput, Preference, Theme } from '../shared/types';
import { coverPromptForThemeId } from './themeSeeds';
export { GenerationWorkflow } from './workflow';

const app = new Hono<{ Bindings: AppEnv; Variables: { user: { id: string; email: string } } }>();

function fallbackCover(slug: string) {
  const palettes: Record<string, [string, string]> = {
    eighties: ['#d86b4f', '#f4c98d'],
    studio: ['#202020', '#8c8c86'],
    scribbles: ['#6d806f', '#d9e4c9'],
    'fix-lighting': ['#d8a45d', '#f7e8c7'],
    wanderlust: ['#557b95', '#e8c995'],
  };
  const [from, to] = palettes[slug] ?? ['#6f6f6b', '#e8e8e4'];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" role="img" aria-label="${slug} cover"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs><rect width="800" height="800" fill="url(#g)"/><circle cx="610" cy="180" r="170" fill="#fff" opacity=".14"/><circle cx="210" cy="650" r="250" fill="#171717" opacity=".12"/><path d="M0 570C180 470 310 520 440 610s250 95 360-10V800H0Z" fill="#171717" opacity=".16"/><text x="56" y="718" fill="#fff" font-family="system-ui,sans-serif" font-size="34" font-weight="650" letter-spacing="1">${slug.replace('-', ' ')}</text></svg>`;
}

app.onError((error, c) => {
  if (error instanceof z.ZodError) return c.json({ error: error.issues[0]?.message ?? 'Check your inputs.' }, 400);
  if (error instanceof ApiError) return new Response(JSON.stringify({ error: error.message }), { status: error.status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
  console.error(JSON.stringify({ event: 'request_failed', path: c.req.path, error: error instanceof Error ? error.name : 'UnknownError' }));
  return c.json({ error: 'Something went wrong. Your saved images are safe. Please try again.' }, 500);
});
app.use('*', async (c, next) => {
  c.header('X-Content-Type-Options', 'nosniff'); c.header('Referrer-Policy', 'same-origin');
  c.header('Cache-Control', 'no-store');
  if (!['GET', 'HEAD', 'OPTIONS'].includes(c.req.method)) {
    const url = new URL(c.req.url);
    const origin = c.req.header('Origin');
    const localHost = c.env.LOCAL_DEV === 'true' && ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname);
    const localOrigin = c.env.LOCAL_DEV === 'true' && !!origin && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
    if (!localHost && !localOrigin && origin !== url.origin) throw new ApiError(403, 'Please reload the studio before trying again.');
  }
  await next();
});
async function publicThemes(c: { env: AppEnv; header: (name: string, value: string) => void; json: (data: unknown) => Response | Promise<Response> }) {
  const rows = (await c.env.DB.prepare(
    "SELECT id,name,description FROM themes WHERE scope='global' AND hidden=0 ORDER BY rowid",
  ).all<Pick<Theme, 'id' | 'name' | 'description'>>()).results;
  const themes = rows.map(theme => ({
    slug: theme.id.replace(/^theme:/, ''),
    name: theme.name,
    description: theme.description,
    coverUrl: `/public/covers/${theme.id.replace(/^theme:/, '')}`,
  }));
  c.header('Cache-Control', 'public, max-age=300, s-maxage=600');
  return c.json(themes);
}

// Public catalogue for the logged-out landing page. It lives outside /api/*
// (and outside Access protection) so anonymous visitors can see templates.
app.get('/public/themes', async c => publicThemes(c));
// Backwards-compatible alias for authenticated callers.
app.get('/api/public/themes', async c => publicThemes(c));

app.get('/public/covers/:slug', async c => {
  const slug = c.req.param('slug');
  const theme = await c.env.DB.prepare(
    "SELECT id FROM themes WHERE id=? AND scope='global' AND hidden=0",
  ).bind(`theme:${slug}`).first<{ id: string }>();
  if (!theme) throw new ApiError(404, 'Cover not found.');
  const key = `public/covers/${slug}/thumb.webp`;
  const object = await c.env.MEDIA.get(key);
  if (!object) {
    return new Response(fallbackCover(slug), {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=300, s-maxage=600',
        ETag: `W/"fallback-${slug}"`,
        'X-Content-Type-Options': 'nosniff',
      },
    });
  }
  const headers = new Headers({
    'Content-Type': 'image/webp',
    'Cache-Control': 'public, max-age=3600',
    'ETag': object.httpEtag,
    'X-Content-Type-Options': 'nosniff',
  });
  if (c.req.header('If-None-Match') === object.httpEtag) return new Response(null, { status: 304, headers });
  return new Response(object.body, { headers });
});

app.get('/api/session', async c => {
  const user = await identity(c.req.raw, c.env);
  const loginUrl = c.env.ACCESS_AUD ? `/cdn-cgi/access/login?redirect_url=${encodeURIComponent('/app/')}` : undefined;
  if (!user) return c.json({ authenticated: false, loginUrl });
  await c.env.DB.prepare('INSERT INTO users (id, email) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET email=excluded.email').bind(user.id, user.email).run();
  return c.json({ authenticated: true, email: user.email, generationReady: imageGenerationReady(c.env), local: c.env.LOCAL_DEV === 'true' });
});
app.use('/api/*', async (c, next) => { const user = await identity(c.req.raw, c.env); if (!user) throw new ApiError(401, 'Your session has ended. Sign in again to continue.'); c.set('user', user); await next(); });
app.use('/media/*', async (c, next) => { const user = await identity(c.req.raw, c.env); if (!user) throw new ApiError(401, 'Sign in to view this image.'); c.set('user', user); await next(); });

async function jsonBody(request: Request) {
  const text = new TextDecoder().decode(await boundedBytes(request.body, 40 * 1024));
  if (!text.trim()) throw new ApiError(400, 'Request body is required.');
  try {
    return JSON.parse(text);
  } catch {
    throw new ApiError(400, 'Request body must be valid JSON.');
  }
}

app.get('/api/models', async c => c.json(await models(c.env)));
app.get('/api/themes', async c => {
  const user = c.get('user');
  const rows = (await c.env.DB.prepare(
    "SELECT * FROM themes WHERE hidden=0 AND (scope='global' OR (scope='user' AND user_id=?)) ORDER BY scope='global' DESC, updated_at DESC",
  ).bind(user.id).all<Theme>()).results;
  const enriched = await Promise.all(rows.map(async theme => {
    let cover = null;
    if (theme.cover_asset_id && theme.scope !== 'global') {
      try { cover = publicAsset(await ownAsset(c.env, user.id, theme.cover_asset_id)); } catch { cover = null; }
    }
    // Global themes use shared public cover art (no per-user asset needed).
    const coverUrl = theme.scope === 'global' ? `/public/covers/${theme.id.replace(/^theme:/, '')}` : null;
    return { ...theme, cover, coverUrl };
  }));
  return c.json(enriched);
});
app.post('/api/themes/:id/cover', async c => {
  const user = c.get('user');
  const themeId = c.req.param('id');
  const theme = await c.env.DB.prepare(
    "SELECT * FROM themes WHERE id=? AND hidden=0 AND (scope='global' OR (scope='user' AND user_id=?))",
  ).bind(themeId, user.id).first<Theme>();
  if (!theme) throw new ApiError(404, 'Theme not found.');
  if (theme.cover_asset_id) return c.json({ ok: true, coverAssetId: theme.cover_asset_id });
  if (!imageGenerationReady(c.env)) throw new ApiError(503, 'Image generation is not connected yet. You can still save references and themes.');
  const inflight = theme.scope === 'global'
    ? await c.env.DB.prepare("SELECT * FROM generations WHERE theme_id=? AND purpose='theme_cover' AND status IN ('queued','generating','saving') LIMIT 1").bind(themeId).first<GenerationRow>()
    : await c.env.DB.prepare("SELECT * FROM generations WHERE user_id=? AND theme_id=? AND purpose='theme_cover' AND status IN ('queued','generating','saving') LIMIT 1").bind(user.id, themeId).first<GenerationRow>();
  if (inflight) return c.json(inflight, 202);
  const model = (await models(c.env))[0];
  if (!model) throw new ApiError(503, 'Image generation is not connected yet.');
  const generationId = id();
  const created = now();
  const requestKey = id();
  const coverThemePrompt = coverPromptForThemeId(theme.id, user.id) ?? theme.prompt;
  const input: GenerationInput = {
    prompt: theme.description.trim() || theme.name,
    model: model.id,
    aspectRatio: theme.default_aspect ?? '1:1',
    referenceIds: [],
    themeId: theme.id,
    themePrompt: coverThemePrompt,
    avoid: theme.avoid,
    parentAssetId: null,
    preserve: '',
    annotationAssetId: null,
    region: null,
    usePreferences: false,
    requestKey,
  };
  const snapshot = { input: { ...input, referenceIds: [] }, theme, preferences: [], compiledPrompt: composePrompt(input, []) };
  const insert = theme.scope === 'global' ? 'INSERT OR IGNORE' : 'INSERT';
  await c.env.DB.prepare(`${insert} INTO generations (id,user_id,root_id,parent_asset_id,theme_id,snapshot,model,prompt,status,request_key,purpose,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(generationId, user.id, generationId, null, theme.id, JSON.stringify(snapshot), model.id, input.prompt, 'queued', requestKey, 'theme_cover', created, created).run();
  const saved = theme.scope === 'global'
    ? await c.env.DB.prepare("SELECT * FROM generations WHERE theme_id=? AND purpose='theme_cover' ORDER BY created_at LIMIT 1").bind(theme.id).first<GenerationRow>()
    : await c.env.DB.prepare('SELECT * FROM generations WHERE id=?').bind(generationId).first<GenerationRow>();
  if (!saved) throw new Error('Cover generation metadata missing');
  await c.env.GENERATE.createBatch([{ id: saved.id, params: { generationId: saved.id } }]);
  return c.json(saved, 202);
});
app.post('/api/themes', async c => {
  const data = themeSchema.parse(await jsonBody(c.req.raw)); const themeId = id();
  await c.env.DB.prepare("INSERT INTO themes (id,user_id,scope,name,description,prompt,avoid) VALUES (?,?,'user',?,?,?,?,?)").bind(themeId, c.get('user').id, data.name, data.description, data.prompt, data.avoid).run();
  return c.json({ id: themeId, ...data }, 201);
});
app.put('/api/themes/:id', async c => {
  const data = themeSchema.parse(await jsonBody(c.req.raw));
  const result = await c.env.DB.prepare("UPDATE themes SET name=?,description=?,prompt=?,avoid=?,updated_at=? WHERE id=? AND scope='user' AND user_id=?").bind(data.name, data.description, data.prompt, data.avoid, now(), c.req.param('id'), c.get('user').id).run();
  if (!result.meta.changes) throw new ApiError(404, 'Theme not found.');
  return c.json({ ok: true });
});

app.get('/api/assets', async c => {
  const kind = c.req.query('kind'); const q = (c.req.query('q') ?? '').slice(0, 150); const fav = c.req.query('favourite') === 'true';
  const cursor = c.req.query('cursor');
  let boundary: [string, string] | null = null;
  if (cursor) { try { boundary = z.tuple([z.string().max(40), z.string().uuid()]).parse(JSON.parse(atob(cursor))); } catch { throw new ApiError(400, 'Invalid page. Reload the library.'); } }
  const conditions = ['user_id=?', "kind != 'annotation'", "(generation_id IS NULL OR NOT EXISTS (SELECT 1 FROM generations g WHERE g.id = assets.generation_id AND g.purpose = 'theme_cover'))"]; const params: (string | number)[] = [c.get('user').id];
  if (kind === 'upload' || kind === 'generated') { conditions.push('kind=?'); params.push(kind); }
  if (q) { conditions.push('name LIKE ?'); params.push(`%${q}%`); }
  if (fav) conditions.push('favourite=1');
  if (boundary) { conditions.push('(created_at < ? OR (created_at = ? AND id < ?))'); params.push(boundary[0], boundary[0], boundary[1]); }
  const rows = (await c.env.DB.prepare(`SELECT * FROM assets WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC,id DESC LIMIT 49`).bind(...params).all<AssetRow>()).results;
  const items = rows.slice(0, 48); const last = items.at(-1);
  return c.json({ items: items.map(publicAsset), cursor: rows.length > 48 && last ? btoa(JSON.stringify([last.created_at, last.id])) : null });
});

app.post('/api/assets', async c => {
  const user = c.get('user');
  const mime = c.req.header('Content-Type')?.split(';')[0] ?? '';
  if (!['image/jpeg','image/png','image/webp','image/avif','image/heic','image/heif'].includes(mime)) throw new ApiError(400, 'Choose a JPG, PNG, WebP, AVIF, or HEIC image.');
  const rawBytes = await boundedBytes(c.req.raw.body, 20 * 1024 * 1024);
  const prepared = await prepareUploadImage(c.env, rawBytes, mime);
  const hash = await digest(prepared.bytes.slice().buffer);
  const kind = c.req.query('kind') === 'annotation' ? 'annotation' : 'upload';
  const existing = await c.env.DB.prepare('SELECT * FROM assets WHERE user_id=? AND sha256=? AND kind=?').bind(user.id, hash, kind).first<AssetRow>();
  if (existing) return c.json(publicAsset(existing));
  const assetId = id(); const key = `users/${user.id}/${assetId}/original`;
  await c.env.MEDIA.put(key, prepared.bytes, { httpMetadata: { contentType: prepared.mime } });
  try { await makeVariants(c.env, key); } catch {
    if (c.env.LOCAL_DEV !== 'true') throw new ApiError(503, 'Image processing is unavailable. Please try uploading again shortly.');
  }
  const name = (c.req.query('name') || 'Untitled image').slice(0, 180);
  // The uniqueness constraint also handles identical uploads arriving concurrently.
  await c.env.DB.prepare('INSERT OR IGNORE INTO assets (id,user_id,kind,name,object_key,mime,width,height,bytes,sha256) VALUES (?,?,?,?,?,?,?,?,?,?)').bind(assetId,user.id,kind,name,key,prepared.mime,prepared.width,prepared.height,prepared.bytes.byteLength,hash).run();
  const saved = await c.env.DB.prepare('SELECT * FROM assets WHERE user_id=? AND sha256=? AND kind=?').bind(user.id,hash,kind).first<AssetRow>();
  if (!saved) throw new Error('Upload metadata missing');
  if (saved.id !== assetId) await c.env.MEDIA.delete([key, ...['thumb','preview','reference'].map(s => `${key}/${s}.webp`)]);
  return c.json(publicAsset(saved), 201);
});

app.patch('/api/assets/:id', async c => {
  const data = z.object({ favourite: z.boolean().optional(), name: z.string().trim().min(1).max(180).optional() }).parse(await jsonBody(c.req.raw));
  const asset = await ownAsset(c.env,c.get('user').id,c.req.param('id'));
  await c.env.DB.prepare('UPDATE assets SET favourite=?,name=? WHERE id=? AND user_id=?').bind(data.favourite === undefined ? asset.favourite : Number(data.favourite), data.name ?? asset.name, asset.id, c.get('user').id).run();
  return c.json({ ok: true });
});

app.delete('/api/assets/:id', async c => {
  const user = c.get('user');
  const assetId = c.req.param('id');
  const asset = await ownAsset(c.env, user.id, assetId, true);
  await c.env.DB.batch([
    c.env.DB.prepare('UPDATE generations SET parent_asset_id = NULL WHERE parent_asset_id = ? AND user_id = ?').bind(assetId, user.id),
    c.env.DB.prepare('UPDATE generations SET output_asset_id = NULL WHERE output_asset_id = ? AND user_id = ?').bind(assetId, user.id),
    c.env.DB.prepare("UPDATE themes SET cover_asset_id = NULL WHERE cover_asset_id = ? AND (scope='global' OR user_id = ?)").bind(assetId, user.id),
    c.env.DB.prepare('UPDATE edits SET annotation_asset_id = NULL WHERE annotation_asset_id = ? AND user_id = ?').bind(assetId, user.id),
    c.env.DB.prepare('DELETE FROM edits WHERE parent_asset_id = ? AND user_id = ?').bind(assetId, user.id),
  ]);
  const result = await c.env.DB.prepare('DELETE FROM assets WHERE id = ? AND user_id = ?').bind(assetId, user.id).run();
  if (!result.meta.changes) throw new ApiError(404, 'This image could not be found.');
  try {
    await c.env.MEDIA.delete([asset.object_key, ...['thumb', 'preview', 'reference'].map(s => `${asset.object_key}/${s}.webp`)]);
  } catch { /* best effort */ }
  return c.json({ ok: true });
});
app.get('/media/:id/:variant', async c => {
  const asset = await ownAsset(c.env, c.get('user').id, c.req.param('id'), true);
  const variant = c.req.param('variant');
  if (!['original','thumb','preview','reference'].includes(variant)) throw new ApiError(404, 'Image size not found.');
  let key = variant === 'original' ? asset.object_key : `${asset.object_key}/${variant}.webp`;
  let object = await c.env.MEDIA.get(key);
  let contentType = variant === 'original' ? asset.mime : 'image/webp';
  if (!object && variant !== 'original') {
    key = asset.object_key;
    object = await c.env.MEDIA.get(key);
    contentType = asset.mime;
  }
  if (!object) throw new ApiError(404, 'Image is not ready yet. Try again shortly.');
  const headers = new Headers({ 'Content-Type': contentType, 'Cache-Control': 'private, max-age=3600', 'ETag': object.httpEtag, 'X-Content-Type-Options': 'nosniff' });
  if (c.req.query('download') === 'true') { headers.set('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(`${asset.name.replace(/\.[^.]+$/, '')}.${asset.mime.split('/')[1]}`)}`); headers.set('Cache-Control','private, no-store'); }
  if (c.req.header('If-None-Match') === object.httpEtag) return new Response(null, { status: 304, headers });
  return new Response(object.body, { headers });
});

app.get('/api/assets/:id', async c => {
  const user = c.get('user'); const asset = await ownAsset(c.env,user.id,c.req.param('id'));
  if (!(await c.env.MEDIA.head(`${asset.object_key}/thumb.webp`))) {
    try { await makeVariants(c.env, asset.object_key); } catch { /* optional in local dev */ }
  }
  const generation = asset.generation_id ? await c.env.DB.prepare('SELECT * FROM generations WHERE id=? AND user_id=?').bind(asset.generation_id,user.id).first<GenerationRow>() : null;
  const versions = generation ? (await c.env.DB.prepare("SELECT * FROM generations WHERE root_id=? AND user_id=? AND purpose='user' ORDER BY created_at").bind(generation.root_id,user.id).all<GenerationRow>()).results : [];
  const enriched = await Promise.all(versions.map(async g => ({ ...g, asset: g.output_asset_id ? publicAsset(await ownAsset(c.env,user.id,g.output_asset_id)) : null })));
  const edit = generation ? await c.env.DB.prepare('SELECT feedback FROM edits WHERE id=? AND user_id=?').bind(generation.id,user.id).first<{feedback: string | null}>() : null;
  let parentAsset = null;
  if (generation?.parent_asset_id) {
    try { parentAsset = publicAsset(await ownAsset(c.env, user.id, generation.parent_asset_id, true)); } catch { parentAsset = null; }
  }
  return c.json({ asset: publicAsset(asset), generation, versions: enriched, feedback: edit?.feedback ?? null, parentAsset });
});

app.get('/api/generations', async c => c.json((await c.env.DB.prepare("SELECT * FROM generations WHERE user_id=? AND purpose='user' ORDER BY created_at DESC LIMIT 30").bind(c.get('user').id).all<GenerationRow>()).results));
app.post('/api/generations', async c => {
  const input = generationSchema.parse(await jsonBody(c.req.raw)); const user = c.get('user');
  if (!imageGenerationReady(c.env)) throw new ApiError(503, 'Image generation is not connected yet. You can still save references and themes.');
  const existing = await c.env.DB.prepare('SELECT * FROM generations WHERE user_id=? AND request_key=?').bind(user.id,input.requestKey).first<GenerationRow>();
  if (existing) { if (existing.status === 'queued') await c.env.GENERATE.createBatch([{id:existing.id,params:{generationId:existing.id}}]); return c.json(existing,202); }
  const model = (await models(c.env)).find(m => m.id === input.model);
  if (!model) throw new ApiError(400, 'Choose an available image model.');
  if (!model.ratios.includes(input.aspectRatio)) throw new ApiError(400, 'This model does not support that image shape.');
  let parent: AssetRow | null = null; let rootId: string | null = null;
  if (input.parentAssetId) {
    parent = await ownAsset(c.env,user.id,input.parentAssetId);
    if (parent.generation_id) rootId = (await c.env.DB.prepare('SELECT root_id FROM generations WHERE id=? AND user_id=?').bind(parent.generation_id,user.id).first<{root_id:string}>())?.root_id ?? null;
  }
  const refIds = buildReferenceIds(input);
  if (refIds.length > model.maxReferences) throw new ApiError(400, `This model accepts up to ${model.maxReferences} reference images, including the original and selection.`);
  for (const refId of refIds) await ownAsset(c.env,user.id,refId,refId === input.annotationAssetId);
  let theme: Theme | null = null;
  if (input.themeId) {
    theme = await c.env.DB.prepare("SELECT * FROM themes WHERE id=? AND hidden=0 AND (scope='global' OR (scope='user' AND user_id=?))").bind(input.themeId,user.id).first<Theme>();
    if (!theme) throw new ApiError(404,'Theme not found.');
  }
  const preferences = input.usePreferences ? (await c.env.DB.prepare('SELECT * FROM preferences WHERE user_id=? AND (theme_id IS NULL OR theme_id=?) ORDER BY created_at LIMIT 50').bind(user.id,input.themeId).all<Preference>()).results : [];
  const generationId = id(); const created = now();
  const snapshot = { input: {...input, referenceIds: refIds}, theme, preferences, compiledPrompt: composePrompt(input,preferences.map(p => p.text)) };
  const statements = [c.env.DB.prepare("INSERT OR IGNORE INTO generations (id,user_id,root_id,parent_asset_id,theme_id,snapshot,model,prompt,status,request_key,purpose,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(generationId,user.id,rootId ?? generationId,input.parentAssetId,input.themeId,JSON.stringify(snapshot),input.model,input.prompt,'queued',input.requestKey,'user',created,created)];
  if (parent) statements.push(c.env.DB.prepare('INSERT OR IGNORE INTO edits (id,user_id,parent_asset_id,instruction,preserve_text,region_json,annotation_asset_id) SELECT id,?,?,?,?,?,? FROM generations WHERE id=?').bind(user.id,parent.id,input.prompt,input.preserve,input.region ? JSON.stringify(input.region) : null,input.annotationAssetId,generationId));
  await c.env.DB.batch(statements);
  const saved = await c.env.DB.prepare('SELECT * FROM generations WHERE user_id=? AND request_key=?').bind(user.id,input.requestKey).first<GenerationRow>();
  if (!saved) throw new Error('Generation metadata missing');
  // createBatch skips an already-created ID, including recovery from a lost HTTP response.
  await c.env.GENERATE.createBatch([{ id: saved.id, params: { generationId: saved.id } }]);
  return c.json(saved, 202);
});

app.get('/api/preferences', async c => c.json((await c.env.DB.prepare('SELECT * FROM preferences WHERE user_id=? ORDER BY created_at DESC').bind(c.get('user').id).all<Preference>()).results));
app.post('/api/preferences', async c => {
  const input = preferenceSchema.parse(await jsonBody(c.req.raw)); const user = c.get('user');
  if (input.themeId && !await c.env.DB.prepare("SELECT id FROM themes WHERE id=? AND hidden=0 AND (scope='global' OR (scope='user' AND user_id=?))").bind(input.themeId,user.id).first()) throw new ApiError(404,'Theme not found.');
  if (input.sourceEditId && !await c.env.DB.prepare('SELECT id FROM edits WHERE id=? AND user_id=?').bind(input.sourceEditId,user.id).first()) throw new ApiError(404,'Edit not found.');
  const prefId = id();
  await c.env.DB.prepare('INSERT INTO preferences (id,user_id,text,theme_id,source_edit_id) VALUES (?,?,?,?,?)').bind(prefId,user.id,input.text,input.themeId,input.sourceEditId ?? null).run();
  return c.json({ id:prefId },201);
});
app.put('/api/preferences/:id', async c => {
  const input = preferenceSchema.parse(await jsonBody(c.req.raw)); const user = c.get('user');
  if (input.themeId && !await c.env.DB.prepare("SELECT id FROM themes WHERE id=? AND hidden=0 AND (scope='global' OR (scope='user' AND user_id=?))").bind(input.themeId,user.id).first()) throw new ApiError(404,'Theme not found.');
  const result = await c.env.DB.prepare('UPDATE preferences SET text=?,theme_id=? WHERE id=? AND user_id=?').bind(input.text,input.themeId,c.req.param('id'),user.id).run();
  if (!result.meta.changes) throw new ApiError(404,'Preference not found.'); return c.json({ok:true});
});
app.delete('/api/preferences/:id', async c => { await c.env.DB.prepare('DELETE FROM preferences WHERE id=? AND user_id=?').bind(c.req.param('id'),c.get('user').id).run(); return c.json({ok:true}); });
app.put('/api/edits/:id/feedback', async c => {
  const input = z.object({ feedback: z.enum(['kept','rejected']) }).parse(await jsonBody(c.req.raw));
  const result = await c.env.DB.prepare('UPDATE edits SET feedback=? WHERE id=? AND user_id=?').bind(input.feedback,c.req.param('id'),c.get('user').id).run();
  if (!result.meta.changes) throw new ApiError(404,'Edit not found.'); return c.json({ok:true});
});

app.all('/api/*', c => c.json({error:'Not found'},404));
app.all('/media/*', c => c.json({error:'Not found'},404));
app.get('/', async c => {
  // Serve the landing page straight from static assets. Do NOT rewrite to
  // /index.html here: the asset pipeline canonicalizes /index.html -> / with
  // a 307, so returning that redirect causes an infinite self-redirect loop.
  return c.env.ASSETS.fetch(c.req.raw);
});
app.all('*', async c => {
  const { pathname } = new URL(c.req.url);
  if (pathname === '/app' || pathname.startsWith('/app/')) {
    const url = new URL(c.req.url);
    if (!pathname.includes('.') || pathname.endsWith('/')) {
      url.pathname = '/app/index.html';
      const assetRes = await c.env.ASSETS.fetch(new Request(url.toString(), c.req.raw));
      // Follow one same-origin canonical redirect internally (e.g. the asset
      // layer mapping /app/index.html -> /app/) instead of returning it, which
      // would loop back through this handler.
      if (assetRes.status >= 300 && assetRes.status < 400) {
        const location = assetRes.headers.get('location');
        if (location) {
          const target = new URL(location, c.req.url);
          if (target.origin === url.origin) {
            return c.env.ASSETS.fetch(new Request(target.toString(), c.req.raw));
          }
        }
      }
      return assetRes;
    }
  }
  return c.env.ASSETS.fetch(c.req.raw);
});
export default app;
