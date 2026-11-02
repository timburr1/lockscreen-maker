import { describe, expect, test } from 'vitest';
import { colorLuminanceMean, colorPick } from './color-pick';

function solid(r: number, g: number, b: number, pixels = 16): Uint8ClampedArray {
  const data = new Uint8ClampedArray(pixels * 4);
  for (let i = 0; i < pixels; i += 1) {
    data.set([r, g, b, 255], i * 4);
  }
  return data;
}

function pickOver(buffer: Uint8ClampedArray): 'white' | 'black' {
  return colorPick(colorLuminanceMean(buffer));
}

describe('colorLuminanceMean', () => {
  test('black is 0 and white is 1', () => {
    expect(colorLuminanceMean(solid(0, 0, 0))).toBe(0);
    expect(colorLuminanceMean(solid(255, 255, 255))).toBeCloseTo(1, 10);
  });

  test('averages light and dark halves', () => {
    const data = new Uint8ClampedArray([...solid(255, 255, 255, 8), ...solid(0, 0, 0, 8)]);
    expect(colorLuminanceMean(data)).toBeCloseTo(0.5, 10);
  });

  test('an empty or misaligned buffer is a bug', () => {
    expect(() => colorLuminanceMean(new Uint8ClampedArray(0))).toThrow();
    expect(() => colorLuminanceMean(new Uint8ClampedArray(7))).toThrow();
  });
});

describe('colorPick', () => {
  test('white text on dark and black text on light backgrounds', () => {
    expect(pickOver(solid(0, 0, 0))).toBe('white');
    expect(pickOver(solid(255, 255, 255))).toBe('black');
    expect(pickOver(solid(10, 20, 90))).toBe('white');
    expect(pickOver(solid(250, 220, 40))).toBe('black');
  });

  test('mid grey flips at the contrast crossover rather than at 128', () => {
    // The grey whose contrast against white equals its contrast against black sits between sRGB 117 and 118.
    expect(pickOver(solid(110, 110, 110))).toBe('white');
    expect(pickOver(solid(125, 125, 125))).toBe('black');
  });
});
