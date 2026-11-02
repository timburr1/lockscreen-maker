/** A display name derived from an image path: no directory or extension, separators turned into spaces. */
export function backgroundName(path: string): string {
  const file = path.slice(path.lastIndexOf('/') + 1);
  const dot = file.lastIndexOf('.');
  const stem = dot > 0 ? file.slice(0, dot) : file;
  const name = stem.replace(/[-_]+/g, ' ').trim();
  return name === '' ? file : name;
}
