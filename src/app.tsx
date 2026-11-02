import type { imageDecodeUrl } from './browser/image-decode';
import type { LockscreenRenderer } from './browser/lockscreen-renderer';
import { BACKGROUNDS_BUNDLED } from './data/backgrounds';
import { DEVICE_PRESETS } from './data/device-presets';
import { SPEC_DEFAULT_STYLE, SPEC_DEFAULT_TEXT } from './state/spec';
import { PreviewImage } from './ui/preview-image';
import { useBackgroundBitmap } from './ui/use-background-bitmap';
import { useLockscreenImage } from './ui/use-lockscreen-image';

const preset = DEVICE_PRESETS.find((p) => p.id === 'iphone-15-16');
if (preset === undefined) {
  throw new Error('Default device preset is missing from DEVICE_PRESETS');
}
const background = BACKGROUNDS_BUNDLED[0];

const spec = {
  size: { width: preset.width, height: preset.height },
  deviceClass: preset.deviceClass,
  focus: { x: 0.5, y: 0.5 },
  text: SPEC_DEFAULT_TEXT,
  style: SPEC_DEFAULT_STYLE,
};

type Props = {
  readonly renderer: LockscreenRenderer;
  readonly imageDecode: typeof imageDecodeUrl;
};

export function App({ renderer, imageDecode }: Props) {
  const { image, failed } = useBackgroundBitmap(background?.url, imageDecode);
  const imageState = useLockscreenImage(renderer, spec, image);

  if (background === undefined) {
    return <p>Add images to src/assets/backgrounds to get started.</p>;
  }

  return (
    <main>
      <h1>Lockscreen Maker</h1>
      {failed && <p role="alert">The background image could not be loaded.</p>}
      <PreviewImage state={imageState} />
    </main>
  );
}
