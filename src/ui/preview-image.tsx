import { useMemo, useState } from 'react';
import { OUTPUT_MIME_TYPE } from '../browser/lockscreen-renderer';
import { logError } from '../log';
import type { PreviewState } from '../logic/preview-controller';

const FILE_NAME = 'lockscreen.jpg';

type Props = {
  readonly state: PreviewState;
};

function canShareFile(file: File): boolean {
  return typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] });
}

export function PreviewImage({ state }: Props) {
  const [shareError, setShareError] = useState<string | undefined>(undefined);
  const blob = state.kind === 'ready' ? state.blob : undefined;
  const file = useMemo(() => (blob === undefined ? undefined : new File([blob], FILE_NAME, { type: OUTPUT_MIME_TYPE })), [blob]);

  if (state.kind === 'idle') {
    return <p>Creating image…</p>;
  }
  if (state.kind === 'overflow') {
    return <p role="alert">There is too much text to fit on this screen. Remove some, or choose a larger screen.</p>;
  }
  if (state.kind === 'error') {
    return <p role="alert">{state.reason === 'render' ? 'This browser could not create the image.' : 'Something went wrong while creating the image.'}</p>;
  }
  if (file === undefined) {
    throw new Error('A ready preview has a blob');
  }

  const touch = window.matchMedia('(pointer: coarse)').matches;

  const share = async () => {
    setShareError(undefined);
    try {
      await navigator.share({ files: [file] });
    } catch (error) {
      // Dismissing the share sheet rejects with AbortError; that is the user's choice, not a failure.
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }
      logError('Sharing the lockscreen failed', error);
      setShareError('Sharing failed. Hold the image to save it instead.');
    }
  };

  return (
    <figure className="preview">
      <img src={state.url} width={state.size.width} height={state.size.height} alt="Your generated lockscreen" />
      <figcaption>On a phone, hold the image and choose Save Image.</figcaption>
      <div className="preview-actions">
        {canShareFile(file) && (
          <button type="button" onClick={() => void share()}>
            Share / Save
          </button>
        )}
        {!touch && (
          <a href={state.url} download={FILE_NAME}>
            Download
          </a>
        )}
      </div>
      {shareError !== undefined && <p role="alert">{shareError}</p>}
    </figure>
  );
}
