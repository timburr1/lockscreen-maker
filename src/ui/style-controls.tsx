import type { LockscreenStyle } from '../state/spec';
import type { SpecAction } from '../state/spec-reduce';
import { percentFormat } from './percent-format';
import { SliderCommit } from './slider-commit';

type Props = {
  readonly style: LockscreenStyle;
  readonly dispatch: (action: SpecAction) => void;
};

function alignParse(value: string): LockscreenStyle['align'] {
  if (value === 'left' || value === 'center') {
    return value;
  }
  throw new Error(`Unknown alignment ${value}`);
}

function colorParse(value: string): LockscreenStyle['color'] {
  if (value === 'auto' || value === 'white' || value === 'black') {
    return value;
  }
  throw new Error(`Unknown text colour ${value}`);
}

export function StyleControls({ style, dispatch }: Props) {
  const set = (next: Partial<LockscreenStyle>) => dispatch({ kind: 'style-set', style: next });

  return (
    <fieldset className="control">
      <legend>Text style</legend>
      <label htmlFor="style-align">Alignment</label>
      <select id="style-align" value={style.align} onChange={(event) => set({ align: alignParse(event.target.value) })}>
        <option value="center">Center</option>
        <option value="left">Left</option>
      </select>
      <label htmlFor="style-color">Color</label>
      <select id="style-color" value={style.color} onChange={(event) => set({ color: colorParse(event.target.value) })}>
        <option value="auto">Automatic</option>
        <option value="white">White</option>
        <option value="black">Black</option>
      </select>
      <SliderCommit
        id="style-size"
        label="Size"
        min={0.5}
        max={2}
        step={0.05}
        value={style.sizeScale}
        format={percentFormat}
        onCommit={(sizeScale) => set({ sizeScale })}
      />
      <SliderCommit
        id="style-scrim"
        label="Backdrop"
        min={0}
        max={1}
        step={0.05}
        value={style.scrim}
        format={percentFormat}
        onCommit={(scrim) => set({ scrim })}
      />
      <SliderCommit
        id="style-position"
        label="Vertical position"
        min={0}
        max={1}
        step={0.01}
        value={style.position}
        format={(value) => `${percentFormat(value)} from the top`}
        onCommit={(position) => set({ position })}
      />
    </fieldset>
  );
}
