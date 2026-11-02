import type { Size } from './geometry';

export const SIZE_MIN_SIDE = 200;
export const SIZE_MAX_SIDE = 8192;
/** The iOS canvas area limit, which binds before any per-side limit does. */
export const SIZE_MAX_PIXELS = 16_777_216;

export type SizeValidation =
  | { readonly kind: 'ok'; readonly size: Size }
  | { readonly kind: 'error'; readonly reason: 'not-integer' | 'side-too-small' | 'side-too-large' | 'too-many-pixels' };

/** `not-integer` includes NaN, which is what an empty number field yields. */
export function sizeValidate(width: number, height: number): SizeValidation {
  if (!Number.isInteger(width) || !Number.isInteger(height)) {
    return { kind: 'error', reason: 'not-integer' };
  }
  if (width < SIZE_MIN_SIDE || height < SIZE_MIN_SIDE) {
    return { kind: 'error', reason: 'side-too-small' };
  }
  if (width > SIZE_MAX_SIDE || height > SIZE_MAX_SIDE) {
    return { kind: 'error', reason: 'side-too-large' };
  }
  if (width * height > SIZE_MAX_PIXELS) {
    return { kind: 'error', reason: 'too-many-pixels' };
  }
  return { kind: 'ok', size: { width, height } };
}
