import type { DeviceClass } from '../logic/safe-area';

export type DevicePreset = {
  readonly id: string;
  readonly group: string;
  readonly name: string;
  /** Physical pixels, portrait for phones and tablets. */
  readonly width: number;
  readonly height: number;
  readonly deviceClass: DeviceClass;
};

/**
 * Chosen from StatCounter's mobile viewport ranking (CSS pixels) multiplied by each family's pixel ratio.
 * TODO: confirm every size against the manufacturer's spec page.
 */
export const DEVICE_PRESETS: readonly DevicePreset[] = [
  { id: 'iphone-11-xr', group: 'iPhone', name: 'iPhone 11 / XR', width: 828, height: 1792, deviceClass: 'phone' },
  { id: 'iphone-12-14', group: 'iPhone', name: 'iPhone 12 / 13 / 14', width: 1170, height: 2532, deviceClass: 'phone' },
  { id: 'iphone-15-16', group: 'iPhone', name: 'iPhone 15 / 16', width: 1179, height: 2556, deviceClass: 'phone' },
  { id: 'iphone-16-pro-17', group: 'iPhone', name: 'iPhone 16 Pro / 17', width: 1206, height: 2622, deviceClass: 'phone' },
  { id: 'iphone-pro-max', group: 'iPhone', name: 'iPhone Pro Max', width: 1320, height: 2868, deviceClass: 'phone' },
  { id: 'android-fhd', group: 'Android', name: 'Android FHD+ (Galaxy A / S, many others)', width: 1080, height: 2400, deviceClass: 'phone' },
  { id: 'pixel', group: 'Android', name: 'Pixel', width: 1080, height: 2424, deviceClass: 'phone' },
  { id: 'galaxy-ultra', group: 'Android', name: 'Galaxy Ultra', width: 1440, height: 3120, deviceClass: 'phone' },
  { id: 'ipad', group: 'Tablet', name: 'iPad', width: 1640, height: 2360, deviceClass: 'tablet' },
  { id: 'ipad-pro-11', group: 'Tablet', name: 'iPad Pro 11"', width: 1668, height: 2420, deviceClass: 'tablet' },
  { id: 'desktop-1080p', group: 'Desktop', name: '1920 × 1080', width: 1920, height: 1080, deviceClass: 'desktop' },
  { id: 'desktop-1440p', group: 'Desktop', name: '2560 × 1440', width: 2560, height: 1440, deviceClass: 'desktop' },
  { id: 'desktop-4k', group: 'Desktop', name: '3840 × 2160', width: 3840, height: 2160, deviceClass: 'desktop' },
];
