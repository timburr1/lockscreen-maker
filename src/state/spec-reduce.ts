import type { Size } from '../logic/geometry';
import type { DeviceClass } from '../logic/safe-area';
import type { BackgroundRef, DeviceSelection, LockscreenSpec, LockscreenStyle } from './spec';

export type SpecAction =
  | { readonly kind: 'device-set'; readonly size: Size; readonly deviceClass: DeviceClass; readonly selection: DeviceSelection }
  | { readonly kind: 'orientation-swap' }
  | { readonly kind: 'background-set'; readonly background: BackgroundRef }
  | { readonly kind: 'focus-set'; readonly axis: 'x' | 'y'; readonly value: number }
  | { readonly kind: 'style-set'; readonly style: Partial<LockscreenStyle> }
  | { readonly kind: 'text-set'; readonly text: string };

export function specReduce(spec: LockscreenSpec, action: SpecAction): LockscreenSpec {
  switch (action.kind) {
    case 'device-set':
      return { ...spec, size: action.size, deviceClass: action.deviceClass, deviceSelection: action.selection };
    case 'orientation-swap':
      return { ...spec, size: { width: spec.size.height, height: spec.size.width } };
    case 'background-set':
      if (action.background.kind === 'bundled' && spec.background.kind === 'bundled' && action.background.id === spec.background.id) {
        return spec;
      }
      return { ...spec, background: action.background, focus: { x: 0.5, y: 0.5 } };
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
