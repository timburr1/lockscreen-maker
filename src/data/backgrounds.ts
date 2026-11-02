import { backgroundName } from '../logic/background-name';

export type BackgroundBundled = {
  readonly id: string;
  readonly name: string;
  readonly url: string;
};

// Uppercase variants are listed because glob patterns are case-sensitive.
const modules = import.meta.glob<string>('/src/assets/backgrounds/*.{jpg,jpeg,png,webp,JPG,JPEG,PNG,WEBP}', {
  eager: true,
  query: '?url',
  import: 'default',
});

export const BACKGROUNDS_BUNDLED: readonly BackgroundBundled[] = Object.entries(modules)
  .map(([path, value]) => ({ id: path, name: backgroundName(path), url: value }))
  .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

export function backgroundBundledFind(id: string): BackgroundBundled | undefined {
  return BACKGROUNDS_BUNDLED.find((background) => background.id === id);
}
