import { useReducer } from 'react';
import type { imageDecodeUrl } from './browser/image-decode';
import type { LockscreenRenderer } from './browser/lockscreen-renderer';
import { BACKGROUNDS_BUNDLED, backgroundBundledFind } from './data/backgrounds';
import type { DeviceScreen } from './logic/device-screen';
import { specInitial } from './state/spec-initial';
import { specReduce } from './state/spec-reduce';
import { BackgroundPicker } from './ui/background-picker';
import { DevicePicker } from './ui/device-picker';
import { PreviewImage } from './ui/preview-image';
import { TextEditor } from './ui/text-editor';
import { useBackgroundBitmap } from './ui/use-background-bitmap';
import { useLockscreenImage } from './ui/use-lockscreen-image';

type Props = {
  readonly renderer: LockscreenRenderer;
  readonly imageDecode: typeof imageDecodeUrl;
  readonly screen: DeviceScreen | undefined;
  /** Start on the detected screen instead of the default preset. */
  readonly screenPreferred: boolean;
  readonly touch: boolean;
};

type EditorProps = Props & { readonly backgroundId: string };

function Editor({ renderer, imageDecode, screen, screenPreferred, touch, backgroundId }: EditorProps) {
  const [spec, dispatch] = useReducer(specReduce, { screen, screenPreferred, backgroundId }, specInitial);
  const background = backgroundBundledFind(spec.background.id);
  if (background === undefined) {
    throw new Error(`Selected background ${spec.background.id} is not bundled`);
  }
  const bitmap = useBackgroundBitmap(background.id, background.url, imageDecode);
  // A bitmap decoded for a previous background must not be drawn under the new spec.
  const image = bitmap.imageKey === background.id ? bitmap.image : undefined;
  const state = useLockscreenImage(renderer, spec, image);

  return (
    <main>
      <h1>Lockscreen Maker</h1>
      <div className="editor">
        <div className="editor-preview">
          {bitmap.failed && <p role="alert">The background image could not be loaded.</p>}
          <PreviewImage state={state} touch={touch} />
        </div>
        <div className="editor-controls">
          <DevicePicker size={spec.size} deviceClass={spec.deviceClass} selection={spec.deviceSelection} screen={screen} dispatch={dispatch} />
          <BackgroundPicker
            backgrounds={BACKGROUNDS_BUNDLED}
            selectedId={background.id}
            onSelect={(id) => dispatch({ kind: 'background-set', background: { kind: 'bundled', id } })}
          />
          <TextEditor text={spec.text} onChange={(text) => dispatch({ kind: 'text-set', text })} />
        </div>
      </div>
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
