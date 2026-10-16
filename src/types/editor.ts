/** Output aspect ratio. 'original' keeps the photo's own proportion (no forced crop). */
export type AspectFormat = 'original' | '2.39:1' | '16:9' | '4:5' | '1:1' | '9:16';

/**
 * How the photo is placed inside the image area:
 * - 'fit'  (Ajustar): the whole photo is visible, empty space stays black.
 * - 'fill' (Rellenar): the photo covers the area and the excess is cropped.
 */
export type FitMode = 'fit' | 'fill';

/**
 * Cinematographic text styles:
 * - 'quote': Editorial serif, adjustable position, attribution field, warm ivory tones.
 * - 'subtitle': Legible sans-serif/teletext, bottom-anchored, classic movie styling.
 */
export type TextType = 'quote' | 'subtitle';

/** Typography stacks reliably available in browser Canvas. */
export type TextFont = 'serif' | 'sans' | 'mono';

/** Horizontal text alignment. */
export type TextAlign = 'left' | 'center' | 'right';

export interface EditorState {
  image: HTMLImageElement | null;
  // --- Typography & Text ---
  textType: TextType;
  text: string;
  textAuthor: string;
  showAuthor: boolean;
  textFont: TextFont;
  textAlign: TextAlign;
  textColor: string;
  textSize: number;
  textHorizontalPosition: number; // 0..100 (50 is center)
  textVerticalPosition: number;   // 0..100
  textOpacity: number;
  textShadow: boolean;
  showText: boolean;

  // --- Image Framing & Geometry ---
  zoom: number;
  positionX: number;
  positionY: number;
  format: AspectFormat;
  fitMode: FitMode;
  letterbox: boolean;

  // --- Color & Effects ---
  contrast: number;
  saturation: number;
  temperature: number;
  highlights: number;
  grain: number;
  vignette: number;
  preset: Preset;
}

export type Preset = 'CINEMA' | 'INDIE' | 'VINTAGE' | 'CUSTOM';

/** Values a preset controls. */
export type PresetValues = Pick<
  EditorState,
  'contrast' | 'saturation' | 'temperature' | 'highlights' | 'grain' | 'vignette'
>;
