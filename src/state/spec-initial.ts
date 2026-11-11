import { DEVICE_PRESETS } from '../data/device-presets';
import type { DeviceScreen } from '../logic/device-screen';
import { type LockscreenSpec, SPEC_DEFAULT_BACKGROUND_COLOR, SPEC_DEFAULT_STYLE, SPEC_DEFAULT_TEXT, specBackgroundFitDefault } from './spec';

const PRESET_DEFAULT_ID = 'iphone-15-16';

export type SpecInitialOptions = {
  readonly screen: DeviceScreen | undefined;
  /** Start on the detected screen rather than the default preset. */
  readonly screenPreferred: boolean;
  readonly backgroundId: string;
};

function presetDefault() {
  const preset = DEVICE_PRESETS.find((p) => p.id === PRESET_DEFAULT_ID);
  if (preset === undefined) {
    throw new Error(`Default device preset ${PRESET_DEFAULT_ID} is missing from DEVICE_PRESETS`);
  }
  return preset;
}

export function specInitial(options: SpecInitialOptions): LockscreenSpec {
  const background = { kind: 'bundled', id: options.backgroundId } as const;
  const base = {
    background,
    focus: { x: 0.5, y: 0.5 },
    backgroundFit: specBackgroundFitDefault(background),
    backgroundRotation: 0,
    backgroundColor: SPEC_DEFAULT_BACKGROUND_COLOR,
    text: SPEC_DEFAULT_TEXT,
    style: SPEC_DEFAULT_STYLE,
  } as const;

  if (options.screen !== undefined && options.screenPreferred) {
    return { ...base, size: options.screen.size, deviceClass: options.screen.deviceClass, deviceSelection: { kind: 'this-device' } };
  }
  const preset = presetDefault();
  return { ...base, size: { width: preset.width, height: preset.height }, deviceClass: preset.deviceClass, deviceSelection: { kind: 'preset', id: preset.id } };
}
