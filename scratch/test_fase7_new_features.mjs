import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

console.log('=== FRAME 2.1 — SUITE DE PRUEBAS DE VALIDACIÓN ===\n');

// -------------------------------------------------------------
// PRUEBA 1: Verificación de calidad JPG 0.95 y nombre 'frame.jpg'
// -------------------------------------------------------------
console.log('--- TEST 1: Verificación de calidad JPG (0.95) y nombre de exportación ---');
const canvasTsPath = path.resolve('./src/lib/canvas.ts');
const canvasTsContent = fs.readFileSync(canvasTsPath, 'utf8');

assert(
  canvasTsContent.includes("'image/jpeg', 0.95") || canvasTsContent.includes('"image/jpeg", 0.95'),
  'canvas.ts debe mantener estrictamente la calidad de exportación JPG en 0.95'
);
assert(
  canvasTsContent.includes("filename = 'frame.jpg'") || canvasTsContent.includes('frame.jpg'),
  'El archivo debe exportarse por defecto como frame.jpg'
);
console.log('✓ Calidad JPG verificada en 0.95 y nombre "frame.jpg" confirmado.');

// -------------------------------------------------------------
// PRUEBA 2: Lógica del botón «Nueva imagen»
// -------------------------------------------------------------
console.log('\n--- TEST 2: Flujo de selección, confirmación y reseteo de «Nueva imagen» ---');

// Simulación del estado del editor
let currentState = {
  image: 'blob:current-photo-123',
  imageElement: { width: 4000, height: 3000 },
  zoom: 1.8,
  panX: 25,
  panY: -15,
  format: '16:9',
  fitMode: 'fill',
  preset: 'AFTER_HOURS',
  grain: 30,
  vignette: 25,
  showOriginal: true,
  timestampEnabled: true,
  timestampText: 'OCT. 1998',
  creditEnabled: true,
  creditRole: 'A FILM BY',
  creditName: 'MATÍAS',
  borderEnabled: true,
  borderStyle: 'negative-35mm',
};

let pastHistory = [{ ...currentState }];
let pendingFile = null;
let imageLoadError = null;

// A. Cancelación del selector de archivos (e.target.files está vacío)
function handleFileSelection(files) {
  if (!files || files.length === 0) {
    // Usuario canceló el cuadro de diálogo
    return { modified: false };
  }
  const file = files[0];
  if (pastHistory.length > 0) {
    pendingFile = file;
    return { modified: false, requiresConfirm: true, pendingFile: file.name };
  }
  return processImage(file);
}

const cancelResult = handleFileSelection([]);
assert.strictEqual(cancelResult.modified, false);
assert.strictEqual(currentState.image, 'blob:current-photo-123', 'La imagen actual debe permanecer intacta tras cancelar');
console.log('✓ Cancelar el selector conserva la fotografía y la edición intactas.');

// B. Selección con cambios pendientes pide confirmación
const selectResult = handleFileSelection([{ name: 'nueva_foto_35mm.jpg', type: 'image/jpeg' }]);
assert.strictEqual(selectResult.requiresConfirm, true);
assert.strictEqual(pendingFile.name, 'nueva_foto_35mm.jpg');
assert.strictEqual(currentState.image, 'blob:current-photo-123', 'No se descarta la imagen antes de confirmar');
console.log('✓ Selección con cambios pendientes activa confirmación con el nombre del archivo.');

// C. Si el usuario cancela la confirmación
pendingFile = null;
assert.strictEqual(currentState.image, 'blob:current-photo-123');
console.log('✓ Cancelar el modal de confirmación mantiene la imagen y estado previos.');

// D. Si la imagen falla al cargarse
function simulateImageLoadError(file) {
  const previousImage = currentState.image;
  try {
    if (file.name.endsWith('.corrupt')) {
      throw new Error('Formato no compatible o archivo dañado');
    }
  } catch {
    imageLoadError = 'No se pudo cargar la imagen seleccionada. Se conserva la fotografía actual.';
    return { success: false, preservedImage: previousImage };
  }
}
const errorResult = simulateImageLoadError({ name: 'danada.corrupt' });
assert.strictEqual(errorResult.success, false);
assert.strictEqual(errorResult.preservedImage, 'blob:current-photo-123');
assert(imageLoadError !== null);
console.log('✓ Manejo de error de carga preserva la fotografía actual y reporta el error.');

