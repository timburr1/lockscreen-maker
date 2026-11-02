import { describe, expect, test } from 'vitest';
import { BACKGROUNDS_BUNDLED } from './backgrounds';
import { CREDITS } from './credits';

describe('CREDITS', () => {
  test('every credited file name is a bundled image, so a typo cannot leave an image silently uncredited', () => {
    const fileNames = new Set(BACKGROUNDS_BUNDLED.map((background) => background.fileName));
    for (const file of CREDITS.keys()) {
      expect(fileNames.has(file), file).toBe(true);
    }
  });
});
