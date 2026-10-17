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
export type TextFont =
  | 'serif'
  | 'sans'
  | 'mono'
  | 'type-machine'
  | 'elegant-typewriter'
  | 'courier-prime'
  | 'montserrat';

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

  // --- Text Background (Banda translúcida) ---
  textBackground?: boolean;
  textBackgroundColor?: string;
  textBackgroundOpacity?: number; // 15..85 %
  textBackgroundRadius?: number;  // Corner radius in px
  textBackgroundPaddingX?: number; // Horizontal padding in px
  textBackgroundPaddingY?: number; // Vertical padding in px

  // --- Image Framing & Geometry ---
  zoom: number;
  positionX: number;
  positionY: number;
  format: AspectFormat;
  fitMode: FitMode;
  letterbox: boolean;

  // --- Color & Effects ---
  exposure?: number;
  contrast: number;
  saturation: number;
  temperature: number;
  highlights: number;
  shadows?: number;
  grain: number;
  vignette: number;
  preset: Preset;
  presetIntensity?: number; // 0..100

  // --- Composition Templates ---
  template?: TemplateId;
}

export type TemplateId =
  | 'THE_QUOTE'
  | 'THE_SUBTITLE'
  | 'THE_OPENING'
  | 'THE_DIARY'
  | 'THE_MINIMAL'
  | 'CUSTOM';

/** Typography and layout values a composition template controls */
export type TemplateValues = Pick<
  EditorState,
  | 'textType'
  | 'textFont'
  | 'textAlign'
  | 'textColor'
  | 'textSize'
  | 'textHorizontalPosition'
  | 'textVerticalPosition'
  | 'textOpacity'
  | 'textShadow'
  | 'showAuthor'
  | 'textBackground'
  | 'textBackgroundColor'
  | 'textBackgroundOpacity'
  | 'textBackgroundRadius'
  | 'textBackgroundPaddingX'
  | 'textBackgroundPaddingY'
>;

export type Preset =
  | 'ORIGINAL'
  | 'FILM_35MM'
  | 'GOLDEN_HOUR'
  | 'BLUE_HOUR'
  | 'NOIR'
  | 'DREAMY'
  | 'INDIE'
  | 'AFTER_HOURS'
  | 'CINEMA'
  | 'VINTAGE'
  | 'CUSTOM';

/** Values a preset controls. */
export type PresetValues = Pick<
  EditorState,
  'contrast' | 'saturation' | 'temperature' | 'highlights' | 'grain' | 'vignette'
> & {
  exposure?: number;
  shadows?: number;
};
