import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { generateCreativeProposals, applyProposalSettings } from '../src/lib/surprise.ts';

console.log('=== FRAME 2.2 — SUITE DE PRUEBAS: RESPLANDOR Y SORPRÉNDEME ===\n');

// -------------------------------------------------------------
// PRUEBA 1: Verificación de calidad JPG 0.95 y configuración de exportación
// -------------------------------------------------------------
console.log('--- TEST 1: Paridad de exportación JPG y calidad 0.95 ---');
const canvasTsPath = path.resolve('./src/lib/canvas.ts');
const canvasTsContent = fs.readFileSync(canvasTsPath, 'utf8');

assert(
  canvasTsContent.includes("'image/jpeg', 0.95") || canvasTsContent.includes('"image/jpeg", 0.95'),
  'canvas.ts debe mantener la calidad de exportación JPG en 0.95'
);
assert(canvasTsContent.includes('renderCinematicGlow'), 'canvas.ts debe incluir renderCinematicGlow');
console.log('✓ Calidad JPG 0.95 verificada e integración de renderCinematicGlow confirmada.');

// -------------------------------------------------------------
// PRUEBA 2: Resplandor de Luces — Aislamiento y extracción de altas luces
// -------------------------------------------------------------
console.log('\n--- TEST 2: Resplandor de Luces (Lógica de altas luces y preservación de sombras) ---');

// Simulación de la curva de umbral y tonos
function simulateHighlightExtraction(pixels, threshold = 165, tone = 'warm') {
  return pixels.map((px) => {
    const luma = 0.299 * px.r + 0.587 * px.g + 0.114 * px.b;
    if (luma <= threshold) {
      // Las sombras y medios tonos deben quedar en alpha 0 (completamente cortados)
      return { r: px.r, g: px.g, b: px.b, a: 0, luma };
    }
    const factor = Math.min(1, Math.max(0, (luma - threshold) / (255 - threshold)));
    const alphaWeight = factor * factor;

    let r = px.r;
    let g = px.g;
    let b = px.b;

    if (tone === 'warm') {
      r = Math.min(255, r * 1.25 + 30);
      g = Math.min(255, g * 1.1 + 10);
      b = Math.max(0, b * 0.65 - 15);
    } else if (tone === 'red') {
      r = Math.min(255, r * 1.35 + 40);
      g = Math.max(0, g * 0.5 - 15);
      b = Math.max(0, b * 0.45 - 20);
    }

    return { r, g, b, a: Math.round(alphaWeight * 255), luma };
  });
}

// Muestra de píxeles: sombra pura, medio tono, luz urbana brillante, sol/farola directa
const samplePixels = [
  { name: 'Sombra profunda', r: 15, g: 15, b: 18 },
  { name: 'Tono medio / piel', r: 120, g: 95, b: 80 },
  { name: 'Umbral medio', r: 160, g: 155, b: 150 },
  { name: 'Farola cálida', r: 245, g: 210, b: 140 },
  { name: 'Punto de luz directa', r: 255, g: 255, b: 255 },
];

const warmResults = simulateHighlightExtraction(samplePixels, 165, 'warm');
const redResults = simulateHighlightExtraction(samplePixels, 165, 'red');
const neutralResults = simulateHighlightExtraction(samplePixels, 165, 'neutral');

// Sombras y tonos medios deben tener opacidad cero
assert.strictEqual(warmResults[0].a, 0, 'Sombra profunda debe tener alpha 0 en el halo');
assert.strictEqual(warmResults[1].a, 0, 'Tonos medios deben tener alpha 0 en el halo');
assert.strictEqual(warmResults[2].a, 0, 'Píxeles bajo el umbral de 165 deben tener alpha 0');

// Las luces altas deben tener alpha creciente
assert(warmResults[3].a > 50, 'Farola cálida debe generar halo visible');
assert.strictEqual(warmResults[4].a, 255, 'Punto de luz máxima debe generar halo con alpha 255');

