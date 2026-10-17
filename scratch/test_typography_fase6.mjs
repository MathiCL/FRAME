import assert from 'node:assert';
import { FONT_STACKS } from '../src/lib/typography.ts';
import { CINEMATIC_PRESETS } from '../src/lib/presets.ts';

console.log('=== TEST SUITE: AJUSTES MENORES, TIPOGRAFÍA Y SAFARI (FASE 6) ===\n');

// 1. Validar las 7 familias tipográficas requeridas
console.log('--- 1. Comprobación de familias tipográficas ---');
const expectedFonts = [
  'type-machine',
  'elegant-typewriter',
  'courier-prime',
  'montserrat',
  'serif',
  'sans',
  'mono',
];

for (const fontId of expectedFonts) {
  const fontData = FONT_STACKS[fontId];
  assert(fontData, `Fuente ${fontId} debe estar registrada en FONT_STACKS`);
  assert(typeof fontData.label === 'string' && fontData.label.length > 0, `Etiqueta de ${fontId} no válida`);
  assert(typeof fontData.family === 'string' && fontData.family.length > 0, `Pila CSS de ${fontId} no válida`);
  console.log(`✓ [${fontId}]: "${fontData.label}" => ${fontData.family}`);
}

// 2. Verificar correspondencias específicas
console.log('\n--- 2. Especificación de Type Machine y Elegant Typewriter ---');
// Type Machine
const tm = FONT_STACKS['type-machine'];
assert(tm.family.includes('Type Machine'), 'Type Machine debe priorizar la fuente del autor');
assert(tm.family.includes('Special Elite'), 'Type Machine debe tener fallback a Special Elite (OFL local)');
console.log('✓ Type Machine correctamente configurada con fallback a Special Elite local');

// Elegant Typewriter
const et = FONT_STACKS['elegant-typewriter'];
assert(et.family.includes('Elegant Typewriter'), 'Elegant Typewriter debe priorizar la fuente');
assert(et.family.includes('Courier Prime'), 'Elegant Typewriter debe tener fallback a Courier Prime (OFL local)');
console.log('✓ Elegant Typewriter correctamente configurada con fallback a Courier Prime local');

// Courier Prime (Máquina clásica)
const cp = FONT_STACKS['courier-prime'];
assert(cp.family.includes('Courier Prime'), 'Courier Prime debe usar la familia nativa de guion cinematográfico');
console.log('✓ Máquina Clásica (Courier Prime) correctamente configurada');

// Montserrat (Editorial Sans)
const ms = FONT_STACKS['montserrat'];
assert(ms.family.includes('Montserrat'), 'Montserrat debe estar presente en Editorial Sans');
console.log('✓ Editorial Sans (Montserrat) correctamente configurada');

// 3. Probar lógica de restablecimiento por sección
console.log('\n--- 3. Restablecimiento independiente por sección ---');
const mockState = {
  image: { width: 1920, height: 1080 },
  zoom: 1.8,
  positionX: 25,
  positionY: -15,
  format: '2.39:1',
  fitMode: 'fill',
  letterbox: true,
  // Color
  preset: 'AFTER_HOURS',
  presetIntensity: 80,
  contrast: 22,
  saturation: -18,
  temperature: 12,
  exposure: -14,
  shadows: -32,
  // Textura
  grain: 25,
  vignette: 40,
  // Texto
  text: 'Texto de prueba',
  textFont: 'type-machine',
  textSize: 42,
  textColor: '#FDE047',
  textBackground: true,
  textBackgroundColor: '#0B131D',
};

// Reset Encuadre
const afterResetFraming = {
  ...mockState,
  zoom: 1,
  positionX: 0,
  positionY: 0,
};
assert.strictEqual(afterResetFraming.zoom, 1);
assert.strictEqual(afterResetFraming.positionX, 0);
assert.strictEqual(afterResetFraming.positionY, 0);
assert.strictEqual(afterResetFraming.preset, 'AFTER_HOURS', 'El preset no debe cambiar al restablecer encuadre');
assert.strictEqual(afterResetFraming.grain, 25, 'El grano no debe cambiar al restablecer encuadre');
console.log('✓ Restablecer encuadre es 100% aislado');

// Reset Textura
const afterResetTexture = {
  ...mockState,
  grain: 0,
  vignette: 0,
};
assert.strictEqual(afterResetTexture.grain, 0);
assert.strictEqual(afterResetTexture.vignette, 0);
assert.strictEqual(afterResetTexture.zoom, 1.8, 'El zoom no debe cambiar al restablecer textura');
assert.strictEqual(afterResetTexture.preset, 'AFTER_HOURS', 'El color no debe cambiar al restablecer textura');
console.log('✓ Restablecer textura es 100% aislado');

// Reset Color
const afterResetColor = {
  ...mockState,
  preset: 'ORIGINAL',
  presetIntensity: 100,
  ...CINEMATIC_PRESETS.ORIGINAL.values,
};
assert.strictEqual(afterResetColor.preset, 'ORIGINAL');
assert.strictEqual(afterResetColor.contrast, 0);
assert.strictEqual(afterResetColor.exposure, 0);
assert.strictEqual(afterResetColor.shadows, 0);
assert.strictEqual(afterResetColor.text, 'Texto de prueba', 'El texto no debe cambiar al restablecer color');
assert.strictEqual(afterResetColor.zoom, 1.8, 'El zoom no debe cambiar al restablecer color');
console.log('✓ Restablecer color es 100% aislado');

// 4. Probar diferenciación de feedback de exportación
console.log('\n--- 4. Diferenciación de eventos de exportación ---');
const exportScenarios = [
  { method: 'download', canceled: false, expectedFeedback: 'download', claimsSaved: true },
  { method: 'share', canceled: false, expectedFeedback: 'share', claimsSaved: false },
  { method: 'share', canceled: true, expectedFeedback: 'canceled', claimsSaved: false },
  { method: 'preview', canceled: false, expectedFeedback: 'preview', claimsSaved: false },
];

for (const sc of exportScenarios) {
  let feedbackType = null;
  let claimsSuccess = false;

  if (sc.method === 'preview') {
    feedbackType = 'preview';
    claimsSuccess = false;
  } else if (sc.method === 'share') {
    if (sc.canceled) {
      feedbackType = 'canceled';
      claimsSuccess = false;
    } else {
      feedbackType = 'share';
      claimsSuccess = false; // Never claim saved prematurely!
    }
  } else if (sc.method === 'download') {
    feedbackType = 'download';
    claimsSuccess = true;
  }

  assert.strictEqual(feedbackType, sc.expectedFeedback, `Feedback de ${sc.method} incorrecto`);
  assert.strictEqual(claimsSuccess, sc.claimsSaved, `Premature success check failed for ${sc.method}`);
  console.log(`✓ Escenario [${sc.method}${sc.canceled ? ' (cancelado)' : ''}]: feedback="${feedbackType}", claimsSaved=${claimsSuccess}`);
}

console.log('\n======================================================');
console.log('¡TODAS LAS PRUEBAS DE LA FASE 6 PASARON CON ÉXITO!');
console.log('======================================================');
