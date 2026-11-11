import type { Size } from './geometry';

/** Clockwise quarter turns, in degrees. */
export type ImageRotation = 0 | 90 | 180 | 270;

export function imageRotationNext(rotation: ImageRotation): ImageRotation {
  switch (rotation) {
    case 0:
      return 90;
    case 90:
      return 180;
    case 180:
      return 270;
    case 270:
      return 0;
    default: {
      const unreachable: never = rotation;
      throw new Error(`Unhandled rotation ${String(unreachable)}`);
    }
  }
}

/** The size after rotating: width and height swap for quarter turns. Also maps a screen-oriented size back to the unrotated image's orientation. */
export function imageRotationSize(size: Size, rotation: ImageRotation): Size {
  return rotation === 90 || rotation === 270 ? { width: size.height, height: size.width } : size;
}

/** Converts a focus on the rotated image (what the user sees) into the focus on the unrotated source, where the crop is actually taken. */
export function imageRotationFocus(focus: { readonly x: number; readonly y: number }, rotation: ImageRotation): { readonly x: number; readonly y: number } {
  switch (rotation) {
    case 0:
      return focus;
    case 90:
      return { x: focus.y, y: 1 - focus.x };
    case 180:
      return { x: 1 - focus.x, y: 1 - focus.y };
    case 270:
      return { x: 1 - focus.y, y: focus.x };
    default: {
      const unreachable: never = rotation;
      throw new Error(`Unhandled rotation ${String(unreachable)}`);
    }
  }
}
