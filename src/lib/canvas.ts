import { EditorState } from '@/types/editor';
import { computeFrameLayout, computeImageRect, type Rect } from '@/lib/geometry';
import { 
  renderCinematicText, 
  renderCinematicTimestamp, 
  renderCinematicCredits 
} from '@/lib/typography';
import { renderCinematicBorders } from '@/lib/borders';

interface RenderOptions {
  state: EditorState;
  canvas: HTMLCanvasElement;
  showOriginal?: boolean;
}

// Generate a deterministic noise pattern once to reuse
let noisePatternCanvas: HTMLCanvasElement | null = null;
function getNoisePattern(): HTMLCanvasElement {
  if (noisePatternCanvas) return noisePatternCanvas;
  
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const imgData = ctx.createImageData(size, size);
  const data = imgData.data;
  
  // Use a simple seeded PRNG for deterministic noise
  let seed = 12345;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) | 0;
    return (seed >>> 0) / 4294967296;
  };

  for (let i = 0; i < data.length; i += 4) {
    const value = Math.floor(random() * 255);
    data[i] = value;
    data[i + 1] = value;
    data[i + 2] = value;
    data[i + 3] = 255; // fully opaque noise
  }
  
  ctx.putImageData(imgData, 0, 0);
  noisePatternCanvas = canvas;
  return canvas;
}

export function renderCinematicFrame({ state, canvas, showOriginal = false }: RenderOptions) {
  const img = state.image;
  if (!img) return;

  // --- 0. GEOMETRY (shared by preview and export) ---
  const layout = computeFrameLayout(state.format, img, state.letterbox);
  // Resizing a canvas clears it and resets its context, so only do it when needed
  if (canvas.width !== layout.canvas.width || canvas.height !== layout.canvas.height) {
    canvas.width = layout.canvas.width;
    canvas.height = layout.canvas.height;
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const { width, height } = canvas;
  const area = layout.imageArea;

  // Clear canvas (anything outside the photo stays black)
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  ctx.filter = 'none';
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, width, height);

  const imageRect = computeImageRect(
    img,
    area,
    state.fitMode,
    state.zoom,
    state.positionX,
    state.positionY,
  );

  ctx.save();
  ctx.beginPath();
  ctx.rect(area.x, area.y, area.width, area.height);
  ctx.clip();

  // --- TRANSIENT COMPARISON MODE: PURE ORIGINAL PHOTO ---
  // When comparing, render the raw photograph using the exact same framing geometry,
  // without contrast, saturation, temperature, highlights, grain, vignette, or typography.
  if (showOriginal) {
    ctx.filter = 'none';
    ctx.drawImage(img, imageRect.x, imageRect.y, imageRect.width, imageRect.height);
    ctx.restore();
    return;
  }

  // --- 1. BASE IMAGE DRAW WITH CONTRAST & SATURATION ---
  const contrast = 100 + state.contrast;
  const saturate = 100 + state.saturation;
  
  ctx.filter = `contrast(${contrast}%) saturate(${saturate}%)`;
  ctx.drawImage(img, imageRect.x, imageRect.y, imageRect.width, imageRect.height);
  ctx.filter = 'none';

  // --- 2. ADVANCED COLOR GRADING (Exposure, Highlights, Shadows & Temperature) ---
  const exposure = (state.exposure ?? 0) / 100; // range -0.5 to 0.5
  const highlights = state.highlights / 100;     // range -0.5 to 0.2
  const shadows = (state.shadows ?? 0) / 100;       // range -0.5 to 0.5
  const temp = state.temperature;                   // range -30 to 30

  if (exposure !== 0 || highlights !== 0 || shadows !== 0 || temp !== 0) {
    // Process only the image area (integer rect, see geometry.ts)
    const imgData = ctx.getImageData(area.x, area.y, area.width, area.height);
    const data = imgData.data;

    for (let i = 0; i < data.length; i += 4) {
      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];

      let luma = 0.299 * r + 0.587 * g + 0.114 * b;

      // 1. Exposure / ambient luminosity shift
      if (exposure !== 0) {
        const expFactor = 1 + exposure;
        r *= expFactor;
        g *= expFactor;
        b *= expFactor;
        luma *= expFactor;
      }

      // 2. Shadows deepening (smooth progressive drop for darks, zero impact on bright highlights)
      if (shadows !== 0 && luma < 160) {
        const shadowFactor = (160 - luma) / 160;
        const weight = shadowFactor * shadowFactor;
        const shadowAdj = 1 + (shadows * weight);
        r *= shadowAdj;
        g *= shadowAdj;
        b *= shadowAdj;
        luma *= shadowAdj;
      }

      // 3. Highlights shaping (retains luminosity on practical lamps, skin, wood sheen)
      if (highlights !== 0 && luma > 120) {
        const highlightFactor = (luma - 120) / 135;
        const weight = highlightFactor * highlightFactor;
        const highlightAdj = 1 + (highlights * weight);
        r *= highlightAdj;
        g *= highlightAdj;
        b *= highlightAdj;
      }

      // 4. Temperature with shadow isolation (pure blacks remain black, warmth lives in light)
      if (temp !== 0) {
        const rShift = temp * 1.5;
        const bShift = -temp * 1.5;
        const shadowGate = Math.min(1, Math.max(0, luma / 40));
        const bellCurve = (1 - Math.abs(Math.min(255, Math.max(0, luma)) - 128) / 256) * shadowGate;
        r = r + rShift * bellCurve;
        b = b + bShift * bellCurve;
      }

      data[i] = Math.min(255, Math.max(0, r));
      data[i + 1] = Math.min(255, Math.max(0, g));
      data[i + 2] = Math.min(255, Math.max(0, b));
    }
    ctx.putImageData(imgData, area.x, area.y);
  }

  // --- 2.5. CINEMATIC GLOW (Resplandor de luces & Halation) ---
  renderCinematicGlow(ctx, area, state);

  // --- 3. GRAIN ---
  if (state.grain > 0) {
    ctx.globalCompositeOperation = 'overlay';
    const patternCanvas = getNoisePattern();
    const pattern = ctx.createPattern(patternCanvas, 'repeat');
    if (pattern) {
      ctx.fillStyle = pattern;
      ctx.globalAlpha = state.grain / 100 * 0.45; 
      ctx.fillRect(area.x, area.y, area.width, area.height);
      ctx.globalAlpha = 1.0;
    }
  }

  // --- 4. VIGNETTE ---
  if (state.vignette > 0) {
    ctx.globalCompositeOperation = 'multiply';
    const cx = area.x + area.width / 2;
    const cy = area.y + area.height / 2;
    const radiusX = area.width * 0.6; 
    const radiusY = area.height * 0.8;
    const radius = Math.max(radiusX, radiusY); 
    
    const gradient = ctx.createRadialGradient(cx, cy, radius * 0.25, cx, cy, radius);
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(0.4, `rgba(0, 0, 0, ${state.vignette / 100 * 0.15})`);
    gradient.addColorStop(0.75, `rgba(0, 0, 0, ${state.vignette / 100 * 0.55})`);
    gradient.addColorStop(1, `rgba(0, 0, 0, ${state.vignette / 100 * 0.92})`);
    
    ctx.fillStyle = gradient;
    ctx.fillRect(area.x, area.y, area.width, area.height);
  }

  ctx.restore();

  // --- 5. ANALOG FILM BORDERS ---
  renderCinematicBorders(ctx, area, state);

  // --- 6. CINEMATIC TYPOGRAPHY (Quote & Subtitle Engine) ---
  ctx.globalCompositeOperation = 'source-over';
  renderCinematicText(ctx, area, state);

  // --- 7. CINEMATIC TIMESTAMPS (Marcas de tiempo / Detalles) ---
  renderCinematicTimestamp(ctx, area, state);

  // --- 8. FILM CREDITS (Créditos de película personalizados) ---
  renderCinematicCredits(ctx, area, state);
}

