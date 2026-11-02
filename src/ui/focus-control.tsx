import type { SpecAction } from '../state/spec-reduce';
import { SliderCommit } from './slider-commit';

type Props = {
  /** The axis the crop discards along; the control moves only that one. */
  readonly axis: 'x' | 'y';
  readonly focus: { readonly x: number; readonly y: number };
  readonly dispatch: (action: SpecAction) => void;
};

export function FocusControl({ axis, focus, dispatch }: Props) {
  return (
    <SliderCommit
      id="focus"
      label={axis === 'x' ? 'Crop position (left to right)' : 'Crop position (top to bottom)'}
      min={0}
      max={1}
      step={0.01}
      value={focus[axis]}
      onCommit={(value) => dispatch({ kind: 'focus-set', axis, value })}
    />
  );
}