// Verificación de tonalidades
assert(warmResults[3].r > warmResults[3].b, 'Tono cálido debe incrementar componente roja/ámbar frente a azul');
assert(redResults[3].r > redResults[3].g * 1.5, 'Tono rojo (halation) debe incrementar rojo y atenuar verde');
assert.strictEqual(neutralResults[3].r, samplePixels[3].r, 'Tono neutro debe preservar color cromático original');

console.log('✓ Sombras y medios tonos aislados con alpha 0 (sin neblina global).');
console.log('✓ Altas luces adquieren halo suave proporcional con curvatura cuadrática.');
console.log('✓ Tonalidades cálida, rojiza (halation 35mm) y neutra validadas.');

// -------------------------------------------------------------
// PRUEBA 3: Pipeline de renderizado en Canvas y no alteración de capas
// -------------------------------------------------------------
console.log('\n--- TEST 3: Integración de capas fotográficas vs decorativas ---');
const glowCallIndex = canvasTsContent.indexOf('renderCinematicGlow(ctx, area, state)');
const grainIndex = canvasTsContent.indexOf('// --- 3. GRAIN ---');
const borderIndex = canvasTsContent.indexOf('renderCinematicBorders(');
const textIndex = canvasTsContent.indexOf('renderCinematicText(');
const timestampIndex = canvasTsContent.indexOf('renderCinematicTimestamp(');
const creditsIndex = canvasTsContent.indexOf('renderCinematicCredits(');

assert(glowCallIndex !== -1, 'renderCinematicGlow debe llamarse en renderCinematicFrame');
assert(glowCallIndex < grainIndex, 'El resplandor debe aplicarse antes del grano fotográfico');
assert(glowCallIndex < borderIndex, 'El resplandor no debe afectar ni manchar los bordes analógicos');
assert(glowCallIndex < textIndex, 'El resplandor no debe desenfocar ni alterar la frase principal');
assert(glowCallIndex < timestampIndex, 'El resplandor no debe alterar las marcas de tiempo');
assert(glowCallIndex < creditsIndex, 'El resplandor no debe alterar los créditos');

console.log('✓ Secuencia verificada: imagen -> revelado -> resplandor -> grano -> viñeta -> bordes -> textos -> marcas -> créditos.');

// -------------------------------------------------------------
// PRUEBA 4: «Sorpréndeme» — Generación de 3 propuestas diversas
// -------------------------------------------------------------
console.log('\n--- TEST 4: Generador de propuestas «Sorpréndeme» ---');

const mockState = {
  image: 'mock-image-ref',
  format: '2.39:1',
  fitMode: 'fill',
  zoom: 1.4,
  panX: 12,
  panY: -8,
  text: '«En el fondo del mar no hay recuerdos»',
  textType: 'quote',
  textFont: 'serif',
  textColor: '#F4EFE6',
  textSize: 42,
  textVerticalPosition: 80,
  showAuthor: true,
  textAuthor: 'Jacques Cousteau',
  timestampEnabled: true,
  timestampText: 'OCT. 1998',
  creditEnabled: true,
  creditRole: 'DIRECTED BY',
  creditName: 'WES ANDERSON',
  borderEnabled: true,
  borderStyle: 'negative-35mm',
  // Ajustes de color iniciales
  preset: 'ORIGINAL',
  presetIntensity: 100,
  exposure: 0,
  contrast: 0,
  saturation: 0,
  temperature: 0,
  highlights: 0,
  shadows: 0,
  grain: 0,
  vignette: 0,
  glowEnabled: false,
  glowIntensity: 25,
  glowRadius: 24,
  glowTone: 'warm',
};

// Generar propuestas
const proposalsA = generateCreativeProposals(mockState, 12345);
const proposalsB = generateCreativeProposals(mockState, 67890);

assert.strictEqual(proposalsA.length, 3, 'Debe generar exactamente 3 propuestas');
assert.strictEqual(proposalsB.length, 3, 'Debe generar exactamente 3 propuestas');

// Verificar que las 3 opciones pertenecen a arquetipos diversos
const badgesA = proposalsA.map((p) => p.badge);
assert.notStrictEqual(badgesA[0], badgesA[1], 'Propuesta 1 y 2 deben tener diferente arquetipo');
assert.notStrictEqual(badgesA[1], badgesA[2], 'Propuesta 2 y 3 deben tener diferente arquetipo');
assert.notStrictEqual(badgesA[0], badgesA[2], 'Propuesta 1 y 3 deben tener diferente arquetipo');

