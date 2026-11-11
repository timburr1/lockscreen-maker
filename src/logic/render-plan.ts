import type { LockscreenSpecText } from '../state/spec';
import { type ColorHex, colorHexLuminance, colorPick } from './color-pick';
import type { Rect, Size } from './geometry';
import { imageFitRect } from './image-fit';
import { safeAreaPlace, safeAreaRect } from './safe-area';
import { TEXT_LINE_HEIGHT, type TextMeasure, textLayout } from './text-layout';

/** Base font size as a fraction of the output width; short text stays at this size. */
export const TEXT_BASE_FONT_FRACTION = 0.06;
/** Smallest font size as a fraction of the output width; below it the text is reported as too long. */
export const TEXT_MIN_FONT_FRACTION = 0.025;
/** Backdrop padding around the text block, as a fraction of the base font size. */
const SCRIM_PADDING_FRACTION = 0.5;
/** Most of the text area the text may use when the whole image is shown below it, so the image always keeps room. */
const TEXT_CONTAIN_MAX_HEIGHT_FRACTION = 0.5;

type TextColor = 'white' | 'black';

/** Where the background image goes: `cover` fills the canvas (the renderer crops it), `contain` shows all of it in `rect`. */
export type RenderPlanImage = { readonly kind: 'cover' } | { readonly kind: 'contain'; readonly rect: Rect };

export type RenderPlan = {
  readonly image: RenderPlanImage;
  readonly textColor: TextColor;
  readonly fontSize: number;
  readonly lineHeight: number;
  readonly lines: readonly string[];
  readonly textAlign: 'left' | 'center';
  /** Horizontal anchor: the left edge for left alignment, the centre for centred text. */
  readonly textX: number;
  /** Top of the text block. */
  readonly textY: number;
  readonly scrim: { readonly rect: Rect; readonly color: TextColor; readonly opacity: number } | undefined;
};

export type RenderPlanResult = { readonly kind: 'plan'; readonly plan: RenderPlan } | { readonly kind: 'overflow' };

/** What is behind the text: a `cover` image fills the canvas and is already drawn; a `contain` image (its size after rotation) is shown whole on a plain colour and is placed by the plan. */
export type RenderPlanBackground = { readonly kind: 'cover' } | { readonly kind: 'contain'; readonly size: Size; readonly color: ColorHex };

/**
 * Decides everything drawn over the background: font size, wrapping, placement, colour, and backdrop, plus where a `contain` image goes.
 * In `contain` mode the text and the image form one group, text on top, that `style.position` slides through the safe area.
 * `luminanceMean` reads the mean luminance of the already-drawn background under a rectangle, and is only called for `cover` when the colour is automatic and there is text.
 */
export function renderPlan(
  spec: LockscreenSpecText,
  background: RenderPlanBackground,
  measure: TextMeasure,
  luminanceMean: (area: Rect) => number,
): RenderPlanResult {
  const { size, style } = spec;
  const area = safeAreaRect(size, spec.deviceClass);
  // The text sits inside the safe area inset by the backdrop padding, so the backdrop never leaves the safe area.
  const baseFontSize = size.width * TEXT_BASE_FONT_FRACTION * style.sizeScale;
  const padding = baseFontSize * SCRIM_PADDING_FRACTION;
  const textArea: Rect = { x: area.x + padding, y: area.y + padding, width: area.width - 2 * padding, height: area.height - 2 * padding };
  const layout = textLayout({
    text: spec.text,
    measure,
    maxWidth: textArea.width,
    maxHeight: background.kind === 'contain' ? textArea.height * TEXT_CONTAIN_MAX_HEIGHT_FRACTION : textArea.height,
    baseFontSize,
    minFontSize: size.width * TEXT_MIN_FONT_FRACTION,
  });
  if (layout.kind === 'overflow') {
    return { kind: 'overflow' };
  }

  const hasText = layout.lines.length > 0;
  // A contain image is drawn after the plan is made, so the text sits on the plain background colour, whose luminance is known without reading pixels.
  const backgroundLuminance = () => (background.kind === 'contain' ? colorHexLuminance(background.color) : luminanceMean(area));
  const textColor: TextColor = style.color === 'auto' ? (hasText ? colorPick(backgroundLuminance()) : 'white') : style.color;

  let textY: number;
  let image: RenderPlanImage;
  if (background.kind === 'contain') {
    const textBlockHeight = hasText ? layout.height + 2 * padding : 0;
    // The image takes the safe-area width, like the backdrop above it, and whatever safe-area height the text leaves.
    const fitted = imageFitRect(background.size, { x: area.x, y: 0, width: area.width, height: area.height - textBlockHeight });
    const groupY = safeAreaPlace(area, textBlockHeight + fitted.height, style.position);
    textY = groupY + padding;
    image = { kind: 'contain', rect: { x: fitted.x, y: groupY + textBlockHeight, width: fitted.width, height: fitted.height } };
  } else {
    textY = safeAreaPlace(textArea, layout.height, style.position);
    image = { kind: 'cover' };
  }

  const scrimColor: TextColor = textColor === 'white' ? 'black' : 'white';
  const scrim =
    hasText && style.scrim > 0
      ? {
          rect: { x: area.x, y: textY - padding, width: area.width, height: layout.height + 2 * padding },
          color: scrimColor,
          opacity: style.scrim,
        }
      : undefined;

  return {
    kind: 'plan',
    plan: {
      image,
      textColor,
      fontSize: layout.fontSize,
      lineHeight: layout.fontSize * TEXT_LINE_HEIGHT,
      lines: layout.lines,
      textAlign: style.align,
      textX: style.align === 'left' ? textArea.x : textArea.x + textArea.width / 2,
      textY,
      scrim,
    },
  };
}
