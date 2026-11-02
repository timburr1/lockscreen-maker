import { describe, expect, test } from 'vitest';
import { type LockscreenSpecText, SPEC_DEFAULT_STYLE } from '../state/spec';
import { textMeasureFake } from '../test-support/text-measure-fake';
import { type RenderPlan, renderPlan, TEXT_BASE_FONT_FRACTION } from './render-plan';
import { safeAreaRect } from './safe-area';

const baseSpec: LockscreenSpecText = {
  size: { width: 1000, height: 2000 },
  deviceClass: 'phone',
  text: 'Hello',
  style: { ...SPEC_DEFAULT_STYLE, color: 'white' },
};

function planOf(spec: LockscreenSpecText, luminance: (area: unknown) => number = () => 0.5): RenderPlan {
  const result = renderPlan(spec, textMeasureFake, luminance);
  if (result.kind !== 'plan') {
    throw new Error('expected a plan');
  }
  return result.plan;
}

describe('renderPlan', () => {
  test('short text uses the base font size, scaled by sizeScale', () => {
    expect(planOf(baseSpec).fontSize).toBe(1000 * TEXT_BASE_FONT_FRACTION);
    expect(planOf({ ...baseSpec, style: { ...baseSpec.style, sizeScale: 1.5 } }).fontSize).toBe(1000 * TEXT_BASE_FONT_FRACTION * 1.5);
  });

  test('empty text yields no lines and no backdrop, and never reads luminance', () => {
    let reads = 0;
    const plan = planOf({ ...baseSpec, text: '  \n', style: { ...baseSpec.style, color: 'auto' } }, () => {
      reads += 1;
      return 0.5;
    });
    expect(plan.lines).toEqual([]);
    expect(plan.scrim).toBeUndefined();
    expect(reads).toBe(0);
  });

  test('auto colour follows the luminance of the safe area, and an explicit colour skips the read', () => {
    const area = safeAreaRect(baseSpec.size, 'phone');
    const auto = { ...baseSpec, style: { ...baseSpec.style, color: 'auto' as const } };
    let asked: unknown;
    expect(
      planOf(auto, (a) => {
        asked = a;
        return 0.9;
      }).textColor,
    ).toBe('black');
    expect(asked).toEqual(area);
    expect(planOf(auto, () => 0.02).textColor).toBe('white');

    let reads = 0;
    expect(
      planOf(baseSpec, () => {
        reads += 1;
        return 0.9;
      }).textColor,
    ).toBe('white');
    expect(reads).toBe(0);
  });

  test('position moves the block from the top to the bottom of the safe area', () => {
    const area = safeAreaRect(baseSpec.size, 'phone');
    const top = planOf({ ...baseSpec, style: { ...baseSpec.style, position: 0 } });
    const bottom = planOf({ ...baseSpec, style: { ...baseSpec.style, position: 1 } });
    const height = top.lines.length * top.lineHeight;
    expect(top.textY).toBeGreaterThanOrEqual(area.y);
    expect(bottom.textY + height).toBeLessThanOrEqual(area.y + area.height);
    expect(bottom.textY).toBeGreaterThan(top.textY);
  });

  test('alignment anchors the text at the left or the centre of the safe area, inset from its edge', () => {
    const area = safeAreaRect(baseSpec.size, 'phone');
    const left = planOf({ ...baseSpec, style: { ...baseSpec.style, align: 'left' } });
    const centre = planOf({ ...baseSpec, style: { ...baseSpec.style, align: 'center' } });
    expect(left.textX).toBeGreaterThanOrEqual(area.x);
    expect(left.textX).toBeLessThan(area.x + area.width / 2);
    expect(centre.textX).toBeCloseTo(area.x + area.width / 2, 6);
  });

  test('backdrop appears only when scrim is above zero, in the colour opposite the text', () => {
    expect(planOf({ ...baseSpec, style: { ...baseSpec.style, scrim: 0 } }).scrim).toBeUndefined();
    const plan = planOf({ ...baseSpec, style: { ...baseSpec.style, scrim: 0.4, color: 'white' } });
    expect(plan.scrim?.color).toBe('black');
    expect(plan.scrim?.opacity).toBe(0.4);
  });

  test('the backdrop surrounds the text block and stays inside the safe area at every position', () => {
    const area = safeAreaRect(baseSpec.size, 'phone');
    for (const position of [0, 0.5, 1]) {
      const plan = planOf({ ...baseSpec, style: { ...baseSpec.style, scrim: 0.4, position } });
      const rect = plan.scrim?.rect;
      expect(rect).toBeDefined();
      if (rect !== undefined) {
        expect(rect.y).toBeLessThan(plan.textY);
        expect(rect.y + rect.height).toBeGreaterThan(plan.textY + plan.lines.length * plan.lineHeight);
        expect(rect.x).toBeGreaterThanOrEqual(area.x);
        expect(rect.y).toBeGreaterThanOrEqual(area.y);
        expect(rect.x + rect.width).toBeLessThanOrEqual(area.x + area.width);
        expect(rect.y + rect.height).toBeLessThanOrEqual(area.y + area.height);
      }
    }
  });

  test('text far too long for the safe area overflows', () => {
    const text = Array.from({ length: 200 }, (_, i) => `line ${i}`).join('\n');
    expect(renderPlan({ ...baseSpec, text }, textMeasureFake, () => 0.5).kind).toBe('overflow');
  });
});
