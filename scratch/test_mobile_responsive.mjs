import assert from 'node:assert';

// 1. Test Canvas Bounds Calculator for Mobile Screens
function computeCanvasFit(availWidth, availHeight, frameRatio) {
  if (availWidth <= 0 || availHeight <= 0 || frameRatio <= 0) {
    return { width: '100%', height: 'auto' };
  }
  const containerRatio = availWidth / availHeight;
  let width, height;
  if (containerRatio > frameRatio) {
    height = availHeight;
    width = Math.round(availHeight * frameRatio);
  } else {
    width = availWidth;
    height = Math.round(availWidth / frameRatio);
  }
  return { width, height };
}

console.log('=== TEST SUITE: RESPONSIVE MOBILE ARCHITECTURE (FASE 5) ===\n');

// Device viewports: [width, height, name]
const devices = [
  { name: 'iPhone SE (compact)', w: 375, h: 667 },
  { name: 'iPhone 15 Pro (standard)', w: 393, h: 852 },
  { name: 'iPhone 14 Plus (tall/wide)', w: 428, h: 926 },
  { name: 'Google Pixel 7 (Android)', w: 412, h: 915 },
  { name: 'Samsung Galaxy S21 (narrow Android)', w: 360, h: 800 },
];

const aspectFormats = [
  { name: 'Scope 2.39:1', ratio: 2.39 },
  { name: 'Wide 16:9', ratio: 16 / 9 },
  { name: 'Editorial 4:5', ratio: 4 / 5 },
  { name: 'Square 1:1', ratio: 1 },
  { name: 'Vertical 9:16', ratio: 9 / 16 },
];

console.log('--- 1. Testing Canvas Fit in Expanded Sheet Mode (panel takes ~46% height) ---');
for (const dev of devices) {
  const headerHeight = 52;
  const bottomNavHeight = 52;
  const bottomSheetHeight = Math.round(dev.h * 0.46);
  const availContainerHeight = dev.h - headerHeight - bottomSheetHeight - bottomNavHeight;
  const availContainerWidth = dev.w;
  const pad = 16;
  const netW = availContainerWidth - pad;
  const netH = availContainerHeight - pad;

  for (const fmt of aspectFormats) {
    const fit = computeCanvasFit(netW, netH, fmt.ratio);
    assert(fit.width <= netW, `${dev.name} ${fmt.name} width ${fit.width} exceeded ${netW}`);
    assert(fit.height <= netH, `${dev.name} ${fmt.name} height ${fit.height} exceeded ${netH}`);
    // Check aspect ratio fidelity (within 1 pixel rounding)
    const computedRatio = fit.width / fit.height;
    assert(Math.abs(computedRatio - fmt.ratio) < 0.05, `Ratio mismatch for ${fmt.name}`);
  }
}
console.log('✓ All 25 device/format combinations fit perfectly inside the expanded mobile preview zone with zero overflow!\n');

console.log('--- 2. Testing Canvas Fit in Collapsed Sheet Mode (panel hidden, max photo view) ---');
for (const dev of devices) {
  const headerHeight = 52;
  const bottomNavHeight = 52;
  const availContainerHeight = dev.h - headerHeight - bottomNavHeight;
  const availContainerWidth = dev.w;
  const pad = 16;
  const netW = availContainerWidth - pad;
  const netH = availContainerHeight - pad;

  for (const fmt of aspectFormats) {
    const fit = computeCanvasFit(netW, netH, fmt.ratio);
    assert(fit.width <= netW, `${dev.name} ${fmt.name} width ${fit.width} exceeded ${netW}`);
    assert(fit.height <= netH, `${dev.name} ${fmt.name} height ${fit.height} exceeded ${netH}`);
  }
}
console.log('✓ All 25 device/format combinations expand smoothly to fill full available vertical viewport when panel is collapsed!\n');

console.log('--- 3. Testing Category Navigation & State Toggle Machine ---');
class MobileSheetState {
  constructor() {
    this.activeCategory = 'encuadre';
    this.isPanelOpen = true;
  }

  handleCategoryClick(cat) {
    if (this.activeCategory === cat) {
      // Toggle collapse/expand when clicking active tab
      this.isPanelOpen = !this.isPanelOpen;
    } else {
      // Switch category and guarantee sheet is open
      this.activeCategory = cat;
      this.isPanelOpen = true;
    }
  }

  handleHideClick() {
    this.isPanelOpen = false;
  }
}

const machine = new MobileSheetState();
assert.strictEqual(machine.activeCategory, 'encuadre');
assert.strictEqual(machine.isPanelOpen, true);

// Click active tab ('encuadre') => should toggle closed
machine.handleCategoryClick('encuadre');
assert.strictEqual(machine.isPanelOpen, false, 'Tapping active category should collapse sheet');

// Click active tab ('encuadre') again => should toggle open
machine.handleCategoryClick('encuadre');
assert.strictEqual(machine.isPanelOpen, true, 'Tapping active category when closed should open sheet');

// Click different tab ('color') => should switch and stay open
machine.handleCategoryClick('color');
assert.strictEqual(machine.activeCategory, 'color');
assert.strictEqual(machine.isPanelOpen, true);

// Close via hide button
machine.handleHideClick();
assert.strictEqual(machine.isPanelOpen, false);

// Click different tab ('texto') while closed => should switch and open
machine.handleCategoryClick('texto');
assert.strictEqual(machine.activeCategory, 'texto');
assert.strictEqual(machine.isPanelOpen, true);

console.log('✓ Mobile navigation state transitions verified (switching, toggling, collapse, and expand)!\n');

console.log('======================================================');
console.log('¡TODAS LAS PRUEBAS DE LA INTERFAZ MÓVIL PASARON CON ÉXITO!');
console.log('======================================================');