/**
 * Renders optical cinematic glow / halation around scene highlights.
 * Selectively extracts high-luminance pixels, tints them with chosen tone,
 * blurs via an optimized intermediate buffer, and blends using 'screen'.
 */
export function renderCinematicGlow(
  ctx: CanvasRenderingContext2D,
  area: Rect,
  state: EditorState,
) {
  if (!state.glowEnabled || !state.glowIntensity || state.glowIntensity <= 0) {
    return;
  }
  if (typeof document === 'undefined') return;

  try {
    const intensity = Math.min(100, Math.max(0, state.glowIntensity));
    const rawRadius = state.glowRadius ?? 24;
    const tone = state.glowTone ?? 'warm';

    // Downscale factor to ensure silky smooth performance even on 4K/8K captures
    const maxDimension = 640;
    const currentMax = Math.max(area.width, area.height);
    const downscale = Math.max(1, currentMax / maxDimension);

    const dw = Math.max(16, Math.round(area.width / downscale));
    const dh = Math.max(16, Math.round(area.height / downscale));

    const extractCanvas = document.createElement('canvas');
    extractCanvas.width = dw;
    extractCanvas.height = dh;
    const extractCtx = extractCanvas.getContext('2d');
    if (!extractCtx) return;

    // Draw current image area scaled down
    extractCtx.drawImage(ctx.canvas, area.x, area.y, area.width, area.height, 0, 0, dw, dh);

    // Extract highlight pixels with a smooth knee threshold
    const imgData = extractCtx.getImageData(0, 0, dw, dh);
    const data = imgData.data;

    // Threshold: only lights above ~165 begin to glow
    const threshold = 165;
    const thresholdRange = 255 - threshold;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      const luma = 0.299 * r + 0.587 * g + 0.114 * b;

      if (luma <= threshold) {
        // Cut out shadows and midtones completely - zero fog in dark areas!
        data[i + 3] = 0;
      } else {
        // Quadratic knee for soft organic light transition
        const factor = Math.min(1, Math.max(0, (luma - threshold) / thresholdRange));
        const alphaWeight = factor * factor;

        if (tone === 'warm') {
          // Warm amber / incandescent / streetlamp glow
          data[i] = Math.min(255, r * 1.25 + 30);
          data[i + 1] = Math.min(255, g * 1.1 + 10);
          data[i + 2] = Math.max(0, b * 0.65 - 15);
        } else if (tone === 'red') {
          // Filmic red halation (Cinestill 800T red rim around bright highlights)
          data[i] = Math.min(255, r * 1.35 + 40);
          data[i + 1] = Math.max(0, g * 0.5 - 15);
          data[i + 2] = Math.max(0, b * 0.45 - 20);
        } else {
          // Neutral optical diffusion
          data[i] = r;
          data[i + 1] = g;
          data[i + 2] = b;
        }

        data[i + 3] = Math.round(alphaWeight * 255);
      }
    }

    extractCtx.putImageData(imgData, 0, 0);

    // Create blurred diffusion layer
    const blurCanvas = document.createElement('canvas');
    blurCanvas.width = dw;
    blurCanvas.height = dh;
    const blurCtx = blurCanvas.getContext('2d');
    if (!blurCtx) return;

    const blurRadius = Math.max(4, Math.round((rawRadius / downscale) * 1.6));

    const ctxWithFilter = blurCtx as unknown as { filter?: string };
    if (typeof ctxWithFilter.filter === 'string') {
      blurCtx.filter = `blur(${blurRadius}px)`;
    }
    blurCtx.drawImage(extractCanvas, 0, 0);
    if (typeof ctxWithFilter.filter === 'string') {
      blurCtx.filter = 'none';
    }

    // Composite back with screen blending mode
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const blendAlpha = (intensity / 100) * 0.72;
    ctx.globalAlpha = blendAlpha;
    ctx.drawImage(blurCanvas, area.x, area.y, area.width, area.height);
    ctx.restore();
  } catch {
    // Graceful fallback for non-browser / mock contexts
  }
}


