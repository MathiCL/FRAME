import fs from 'node:fs';
import path from 'node:path';

// Helper to write a 24-bit uncompressed BMP file
function createBMP(width, height, getPixel) {
  const rowSize = Math.floor((24 * width + 31) / 32) * 4;
  const pixelArraySize = rowSize * height;
  const fileSize = 54 + pixelArraySize;
  const buffer = Buffer.alloc(fileSize);

  // BMP Header
  buffer.write('BM', 0);
  buffer.writeUInt32LE(fileSize, 2);
  buffer.writeUInt32LE(54, 10); // offset to pixel data

  // DIB Header (BITMAPINFOHEADER)
  buffer.writeUInt32LE(40, 14); // header size
  buffer.writeInt32LE(width, 18);
  buffer.writeInt32LE(height, 22); // positive = bottom-up
  buffer.writeUInt16LE(1, 26); // color planes
  buffer.writeUInt16LE(24, 28); // bits per pixel
  buffer.writeUInt32LE(0, 30); // BI_RGB (no compression)
  buffer.writeUInt32LE(pixelArraySize, 34);
  buffer.writeInt32LE(2835, 38); // 72 DPI
  buffer.writeInt32LE(2835, 42); // 72 DPI

  // Pixels (bottom-up order)
  for (let y = 0; y < height; y++) {
    const rowOffset = 54 + y * rowSize;
    for (let x = 0; x < width; x++) {
      // In BMP, row 0 is the bottom of the image
      const actualY = height - 1 - y;
      const { r, g, b } = getPixel(x, actualY);
      const pixelOffset = rowOffset + x * 3;
      buffer[pixelOffset] = Math.min(255, Math.max(0, b));     // Blue
      buffer[pixelOffset + 1] = Math.min(255, Math.max(0, g)); // Green
      buffer[pixelOffset + 2] = Math.min(255, Math.max(0, r)); // Red
    }
  }

  return buffer;
}

// 1. Generate base scene: Night scene with deep shadows, a building, and bright warm light sources
const W = 320;
const H = 240;
const baseImage = [];

for (let y = 0; y < H; y++) {
  const row = [];
  for (let x = 0; x < W; x++) {
    // Distance to streetlamp 1 (x: 90, y: 70)
    const d1 = Math.hypot(x - 90, y - 70);
    // Distance to car headlight 2 (x: 230, y: 160)
    const d2 = Math.hypot(x - 230, y - 160);

    let r = 14 + (y / H) * 12; // deep dark night gradient
    let g = 16 + (y / H) * 10;
    let b = 24 + (y / H) * 12;

    // Building silhouette
    if (x > 140 && x < 210 && y > 50) {
      r = 18; g = 18; b = 22;
    }

    // Streetlamp light bulb (intense highlight)
    if (d1 < 10) {
      const core = Math.max(0, 1 - d1 / 10);
      r = 255;
      g = 240 * core + 200 * (1 - core);
      b = 190 * core + 120 * (1 - core);
    } else if (d1 < 35) {
      const falloff = Math.pow(1 - (d1 - 10) / 25, 2);
      r += 140 * falloff;
      g += 110 * falloff;
      b += 50 * falloff;
    }

    // Car headlight (sharp white/cyan highlight)
    if (d2 < 6) {
      r = 255; g = 255; b = 255;
    } else if (d2 < 20) {
      const falloff = Math.pow(1 - (d2 - 6) / 14, 2);
      r += 120 * falloff;
      g += 130 * falloff;
      b += 160 * falloff;
    }

    row.push({
      r: Math.min(255, Math.round(r)),
      g: Math.min(255, Math.round(g)),
      b: Math.min(255, Math.round(b)),
    });
  }
  baseImage.push(row);
}

// 2. Perform glow extraction (threshold 165, soft quadratic knee, warm tinting)
const threshold = 165;
const thresholdRange = 255 - threshold;
const extractedLayer = [];

