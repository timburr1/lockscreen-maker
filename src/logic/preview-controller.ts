import { ErrorRender } from '../errors';
import type { Size } from './geometry';
import { latestCreate } from './latest';
import type { DeviceClass } from './safe-area';

/** `size` and `deviceClass` are what the blob was rendered with, which can differ from the current spec while a newer render is pending; overlays must match them, not the spec. */
export type PreviewReady = { readonly kind: 'ready'; readonly url: string; readonly blob: Blob; readonly size: Size; readonly deviceClass: DeviceClass };

/** Every state except ready carries the last good render, so the UI can keep showing it, clearly marked out of date, but never offer it for saving. */
export type PreviewState =
  | PreviewReady
  | { readonly kind: 'pending'; readonly previous: PreviewReady | undefined }
  | { readonly kind: 'overflow'; readonly previous: PreviewReady | undefined }
  | { readonly kind: 'error'; readonly reason: 'render' | 'internal'; readonly previous: PreviewReady | undefined };

export type PreviewDeps<TSpec extends { readonly size: Size; readonly deviceClass: DeviceClass }, TImage> = {
  render(spec: TSpec, image: TImage): Promise<{ readonly kind: 'ok'; readonly blob: Blob } | { readonly kind: 'overflow' }>;
  urlCreate(blob: Blob): string;
  urlRevoke(url: string): void;
  onState(state: PreviewState): void;
  onError(message: string, cause: unknown): void;
  debounceMs: number;
};

export type PreviewController<TSpec, TImage> = {
  /** Marks the preview pending at once; renders after the debounce, replacing any render not yet started. Without an image it only marks pending. */
  request(spec: TSpec, image: TImage | undefined): void;
  /** Cancels pending work and revokes the current object URL; later requests are ignored. */
  dispose(): void;
};

/** Debounces renders, keeps only the latest result, and owns the lifetime of the object URL shown to the user. */
export function previewControllerCreate<TSpec extends { readonly size: Size; readonly deviceClass: DeviceClass }, TImage>(
  deps: PreviewDeps<TSpec, TImage>,
): PreviewController<TSpec, TImage> {
  const latest = latestCreate();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let current: PreviewReady | undefined;
  let disposed = false;

  const run = async (spec: TSpec, image: TImage) => {
    try {
      const result = await latest.run(() => deps.render(spec, image));
      if (result.kind === 'stale' || disposed) {
        return;
      }
      if (result.value.kind === 'overflow') {
        deps.onState({ kind: 'overflow', previous: current });
        return;
      }
      const ready: PreviewReady = {
        kind: 'ready',
        url: deps.urlCreate(result.value.blob),
        blob: result.value.blob,
        size: spec.size,
        deviceClass: spec.deviceClass,
      };
      const replaced = current;
      current = ready;
      if (replaced !== undefined) {
        deps.urlRevoke(replaced.url);
      }
      deps.onState(ready);
    } catch (error) {
      if (disposed) {
        return;
      }
      deps.onError('Rendering the lockscreen failed', error);
      deps.onState({ kind: 'error', reason: error instanceof ErrorRender ? 'render' : 'internal', previous: current });
    }
  };

  return {
    request(spec, image) {
      if (disposed) {
        return;
      }
      clearTimeout(timer);
      deps.onState({ kind: 'pending', previous: current });
      if (image !== undefined) {
        timer = setTimeout(() => {
          void run(spec, image);
        }, deps.debounceMs);
      }
    },
    dispose() {
      disposed = true;
      clearTimeout(timer);
      if (current !== undefined) {
        deps.urlRevoke(current.url);
        current = undefined;
      }
    },
  };
}
