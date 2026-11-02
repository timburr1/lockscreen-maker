import { useEffect, useState } from 'react';
import { logError } from '../log';

export type BackgroundBitmapState = {
  readonly image: ImageBitmap | undefined;
  readonly failed: boolean;
};

/** Decodes the image at `url`, keeping the previous bitmap until its replacement is ready and closing it only after the new one is committed. */
export function useBackgroundBitmap(url: string | undefined, decode: (url: string) => Promise<ImageBitmap>): BackgroundBitmapState {
  const [state, setState] = useState<BackgroundBitmapState>({ image: undefined, failed: false });
  const { image } = state;

  useEffect(() => {
    if (url === undefined) {
      return;
    }
    let cancelled = false;
    const load = async () => {
      try {
        const bitmap = await decode(url);
        if (cancelled) {
          bitmap.close();
          return;
        }
        setState({ image: bitmap, failed: false });
      } catch (error) {
        if (!cancelled) {
          logError('Loading the background failed', error);
          setState((previous) => ({ image: previous.image, failed: true }));
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [url, decode]);

  // Runs after the commit that replaces the bitmap, so no render can still be holding the closed one.
  useEffect(
    () => () => {
      image?.close();
    },
    [image],
  );

  return state;
}
