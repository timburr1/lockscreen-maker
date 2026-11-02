import { describe, expect, test } from 'vitest';
import { sizeValidate } from '../logic/size-validate';
import { DEVICE_PRESETS } from './device-presets';

describe('DEVICE_PRESETS', () => {
  test('ids are unique', () => {
    const ids = DEVICE_PRESETS.map((preset) => preset.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('every size passes the custom-size validator', () => {
    for (const preset of DEVICE_PRESETS) {
      expect(sizeValidate(preset.width, preset.height).kind, preset.id).toBe('ok');
    }
  });

  test('phones and tablets are portrait', () => {
    for (const preset of DEVICE_PRESETS.filter((p) => p.deviceClass !== 'desktop')) {
      expect(preset.height, preset.id).toBeGreaterThan(preset.width);
    }
  });

  test('every preset has a group and a name', () => {
    for (const preset of DEVICE_PRESETS) {
      expect(preset.group, preset.id).not.toBe('');
      expect(preset.name, preset.id).not.toBe('');
    }
  });

  test('the list covers phones, tablets, and desktops', () => {
    const classes = new Set(DEVICE_PRESETS.map((preset) => preset.deviceClass));
    expect(classes).toEqual(new Set(['phone', 'tablet', 'desktop']));
  });
});
