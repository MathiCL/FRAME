import type { AspectFormat, FitMode } from '@/types/editor';

/**
 * Single source of truth for FRAME's geometry.
 *
 * Preview and export share the same canvas and layout parameters.
 * Every coordinate is calculated relative to `imageArea`.
 */

export interface Size {
  width: number;
  height: number;
}

export interface Rect extends Size {
  x: number;
  y: number;
}

export interface FrameLayout {
  /** Internal canvas size in pixels (= exported JPG size). */
  canvas: Size;
  /**
   * Region where the photo, color grading, grain, vignette and subtitles live.
   * When `letterbox` is true, explicit black bars are created by shrinking `imageArea`.
   */
  imageArea: Rect;
}

export interface PanBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  /** Whether horizontal panning is active / allowed. */
  canPanX: boolean;
  /** Whether vertical panning is active / allowed. */
  canPanY: boolean;
}

/** Long edge of the output canvas. */
export const OUTPUT_LONG_EDGE = 1920;

/** Used only when 'original' is requested before an image is available. */
const FALLBACK_RATIO = 16 / 9;

export const ASPECT_FORMATS: ReadonlyArray<{
  id: AspectFormat;
  label: string;
  /** width / height, or null to use the photo's own ratio. */
  ratio: number | null;
}> = [
  { id: 'original', label: 'Original', ratio: null },
  { id: '2.39:1', label: '2.39:1', ratio: 2.39 },
  { id: '16:9', label: '16:9', ratio: 16 / 9 },
  { id: '4:5', label: '4:5', ratio: 4 / 5 },
  { id: '1:1', label: '1:1', ratio: 1 },
  { id: '9:16', label: '9:16', ratio: 9 / 16 },
];

/** Intrinsic ratio of the photo (naturalWidth respects EXIF orientation in modern browsers). */
export function getImageRatio(image: HTMLImageElement | null): number | null {
  if (!image) return null;
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  return width > 0 && height > 0 ? width / height : null;
}

export function getAspectRatio(format: AspectFormat, image: HTMLImageElement | null): number {
  const preset = ASPECT_FORMATS.find((f) => f.id === format);
  return preset?.ratio ?? getImageRatio(image) ?? FALLBACK_RATIO;
}

/** Integer output size for a ratio, with the long edge fixed to `longEdge`. */
export function getOutputSize(ratio: number, longEdge: number = OUTPUT_LONG_EDGE): Size {
  if (ratio >= 1) {
    return { width: longEdge, height: Math.max(1, Math.round(longEdge / ratio)) };
  }
  return { width: Math.max(1, Math.round(longEdge * ratio)), height: longEdge };
}

/**
 * Computes the canvas dimensions and image area.
 * When `letterbox` is enabled, decorative cinematic bars (black bands) are applied
 * without changing the output canvas aspect ratio or dimensions.
 */
export function computeFrameLayout(
  format: AspectFormat,
  image: HTMLImageElement | null,
  letterbox: boolean = false,
  longEdge: number = OUTPUT_LONG_EDGE,
): FrameLayout {
  const canvas = getOutputSize(getAspectRatio(format, image), longEdge);
  
  if (!letterbox) {
    return {
      canvas,
      imageArea: { x: 0, y: 0, width: canvas.width, height: canvas.height },
    };
  }

  // Cinematic letterbox bars
  const canvasRatio = canvas.width / canvas.height;
  let cinematicHeight: number;

  if (canvasRatio < 2.39) {
    // Standard 2.39:1 letterbox projection, with a floor to avoid squishing vertical formats
    const target239Height = Math.round(canvas.width / 2.39);
    cinematicHeight = Math.max(Math.round(canvas.height * 0.55), target239Height);
  } else {
    // If the canvas is already ultra-wide (2.39:1 or wider), apply subtle 7% framing bars
    cinematicHeight = Math.round(canvas.height * 0.86);
  }

  const yOffset = Math.max(0, Math.round((canvas.height - cinematicHeight) / 2));
  const finalHeight = canvas.height - yOffset * 2;

  return {
    canvas,
    imageArea: {
      x: 0,
      y: yOffset,
      width: canvas.width,
      height: finalHeight,
    },
  };
}

/**
 * Calculates the base unzoomed dimensions of an image in `area` for the given `fitMode`.
 */
