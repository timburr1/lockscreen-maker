import { describe, expect, test } from 'vitest';
import { imageFitRect, imageFitScale } from './image-fit';

describe('imageFitRect', () => {
  const box = { x: 100, y: 200, width: 800, height: 1000 };

  test('a wide source fills the box width and is centred vertically', () => {
    const rect = imageFitRect({ width: 1600, height: 1000 }, box);
    expect(rect).toEqual({ x: 100, y: 200 + (1000 - 500) / 2, width: 800, height: 500 });
  });

  test('a tall source fills the box height and is centred horizontally', () => {
    const rect = imageFitRect({ width: 1000, height: 2500 }, box);
    expect(rect).toEqual({ x: 100 + (800 - 400) / 2, y: 200, width: 400, height: 1000 });
  });

  test('a source with the box aspect ratio fills the box', () => {
    expect(imageFitRect({ width: 400, height: 500 }, box)).toEqual(box);
  });

  test('keeps the source aspect ratio and stays inside the box, enlarging small sources', () => {
    for (const source of [
      { width: 10, height: 10 },
      { width: 4000, height: 300 },
      { width: 300, height: 4000 },
    ]) {
      const rect = imageFitRect(source, box);
      expect(rect.width / rect.height).toBeCloseTo(source.width / source.height, 6);
      expect(rect.x).toBeGreaterThanOrEqual(box.x - 1e-9);
      expect(rect.y).toBeGreaterThanOrEqual(box.y - 1e-9);
      expect(rect.x + rect.width).toBeLessThanOrEqual(box.x + box.width + 1e-9);
      expect(rect.y + rect.height).toBeLessThanOrEqual(box.y + box.height + 1e-9);
    }
  });
});

describe('imageFitScale', () => {
  test('is the smaller of the two axis ratios', () => {
    expect(imageFitScale({ width: 1000, height: 500 }, { x: 0, y: 0, width: 500, height: 1000 })).toBe(0.5);
    expect(imageFitScale({ width: 250, height: 500 }, { x: 0, y: 0, width: 500, height: 1000 })).toBe(2);
  });
});
