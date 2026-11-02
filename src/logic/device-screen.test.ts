import { describe, expect, test } from 'vitest';
import { deviceScreenSize } from './device-screen';

describe('deviceScreenSize', () => {
  test('a phone reports its physical pixels in portrait', () => {
    expect(deviceScreenSize({ width: 393, height: 852 }, 3, true)).toEqual({ size: { width: 1179, height: 2556 }, deviceClass: 'phone' });
  });

  test('a phone held in landscape (swapped screen values) is still portrait', () => {
    expect(deviceScreenSize({ width: 800, height: 360 }, 3, true)).toEqual({ size: { width: 1080, height: 2400 }, deviceClass: 'phone' });
  });

  test('a touch device with a wide short side is a tablet', () => {
    expect(deviceScreenSize({ width: 820, height: 1180 }, 2, true)).toEqual({ size: { width: 1640, height: 2360 }, deviceClass: 'tablet' });
  });

  test('a non-touch device is a desktop and keeps its orientation', () => {
    expect(deviceScreenSize({ width: 1920, height: 1080 }, 1, false)).toEqual({ size: { width: 1920, height: 1080 }, deviceClass: 'desktop' });
  });

  test('fractional pixel ratios round to whole pixels', () => {
    const result = deviceScreenSize({ width: 411, height: 914 }, 2.625, true);
    expect(Number.isInteger(result?.size.width)).toBe(true);
    expect(Number.isInteger(result?.size.height)).toBe(true);
  });

  test('a size the renderer cannot make is unavailable', () => {
    expect(deviceScreenSize({ width: 9000, height: 5000 }, 2, false)).toBeUndefined();
  });
});
