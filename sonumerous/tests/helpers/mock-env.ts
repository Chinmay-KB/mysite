import type { AppEnv, AssetRow, GenerationRow } from '../../worker/core';

type MediaObject = { body: Uint8Array; httpMetadata?: { contentType?: string }; size: number };

export interface MockState {
  generations: GenerationRow[];
  assets: AssetRow[];
  media: Map<string, MediaObject>;
}

export function createMockMedia(initial?: Map<string, MediaObject>) {
  const store = initial ?? new Map<string, MediaObject>();
  return {
    store,
    async head(key: string) {
      return store.has(key) ? {} : null;
    },
    async get(key: string) {
      const hit = store.get(key);
      if (!hit) return null;
      return {
        body: hit.body,
        arrayBuffer: async () => hit.body.buffer.slice(hit.body.byteOffset, hit.body.byteOffset + hit.body.byteLength),
        json: async <T>() => JSON.parse(new TextDecoder().decode(hit.body)) as T,
        httpMetadata: hit.httpMetadata,
        size: hit.size,
      };
    },
    async put(key: string, body: Uint8Array | ArrayBuffer, opts?: { httpMetadata?: { contentType?: string } }) {
      const bytes = body instanceof Uint8Array ? body : new Uint8Array(body);
      store.set(key, { body: bytes, httpMetadata: opts?.httpMetadata, size: bytes.byteLength });
    },
    async delete(key: string | string[]) {
      for (const k of Array.isArray(key) ? key : [key]) store.delete(k);
    },
  };
}

function matchSql(sql: string, pattern: RegExp) {
  return pattern.test(sql.replace(/\s+/g, ' ').trim());
}

export function createMockDb(state: MockState) {
  return {
    prepare(sql: string) {
      const normalized = sql.replace(/\s+/g, ' ').trim();
      let binds: unknown[] = [];
      const api = {
        bind(...args: unknown[]) {
          binds = args;
          return api;
        },
        async first<T>(): Promise<T | null> {
          if (matchSql(normalized, /SELECT \* FROM generations WHERE id=\?/i)) {
            const id = binds[0] as string;
            return (state.generations.find(g => g.id === id) as T) ?? null;
          }
          if (matchSql(normalized, /SELECT \* FROM assets WHERE id = \? AND user_id = \?/i)) {
            const [id, userId] = binds as [string, string];
            return (state.assets.find(a => a.id === id && a.user_id === userId) as T) ?? null;
          }
          return null;
        },
        async run() {
          if (matchSql(normalized, /UPDATE generations SET attempted_at=\?,status='generating'/i)) {
            const [attemptedAt, updatedAt, id] = binds as [string, string, string];
            const row = state.generations.find(g => g.id === id);
            if (!row || row.attempted_at) return { meta: { changes: 0 } };
            row.attempted_at = attemptedAt;
            row.status = 'generating';
            (row as GenerationRow & { updated_at?: string }).updated_at = updatedAt;
            return { meta: { changes: 1 } };
          }
          if (matchSql(normalized, /UPDATE generations SET status='saving'/i)) {
            const [, id] = binds as [string, string];
            const row = state.generations.find(g => g.id === id);
            if (row) row.status = 'saving';
            return { meta: { changes: 1 } };
          }
          if (matchSql(normalized, /UPDATE generations SET status='ready'/i)) {
            const [outputId, updatedAt, id] = binds as [string, string, string];
            const row = state.generations.find(g => g.id === id);
            if (row) {
              row.status = 'ready';
              row.output_asset_id = outputId;
              row.error = null;
              (row as GenerationRow & { updated_at?: string }).updated_at = updatedAt;
            }
            return { meta: { changes: 1 } };
          }
          if (matchSql(normalized, /UPDATE generations SET status='failed'/i)) {
            const [error, updatedAt, id] = binds as [string, string, string];
            const row = state.generations.find(g => g.id === id);
            if (row && row.status !== 'ready') {
              row.status = 'failed';
              row.error = error;
              (row as GenerationRow & { updated_at?: string }).updated_at = updatedAt;
            }
            return { meta: { changes: 1 } };
          }
          if (matchSql(normalized, /INSERT OR IGNORE INTO assets/i)) {
            const [id, userId, , name, objectKey, mime, width, height, bytes, generationId] = binds as (
              | string
              | number
            )[];
            if (!state.assets.some(a => a.id === id)) {
              state.assets.push({
                id: id as string,
                user_id: userId as string,
                kind: 'generated',
                name: name as string,
                object_key: objectKey as string,
                mime: mime as string,
                width: Number(width),
                height: Number(height),
                bytes: Number(bytes),
                sha256: null,
                favourite: 0,
                generation_id: generationId as string,
                created_at: new Date().toISOString(),
              });
            }
            return { meta: { changes: 1 } };
          }
          return { meta: { changes: 0 } };
        },
        async all<T>() {
          return { results: [] as T[] };
        },
      };
      return api;
    },
    async batch(statements: Array<{ run: () => Promise<{ meta: { changes: number } }> }>) {
      for (const stmt of statements) await stmt.run();
    },
  };
}

export function createMockImages(pngWidth: number, pngHeight: number) {
  return {
    info: async (_stream: ReadableStream) => ({ width: pngWidth, height: pngHeight }),
    input: (_body: ReadableStream) => ({
      transform: () => ({
        output: async () => ({
          response: async () => new Response(new Uint8Array([1, 2, 3]), { headers: { 'Content-Type': 'image/webp' } }),
        }),
      }),
    }),
  };
}

export function buildMockEnv(state: MockState, pngWidth: number, pngHeight: number): AppEnv {
  const mediaApi = createMockMedia(state.media);
  state.media = mediaApi.store;
  return {
    DB: createMockDb(state) as unknown as AppEnv['DB'],
    MEDIA: mediaApi as unknown as AppEnv['MEDIA'],
    IMAGES: createMockImages(pngWidth, pngHeight) as unknown as AppEnv['IMAGES'],
    OPENROUTER_API_KEY: 'test-openrouter-key',
    LOCAL_DEV: 'true',
    ACCESS_DOMAIN: '',
    ACCESS_AUD: '',
  } as AppEnv;
}
