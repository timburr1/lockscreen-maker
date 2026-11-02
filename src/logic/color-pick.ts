/** Mean relative luminance at which white and black text have equal contrast. */
const LUMINANCE_CROSSOVER = 0.179;

function channelLinear(buffer: Uint8ClampedArray, index: number): number {
  const value = buffer[index];
  if (value === undefined) {
    throw new Error(`Pixel buffer read out of range at ${index}`);
  }
  const c = value / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** Mean relative luminance (0..1) of an RGBA pixel buffer. Callers should downsample large regions first. */
export function colorLuminanceMean(rgba: Uint8ClampedArray): number {
  if (rgba.length === 0 || rgba.length % 4 !== 0) {
    throw new Error(`colorLuminanceMean needs a non-empty RGBA buffer, got length ${rgba.length}`);
  }
  let total = 0;
  for (let i = 0; i < rgba.length; i += 4) {
    total += 0.2126 * channelLinear(rgba, i) + 0.7152 * channelLinear(rgba, i + 1) + 0.0722 * channelLinear(rgba, i + 2);
  }
  return total / (rgba.length / 4);
}

/** The text colour that reads best over a background of the given mean luminance. */
export function colorPick(luminance: number): 'white' | 'black' {
  return luminance > LUMINANCE_CROSSOVER ? 'black' : 'white';
}
