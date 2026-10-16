import type { EditorState, TextFont } from '@/types/editor';
import type { Rect } from '@/lib/geometry';

/** Reliable typography stacks with standard font names recognized by HTML5 Canvas */
export const FONT_STACKS: Record<TextFont, { label: string; family: string }> = {
  serif: {
    label: 'Serif Editorial',
    family: 'Georgia, "Times New Roman", Times, "Playfair Display", serif',
  },
  sans: {
    label: 'Sans Cinematográfico',
    family: '"Geist", Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  mono: {
    label: 'Monospace Subtítulo',
    family: '"Geist Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  },
};

/** Curated cinematic color palette */
export const CINEMATIC_TEXT_COLORS: ReadonlyArray<{ id: string; label: string; value: string }> = [
  { id: 'warm-white', label: 'Marfil / Cálido', value: '#F4EFE6' },
  { id: 'pure-white', label: 'Blanco Puro', value: '#FFFFFF' },
  { id: 'sub-yellow', label: 'Amarillo Cine', value: '#FDE047' },
  { id: 'sand-gold', label: 'Arena / Dorado', value: '#E2D3B8' },
];

export interface TextLine {
  text: string;
  width: number;
}

export interface PreparedTextLayout {
  mainLines: TextLine[];
  authorLines: TextLine[];
  fontSize: number;
  lineHeight: number;
  authorFontSize: number;
  authorLineHeight: number;
  totalHeight: number;
  startX: number;
  startY: number;
  textAlign: CanvasTextAlign;
  safeArea: Rect;
}

/**
 * Splits text into lines fitting within `maxWidth` using actual canvas context metrics.
 * Handles explicit `\n` newlines, preserves word boundaries, and cleanly breaks
 * abnormally long words without overflowing the line.
 */
export function wrapTextWithMetrics(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): TextLine[] {
  if (!text || text.trim() === '') return [];

  const paragraphs = text.split('\n');
  const resultLines: TextLine[] = [];

  for (const paragraph of paragraphs) {
    const trimmedPara = paragraph.trim();
    if (trimmedPara === '') {
      resultLines.push({ text: '', width: 0 });
      continue;
    }

    const words = trimmedPara.split(/\s+/);
    let currentLine = '';

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const wordWidth = ctx.measureText(word).width;

      // Handle exceptionally long words that exceed maxWidth by themselves
      if (wordWidth > maxWidth) {
        if (currentLine.length > 0) {
          resultLines.push({
            text: currentLine,
            width: ctx.measureText(currentLine).width,
          });
          currentLine = '';
        }

        // Break word into chunks fitting within maxWidth
        let chunk = '';
        for (const char of word) {
          const testChunk = chunk + char;
          if (ctx.measureText(testChunk + '-').width > maxWidth && chunk.length > 0) {
            resultLines.push({
              text: chunk + '-',
              width: ctx.measureText(chunk + '-').width,
            });
            chunk = char;
          } else {
            chunk = testChunk;
          }
        }
        currentLine = chunk;
        continue;
      }

      const testLine = currentLine.length === 0 ? word : `${currentLine} ${word}`;
      const testWidth = ctx.measureText(testLine).width;

      if (testWidth <= maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine.length > 0) {
          resultLines.push({
            text: currentLine,
            width: ctx.measureText(currentLine).width,
          });
        }
        currentLine = word;
      }
    }

    if (currentLine.length > 0) {
      resultLines.push({
        text: currentLine,
        width: ctx.measureText(currentLine).width,
      });
    }
  }

  return resultLines;
}

/**
 * Calculates the complete layout, safe margins, and line positions for
 * the quote/subtitle and its optional attribution block.
 */
