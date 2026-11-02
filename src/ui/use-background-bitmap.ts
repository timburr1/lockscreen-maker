import { useEffect, useState } from 'react';
import { logError } from '../log';

export type BackgroundBitmapState = {
  readonly image: ImageBitmap | undefined;
  /** The key the bitmap was decoded for; callers must render only when it matches the background they want. */
  readonly imageKey: string | undefined;
  /** The most recent load for the requested key failed. */
  readonly failed: boolean;
};

/** Decodes the image at `url` (identified by `key`), keeping the previous bitmap until its replacement is ready and closing it only after the new one is committed. */
export function useBackgroundBitmap(key: string, url: string, decode: (url: string) => Promise<ImageBitmap>): BackgroundBitmapState {
  const [state, setState] = useState<BackgroundBitmapState>({ image: undefined, imageKey: undefined, failed: false });
  const { image } = state;

  useEffect(() => {
    let cancelled = false;
    setState((previous) => ({ ...previous, failed: false }));
    const load = async () => {
      try {
        const bitmap = await decode(url);
        if (cancelled) {
          bitmap.close();
          return;
        }
        setState({ image: bitmap, imageKey: key, failed: false });
      } catch (error) {
        if (!cancelled) {
          logError('Loading the background failed', error);
          setState((previous) => ({ ...previous, failed: true }));
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [key, url, decode]);

  // Runs after the commit that replaces the bitmap, so no render can still be holding the closed one.
  useEffect(
    () => () => {
      image?.close();
    },
    [image],
  );

  return state;
}
