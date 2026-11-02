import { ErrorRender } from '../errors';
import type { Size } from './geometry';
import { latestCreate } from './latest';

export type PreviewState =
  | { readonly kind: 'idle' }
  /** `size` is the size the blob was rendered at, which can differ from the current spec while a newer render is pending. */
  | { readonly kind: 'ready'; readonly url: string; readonly blob: Blob; readonly size: Size }
  | { readonly kind: 'overflow' }
  | { readonly kind: 'error'; readonly reason: 'render' | 'internal' };

export type PreviewDeps<TSpec extends { readonly size: Size }, TImage> = {
  render(spec: TSpec, image: TImage): Promise<{ readonly kind: 'ok'; readonly blob: Blob } | { readonly kind: 'overflow' }>;
  urlCreate(blob: Blob): string;
  urlRevoke(url: string): void;
  onState(state: PreviewState): void;
  onError(message: string, cause: unknown): void;
  debounceMs: number;
};

export type PreviewController<TSpec, TImage> = {
  /** Schedules a render after the debounce, replacing any render not yet started. */
  request(spec: TSpec, image: TImage): void;
  /** Cancels pending work and revokes the current object URL; later requests are ignored. */
  dispose(): void;
};

/** Debounces renders, keeps only the latest result, and owns the lifetime of the object URL shown to the user. */
export function previewControllerCreate<TSpec extends { readonly size: Size }, TImage>(deps: PreviewDeps<TSpec, TImage>): PreviewController<TSpec, TImage> {
  const latest = latestCreate();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let currentUrl: string | undefined;
  let disposed = false;

  const urlReplace = (url: string | undefined) => {
    if (currentUrl !== undefined) {
      deps.urlRevoke(currentUrl);
    }
    currentUrl = url;
  };

  const run = async (spec: TSpec, image: TImage) => {
    try {
      const result = await latest.run(() => deps.render(spec, image));
      if (result.kind === 'stale' || disposed) {
        return;
      }
      if (result.value.kind === 'overflow') {
        deps.onState({ kind: 'overflow' });
        return;
      }
      const url = deps.urlCreate(result.value.blob);
      urlReplace(url);
      deps.onState({ kind: 'ready', url, blob: result.value.blob, size: spec.size });
    } catch (error) {
      if (disposed) {
        return;
      }
      deps.onError('Rendering the lockscreen failed', error);
      deps.onState({ kind: 'error', reason: error instanceof ErrorRender ? 'render' : 'internal' });
    }
  };

  return {
    request(spec, image) {
      if (disposed) {
        return;
      }
      clearTimeout(timer);
      timer = setTimeout(() => {
        void run(spec, image);
      }, deps.debounceMs);
    },
    dispose() {
      disposed = true;
      clearTimeout(timer);
      urlReplace(undefined);
    },
  };
}
