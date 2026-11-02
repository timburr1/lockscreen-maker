import { useState } from 'react';
import { DEVICE_PRESETS, type DevicePreset } from '../data/device-presets';
import type { DeviceScreen } from '../logic/device-screen';
import type { Size } from '../logic/geometry';
import type { DeviceClass } from '../logic/safe-area';
import { SIZE_MAX_SIDE, SIZE_MIN_SIDE, type SizeValidation, sizeValidate } from '../logic/size-validate';
import type { DeviceSelection } from '../state/spec';
import type { SpecAction } from '../state/spec-reduce';

const VALUE_THIS_DEVICE = 'this-device';
const VALUE_CUSTOM = 'custom';
const VALUE_PRESET_PREFIX = 'preset:';

type Props = {
  readonly size: Size;
  readonly deviceClass: DeviceClass;
  readonly selection: DeviceSelection;
  readonly screen: DeviceScreen | undefined;
  readonly dispatch: (action: SpecAction) => void;
};

type SizeError = Extract<SizeValidation, { readonly kind: 'error' }>['reason'];

function sizeErrorMessage(reason: SizeError): string {
  switch (reason) {
    case 'not-integer':
      return 'Enter whole numbers for the width and height.';
    case 'side-too-small':
      return `Each side must be at least ${SIZE_MIN_SIDE} pixels.`;
    case 'side-too-large':
      return `Each side can be at most ${SIZE_MAX_SIDE} pixels.`;
    case 'too-many-pixels':
      return 'That size has too many pixels in total for a browser to create. Try a smaller size.';
    default: {
      const unreachable: never = reason;
      throw new Error(`Unhandled size error ${String(unreachable)}`);
    }
  }
}

function presetsByGroup(): readonly (readonly [string, readonly DevicePreset[]])[] {
  const groups = new Map<string, DevicePreset[]>();
  for (const preset of DEVICE_PRESETS) {
    groups.set(preset.group, [...(groups.get(preset.group) ?? []), preset]);
  }
  return [...groups.entries()];
}

const PRESET_GROUPS = presetsByGroup();

function numberParse(text: string): number {
  return text.trim() === '' ? Number.NaN : Number(text);
}

function selectionValue(selection: DeviceSelection): string {
  switch (selection.kind) {
    case 'this-device':
      return VALUE_THIS_DEVICE;
    case 'custom':
      return VALUE_CUSTOM;
    case 'preset':
      return VALUE_PRESET_PREFIX + selection.id;
    default: {
      const unreachable: never = selection;
      throw new Error(`Unhandled device selection ${JSON.stringify(unreachable)}`);
    }
  }
}

function selectionParse(value: string): DeviceSelection {
  if (value === VALUE_THIS_DEVICE) {
    return { kind: 'this-device' };
  }
  if (value === VALUE_CUSTOM) {
    return { kind: 'custom' };
  }
  if (value.startsWith(VALUE_PRESET_PREFIX)) {
    return { kind: 'preset', id: value.slice(VALUE_PRESET_PREFIX.length) };
  }
  throw new Error(`Unknown device option ${value}`);
}

function deviceClassParse(value: string): DeviceClass {
  if (value === 'phone' || value === 'tablet' || value === 'desktop') {
    return value;
  }
  throw new Error(`Unknown screen type ${value}`);
}

