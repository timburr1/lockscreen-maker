import { describe, expect, test } from 'vitest';
import { textMeasureFake } from '../test-support/text-measure-fake';
import { TEXT_LINE_HEIGHT, type TextLayoutOptions, textLayout } from './text-layout';

// With the fake measure a character is fontSize / 2 wide, so at fontSize 20 a 100 px box holds 10 characters.
function layout(text: string, overrides: Partial<TextLayoutOptions> = {}) {
  return textLayout({ text, measure: textMeasureFake, maxWidth: 100, maxHeight: 1000, baseFontSize: 20, minFontSize: 8, ...overrides });
}

function fitOf(text: string, overrides: Partial<TextLayoutOptions> = {}) {
  const result = layout(text, overrides);
  if (result.kind !== 'fit') {
    throw new Error('expected a fit');
  }
  return result;
}

describe('textLayout', () => {
  test('short text keeps the base font size', () => {
    const result = fitOf('Hi');
    expect(result.fontSize).toBe(20);
    expect(result.lines).toEqual(['Hi']);
    expect(result.height).toBeCloseTo(20 * TEXT_LINE_HEIGHT);
  });

  test('wraps at word boundaries', () => {
    expect(fitOf('aaaa bbbb cccc').lines).toEqual(['aaaa bbbb', 'cccc']);
  });

  test('keeps newlines and blank lines as gaps, and trims leading and trailing blank lines', () => {
    expect(fitOf('\none\n\ntwo\n\n').lines).toEqual(['one', '', 'two']);
  });

  test('treats CRLF as a newline', () => {
    expect(fitOf('one\r\ntwo').lines).toEqual(['one', 'two']);
  });

  test('empty and whitespace-only text fits with no lines', () => {
    const result = fitOf('');
    expect(result.lines).toEqual([]);
    expect(result.height).toBe(0);
    expect(fitOf('   ').lines).toEqual([]);
    expect(fitOf('one\n  \n').lines).toEqual(['one']);
  });

  test('shrinks in small steps, so the result is the largest size that fits', () => {
    const result = fitOf('one\ntwo\nthree\nfour\nfive', { maxHeight: 100 });
    expect(result.fontSize).toBeLessThan(20);
    expect(result.height).toBeLessThanOrEqual(100);
    const oneStepLarger = result.fontSize / 0.95;
    expect(5 * oneStepLarger * TEXT_LINE_HEIGHT).toBeGreaterThan(100);
  });

  test('text that fits only at the minimum size is a fit, not an overflow', () => {
    // Five lines at the minimum size 8 take exactly 50 px; one shrink step earlier they take more.
    const result = fitOf('one\ntwo\nthree\nfour\nfive', { maxHeight: 50 });
    expect(result.fontSize).toBe(8);
  });

  test('every wrapped line fits the width', () => {
    const result = fitOf('the quick brown fox jumps over the lazy dog', { maxHeight: 400 });
    for (const line of result.lines) {
      expect(textMeasureFake(line, result.fontSize)).toBeLessThanOrEqual(100);
    }
  });

  test('reports overflow when the text cannot fit at the minimum size', () => {
    const text = Array.from({ length: 50 }, (_, i) => `line ${i}`).join('\n');
    expect(layout(text, { maxHeight: 100 }).kind).toBe('overflow');
  });

  test('a larger base size enlarges text that fits, and overflows when it no longer does', () => {
    expect(fitOf('Hi', { baseFontSize: 30 }).fontSize).toBe(30);
    expect(fitOf('one\ntwo\nthree', { baseFontSize: 60, maxHeight: 100 }).fontSize).toBeGreaterThan(20);
    expect(layout(Array.from({ length: 30 }, () => 'x').join('\n'), { baseFontSize: 60, maxHeight: 100 }).kind).toBe('overflow');
  });

  test('a word wider than the box shrinks the text before it is split', () => {
    const result = fitOf('abcdefghijklmno');
    expect(result.lines).toEqual(['abcdefghijklmno']);
    expect(result.fontSize).toBeLessThan(20);
  });

  test('a word too wide even at the minimum size is split by character', () => {
    const result = fitOf('abcdefghijklmnopqrstuvwxyz', { baseFontSize: 20, minFontSize: 20 });
    expect(result.fontSize).toBe(20);
    expect(result.lines).toEqual(['abcdefghij', 'klmnopqrst', 'uvwxyz']);
  });

  test('does not split grapheme clusters when breaking a word', () => {
    const family = '\u{1F468}‍\u{1F469}‍\u{1F467}';
    const result = fitOf(`abcdefgh${family}ijkl`, { baseFontSize: 10, minFontSize: 10, maxWidth: 40 });
    expect(result.lines.some((line) => line.includes(family))).toBe(true);
  });

  test('keeps no-break spaces inside a word', () => {
    expect(fitOf('Dr. Smith ok').lines).toEqual(['Dr. Smith', 'ok']);
  });

  test('rejects font sizes that would loop forever', () => {
    expect(() => layout('Hi', { baseFontSize: Number.NaN })).toThrow();
    expect(() => layout('Hi', { minFontSize: 0 })).toThrow();
  });
});
