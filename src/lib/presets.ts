import type { Preset, PresetValues } from '@/types/editor';

export interface PresetDefinition {
  id: Preset;
  name: string;
  subtitle: string;
  description: string;
  gradient: string; // CSS gradient for visual gallery swatch
  values: PresetValues;
}

export const CINEMATIC_PRESETS: Record<Exclude<Preset, 'CUSTOM'>, PresetDefinition> = {
  ORIGINAL: {
    id: 'ORIGINAL',
    name: 'Original',
    subtitle: 'Sin procesado',
    description: 'Fotografía pura con valores de revelado neutros.',
    gradient: 'linear-gradient(135deg, #2E2E36 0%, #121215 100%)',
    values: {
      contrast: 0,
      saturation: 0,
      temperature: 0,
      highlights: 0,
      grain: 0,
      vignette: 0,
    },
  },
  FILM_35MM: {
    id: 'FILM_35MM',
    name: '35mm Film',
    subtitle: 'Celuloide analógico',
    description: 'Contraste moderado, colores orgánicos ligeramente cálidos y grano fino.',
    gradient: 'linear-gradient(135deg, #B58D63 0%, #3B281B 100%)',
    values: {
      contrast: 10,
      saturation: -8,
      temperature: 6,
      highlights: -12,
      grain: 12,
      vignette: 8,
    },
  },
  GOLDEN_HOUR: {
    id: 'GOLDEN_HOUR',
    name: 'Golden Hour',
    subtitle: 'Luz dorada',
    description: 'Calidez de atardecer, altas luces sedosas y tonos de piel equilibrados.',
    gradient: 'linear-gradient(135deg, #D49A50 0%, #4D2810 100%)',
    values: {
      contrast: 6,
      saturation: 4,
      temperature: 16,
      highlights: -18,
      grain: 6,
      vignette: 10,
    },
  },
  BLUE_HOUR: {
    id: 'BLUE_HOUR',
    name: 'Blue Hour',
    subtitle: 'Crepúsculo azul',
    description: 'Sombras frías con matices azulados y detalle preservado en bajas luces.',
    gradient: 'linear-gradient(135deg, #4A7A9E 0%, #112030 100%)',
    values: {
      contrast: 4,
      saturation: -10,
      temperature: -18,
      highlights: -8,
      grain: 8,
      vignette: 12,
    },
  },
  NOIR: {
    id: 'NOIR',
    name: 'Noir',
    subtitle: 'Monocromo clásico',
    description: 'Blanco y negro cinematográfico con negros densos y sombras detalladas.',
    gradient: 'linear-gradient(135deg, #E0E0E0 0%, #151515 100%)',
    values: {
      contrast: 22,
      saturation: -100,
      temperature: 0,
      highlights: -10,
      grain: 18,
      vignette: 18,
    },
  },
  DREAMY: {
    id: 'DREAMY',
    name: 'Dreamy',
    subtitle: 'Atmósfera etérea',
    description: 'Contraste suave, saturación contenida y matices delicados con nitidez intacta.',
    gradient: 'linear-gradient(135deg, #D9B3A6 0%, #2F242C 100%)',
    values: {
      contrast: -12,
      saturation: -14,
      temperature: 4,
      highlights: 8,
      grain: 4,
      vignette: 6,
    },
  },
  INDIE: {
    id: 'INDIE',
    name: 'Indie Film',
    subtitle: 'Cine independiente',
    description: 'Colores apagados, tonalidad nostálgica con matiz frío y grano orgánico.',
    gradient: 'linear-gradient(135deg, #6E8C85 0%, #202220 100%)',
    values: {
      contrast: 14,
      saturation: -18,
      temperature: -6,
      highlights: -15,
      grain: 16,
      vignette: 14,
    },
  },
  AFTER_HOURS: {
    id: 'AFTER_HOURS',
    name: 'After Hours',
    subtitle: 'Noche íntima',
    description: 'Sombras profundas, negros densos, iluminación cálida localizada y viñeta suave.',
    gradient: 'linear-gradient(135deg, #7E4B1C 0%, #1F1108 45%, #08070A 100%)',
    values: {
      exposure: -14,
      contrast: 22,
      saturation: -18,
      temperature: 12,
      highlights: 6,
      shadows: -32,
      grain: 6,
      vignette: 34,
    },
  },
  // Backward-compatibility aliases for legacy preset keys
  CINEMA: {
    id: 'CINEMA',
    name: 'Cinema',
    subtitle: 'Tono neutro profundo',
    description: 'Contraste suave, tonos neutros y sombras densas.',
    gradient: 'linear-gradient(135deg, #A89582 0%, #26211D 100%)',
    values: {
      contrast: 8,
      saturation: -5,
      temperature: -2,
      highlights: -8,
      grain: 8,
      vignette: 8,
    },
  },
  VINTAGE: {
    id: 'VINTAGE',
    name: 'Vintage',
    subtitle: 'Calidez analógica',
    description: 'Emulsión analógica cálida con grano pronunciado.',
    gradient: 'linear-gradient(135deg, #C29665 0%, #3D2918 100%)',
    values: {
      contrast: 5,
      saturation: -15,
      temperature: 8,
      highlights: -5,
      grain: 20,
      vignette: 14,
    },
  },
};

/** List of active presets presented in the user gallery */
export const PRESET_GALLERY_LIST: PresetDefinition[] = [
  CINEMATIC_PRESETS.ORIGINAL,
  CINEMATIC_PRESETS.FILM_35MM,
  CINEMATIC_PRESETS.AFTER_HOURS,
  CINEMATIC_PRESETS.GOLDEN_HOUR,
  CINEMATIC_PRESETS.BLUE_HOUR,
  CINEMATIC_PRESETS.NOIR,
  CINEMATIC_PRESETS.DREAMY,
  CINEMATIC_PRESETS.INDIE,
];

/**
 * Calculates visual values for a preset given an intensity percentage (0 to 100).
 * Interpolates smoothly between neutral zero and the preset definition.
 */
export function applyPresetIntensity(
  baseValues: PresetValues,
  intensity: number,
): PresetValues {
  const factor = Math.max(0, Math.min(100, intensity)) / 100;
  return {
    exposure: Math.round((baseValues.exposure ?? 0) * factor),
    contrast: Math.round(baseValues.contrast * factor),
    saturation: Math.round(baseValues.saturation * factor),
    temperature: Math.round(baseValues.temperature * factor),
    highlights: Math.round(baseValues.highlights * factor),
    shadows: Math.round((baseValues.shadows ?? 0) * factor),
    grain: Math.round(baseValues.grain * factor),
    vignette: Math.round(baseValues.vignette * factor),
  };
}

/** Human-friendly label resolver for badges and headers */
export function getPresetDisplayName(preset: Preset): string {
  if (preset === 'CUSTOM') return 'Personalizado';
  return CINEMATIC_PRESETS[preset]?.name || preset;
}
