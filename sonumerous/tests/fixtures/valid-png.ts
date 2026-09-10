import { PNG } from 'pngjs';

/** Valid PNG bytes (correct CRC) for uploads and provider fixtures. */
export function encodePng(width: number, height: number, seed = 0): Buffer {
  const png = new PNG({ width, height });
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (width * y + x) << 2;
      png.data[idx] = (seed + x * 17) % 256;
      png.data[idx + 1] = (seed + y * 23) % 256;
      png.data[idx + 2] = 40;
      png.data[idx + 3] = 255;
    }
  }
  return PNG.sync.write(png);
}

export const REFERENCE_PNG = encodePng(3, 3, 1);
export const PROVIDER_OUTPUT_PNG = encodePng(4, 4, 99);

export function uniqueUploadPng(seed: number): Buffer {
  const side = 2 + (seed % 6);
  return encodePng(side, side, seed);
}
