/** Slider values are fractions; people read them as percentages. */
export function percentFormat(value: number): string {
  return `${Math.round(value * 100)}%`;
}
