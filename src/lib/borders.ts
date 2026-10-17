import type { EditorState, BorderStyle } from '@/types/editor';
import type { Rect } from '@/lib/geometry';
import { drawRoundedRect } from '@/lib/typography';

export interface BorderOption {
  id: BorderStyle;
  label: string;
  subtitle: string;
  description: string;
}

export const BORDER_OPTIONS: ReadonlyArray<BorderOption> = [
  {
    id: 'none',
    label: 'Sin borde',
    subtitle: 'Fotograma puro',
    description: 'Composición cinematográfica limpia sin marco decorativo.',
  },
  {
    id: 'negative-35mm',
    label: 'Negativo 35mm',
    subtitle: 'Tira de celuloide',
    description: 'Perforaciones laterales de arrastre y rotulación analógica de película.',
  },
  {
    id: 'film-gate',
    label: 'Fotograma de cine',
    subtitle: 'Ventanilla de cámara',
    description: 'Marco oscuro sobrio con esquinas suavemente redondeadas de proyección.',
  },
  {
    id: 'vintage-print',
    label: 'Impresa vintage',
    subtitle: 'Papel fotográfico',
    description: 'Borde cálido marfil inspirado en copias de laboratorio y fotografía física.',
  },
  {
    id: 'minimal-wire',
    label: 'Marco minimalista',
    subtitle: 'Línea de encuadre',
    description: 'Fino filete geométrico con marcas de registro discretas.',
  },
];

/**
 * Renders decorative analog film borders over the imageArea without distorting
 * or altering the underlying photograph.
 */
export function renderCinematicBorders(
  ctx: CanvasRenderingContext2D,
  area: Rect,
  state: EditorState,
) {
  if (!state.borderEnabled || !state.borderStyle || state.borderStyle === 'none') {
    return;
  }

  ctx.save();
  ctx.globalCompositeOperation = 'source-over';

  const opacity = Math.max(10, Math.min(100, state.borderOpacity ?? 100)) / 100;
  ctx.globalAlpha = opacity;

  switch (state.borderStyle) {
    case 'negative-35mm':
      render35mmNegative(ctx, area, state);
      break;
    case 'film-gate':
      renderFilmGate(ctx, area, state);
      break;
    case 'vintage-print':
      renderVintagePrint(ctx, area, state);
      break;
    case 'minimal-wire':
      renderMinimalWire(ctx, area, state);
      break;
  }

  ctx.restore();
}

/**
 * A. Negativo de 35 mm con perforaciones de arrastre de película
 * y códigos de emulsión/fotograma analógicos.
 */
