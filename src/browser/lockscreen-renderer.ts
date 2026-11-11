import { ErrorRender } from '../errors';
import { colorLuminanceMean } from '../logic/color-pick';
import type { Rect } from '../logic/geometry';
import { imageCropRect } from '../logic/image-crop';
import { type ImageRotation, imageRotationFocus, imageRotationSize } from '../logic/image-rotation';
import { type RenderPlanBackground, renderPlan } from '../logic/render-plan';
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

/** Draws `source` (a rectangle of the unrotated image) into `dest` on the canvas, turned clockwise by `rotation` about the centre of `dest`. */
function imageDraw(ctx: CanvasRenderingContext2D, image: ImageBitmap, rotation: ImageRotation, source: Rect, dest: Rect): void {
  // Before the turn the image's own axes are swapped relative to the destination for quarter turns.
  const turned = rotation === 90 || rotation === 270;
  const width = turned ? dest.height : dest.width;
  const height = turned ? dest.width : dest.height;
  ctx.save();
  ctx.translate(dest.x + dest.width / 2, dest.y + dest.height / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.drawImage(image, source.x, source.y, source.width, source.height, -width / 2, -height / 2, width, height);
  ctx.restore();
}

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
      const { size, backgroundRotation: rotation } = spec;
      const imageSize = { width: image.width, height: image.height };
      canvas.width = size.width;
      canvas.height = size.height;
      // Fill first so a transparent PNG does not encode to black. The colour control only exists for contain, so cover stays black rather than show a colour the user cannot change.
      const background: RenderPlanBackground =
        spec.backgroundFit === 'contain' ? { kind: 'contain', size: imageRotationSize(imageSize, rotation), color: spec.backgroundColor } : { kind: 'cover' };
      ctx.fillStyle = background.kind === 'contain' ? background.color : '#000';
      ctx.fillRect(0, 0, size.width, size.height);
      ctx.imageSmoothingQuality = 'high';

      // A cover image goes down before planning because the plan may read its pixels; a contain image goes down after, in the rectangle the plan chooses.
      if (background.kind === 'cover') {
        const crop = imageCropRect(imageSize, imageRotationSize(size, rotation), imageRotationFocus(spec.focus, rotation));
        imageDraw(ctx, image, rotation, crop, { x: 0, y: 0, width: size.width, height: size.height });
      }

      const result = renderPlan(spec, background, measure, luminanceMean);
      if (result.kind === 'overflow') {
        return { kind: 'overflow' };
      }
      const { plan } = result;

      if (plan.image.kind === 'contain') {
        imageDraw(ctx, image, rotation, { x: 0, y: 0, width: image.width, height: image.height }, plan.image.rect);
      }

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