for (let y = 0; y < H; y++) {
  const row = [];
  for (let x = 0; x < W; x++) {
    const px = baseImage[y][x];
    const luma = 0.299 * px.r + 0.587 * px.g + 0.114 * px.b;
    if (luma <= threshold) {
      row.push({ r: 0, g: 0, b: 0, a: 0 });
    } else {
      const factor = Math.min(1, Math.max(0, (luma - threshold) / thresholdRange));
      const alphaWeight = factor * factor;
      // Warm tone tint
      const r = Math.min(255, px.r * 1.25 + 30);
      const g = Math.min(255, px.g * 1.1 + 10);
      const b = Math.max(0, px.b * 0.65 - 15);
      row.push({ r, g, b, a: alphaWeight });
    }
  }
  extractedLayer.push(row);
}

// 3. Multi-pass Gaussian blur simulation for the glow layer
const radius = 16;
const blurredGlow = [];

// Horizontal pass
const tempH = [];
for (let y = 0; y < H; y++) {
  const row = [];
  for (let x = 0; x < W; x++) {
    let accR = 0, accG = 0, accB = 0, accA = 0, weightSum = 0;
    for (let k = -radius; k <= radius; k++) {
      const nx = Math.min(W - 1, Math.max(0, x + k));
      const weight = Math.exp(-(k * k) / (2 * (radius / 2.5) * (radius / 2.5)));
      const p = extractedLayer[y][nx];
      accR += p.r * p.a * weight;
      accG += p.g * p.a * weight;
      accB += p.b * p.a * weight;
      accA += p.a * weight;
      weightSum += weight;
    }
    row.push({
      r: accR / weightSum,
      g: accG / weightSum,
      b: accB / weightSum,
      a: accA / weightSum,
    });
  }
  tempH.push(row);
}

// Vertical pass
for (let y = 0; y < H; y++) {
  const row = [];
  for (let x = 0; x < W; x++) {
    let accR = 0, accG = 0, accB = 0, accA = 0, weightSum = 0;
    for (let k = -radius; k <= radius; k++) {
      const ny = Math.min(H - 1, Math.max(0, y + k));
      const weight = Math.exp(-(k * k) / (2 * (radius / 2.5) * (radius / 2.5)));
      const p = tempH[ny][x];
      accR += p.r * weight;
      accG += p.g * weight;
      accB += p.b * weight;
      accA += p.a * weight;
      weightSum += weight;
    }
    row.push({
      r: accR / weightSum,
      g: accG / weightSum,
      b: accB / weightSum,
      a: accA / weightSum,
    });
  }
  blurredGlow.push(row);
}

// 4. Composite with 'screen' blending mode: Result = 1 - (1 - A) * (1 - B)
// Screen blend formula per channel: S = A + B - (A * B) / 255
const intensity = 0.65; // 65%
const finalComposite = [];

for (let y = 0; y < H; y++) {
  const row = [];
  for (let x = 0; x < W; x++) {
    const orig = baseImage[y][x];
    const glow = blurredGlow[y][x];
    const alpha = glow.a * intensity;

    const gR = glow.r * alpha;
    const gG = glow.g * alpha;
    const gB = glow.b * alpha;

    // Canvas 'screen' composite
    const resR = orig.r + gR - (orig.r * gR) / 255;
    const resG = orig.g + gG - (orig.g * gG) / 255;
    const resB = orig.b + gB - (orig.b * gB) / 255;

    row.push({
      r: Math.round(resR),
      g: Math.round(resG),
      b: Math.round(resB),
    });
  }
  finalComposite.push(row);
}

// 5. Output BMPs
const artifactDir = 'C:\\Users\\matia\\.gemini\\antigravity-ide\\brain\\92b6363f-5e4b-4405-941d-2fbfcb91bdeb';
const beforeBmp = createBMP(W, H, (x, y) => baseImage[y][x]);
const afterBmp = createBMP(W, H, (x, y) => finalComposite[y][x]);

fs.writeFileSync(path.join(artifactDir, 'visual_verify_before_glow.bmp'), beforeBmp);
fs.writeFileSync(path.join(artifactDir, 'visual_verify_after_glow.bmp'), afterBmp);

console.log('✓ Visual verification images generated: visual_verify_before_glow.bmp and visual_verify_after_glow.bmp');
