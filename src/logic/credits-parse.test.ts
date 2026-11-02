import { describe, expect, test } from 'vitest';
import { creditsParse } from './credits-parse';

describe('creditsParse', () => {
  test('parses entries keyed by file name', () => {
    const credits = creditsParse({
      'a.jpg': { credit: 'Jane Doe', license: 'CC BY 2.0', sourceUrl: 'https://example.com/a' },
      'b.png': { credit: 'BLM Nevada', license: 'CC0' },
    });
    expect(credits.get('a.jpg')).toEqual({ credit: 'Jane Doe', license: 'CC BY 2.0', sourceUrl: 'https://example.com/a' });
    expect(credits.get('b.png')).toEqual({ credit: 'BLM Nevada', license: 'CC0', sourceUrl: undefined });
    expect(credits.size).toBe(2);
  });

  test('an empty object is no credits', () => {
    expect(creditsParse({}).size).toBe(0);
  });

  test('rejects data that is not an object of entries', () => {
    expect(() => creditsParse(null)).toThrow();
    expect(() => creditsParse([])).toThrow();
    expect(() => creditsParse('x')).toThrow();
    expect(() => creditsParse({ 'a.jpg': 'Jane' })).toThrow();
  });

  test('rejects entries missing a credit or a license, and names the file', () => {
    expect(() => creditsParse({ 'a.jpg': { license: 'CC0' } })).toThrow(/a\.jpg/);
    expect(() => creditsParse({ 'a.jpg': { credit: 'Jane' } })).toThrow(/a\.jpg/);
    expect(() => creditsParse({ 'a.jpg': { credit: '', license: 'CC0' } })).toThrow(/a\.jpg/);
  });

  test('only web links are accepted as source URLs', () => {
    expect(() => creditsParse({ 'a.jpg': { credit: 'x', license: 'y', sourceUrl: 'javascript:alert(1)' } })).toThrow(/a\.jpg/);
    expect(() => creditsParse({ 'a.jpg': { credit: 'x', license: 'y', sourceUrl: 'not a url' } })).toThrow(/a\.jpg/);
    expect(creditsParse({ 'a.jpg': { credit: 'x', license: 'y', sourceUrl: 'http://example.com' } }).size).toBe(1);
  });
});