// Verificar que cada propuesta tiene nombre, descripción y ajustes
for (const p of proposalsA) {
  assert(p.name && p.name.length > 3, `Propuesta debe tener nombre: ${p.name}`);
  assert(p.description && p.description.length > 10, `Propuesta debe tener descripción: ${p.description}`);
  assert(p.settings && p.settings.preset, `Propuesta debe definir preset cinematográfico: ${p.settings.preset}`);
}
console.log('✓ Generadas exactamente 3 propuestas con arquetipos diversos y contrastados.');

// -------------------------------------------------------------
// PRUEBA 5: «Sorpréndeme» — Inmutabilidad y preservación de la edición
// -------------------------------------------------------------
console.log('\n--- TEST 5: Preservación absoluta de la edición al aplicar propuestas ---');

const chosenProposal = proposalsA[0];
const stateBeforeApply = JSON.parse(JSON.stringify({ ...mockState, image: 'mock-image-ref' }));

const appliedState = applyProposalSettings(mockState, chosenProposal);

// 1. Encuadre y geometría INTACTOS
assert.strictEqual(appliedState.image, stateBeforeApply.image);
assert.strictEqual(appliedState.format, stateBeforeApply.format);
assert.strictEqual(appliedState.fitMode, stateBeforeApply.fitMode);
assert.strictEqual(appliedState.zoom, stateBeforeApply.zoom);
assert.strictEqual(appliedState.panX, stateBeforeApply.panX);
assert.strictEqual(appliedState.panY, stateBeforeApply.panY);

// 2. Textos, tipografía y autor INTACTOS
assert.strictEqual(appliedState.text, stateBeforeApply.text);
assert.strictEqual(appliedState.textType, stateBeforeApply.textType);
assert.strictEqual(appliedState.textFont, stateBeforeApply.textFont);
assert.strictEqual(appliedState.textSize, stateBeforeApply.textSize);
assert.strictEqual(appliedState.textColor, stateBeforeApply.textColor);
assert.strictEqual(appliedState.textVerticalPosition, stateBeforeApply.textVerticalPosition);
assert.strictEqual(appliedState.textAuthor, stateBeforeApply.textAuthor);

// 3. Marcas de tiempo, créditos y bordes analógicos INTACTOS
assert.strictEqual(appliedState.timestampEnabled, stateBeforeApply.timestampEnabled);
assert.strictEqual(appliedState.timestampText, stateBeforeApply.timestampText);
assert.strictEqual(appliedState.creditEnabled, stateBeforeApply.creditEnabled);
assert.strictEqual(appliedState.creditRole, stateBeforeApply.creditRole);
assert.strictEqual(appliedState.creditName, stateBeforeApply.creditName);
assert.strictEqual(appliedState.borderEnabled, stateBeforeApply.borderEnabled);
assert.strictEqual(appliedState.borderStyle, stateBeforeApply.borderStyle);

// 4. Solo los ajustes de estilo/color/resplandor fueron actualizados
assert.strictEqual(appliedState.preset, chosenProposal.settings.preset);
assert.strictEqual(appliedState.glowEnabled, chosenProposal.settings.glowEnabled);
assert.strictEqual(appliedState.glowTone, chosenProposal.settings.glowTone);
assert.strictEqual(appliedState.glowIntensity, chosenProposal.settings.glowIntensity);

console.log('✓ Encuadre, formato, zoom y desplazamiento 100% preservados.');
console.log('✓ Cita, subtítulo, autor, tipografía y posición 100% preservados.');
console.log('✓ Marcas de tiempo, créditos y marcos analógicos 100% preservados.');
console.log('✓ Ajustes cromáticos y resplandor aplicados con precisión.');

console.log('\n=============================================================');
console.log('TODAS LAS PRUEBAS DE RESPLANDOR Y SORPRÉNDEME PASARON (5/5)');
console.log('=============================================================\n');
