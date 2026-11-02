import { describe, expect, test } from 'vitest';
import { IMAGE_MAX_FILE_BYTES, IMAGE_MAX_PIXELS, imageFileFits, imagePixelsFit } from './image-limits';

describe('imageFileFits', () => {
  test('boundary', () => {
    expect(imageFileFits(IMAGE_MAX_FILE_BYTES)).toBe(true);
    expect(imageFileFits(IMAGE_MAX_FILE_BYTES + 1)).toBe(false);
  });
});

describe('imagePixelsFit', () => {
  test('boundary on total pixels', () => {
    expect(imagePixelsFit({ width: 10_000, height: IMAGE_MAX_PIXELS / 10_000 })).toBe(true);
    expect(imagePixelsFit({ width: 10_000, height: IMAGE_MAX_PIXELS / 10_000 + 1 })).toBe(false);
  });

  test('a typical 24 megapixel photo fits', () => {
    expect(imagePixelsFit({ width: 6000, height: 4000 })).toBe(true);
  });
});
