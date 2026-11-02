import type { TextMeasure } from '../logic/text-layout';

/** Monospace measure: every character is half a font size wide. */
export const textMeasureFake: TextMeasure = (text, fontSizePx) => Array.from(text).length * fontSizePx * 0.5;
