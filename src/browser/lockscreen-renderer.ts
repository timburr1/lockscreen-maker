import { ErrorRender } from '../errors';
import { colorLuminanceMean } from '../logic/color-pick';
import type { Rect } from '../logic/geometry';
import { imageCropRect } from '../logic/image-crop';
import { renderPlan } from '../logic/render-plan';
import type { TextMeasure } from '../logic/text-layout';
import type { LockscreenSpecRender } from '../state/spec';

export type LockscreenRenderOutcome = { readonly kind: 'ok'; readonly blob: Blob } | { readonly kind: 'overflow' };

export type LockscreenRenderer = {
  /** All drawing happens synchronously before the returned promise is first awaited, so overlapping calls cannot interleave on the shared canvas. */
  render(spec: LockscreenSpecRender, image: ImageBitmap): Promise<LockscreenRenderOutcome>;
};

export const OUTPUT_MIME_TYPE = 'image/jpeg';
const OUTPUT_QUALITY = 0.92;
const FONT_FAMILY = '-apple-system, system-ui, "Segoe UI", Roboto, sans-serif';
const FONT_WEIGHT = 600;
const LUMINANCE_SAMPLE_SIZE = 32;

/** Meant to be created once for the page's lifetime. Owns one reused canvas: iOS Safari frees canvas memory late, so a new full-size canvas per render eventually yields blank output. */
export function lockscreenRendererCreate(doc: Document): LockscreenRenderer {
  const canvas = doc.createElement('canvas');
  const sample = doc.createElement('canvas');
  sample.width = LUMINANCE_SAMPLE_SIZE;
  sample.height = LUMINANCE_SAMPLE_SIZE;
  const ctx = canvas.getContext('2d');
  const sampleCtx = sample.getContext('2d', { willReadFrequently: true });
  if (ctx === null || sampleCtx === null) {
    throw new ErrorRender('A 2D canvas is not available in this browser');
  }

  const measure: TextMeasure = (text, fontSizePx) => {
    ctx.font = `${FONT_WEIGHT} ${fontSizePx}px ${FONT_FAMILY}`;
    return ctx.measureText(text).width;
  };

  // The background is downsampled into a small canvas so the luminance read stays cheap at full resolution.
  const luminanceMean = (area: Rect): number => {
    sampleCtx.drawImage(canvas, area.x, area.y, area.width, area.height, 0, 0, LUMINANCE_SAMPLE_SIZE, LUMINANCE_SAMPLE_SIZE);
    return colorLuminanceMean(sampleCtx.getImageData(0, 0, LUMINANCE_SAMPLE_SIZE, LUMINANCE_SAMPLE_SIZE).data);
  };

  return {
    async render(spec, image) {
      const { size } = spec;
      canvas.width = size.width;
      canvas.height = size.height;
      // Fill first so a transparent PNG does not encode to black, and downsample large photos with the best filter.
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, size.width, size.height);
      ctx.imageSmoothingQuality = 'high';

      // Cover-crop the background over the whole canvas.
      const crop = imageCropRect({ width: image.width, height: image.height }, size, spec.focus);
      ctx.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, size.width, size.height);

      const result = renderPlan(spec, measure, luminanceMean);
      if (result.kind === 'overflow') {
        return { kind: 'overflow' };
      }
      const { plan } = result;

      if (plan.scrim !== undefined) {
        const { rect, color, opacity } = plan.scrim;
        ctx.fillStyle = color === 'white' ? `rgba(255, 255, 255, ${opacity})` : `rgba(0, 0, 0, ${opacity})`;
        ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
      }

      // Draw the text lines, centred vertically within each line box.
      ctx.font = `${FONT_WEIGHT} ${plan.fontSize}px ${FONT_FAMILY}`;
      ctx.fillStyle = plan.textColor;
      ctx.textAlign = plan.textAlign;
      ctx.textBaseline = 'top';
      const halfLeading = (plan.lineHeight - plan.fontSize) / 2;
      plan.lines.forEach((line, index) => {
        ctx.fillText(line, plan.textX, plan.textY + index * plan.lineHeight + halfLeading);
      });

      return await new Promise<LockscreenRenderOutcome>((resolve, reject) => {
        canvas.toBlob(
          (blob) => (blob === null ? reject(new ErrorRender('The canvas produced no image')) : resolve({ kind: 'ok', blob })),
          OUTPUT_MIME_TYPE,
          OUTPUT_QUALITY,
        );
      });
    },
  };
}
