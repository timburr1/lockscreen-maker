export type TextMeasure = (text: string, fontSizePx: number) => number;

export type TextLayoutOptions = {
  readonly text: string;
  readonly measure: TextMeasure;
  readonly maxWidth: number;
  readonly maxHeight: number;
  readonly baseFontSize: number;
  readonly minFontSize: number;
};

export type TextLayout =
  | { readonly kind: 'fit'; readonly fontSize: number; readonly lines: readonly string[]; readonly height: number }
  | { readonly kind: 'overflow' };

export const TEXT_LINE_HEIGHT = 1.25;

const SHRINK_FACTOR = 0.95;

const graphemeSegmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

/** Whitespace that may break a line; no-break spaces stay inside their word. */
const BREAKABLE_SPACE = /[^\S  ]+/;

type Wrapped = { readonly lines: readonly string[]; readonly brokeWord: boolean };

function wordBreak(word: string, measure: TextMeasure, fontSize: number, maxWidth: number): { full: string[]; last: string } {
  const full: string[] = [];
  let current = '';
  for (const { segment } of graphemeSegmenter.segment(word)) {
    if (current !== '' && measure(current + segment, fontSize) > maxWidth) {
      full.push(current);
      current = segment;
    } else {
      current += segment;
    }
  }
  return { full, last: current };
}

function paragraphWrap(paragraph: string, measure: TextMeasure, fontSize: number, maxWidth: number): Wrapped {
  const lines: string[] = [];
  let brokeWord = false;
  let current = '';
  for (const word of paragraph.split(BREAKABLE_SPACE).filter((w) => w !== '')) {
    const candidate = current === '' ? word : `${current} ${word}`;
    if (measure(candidate, fontSize) <= maxWidth) {
      current = candidate;
      continue;
    }
    if (current !== '') {
      lines.push(current);
    }
    const pieces = wordBreak(word, measure, fontSize, maxWidth);
    brokeWord = brokeWord || pieces.full.length > 0;
    lines.push(...pieces.full);
    current = pieces.last;
  }
  lines.push(current);
  return { lines, brokeWord };
}

function textWrap(text: string, measure: TextMeasure, fontSize: number, maxWidth: number): Wrapped {
  const paragraphs = text.replace(/\r\n?/g, '\n').split('\n');
  const first = paragraphs.findIndex((p) => p.trim() !== '');
  if (first === -1) {
    return { lines: [], brokeWord: false };
  }
  const last = paragraphs.findLastIndex((p) => p.trim() !== '');
  const wrapped = paragraphs.slice(first, last + 1).map((p) => paragraphWrap(p, measure, fontSize, maxWidth));
  return { lines: wrapped.flatMap((w) => w.lines), brokeWord: wrapped.some((w) => w.brokeWord) };
}

/**
 * Wraps text to maxWidth and shrinks from baseFontSize until it fits maxHeight; short text stays at the base size.
 * A word wider than maxWidth shrinks the text too, and is only split by character once minFontSize is reached.
 */
export function textLayout(options: TextLayoutOptions): TextLayout {
  if (!Number.isFinite(options.baseFontSize) || !Number.isFinite(options.minFontSize) || options.minFontSize <= 0) {
    throw new Error(`textLayout needs finite font sizes and a positive minimum, got ${options.baseFontSize} and ${options.minFontSize}`);
  }
  let fontSize = options.baseFontSize;
  while (true) {
    const { lines, brokeWord } = textWrap(options.text, options.measure, fontSize, options.maxWidth);
    const height = lines.length * fontSize * TEXT_LINE_HEIGHT;
    const heightFits = height <= options.maxHeight;
    const atFloor = fontSize <= options.minFontSize;
    if (heightFits && (!brokeWord || atFloor)) {
      return { kind: 'fit', fontSize, lines, height };
    }
    if (atFloor) {
      return { kind: 'overflow' };
    }
    fontSize = Math.max(options.minFontSize, fontSize * SHRINK_FACTOR);
  }
}
