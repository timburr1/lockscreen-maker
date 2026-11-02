import { ErrorImageDecode, ErrorImageTooLarge } from '../errors';

export type UploadErrorKind = 'file-too-large' | 'pixels-too-large' | 'unreadable' | 'internal';

/** Separates what the user can fix (a file that is too big or not an image) from bugs. */
export function uploadErrorKind(error: unknown): UploadErrorKind {
  if (error instanceof ErrorImageTooLarge) {
    return error.limit === 'file' ? 'file-too-large' : 'pixels-too-large';
  }
  return error instanceof ErrorImageDecode ? 'unreadable' : 'internal';
}
