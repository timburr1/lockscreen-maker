import { type RefObject, useEffect, useRef, useState } from 'react';

/**
 * State for an input that reports its value only when the user finishes (the native `change` event), so the preview does not dim and restart its render timer throughout a drag.
 * `local` follows the input while it moves and follows `value` when that changes from outside; attach `inputRef` to the input and update `local` from its React `onChange`.
 */
export function useChangeCommit<T>(
  value: T,
  read: (input: HTMLInputElement) => T,
  onCommit: (value: T) => void,
): { readonly local: T; readonly setLocal: (value: T) => void; readonly inputRef: RefObject<HTMLInputElement | null> } {
  const [local, setLocal] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const readRef = useRef(read);
  const onCommitRef = useRef(onCommit);

  useEffect(() => {
    setLocal(value);
  }, [value]);

  useEffect(() => {
    readRef.current = read;
    onCommitRef.current = onCommit;
  }, [read, onCommit]);

  useEffect(() => {
    const input = inputRef.current;
    if (input === null) {
      return;
    }
    const commit = () => onCommitRef.current(readRef.current(input));
    input.addEventListener('change', commit);
    return () => input.removeEventListener('change', commit);
  }, []);

  return { local, setLocal, inputRef };
}
