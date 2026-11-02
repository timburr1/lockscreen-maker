import type { BackgroundBundled } from '../data/backgrounds';
import { IMAGE_MAX_FILE_BYTES, IMAGE_MAX_PIXELS } from '../logic/image-limits';
import type { UploadErrorKind } from './upload-error';

type Props = {
  readonly backgrounds: readonly BackgroundBundled[];
  /** The selected bundled image, or undefined while an upload is selected. */
  readonly selectedId: string | undefined;
  /** The most recent accepted upload's file name, offered as a choice in the group; undefined until one exists. */
  readonly uploadName: string | undefined;
  /** Whether that upload is the selected background. */
  readonly uploadSelected: boolean;
  /** Why the last upload was refused, if it was. */
  readonly uploadError: UploadErrorKind | undefined;
  readonly onSelect: (id: string) => void;
  readonly onSelectUpload: () => void;
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

export function BackgroundPicker({ backgrounds, selectedId, uploadName, uploadSelected, uploadError, onSelect, onSelectUpload, onUpload }: Props) {
  return (
    <fieldset className="control">
      <legend>Background</legend>
      <div className="background-grid">
        {backgrounds.map((background) => (
          <label key={background.id} className="background-option">
            <input type="radio" name="background" checked={background.id === selectedId} onChange={() => onSelect(background.id)} />
            <img src={background.url} alt="" loading="lazy" decoding="async" />
            <span>{background.name}</span>
          </label>
        ))}
        {uploadName !== undefined && (
          <label className="background-option background-option-upload">
            <input type="radio" name="background" checked={uploadSelected} onChange={onSelectUpload} />
            <span className="background-upload-tile">Your image</span>
            <span>{uploadName}</span>
          </label>
        )}
      </div>
      <label htmlFor="background-upload">Or use your own image</label>
      <input
        id="background-upload"
        type="file"
        accept="image/*"
        aria-describedby="background-upload-hint"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file !== undefined) {
            onUpload(file);
          }
        }}
      />
      <p id="background-upload-hint" className="hint">
        Your image stays in this browser; it is never uploaded.
      </p>
      {uploadError !== undefined && <p role="alert">{uploadErrorMessage(uploadError)}</p>}
    </fieldset>
  );
}