export function calculateTextLayout(
  ctx: CanvasRenderingContext2D,
  area: Rect,
  state: EditorState,
): PreparedTextLayout | null {
  if (!state.showText || !state.text || state.text.trim() === '') {
    return null;
  }

  const isQuote = state.textType === 'quote';

  // Safe margins inside imageArea (7% horizontal, 5% vertical)
  const safeMarginX = Math.round(area.width * 0.07);
  const safeMarginY = Math.round(area.height * 0.05);

  const safeArea: Rect = {
    x: area.x + safeMarginX,
    y: area.y + safeMarginY,
    width: Math.max(10, area.width - safeMarginX * 2),
    height: Math.max(10, area.height - safeMarginY * 2),
  };

  // Dimension-aware scale factor:
  // Balances typography across horizontal, square, and vertical orientations
  const baseDim = area.width >= area.height ? area.width : area.height * 0.72;
  const userScale = state.textSize ?? 35;
  const fontSize = Math.max(16, Math.round((baseDim * userScale) / (isQuote ? 1150 : 1300)));
  const lineHeight = Math.round(fontSize * (isQuote ? 1.45 : 1.35));

  const fontFamily = FONT_STACKS[state.textFont]?.family || FONT_STACKS.serif.family;
  const fontStyle = isQuote ? 'italic' : 'normal';
  const fontWeight = isQuote ? '400' : '600';

  ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;

  // Wrap main text lines
  const mainLines = wrapTextWithMetrics(ctx, state.text, safeArea.width);

  // Wrap author/attribution lines if enabled and non-empty
  let authorLines: TextLine[] = [];
  const authorFontSize = Math.max(13, Math.round(fontSize * 0.64));
  const authorLineHeight = Math.round(authorFontSize * 1.4);

  const hasAuthor = Boolean(
    state.showAuthor &&
    state.textAuthor &&
    state.textAuthor.trim() !== ''
  );

  if (hasAuthor) {
    ctx.font = `normal 400 ${authorFontSize}px ${fontFamily}`;
    const authorPrefix = isQuote ? '— ' : '';
    authorLines = wrapTextWithMetrics(ctx, `${authorPrefix}${state.textAuthor.trim()}`, safeArea.width);
  }

  // Calculate total block height
  const mainHeight = mainLines.length * lineHeight;
  const authorSpacing = authorLines.length > 0 ? Math.round(fontSize * 0.55) : 0;
  const authorHeight = authorLines.length > 0 ? authorLines.length * authorLineHeight + authorSpacing : 0;
  const totalHeight = mainHeight + authorHeight;

  // Vertical position calculation with safe margins clamp:
  // Quotes anchor at center by default; Subtitles anchor at bottom baseline
  const vPos = state.textVerticalPosition ?? (isQuote ? 60 : 84);
  const targetY = area.y + (area.height * vPos) / 100;
  const minTop = safeArea.y;
  const maxBottom = safeArea.y + safeArea.height;

  let startY: number;
  if (totalHeight >= safeArea.height) {
    startY = minTop;
  } else if (isQuote) {
    // Quote: target center
    const rawTop = targetY - totalHeight / 2;
    startY = Math.max(minTop, Math.min(maxBottom - totalHeight, rawTop));
  } else {
    // Subtitle: target baseline (anchor bottom)
    const rawTop = targetY - totalHeight;
    startY = Math.max(minTop, Math.min(maxBottom - totalHeight, rawTop));
  }

  // Horizontal position calculation
  const hPos = state.textHorizontalPosition ?? 50;
  const textAlign = state.textAlign ?? 'center';
  let startX: number;
  let canvasTextAlign: CanvasTextAlign;

  if (textAlign === 'left') {
    canvasTextAlign = 'left';
    const shift = ((hPos - 50) / 100) * (safeArea.width * 0.4);
    startX = Math.max(safeArea.x, Math.min(safeArea.x + safeArea.width * 0.5, safeArea.x + shift));
  } else if (textAlign === 'right') {
    canvasTextAlign = 'right';
    const shift = ((hPos - 50) / 100) * (safeArea.width * 0.4);
    startX = Math.max(safeArea.x + safeArea.width * 0.5, Math.min(safeArea.x + safeArea.width, safeArea.x + safeArea.width + shift));
  } else {
    canvasTextAlign = 'center';
    const posX = safeArea.x + (safeArea.width * hPos) / 100;
    startX = Math.max(safeArea.x + 20, Math.min(safeArea.x + safeArea.width - 20, posX));
  }

  return {
    mainLines,
    authorLines,
    fontSize,
    lineHeight,
    authorFontSize,
    authorLineHeight,
    totalHeight,
    startX,
    startY,
    textAlign: canvasTextAlign,
    safeArea,
  };
}

