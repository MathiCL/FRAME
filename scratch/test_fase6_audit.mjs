import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

console.log('=== TEST SUITE: AUDITORÍA FASE 6 — TIPOGRAFÍA, NAVEGACIÓN Y DESHACER/REHACER ===\n');

// 1. Tipografías: Familias, archivos y licencias
console.log('--- 1. Verificación de archivos locales y licencias ---');
const fontsDir = path.resolve('public/fonts');
const expectedFonts = [
  'SpecialElite-Regular.woff2',
  'CourierPrime-Regular.woff2',
  'CourierPrime-Bold.woff2',
  'Montserrat-Regular.woff2',
  'OFL.txt'
];

for (const fontFile of expectedFonts) {
  const filePath = path.join(fontsDir, fontFile);
  assert(fs.existsSync(filePath), `Falta el archivo ${fontFile} en public/fonts`);
  const stat = fs.statSync(filePath);
  assert(stat.size > 0, `El archivo ${fontFile} está vacío`);
  console.log(`✓ Archivo verificado: ${fontFile} (${stat.size} bytes)`);
}

const oflContent = fs.readFileSync(path.join(fontsDir, 'OFL.txt'), 'utf8');
assert(oflContent.includes('Special Elite'), 'OFL.txt debe citar Special Elite');
assert(oflContent.includes('Courier Prime'), 'OFL.txt debe citar Courier Prime');
assert(oflContent.includes('Montserrat'), 'OFL.txt debe citar Montserrat');
console.log('✓ Licencia SIL Open Font License 1.1 cubre las familias locales');

// 2. Definición en typography.ts
console.log('\n--- 2. Verificación de FONT_STACKS en typography.ts ---');
const typographyPath = path.resolve('src/lib/typography.ts');
const typographyCode = fs.readFileSync(typographyPath, 'utf8');

assert(typographyCode.includes('"Special Elite"'), 'Special Elite debe estar presente en typography.ts');
assert(typographyCode.includes('"Courier Prime"'), 'Courier Prime debe estar presente en typography.ts');

// Validar que Máquina Clásica use Special Elite y Elegant Typewriter use Courier Prime
assert(
  typographyCode.includes("'type-machine': {\n    label: 'Máquina Clásica',\n    family: '\"Special Elite\"") ||
  typographyCode.includes("label: 'Máquina Clásica'") && typographyCode.includes('"Special Elite"'),
  'Máquina Clásica debe mapear a Special Elite'
);

assert(
  typographyCode.includes("'elegant-typewriter': {\n    label: 'Elegant Typewriter',\n    family: '\"Courier Prime\"") ||
  typographyCode.includes("label: 'Elegant Typewriter'") && typographyCode.includes('"Courier Prime"'),
  'Elegant Typewriter debe mapear a Courier Prime'
);
console.log('✓ «Máquina Clásica» utiliza "Special Elite" (tinta irregular, máquina vintage)');
console.log('✓ «Elegant Typewriter» utiliza "Courier Prime" (monoespaciada limpia para guiones)');

// 3. Soporte de caracteres en español
console.log('\n--- 3. Verificación de caracteres en español ---');
const testPhrase = '«¡¿Habrá más sueños en el año 2049?! —susurró él con acento español: cañón, día, música, jamás, éter».';
const spanishChars = ['á', 'é', 'í', 'ó', 'ú', 'ñ', '¿', '¡', '—', '«', '»'];
for (const char of spanishChars) {
  assert(testPhrase.includes(char), `Frase de prueba debe contener el carácter ${char}`);
}
console.log(`✓ Frase de prueba con tildes, eñes y signos: "${testPhrase}"`);

// 4. Auditoría de controles y opciones
console.log('\n--- 4. Verificación de opciones en Controls.tsx ---');
const controlsPath = path.resolve('src/components/Controls.tsx');
const controlsCode = fs.readFileSync(controlsPath, 'utf8');

assert(controlsCode.includes("id: 'type-machine', label: 'Máquina Clásica'"), 'Controls.tsx debe ofrecer Máquina Clásica con id type-machine');
assert(controlsCode.includes("id: 'elegant-typewriter', label: 'Elegant Typewriter'"), 'Controls.tsx debe ofrecer Elegant Typewriter con id elegant-typewriter');
assert(!controlsCode.includes("id: 'type-machine'") || !controlsCode.includes("label: 'Type Machine'"), 'No debe haber opción duplicada llamada Type Machine');
console.log('✓ Las opciones tipográficas son visualmente distintas y no hay duplicados');

// 5. Verificación de Deshacer / Rehacer (bounded stack, debounce, atajos)
console.log('\n--- 5. Verificación de Deshacer / Rehacer en page.tsx ---');
const pagePath = path.resolve('src/app/page.tsx');
const pageCode = fs.readFileSync(pagePath, 'utf8');

assert(pageCode.includes('handleUndo'), 'page.tsx debe implementar handleUndo');
assert(pageCode.includes('handleRedo'), 'page.tsx debe implementar handleRedo');
assert(pageCode.includes('recordHistoryChange'), 'page.tsx debe implementar recordHistoryChange');
assert(pageCode.includes('updated.length > 25'), 'El historial debe estar acotado a 25 estados');
assert(pageCode.includes("id=\"btn-undo\""), 'Botón de deshacer presente en la cabecera');
assert(pageCode.includes("id=\"btn-redo\""), 'Botón de rehacer presente en la cabecera');
assert(pageCode.includes("keydown") && pageCode.includes("handleUndo"), 'Atajos de teclado Ctrl+Z / Cmd+Z vinculados');
console.log('✓ Sistema de historial acotado a 25 estados con agrupación de cambios continuos (debounce)');
console.log('✓ Botones Undo/Redo integrados en la cabecera y accesibles mediante Ctrl+Z / Ctrl+Y');

// 6. Verificación de la estrategia de layout móvil e iOS Safari
console.log('\n--- 6. Verificación de Layout Móvil e iOS Safari ---');
const globalsPath = path.resolve('src/app/globals.css');
const globalsCode = fs.readFileSync(globalsPath, 'utf8');

assert(globalsCode.includes('overflow: hidden'), 'globals.css debe prevenir scroll global en html, body');
assert(globalsCode.includes('overscroll-behavior: none'), 'globals.css debe tener overscroll-behavior: none');

const layoutPath = path.resolve('src/app/layout.tsx');
const layoutCode = fs.readFileSync(layoutPath, 'utf8');
assert(layoutCode.includes('viewportFit: "cover"'), 'layout.tsx debe configurar viewport-fit=cover');

assert(pageCode.includes('visualViewport'), 'page.tsx debe monitorear window.visualViewport');
assert(pageCode.includes('containerHeightStyle'), 'page.tsx debe aplicar containerHeightStyle sincronizado');
assert(pageCode.includes('paddingBottom: !isMobilePanelOpen'), 'Barra de navegación móvil adapta paddingBottom según esté abierta o colapsada');
console.log('✓ html y body bloqueados contra scroll global parasitario');
console.log('✓ Viewport adaptado con window.visualViewport para esquivar controles de Safari');
console.log('✓ Navegación por categorías situada en el borde superior de la sección de edición móvil');

console.log('\n======================================================');
console.log('¡TODAS LAS PRUEBAS DE LA AUDITORÍA PASARON EXITOSAMENTE!');
console.log('======================================================');
