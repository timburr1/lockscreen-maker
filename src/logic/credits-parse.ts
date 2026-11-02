export type Credit = {
  readonly credit: string;
  readonly license: string;
  readonly sourceUrl: string | undefined;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function creditParse(file: string, raw: unknown): Credit {
  if (!isRecord(raw)) {
    throw new Error(`credits.json: the entry for ${file} must be an object`);
  }
  const { credit, license, sourceUrl } = raw;
  if (typeof credit !== 'string' || credit === '') {
    throw new Error(`credits.json: ${file} needs a non-empty "credit"`);
  }
  if (typeof license !== 'string' || license === '') {
    throw new Error(`credits.json: ${file} needs a non-empty "license"`);
  }
  if (sourceUrl === undefined) {
    return { credit, license, sourceUrl: undefined };
  }
  if (typeof sourceUrl !== 'string') {
    throw new Error(`credits.json: ${file} has a "sourceUrl" that is not a string`);
  }
  let protocol: string;
  try {
    protocol = new URL(sourceUrl).protocol;
  } catch (cause) {
    throw new Error(`credits.json: ${file} has a "sourceUrl" that is not a valid link`, { cause });
  }
  if (protocol !== 'http:' && protocol !== 'https:') {
    throw new Error(`credits.json: ${file} has a "sourceUrl" that is not an http or https link`);
  }
  return { credit, license, sourceUrl };
}

/** Parses the credits file, keyed by image file name, at the boundary; a malformed file is a bug in the data and throws naming the entry. */
export function creditsParse(raw: unknown): ReadonlyMap<string, Credit> {
  if (!isRecord(raw)) {
    throw new Error('credits.json must be an object keyed by image file name');
  }
  return new Map(Object.entries(raw).map(([file, entry]) => [file, creditParse(file, entry)]));
}
