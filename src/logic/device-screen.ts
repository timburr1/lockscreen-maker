import type { Size } from './geometry';
import type { DeviceClass } from './safe-area';
import { sizeValidate } from './size-validate';

export type DeviceScreen = { readonly size: Size; readonly deviceClass: DeviceClass };

/** CSS pixels on the short side below which a touch device is treated as a phone. */
const PHONE_SHORT_SIDE_CSS = 600;

/**
 * Physical screen size and class from `window.screen` values (CSS pixels) and the pixel ratio.
 *
 * Android swaps width and height with orientation and iOS does not, so touch devices are normalised to portrait.
 *
 * Fractional ratios and browser zoom make the result approximate, so callers keep it editable. It is unavailable when the renderer could not make that size.
 */
export function deviceScreenSize(screen: Size, pixelRatio: number, touch: boolean): DeviceScreen | undefined {
  const short = Math.min(screen.width, screen.height);
  const long = Math.max(screen.width, screen.height);
  const width = Math.round((touch ? short : screen.width) * pixelRatio);
  const height = Math.round((touch ? long : screen.height) * pixelRatio);
  const validated = sizeValidate(width, height);
  if (validated.kind === 'error') {
    return undefined;
  }
  const deviceClass: DeviceClass = !touch ? 'desktop' : short < PHONE_SHORT_SIDE_CSS ? 'phone' : 'tablet';
  return { size: validated.size, deviceClass };
}