export function DevicePicker({ size, deviceClass, selection, screen, dispatch }: Props) {
  const [customWidth, setCustomWidth] = useState(String(size.width));
  const [customHeight, setCustomHeight] = useState(String(size.height));
  const [customError, setCustomError] = useState<SizeError | undefined>(undefined);

  const customApply = (width: string, height: string, nextClass: DeviceClass) => {
    const checked = sizeValidate(numberParse(width), numberParse(height));
    if (checked.kind === 'error') {
      setCustomError(checked.reason);
      return;
    }
    setCustomError(undefined);
    dispatch({ kind: 'device-set', size: checked.size, deviceClass: nextClass, selection: { kind: 'custom' } });
  };

  const select = (value: string) => {
    const next = selectionParse(value);
    setCustomError(undefined);
    switch (next.kind) {
      case 'this-device':
        if (screen === undefined) {
          throw new Error('This device was selected but no screen was detected');
        }
        dispatch({ kind: 'device-set', size: screen.size, deviceClass: screen.deviceClass, selection: next });
        return;
      case 'custom':
        setCustomWidth(String(size.width));
        setCustomHeight(String(size.height));
        dispatch({ kind: 'device-set', size, deviceClass, selection: next });
        return;
      case 'preset': {
        const preset = DEVICE_PRESETS.find((p) => p.id === next.id);
        if (preset === undefined) {
          throw new Error(`Unknown device preset ${next.id}`);
        }
        dispatch({ kind: 'device-set', size: { width: preset.width, height: preset.height }, deviceClass: preset.deviceClass, selection: next });
        return;
      }
      default: {
        const unreachable: never = next;
        throw new Error(`Unhandled device selection ${JSON.stringify(unreachable)}`);
      }
    }
  };

  const errorId = 'custom-size-error';

  return (
    <fieldset className="control">
      <legend>Screen size</legend>
      <label htmlFor="device-select">Device</label>
      <select id="device-select" value={selectionValue(selection)} onChange={(event) => select(event.target.value)}>
        {screen !== undefined && (
          <option value={VALUE_THIS_DEVICE}>
            This device ({screen.size.width} × {screen.size.height})
          </option>
        )}
        {PRESET_GROUPS.map(([group, presets]) => (
          <optgroup key={group} label={group}>
            {presets.map((p) => (
              <option key={p.id} value={VALUE_PRESET_PREFIX + p.id}>
                {p.name} ({p.width} × {p.height})
              </option>
            ))}
          </optgroup>
        ))}
        <option value={VALUE_CUSTOM}>Custom size…</option>
      </select>
      <p className="hint">
        Image size: {size.width} × {size.height}
      </p>
      {selection.kind === 'preset' && deviceClass !== 'phone' && (
        <button type="button" onClick={() => dispatch({ kind: 'orientation-swap' })}>
          Rotate
        </button>
      )}
      {selection.kind === 'custom' && (
        <div className="custom-size">
          <label htmlFor="custom-width">Width</label>
          <input
            id="custom-width"
            type="number"
            inputMode="numeric"
            min={SIZE_MIN_SIDE}
            max={SIZE_MAX_SIDE}
            step={1}
            value={customWidth}
            aria-invalid={customError !== undefined}
            aria-describedby={customError === undefined ? undefined : errorId}
            onChange={(event) => {
              setCustomWidth(event.target.value);
              customApply(event.target.value, customHeight, deviceClass);
            }}
          />
          <label htmlFor="custom-height">Height</label>
          <input
            id="custom-height"
            type="number"
            inputMode="numeric"
            min={SIZE_MIN_SIDE}
            max={SIZE_MAX_SIDE}
            step={1}
            value={customHeight}
            aria-invalid={customError !== undefined}
            aria-describedby={customError === undefined ? undefined : errorId}
            onChange={(event) => {
              setCustomHeight(event.target.value);
              customApply(customWidth, event.target.value, deviceClass);
            }}
          />
          <label htmlFor="custom-class">Screen type</label>
          <select id="custom-class" value={deviceClass} onChange={(event) => customApply(customWidth, customHeight, deviceClassParse(event.target.value))}>
            <option value="phone">Phone</option>
            <option value="tablet">Tablet</option>
            <option value="desktop">Desktop</option>
          </select>
          {customError !== undefined && (
            <p id={errorId} role="alert">
              {sizeErrorMessage(customError)}
            </p>
          )}
        </div>
      )}
    </fieldset>
  );
}
