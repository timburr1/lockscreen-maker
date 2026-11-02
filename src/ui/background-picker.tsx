import type { BackgroundBundled } from '../data/backgrounds';
import { IMAGE_MAX_FILE_BYTES, IMAGE_MAX_PIXELS } from '../logic/image-limits';
import type { UploadErrorKind } from './upload-error';

type Props = {
  readonly backgrounds: readonly BackgroundBundled[];
  /** The selected bundled image, or undefined while an upload is selected. */
  readonly selectedId: string | undefined;
  /** The name of the selected upload, if any. */
  readonly uploadName: string | undefined;
  /** Why the last upload was refused, if it was. */
  readonly uploadError: UploadErrorKind | undefined;
  readonly onSelect: (id: string) => void;
  readonly onUpload: (file: File) => void;
};

function uploadErrorMessage(kind: UploadErrorKind): string {
  switch (kind) {
    case 'file-too-large':
      return `That file is larger than ${IMAGE_MAX_FILE_BYTES / (1024 * 1024)} MB. Try a smaller one.`;
    case 'pixels-too-large':
      return `That image has more than ${IMAGE_MAX_PIXELS / 1_000_000} megapixels, which is too many for a browser to handle. Try a smaller one.`;
    case 'unreadable':
      return 'This browser cannot read that file. Try a JPEG or PNG.';
    case 'internal':
      return 'Something went wrong while reading that file.';
    default: {
      const unreachable: never = kind;
      throw new Error(`Unhandled upload error ${String(unreachable)}`);
    }
  }
}

export function BackgroundPicker({ backgrounds, selectedId, uploadName, uploadError, onSelect, onUpload }: Props) {
  return (
    <fieldset className="control">
      <legend>Background</legend>
      <div className="background-grid">
        {backgrounds.map((background) => (
          <button
            key={background.id}
            type="button"
            className="background-option"
            aria-pressed={background.id === selectedId}
            onClick={() => onSelect(background.id)}
          >
            <img src={background.url} alt="" loading="lazy" decoding="async" />
            <span>{background.name}</span>
          </button>
        ))}
      </div>
      <label htmlFor="background-upload">Or use your own image</label>
      <input
        id="background-upload"
        type="file"
        accept="image/*"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file !== undefined) {
            onUpload(file);
          }
        }}
      />
      <p className="hint">Your image stays in this browser; it is never uploaded.</p>
      {uploadError !== undefined && <p role="alert">{uploadErrorMessage(uploadError)}</p>}
      {uploadName !== undefined && <p className="hint">Using your image: {uploadName}</p>}
    </fieldset>
  );
}
