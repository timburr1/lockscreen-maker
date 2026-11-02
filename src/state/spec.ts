import type { Size } from '../logic/geometry';
import type { DeviceClass } from '../logic/safe-area';

/** Where the size came from; kept in the spec so the picker cannot drift from it. */
export type DeviceSelection = { readonly kind: 'preset'; readonly id: string } | { readonly kind: 'this-device' } | { readonly kind: 'custom' };

/** Compared by identity to tell whether a decoded bitmap belongs to the current background. */
export type BackgroundRef = { readonly kind: 'bundled'; readonly id: string } | { readonly kind: 'upload'; readonly file: File };

export type LockscreenStyle = {
  readonly align: 'left' | 'center';
  /** Multiplier on the base font size. */
  readonly sizeScale: number;
  readonly color: 'auto' | 'white' | 'black';
  /** 0..1 opacity of the backdrop behind the text. */
  readonly scrim: number;
  /** 0..1 vertical placement inside the safe area. */
  readonly position: number;
};

export type LockscreenSpec = {
  /** Output pixels. */
  readonly size: Size;
  readonly deviceClass: DeviceClass;
  readonly deviceSelection: DeviceSelection;
  readonly background: BackgroundRef;
  /** 0..1 on each axis: which part of the image survives the crop. */
  readonly focus: { readonly x: number; readonly y: number };
  /** One textarea; newlines are lines. */
  readonly text: string;
  readonly style: LockscreenStyle;
};

export const SPEC_DEFAULT_TEXT = 'If found, please contact:\n[Name]\n[Phone]\n[Email]';

export const SPEC_DEFAULT_STYLE: LockscreenStyle = { align: 'center', sizeScale: 1, color: 'auto', scrim: 0.35, position: 0.5 };

/** What the text overlay depends on. */
export type LockscreenSpecText = Pick<LockscreenSpec, 'size' | 'deviceClass' | 'text' | 'style'>;

/** What the full render depends on: everything but the background itself. */
export type LockscreenSpecRender = LockscreenSpecText & Pick<LockscreenSpec, 'focus'>;
