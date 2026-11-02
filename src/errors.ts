/** The canvas could not produce an image. */
export class ErrorRender extends Error {
  override name = 'ErrorRender';
}

/** An image could not be fetched or decoded. */
export class ErrorImageDecode extends Error {
  override name = 'ErrorImageDecode';
}

/** An uploaded image is too large to handle in a browser. */
export class ErrorImageTooLarge extends Error {
  override name = 'ErrorImageTooLarge';
  readonly limit: 'file' | 'pixels';

  constructor(message: string, limit: 'file' | 'pixels') {
    super(message);
    this.limit = limit;
  }
}
