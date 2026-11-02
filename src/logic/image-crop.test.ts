import { describe, expect, test } from 'vitest';
import { imageCropAxis, imageCropRect, imageCropScale } from './image-crop';

const target = { width: 1000, height: 2000 };

describe('imageCropRect', () => {
  test('keeps the whole image when aspect ratios match', () => {
    const rect = imageCropRect({ width: 500, height: 1000 }, target, { x: 0.5, y: 0.5 });
    expect(rect).toEqual({ x: 0, y: 0, width: 500, height: 1000 });
  });

  test('wider source crops horizontally and follows focus.x', () => {
    const source = { width: 4000, height: 2000 };
    const left = imageCropRect(source, target, { x: 0, y: 0.5 });
    const middle = imageCropRect(source, target, { x: 0.5, y: 0.5 });
    const right = imageCropRect(source, target, { x: 1, y: 0.5 });
    expect(left).toEqual({ x: 0, y: 0, width: 1000, height: 2000 });
    expect(middle.x).toBe(1500);
    expect(right.x).toBe(3000);
    expect(right.y).toBe(0);
  });

  test('taller source crops vertically and follows focus.y', () => {
    const source = { width: 1000, height: 4000 };
    const top = imageCropRect(source, target, { x: 0.5, y: 0 });
    const bottom = imageCropRect(source, target, { x: 0.5, y: 1 });
    expect(top).toEqual({ x: 0, y: 0, width: 1000, height: 2000 });
    expect(bottom.y).toBe(2000);
    expect(bottom.x).toBe(0);
  });

  test('the crop rectangle has the target aspect ratio and stays exactly inside the source', () => {
    const sources = [
      { width: 3024, height: 4032 },
      { width: 6000, height: 4000 },
      { width: 400, height: 300 },
      { width: 200, height: 3024 },
      { width: 1731, height: 977 },
    ];
    const targets = [
      { width: 1179, height: 2556 },
      { width: 1206, height: 2622 },
      { width: 1080, height: 2400 },
      { width: 1920, height: 1080 },
      { width: 1640, height: 2360 },
    ];
    for (const source of sources) {
      for (const aTarget of targets) {
        for (const focus of [0, 0.3, 1]) {
          const rect = imageCropRect(source, aTarget, { x: focus, y: focus });
          expect(rect.x).toBeGreaterThanOrEqual(0);
          expect(rect.y).toBeGreaterThanOrEqual(0);
          expect(rect.x + rect.width).toBeLessThanOrEqual(source.width);
          expect(rect.y + rect.height).toBeLessThanOrEqual(source.height);
          expect(rect.width / rect.height).toBeCloseTo(aTarget.width / aTarget.height, 6);
        }
      }
    }
  });
});

describe('imageCropScale', () => {
  test('is above 1 when the source must be enlarged', () => {
    expect(imageCropScale({ width: 500, height: 1000 }, target)).toBe(2);
  });

  test('is below 1 when the source is larger than the target', () => {
    expect(imageCropScale({ width: 4000, height: 8000 }, target)).toBe(0.25);
  });

  test('uses the axis that needs more enlargement', () => {
    expect(imageCropScale({ width: 4000, height: 1000 }, target)).toBe(2);
  });
});

describe('imageCropAxis', () => {
  test('a wider source is cropped horizontally and a taller one vertically', () => {
    expect(imageCropAxis({ width: 4000, height: 2000 }, target)).toBe('x');
    expect(imageCropAxis({ width: 1000, height: 4000 }, target)).toBe('y');
  });

  test('matching aspect ratios crop nothing', () => {
    expect(imageCropAxis({ width: 500, height: 1000 }, target)).toBeUndefined();
  });

  test('agrees with imageCropRect about which axis has room to move', () => {
    const source = { width: 3000, height: 3000 };
    const axis = imageCropAxis(source, target);
    const low = imageCropRect(source, target, { x: 0, y: 0 });
    const high = imageCropRect(source, target, { x: 1, y: 1 });
    expect(axis).toBe('x');
    expect(high.x).toBeGreaterThan(low.x);
    expect(high.y).toBe(low.y);
  });
});
