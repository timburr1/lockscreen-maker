import { describe, expect, test } from 'vitest';
import { type LockscreenSpecText, SPEC_DEFAULT_STYLE } from '../state/spec';
import { textMeasureFake } from '../test-support/text-measure-fake';
import { colorHexParse } from './color-pick';
import type { Rect, Size } from './geometry';
import { type RenderPlan, type RenderPlanBackground, renderPlan, TEXT_BASE_FONT_FRACTION } from './render-plan';
import { safeAreaRect } from './safe-area';

const baseSpec: LockscreenSpecText = {
  size: { width: 1000, height: 2000 },
  deviceClass: 'phone',
  text: 'Hello',
  style: { ...SPEC_DEFAULT_STYLE, color: 'white' },
};

const COVER: RenderPlanBackground = { kind: 'cover' };
const WHITE = colorHexParse('#ffffff');

function containOf(size: Size, color = WHITE): RenderPlanBackground {
  return { kind: 'contain', size, color };
}

/** Landscape, like a driver's license photo. */
const imageWide = { width: 1590, height: 1000 };
/** The same photo rotated a quarter turn. */
const imageTall = { width: 1000, height: 1590 };

/** Backdrop padding for one short line, whose font stays at the base size: half the base font size. */
const PADDING = (1000 * TEXT_BASE_FONT_FRACTION) / 2;

function planOf(spec: LockscreenSpecText, luminance: (area: Rect) => number = () => 0.5, background: RenderPlanBackground = COVER): RenderPlan {
  const result = renderPlan(spec, background, textMeasureFake, luminance);
  if (result.kind !== 'plan') {
    throw new Error('expected a plan');
  }
  return result.plan;
}

function imageRectOf(plan: RenderPlan): Rect {
  if (plan.image.kind !== 'contain') {
    throw new Error('expected a contain plan');
  }
  return plan.image.rect;
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
    expect(renderPlan({ ...baseSpec, text }, COVER, textMeasureFake, () => 0.5).kind).toBe('overflow');
  });

  test('cover mode draws the image over the whole canvas', () => {
    expect(planOf(baseSpec).image).toEqual({ kind: 'cover' });
  });
});