export function computeBaseImageDimensions(
  image: HTMLImageElement,
  area: Rect,
  fitMode: FitMode,
): Size {
  const imageRatio = getImageRatio(image) ?? area.width / area.height;
  const areaRatio = area.width / area.height;

  // In fill: narrower photos match width, wider match height.
  // In fit: wider photos match width, taller match height.
  const matchWidth = fitMode === 'fill' ? imageRatio <= areaRatio : imageRatio > areaRatio;

  const baseWidth = matchWidth ? area.width : area.height * imageRatio;
  const baseHeight = matchWidth ? area.width / imageRatio : area.height;

  return {
    width: baseWidth,
    height: baseHeight,
  };
}

/**
 * Computes pan bounds in percentage space (-50..50).
 *
 * In `fill` mode, the bounds are mathematically derived from image dimensions vs area
 * dimensions so that the image is guaranteed to completely cover `area`.
 * In `fit` mode, panning is allowed within a generous safe margin.
 */
export function getPanBounds(
  image: HTMLImageElement | null,
  area: Rect,
  fitMode: FitMode,
  zoom: number,
): PanBounds {
  if (!image) {
    return { minX: 0, maxX: 0, minY: 0, maxY: 0, canPanX: false, canPanY: false };
  }

  const base = computeBaseImageDimensions(image, area, fitMode);
  const drawWidth = base.width * zoom;
  const drawHeight = base.height * zoom;

  if (fitMode === 'fill') {
    // Gap prevention:
    // x = area.x + (area.width - drawWidth)/2 + panX
    // Require: x <= area.x  AND  x + drawWidth >= area.x + area.width
    // => |panX| <= (drawWidth - area.width) / 2
    const maxPanPixelsX = Math.max(0, (drawWidth - area.width) / 2);
    const maxPanPixelsY = Math.max(0, (drawHeight - area.height) / 2);

    const maxX = drawWidth > 0 ? (maxPanPixelsX / drawWidth) * 100 : 0;
    const maxY = drawHeight > 0 ? (maxPanPixelsY / drawHeight) * 100 : 0;

    return {
      minX: Number((-maxX).toFixed(1)),
      maxX: Number(maxX.toFixed(1)),
      minY: Number((-maxY).toFixed(1)),
      maxY: Number(maxY.toFixed(1)),
      canPanX: maxX > 0.05,
      canPanY: maxY > 0.05,
    };
  }

  // In `fit` mode: Allow flexible framing adjustment
  return {
    minX: -50,
    maxX: 50,
    minY: -50,
    maxY: 50,
    canPanX: true,
    canPanY: true,
  };
}

/**
 * Clamps a given positionX and positionY to the calculated bounds.
 */
export function clampPosition(
  positionX: number,
  positionY: number,
  bounds: PanBounds,
): { positionX: number; positionY: number } {
  const clampedX = Math.min(bounds.maxX, Math.max(bounds.minX, positionX));
  const clampedY = Math.min(bounds.maxY, Math.max(bounds.minY, positionY));
  return {
    positionX: Number(clampedX.toFixed(2)),
    positionY: Number(clampedY.toFixed(2)),
  };
}

/**
 * Calculates the exact on-canvas rectangle for the photo inside `area`.
 * Automatically clamps the pan to avoid unwanted gaps in `fill` mode.
 */
export function computeImageRect(
  image: HTMLImageElement,
  area: Rect,
  fitMode: FitMode,
  zoom: number,
  positionX: number,
  positionY: number,
): Rect {
  const base = computeBaseImageDimensions(image, area, fitMode);
  const width = base.width * zoom;
  const height = base.height * zoom;

  let panX = (positionX / 100) * width;
  let panY = (positionY / 100) * height;

  if (fitMode === 'fill') {
    const maxPanPixelsX = Math.max(0, (width - area.width) / 2);
    const maxPanPixelsY = Math.max(0, (height - area.height) / 2);
    panX = Math.min(maxPanPixelsX, Math.max(-maxPanPixelsX, panX));
    panY = Math.min(maxPanPixelsY, Math.max(-maxPanPixelsY, panY));
  }

  return {
    x: area.x + (area.width - width) / 2 + panX,
    y: area.y + (area.height - height) / 2 + panY,
    width,
    height,
  };
}
