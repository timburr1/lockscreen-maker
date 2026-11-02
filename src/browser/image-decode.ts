import { ErrorImageDecode, ErrorImageTooLarge } from '../errors';
import type { Size } from '../logic/geometry';
import { IMAGE_MAX_FILE_BYTES, IMAGE_MAX_PIXELS, imageFileFits, imagePixelsFit } from '../logic/image-limits';

export async function imageDecodeBlob(blob: Blob): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(blob, { imageOrientation: 'from-image' });
  } catch (cause) {
    throw new ErrorImageDecode('The image could not be decoded', { cause });
  }
}

export async function imageDecodeUrl(url: string): Promise<ImageBitmap> {
  let response: Response;
  try {
    response = await fetch(url);
  } catch (cause) {
    throw new ErrorImageDecode('The image could not be loaded', { cause });
  }
  if (!response.ok) {
    throw new ErrorImageDecode(`The image could not be loaded (HTTP ${response.status})`);
  }
  return imageDecodeBlob(await response.blob());
}

/** Reads the pixel dimensions through an <img>, which does not allocate the decoded pixels the way createImageBitmap does. */
async function imageDimensionsRead(blob: Blob): Promise<Size> {
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new ErrorImageDecode('The file is not an image this browser can read'));
      image.src = url;
    });
    return { width: image.naturalWidth, height: image.naturalHeight };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Decodes an uploaded file, refusing files and images too large for a browser to hold before they are decoded. */
export async function imageDecodeFile(file: File): Promise<ImageBitmap> {
  if (!imageFileFits(file.size)) {
    throw new ErrorImageTooLarge(`The file is ${file.size} bytes; the limit is ${IMAGE_MAX_FILE_BYTES}`, 'file');
  }
  const size = await imageDimensionsRead(file);
  if (!imagePixelsFit(size)) {
    throw new ErrorImageTooLarge(`The image is ${size.width} by ${size.height} pixels; the limit is ${IMAGE_MAX_PIXELS} pixels in total`, 'pixels');
  }
  return imageDecodeBlob(file);
}
