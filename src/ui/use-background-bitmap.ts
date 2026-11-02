import { useEffect, useState } from 'react';
import { logError } from '../log';

export type BackgroundBitmapState = {
  readonly image: ImageBitmap | undefined;
  /** The key the bitmap was decoded for; callers must render only when it is the key they want. */
  readonly imageKey: object | undefined;
  /** The most recent load failed. */
  readonly failed: boolean;
};

/**
 * Decodes the image that `load` produces for `key`, keeping the previous bitmap until its replacement is ready and closing it only after the new one is committed.
 *
 * `key` is compared by identity, and `load` must be referentially stable for a given key, or every render restarts the decode.
 */
export function useBackgroundBitmap(key: object, load: () => Promise<ImageBitmap>): BackgroundBitmapState {
  const [state, setState] = useState<BackgroundBitmapState>({ image: undefined, imageKey: undefined, failed: false });
  const { image } = state;

  useEffect(() => {
    let cancelled = false;
    setState((previous) => ({ ...previous, failed: false }));
    const run = async () => {
      try {
        const bitmap = await load();
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
    void run();
    return () => {
      cancelled = true;
    };
  }, [key, load]);

  // Runs after the commit that replaces the bitmap, so no render can still be holding the closed one.
  useEffect(
    () => () => {
      image?.close();
    },
    [image],
  );

  return state;
}
