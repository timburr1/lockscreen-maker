import { useMemo, useReducer, useState } from 'react';
import type { imageDecodeFile, imageDecodeUrl } from './browser/image-decode';
import type { LockscreenRenderer } from './browser/lockscreen-renderer';
import { BACKGROUNDS_BUNDLED, backgroundBundledFind } from './data/backgrounds';
import { logError } from './log';
import type { DeviceScreen } from './logic/device-screen';
import { IMAGE_UPSCALE_WARN, imageCropAxis, imageCropScale } from './logic/image-crop';
import type { BackgroundRef } from './state/spec';
import { specInitial } from './state/spec-initial';
import { specReduce } from './state/spec-reduce';
import { About } from './ui/about';
import { BackgroundPicker } from './ui/background-picker';
import { DevicePicker } from './ui/device-picker';
import { FocusControl } from './ui/focus-control';
import { PreviewImage } from './ui/preview-image';
import { StyleControls } from './ui/style-controls';
import { TextEditor } from './ui/text-editor';
import { type UploadErrorKind, uploadErrorKind } from './ui/upload-error';
import { useBackgroundBitmap } from './ui/use-background-bitmap';
import { useLockscreenImage } from './ui/use-lockscreen-image';

type Props = {
  readonly renderer: LockscreenRenderer;
  readonly imageDecodeUrl: typeof imageDecodeUrl;
  readonly imageDecodeFile: typeof imageDecodeFile;
  readonly screen: DeviceScreen | undefined;
  /** Start on the detected screen instead of the default preset. */
  readonly screenPreferred: boolean;
  readonly touch: boolean;
};

type EditorProps = Props & { readonly backgroundId: string };

function backgroundLoad(background: BackgroundRef, decodeUrl: typeof imageDecodeUrl, decodeFile: typeof imageDecodeFile): () => Promise<ImageBitmap> {
  switch (background.kind) {
    case 'bundled': {
      const bundled = backgroundBundledFind(background.id);
      if (bundled === undefined) {
        throw new Error(`Selected background ${background.id} is not bundled`);
      }
      return () => decodeUrl(bundled.url);
    }
    case 'upload':
      return () => decodeFile(background.file);
    default: {
      const unreachable: never = background;
      throw new Error(`Unhandled background ${JSON.stringify(unreachable)}`);
    }
  }
}

function Editor({ renderer, imageDecodeUrl: decodeUrl, imageDecodeFile: decodeFile, screen, screenPreferred, touch, backgroundId }: EditorProps) {
  const [spec, dispatch] = useReducer(specReduce, { screen, screenPreferred, backgroundId }, specInitial);
  const [guideVisible, setGuideVisible] = useState(true);
  const [uploadError, setUploadError] = useState<UploadErrorKind | undefined>(undefined);
  // The latest accepted upload stays selectable after the user tries a bundled image.
  const [upload, setUpload] = useState<File | undefined>(undefined);
  const load = useMemo(() => backgroundLoad(spec.background, decodeUrl, decodeFile), [spec.background, decodeUrl, decodeFile]);
  const bitmap = useBackgroundBitmap(spec.background, load);
  // A bitmap decoded for a previous background must not be drawn under the new spec.
  const image = bitmap.imageKey === spec.background ? bitmap.image : undefined;
  const state = useLockscreenImage(renderer, spec, image);

  // An upload joins the spec only once it is known to decode, so a bad file never displaces the current background.
  const uploadAccept = async (file: File) => {
    setUploadError(undefined);
    try {
      const probe = await decodeFile(file);
      probe.close();
      setUpload(file);
      dispatch({ kind: 'background-set', background: { kind: 'upload', file } });
    } catch (error) {
      logError('Reading the uploaded image failed', error);
      setUploadError(uploadErrorKind(error));
    }
  };

  const imageSize = image === undefined ? undefined : { width: image.width, height: image.height };
  const cropAxis = imageSize === undefined ? undefined : imageCropAxis(imageSize, spec.size);
  const imageSoft = imageSize !== undefined && imageCropScale(imageSize, spec.size) > IMAGE_UPSCALE_WARN;

  return (
    <main>
      <h1>Lockscreen Maker</h1>
      <div className="editor">
        <div className="editor-preview">
          {bitmap.failed && <p role="alert">The background image could not be loaded.</p>}
          {imageSoft && <p role="status">This image is small for this screen size, so it may look soft.</p>}
          <PreviewImage state={state} touch={touch} guideVisible={guideVisible} />
        </div>
        <div className="editor-controls">
          <DevicePicker size={spec.size} deviceClass={spec.deviceClass} selection={spec.deviceSelection} screen={screen} dispatch={dispatch} />
          <BackgroundPicker
            backgrounds={BACKGROUNDS_BUNDLED}
            selectedId={spec.background.kind === 'bundled' ? spec.background.id : undefined}
            uploadName={upload?.name}
            uploadSelected={spec.background.kind === 'upload'}
            onSelect={(id) => dispatch({ kind: 'background-set', background: { kind: 'bundled', id } })}
            uploadError={uploadError}
            onSelectUpload={() => {
              if (upload !== undefined) {
                dispatch({ kind: 'background-set', background: { kind: 'upload', file: upload } });
              }
            }}
            onUpload={(file) => void uploadAccept(file)}
          />
          {cropAxis !== undefined && <FocusControl axis={cropAxis} focus={spec.focus} dispatch={dispatch} />}
          <TextEditor text={spec.text} onChange={(text) => dispatch({ kind: 'text-set', text })} />
          <StyleControls style={spec.style} dispatch={dispatch} />
          <div className="control">
            <label>
              <input type="checkbox" checked={guideVisible} onChange={(event) => setGuideVisible(event.target.checked)} /> Show the area the lock screen clock
              covers
            </label>
          </div>
        </div>
      </div>
      <About />
    </main>
  );
}

export function App(props: Props) {
  const first = BACKGROUNDS_BUNDLED[0];
  if (first === undefined) {
    return <p>Add images to src/assets/backgrounds to get started.</p>;
  }
  return <Editor {...props} backgroundId={first.id} />;
}