describe('renderPlan in contain mode', () => {
  const containSpec = baseSpec;
  const wide = containOf(imageWide);
  const tall = containOf(imageTall);
  const area = safeAreaRect(containSpec.size, 'phone');
  const positions = [0, 0.5, 1];
  const withPosition = (position: number): LockscreenSpecText => ({ ...containSpec, style: { ...containSpec.style, position } });

  test('the image sits directly under the text backdrop, at every position', () => {
    for (const position of positions) {
      const plan = planOf(withPosition(position), () => 0.5, wide);
      const rect = imageRectOf(plan);
      const scrim = plan.scrim?.rect;
      expect(scrim).toBeDefined();
      if (scrim !== undefined) {
        expect(rect.y).toBeCloseTo(scrim.y + scrim.height, 6);
      }
    }
  });

  test('the text and image stay inside the safe area at every position', () => {
    for (const position of positions) {
      const plan = planOf(withPosition(position), () => 0.5, wide);
      const rect = imageRectOf(plan);
      expect(plan.textY - PADDING).toBeGreaterThanOrEqual(area.y - 1e-6);
      expect(rect.y + rect.height).toBeLessThanOrEqual(area.y + area.height + 1e-6);
      expect(rect.x).toBeGreaterThanOrEqual(area.x - 1e-6);
      expect(rect.x + rect.width).toBeLessThanOrEqual(area.x + area.width + 1e-6);
    }
  });

  test('a wide image fills the safe-area width, lining up with the backdrop, and a tall one is centred', () => {
    const plan = planOf(containSpec, () => 0.5, wide);
    expect(imageRectOf(plan).width).toBeCloseTo(area.width, 6);
    expect(imageRectOf(plan).x).toBeCloseTo(plan.scrim?.rect.x ?? Number.NaN, 6);
    const tallRect = imageRectOf(planOf(containSpec, () => 0.5, tall));
    expect(tallRect.width).toBeLessThan(area.width);
    expect(tallRect.x + tallRect.width / 2).toBeCloseTo(containSpec.size.width / 2, 6);
  });

  test('the image keeps its aspect ratio', () => {
    for (const [background, image] of [
      [wide, imageWide],
      [tall, imageTall],
    ] as const) {
      const rect = imageRectOf(planOf(containSpec, () => 0.5, background));
      expect(rect.width / rect.height).toBeCloseTo(image.width / image.height, 6);
    }
  });

  test('the image has a positive size inside the canvas at the extreme text scales and on unusual screens', () => {
    const cases: readonly LockscreenSpecText[] = [
      { ...containSpec, style: { ...containSpec.style, sizeScale: 0.5 } },
      { ...containSpec, style: { ...containSpec.style, sizeScale: 2 } },
      { ...containSpec, text: '' },
      { ...containSpec, size: { width: 2000, height: 400 }, deviceClass: 'desktop' },
      { ...containSpec, size: { width: 200, height: 4000 }, deviceClass: 'phone' },
    ];
    for (const spec of cases) {
      for (const background of [wide, tall]) {
        for (const position of positions) {
          const result = renderPlan({ ...spec, style: { ...spec.style, position } }, background, textMeasureFake, () => 0.5);
          expect(result.kind).toBe('plan');
          if (result.kind === 'plan') {
            const rect = imageRectOf(result.plan);
            expect(rect.width).toBeGreaterThan(0);
            expect(rect.height).toBeGreaterThan(0);
            expect(rect.x).toBeGreaterThanOrEqual(-1e-6);
            expect(rect.y).toBeGreaterThanOrEqual(-1e-6);
            expect(rect.x + rect.width).toBeLessThanOrEqual(spec.size.width + 1e-6);
            expect(rect.y + rect.height).toBeLessThanOrEqual(spec.size.height + 1e-6);
          }
        }
      }
    }
  });

  test('position moves text and image together, keeping their spacing', () => {
    const top = planOf(withPosition(0), () => 0.5, wide);
    const bottom = planOf(withPosition(1), () => 0.5, wide);
    expect(bottom.textY).toBeGreaterThan(top.textY);
    expect(imageRectOf(bottom).y).toBeGreaterThan(imageRectOf(top).y);
    expect(imageRectOf(bottom).y - bottom.textY).toBeCloseTo(imageRectOf(top).y - top.textY, 6);
  });

  test('more text leaves a shorter image when the image is height-limited', () => {
    const one = imageRectOf(planOf(containSpec, () => 0.5, tall));
    const six = imageRectOf(planOf({ ...containSpec, text: 'a\nb\nc\nd\ne\nf' }, () => 0.5, tall));
    expect(six.height).toBeLessThan(one.height);
    expect(six.height).toBeGreaterThan(0);
  });

  test('without text the image is the whole group and no backdrop is planned', () => {
    let reads = 0;
    const plan = planOf(
      { ...withPosition(0), text: '', style: { ...containSpec.style, position: 0, color: 'auto' } },
      () => {
        reads += 1;
        return 0.5;
      },
      wide,
    );
    expect(plan.lines).toEqual([]);
    expect(plan.scrim).toBeUndefined();
    expect(imageRectOf(plan).y).toBeCloseTo(area.y, 6);
    expect(reads).toBe(0);
  });

  test('auto text colour follows the background colour and never reads the canvas', () => {
    let reads = 0;
    const read = () => {
      reads += 1;
      return 0.5;
    };
    const auto = { ...containSpec.style, color: 'auto' as const };
    expect(planOf({ ...containSpec, style: auto }, read, containOf(imageWide, colorHexParse('#ffffff'))).textColor).toBe('black');
    expect(planOf({ ...containSpec, style: auto }, read, containOf(imageWide, colorHexParse('#0a145a'))).textColor).toBe('white');
    expect(reads).toBe(0);
  });

  test('text that fits when filling can overflow here because the image keeps room', () => {
    const text = Array.from({ length: 30 }, (_, i) => `l${i}`).join('\n');
    expect(renderPlan({ ...baseSpec, text }, COVER, textMeasureFake, () => 0.5).kind).toBe('plan');
    expect(renderPlan({ ...containSpec, text }, wide, textMeasureFake, () => 0.5).kind).toBe('overflow');
  });
});
