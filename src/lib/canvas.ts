import { EditorState } from '@/types/editor';
import { computeFrameLayout, computeImageRect } from '@/lib/geometry';
import { renderCinematicText } from '@/lib/typography';

interface RenderOptions {
  state: EditorState;
  canvas: HTMLCanvasElement;
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

export function renderCinematicFrame({ state, canvas }: RenderOptions) {
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

  // --- 1. BASE IMAGE DRAW WITH CONTRAST & SATURATION ---
  const contrast = 100 + state.contrast;
  const saturate = 100 + state.saturation;
  
  ctx.filter = `contrast(${contrast}%) saturate(${saturate}%)`;
  ctx.drawImage(img, imageRect.x, imageRect.y, imageRect.width, imageRect.height);
  ctx.filter = 'none';

  // --- 2. ADVANCED COLOR GRADING (Highlights & Temperature) ---
  if (state.highlights !== 0 || state.temperature !== 0) {
    // Process only the image area (integer rect, see geometry.ts)
    const imgData = ctx.getImageData(area.x, area.y, area.width, area.height);
    const data = imgData.data;
    
    const highlights = state.highlights / 100; // range roughly -0.5 to 0.2
    const temp = state.temperature; // range -30 to 30

    for (let i = 0; i < data.length; i += 4) {
      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];

      // Temperature adjustment (shifting R and B channels)
      if (temp !== 0) {
        // Subtle non-linear shift to preserve extremes
        const rShift = temp * 1.5;
        const bShift = -temp * 1.5;
        r = r + rShift * (1 - Math.abs(r - 128) / 256);
        b = b + bShift * (1 - Math.abs(b - 128) / 256);
      }

      // Highlights recovery (compressing the top end of the luma curve)
      if (highlights !== 0) {
        const luma = 0.299 * r + 0.587 * g + 0.114 * b;
        // Only affect pixels brighter than mid-gray
        if (luma > 128) {
          // Calculate how far into the highlights this pixel is (0.0 to 1.0)
          const highlightFactor = (luma - 128) / 127;
          // Apply curve
          const adjustment = 1 + (highlights * highlightFactor);
          r *= adjustment;
          g *= adjustment;
          b *= adjustment;
        }
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
    
    const gradient = ctx.createRadialGradient(cx, cy, radius * 0.3, cx, cy, radius);
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(0.5, `rgba(0, 0, 0, ${state.vignette / 100 * 0.1})`);
    gradient.addColorStop(1, `rgba(0, 0, 0, ${state.vignette / 100 * 0.7})`);
    
    ctx.fillStyle = gradient;
    ctx.fillRect(area.x, area.y, area.width, area.height);
  }

  ctx.restore();

  // --- 5. CINEMATIC TYPOGRAPHY (Quote & Subtitle Engine) ---
  ctx.globalCompositeOperation = 'source-over';
  renderCinematicText(ctx, area, state);
}

export async function exportCanvasAsImage(canvas: HTMLCanvasElement, filename: string = 'frame.jpg') {
  if (typeof document !== 'undefined' && 'fonts' in document) {
    try {
      await document.fonts.ready;
    } catch {
      // fallback if fonts ready check errors
    }
  }
  const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
