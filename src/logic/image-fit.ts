import type { Rect, Size } from './geometry';

/** Factor by which the source is scaled to fit entirely inside the box; above 1 means the image is enlarged. */
export function imageFitScale(source: Size, box: Rect): number {
  return Math.min(box.width / source.width, box.height / source.height);
}

/** The largest rectangle with the source's aspect ratio that fits the box, centred in it. */
export function imageFitRect(source: Size, box: Rect): Rect {
  const scale = imageFitScale(source, box);
  const width = source.width * scale;
  const height = source.height * scale;
  return { x: box.x + (box.width - width) / 2, y: box.y + (box.height - height) / 2, width, height };
}
