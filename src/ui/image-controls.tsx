import { type ColorHex, colorHexParse } from '../logic/color-pick';
import type { ImageRotation } from '../logic/image-rotation';
import type { BackgroundFit } from '../state/spec';
import type { SpecAction } from '../state/spec-reduce';
import { ColorCommit } from './color-commit';

type Props = {
  readonly fit: BackgroundFit;
  readonly rotation: ImageRotation;
  readonly color: ColorHex;
  readonly dispatch: (action: SpecAction) => void;
};

function fitParse(value: string): BackgroundFit {
  if (value === 'cover' || value === 'contain') {
    return value;
  }
  throw new Error(`Unknown background fit ${value}`);
}

export function ImageControls({ fit, rotation, color, dispatch }: Props) {
  return (
    <fieldset className="control">
      <legend>Image placement</legend>
      <label htmlFor="background-fit">Show</label>
      <select id="background-fit" value={fit} onChange={(event) => dispatch({ kind: 'background-fit-set', fit: fitParse(event.target.value) })}>
        <option value="cover">Fill the screen (crops the image)</option>
        <option value="contain">Show the whole image</option>
      </select>
      <button type="button" onClick={() => dispatch({ kind: 'background-rotation-next' })}>
        Rotate 90° clockwise (now {rotation}°)
      </button>
      {fit === 'contain' && (
        <ColorCommit
          id="background-color"
          label="Color around the image"
          value={color}
          onCommit={(value) => dispatch({ kind: 'background-color-set', color: colorHexParse(value) })}
        />
      )}
    </fieldset>
  );
}
