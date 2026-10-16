import { EditorState } from '@/types/editor';
import { computeFrameLayout, computeImageRect } from '@/lib/geometry';
import { renderCinematicText } from '@/lib/typography';

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

  // --- 5. CINEMATIC TYPOGRAPHY (Quote & Subtitle Engine) ---
  ctx.globalCompositeOperation = 'source-over';
  renderCinematicText(ctx, area, state);
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
