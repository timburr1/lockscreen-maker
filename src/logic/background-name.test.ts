import { describe, expect, test } from 'vitest';
import { backgroundFileName, backgroundName } from './background-name';

describe('backgroundFileName', () => {
  test('is the last path segment, extension included', () => {
    expect(backgroundFileName('/src/assets/backgrounds/golden-hour.JPG')).toBe('golden-hour.JPG');
    expect(backgroundFileName('plain.png')).toBe('plain.png');
  });
});

describe('backgroundName', () => {
  test('drops the directory and extension', () => {
    expect(backgroundName('/src/assets/backgrounds/Image01.jpg')).toBe('Image01');
  });

  test('turns dashes and underscores into spaces', () => {
    expect(backgroundName('/src/assets/backgrounds/golden-hour_dunes.webp')).toBe('golden hour dunes');
  });

  test('collapses repeated separators and keeps inner dots', () => {
    expect(backgroundName('/x/a--b__c.v2.png')).toBe('a b c.v2');
  });

  test('a name made only of separators falls back to the file name', () => {
    expect(backgroundName('/x/---.jpg')).toBe('---.jpg');
  });
});
