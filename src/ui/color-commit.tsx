import { useChangeCommit } from './use-change-commit';

type Props = {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly onCommit: (value: string) => void;
};

function inputText(input: HTMLInputElement): string {
  return input.value;
}

/** A color input that reports its value only when the user finishes (the native `change` event), so the preview does not dim and restart its render timer while a color is being dragged. */
export function ColorCommit({ id, label, value, onCommit }: Props) {
  const { local, setLocal, inputRef } = useChangeCommit(value, inputText, onCommit);

  return (
    <div className="control">
      <label htmlFor={id}>{label}</label>
      <input ref={inputRef} id={id} type="color" value={local} onChange={(event) => setLocal(event.target.value)} />
    </div>
  );
}
