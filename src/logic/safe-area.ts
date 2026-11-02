import type { Rect, Size } from './geometry';

export type DeviceClass = 'phone' | 'tablet' | 'desktop';

type Insets = { readonly top: number; readonly bottom: number; readonly side: number };

/** Fractions of height (top, bottom) and width (side) reserved for the OS clock, buttons, and edges. Starting guesses; tune against real lock screens. */
const INSETS: Readonly<Record<DeviceClass, Insets>> = {
  phone: { top: 0.3, bottom: 0.14, side: 0.08 },
  tablet: { top: 0.25, bottom: 0.1, side: 0.1 },
  desktop: { top: 0.05, bottom: 0.05, side: 0.05 },
};

export function safeAreaRect(size: Size, deviceClass: DeviceClass): Rect {
  const insets = INSETS[deviceClass];
  const x = Math.round(size.width * insets.side);
  const y = Math.round(size.height * insets.top);
  return {
    x,
    y,
    width: size.width - 2 * x,
    height: size.height - y - Math.round(size.height * insets.bottom),
  };
}

/** Top edge for a block of the given height; position 0 is the top of the area and 1 the bottom. */
export function safeAreaPlace(area: Rect, blockHeight: number, position: number): number {
  return area.y + Math.max(0, area.height - blockHeight) * position;
}
