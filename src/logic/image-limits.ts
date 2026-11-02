import type { Size } from './geometry';

export const IMAGE_MAX_FILE_BYTES = 25 * 1024 * 1024;
/** A 24 MP photo decodes to about 96 MB of pixels, which many phones tolerate; 100 MP they do not. */
export const IMAGE_MAX_PIXELS = 50_000_000;

export function imageFileFits(bytes: number): boolean {
  return bytes <= IMAGE_MAX_FILE_BYTES;
}

export function imagePixelsFit(size: Size): boolean {
  return size.width * size.height <= IMAGE_MAX_PIXELS;
}