/**
 * Renders the formatted text block onto the canvas context.
 */
export function renderCinematicText(
  ctx: CanvasRenderingContext2D,
  area: Rect,
  state: EditorState,
) {
  const layout = calculateTextLayout(ctx, area, state);
  if (!layout) return;

  const isQuote = state.textType === 'quote';
  const fontFamily = FONT_STACKS[state.textFont]?.family || FONT_STACKS.serif.family;
  const color = state.textColor || (isQuote ? '#F4EFE6' : '#FFFFFF');
  const alpha = Math.max(0, Math.min(100, state.textOpacity ?? 100)) / 100;
  const shadowEnabled = state.textShadow ?? true;

  ctx.save();
  ctx.textAlign = layout.textAlign;
  ctx.textBaseline = 'top';

  const fontStyle = isQuote ? 'italic' : 'normal';
  const fontWeight = isQuote ? '400' : '600';
  ctx.font = `${fontStyle} ${fontWeight} ${layout.fontSize}px ${fontFamily}`;

  // 1. Draw outline stroke first if subtitle has shadow/contrast enabled
  if (!isQuote && shadowEnabled) {
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.9)';
    ctx.lineWidth = Math.max(3, Math.round(layout.fontSize * 0.09));
    ctx.lineJoin = 'round';
    ctx.shadowColor = 'transparent';

    let strokeY = layout.startY;
    for (const line of layout.mainLines) {
      if (line.text.length > 0) {
        ctx.strokeText(line.text, layout.startX, strokeY);
      }
      strokeY += layout.lineHeight;
    }
    ctx.restore();
  }

  // 2. Configure fill shadow
  if (shadowEnabled) {
    if (isQuote) {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
      ctx.shadowBlur = Math.round(layout.fontSize * 0.16);
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = Math.round(layout.fontSize * 0.06);
    } else {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
      ctx.shadowBlur = Math.round(layout.fontSize * 0.08);
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = Math.round(layout.fontSize * 0.04);
    }
  } else {
    ctx.shadowColor = 'transparent';
  }

  // 3. Draw Main Lines
  ctx.fillStyle = color;
  ctx.globalAlpha = alpha;

  let currentY = layout.startY;
  for (const line of layout.mainLines) {
    if (line.text.length > 0) {
      ctx.fillText(line.text, layout.startX, currentY);
    }
    currentY += layout.lineHeight;
  }

  // 4. Draw Attribution / Film Title Lines if present
  if (layout.authorLines.length > 0) {
    currentY += Math.round(layout.fontSize * 0.55);

    ctx.font = `normal 400 ${layout.authorFontSize}px ${fontFamily}`;
    ctx.fillStyle = isQuote ? '#D6CAB7' : color;
    ctx.globalAlpha = alpha * 0.88;

    if (!isQuote && shadowEnabled) {
      ctx.save();
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.9)';
      ctx.lineWidth = Math.max(2, Math.round(layout.authorFontSize * 0.08));
      ctx.lineJoin = 'round';
      ctx.shadowColor = 'transparent';
      let strokeAuthorY = currentY;
      for (const line of layout.authorLines) {
        if (line.text.length > 0) {
          ctx.strokeText(line.text, layout.startX, strokeAuthorY);
        }
        strokeAuthorY += layout.authorLineHeight;
      }
      ctx.restore();
    }

    for (const line of layout.authorLines) {
      if (line.text.length > 0) {
        ctx.fillText(line.text, layout.startX, currentY);
      }
      currentY += layout.authorLineHeight;
    }
  }

  ctx.restore();
}
