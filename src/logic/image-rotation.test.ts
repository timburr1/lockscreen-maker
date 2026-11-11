import { describe, expect, test } from 'vitest';
import type { Rect, Size } from './geometry';
import { imageCropRect } from './image-crop';
import { type ImageRotation, imageRotationFocus, imageRotationNext, imageRotationSize } from './image-rotation';

const ROTATIONS: readonly ImageRotation[] = [0, 90, 180, 270];

describe('imageRotationNext', () => {
  test('cycles 0, 90, 180, 270 and back to 0', () => {
    expect(imageRotationNext(0)).toBe(90);
    expect(imageRotationNext(90)).toBe(180);
    expect(imageRotationNext(180)).toBe(270);
    expect(imageRotationNext(270)).toBe(0);
  });
});

describe('imageRotationSize', () => {
  test('swaps width and height for quarter turns only', () => {
    const size = { width: 300, height: 100 };
    expect(imageRotationSize(size, 0)).toEqual(size);
    expect(imageRotationSize(size, 180)).toEqual(size);
    expect(imageRotationSize(size, 90)).toEqual({ width: 100, height: 300 });
    expect(imageRotationSize(size, 270)).toEqual({ width: 100, height: 300 });
  });
});

/** Where a point of the unrotated source lands in the rotated image, derived from canvas rotate(+angle), which is clockwise on a y-down canvas. */
function pointRotate(point: { readonly x: number; readonly y: number }, source: Size, rotation: ImageRotation): { x: number; y: number } {
  switch (rotation) {
    case 0:
      return { x: point.x, y: point.y };
    case 90:
      return { x: source.height - point.y, y: point.x };
    case 180:
      return { x: source.width - point.x, y: source.height - point.y };
    case 270:
      return { x: point.y, y: source.width - point.x };
    default: {
      const unreachable: never = rotation;
      throw new Error(`Unhandled rotation ${String(unreachable)}`);
    }
  }
}

function boundsOf(points: readonly { readonly x: number; readonly y: number }[]): Rect {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
}

describe('imageRotationFocus', () => {
  test('crops in source space to the same window that cropping the rotated image shows on screen', () => {
    const sources = [
      { width: 4000, height: 3000 },
      { width: 3000, height: 4000 },
      { width: 1600, height: 1000 },
      { width: 500, height: 500 },
    ];
    const targets = [
      { width: 1179, height: 2556 },
      { width: 2556, height: 1179 },
      { width: 1000, height: 1000 },
    ];
    for (const source of sources) {
      for (const target of targets) {
        for (const rotation of ROTATIONS) {
          for (const fx of [0, 0.3, 1]) {
            for (const fy of [0, 0.7, 1]) {
              const focus = { x: fx, y: fy };
              const inSource = imageCropRect(source, imageRotationSize(target, rotation), imageRotationFocus(focus, rotation));
              const corners = [
                { x: inSource.x, y: inSource.y },
                { x: inSource.x + inSource.width, y: inSource.y },
                { x: inSource.x, y: inSource.y + inSource.height },
                { x: inSource.x + inSource.width, y: inSource.y + inSource.height },
              ].map((corner) => pointRotate(corner, source, rotation));
              const onScreen = boundsOf(corners);
              const expected = imageCropRect(imageRotationSize(source, rotation), target, focus);
              expect(onScreen.x).toBeCloseTo(expected.x, 6);
              expect(onScreen.y).toBeCloseTo(expected.y, 6);
              expect(onScreen.width).toBeCloseTo(expected.width, 6);
              expect(onScreen.height).toBeCloseTo(expected.height, 6);
            }
          }
        }
      }
    }
  });

  test('is the identity for no rotation', () => {
    expect(imageRotationFocus({ x: 0.2, y: 0.9 }, 0)).toEqual({ x: 0.2, y: 0.9 });
  });
});
