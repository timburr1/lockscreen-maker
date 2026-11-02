import { useEffect, useRef, useState } from 'react';
import type { LockscreenRenderer } from '../browser/lockscreen-renderer';
import { logError } from '../log';
import { type PreviewController, type PreviewState, previewControllerCreate } from '../logic/preview-controller';
import type { LockscreenSpecRender } from '../state/spec';

const RENDER_DEBOUNCE_MS = 200;

/**
 * Renders the spec to an image after a short pause. The spec must be referentially stable between edits (take it straight from state):
 * each completed render re-renders the caller, and a spec rebuilt on every render would retrigger the effect forever.
 */
export function useLockscreenImage(renderer: LockscreenRenderer, spec: LockscreenSpecRender, image: ImageBitmap | undefined): PreviewState {
  const [state, setState] = useState<PreviewState>({ kind: 'idle' });
  const controllerRef = useRef<PreviewController<LockscreenSpecRender, ImageBitmap> | undefined>(undefined);

  useEffect(() => {
    const controller = previewControllerCreate<LockscreenSpecRender, ImageBitmap>({
      render: (renderSpec, bitmap) => renderer.render(renderSpec, bitmap),
      urlCreate: (blob) => URL.createObjectURL(blob),
      urlRevoke: (url) => URL.revokeObjectURL(url),
      onState: setState,
      onError: logError,
      debounceMs: RENDER_DEBOUNCE_MS,
    });
    controllerRef.current = controller;
    return () => {
      controller.dispose();
      controllerRef.current = undefined;
    };
  }, [renderer]);

  useEffect(() => {
    if (image !== undefined) {
      controllerRef.current?.request(spec, image);
    }
  }, [spec, image]);

  return state;
}
