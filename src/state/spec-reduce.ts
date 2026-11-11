import type { ColorHex } from '../logic/color-pick';
import type { Size } from '../logic/geometry';
import { imageRotationNext } from '../logic/image-rotation';
import type { DeviceClass } from '../logic/safe-area';
import { type BackgroundFit, type BackgroundRef, type DeviceSelection, type LockscreenSpec, type LockscreenStyle, specBackgroundFitDefault } from './spec';

export type SpecAction =
  | { readonly kind: 'device-set'; readonly size: Size; readonly deviceClass: DeviceClass; readonly selection: DeviceSelection }
  | { readonly kind: 'orientation-swap' }
  | { readonly kind: 'background-set'; readonly background: BackgroundRef }
  | { readonly kind: 'background-rotation-next' }
  | { readonly kind: 'background-fit-set'; readonly fit: BackgroundFit }
  | { readonly kind: 'background-color-set'; readonly color: ColorHex }
  | { readonly kind: 'focus-set'; readonly axis: 'x' | 'y'; readonly value: number }
  | { readonly kind: 'style-set'; readonly style: Partial<LockscreenStyle> }
  | { readonly kind: 'text-set'; readonly text: string };

function backgroundSame(a: BackgroundRef, b: BackgroundRef): boolean {
  return (a.kind === 'bundled' && b.kind === 'bundled' && a.id === b.id) || (a.kind === 'upload' && b.kind === 'upload' && a.file === b.file);
}

export function specReduce(spec: LockscreenSpec, action: SpecAction): LockscreenSpec {
  switch (action.kind) {
    case 'device-set':
      return { ...spec, size: action.size, deviceClass: action.deviceClass, deviceSelection: action.selection };
    case 'orientation-swap':
      return { ...spec, size: { width: spec.size.height, height: spec.size.width } };
    case 'background-set':
      if (backgroundSame(spec.background, action.background)) {
        return spec;
      }
      return {
        ...spec,
        background: action.background,
        focus: { x: 0.5, y: 0.5 },
        backgroundFit: specBackgroundFitDefault(action.background),
        backgroundRotation: 0,
      };
    case 'background-rotation-next':
      // Focus is in the on-screen frame, so after a turn the old value would point somewhere else in the image.
      return { ...spec, backgroundRotation: imageRotationNext(spec.backgroundRotation), focus: { x: 0.5, y: 0.5 } };
    case 'background-fit-set':
      return { ...spec, backgroundFit: action.fit };
    case 'background-color-set':
      return { ...spec, backgroundColor: action.color };
    case 'focus-set':
      return { ...spec, focus: { ...spec.focus, [action.axis]: action.value } };
    case 'style-set':
      return { ...spec, style: { ...spec.style, ...action.style } };
    case 'text-set':
      return { ...spec, text: action.text };
    default: {
      const unreachable: never = action;
      throw new Error(`Unhandled spec action ${JSON.stringify(unreachable)}`);
    }
  }
}
