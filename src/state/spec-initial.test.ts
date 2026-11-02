import { describe, expect, test } from 'vitest';
import type { DeviceScreen } from '../logic/device-screen';
import { specInitial } from './spec-initial';

const screen: DeviceScreen = { size: { width: 1080, height: 2400 }, deviceClass: 'phone' };

describe('specInitial', () => {
  test('uses the detected screen when preferred', () => {
    const spec = specInitial({ screen, screenPreferred: true, backgroundId: 'a' });
    expect(spec.size).toEqual(screen.size);
    expect(spec.deviceClass).toBe('phone');
    expect(spec.deviceSelection).toEqual({ kind: 'this-device' });
    expect(spec.background).toEqual({ kind: 'bundled', id: 'a' });
  });

  test('uses the default preset when the screen is not preferred or not detected', () => {
    for (const options of [
      { screen, screenPreferred: false },
      { screen: undefined, screenPreferred: true },
    ]) {
      const spec = specInitial({ ...options, backgroundId: 'a' });
      expect(spec.deviceSelection.kind).toBe('preset');
      expect(spec.deviceClass).toBe('phone');
      expect(spec.size.height).toBeGreaterThan(spec.size.width);
    }
  });

  test('starts with the placeholder text and a centred focus', () => {
    const spec = specInitial({ screen: undefined, screenPreferred: false, backgroundId: 'a' });
    expect(spec.text).not.toBe('');
    expect(spec.focus).toEqual({ x: 0.5, y: 0.5 });
  });
});
