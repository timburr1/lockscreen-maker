import { useEffect, useRef, useState } from 'react';

type Props = {
  readonly id: string;
  readonly label: string;
  readonly min: number;
  readonly max: number;
  readonly step: number;
  readonly value: number;
  /** The value as a person would say it, shown beside the label and read by screen readers. */
  readonly format: (value: number) => string;
  readonly onCommit: (value: number) => void;
};

/** A range input that reports its value only when the user finishes (the native `change` event), so the preview does not dim and restart its render timer throughout a drag. */
export function SliderCommit({ id, label, min, max, step, value, format, onCommit }: Props) {
  const [local, setLocal] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const onCommitRef = useRef(onCommit);

  useEffect(() => {
    setLocal(value);
  }, [value]);

  useEffect(() => {
    onCommitRef.current = onCommit;
  }, [onCommit]);

  useEffect(() => {
    const input = inputRef.current;
    if (input === null) {
      return;
    }
    const commit = () => onCommitRef.current(Number(input.value));
    input.addEventListener('change', commit);
    return () => input.removeEventListener('change', commit);
  }, []);

  return (
    <div className="control">
      <label htmlFor={id}>
        {label}: <span aria-hidden="true">{format(local)}</span>
      </label>
      <input
        ref={inputRef}
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={local}
        aria-valuetext={format(local)}
        onChange={(event) => setLocal(Number(event.target.value))}
      />
    </div>
  );
}
