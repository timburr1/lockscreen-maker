import { describe, expect, test } from 'vitest';
import type { DeviceClass } from './safe-area';
import { safeAreaGuide, safeAreaPlace, safeAreaRect } from './safe-area';

const classes: DeviceClass[] = ['phone', 'tablet', 'desktop'];
const sizes = [
  { width: 1179, height: 2556 },
  { width: 2556, height: 1179 },
  { width: 1920, height: 1080 },
];

describe('safeAreaRect', () => {
  test('stays inside the image with positive area for every class and size', () => {
    for (const deviceClass of classes) {
      for (const size of sizes) {
        const rect = safeAreaRect(size, deviceClass);
        expect(rect.x).toBeGreaterThanOrEqual(0);
        expect(rect.y).toBeGreaterThanOrEqual(0);
        expect(rect.width).toBeGreaterThan(0);
        expect(rect.height).toBeGreaterThan(0);
        expect(rect.x + rect.width).toBeLessThanOrEqual(size.width);
        expect(rect.y + rect.height).toBeLessThanOrEqual(size.height);
      }
    }
  });

  test('desktop keeps a small margin but uses most of the image', () => {
    const size = { width: 1920, height: 1080 };
    const rect = safeAreaRect(size, 'desktop');
    expect(rect.x).toBeGreaterThan(0);
    expect(rect.y).toBeGreaterThan(0);
    expect(rect.width * rect.height).toBeGreaterThan(0.8 * size.width * size.height);
  });

  test('phone reserves more room at the top than at the bottom, for the OS clock', () => {
    const size = { width: 1000, height: 2000 };
    const rect = safeAreaRect(size, 'phone');
    expect(rect.y).toBeGreaterThan(size.height - (rect.y + rect.height));
  });
});

describe('safeAreaPlace', () => {
  const area = { x: 100, y: 600, width: 800, height: 1000 };

  test('position 0 is the top and 1 is the bottom of the area', () => {
    expect(safeAreaPlace(area, 200, 0)).toBe(600);
    expect(safeAreaPlace(area, 200, 1)).toBe(1400);
    expect(safeAreaPlace(area, 200, 0.5)).toBe(1000);
  });

  test('a block as tall as the area has no travel', () => {
    expect(safeAreaPlace(area, 1000, 0)).toBe(600);
    expect(safeAreaPlace(area, 1000, 1)).toBe(600);
  });
});

describe('safeAreaGuide', () => {
  test('is the safe rectangle as fractions of the image', () => {
    for (const deviceClass of classes) {
      for (const size of sizes) {
        const rect = safeAreaRect(size, deviceClass);
        const guide = safeAreaGuide(size, deviceClass);
        expect(guide.left).toBeCloseTo(rect.x / size.width, 10);
        expect(guide.top).toBeCloseTo(rect.y / size.height, 10);
        expect(guide.width).toBeCloseTo(rect.width / size.width, 10);
        expect(guide.height).toBeCloseTo(rect.height / size.height, 10);
        expect(guide.left + guide.width).toBeLessThanOrEqual(1);
        expect(guide.top + guide.height).toBeLessThanOrEqual(1);
      }
    }
  });
});