function render35mmNegative(
  ctx: CanvasRenderingContext2D,
  area: Rect,
  state: EditorState,
) {
  const isLandscapeOrSquare = area.width >= area.height;
  const userWidthPct = (state.borderWidth ?? 5) / 100;
  const bgColor = state.borderColor || '#0A0A0C';

  if (isLandscapeOrSquare) {
    // Tiras en bordes superior e inferior (película horizontal tradicional)
    const bandHeight = Math.max(28, Math.round(area.height * Math.max(0.055, userWidthPct * 1.5)));
    const holeWidth = Math.round(bandHeight * 0.38);
    const holeHeight = Math.round(bandHeight * 0.52);
    const holeRadius = Math.max(2, Math.round(holeWidth * 0.22));
    const step = Math.max(holeWidth * 2.5, Math.round(area.width / Math.max(6, Math.floor(area.width / (holeWidth * 2.4)))));

    // 1. Tira superior
    ctx.fillStyle = bgColor;
    ctx.fillRect(area.x, area.y, area.width, bandHeight);

    // 2. Tira inferior
    ctx.fillRect(area.x, area.y + area.height - bandHeight, area.width, bandHeight);

    // 3. Perforaciones superiores
    const holeTopY = area.y + Math.round((bandHeight - holeHeight) / 2);
    const holeBottomY = area.y + area.height - bandHeight + Math.round((bandHeight - holeHeight) / 2);

    ctx.fillStyle = '#020203';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;

    for (let x = area.x + step / 2; x < area.x + area.width - holeWidth; x += step) {
      // Perforación superior
      ctx.beginPath();
      drawRoundedRect(ctx, Math.round(x), holeTopY, holeWidth, holeHeight, holeRadius);
      ctx.fill();
      ctx.stroke();

      // Perforación inferior
      ctx.beginPath();
      drawRoundedRect(ctx, Math.round(x), holeBottomY, holeWidth, holeHeight, holeRadius);
      ctx.fill();
      ctx.stroke();
    }

    // 4. Rotulación analógica entre perforaciones
    const fontSize = Math.max(9, Math.round(bandHeight * 0.22));
    ctx.font = `600 ${fontSize}px "Courier Prime", "Special Elite", monospace`;
    ctx.fillStyle = '#E8A735'; // Típico ámbar analógico Kodak/Eastman
    ctx.textBaseline = 'middle';

    const markingsTop = ['KODAK 400', 'SAFETY FILM', 'EASTMAN 5219', '▶ 24A', 'FRAME 35MM', '▲ 25'];
    let topMarkIdx = 0;
    for (let x = area.x + step; x < area.x + area.width - step; x += step * 2) {
      const text = markingsTop[topMarkIdx % markingsTop.length];
      ctx.fillText(text, Math.round(x + holeWidth * 0.8), area.y + Math.round(bandHeight * 0.5));
      topMarkIdx++;
    }

    const markingsBottom = ['▶ 24', '● ●', '35 MM', '▶ 25A', 'EXPOSURE 24', 'FILM LAB'];
    let btmMarkIdx = 0;
    for (let x = area.x + step; x < area.x + area.width - step; x += step * 2) {
      const text = markingsBottom[btmMarkIdx % markingsBottom.length];
      ctx.fillText(text, Math.round(x + holeWidth * 0.8), area.y + area.height - Math.round(bandHeight * 0.5));
      btmMarkIdx++;
    }
  } else {
    // Tiras en bordes izquierdo y derecho (película en formato vertical 9:16 o 4:5)
    const bandWidth = Math.max(28, Math.round(area.width * Math.max(0.065, userWidthPct * 1.5)));
    const holeWidth = Math.round(bandWidth * 0.52);
    const holeHeight = Math.round(bandWidth * 0.38);
    const holeRadius = Math.max(2, Math.round(holeHeight * 0.22));
    const step = Math.max(holeHeight * 2.5, Math.round(area.height / Math.max(6, Math.floor(area.height / (holeHeight * 2.4)))));

    // 1. Tira izquierda
    ctx.fillStyle = bgColor;
    ctx.fillRect(area.x, area.y, bandWidth, area.height);

    // 2. Tira derecha
    ctx.fillRect(area.x + area.width - bandWidth, area.y, bandWidth, area.height);

    // 3. Perforaciones
    const holeLeftX = area.x + Math.round((bandWidth - holeWidth) / 2);
    const holeRightX = area.x + area.width - bandWidth + Math.round((bandWidth - holeWidth) / 2);

    ctx.fillStyle = '#020203';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;

    for (let y = area.y + step / 2; y < area.y + area.height - holeHeight; y += step) {
      // Perforación izquierda
      ctx.beginPath();
      drawRoundedRect(ctx, holeLeftX, Math.round(y), holeWidth, holeHeight, holeRadius);
      ctx.fill();
      ctx.stroke();

      // Perforación derecha
      ctx.beginPath();
      drawRoundedRect(ctx, holeRightX, Math.round(y), holeWidth, holeHeight, holeRadius);
      ctx.fill();
      ctx.stroke();
    }

    // 4. Rotulación vertical sutil
    const fontSize = Math.max(8, Math.round(bandWidth * 0.18));
    ctx.font = `600 ${fontSize}px "Courier Prime", monospace`;
    ctx.fillStyle = '#E8A735';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';

    let markIdx = 12;
    for (let y = area.y + step; y < area.y + area.height - step; y += step * 3) {
      ctx.save();
      ctx.translate(area.x + Math.round(bandWidth * 0.5), Math.round(y + holeHeight));
      ctx.rotate(-Math.PI / 2);
      ctx.fillText(`35MM · ${markIdx}A`, 0, 0);
      ctx.restore();
      markIdx++;
    }
  }
}

/**
 * B. Borde de fotograma cinematográfico con ventanilla de cámara suavizada
 */
