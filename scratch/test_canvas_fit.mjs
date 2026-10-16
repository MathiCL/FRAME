function computeCanvasFit(availWidth, availHeight, frameRatio) {
  if (availWidth <= 0 || availHeight <= 0 || frameRatio <= 0) {
    return { width: '100%', height: '100%' };
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

// Test cases for mobile viewport 390x844:
// When panel is expanded, canvas container height is ~380px, width is 374px (with 16px padding)
const testRatios = [
  { name: 'Scope 2.39:1', ratio: 2.39 },
  { name: 'Wide 16:9', ratio: 16 / 9 },
  { name: 'Square 1:1', ratio: 1 },
  { name: 'Editorial 4:5', ratio: 4 / 5 },
  { name: 'Vertical 9:16', ratio: 9 / 16 },
];

console.log('--- TEST MOBILE EXPANDED (374w x 380h) ---');
for (const t of testRatios) {
  const fit = computeCanvasFit(374, 380, t.ratio);
  console.log(`${t.name}: ${fit.width}x${fit.height} (fits? w:${fit.width <= 374}, h:${fit.height <= 380})`);
  if (fit.width > 374 || fit.height > 380) throw new Error('Overflowed!');
}

console.log('--- TEST MOBILE COLLAPSED (374w x 720h) ---');
for (const t of testRatios) {
  const fit = computeCanvasFit(374, 720, t.ratio);
  console.log(`${t.name}: ${fit.width}x${fit.height} (fits? w:${fit.width <= 374}, h:${fit.height <= 720})`);
  if (fit.width > 374 || fit.height > 720) throw new Error('Overflowed!');
}

console.log('All canvas fit tests passed!');
