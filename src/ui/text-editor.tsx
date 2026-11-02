type Props = {
  readonly text: string;
  readonly onChange: (text: string) => void;
};

export function TextEditor({ text, onChange }: Props) {
  return (
    <div className="control">
      <label htmlFor="lockscreen-text">Text</label>
      <textarea id="lockscreen-text" rows={6} value={text} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}