function renderFilmGate(
  ctx: CanvasRenderingContext2D,
  area: Rect,
  state: EditorState,
) {
  const userPct = (state.borderWidth ?? 4) / 100;
  const margin = Math.max(16, Math.round(Math.min(area.width, area.height) * userPct));
  const cornerRadius = Math.max(10, Math.round(margin * 0.9));
  const bgColor = state.borderColor || '#070709';

  const innerX = area.x + margin;
  const innerY = area.y + margin;
  const innerW = area.width - margin * 2;
  const innerH = area.height - margin * 2;

  if (innerW <= 0 || innerH <= 0) return;

  // Dibujar máscara perimetral con recorte de esquinas redondeadas (even-odd fill)
  ctx.save();
  ctx.fillStyle = bgColor;
  ctx.beginPath();
  // Rectángulo exterior
  ctx.rect(area.x, area.y, area.width, area.height);
  // Ventana interior con esquinas suavizadas (en sentido inverso)
  drawRoundedRect(ctx, innerX, innerY, innerW, innerH, cornerRadius);
  ctx.fill('evenodd');

  // Bisel fino interior para aspecto metálico de ventanilla de cámara
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  drawRoundedRect(ctx, innerX, innerY, innerW, innerH, cornerRadius);
  ctx.stroke();

  ctx.restore();
}

/**
 * C. Fotografía impresa vintage con marco de papel cálido
 */
function renderVintagePrint(
  ctx: CanvasRenderingContext2D,
  area: Rect,
  state: EditorState,
) {
  const userPct = (state.borderWidth ?? 4) / 100;
  const margin = Math.max(14, Math.round(Math.min(area.width, area.height) * userPct));
  const bottomMargin = Math.round(margin * 1.35); // Borde inferior tradicionalmente más amplio
  const paperColor = state.borderColor || '#F4EFE6';

  const innerX = area.x + margin;
  const innerY = area.y + margin;
  const innerW = area.width - margin * 2;
  const innerH = area.height - margin - bottomMargin;

  if (innerW <= 0 || innerH <= 0) return;

  ctx.save();
  ctx.fillStyle = paperColor;

  // Cuatro bandas de papel fotográfico
  ctx.fillRect(area.x, area.y, area.width, margin); // Arriba
  ctx.fillRect(area.x, area.y + area.height - bottomMargin, area.width, bottomMargin); // Abajo
  ctx.fillRect(area.x, area.y + margin, margin, innerH); // Izquierda
  ctx.fillRect(area.x + area.width - margin, area.y + margin, margin, innerH); // Derecha

  // Línea de separación sutil entre emulsión y papel
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.16)';
  ctx.lineWidth = 1;
  ctx.strokeRect(innerX, innerY, innerW, innerH);

  ctx.restore();
}

/**
 * D. Marco analógico minimalista con fino filete interior y marcas de registro
 */
function renderMinimalWire(
  ctx: CanvasRenderingContext2D,
  area: Rect,
  state: EditorState,
) {
  const userPct = (state.borderWidth ?? 4) / 100;
  const margin = Math.max(12, Math.round(Math.min(area.width, area.height) * userPct));
  const wireColor = state.borderColor || '#F4EFE6';

  const innerX = area.x + margin;
  const innerY = area.y + margin;
  const innerW = area.width - margin * 2;
  const innerH = area.height - margin * 2;

  if (innerW <= 0 || innerH <= 0) return;

  ctx.save();
  ctx.strokeStyle = wireColor;
  ctx.lineWidth = Math.max(1, Math.round(Math.min(area.width, area.height) * 0.0012));

  // Filete rectangular
  ctx.strokeRect(innerX, innerY, innerW, innerH);

  // Cruces de registro o esquineros cinematográficos
  const tick = Math.max(6, Math.round(margin * 0.45));
  ctx.beginPath();
  // Esquina superior izquierda
  ctx.moveTo(innerX - tick, innerY); ctx.lineTo(innerX + tick, innerY);
  ctx.moveTo(innerX, innerY - tick); ctx.lineTo(innerX, innerY + tick);

  // Esquina superior derecha
  ctx.moveTo(innerX + innerW - tick, innerY); ctx.lineTo(innerX + innerW + tick, innerY);
  ctx.moveTo(innerX + innerW, innerY - tick); ctx.lineTo(innerX + innerW, innerY + tick);

  // Esquina inferior izquierda
  ctx.moveTo(innerX - tick, innerY + innerH); ctx.lineTo(innerX + tick, innerY + innerH);
  ctx.moveTo(innerX, innerY + innerH - tick); ctx.lineTo(innerX, innerY + innerH + tick);

  // Esquina inferior derecha
  ctx.moveTo(innerX + innerW - tick, innerY + innerH); ctx.lineTo(innerX + innerW + tick, innerY + innerH);
  ctx.moveTo(innerX + innerW, innerY + innerH - tick); ctx.lineTo(innerX + innerW, innerY + innerH + tick);
  ctx.stroke();

  ctx.restore();
}
