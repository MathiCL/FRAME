import assert from 'node:assert';

// Simulate the color grading function on an RGB pixel
function gradePixel(r, g, b, values) {
  const exposure = (values.exposure ?? 0) / 100;
  const contrast = (100 + (values.contrast ?? 0)) / 100;
  const saturation = (100 + (values.saturation ?? 0)) / 100;
  const highlights = (values.highlights ?? 0) / 100;
  const shadows = (values.shadows ?? 0) / 100;
  const temp = values.temperature ?? 0;

  // 1. Contrast & Saturation (CSS filter simulation)
  // Contrast: (x - 128) * C + 128
  let cr = (r - 128) * contrast + 128;
  let cg = (g - 128) * contrast + 128;
  let cb = (b - 128) * contrast + 128;

  // Saturation: luma + (c - luma) * S
  const lumaCss = 0.299 * cr + 0.587 * cg + 0.114 * cb;
  cr = lumaCss + (cr - lumaCss) * saturation;
  cg = lumaCss + (cg - lumaCss) * saturation;
  cb = lumaCss + (cb - lumaCss) * saturation;

  // 2. Advanced Grading (Exposure, Shadows, Highlights, Temperature)
  let luma = 0.299 * cr + 0.587 * cg + 0.114 * cb;

  // Exposure
  if (exposure !== 0) {
    const expFactor = 1 + exposure;
    cr *= expFactor;
    cg *= expFactor;
    cb *= expFactor;
    luma *= expFactor;
  }

  // Shadows
  if (shadows !== 0 && luma < 160) {
    const shadowFactor = (160 - luma) / 160;
    const weight = shadowFactor * shadowFactor;
    const shadowAdj = 1 + (shadows * weight);
    cr *= shadowAdj;
    cg *= shadowAdj;
    cb *= shadowAdj;
    luma *= shadowAdj;
  }

  // Highlights
  if (highlights !== 0 && luma > 120) {
    const highlightFactor = (luma - 120) / 135;
    const weight = highlightFactor * highlightFactor;
    const highlightAdj = 1 + (highlights * weight);
    cr *= highlightAdj;
    cg *= highlightAdj;
    cb *= highlightAdj;
  }

  // Temperature with shadow isolation
  if (temp !== 0) {
    const rShift = temp * 1.5;
    const bShift = -temp * 1.5;
    const shadowGate = Math.min(1, Math.max(0, luma / 40));
    const bellCurve = (1 - Math.abs(Math.min(255, Math.max(0, luma)) - 128) / 256) * shadowGate;
    cr = cr + rShift * bellCurve;
    cb = cb + bShift * bellCurve;
  }

  return {
    r: Math.round(Math.min(255, Math.max(0, cr))),
    g: Math.round(Math.min(255, Math.max(0, cg))),
    b: Math.round(Math.min(255, Math.max(0, cb))),
  };
}

console.log('=== TEST SUITE: AFTER HOURS TRANSFER CURVES ===\n');

const afterHoursValues = {
  exposure: -14,
  contrast: 22,
  saturation: -18,
  temperature: 12,
  highlights: 6,
  shadows: -32,
  grain: 6,
  vignette: 34,
};

// Test 1: Deep shadows (e.g. background in bar or dark room, input RGB: 35, 30, 25)
const shadowIn = { r: 35, g: 30, b: 25 };
const shadowOut = gradePixel(shadowIn.r, shadowIn.g, shadowIn.b, afterHoursValues);
console.log('--- Test 1: Deep Shadow Pixel ---');
console.log('In :', shadowIn);
console.log('Out:', shadowOut);
const shadowLumaIn = 0.299 * shadowIn.r + 0.587 * shadowIn.g + 0.114 * shadowIn.b;
const shadowLumaOut = 0.299 * shadowOut.r + 0.587 * shadowOut.g + 0.114 * shadowOut.b;
console.log(`Luma: ${shadowLumaIn.toFixed(1)} => ${shadowLumaOut.toFixed(1)} (deepened by ${((1 - shadowLumaOut / shadowLumaIn) * 100).toFixed(1)}%)`);
assert(shadowLumaOut < shadowLumaIn * 0.7, 'Shadows must be significantly deepened');
assert(shadowOut.r >= 0 && shadowOut.r < 25, 'Shadows must reach deep near-black without clipping into negative');

// Test 2: Practical light / Bar lamp / Face highlight (input RGB: 230, 195, 140)
const lightIn = { r: 230, g: 195, b: 140 };
const lightOut = gradePixel(lightIn.r, lightIn.g, lightIn.b, afterHoursValues);
console.log('\n--- Test 2: Warm Practical Light / Highlight Pixel ---');
console.log('In :', lightIn);
console.log('Out:', lightOut);
const lightLumaIn = 0.299 * lightIn.r + 0.587 * lightIn.g + 0.114 * lightIn.b;
const lightLumaOut = 0.299 * lightOut.r + 0.587 * lightOut.g + 0.114 * lightOut.b;
console.log(`Luma: ${lightLumaIn.toFixed(1)} => ${lightLumaOut.toFixed(1)}`);
assert(lightLumaOut > 180, 'Practical lights must remain luminous and clearly visible');
assert(lightOut.r > lightOut.b + 50, 'Warm amber tone must be preserved and enhanced');

// Test 3: Baby skin tone / Light cloth (input RGB: 215, 185, 170)
const skinIn = { r: 215, g: 185, b: 170 };
const skinOut = gradePixel(skinIn.r, skinIn.g, skinIn.b, afterHoursValues);
console.log('\n--- Test 3: Baby Skin Tone / Light Cloth Pixel ---');
console.log('In :', skinIn);
console.log('Out:', skinOut);
const skinLumaIn = 0.299 * skinIn.r + 0.587 * skinIn.g + 0.114 * skinIn.b;
const skinLumaOut = 0.299 * skinOut.r + 0.587 * skinOut.g + 0.114 * skinOut.b;
console.log(`Luma: ${skinLumaIn.toFixed(1)} => ${skinLumaOut.toFixed(1)}`);
assert(skinLumaOut > 175, 'Skin tones and light details must remain clearly visible and not crushed');
assert(skinOut.r > skinOut.g && skinOut.g > skinOut.b, 'Natural healthy skin tone hierarchy (R > G > B) preserved');

// Test 4: Ambient wood tone in bar (input RGB: 95, 60, 40)
const woodIn = { r: 95, g: 60, b: 40 };
const woodOut = gradePixel(woodIn.r, woodIn.g, woodIn.b, afterHoursValues);
console.log('\n--- Test 4: Dark Wood Mid-tone Pixel ---');
console.log('In :', woodIn);
console.log('Out:', woodOut);
assert(woodOut.r > woodOut.b, 'Wood retains warm amber-brown reflections');

console.log('\nAll transfer curve simulations passed successfully!');
