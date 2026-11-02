import type { Rect, Size } from './geometry';

/** Factor by which the source is scaled to cover the target; above 1 means the image is enlarged. */
export function imageCropScale(source: Size, target: Size): number {
  return Math.max(target.width / source.width, target.height / source.height);
}

/** The part of the source that covers the target aspect ratio; focus 0..1 picks where along the cropped axis it sits. */
export function imageCropRect(source: Size, target: Size, focus: { readonly x: number; readonly y: number }): Rect {
  // The binding axis is taken from the source verbatim and the other derived from it, so the rectangle never leaves the source through rounding.
  const sourceIsWider = source.width * target.height >= target.width * source.height;
  const width = sourceIsWider ? Math.min(source.width, (source.height * target.width) / target.height) : source.width;
  const height = sourceIsWider ? source.height : Math.min(source.height, (source.width * target.height) / target.width);
  return {
    x: (source.width - width) * focus.x,
    y: (source.height - height) * focus.y,
    width,
    height,
  };
}
