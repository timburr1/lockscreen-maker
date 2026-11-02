import { describe, expect, test } from 'vitest';
import { SIZE_MAX_SIDE, SIZE_MIN_SIDE, sizeValidate } from './size-validate';

function errorReason(width: number, height: number): string | undefined {
  const check = sizeValidate(width, height);
  return check.kind === 'error' ? check.reason : undefined;
}

describe('sizeValidate', () => {
  test('accepts a typical phone size', () => {
    expect(sizeValidate(1179, 2556)).toEqual({ kind: 'ok', size: { width: 1179, height: 2556 } });
  });

  test('minimum boundary', () => {
    expect(sizeValidate(SIZE_MIN_SIDE, SIZE_MIN_SIDE).kind).toBe('ok');
    expect(errorReason(SIZE_MIN_SIDE - 1, SIZE_MIN_SIDE)).toBe('side-too-small');
    expect(errorReason(SIZE_MIN_SIDE, SIZE_MIN_SIDE - 1)).toBe('side-too-small');
  });

  test('per-side maximum boundary applies to both sides', () => {
    expect(sizeValidate(SIZE_MAX_SIDE, 2048).kind).toBe('ok');
    expect(errorReason(SIZE_MAX_SIDE + 1, 300)).toBe('side-too-large');
    expect(errorReason(300, SIZE_MAX_SIDE + 1)).toBe('side-too-large');
  });

  test('total pixel cap', () => {
    expect(sizeValidate(4096, 4096).kind).toBe('ok');
    expect(errorReason(4097, 4097)).toBe('too-many-pixels');
    expect(errorReason(SIZE_MAX_SIDE, 2049)).toBe('too-many-pixels');
  });

  test('rejects non-integers, NaN, and infinity', () => {
    expect(errorReason(1080.5, 2400)).toBe('not-integer');
    expect(errorReason(Number.NaN, 2400)).toBe('not-integer');
    expect(errorReason(1080, Number.POSITIVE_INFINITY)).toBe('not-integer');
  });
});
