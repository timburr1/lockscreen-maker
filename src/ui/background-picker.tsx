import type { BackgroundBundled } from '../data/backgrounds';

type Props = {
  readonly backgrounds: readonly BackgroundBundled[];
  readonly selectedId: string;
  readonly onSelect: (id: string) => void;
};

export function BackgroundPicker({ backgrounds, selectedId, onSelect }: Props) {
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
    </fieldset>
  );
}
