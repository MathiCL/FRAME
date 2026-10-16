import assert from 'node:assert';
import {
  CINEMATIC_PRESETS,
  PRESET_GALLERY_LIST,
  applyPresetIntensity,
  getPresetDisplayName,
} from 'file:///c:/Users/matia/OneDrive/Escritorio/PROGRAMACION PERSONAL/imagen-cita/src/lib/presets.ts';

console.log('=== TEST SUITE: AFTER HOURS INTEGRATION & IMMUTABILITY ===\n');

// Mock Editor State
const initialState = {
  text: '—Somos guardianes de la noche—',
  textAuthor: 'Cinematógrafo Anónimo',
  showAuthor: true,
  textFont: 'serif',
  textAlign: 'center',
  textColor: '#F4EFE6',
  textSize: 40,
  textHorizontalPosition: 50,
  textVerticalPosition: 80,
  textOpacity: 100,
  textShadow: true,
  showText: true,
  textBackground: true,
  textBackgroundColor: '#0A0A0C',
  textBackgroundOpacity: 75,
  textBackgroundRadius: 8,
  textBackgroundPaddingX: 18,
  textBackgroundPaddingY: 10,
  zoom: 1.35,
  positionX: 12.5,
  positionY: -8.4,
  format: '2.39:1',
  fitMode: 'fill',
  letterbox: true,
  preset: 'ORIGINAL',
  presetIntensity: 100,
  ...CINEMATIC_PRESETS.ORIGINAL.values,
};

// 1. Apply AFTER_HOURS
console.log('--- 1. Applying AFTER_HOURS preset ---');
const afterHoursValues = applyPresetIntensity(CINEMATIC_PRESETS.AFTER_HOURS.values, 100);
const stateAfterHours = {
  ...initialState,
  ...afterHoursValues,
  preset: 'AFTER_HOURS',
};

// Check visual values updated
assert.strictEqual(stateAfterHours.preset, 'AFTER_HOURS');
assert.strictEqual(stateAfterHours.contrast, 22);
assert.strictEqual(stateAfterHours.saturation, -18);
assert.strictEqual(stateAfterHours.temperature, 12);
assert.strictEqual(stateAfterHours.highlights, 6);
assert.strictEqual(stateAfterHours.shadows, -32);
assert.strictEqual(stateAfterHours.exposure, -14);
assert.strictEqual(stateAfterHours.grain, 6);
assert.strictEqual(stateAfterHours.vignette, 34);

// Check framing completely preserved
assert.strictEqual(stateAfterHours.zoom, 1.35);
assert.strictEqual(stateAfterHours.positionX, 12.5);
assert.strictEqual(stateAfterHours.positionY, -8.4);
assert.strictEqual(stateAfterHours.format, '2.39:1');
assert.strictEqual(stateAfterHours.fitMode, 'fill');
assert.strictEqual(stateAfterHours.letterbox, true);

// Check text and background completely preserved
assert.strictEqual(stateAfterHours.text, '—Somos guardianes de la noche—');
assert.strictEqual(stateAfterHours.textAuthor, 'Cinematógrafo Anónimo');
assert.strictEqual(stateAfterHours.textFont, 'serif');
assert.strictEqual(stateAfterHours.textBackground, true);
assert.strictEqual(stateAfterHours.textBackgroundColor, '#0A0A0C');
assert.strictEqual(stateAfterHours.textBackgroundOpacity, 75);

console.log('✓ AFTER_HOURS applied cleanly without touching framing or typography!\n');

// 2. Change Intensity to 60%
console.log('--- 2. Changing intensity to 60% ---');
const intensity60Values = applyPresetIntensity(CINEMATIC_PRESETS.AFTER_HOURS.values, 60);
const state60 = {
  ...stateAfterHours,
  ...intensity60Values,
  presetIntensity: 60,
};

assert.strictEqual(state60.contrast, Math.round(22 * 0.6)); // 13
assert.strictEqual(state60.saturation, Math.round(-18 * 0.6)); // -11
assert.strictEqual(state60.temperature, Math.round(12 * 0.6)); // 7
assert.strictEqual(state60.highlights, Math.round(6 * 0.6)); // 4
assert.strictEqual(state60.shadows, Math.round(-32 * 0.6)); // -19
assert.strictEqual(state60.exposure, Math.round(-14 * 0.6)); // -8
assert.strictEqual(state60.grain, Math.round(6 * 0.6)); // 4
assert.strictEqual(state60.vignette, Math.round(34 * 0.6)); // 20
console.log('✓ Intensity scaling to 60% is mathematically exact!\n');

// 3. Switch to NOIR and back to AFTER_HOURS
console.log('--- 3. Preset switching idempotency ---');
const noirValues = applyPresetIntensity(CINEMATIC_PRESETS.NOIR.values, 100);
const stateNoir = {
  ...state60,
  ...noirValues,
  preset: 'NOIR',
};
assert.strictEqual(stateNoir.saturation, -100);

const backToAHValues = applyPresetIntensity(CINEMATIC_PRESETS.AFTER_HOURS.values, 100);
const stateBackToAH = {
  ...stateNoir,
  ...backToAHValues,
  preset: 'AFTER_HOURS',
  presetIntensity: 100,
};

assert.deepStrictEqual(
  {
    exposure: stateBackToAH.exposure,
    contrast: stateBackToAH.contrast,
    saturation: stateBackToAH.saturation,
    temperature: stateBackToAH.temperature,
    highlights: stateBackToAH.highlights,
    shadows: stateBackToAH.shadows,
    grain: stateBackToAH.grain,
    vignette: stateBackToAH.vignette,
  },
  CINEMATIC_PRESETS.AFTER_HOURS.values,
  'No filter accumulation occurred when switching presets'
);
console.log('✓ Zero filter accumulation when switching between styles!\n');

// 4. Check Presence in Gallery List
console.log('--- 4. Gallery presence & Display Name ---');
const inGallery = PRESET_GALLERY_LIST.find((p) => p.id === 'AFTER_HOURS');
assert(inGallery !== undefined, 'AFTER_HOURS must be present in PRESET_GALLERY_LIST');
assert.strictEqual(inGallery.name, 'After Hours');
assert.strictEqual(getPresetDisplayName('AFTER_HOURS'), 'After Hours');
console.log('✓ AFTER_HOURS appears in user gallery with name "After Hours" and gradient swatch!\n');

console.log('======================================================');
console.log('¡TODAS LAS PRUEBAS DE INTEGRACIÓN DE AFTER HOURS PASARON!');
console.log('======================================================');
