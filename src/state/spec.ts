import { type ColorHex, colorHexParse } from '../logic/color-pick';
import type { Size } from '../logic/geometry';
import type { ImageRotation } from '../logic/image-rotation';
import type { DeviceClass } from '../logic/safe-area';

/** Where the size came from; kept in the spec so the picker cannot drift from it. */
export type DeviceSelection = { readonly kind: 'preset'; readonly id: string } | { readonly kind: 'this-device' } | { readonly kind: 'custom' };

/** Compared by identity to tell whether a decoded bitmap belongs to the current background. */
export type BackgroundRef = { readonly kind: 'bundled'; readonly id: string } | { readonly kind: 'upload'; readonly file: File };

/** How the background fills the screen: `cover` crops to fill it, `contain` shows the whole image and fills the rest with the background colour. */
export type BackgroundFit = 'cover' | 'contain';

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
  /** 0..1 on each axis, in the rotated (on-screen) frame: which part of the image survives the crop. Reset when the rotation changes. */
  readonly focus: { readonly x: number; readonly y: number };
  readonly backgroundFit: BackgroundFit;
  readonly backgroundRotation: ImageRotation;
  /** Fills the screen around a `contain` image. */
  readonly backgroundColor: ColorHex;
  /** One textarea; newlines are lines. */
  readonly text: string;
  readonly style: LockscreenStyle;
};

export const SPEC_DEFAULT_TEXT = 'If found, please contact:\n[Name]\n[Phone]\n[Email]';

export const SPEC_DEFAULT_STYLE: LockscreenStyle = { align: 'center', sizeScale: 1, color: 'auto', scrim: 0.35, position: 0.5 };

export const SPEC_DEFAULT_BACKGROUND_COLOR: ColorHex = colorHexParse('#ffffff');

/** A photo of a card should be seen whole; a scenic background should fill the screen. */
export function specBackgroundFitDefault(background: BackgroundRef): BackgroundFit {
  return background.kind === 'upload' ? 'contain' : 'cover';
}

/** What the text overlay depends on. */
export type LockscreenSpecText = Pick<LockscreenSpec, 'size' | 'deviceClass' | 'text' | 'style'>;

/** What the full render depends on: everything but the background itself. */
export type LockscreenSpecRender = LockscreenSpecText & Pick<LockscreenSpec, 'focus' | 'backgroundFit' | 'backgroundRotation' | 'backgroundColor'>;
