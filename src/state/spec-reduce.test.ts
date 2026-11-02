import { describe, expect, test } from 'vitest';
import { type LockscreenSpec, SPEC_DEFAULT_STYLE } from './spec';
import { specReduce } from './spec-reduce';

const spec: LockscreenSpec = {
  size: { width: 1179, height: 2556 },
  deviceClass: 'phone',
  deviceSelection: { kind: 'preset', id: 'iphone-15-16' },
  background: { kind: 'bundled', id: 'a' },
  focus: { x: 0.5, y: 0.5 },
  text: 'hello',
  style: SPEC_DEFAULT_STYLE,
};

describe('specReduce', () => {
  test('device-set replaces size, class, and selection and keeps everything else', () => {
    const next = specReduce(spec, { kind: 'device-set', size: { width: 1640, height: 2360 }, deviceClass: 'tablet', selection: { kind: 'custom' } });
    expect(next.size).toEqual({ width: 1640, height: 2360 });
    expect(next.deviceClass).toBe('tablet');
    expect(next.deviceSelection).toEqual({ kind: 'custom' });
    expect({ ...next, size: spec.size, deviceClass: spec.deviceClass, deviceSelection: spec.deviceSelection }).toEqual(spec);
  });

  test('orientation-swap exchanges width and height, keeps the selection, and twice restores the original', () => {
    const swapped = specReduce(spec, { kind: 'orientation-swap' });
    expect(swapped.deviceSelection).toEqual(spec.deviceSelection);
    expect(swapped.size).toEqual({ width: 2556, height: 1179 });
    expect(specReduce(swapped, { kind: 'orientation-swap' }).size).toEqual(spec.size);
  });

  test('text-set replaces the text', () => {
    expect(specReduce(spec, { kind: 'text-set', text: 'new\ntext' }).text).toBe('new\ntext');
  });

  test('background-set replaces the background and resets the focus to the centre', () => {
    const next = specReduce({ ...spec, focus: { x: 0.1, y: 0.9 } }, { kind: 'background-set', background: { kind: 'bundled', id: 'b' } });
    expect(next.background).toEqual({ kind: 'bundled', id: 'b' });
    expect(next.focus).toEqual({ x: 0.5, y: 0.5 });
  });

  test('does not mutate the previous spec', () => {
    const before = structuredClone(spec);
    specReduce(spec, { kind: 'text-set', text: 'x' });
    expect(spec).toEqual(before);
  });
});
