import { ErrorImageDecode } from '../errors';

export async function imageDecodeBlob(blob: Blob): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(blob);
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
