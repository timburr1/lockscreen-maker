import { useMemo, useState } from 'react';
import { OUTPUT_MIME_TYPE } from '../browser/lockscreen-renderer';
import { logError } from '../log';
import type { PreviewReady, PreviewState } from '../logic/preview-controller';
import { safeAreaGuide } from '../logic/safe-area';

const FILE_NAME = 'lockscreen.jpg';

type Props = {
  readonly state: PreviewState;
  readonly touch: boolean;
  readonly guideVisible: boolean;
};

function canShareFile(file: File): boolean {
  return typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] });
}

function problemMessage(state: PreviewState): string | undefined {
  switch (state.kind) {
    case 'overflow':
      return 'There is too much text to fit on this screen. Remove some, or choose a larger screen.';
    case 'error':
      return state.reason === 'render' ? 'This browser could not create the image.' : 'Something went wrong while creating the image.';
    case 'pending':
    case 'ready':
      return undefined;
    default: {
      const unreachable: never = state;
      throw new Error(`Unhandled preview state ${JSON.stringify(unreachable)}`);
    }
  }
}

/** Drawn over the displayed image, never into the file, and sized from what that image was rendered with. */
function SafeAreaGuide({ size, deviceClass }: Pick<PreviewReady, 'size' | 'deviceClass'>) {
  const guide = safeAreaGuide(size, deviceClass);
  const percent = (fraction: number) => `${fraction * 100}%`;
  return (
    <div className="preview-guide" aria-hidden="true">
      <div className="preview-guide-reserved" style={{ height: percent(guide.top) }} />
      <div
        className="preview-guide-area"
        style={{ left: percent(guide.left), top: percent(guide.top), width: percent(guide.width), height: percent(guide.height) }}
      />
    </div>
  );
}

/** Shows the current image with save actions; while a newer render is pending or has failed, the last good one stays visible but dimmed and cannot be saved. */
export function PreviewImage({ state, touch, guideVisible }: Props) {
  const [shareError, setShareError] = useState<string | undefined>(undefined);
  const shown = state.kind === 'ready' ? state : state.previous;
  const current = state.kind === 'ready';
  const blob = shown?.blob;
  const file = useMemo(() => (blob === undefined ? undefined : new File([blob], FILE_NAME, { type: OUTPUT_MIME_TYPE })), [blob]);
  const problem = problemMessage(state);

  const share = async (shared: File) => {
    setShareError(undefined);
    try {
      await navigator.share({ files: [shared] });
    } catch (error) {
      // Dismissing the share sheet rejects with AbortError; that is the user's choice, not a failure.
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }
      logError('Sharing the lockscreen failed', error);
      setShareError('Sharing failed. Hold the image to save it instead.');
    }
  };

  if (shown === undefined || file === undefined) {
    return problem === undefined ? <p>Creating image…</p> : <p role="alert">{problem}</p>;
  }

  return (
    <figure className="preview">
      {problem !== undefined && <p role="alert">{problem}</p>}
      <div className="preview-frame">
        <img
          className={current ? undefined : 'preview-stale'}
          src={shown.url}
          width={shown.size.width}
          height={shown.size.height}
          alt={current ? 'Your generated lockscreen' : 'Out-of-date preview of your lockscreen'}
        />
        {guideVisible && <SafeAreaGuide size={shown.size} deviceClass={shown.deviceClass} />}
      </div>
      {current && (
        <>
          <figcaption>On a phone, hold the image and choose Save Image.</figcaption>
          <div className="preview-actions">
            {canShareFile(file) && (
              <button type="button" onClick={() => void share(file)}>
                Share / Save
              </button>
            )}
            {!touch && (
              <a href={shown.url} download={FILE_NAME}>
                Download
              </a>
            )}
          </div>
          {shareError !== undefined && <p role="alert">{shareError}</p>}
        </>
      )}
    </figure>
  );
}
