import { describe, expect, test } from 'vitest';
import { colorHexParse } from '../logic/color-pick';
import { type LockscreenSpec, SPEC_DEFAULT_BACKGROUND_COLOR, SPEC_DEFAULT_STYLE } from './spec';
import { specReduce } from './spec-reduce';

const spec: LockscreenSpec = {
  size: { width: 1179, height: 2556 },
  deviceClass: 'phone',
  deviceSelection: { kind: 'preset', id: 'iphone-15-16' },
  background: { kind: 'bundled', id: 'a' },
  focus: { x: 0.5, y: 0.5 },
  backgroundFit: 'cover',
  backgroundRotation: 0,
  backgroundColor: SPEC_DEFAULT_BACKGROUND_COLOR,
  text: 'hello',
  style: SPEC_DEFAULT_STYLE,
};

const upload = { kind: 'upload', file: new File(['x'], 'license.jpg') } as const;

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

  test('focus-set moves one axis and leaves the other', () => {
    expect(specReduce(spec, { kind: 'focus-set', axis: 'x', value: 0.2 }).focus).toEqual({ x: 0.2, y: 0.5 });
    expect(specReduce(spec, { kind: 'focus-set', axis: 'y', value: 0.8 }).focus).toEqual({ x: 0.5, y: 0.8 });
  });

  test('style-set merges the given fields and keeps everything else', () => {
    const next = specReduce(spec, { kind: 'style-set', style: { align: 'left', scrim: 0 } });
    expect(next.style).toEqual({ ...SPEC_DEFAULT_STYLE, align: 'left', scrim: 0 });
    expect({ ...next, style: spec.style }).toEqual(spec);
  });

  test('background-set accepts an upload', () => {
    const background = { kind: 'upload', file: new File(['x'], 'a.png') } as const;
    expect(specReduce(spec, { kind: 'background-set', background }).background).toBe(background);
  });

  test('selecting the already-selected bundled background changes nothing, including the focus', () => {
    const moved = { ...spec, focus: { x: 0.1, y: 0.9 } };
    expect(specReduce(moved, { kind: 'background-set', background: { kind: 'bundled', id: 'a' } })).toBe(moved);
  });

  test('background-rotation-next cycles through the four rotations', () => {
    const rotations = [0, 90, 180, 270, 0];
    let current = spec;
    for (const expected of rotations.slice(1)) {
      current = specReduce(current, { kind: 'background-rotation-next' });
      expect(current.backgroundRotation).toBe(expected);
    }
  });

  test('background-fit-set and background-color-set replace one field each', () => {
    expect(specReduce(spec, { kind: 'background-fit-set', fit: 'contain' })).toEqual({ ...spec, backgroundFit: 'contain' });
    const color = colorHexParse('#102030');
    expect(specReduce(spec, { kind: 'background-color-set', color })).toEqual({ ...spec, backgroundColor: color });
  });

  test('rotating resets the focus, since it is expressed in the on-screen frame', () => {
    const next = specReduce({ ...spec, focus: { x: 0.1, y: 0.9 } }, { kind: 'background-rotation-next' });
    expect(next.focus).toEqual({ x: 0.5, y: 0.5 });
  });

  test('a new background resets rotation and picks the fit default for its kind, and keeps the colour', () => {
    const color = colorHexParse('#102030');
    const customised = { ...spec, backgroundRotation: 180, backgroundFit: 'contain', backgroundColor: color } as const;
    const toUpload = specReduce(customised, { kind: 'background-set', background: upload });
    expect(toUpload.backgroundRotation).toBe(0);
    expect(toUpload.backgroundFit).toBe('contain');
    expect(toUpload.backgroundColor).toBe(color);
    const toBundled = specReduce({ ...toUpload, backgroundRotation: 90 }, { kind: 'background-set', background: { kind: 'bundled', id: 'b' } });
    expect(toBundled.backgroundRotation).toBe(0);
    expect(toBundled.backgroundFit).toBe('cover');
  });

  test('selecting the already-selected upload changes nothing, including rotation', () => {
    const rotated = { ...spec, background: upload, backgroundRotation: 90 } as const;
    expect(specReduce(rotated, { kind: 'background-set', background: { kind: 'upload', file: upload.file } })).toBe(rotated);
  });

  test('a different upload file replaces the background', () => {
    const rotated = { ...spec, background: upload, backgroundRotation: 90 } as const;
    const other = { kind: 'upload', file: new File(['y'], 'other.jpg') } as const;
    expect(specReduce(rotated, { kind: 'background-set', background: other }).backgroundRotation).toBe(0);
  });

  test('does not mutate the previous spec', () => {
    const before = structuredClone(spec);
    specReduce(spec, { kind: 'text-set', text: 'x' });
    expect(spec).toEqual(before);
  });
});
