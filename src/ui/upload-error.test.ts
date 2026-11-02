import { describe, expect, test } from 'vitest';
import { ErrorImageDecode, ErrorImageTooLarge } from '../errors';
import { uploadErrorKind } from './upload-error';

describe('uploadErrorKind', () => {
  test('tells the two size limits apart', () => {
    expect(uploadErrorKind(new ErrorImageTooLarge('x', 'file'))).toBe('file-too-large');
    expect(uploadErrorKind(new ErrorImageTooLarge('x', 'pixels'))).toBe('pixels-too-large');
  });

  test('a file the browser cannot decode is unreadable', () => {
    expect(uploadErrorKind(new ErrorImageDecode('x'))).toBe('unreadable');
  });

  test('anything else is a bug, not a user mistake', () => {
    expect(uploadErrorKind(new Error('x'))).toBe('internal');
    expect(uploadErrorKind('x')).toBe('internal');
  });
});
