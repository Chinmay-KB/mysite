import { describe, expect, it, vi } from 'vitest';
import { encodePng } from './fixtures/valid-png';
import { prepareUploadImage, UPLOAD_COMPRESS_MAX_BYTES, UPLOAD_COMPRESS_MAX_EDGE } from '../worker/core';
import type { AppEnv } from '../worker/core';

function mockImages(handlers: {
  info: (stream: ReadableStream) => Promise<{ width: number; height: number }>;
  compressed?: Uint8Array;
}) {
  const compressed = handlers.compressed ?? new Uint8Array();
  return {
    info: vi.fn(handlers.info),
    input: vi.fn(() => ({
      transform: vi.fn(() => ({
        output: vi.fn(async () => ({
          response: () => new Response(new Uint8Array(compressed)),
        })),
      })),
    })),
  };
}

function envWithImages(images: ReturnType<typeof mockImages>): AppEnv {
  return { IMAGES: images } as unknown as AppEnv;
}

describe('prepareUploadImage', () => {
  it('leaves small images untouched', async () => {
    const raw = encodePng(64, 64, 3);
    const images = mockImages({
      info: async () => ({ width: 64, height: 64 }),
    });
    const rawBuf = raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength) as ArrayBuffer;
    const prepared = await prepareUploadImage(envWithImages(images), rawBuf, 'image/png');
    expect(prepared.width).toBe(64);
    expect(prepared.mime).toBe('image/png');
    expect(prepared.bytes.byteLength).toBe(raw.byteLength);
    expect(images.input).not.toHaveBeenCalled();
  });

  it('compresses when long edge exceeds cap', async () => {
    const raw = encodePng(UPLOAD_COMPRESS_MAX_EDGE + 100, 800, 4);
    const compressed = encodePng(512, 512, 9);
    const images = mockImages({
      info: async stream => {
        const buf = await new Response(stream).arrayBuffer();
        if (buf.byteLength === raw.byteLength) return { width: UPLOAD_COMPRESS_MAX_EDGE + 100, height: 800 };
        return { width: 512, height: 512 };
      },
      compressed,
    });
    const rawBuf = raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength) as ArrayBuffer;
    const prepared = await prepareUploadImage(envWithImages(images), rawBuf, 'image/png');
    expect(prepared.mime).toBe('image/webp');
    expect(prepared.width).toBe(512);
    expect(images.input).toHaveBeenCalled();
  });

  it('produces stable dedup input for identical prepared bytes', async () => {
    const raw = encodePng(32, 32, 1);
    const images = mockImages({ info: async () => ({ width: 32, height: 32 }) });
    const env = envWithImages(images);
    const rawBuf = raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength) as ArrayBuffer;
    const a = await prepareUploadImage(env, rawBuf, 'image/png');
    const b = await prepareUploadImage(env, rawBuf, 'image/png');
    expect(Buffer.from(a.bytes).equals(Buffer.from(b.bytes))).toBe(true);
    expect(a.bytes.byteLength).toBeLessThan(UPLOAD_COMPRESS_MAX_BYTES);
  });
});
