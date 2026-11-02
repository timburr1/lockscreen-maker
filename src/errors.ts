/** The canvas could not produce an image. */
export class ErrorRender extends Error {
  override name = 'ErrorRender';
}

/** An image could not be fetched or decoded. */
export class ErrorImageDecode extends Error {
  override name = 'ErrorImageDecode';
}