export interface ExportResult {
  success: boolean;
  method: 'share' | 'download' | 'preview';
  blob: Blob;
  blobUrl: string;
  canceled?: boolean;
}

export function canvasToBlob(
  canvas: HTMLCanvasElement,
  type = 'image/jpeg',
  quality = 0.95
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          try {
            const dataUrl = canvas.toDataURL(type, quality);
            const byteString = atob(dataUrl.split(',')[1]);
            const mimeString = dataUrl.split(',')[0].split(':')[1].split(';')[0];
            const ab = new ArrayBuffer(byteString.length);
            const ia = new Uint8Array(ab);
            for (let i = 0; i < byteString.length; i++) {
              ia[i] = byteString.charCodeAt(i);
            }
            resolve(new Blob([ab], { type: mimeString }));
          } catch {
            reject(new Error('No se pudo generar el archivo de imagen a partir del lienzo.'));
          }
        }
      },
      type,
      quality
    );
  });
}

export async function exportCanvasAsImage(
  canvas: HTMLCanvasElement,
  filename: string = 'frame.jpg'
): Promise<ExportResult> {
  // Only await fonts if they are still actively loading, preserving the synchronous user gesture
  if (typeof document !== 'undefined' && 'fonts' in document && document.fonts.status !== 'loaded') {
    try {
      await document.fonts.ready;
    } catch {
      // fallback if fonts ready check errors
    }
  }

  const blob = await canvasToBlob(canvas, 'image/jpeg', 0.95);
  const blobUrl = URL.createObjectURL(blob);

  const isMobile =
    typeof navigator !== 'undefined' &&
    (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

  // 1. Try Web Share API (optimal for iOS Safari & Android Share Sheet)
  if (isMobile && typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      const file = new File([blob], filename, { type: 'image/jpeg' });
      if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'FRAME — Fotografía cinematográfica',
        });
        setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
        return { success: true, method: 'share', blob, blobUrl };
      }
    } catch (shareError: unknown) {
      if (shareError instanceof Error && shareError.name === 'AbortError') {
        // User dismissed the native share sheet
        setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
        return { success: true, method: 'share', blob, blobUrl, canceled: true };
      }
      console.warn('Web Share API error, attempting fallback:', shareError);
    }
  }

  // 2. Direct download with Blob URL for Desktop & Android browsers
  const isIOS =
    typeof navigator !== 'undefined' &&
    (/iPhone|iPad|iPod/i.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

  if (!isIOS) {
    try {
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
      return { success: true, method: 'download', blob, blobUrl };
    } catch (downloadError) {
      console.warn('Direct download anchor failed:', downloadError);
    }
  }

  // 3. Fallback for iOS or environments where direct download cannot be guaranteed:
  // Returns blobUrl for the UI to display in the dedicated save modal (revoked when modal closes)
  return { success: true, method: 'preview', blob, blobUrl };
}