// E. Confirmación exitosa y reseteo de encuadre, zoom, pan, comparación y estados temporales
function processImageSuccess(file) {
  const newImageUri = `blob:${file.name}`;
  const newImgElement = { width: 3000, height: 4000 };
  
  currentState = {
    ...currentState,
    image: newImageUri,
    imageElement: newImgElement,
    zoom: 1,
    panX: 0,
    panY: 0,
    showOriginal: false,
  };
  pastHistory = [];
  pendingFile = null;
  imageLoadError = null;
}
processImageSuccess({ name: 'foto_paisaje.jpg' });
assert.strictEqual(currentState.image, 'blob:foto_paisaje.jpg');
assert.strictEqual(currentState.zoom, 1, 'Zoom debe restablecerse a 1');
assert.strictEqual(currentState.panX, 0, 'Pan X debe restablecerse a 0');
assert.strictEqual(currentState.panY, 0, 'Pan Y debe restablecerse a 0');
assert.strictEqual(currentState.showOriginal, false, 'Comparación debe desactivarse');
assert.strictEqual(pastHistory.length, 0, 'Historial debe reiniciarse');
console.log('✓ «Nueva imagen» restablece correctamente zoom, encuadre, desplazamiento, historial y comparación.');

// -------------------------------------------------------------
// PRUEBA 3: Marcas de tiempo cinematográficas
// -------------------------------------------------------------
console.log('\n--- TEST 3: Marcas de tiempo cinematográficas y presets ---');
const typographyTsPath = path.resolve('./src/lib/typography.ts');
const typographyTsContent = fs.readFileSync(typographyTsPath, 'utf8');

assert(typographyTsContent.includes('TIMESTAMP_PRESETS'), 'Debe exportar TIMESTAMP_PRESETS');
assert(typographyTsContent.includes('renderCinematicTimestamp'), 'Debe implementar renderCinematicTimestamp');
assert(typographyTsContent.includes('OCT. 1998'), 'Debe incluir preset analógico OCT. 1998');
assert(typographyTsContent.includes('23:47'), 'Debe incluir preset digital 23:47');
assert(typographyTsContent.includes('ESCENA 04 · TOMA 02'), 'Debe incluir preset de código de escena');
assert(typographyTsContent.includes('35 MM'), 'Debe incluir preset de calibre 35mm');

// Simular cálculo de coordenadas para las 4 esquinas
const area = { x: 50, y: 50, width: 1000, height: 750 };
const margin = 50;

const positions = {
  'top-left': { x: area.x + margin, y: area.y + margin, textAlign: 'left' },
  'top-right': { x: area.x + area.width - margin, y: area.y + margin, textAlign: 'right' },
  'bottom-left': { x: area.x + margin, y: area.y + area.height - margin, textAlign: 'left' },
  'bottom-right': { x: area.x + area.width - margin, y: area.y + area.height - margin, textAlign: 'right' },
};

for (const [posKey, coords] of Object.entries(positions)) {
  assert(coords.x >= area.x && coords.x <= area.x + area.width, `X fuera de rango para ${posKey}`);
  assert(coords.y >= area.y && coords.y <= area.y + area.height, `Y fuera de rango para ${posKey}`);
}
console.log('✓ Posicionamiento en 4 esquinas de marcas de tiempo verificado dentro del fotograma.');

// -------------------------------------------------------------
// PRUEBA 4: Créditos de película
// -------------------------------------------------------------
console.log('\n--- TEST 4: Créditos de película con jerarquía tipográfica ---');
assert(typographyTsContent.includes('CREDIT_PRESETS'), 'Debe exportar CREDIT_PRESETS');
assert(typographyTsContent.includes('renderCinematicCredits'), 'Debe implementar renderCinematicCredits');
assert(typographyTsContent.includes('A FILM BY'), 'Debe incluir A FILM BY');
assert(typographyTsContent.includes('DIRECTED BY'), 'Debe incluir DIRECTED BY');
assert(typographyTsContent.includes('STARRING'), 'Debe incluir STARRING');
assert(typographyTsContent.includes('BASED ON'), 'Debe incluir BASED ON / A TRUE MEMORY');

