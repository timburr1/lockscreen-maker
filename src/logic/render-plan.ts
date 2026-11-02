import type { LockscreenSpecText } from '../state/spec';
import { colorPick } from './color-pick';
import type { Rect } from './geometry';
import { safeAreaPlace, safeAreaRect } from './safe-area';
import { TEXT_LINE_HEIGHT, type TextMeasure, textLayout } from './text-layout';

/** Base font size as a fraction of the output width; short text stays at this size. */
export const TEXT_BASE_FONT_FRACTION = 0.06;
/** Smallest font size as a fraction of the output width; below it the text is reported as too long. */
export const TEXT_MIN_FONT_FRACTION = 0.025;
/** Backdrop padding around the text block, as a fraction of the font size. */
const SCRIM_PADDING_FRACTION = 0.5;

type TextColor = 'white' | 'black';

export type RenderPlan = {
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

/**
 * Decides everything drawn over the background: font size, wrapping, placement, colour, and backdrop.
 * `luminanceMean` reads the mean luminance of the already-drawn background under a rectangle, and is only called when the colour is automatic and there is text.
 */
export function renderPlan(spec: LockscreenSpecText, measure: TextMeasure, luminanceMean: (area: Rect) => number): RenderPlanResult {
  const { size, style } = spec;
  const area = safeAreaRect(size, spec.deviceClass);
  const layout = textLayout({
    text: spec.text,
    measure,
    maxWidth: area.width,
    maxHeight: area.height,
    baseFontSize: size.width * TEXT_BASE_FONT_FRACTION * style.sizeScale,
    minFontSize: size.width * TEXT_MIN_FONT_FRACTION,
  });
  if (layout.kind === 'overflow') {
    return { kind: 'overflow' };
  }

  const hasText = layout.lines.length > 0;
  const textColor: TextColor = style.color === 'auto' ? (hasText ? colorPick(luminanceMean(area)) : 'white') : style.color;
  const textY = safeAreaPlace(area, layout.height, style.position);
  const padding = layout.fontSize * SCRIM_PADDING_FRACTION;
  const scrimColor: TextColor = textColor === 'white' ? 'black' : 'white';
  const scrim =
    hasText && style.scrim > 0
      ? {
          rect: { x: area.x - padding, y: textY - padding, width: area.width + 2 * padding, height: layout.height + 2 * padding },
          color: scrimColor,
          opacity: style.scrim,
        }
      : undefined;

  return {
    kind: 'plan',
    plan: {
      textColor,
      fontSize: layout.fontSize,
      lineHeight: layout.fontSize * TEXT_LINE_HEIGHT,
      lines: layout.lines,
      textAlign: style.align,
      textX: style.align === 'left' ? area.x : area.x + area.width / 2,
      textY,
      scrim,
    },
  };
}