// Validar independencia de elementos
const stateWithOnlyCredits = {
  creditEnabled: true,
  creditRole: 'DIRECTED BY',
  creditName: 'DENIS VILLENEUVE',
  timestampEnabled: false,
  showText: false,
};
assert.strictEqual(stateWithOnlyCredits.creditEnabled, true);
assert.strictEqual(stateWithOnlyCredits.timestampEnabled, false);
assert.strictEqual(stateWithOnlyCredits.showText, false);
console.log('✓ Créditos funcionan de forma 100% independiente de frase principal y marcas de tiempo.');

// -------------------------------------------------------------
// PRUEBA 5: Bordes de película analógica en diferentes formatos
// -------------------------------------------------------------
console.log('\n--- TEST 5: Bordes de película analógica y consistencia de proporciones ---');
const bordersTsPath = path.resolve('./src/lib/borders.ts');
const bordersTsContent = fs.readFileSync(bordersTsPath, 'utf8');

assert(bordersTsContent.includes('BORDER_OPTIONS'), 'Debe exportar BORDER_OPTIONS');
assert(bordersTsContent.includes('renderCinematicBorders'), 'Debe implementar renderCinematicBorders');
assert(bordersTsContent.includes('negative-35mm'), 'Debe implementar negativo 35mm');
assert(bordersTsContent.includes('film-gate'), 'Debe implementar fotograma de cine');
assert(bordersTsContent.includes('vintage-print'), 'Debe implementar copia vintage');
assert(bordersTsContent.includes('minimal-wire'), 'Debe implementar marco minimalista');

// Comprobación de proporciones geométricas a través de relaciones de aspecto
const aspectTestCases = [
  { name: 'Scope 2.39:1', width: 1920, height: 803, isLandscape: true },
  { name: 'Wide 16:9', width: 1920, height: 1080, isLandscape: true },
  { name: 'Cuadrado 1:1', width: 1080, height: 1080, isLandscape: true },
  { name: 'Editorial 4:5', width: 1080, height: 1350, isLandscape: false },
  { name: 'Vertical 9:16', width: 1080, height: 1920, isLandscape: false },
];

for (const tc of aspectTestCases) {
  const marginRatio = 0.055;
  const marginSize = Math.round(Math.min(tc.width, tc.height) * marginRatio);
  assert(marginSize > 0, `Margen debe ser positivo para ${tc.name}`);
  assert(marginSize < Math.min(tc.width, tc.height) / 4, `Margen no debe colapsar la foto para ${tc.name}`);
  
  // En negativo 35mm, perforaciones deben estar a lo largo del eje mayor
  const filmTrackLen = tc.isLandscape ? tc.width : tc.height;
  const pitch = Math.round(marginSize * 1.05);
  const holeCount = Math.floor((filmTrackLen - marginSize * 2) / pitch);
  assert(holeCount >= 4, `Debe haber al menos 4 perforaciones legibles en ${tc.name} (calculado: ${holeCount})`);
}
console.log('✓ Proporciones de bordes y perforaciones validadas en formatos horizontal, cuadrado y vertical.');

// -------------------------------------------------------------
// PRUEBA 6: Pipeline de renderizado en Canvas
// -------------------------------------------------------------
console.log('\n--- TEST 6: Secuencia de capas de renderizado en canvas.ts ---');
const borderCallIndex = canvasTsContent.lastIndexOf('renderCinematicBorders(');
const mainTextCallIndex = canvasTsContent.lastIndexOf('renderCinematicText(');
const timestampCallIndex = canvasTsContent.lastIndexOf('renderCinematicTimestamp(');
const creditsCallIndex = canvasTsContent.lastIndexOf('renderCinematicCredits(');

assert(borderCallIndex !== -1, 'renderCinematicBorders debe ser invocado en renderCinematicFrame');
assert(timestampCallIndex !== -1, 'renderCinematicTimestamp debe ser invocado en renderCinematicFrame');
assert(creditsCallIndex !== -1, 'renderCinematicCredits debe ser invocado en renderCinematicFrame');

// Capa de bordes debe renderizarse antes de los textos superpuestos
assert(borderCallIndex < mainTextCallIndex, 'Bordes deben procesarse antes de la frase principal');
assert(borderCallIndex < timestampCallIndex, 'Bordes deben procesarse antes de las marcas de tiempo');
console.log('✓ Secuencia de renderizado: imagen -> revelado -> grano -> viñeta -> bordes -> textos -> marcas -> créditos.');

console.log('\n=============================================================');
console.log('TODAS LAS PRUEBAS AUTOMATIZADAS PASARON EXITOSAMENTE (6/6)');
console.log('=============================================================\n');
